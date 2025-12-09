/**
 * Conversation Text Generation Handler
 * Handles all conversation-based text generation requests
 */

const AzureOpenAIConversation = require('./providers/azure-openai');

class ConversationHandler {
  constructor() {
    console.log('🏗️ ConversationHandler: Constructor called');
    this.providers = {
      azure: new AzureOpenAIConversation()
    };
    this.capability = "text-generation";
    this.useCase = "conversation";
    console.log('✅ ConversationHandler: Initialized with execute method:', typeof this.execute);
  }

  /**
   * Get available providers for conversation
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
      throw new Error(`Provider '${providerName}' not available for conversation`);
    }
    return provider;
  }

  /**
   * Execute conversation text generation (main entry point)
   */
  async execute(request, modelConfig, metadata) {
    try {
      console.log(`💬 Conversation Handler: Processing with ${modelConfig.provider}/${modelConfig.modelId}`);

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
      console.log(`✅ Conversation generation completed in ${executionTime}ms`);

      // Add execution metadata
      return {
        ...result,
        executionTime,
        provider: modelConfig.provider,
        model: modelConfig.modelId || modelConfig.model,
        capability: 'text-generation',
        useCase: 'conversation'
      };

    } catch (error) {
      console.error('❌ Conversation generation failed:', error.message);
      throw error;
    }
  }

  /**
   * Generate conversation text (legacy method)
   */
  async generate(request, modelConfig, metadata) {
    const providerName = modelConfig.provider || 'azure';
    const provider = this.getProvider(providerName);
    
    return await provider.generateText(request, modelConfig, metadata);
  }

  /**
   * Stream conversation text
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
   * Validate conversation request
   */
  validate(request, modelConfig) {
    const providerName = modelConfig.provider || 'azure';
    const provider = this.getProvider(providerName);
    
    return provider.validateRequest(request, modelConfig);
  }
}

module.exports = ConversationHandler;