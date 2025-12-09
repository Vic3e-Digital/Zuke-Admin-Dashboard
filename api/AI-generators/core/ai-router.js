/**
 * AI Router
 * Main orchestrator that routes AI generation requests to appropriate handlers
 */

const RequestValidator = require('./request-validator');
const ModelSelector = require('./model-selector');
const ResponseNormalizer = require('./response-normalizer');
const CapabilityMatrix = require('../config/capability-matrix');

class AIRouter {
  constructor() {
    this.handlerCache = new Map();
    this.requestCount = 0;
  }

  /**
   * Route an AI generation request
   */
  async route(request) {
    const startTime = Date.now();
    let selectedModel = null;
    let requestId = null;

    try {
      // 1. Generate request ID for tracking
      requestId = this.generateRequestId();
      request.requestId = requestId;

      console.log(`🎯 AI Router: Processing request ${requestId} for ${request.capability}/${request.useCase}`);

      // 2. Validate request
      const validation = RequestValidator.validate(request);
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      if (validation.warnings.length > 0) {
        console.warn(`⚠️  Request warnings:`, validation.warnings);
      }

      // 3. Select best model/provider
      selectedModel = ModelSelector.select(request);
      console.log(`🤖 Selected model: ${selectedModel.modelName} (${selectedModel.provider})`);

      // 4. Validate against selected model capabilities
      const modelValidation = RequestValidator.validateAgainstModel(request, selectedModel.modelId);
      if (!modelValidation.valid) {
        console.warn(`⚠️  Model validation warnings:`, modelValidation.errors);
        
        // Try fallback models if validation fails
        const fallbackModels = ModelSelector.getFallbackModels(request, selectedModel.modelId);
        if (fallbackModels.length > 0) {
          selectedModel = ModelSelector.formatModelResult(fallbackModels[0], 'validation_fallback');
          console.log(`🔄 Fallback to: ${selectedModel.modelName}`);
        }
      }

      // 5. Get capability handler
      const handler = await this.getCapabilityHandler(request.capability, request.useCase);

      // 6. Execute generation
      const metadata = {
        requestId,
        provider: selectedModel.provider,
        model: selectedModel.modelId,
        modelName: selectedModel.modelName,
        startTime
      };

      console.log(`🚀 Executing ${request.capability}/${request.useCase} with ${selectedModel.provider}`);
      
      const result = await handler.execute(request, selectedModel, metadata);

      // 7. Normalize response
      const processingTime = Date.now() - startTime;
      metadata.processingTime = processingTime;

      const normalizedResponse = ResponseNormalizer.normalize(result, request, metadata);
      
      // Add any validation warnings to the response
      if (validation.warnings.length > 0) {
        normalizedResponse.warnings = [...(normalizedResponse.warnings || []), ...validation.warnings];
      }

      console.log(`✅ Request ${requestId} completed in ${processingTime}ms`);
      
      this.logRequestMetrics(request, selectedModel, processingTime, true);
      
      return normalizedResponse;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      console.error(`❌ Request ${requestId} failed:`, error.message);
      
      this.logRequestMetrics(request, selectedModel, processingTime, false);

      // Try fallback if primary provider failed
      if (selectedModel && request.preferences?.fallback !== false) {
        try {
          console.log(`🔄 Attempting fallback for request ${requestId}`);
          return await this.attemptFallback(request, selectedModel, error);
        } catch (fallbackError) {
          console.error(`❌ Fallback also failed:`, fallbackError.message);
        }
      }

      // Return normalized error response
      const metadata = {
        requestId,
        provider: selectedModel?.provider || 'unknown',
        model: selectedModel?.modelId || 'unknown',
        processingTime
      };

      return ResponseNormalizer.createErrorResponse(error, request, metadata);
    }
  }

  /**
   * Get capability handler for a specific use case
   */
  async getCapabilityHandler(capability, useCase) {
    const handlerKey = `${capability}/${useCase}`;
    
    // Check cache first
    if (this.handlerCache.has(handlerKey)) {
      return this.handlerCache.get(handlerKey);
    }

    try {
      // Dynamically load the handler
      const handlerPath = `../capabilities/${capability}/${useCase}/index.js`;
      const HandlerClass = require(handlerPath);
      
      const handler = new HandlerClass();
      
      // Cache the handler
      this.handlerCache.set(handlerKey, handler);
      
      return handler;
    } catch (error) {
      throw new Error(`Handler not found for ${capability}/${useCase}: ${error.message}`);
    }
  }

