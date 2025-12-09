/**
 * Google Veo Text-to-Video Provider Implementation
 * Handles video generation using Google Cloud Vertex AI Veo models
 */

const TextToVideoInterface = require('../text-to-video.interface');
const ProviderCredentials = require('../../../../config/provider-credentials');
const axios = require('axios');

class GoogleVeoTextToVideo extends TextToVideoInterface {
  constructor() {
    super();
    this.provider = 'google';
    this.config = ProviderCredentials.getProviderConfig(this.provider);
  }

  /**
   * Generate video from text prompt using Google Veo
   */
  async generateVideo(request, modelConfig, metadata) {
    try {
      console.log(`🎬 Google Veo: Generating video with model ${modelConfig.modelId}`);

      // Transform request to Google format
      const googleRequest = this.transformRequest(request, modelConfig);
      
      // Get endpoint and headers
      const endpoint = ProviderCredentials.getEndpointUrl(this.provider, modelConfig.modelId);
      const headers = await ProviderCredentials.getAuthHeaders(this.provider);
      
      // Make API call
      console.log(`🌐 Calling Google Vertex AI: ${endpoint}`);
      
      const response = await axios.post(endpoint, googleRequest, {
        headers,
        timeout: this.config.timeout
      });

      console.log(`✅ Google Veo response received:`, response.data);
      
      return response.data;

    } catch (error) {
      console.error('❌ Google Veo generation failed:', error.message);
      
      if (error.response) {
        console.error('Response error:', error.response.data);
      }
      
      throw this.normalizeError(error);
    }
  }

