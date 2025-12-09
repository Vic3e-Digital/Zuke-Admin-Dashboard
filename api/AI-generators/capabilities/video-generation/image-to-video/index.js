/**
 * Image-to-Video Capability Handler
 * Orchestrates image-to-video generation requests across providers
 */

class ImageToVideoHandler {
  constructor() {
    this.providerCache = new Map();
  }

  /**
   * Execute image-to-video generation
   */
  async execute(request, modelConfig, metadata) {
    try {
      console.log(`🎬 Image-to-Video Handler: Processing with ${modelConfig.provider}/${modelConfig.modelId}`);

      // Validate that we have image inputs
      if (!request.media || !Array.isArray(request.media)) {
        throw new Error('Image media is required for image-to-video generation');
      }

      const imageMedia = request.media.filter(m => m.type === 'image');
      if (imageMedia.length === 0) {
        throw new Error('At least one image is required for image-to-video generation');
      }

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
      console.log(`✅ Image-to-video generation completed in ${executionTime}ms`);

      // Add execution metadata
      return {
        ...result,
        executionTime,
        provider: modelConfig.provider,
        model: modelConfig.modelId,
        capability: 'image-to-video',
        imageCount: imageMedia.length
      };

    } catch (error) {
      console.error('❌ Image-to-video generation failed:', error.message);
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
        const GoogleVeoI2VProvider = require('./providers/google-veo-i2v');
        provider = new GoogleVeoI2VProvider();
        break;

      case 'runway':
        // Future implementation
        throw new Error('Runway provider not yet implemented for image-to-video');

      case 'stability':
        // Future implementation
        throw new Error('Stability AI provider not yet implemented for image-to-video');

      default:
        throw new Error(`Unknown image-to-video provider: ${providerName}`);
    }

    // Cache the provider
    this.providerCache.set(providerName, provider);
    
    return provider;
  }

  /**
   * Get supported providers for image-to-video
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
      // Default estimation for I2V (longer than text-to-video)
      const duration = request.parameters?.duration || 5;
      const imageCount = request.media?.filter(m => m.type === 'image').length || 1;
      return duration * 20 * Math.sqrt(imageCount); // 20 seconds per video second, scaled by image count
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
        const models = ModelRegistry.getModels('video-generation', 'image-to-video', providerName);
        
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
   * Preprocess images for optimization
   */
  async preprocessImages(request) {
    const processedRequest = { ...request };
    const imageMedia = request.media?.filter(m => m.type === 'image') || [];

    if (imageMedia.length === 0) {
      throw new Error('No images found in request');
    }

    const processedMedia = [];

    for (const media of request.media) {
      if (media.type === 'image') {
        // Add image preprocessing logic here
        // For now, just validate and pass through
        const processedImage = {
          ...media,
          processed: true,
          timestamp: Date.now()
        };

        // Could add image resizing, format conversion, etc.
        processedMedia.push(processedImage);
      } else {
        processedMedia.push(media);
      }
    }

    processedRequest.media = processedMedia;
    return processedRequest;
  }

  /**
   * Get handler information
   */
  getInfo() {
    return {
      capability: 'video-generation',
      useCase: 'image-to-video',
      description: 'Generate videos from images and text prompts using AI models',
      supportedProviders: this.getSupportedProviders(),
      cachedProviders: Array.from(this.providerCache.keys()),
      commonFeatures: [
        'Single and multiple image inputs',
        'Motion intensity control',
        'Camera motion effects',
        'Subject preservation',
        'Custom duration (1-8 seconds)',
        'Multiple resolutions (720p, 1080p)',
        'Various aspect ratios (16:9, 9:16, 1:1)',
        'Audio generation',
        'Quality settings',
        'Safety filtering'
      ],
      imageRequirements: {
        formats: ['JPEG', 'PNG', 'WebP'],
        maxSize: '10MB',
        recommendedSize: '1024x1024 or higher',
        aspectRatios: 'Any (will be processed to match video aspect ratio)'
      }
    };
  }

  /**
   * Clear provider cache
   */
  clearCache() {
    this.providerCache.clear();
  }

  /**
   * Health check for image-to-video capability
   */
  async healthCheck() {
    const health = {
      capability: 'image-to-video',
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

  /**
   * Get image processing utilities
   */
  getImageUtils() {
    return {
      validateImageFormat: (data) => {
        const validFormats = ['.jpg', '.jpeg', '.png', '.webp'];
        // Add format validation logic
        return true;
      },
      
      estimateImageSize: (base64Data) => {
        if (!base64Data) return 0;
        // Remove data URL prefix if present
        const base64 = base64Data.replace(/^data:[^,]+,/, '');
        return Math.round(base64.length * 0.75); // Approximate bytes
      },
      
      detectImageDimensions: async (imageData) => {
        // Would need image processing library to implement
        return { width: null, height: null };
      }
    };
  }
}

module.exports = ImageToVideoHandler;