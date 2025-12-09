/**
 * Text to Image Interface
 * Handles text-to-image generation use case
 */

const ImageGenerationInterface = require('../image-generation.interface');

class TextToImageInterface extends ImageGenerationInterface {
  constructor() {
    super();
    this.useCase = 'text-to-image';
  }

  /**
   * Generate image from text prompt
   * @param {Object} request - The generation request
   * @param {string} request.prompt - The text prompt
   * @param {Object} request.parameters - Generation parameters (size, style, quality)
   * @param {Object} modelConfig - Model configuration from registry
   * @param {Object} metadata - Request metadata
   * @returns {Promise<Object>} Generation result with image URL
   */
  async execute(request, modelConfig, metadata) {
    // Validate request
    const validation = this.validateRequest(request, modelConfig);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    try {
      // Call the provider's generateImage method
      const result = await this.generateImage(request, modelConfig, metadata);
      return this.normalizeResponse(result, request, metadata);
    } catch (error) {
      return this.handleError(error, request, metadata);
    }
  }

  /**
   * Validate text-to-image specific request
   * @param {Object} request - The generation request
   * @param {Object} modelConfig - Model configuration
   * @returns {Object} Validation result
   */
  validateRequest(request, modelConfig) {
    const baseValidation = super.validateRequest(request, modelConfig);
    
    // Text-to-image specific validations can be added here
    
    return baseValidation;
  }
}

module.exports = TextToImageInterface;