/**
 * Model Selector
 * Intelligently selects the best AI model for a given request
 */

const ModelRegistry = require('../config/model-registry');
const CapabilityMatrix = require('../config/capability-matrix');
const ProviderCredentials = require('../config/provider-credentials');

class ModelSelector {
  /**
   * Select the best model for a request
   */
  static select(request) {
    try {
      // 1. Get all available models for this capability/use case
      const availableModels = this.getAvailableModels(request.capability, request.useCase);
      
      if (availableModels.length === 0) {
        throw new Error(`No models available for ${request.capability}/${request.useCase}`);
      }

      // 2. If specific model is requested
      if (request.preferences?.model) {
        const specificModel = availableModels.find(m => m.id === request.preferences.model);
        if (specificModel) {
          return this.formatModelResult(specificModel, 'specific_request');
        } else {
          throw new Error(`Requested model "${request.preferences.model}" not available`);
        }
      }

      // 3. If specific provider is requested
      if (request.preferences?.provider) {
        const providerModels = availableModels.filter(m => m.provider === request.preferences.provider);
        if (providerModels.length > 0) {
          const selected = this.selectFromModels(providerModels, request);
          return this.formatModelResult(selected, 'provider_preference');
        } else {
          throw new Error(`No models available from provider "${request.preferences.provider}"`);
        }
      }

      // 4. Auto-select based on requirements and preferences
      const selected = this.selectFromModels(availableModels, request);
      return this.formatModelResult(selected, 'auto_selected');

    } catch (error) {
      throw new Error(`Model selection failed: ${error.message}`);
    }
  }

  /**
   * Get all available models for a capability/use case
   */
  static getAvailableModels(capability, useCase) {
    try {
      // Get models from registry
      const allModels = ModelRegistry.getModels(capability, useCase);
      
      // Filter by status (active only) and provider availability
      return allModels.filter(model => {
        // Only include active models
        if (model.status === 'deprecated' || model.status === 'disabled') {
          return false;
        }

        // Only include models from configured providers
        if (!ProviderCredentials.isProviderConfigured(model.provider)) {
          return false;
        }

        return true;
      });
    } catch (error) {
      console.error('Error getting available models:', error);
      return [];
    }
  }

  /**
   * Select best model from a list of candidates
   */
  static selectFromModels(models, request) {
    // 1. Filter by capability requirements
    const compatibleModels = this.filterByCapabilities(models, request);
    
    if (compatibleModels.length === 0) {
      // If no compatible models, return the first available (will warn later)
      return models[0];
    }

    // 2. Apply selection strategy
    const strategy = this.getSelectionStrategy(request);
    return this.applySelectionStrategy(compatibleModels, strategy, request);
  }

  /**
   * Filter models by request capabilities
   */
  static filterByCapabilities(models, request) {
    const params = request.parameters || {};
    
    return models.filter(model => {
      const caps = model.capabilities;
      
      // Duration check
      if (params.duration && caps.maxDuration) {
        if (params.duration > caps.maxDuration) {
          return false;
        }
      }

      // Resolution check
      if (params.resolution && caps.resolutions) {
        if (!caps.resolutions.includes(params.resolution)) {
          return false;
        }
      }

      // Aspect ratio check
      if (params.aspectRatio && caps.aspectRatios) {
        if (!caps.aspectRatios.includes(params.aspectRatio)) {
          return false;
        }
      }

      // Quality check
      if (params.quality && caps.quality) {
        if (!caps.quality.includes(params.quality)) {
          return false;
        }
      }

      // Audio check
      if (params.audio === true && caps.audio === false) {
        return false;
      }

      return true;
    });
  }

  /**
   * Determine selection strategy based on request preferences
   */
  static getSelectionStrategy(request) {
    const prefs = request.preferences || {};

    // Cost-based selection
    if (prefs.costTier) {
      return { type: 'cost', tier: prefs.costTier };
    }

    // Quality-based selection
    if (request.parameters?.quality === 'high' || request.parameters?.quality === 'ultra') {
      return { type: 'quality', priority: 'high' };
    }

    // Speed-based selection (for urgent requests)
    if (prefs.priority === 'speed' || request.parameters?.fast === true) {
      return { type: 'speed' };
    }

    // Default: balanced selection
    return { type: 'balanced' };
  }

  /**
   * Apply selection strategy to choose the best model
   */
  static applySelectionStrategy(models, strategy, request) {
    switch (strategy.type) {
      case 'cost':
        return this.selectByCost(models, strategy.tier);
      
      case 'quality':
        return this.selectByQuality(models);
      
      case 'speed':
        return this.selectBySpeed(models);
      
      case 'balanced':
      default:
        return this.selectBalanced(models, request);
    }
  }

  /**
   * Select model by cost tier
   */
  static selectByCost(models, preferredTier) {
    // First, try to find models in the preferred tier
    const tierModels = models.filter(model => model.tier === preferredTier);
    if (tierModels.length > 0) {
      // Sort by priority within tier
      return tierModels.sort((a, b) => a.priority - b.priority)[0];
    }

    // Fallback to cheapest available
    const sortedByCost = models.sort((a, b) => {
      const costA = a.pricing?.perSecond || a.pricing?.perImage || a.pricing?.per1KTokens || 0;
      const costB = b.pricing?.perSecond || b.pricing?.perImage || b.pricing?.per1KTokens || 0;
      return costA - costB;
    });

    return sortedByCost[0];
  }

