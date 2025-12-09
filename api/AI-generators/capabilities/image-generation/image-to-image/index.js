/**
 * Image-to-Image Handler
 * Orchestrates image-to-image transformation across providers
 */

class ImageToImageHandler {
  constructor() {
    this.capability = 'image-generation';
    this.useCase = 'image-to-image';
  }

  /**
   * Execute image-to-image transformation
   * @param {Object} request - The generation request
   * @param {Object} modelConfig - Selected model configuration
   * @param {Object} metadata - Request metadata
   * @returns {Promise<Object>} Generation result
   */
  async execute(request, modelConfig, metadata) {
    try {
      console.log(`🖼️ ImageToImageHandler: Processing with ${metadata.provider}/${metadata.model}`);
      console.log(`🔍 Request keys: ${Object.keys(request).join(', ')}`);
      console.log(`🔍 Has image field: ${!!request.image}`);
      console.log(`🔍 Has media array: ${!!request.media && Array.isArray(request.media)}`);
      if (request.media) {
        console.log(`🔍 Media array length: ${request.media.length}`);
        console.log(`🔍 First media type: ${request.media[0]?.type}`);
        console.log(`🔍 First media has data: ${!!request.media[0]?.data}`);
      }
      
      // Validate image input (check both legacy image field and media array format)
      let hasImage = false;
      
      // Check legacy image field
      if (request.image) {
        hasImage = true;
      }
      
      // Check media array format
      if (!hasImage && request.media && Array.isArray(request.media)) {
        const imageMedia = request.media.filter(m => m.type === 'image');
        if (imageMedia.length > 0 && imageMedia[0].data) {
          hasImage = true;
          // Transform media array to legacy image field for provider compatibility
          request.image = imageMedia[0].data;
        }
      }
      
      if (!hasImage) {
        throw new Error('Image input is required for image-to-image transformation');
      }
      
      // Load the appropriate provider
      const Provider = this.loadProvider(metadata.provider);
      const provider = new Provider();
      
      // Execute transformation
      const startTime = Date.now();
      const result = await provider.execute(request, modelConfig, metadata);
      const executionTime = Date.now() - startTime;
      
      console.log(`✅ Image-to-image transformation completed in ${executionTime}ms`);
      
      return {
        ...result,
        executionTime,
        provider: metadata.provider,
        capability: this.capability,
        useCase: this.useCase
      };
      
    } catch (error) {
      console.error('❌ ImageToImageHandler execution failed:', error.message);
      throw error;
    }
  }

  /**
   * Load the appropriate provider for image-to-image transformation
   * @param {string} provider - Provider name (azure, stability, etc.)
   * @returns {Class} Provider class
   */
  loadProvider(provider) {
    switch (provider.toLowerCase()) {
      case 'azure':
        return require('../providers/azure-image-to-image');
      
      // Future providers can be added here
      case 'stability':
        throw new Error('Stability AI provider not yet implemented for image-to-image');
        
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }
}

module.exports = ImageToImageHandler;