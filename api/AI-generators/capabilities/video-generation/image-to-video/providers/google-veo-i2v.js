/**
 * Google Veo Image-to-Video Provider Implementation
 * Handles video generation from images using Google Cloud Vertex AI Veo models
 */

const ImageToVideoInterface = require('../image-to-video.interface');
const ProviderCredentials = require('../../../../config/provider-credentials');
const axios = require('axios');

class GoogleVeoImageToVideo extends ImageToVideoInterface {
  constructor() {
    super();
    this.provider = 'google';
    this.config = ProviderCredentials.getProviderConfig(this.provider);
  }

  /**
   * Generate video from image and text prompt using Google Veo
   */
  async generateVideo(request, modelConfig, metadata) {
    try {
      console.log(`🎬 Google Veo I2V: Generating video with model ${modelConfig.modelId}`);

      // Validate and process images
      const imageProcessing = this.processImages(request.media);
      if (!imageProcessing.valid) {
        throw new Error(`Image validation failed: ${imageProcessing.errors.join(', ')}`);
      }

      // Transform request to Google format
      const googleRequest = this.transformRequest(request, modelConfig);
      
      // Get endpoint and headers
      const endpoint = ProviderCredentials.getEndpointUrl(this.provider, modelConfig.modelId);
      const headers = await ProviderCredentials.getAuthHeaders(this.provider);
      
      // Make API call
      console.log(`🌐 Calling Google Vertex AI I2V: ${endpoint}`);
      
      const response = await axios.post(endpoint, googleRequest, {
        headers,
        timeout: this.config.timeout
      });

      console.log(`✅ Google Veo I2V response received`);
      
      return response.data;

    } catch (error) {
      console.error('❌ Google Veo I2V generation failed:', error.message);
      
      if (error.response) {
        console.error('Response error:', error.response.data);
      }
      
      throw this.normalizeError(error);
    }
  }