  /**
   * Select model by quality
   */
  static selectByQuality(models) {
    // Prefer premium tier models
    const premiumModels = models.filter(model => model.tier === 'premium');
    if (premiumModels.length > 0) {
      return premiumModels.sort((a, b) => a.priority - b.priority)[0];
    }

    // Fallback to highest priority model
    return models.sort((a, b) => a.priority - b.priority)[0];
  }

  /**
   * Select model by speed
   */
  static selectBySpeed(models) {
    // Look for models with "fast" in the name or description
    const fastModels = models.filter(model => 
      model.name.toLowerCase().includes('fast') || 
      model.id.toLowerCase().includes('fast')
    );

    if (fastModels.length > 0) {
      return fastModels.sort((a, b) => a.priority - b.priority)[0];
    }

    // Fallback to standard tier (usually faster than premium)
    const standardModels = models.filter(model => model.tier === 'standard');
    if (standardModels.length > 0) {
      return standardModels.sort((a, b) => a.priority - b.priority)[0];
    }

    // Default to first available
    return models[0];
  }

  /**
   * Select model with balanced approach
   */
  static selectBalanced(models, request) {
    // Score models based on multiple factors
    const scoredModels = models.map(model => ({
      model,
      score: this.calculateBalancedScore(model, request)
    }));

    // Sort by score (higher is better)
    scoredModels.sort((a, b) => b.score - a.score);
    
    return scoredModels[0].model;
  }

  /**
   * Calculate balanced score for a model
   */
  static calculateBalancedScore(model, request) {
    let score = 0;

    // Priority factor (lower priority number = higher score)
    score += (10 - model.priority) * 2;

    // Status factor
    if (model.status === 'active') score += 5;
    if (model.status === 'beta') score += 2;

    // Tier factor
    if (model.tier === 'premium') score += 3;
    if (model.tier === 'standard') score += 4; // Balanced choice
    if (model.tier === 'budget') score += 1;

    // Capability completeness (how well it matches request)
    const params = request.parameters || {};
    const caps = model.capabilities;

    if (params.duration && caps.maxDuration) {
      // Prefer models that can handle the requested duration with headroom
      if (caps.maxDuration >= params.duration * 1.5) score += 2;
      else if (caps.maxDuration >= params.duration) score += 1;
    }

    if (params.quality && caps.quality) {
      if (caps.quality.includes(params.quality)) score += 2;
    }

    if (params.audio && caps.audio === true) score += 1;

    return score;
  }

  /**
   * Format model selection result
   */
  static formatModelResult(model, selectionReason) {
    return {
      modelId: model.id,
      modelName: model.name,
      provider: model.provider,
      tier: model.tier,
      capabilities: model.capabilities,
      pricing: model.pricing,
      selectionReason,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get fallback models for a request
   */
  static getFallbackModels(request, excludeModel = null) {
    const availableModels = this.getAvailableModels(request.capability, request.useCase);
    
    // Remove the excluded model
    const fallbackCandidates = availableModels.filter(model => 
      excludeModel ? model.id !== excludeModel : true
    );

    // Use fallback order from capability matrix
    const fallbackOrder = CapabilityMatrix.getFallbackOrder(request.capability, request.useCase);
    
    // Sort by fallback order
    const sortedFallbacks = [];
    
    fallbackOrder.forEach(provider => {
      const providerModels = fallbackCandidates.filter(m => m.provider === provider);
      sortedFallbacks.push(...providerModels.sort((a, b) => a.priority - b.priority));
    });

    // Add any remaining models
    const remainingModels = fallbackCandidates.filter(model => 
      !sortedFallbacks.find(m => m.id === model.id)
    );
    sortedFallbacks.push(...remainingModels);

    return sortedFallbacks.slice(0, 3); // Return top 3 fallback options
  }

  /**
   * Explain why a model was selected
   */
  static explainSelection(selectedModel, request, availableModels) {
    const explanation = {
      modelId: selectedModel.modelId,
      modelName: selectedModel.modelName,
      provider: selectedModel.provider,
      reason: selectedModel.selectionReason,
      factors: []
    };

    // Add explanation factors
    if (request.preferences?.model) {
      explanation.factors.push('Specific model requested by user');
    } else if (request.preferences?.provider) {
      explanation.factors.push(`Provider preference: ${request.preferences.provider}`);
    } else {
      explanation.factors.push('Automatically selected based on requirements');
      
      if (selectedModel.tier === 'premium') {
        explanation.factors.push('Premium tier selected for high quality');
      }
      
      if (selectedModel.capabilities.maxDuration) {
        explanation.factors.push(`Supports requested duration: ${request.parameters?.duration || 'default'}s`);
      }
    }

    explanation.alternativesCount = availableModels.length - 1;
    
    return explanation;
  }
}

module.exports = ModelSelector;