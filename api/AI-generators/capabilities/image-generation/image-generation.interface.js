/**
 * Image Generation Base Interface
 * Abstract class defining the interface for image generation providers
 */

class ImageGenerationInterface {
  constructor() {
    this.provider = null;
    this.capability = "image-generation";
  }

  /**
   * Generate image from a prompt
   * @param {Object} request - The generation request
   * @param {string} request.prompt - The input prompt
   * @param {Object} request.parameters - Generation parameters
   * @param {Object} modelConfig - Model configuration from registry
   * @param {Object} metadata - Request metadata
   * @returns {Promise<Object>} Generation result
   */
  async generateImage(request, modelConfig, metadata) {
    throw new Error('generateImage method must be implemented by provider');
  }

  /**
   * Generate image from existing image (image-to-image)
   * @param {Object} request - The generation request
   * @param {string} request.prompt - The input prompt
   * @param {string|Buffer} request.image - Input image (URL or buffer)
   * @param {Object} request.parameters - Generation parameters
   * @param {Object} modelConfig - Model configuration
   * @param {Object} metadata - Request metadata
   * @returns {Promise<Object>} Generation result
   */
  async generateImageFromImage(request, modelConfig, metadata) {
    throw new Error('generateImageFromImage method must be implemented by provider');
  }

  /**
   * Generate multiple images from a prompt
   * @param {Object} request - The generation request
   * @param {string} request.prompt - The input prompt
   * @param {number} request.count - Number of images to generate
   * @param {Object} request.parameters - Generation parameters
   * @param {Object} modelConfig - Model configuration
   * @param {Object} metadata - Request metadata
   * @returns {Promise<Object>} Generation result with array of images
   */
  async generateMultipleImages(request, modelConfig, metadata) {
    throw new Error('generateMultipleImages method must be implemented by provider');
  }

  /**
   * Validate request for image generation
   * @param {Object} request - The generation request
   * @param {Object} modelConfig - Model configuration
   * @returns {Object} Validation result
   */
  validateRequest(request, modelConfig) {
    const errors = [];
    const warnings = [];

    // Validate required fields
    if (!request.prompt || typeof request.prompt !== 'string') {
      errors.push('Prompt is required and must be a string');
    }

    // Validate prompt length
    if (request.prompt && modelConfig.capabilities?.maxPromptLength) {
      if (request.prompt.length > modelConfig.capabilities.maxPromptLength) {
        errors.push(`Prompt exceeds maximum length of ${modelConfig.capabilities.maxPromptLength} characters`);
      }
    }

    // Validate image size if specified
    if (request.parameters?.size) {
      const supportedSizes = modelConfig.capabilities?.supportedSizes || [];
      if (supportedSizes.length > 0 && !supportedSizes.includes(request.parameters.size)) {
        errors.push(`Size '${request.parameters.size}' not supported. Supported sizes: ${supportedSizes.join(', ')}`);
      }
    }

    // Validate quality if specified
    if (request.parameters?.quality) {
      const supportedQualities = modelConfig.capabilities?.quality || [];
      if (supportedQualities.length > 0 && !supportedQualities.includes(request.parameters.quality)) {
        errors.push(`Quality '${request.parameters.quality}' not supported. Supported qualities: ${supportedQualities.join(', ')}`);
      }
    }

    // Validate style if specified
    if (request.parameters?.style) {
      const supportedStyles = modelConfig.capabilities?.styles || [];
      if (supportedStyles.length > 0 && !supportedStyles.includes(request.parameters.style)) {
        errors.push(`Style '${request.parameters.style}' not supported. Supported styles: ${supportedStyles.join(', ')}`);
      }
    }

    // Validate count for multiple images
    if (request.count !== undefined) {
      if (!Number.isInteger(request.count) || request.count < 1) {
        errors.push('Count must be a positive integer');
      }
      if (modelConfig.capabilities?.maxCount && request.count > modelConfig.capabilities.maxCount) {
        errors.push(`Count exceeds maximum of ${modelConfig.capabilities.maxCount} images`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate image input (for image-to-image generation)
   * @param {string|Buffer} image - Image input
   * @returns {Object} Validation result
   */
  validateImageInput(image) {
    const errors = [];
    const warnings = [];

    if (!image) {
      errors.push('Image input is required for image-to-image generation');
    } else if (typeof image === 'string') {
      // URL validation
      try {
        new URL(image);
      } catch (err) {
        errors.push('Image URL is not valid');
      }
    } else if (!Buffer.isBuffer(image)) {
      errors.push('Image must be a URL string or Buffer');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Normalize response format
   * @param {Object} response - Provider-specific response
   * @param {Object} request - Original request
   * @param {Object} metadata - Request metadata
   * @returns {Object} Normalized response
   */
  normalizeResponse(response, request, metadata) {
    return {
      success: true,
      type: "image",
      format: modelConfig?.capabilities?.format || "png",
      data: response.url || response.data,
      metadata: {
        provider: this.provider,
        model: metadata.model,
        prompt: request.prompt,
        parameters: request.parameters,
        generatedAt: new Date().toISOString(),
        ...response.metadata
      }
    };
  }

  /**
   * Normalize multiple images response
   * @param {Object} response - Provider-specific response
   * @param {Object} request - Original request
   * @param {Object} metadata - Request metadata
   * @returns {Object} Normalized response
   */
  normalizeMultipleResponse(response, request, metadata) {
    const images = Array.isArray(response.images) ? response.images : [response];
    
    return {
      success: true,
      type: "image-array",
      format: modelConfig?.capabilities?.format || "png",
      data: images.map(img => img.url || img.data),
      count: images.length,
      metadata: {
        provider: this.provider,
        model: metadata.model,
        prompt: request.prompt,
        parameters: request.parameters,
        generatedAt: new Date().toISOString(),
        ...response.metadata
      }
    };
  }

  /**
   * Handle errors consistently
   * @param {Error} error - The error that occurred
   * @param {Object} request - Original request
   * @param {Object} metadata - Request metadata
   * @returns {Object} Error response
   */
  handleError(error, request, metadata) {
    console.error(`${this.provider} Image Generation Error:`, error);
    
    return {
      success: false,
      error: {
        type: error.name || 'ImageGenerationError',
        message: error.message || 'Image generation failed',
        code: error.code || 'UNKNOWN_ERROR',
        provider: this.provider
      },
      metadata: {
        provider: this.provider,
        model: metadata.model,
        prompt: request.prompt,
        failedAt: new Date().toISOString()
      }
    };
  }
}

module.exports = ImageGenerationInterface;