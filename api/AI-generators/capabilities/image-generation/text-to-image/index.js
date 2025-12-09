/**
 * Text-to-Image Handler
 * Orchestrates text-to-image generation across providers
 */

class TextToImageHandler {
  constructor() {
    this.capability = 'image-generation';
    this.useCase = 'text-to-image';
  }

  /**
   * Execute text-to-image generation
   * @param {Object} request - The generation request
   * @param {Object} modelConfig - Selected model configuration
   * @param {Object} metadata - Request metadata
   * @returns {Promise<Object>} Generation result
   */
  async execute(request, modelConfig, metadata) {
    try {
      console.log(`🎨 TextToImageHandler: Processing with ${metadata.provider}/${metadata.model}`);
      
      // Load the appropriate provider
      const Provider = this.loadProvider(metadata.provider);
      const provider = new Provider();
      
      // Execute generation
      const startTime = Date.now();
      const result = await provider.execute(request, modelConfig, metadata);
      const executionTime = Date.now() - startTime;
      
      console.log(`✅ Text-to-image generation completed in ${executionTime}ms`);
      
      return {
        ...result,
        executionTime,
        provider: metadata.provider,
        capability: this.capability,
        useCase: this.useCase
      };
      
    } catch (error) {
      console.error('❌ TextToImageHandler execution failed:', error.message);
      throw error;
    }
  }

  /**
   * Load the appropriate provider for text-to-image generation
   * @param {string} provider - Provider name (azure, google, etc.)
   * @returns {Class} Provider class
   */
  loadProvider(provider) {
    switch (provider.toLowerCase()) {
      case 'azure':
        return require('../providers/azure-text-to-image');
      
      // Future providers can be added here
      case 'openai':
        throw new Error('OpenAI provider not yet implemented for image generation');
      
      case 'google':
        throw new Error('Google provider not yet implemented for image generation');
        
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }
}

module.exports = TextToImageHandler;