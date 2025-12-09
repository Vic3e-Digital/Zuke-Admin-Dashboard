/**
 * Multiple Images Handler
 * Orchestrates multiple image generation across providers
 */

class MultipleImagesHandler {
  constructor() {
    this.capability = 'image-generation';
    this.useCase = 'multiple-images';
  }

  /**
   * Execute multiple images generation
   * @param {Object} request - The generation request
   * @param {Object} modelConfig - Selected model configuration
   * @param {Object} metadata - Request metadata
   * @returns {Promise<Object>} Generation result
   */
  async execute(request, modelConfig, metadata) {
    try {
      console.log(`🖼️ MultipleImagesHandler: Generating ${request.count || 1} images with ${metadata.provider}/${metadata.model}`);
      
      // Validate count
      if (!request.count || request.count < 1 || request.count > 10) {
        throw new Error('Count must be between 1 and 10 for multiple images generation');
      }
      
      // Load the appropriate provider
      const Provider = this.loadProvider(metadata.provider);
      const provider = new Provider();
      
      // Execute generation
      const startTime = Date.now();
      const result = await provider.execute(request, modelConfig, metadata);
      const executionTime = Date.now() - startTime;
      
      console.log(`✅ Multiple images generation completed in ${executionTime}ms`);
      
      return {
        ...result,
        executionTime,
        provider: metadata.provider,
        capability: this.capability,
        useCase: this.useCase
      };
      
    } catch (error) {
      console.error('❌ MultipleImagesHandler execution failed:', error.message);
      throw error;
    }
  }

  /**
   * Load the appropriate provider for multiple images generation
   * @param {string} provider - Provider name (azure, openai, etc.)
   * @returns {Class} Provider class
   */
  loadProvider(provider) {
    switch (provider.toLowerCase()) {
      case 'azure':
        return require('../providers/azure-multiple-images');
      
      // Future providers can be added here
      case 'openai':
        throw new Error('OpenAI provider not yet implemented for multiple images');
        
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }
}

module.exports = MultipleImagesHandler;