  /**
   * Attempt fallback to alternative provider/model
   */
  async attemptFallback(originalRequest, failedModel, originalError) {
    const fallbackModels = ModelSelector.getFallbackModels(originalRequest, failedModel.modelId);
    
    if (fallbackModels.length === 0) {
      throw new Error(`No fallback models available. Original error: ${originalError.message}`);
    }

    const fallbackModel = ModelSelector.formatModelResult(fallbackModels[0], 'error_fallback');
    
    console.log(`🔄 Trying fallback model: ${fallbackModel.modelName}`);

    // Create modified request for fallback
    const fallbackRequest = {
      ...originalRequest,
      preferences: {
        ...originalRequest.preferences,
        fallback: false // Prevent infinite fallback loops
      }
    };

    // Attempt with fallback model
    const startTime = Date.now();
    const handler = await this.getCapabilityHandler(originalRequest.capability, originalRequest.useCase);
    
    const metadata = {
      requestId: originalRequest.requestId,
      provider: fallbackModel.provider,
      model: fallbackModel.modelId,
      modelName: fallbackModel.modelName,
      startTime,
      isFallback: true,
      originalError: originalError.message
    };

    const result = await handler.execute(fallbackRequest, fallbackModel, metadata);
    
    const processingTime = Date.now() - startTime;
    metadata.processingTime = processingTime;

    const response = ResponseNormalizer.normalize(result, fallbackRequest, metadata);
    
    // Add fallback information to response
    response.warnings = response.warnings || [];
    response.warnings.push(`Used fallback provider ${fallbackModel.provider} due to ${failedModel.provider} failure`);
    response.fallback = {
      originalProvider: failedModel.provider,
      originalError: originalError.message,
      fallbackProvider: fallbackModel.provider
    };

    return response;
  }

  /**
   * Get router statistics
   */
  getStats() {
    return {
      requestCount: this.requestCount,
      cachedHandlers: this.handlerCache.size,
      capabilities: CapabilityMatrix.getStats()
    };
  }

  /**
   * Health check for router and dependencies
   */
  async healthCheck() {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      components: {}
    };

    try {
      // Check capability matrix
      const capabilityStats = CapabilityMatrix.getStats();
      health.components.capabilityMatrix = {
        status: capabilityStats.activeProviders > 0 ? 'healthy' : 'warning',
        stats: capabilityStats
      };

      // Check cached handlers
      health.components.handlerCache = {
        status: 'healthy',
        cachedHandlers: this.handlerCache.size
      };

      // Check if any providers are configured
      const ProviderCredentials = require('../config/provider-credentials');
      const configuredProviders = ProviderCredentials.getConfiguredProviders();
      
      health.components.providers = {
        status: configuredProviders.length > 0 ? 'healthy' : 'error',
        configured: configuredProviders.length,
        available: configuredProviders
      };

      // Overall status
      const hasErrors = Object.values(health.components).some(comp => comp.status === 'error');
      const hasWarnings = Object.values(health.components).some(comp => comp.status === 'warning');
      
      if (hasErrors) {
        health.status = 'error';
      } else if (hasWarnings) {
        health.status = 'warning';
      }

    } catch (error) {
      health.status = 'error';
      health.error = error.message;
    }

    return health;
  }

  /**
   * List available capabilities
   */
  getAvailableCapabilities() {
    return CapabilityMatrix.getAllCapabilities();
  }

  /**
   * Get information about a specific capability
   */
  getCapabilityInfo(capability, useCase) {
    try {
      const capabilityInfo = CapabilityMatrix.getCapability(capability);
      
      if (useCase) {
        const useCaseInfo = CapabilityMatrix.getUseCase(capability, useCase);
        const activeProviders = CapabilityMatrix.getActiveProviders(capability, useCase);
        
        return {
          capability,
          useCase,
          description: useCaseInfo.description,
          activeProviders,
          requirements: useCaseInfo.requirements,
          fallbackOrder: CapabilityMatrix.getFallbackOrder(capability, useCase)
        };
      }
      
      return {
        capability,
        description: capabilityInfo.description,
        useCases: CapabilityMatrix.getUseCases(capability)
      };
    } catch (error) {
      throw new Error(`Capability information not found: ${error.message}`);
    }
  }

  // Helper methods
  generateRequestId() {
    this.requestCount++;
    return `req_${Date.now()}_${this.requestCount.toString().padStart(4, '0')}`;
  }

  logRequestMetrics(request, selectedModel, processingTime, success) {
    const metrics = {
      requestId: request.requestId,
      capability: request.capability,
      useCase: request.useCase,
      provider: selectedModel?.provider || 'unknown',
      model: selectedModel?.modelId || 'unknown',
      processingTime,
      success,
      timestamp: new Date().toISOString()
    };

    // In production, you might want to send these to a monitoring service
    console.log('📊 Request metrics:', metrics);
  }

  /**
   * Clear handler cache (useful for development/testing)
   */
  clearCache() {
    this.handlerCache.clear();
    console.log('🧹 Handler cache cleared');
  }

  /**
   * Preload handlers for better performance
   */
  async preloadHandlers() {
    const capabilities = CapabilityMatrix.getAllCapabilities();
    
    console.log('🔄 Preloading capability handlers...');
    
    for (const capability of capabilities) {
      for (const useCase of capability.useCases) {
        try {
          await this.getCapabilityHandler(capability.name, useCase);
          console.log(`✅ Loaded handler: ${capability.name}/${useCase}`);
        } catch (error) {
          console.warn(`⚠️  Failed to load handler: ${capability.name}/${useCase} - ${error.message}`);
        }
      }
    }
    
    console.log(`🎯 Preloading complete. ${this.handlerCache.size} handlers cached.`);
  }
}

module.exports = AIRouter;