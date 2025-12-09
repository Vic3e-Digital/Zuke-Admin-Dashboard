/**
 * Multiple Images Interface
 * Handles generation of multiple image variations from a single prompt
 */

const ImageGenerationInterface = require('../image-generation.interface');

class MultipleImagesInterface extends ImageGenerationInterface {
  constructor() {
    super();
    this.useCase = 'multiple-images';
  }

  /**
   * Generate multiple images from text prompt
   * @param {Object} request - The generation request
   * @param {string} request.prompt - The text prompt
   * @param {number} request.count - Number of images to generate (1-10)
   * @param {Object} request.parameters - Generation parameters (size, style, quality)
   * @param {Object} modelConfig - Model configuration from registry
   * @param {Object} metadata - Request metadata
   * @returns {Promise<Object>} Generation result with array of image URLs
   */
  async execute(request, modelConfig, metadata) {
    // Validate request
    const validation = this.validateRequest(request, modelConfig);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    try {
      // Call the provider's generateMultipleImages method
      const result = await this.generateMultipleImages(request, modelConfig, metadata);
      return this.normalizeMultipleResponse(result, request, metadata);
    } catch (error) {
      return this.handleError(error, request, metadata);
    }
  }

  /**
   * Validate multiple-images specific request
   * @param {Object} request - The generation request
   * @param {Object} modelConfig - Model configuration
   * @returns {Object} Validation result
   */
  validateRequest(request, modelConfig) {
    const baseValidation = super.validateRequest(request, modelConfig);
    
    // Check if count is provided and valid
    if (request.count === undefined) {
      baseValidation.errors.push('Count parameter is required for multiple images generation');
      baseValidation.isValid = false;
    } else if (!Number.isInteger(request.count) || request.count < 1) {
      baseValidation.errors.push('Count must be a positive integer');
      baseValidation.isValid = false;
    } else if (request.count > 10) {
      baseValidation.errors.push('Maximum count is 10 images per request');
      baseValidation.isValid = false;
    }
    
    return baseValidation;
  }
}

module.exports = MultipleImagesInterface;