  /**
   * Check async job status
   */
  async checkStatus(jobId, metadata) {
    try {
      // For Google Cloud operations, jobId is the operation name
      const statusEndpoint = `https://us-central1-aiplatform.googleapis.com/v1/${jobId}`;
      const headers = await ProviderCredentials.getAuthHeaders(this.provider);

      const response = await axios.get(statusEndpoint, { headers });
      
      return {
        status: response.data.done ? 'completed' : 'processing',
        progress: response.data.done ? 100 : null,
        result: response.data.done ? response.data.response : null,
        error: response.data.error || null
      };

    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  /**
   * Cancel running job (Google Cloud operations)
   */
  async cancelJob(jobId, metadata) {
    try {
      const cancelEndpoint = `https://us-central1-aiplatform.googleapis.com/v1/${jobId}:cancel`;
      const headers = ProviderCredentials.getAuthHeaders(this.provider);

      await axios.post(cancelEndpoint, {}, { headers });
      return true;

    } catch (error) {
      console.error('Failed to cancel Google job:', error.message);
      return false;
    }
  }

  /**
   * Get model capabilities
   */
  getCapabilities(modelId) {
    const ModelRegistry = require('../../../../config/model-registry');
    return ModelRegistry.getModelCapabilities(modelId);
  }

  /**
   * Validate request against Google Veo requirements
   */
  validateRequest(request, modelId) {
    const errors = [];
    const warnings = [];

    try {
      const capabilities = this.getCapabilities(modelId);
      const params = request.parameters || {};

      // Prompt validation
      if (!request.prompt || request.prompt.trim().length === 0) {
        errors.push('Prompt is required for video generation');
      }

      if (request.prompt && capabilities.maxPromptLength) {
        if (request.prompt.length > capabilities.maxPromptLength) {
          warnings.push(`Prompt length ${request.prompt.length} exceeds recommended ${capabilities.maxPromptLength}`);
        }
      }

      // Duration validation
      if (params.duration) {
        if (capabilities.maxDuration && params.duration > capabilities.maxDuration) {
          errors.push(`Duration ${params.duration}s exceeds maximum ${capabilities.maxDuration}s for ${modelId}`);
        }
        if (params.duration < 1) {
          errors.push('Duration must be at least 1 second');
        }
      }

      // Resolution validation
      if (params.resolution && capabilities.resolutions) {
        if (!capabilities.resolutions.includes(params.resolution)) {
          errors.push(`Resolution ${params.resolution} not supported. Available: ${capabilities.resolutions.join(', ')}`);
        }
      }

      // Aspect ratio validation
      if (params.aspectRatio && capabilities.aspectRatios) {
        if (!capabilities.aspectRatios.includes(params.aspectRatio)) {
          errors.push(`Aspect ratio ${params.aspectRatio} not supported. Available: ${capabilities.aspectRatios.join(', ')}`);
        }
      }

      // Audio validation
      if (params.audio === true && capabilities.audio === false) {
        warnings.push('Audio generation requested but not supported by this model');
      }

    } catch (error) {
      errors.push(`Validation error: ${error.message}`);
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Transform standardized request to Google Veo format
   */
  transformRequest(request, modelConfig) {
    const params = request.parameters || {};
    
    const googleRequest = {
      instances: [{
        prompt: request.prompt
      }],
      parameters: {}
    };

    // Add generation parameters
    if (params.duration) {
      googleRequest.parameters.durationSeconds = params.duration;
    }

    if (params.resolution) {
      // Map standardized resolutions to Google format
      const resolutionMap = {
        '720p': '720p',
        '1080p': '1080p'
      };
      googleRequest.parameters.resolution = resolutionMap[params.resolution] || '1080p';
    }

    if (params.aspectRatio) {
      googleRequest.parameters.aspectRatio = params.aspectRatio;
    }

    if (params.audio !== undefined) {
      googleRequest.parameters.generateAudio = params.audio;
    }

    // Quality settings
    if (params.quality) {
      const qualityMap = {
        'standard': 'BALANCED',
        'high': 'HIGH_QUALITY'
      };
      googleRequest.parameters.quality = qualityMap[params.quality] || 'BALANCED';
    }

    // Style and mood (if supported)
    if (params.style) {
      googleRequest.parameters.style = params.style;
    }

    if (params.mood) {
      googleRequest.parameters.mood = params.mood;
    }

    // Negative prompt (for content filtering)
    if (request.negativePrompt) {
      googleRequest.instances[0].negativePrompt = request.negativePrompt;
    }

    // Safety settings
    googleRequest.parameters.safetySettings = {
      category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE'
    };

    return googleRequest;
  }

  /**
   * Transform Google response to normalized format
   */
  transformResponse(response, request, metadata) {
    // This method is not used directly as ResponseNormalizer handles Google responses
    // But it can be used for provider-specific post-processing
    return response;
  }

  /**
   * Normalize Google-specific errors
   */
  normalizeError(error) {
    let normalizedError = {
      message: error.message || 'Unknown Google Veo error',
      code: 'GOOGLE_VEO_ERROR',
      type: 'GoogleVeoError',
      details: null
    };

    if (error.response) {
      const errorData = error.response.data?.error;
      if (errorData) {
        normalizedError = {
          message: errorData.message || error.message,
          code: errorData.code || error.response.status,
          type: 'GoogleCloudError',
          details: {
            status: error.response.status,
            statusText: error.response.statusText,
            details: errorData.details
          }
        };
      }

      // Handle specific Google Cloud error types
      if (error.response.status === 401) {
        normalizedError.message = 'Authentication failed. Check your Google Cloud credentials.';
        normalizedError.code = 'AUTHENTICATION_ERROR';
      } else if (error.response.status === 403) {
        normalizedError.message = 'Permission denied. Check your Google Cloud project permissions.';
        normalizedError.code = 'PERMISSION_DENIED';
      } else if (error.response.status === 429) {
        normalizedError.message = 'Rate limit exceeded. Please try again later.';
        normalizedError.code = 'RATE_LIMIT_EXCEEDED';
      } else if (error.response.status >= 500) {
        normalizedError.message = 'Google Cloud service temporarily unavailable.';
        normalizedError.code = 'SERVICE_UNAVAILABLE';
      }
    }

    // Handle timeout errors
    if (error.code === 'ECONNABORTED') {
      normalizedError.message = 'Request timeout. Video generation took too long.';
      normalizedError.code = 'TIMEOUT';
    }

    return normalizedError;
  }

  /**
   * Estimate processing time for Google Veo
   */
  estimateProcessingTime(request, modelId) {
    const duration = request.parameters?.duration || 5;
    const quality = request.parameters?.quality || 'standard';
    
    // Google Veo typically takes 10-30 seconds per video second
    let multiplier = 15; // Base multiplier
    
    if (quality === 'high') {
      multiplier = 25;
    }
    
    if (modelId.includes('fast')) {
      multiplier = 8; // Fast models are quicker
    }
    
    return Math.max(duration * multiplier, 30); // Minimum 30 seconds
  }

  /**
   * Check feature support for Google Veo
   */
  supportsFeatures(features) {
    const support = {
      'audio-generation': true,
      'multiple-aspect-ratios': true,
      'high-resolution': true,
      'custom-duration': true,
      'negative-prompts': true,
      'style-control': true,
      'motion-control': false,
      'image-conditioning': false, // Available in image-to-video
      'batch-processing': false,
      'real-time-generation': false
    };

    const result = {};
    features.forEach(feature => {
      result[feature] = support[feature] || false;
    });
    
    return result;
  }

  /**
   * Get provider-specific metadata
   */
  getProviderInfo() {
    return {
      provider: this.provider,
      name: 'Google Cloud Vertex AI Veo',
      version: '3.1',
      capabilities: [
        'Text-to-video generation',
        'Audio generation',
        'Multiple aspect ratios',
        'High resolution output',
        'Safety filtering'
      ],
      limitations: [
        'Maximum 8 second duration',
        'Limited style control',
        'No motion control'
      ],
      pricing: {
        model: 'per-second',
        currency: 'USD',
        notes: 'Pricing varies by model and quality settings'
      }
    };
  }
}

module.exports = GoogleVeoTextToVideo;