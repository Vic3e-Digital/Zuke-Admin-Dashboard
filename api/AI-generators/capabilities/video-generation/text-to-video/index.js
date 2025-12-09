/**
 * Text-to-Video Capability Handler
 * Orchestrates text-to-video generation requests across providers
 */

class TextToVideoHandler {
  constructor() {
    this.providerCache = new Map();
  }

  /**
   * Execute text-to-video generation
   */
  async execute(request, modelConfig, metadata) {
    try {
      console.log(`🎬 Text-to-Video Handler: Processing with ${modelConfig.provider}/${modelConfig.modelId}`);

      // Get provider implementation
      const provider = await this.getProvider(modelConfig.provider);

      // Validate request against provider
      const validation = provider.validateRequest(request, modelConfig.modelId);
      if (!validation.valid) {
        throw new Error(`Provider validation failed: ${validation.errors.join(', ')}`);
      }

      if (validation.warnings.length > 0) {
        console.warn('⚠️  Provider validation warnings:', validation.warnings);
      }

      // Execute generation
      const startTime = Date.now();
      
      const result = await provider.generateVideo(request, modelConfig, metadata);
      
      const executionTime = Date.now() - startTime;
      console.log(`✅ Text-to-video generation completed in ${executionTime}ms`);

      // Add execution metadata
      return {
        ...result,
        executionTime,
        provider: modelConfig.provider,
        model: modelConfig.modelId,
        capability: 'text-to-video'
      };

    } catch (error) {
      console.error('❌ Text-to-video generation failed:', error.message);
      throw error;
    }
  }

  /**
   * Check status of async generation
   */
  async checkStatus(jobId, provider, metadata) {
    try {
      const providerImpl = await this.getProvider(provider);
      return await providerImpl.checkStatus(jobId, metadata);
    } catch (error) {
      throw new Error(`Status check failed: ${error.message}`);
    }
  }

  /**
   * Cancel running generation
   */
  async cancelGeneration(jobId, provider, metadata) {
    try {
      const providerImpl = await this.getProvider(provider);
      return await providerImpl.cancelJob(jobId, metadata);
    } catch (error) {
      console.error('Cancel operation failed:', error.message);
      return false;
    }
  }

  /**
   * Get provider implementation
   */
  async getProvider(providerName) {
    // Check cache first
    if (this.providerCache.has(providerName)) {
      return this.providerCache.get(providerName);
    }

    let provider;

    switch (providerName) {
      case 'google':
        const GoogleVeoProvider = require('./providers/google-veo');
        provider = new GoogleVeoProvider();
        break;

      case 'runway':
        // Future implementation
        throw new Error('Runway provider not yet implemented for text-to-video');

      case 'openai':
        // Future implementation
        throw new Error('OpenAI provider not available for text-to-video');

      default:
        throw new Error(`Unknown text-to-video provider: ${providerName}`);
    }

    // Cache the provider
    this.providerCache.set(providerName, provider);
    
    return provider;
  }

  /**
   * Get supported providers for text-to-video
   */
  getSupportedProviders() {
    return ['google']; // Add more as they're implemented
  }

  /**
   * Get provider capabilities
   */
  async getProviderCapabilities(providerName, modelId) {
    try {
      const provider = await this.getProvider(providerName);
      return provider.getCapabilities(modelId);
    } catch (error) {
      throw new Error(`Failed to get capabilities: ${error.message}`);
    }
  }

  /**
   * Estimate generation time
   */
  async estimateProcessingTime(request, providerName, modelId) {
    try {
      const provider = await this.getProvider(providerName);
      return provider.estimateProcessingTime(request, modelId);
    } catch (error) {
      // Default estimation
      const duration = request.parameters?.duration || 5;
      return duration * 15; // 15 seconds per video second
    }
  }

  /**
   * Get feature support matrix
   */
  async getFeatureSupport(providerName, features) {
    try {
      const provider = await this.getProvider(providerName);
      return provider.supportsFeatures(features);
    } catch (error) {
      const support = {};
      features.forEach(feature => {
        support[feature] = false;
      });
      return support;
    }
  }

  /**
   * Validate request for all providers
   */
  async validateForAllProviders(request) {
    const results = {};
    const supportedProviders = this.getSupportedProviders();

    for (const providerName of supportedProviders) {
      try {
        const provider = await this.getProvider(providerName);
        
        // Get available models for this provider
        const ModelRegistry = require('../../config/model-registry');
        const models = ModelRegistry.getModels('video-generation', 'text-to-video', providerName);
        
        results[providerName] = {};
        
        for (const model of models) {
          results[providerName][model.id] = provider.validateRequest(request, model.id);
        }
      } catch (error) {
        results[providerName] = { error: error.message };
      }
    }

    return results;
  }

  /**
   * Get handler information
   */
  getInfo() {
    return {
      capability: 'video-generation',
      useCase: 'text-to-video',
      description: 'Generate videos from text prompts using AI models',
      supportedProviders: this.getSupportedProviders(),
      cachedProviders: Array.from(this.providerCache.keys()),
      commonFeatures: [
        'Custom duration (1-8 seconds)',
        'Multiple resolutions (720p, 1080p)',
        'Various aspect ratios (16:9, 9:16, 1:1)',
        'Audio generation',
        'Quality settings',
        'Safety filtering'
      ]
    };
  }

  /**
   * Clear provider cache
   */
  clearCache() {
    this.providerCache.clear();
  }

  /**
   * Health check for text-to-video capability
   */
  async healthCheck() {
    const health = {
      capability: 'text-to-video',
      status: 'healthy',
      providers: {}
    };

    const supportedProviders = this.getSupportedProviders();

    for (const providerName of supportedProviders) {
      try {
        const provider = await this.getProvider(providerName);
        
        // Check if provider is properly configured
        const ProviderCredentials = require('../../config/provider-credentials');
        const isConfigured = ProviderCredentials.isProviderConfigured(providerName);
        
        health.providers[providerName] = {
          status: isConfigured ? 'healthy' : 'error',
          configured: isConfigured,
          error: isConfigured ? null : 'Missing credentials or configuration'
        };

      } catch (error) {
        health.providers[providerName] = {
          status: 'error',
          configured: false,
          error: error.message
        };
      }
    }

    // Overall status
    const hasHealthyProvider = Object.values(health.providers).some(p => p.status === 'healthy');
    if (!hasHealthyProvider) {
      health.status = 'error';
    }

    return health;
  }
}

module.exports = TextToVideoHandler;