  /**
   * Check async job status (inherited from parent)
   */
  async checkStatus(jobId, metadata) {
    try {
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
   * Cancel running job (inherited from parent)
   */
  async cancelJob(jobId, metadata) {
    try {
      const cancelEndpoint = `https://us-central1-aiplatform.googleapis.com/v1/${jobId}:cancel`;
      const headers = await ProviderCredentials.getAuthHeaders(this.provider);

      await axios.post(cancelEndpoint, {}, { headers });
      return true;

    } catch (error) {
      console.error('Failed to cancel Google I2V job:', error.message);
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
   * Validate request against Google Veo I2V requirements
   */
  validateRequest(request, modelId) {
    const errors = [];
    const warnings = [];

    // Call parent validation first
    const parentValidation = super.validateRequest(request, modelId);
    errors.push(...parentValidation.errors);
    warnings.push(...parentValidation.warnings);

    if (errors.length > 0) {
      return { valid: false, errors, warnings };
    }

    try {
      const capabilities = this.getCapabilities(modelId);
      const params = request.parameters || {};

      // Prompt validation
      if (!request.prompt || request.prompt.trim().length === 0) {
        errors.push('Prompt is required for image-to-video generation');
      }

      if (request.prompt && capabilities.maxPromptLength) {
        if (request.prompt.length > capabilities.maxPromptLength) {
          warnings.push(`Prompt length ${request.prompt.length} exceeds recommended ${capabilities.maxPromptLength}`);
        }
      }

      // Image-specific validations
      const imageProcessing = this.processImages(request.media);
      if (!imageProcessing.valid) {
        errors.push(...imageProcessing.errors);
      }
      warnings.push(...imageProcessing.warnings);

      // For Google Veo I2V, only single image is supported currently
      if (imageProcessing.images && imageProcessing.images.length > 1) {
        warnings.push('Multiple images provided, but Google Veo I2V currently uses only the first image');
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

      // Motion intensity validation (I2V specific)
      if (params.motionIntensity !== undefined) {
        if (typeof params.motionIntensity !== 'number' || params.motionIntensity < 0 || params.motionIntensity > 1) {
          errors.push('Motion intensity must be a number between 0 and 1');
        }
      }

      // Preserve subject validation (I2V specific)
      if (params.preserveSubject !== undefined && typeof params.preserveSubject !== 'boolean') {
        errors.push('Preserve subject must be a boolean');
      }

    } catch (error) {
      errors.push(`Validation error: ${error.message}`);
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Transform standardized request to Google Veo I2V format
   */
  transformRequest(request, modelConfig) {
    const params = request.parameters || {};
    const imageProcessing = this.processImages(request.media);
    
    if (!imageProcessing.valid || imageProcessing.images.length === 0) {
      throw new Error('Valid image is required for image-to-video generation');
    }

    // Use the first image (Google Veo I2V supports single image)
    const primaryImage = imageProcessing.images[0];
    
    const googleRequest = {
      instances: [{
        prompt: request.prompt,
        image: {
          bytesBase64Encoded: this.extractBase64(primaryImage.data),
          mimeType: this.detectMimeType(primaryImage.data)
        }
      }],
      parameters: {}
    };

    // Add generation parameters
    if (params.duration) {
      googleRequest.parameters.durationSeconds = params.duration;
    }

    if (params.resolution) {
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

    // Image-to-video specific parameters
    if (params.motionIntensity !== undefined) {
      googleRequest.parameters.motionIntensity = params.motionIntensity;
    }

    if (params.preserveSubject !== undefined) {
      googleRequest.parameters.preserveSubject = params.preserveSubject;
    }

    // Resize mode for image handling
    if (params.resizeMode) {
      googleRequest.parameters.resizeMode = params.resizeMode; // 'pad', 'crop', 'stretch'
    } else {
      googleRequest.parameters.resizeMode = 'pad'; // Default to padding
    }

    // Camera motion (if supported)
    if (params.cameraMotion) {
      googleRequest.parameters.cameraMotion = params.cameraMotion;
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
   * Extract base64 data from various formats
   */
  extractBase64(data) {
    if (data.startsWith('data:')) {
      // Remove data URL prefix
      const base64Index = data.indexOf(',');
      return base64Index !== -1 ? data.substring(base64Index + 1) : data;
    }
    
    // Already base64 or URL - for URL, we'd need to fetch and convert
    if (data.startsWith('http')) {
      throw new Error('URL images not yet supported - please provide base64 encoded images');
    }
    
    return data;
  }

  /**
   * Detect MIME type from data
   */
  detectMimeType(data) {
    if (data.startsWith('data:')) {
      const mimeMatch = data.match(/data:([^;]+);/);
      if (mimeMatch) {
        return mimeMatch[1];
      }
    }

    // Default assumption - could be improved with better detection
    return 'image/jpeg';
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
   * Normalize Google I2V specific errors
   */
  normalizeError(error) {
    let normalizedError = {
      message: error.message || 'Unknown Google Veo I2V error',
      code: 'GOOGLE_VEO_I2V_ERROR',
      type: 'GoogleVeoI2VError',
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

        // Handle specific I2V error cases
        if (errorData.message?.includes('image')) {
          normalizedError.code = 'IMAGE_ERROR';
          normalizedError.message = 'Image processing error: ' + errorData.message;
        }
      }

      // Handle specific Google Cloud error types
      if (error.response.status === 400) {
        normalizedError.message = 'Invalid request. Check image format and parameters.';
        normalizedError.code = 'INVALID_REQUEST';
      } else if (error.response.status === 413) {
        normalizedError.message = 'Image file too large. Please use a smaller image.';
        normalizedError.code = 'IMAGE_TOO_LARGE';
      }
    }

    return normalizedError;
  }

  /**
   * Estimate processing time for Google Veo I2V
   */
  estimateProcessingTime(request, modelId) {
    const duration = request.parameters?.duration || 5;
    const quality = request.parameters?.quality || 'standard';
    const imageCount = request.media?.filter(m => m.type === 'image').length || 1;
    
    // I2V typically takes longer than text-to-video
    let multiplier = 25; // Base multiplier
    
    if (quality === 'high') {
      multiplier = 40;
    }
    
    if (modelId.includes('fast')) {
      multiplier = 15; // Fast models are quicker
    }
    
    // Additional time for image processing
    const imageProcessingTime = imageCount * 5;
    
    return Math.max(duration * multiplier + imageProcessingTime, 45); // Minimum 45 seconds
  }

  /**
   * Check feature support for Google Veo I2V
   */
  supportsFeatures(features) {
    const support = {
      'image-conditioning': true,
      'single-image-input': true,
      'multiple-image-input': false,
      'motion-control': true,
      'camera-motion': true,
      'preserve-subject': true,
      'resize-modes': true,
      'audio-generation': true,
      'high-resolution': true,
      'custom-duration': true,
      'negative-prompts': true,
      'batch-processing': false,
      'real-time-generation': false,
      'video-style-transfer': false,
      'face-preservation': true
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
      name: 'Google Cloud Vertex AI Veo Image-to-Video',
      version: '3.1',
      capabilities: [
        'Image-to-video generation',
        'Motion intensity control',
        'Camera motion effects',
        'Subject preservation',
        'Audio generation',
        'Multiple aspect ratios',
        'High resolution output'
      ],
      limitations: [
        'Single image input only',
        'Maximum 8 second duration',
        'Limited motion control granularity'
      ],
      pricing: {
        model: 'per-second',
        currency: 'USD',
        notes: 'Higher cost than text-to-video due to image processing complexity'
      }
    };
  }
}

module.exports = GoogleVeoImageToVideo;