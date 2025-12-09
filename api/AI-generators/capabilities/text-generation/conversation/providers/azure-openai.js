/**
 * Azure OpenAI Conversation Provider
 * Handles text generation using Azure OpenAI GPT models
 */

const ConversationInterface = require('../conversation.interface');
const ProviderCredentials = require('../../../../config/provider-credentials');
const axios = require('axios');

class AzureOpenAIConversation extends ConversationInterface {
  constructor() {
    super();
    this.provider = 'azure';
    this.config = ProviderCredentials.getProviderConfig(this.provider);
  }

  /**
   * Generate conversational text using Azure OpenAI
   */
  async generateText(request, modelConfig, metadata) {
    try {
      console.log(`💬 Azure OpenAI: Generating conversation with model ${modelConfig.modelId}`);

      // Transform request to Azure OpenAI format
      const azureRequest = this.transformRequest(request, modelConfig);
      
      // Get endpoint and headers
      const endpoint = ProviderCredentials.getEndpointUrl(this.provider, modelConfig.modelId);
      const headers = await ProviderCredentials.getAuthHeaders(this.provider);
      
      // Make API call
      console.log(`🌐 Calling Azure OpenAI: ${endpoint}`);
      
      const response = await axios.post(endpoint, azureRequest, {
        headers,
        timeout: this.config.timeout
      });

      console.log(`✅ Azure OpenAI response received`);
      
      return this.normalizeResponse(response.data, { ...metadata, modelId: modelConfig.modelId });

    } catch (error) {
      console.error('❌ Azure OpenAI generation failed:', error.message);
      
      if (error.response) {
        console.error('Response error:', error.response.data);
      }
      
      throw this.normalizeError(error);
    }
  }

  /**
   * Stream text generation (if supported)
   */
  async streamText(request, modelConfig, metadata) {
    try {
      console.log(`🔄 Azure OpenAI: Streaming conversation with model ${modelConfig.modelId}`);

      const azureRequest = {
        ...this.transformRequest(request, modelConfig),
        stream: true
      };
      
      const endpoint = ProviderCredentials.getEndpointUrl(this.provider, modelConfig.modelId);
      const headers = await ProviderCredentials.getAuthHeaders(this.provider);
      
      const response = await axios.post(endpoint, azureRequest, {
        headers,
        responseType: 'stream',
        timeout: this.config.timeout
      });

      return response.data;

    } catch (error) {
      console.error('❌ Azure OpenAI streaming failed:', error.message);
      throw this.normalizeError(error);
    }
  }

  /**
   * Transform request to Azure OpenAI format
   */
  transformRequest(request, modelConfig) {
    const baseRequest = super.transformRequest(request, modelConfig);
    
    // Azure OpenAI specific format
    return {
      messages: baseRequest.messages,
      max_tokens: baseRequest.max_tokens,
      temperature: baseRequest.temperature,
      top_p: baseRequest.top_p,
      frequency_penalty: request.parameters?.frequencyPenalty || 0,
      presence_penalty: request.parameters?.presencePenalty || 0,
      stop: request.parameters?.stop || null,
      stream: baseRequest.stream || false,
      functions: baseRequest.functions || undefined,
      function_call: baseRequest.function_call || undefined
    };
  }

  /**
   * Normalize Azure OpenAI response
   */
  normalizeResponse(response, metadata) {
    if (!response.choices || response.choices.length === 0) {
      throw new Error('No response generated');
    }

    const choice = response.choices[0];
    const message = choice.message || {};

    return {
      text: message.content || '',
      finishReason: choice.finish_reason || 'completed',
      model: response.model || metadata.modelId,
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0
      },
      functionCall: message.function_call || null,
      metadata: {
        provider: this.provider,
        requestId: response.id || null,
        created: response.created || Date.now()
      }
    };
  }

  /**
   * Get Azure OpenAI model capabilities
   */
  getModelCapabilities(modelId) {
    const capabilities = {
      'gpt-4.1': {
        maxTokens: 4096,
        contextWindow: 32768,
        streaming: true,
        functions: true,
        multimodal: false,
        languages: ['en', 'es', 'fr', 'de', 'pt', 'it', 'ru', 'ja', 'ko', 'zh'],
        specialFeatures: ['json_mode', 'function_calling', 'system_messages']
      },
      'gpt-4o-mini': {
        maxTokens: 4096,
        contextWindow: 16384,
        streaming: true,
        functions: true,
        multimodal: false,
        languages: ['en', 'es', 'fr', 'de', 'pt', 'it'],
        specialFeatures: ['json_mode', 'function_calling', 'fast_response']
      }
    };

    return capabilities[modelId] || super.getModelCapabilities(modelId);
  }

  /**
   * Validate Azure-specific request parameters
   */
  validateRequest(request, modelConfig) {
    const baseValidation = super.validateRequest(request, modelConfig);
    
    const errors = [...baseValidation.errors];
    const warnings = [...baseValidation.warnings];

    // Azure-specific validations
    if (request.parameters?.frequencyPenalty !== undefined) {
      const fp = request.parameters.frequencyPenalty;
      if (typeof fp !== 'number' || fp < -2 || fp > 2) {
        errors.push('frequencyPenalty must be a number between -2 and 2');
      }
    }

    if (request.parameters?.presencePenalty !== undefined) {
      const pp = request.parameters.presencePenalty;
      if (typeof pp !== 'number' || pp < -2 || pp > 2) {
        errors.push('presencePenalty must be a number between -2 and 2');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Normalize Azure OpenAI specific errors
   */
  normalizeError(error) {
    if (error.response?.data?.error) {
      const azureError = error.response.data.error;
      
      // Azure-specific error codes
      if (azureError.code === 'content_filter') {
        return new Error('Content was filtered by Azure OpenAI content policy');
      }
      
      if (azureError.code === 'invalid_request_error') {
        return new Error(`Invalid request: ${azureError.message}`);
      }
      
      if (azureError.code === 'rate_limit_exceeded') {
        return new Error('Rate limit exceeded. Please try again later.');
      }
      
      if (azureError.code === 'insufficient_quota') {
        return new Error('Insufficient quota. Please check your Azure OpenAI subscription.');
      }
      
      return new Error(azureError.message || 'Azure OpenAI API error');
    }

    return super.normalizeError(error);
  }
}

module.exports = AzureOpenAIConversation;