/**
 * Content Creation Text Generation Handler
 * Handles all content creation text generation requests
 */

const AzureOpenAIContentCreation = require('./providers/azure-openai');

class ContentCreationHandler {
  constructor() {
    this.providers = {
      azure: new AzureOpenAIContentCreation()
    };
    this.capability = "text-generation";
    this.useCase = "content-creation";
  }

  /**
   * Get available providers for content creation
   */
  getAvailableProviders() {
    return Object.keys(this.providers);
  }

  /**
   * Get provider instance
   */
  getProvider(providerName) {
    const provider = this.providers[providerName];
    if (!provider) {
      throw new Error(`Provider '${providerName}' not available for content creation`);
    }
    return provider;
  }

  /**
   * Execute content creation text generation (main entry point)
   */
  async execute(request, modelConfig, metadata) {
    try {
      console.log(`📝 Content Creation Handler: Processing with ${modelConfig.provider}/${modelConfig.modelId}`);

      // Get provider implementation
      const providerName = modelConfig.provider || 'azure';
      const provider = this.getProvider(providerName);

      // Validate request
      const validation = provider.validateRequest(request, modelConfig.modelId || modelConfig.model);
      if (!validation.valid) {
        throw new Error(`Provider validation failed: ${validation.errors.join(', ')}`);
      }

      if (validation.warnings?.length > 0) {
        console.warn('⚠️  Provider validation warnings:', validation.warnings);
      }

      // Execute generation
      const startTime = Date.now();
      
      const result = await provider.generateText(request, modelConfig, metadata);
      
      const executionTime = Date.now() - startTime;
      console.log(`✅ Content creation completed in ${executionTime}ms`);

      // Add execution metadata
      return {
        ...result,
        executionTime,
        provider: modelConfig.provider,
        model: modelConfig.modelId || modelConfig.model,
        capability: 'text-generation',
        useCase: 'content-creation'
      };

    } catch (error) {
      console.error('❌ Content creation failed:', error.message);
      throw error;
    }
  }

  /**
   * Generate content (legacy method)
   */
  async generate(request, modelConfig, metadata) {
    const providerName = modelConfig.provider || 'azure';
    const provider = this.getProvider(providerName);
    
    return await provider.generateText(request, modelConfig, metadata);
  }

  /**
   * Stream content generation
   */
  async stream(request, modelConfig, metadata) {
    const providerName = modelConfig.provider || 'azure';
    const provider = this.getProvider(providerName);
    
    if (!provider.streamText) {
      throw new Error(`Provider '${providerName}' does not support streaming`);
    }
    
    return await provider.streamText(request, modelConfig, metadata);
  }

  /**
   * Validate content creation request
   */
  validate(request, modelConfig) {
    const providerName = modelConfig.provider || 'azure';
    const provider = this.getProvider(providerName);
    
    return provider.validateRequest(request, modelConfig);
  }
}

module.exports = ContentCreationHandler;