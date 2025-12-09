/**
 * Image-to-Video Interface
 * All image-to-video providers must implement this interface
 */

class ImageToVideoInterface {
  /**
   * Generate video from image and text prompt
   * @param {Object} request - Standardized request object with image data
   * @param {Object} modelConfig - Selected model configuration
   * @param {Object} metadata - Request metadata (requestId, provider, etc.)
   * @returns {Promise<Object>} - Provider-specific response (will be normalized)
   */
  async generateVideo(request, modelConfig, metadata) {
    throw new Error('generateVideo() method must be implemented by provider');
  }

  /**
   * Check job status for async operations
   * @param {string} jobId - Job identifier from the provider
   * @param {Object} metadata - Request metadata
   * @returns {Promise<Object>} - Job status and result (if completed)
   */
  async checkStatus(jobId, metadata) {
    throw new Error('checkStatus() method must be implemented by provider');
  }

  /**
   * Cancel a running job
   * @param {string} jobId - Job identifier from the provider
   * @param {Object} metadata - Request metadata
   * @returns {Promise<boolean>} - True if successfully cancelled
   */
  async cancelJob(jobId, metadata) {
    throw new Error('cancelJob() method must be implemented by provider');
  }

  /**
   * Get model capabilities and constraints
   * @param {string} modelId - Model identifier
   * @returns {Object} - Model capabilities
   */
  getCapabilities(modelId) {
    throw new Error('getCapabilities() method must be implemented by provider');
  }

  /**
   * Validate request against provider-specific requirements
   * @param {Object} request - Standardized request object
   * @param {string} modelId - Model identifier
   * @returns {Object} - Validation result { valid: boolean, errors: [], warnings: [] }
   */
  validateRequest(request, modelId) {
    const errors = [];
    const warnings = [];

    // Validate that image media is provided
    if (!request.media || !Array.isArray(request.media)) {
      errors.push('Image media is required for image-to-video generation');
      return { valid: false, errors, warnings };
    }

    const imageMedia = request.media.filter(m => m.type === 'image');
    if (imageMedia.length === 0) {
      errors.push('At least one image is required for image-to-video generation');
    }

    // Validate image data
    imageMedia.forEach((media, index) => {
      if (!media.data) {
        errors.push(`Image[${index}]: Missing image data`);
      } else if (typeof media.data !== 'string') {
        errors.push(`Image[${index}]: Image data must be a string (base64 or URL)`);
      }
    });

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Transform standardized request to provider-specific format
   * @param {Object} request - Standardized request object
   * @param {Object} modelConfig - Selected model configuration
   * @returns {Object} - Provider-specific request format
   */
  transformRequest(request, modelConfig) {
    throw new Error('transformRequest() method must be implemented by provider');
  }

  /**
   * Transform provider response to normalized format
   * @param {Object} response - Raw provider response
   * @param {Object} request - Original standardized request
   * @param {Object} metadata - Request metadata
   * @returns {Object} - Normalized response data
   */
  transformResponse(response, request, metadata) {
    throw new Error('transformResponse() method must be implemented by provider');
  }

  /**
   * Get provider-specific error information
   * @param {Error} error - Error object from provider
   * @returns {Object} - Normalized error information
   */
  normalizeError(error) {
    return {
      message: error.message || 'Unknown error',
      code: error.code || 'UNKNOWN_ERROR',
      type: error.name || 'Error',
      details: error.details || null
    };
  }

  /**
   * Get estimated processing time for a request
   * @param {Object} request - Standardized request object
   * @param {string} modelId - Model identifier
   * @returns {number} - Estimated time in seconds
   */
  estimateProcessingTime(request, modelId) {
    // Image-to-video typically takes longer than text-to-video
    const duration = request.parameters?.duration || 5;
    const complexity = request.parameters?.quality === 'high' ? 2.5 : 1.5;
    const imageCount = request.media?.filter(m => m.type === 'image').length || 1;
    
    return duration * 20 * complexity * Math.sqrt(imageCount); // ~20 seconds per video second
  }

  /**
   * Check if provider supports specific features
   * @param {Array} features - Feature names to check
   * @returns {Object} - Feature support mapping
   */
  supportsFeatures(features) {
    const support = {};
    features.forEach(feature => {
      support[feature] = false; // Default to not supported
    });
    return support;
  }

  /**
   * Validate image format and size
   * @param {Object} imageMedia - Image media object
   * @returns {Object} - Validation result
   */
  validateImageMedia(imageMedia) {
    const errors = [];
    const warnings = [];

    if (!imageMedia.data) {
      errors.push('Image data is required');
      return { valid: false, errors, warnings };
    }

    // Check if it's base64 or URL
    const isBase64 = imageMedia.data.startsWith('data:') || /^[A-Za-z0-9+/]+=*$/.test(imageMedia.data);
    const isUrl = imageMedia.data.startsWith('http://') || imageMedia.data.startsWith('https://');

    if (!isBase64 && !isUrl) {
      errors.push('Image data must be base64 encoded or a valid URL');
    }

    // Size validation for base64
    if (isBase64 && imageMedia.data.length > 15000000) { // ~11MB base64
      warnings.push('Large image file may cause processing delays');
    }

    // Format validation (if we can determine it)
    if (isBase64 && imageMedia.data.startsWith('data:')) {
      const mimeType = imageMedia.data.match(/data:([^;]+);/);
      if (mimeType) {
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!validTypes.includes(mimeType[1])) {
          warnings.push(`Image format ${mimeType[1]} may not be supported by all providers`);
        }
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Process and validate multiple images
   * @param {Array} mediaArray - Array of media objects
   * @returns {Object} - Validation result with processed images
   */
  processImages(mediaArray) {
    const errors = [];
    const warnings = [];
    const processedImages = [];

    const imageMedia = mediaArray.filter(m => m.type === 'image');

    imageMedia.forEach((media, index) => {
      const validation = this.validateImageMedia(media);
      
      if (!validation.valid) {
        validation.errors.forEach(err => errors.push(`Image[${index}]: ${err}`));
      }
      
      validation.warnings.forEach(warn => warnings.push(`Image[${index}]: ${warn}`));

      if (validation.valid) {
        processedImages.push({
          ...media,
          index,
          role: media.role || 'subject'
        });
      }
    });

    return {
      valid: errors.length === 0 && processedImages.length > 0,
      errors,
      warnings,
      images: processedImages
    };
  }
}

module.exports = ImageToVideoInterface;