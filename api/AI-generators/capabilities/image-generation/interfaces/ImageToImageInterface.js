/**
 * Image to Image Interface
 * Handles image-to-image transformation use case
 */

const ImageGenerationInterface = require('../image-generation.interface');

class ImageToImageInterface extends ImageGenerationInterface {
  constructor() {
    super();
    this.useCase = 'image-to-image';
  }

  /**
   * Generate image from existing image and prompt
   * @param {Object} request - The generation request
   * @param {string} request.prompt - The text prompt for transformation
   * @param {string|Buffer} request.image - Input image (URL or buffer)
   * @param {Object} request.parameters - Generation parameters (size, style, strength)
   * @param {Object} modelConfig - Model configuration from registry
   * @param {Object} metadata - Request metadata
   * @returns {Promise<Object>} Generation result with transformed image URL
   */
  async execute(request, modelConfig, metadata) {
    // Validate request
    const validation = this.validateRequest(request, modelConfig);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Validate image input
    const imageValidation = this.validateImageInput(request.image);
    if (!imageValidation.isValid) {
      throw new Error(`Image validation failed: ${imageValidation.errors.join(', ')}`);
    }

    try {
      // Call the provider's generateImageFromImage method
      const result = await this.generateImageFromImage(request, modelConfig, metadata);
      return this.normalizeResponse(result, request, metadata);
    } catch (error) {
      return this.handleError(error, request, metadata);
    }
  }

  /**
   * Validate image-to-image specific request
   * @param {Object} request - The generation request
   * @param {Object} modelConfig - Model configuration
   * @returns {Object} Validation result
   */
  validateRequest(request, modelConfig) {
    const baseValidation = super.validateRequest(request, modelConfig);
    
    // Check if image is provided (support both legacy and media array formats)
    let hasImage = false;
    
    // Check legacy image field
    if (request.image) {
      hasImage = true;
    }
    
    // Check media array format
    if (request.media && Array.isArray(request.media)) {
      const imageMedia = request.media.filter(m => m.type === 'image');
      if (imageMedia.length > 0 && imageMedia[0].data) {
        hasImage = true;
        // Transform media array to legacy image field for provider compatibility
        request.image = imageMedia[0].data;
      }
    }
    
    if (!hasImage) {
      baseValidation.errors.push('Image input is required for image-to-image generation');
      baseValidation.isValid = false;
    }
    
    return baseValidation;
  }
}

module.exports = ImageToImageInterface;