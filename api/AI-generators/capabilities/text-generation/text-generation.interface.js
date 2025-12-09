/**
 * Text Generation Base Interface
 * Abstract class defining the interface for text generation providers
 */

class TextGenerationInterface {
  constructor() {
    this.provider = null;
    this.capability = "text-generation";
  }

  /**
   * Generate text from a prompt
   * @param {Object} request - The generation request
   * @param {string} request.prompt - The input prompt
   * @param {Object} request.parameters - Generation parameters
   * @param {Object} modelConfig - Model configuration from registry
   * @param {Object} metadata - Request metadata
   * @returns {Promise<Object>} Generation result
   */
  async generateText(request, modelConfig, metadata) {
    throw new Error('generateText method must be implemented by provider');
  }

  /**
   * Stream text generation (optional)
   * @param {Object} request - The generation request
   * @param {Object} modelConfig - Model configuration
   * @param {Object} metadata - Request metadata
   * @returns {Promise<ReadableStream>} Text stream
   */
  async streamText(request, modelConfig, metadata) {
    throw new Error('streamText not implemented - provider does not support streaming');
  }

  /**
   * Validate request for text generation
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
    if (request.prompt && request.prompt.length < 1) {
      errors.push('Prompt cannot be empty');
    }

    const maxPromptLength = modelConfig.capabilities?.maxPromptLength || 8192;
    if (request.prompt && request.prompt.length > maxPromptLength) {
      errors.push(`Prompt exceeds maximum length of ${maxPromptLength} characters`);
    }

    // Validate parameters
    if (request.parameters) {
      const { maxTokens, temperature, topP } = request.parameters;

      if (maxTokens !== undefined) {
        if (!Number.isInteger(maxTokens) || maxTokens < 1) {
          errors.push('maxTokens must be a positive integer');
        }
        
        const modelMaxTokens = modelConfig.capabilities?.maxTokens || 4096;
        if (maxTokens > modelMaxTokens) {
          errors.push(`maxTokens cannot exceed ${modelMaxTokens} for this model`);
        }
      }

      if (temperature !== undefined) {
        if (typeof temperature !== 'number' || temperature < 0 || temperature > 2) {
          errors.push('temperature must be a number between 0 and 2');
        }
      }

      if (topP !== undefined) {
        if (typeof topP !== 'number' || topP < 0 || topP > 1) {
          errors.push('topP must be a number between 0 and 1');
        }
      }
    }

    // Warnings for optimization
    if (request.prompt && request.prompt.length > 2000) {
      warnings.push('Long prompts may increase generation time and cost');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Transform generic request to provider-specific format
   * @param {Object} request - Generic request
   * @param {Object} modelConfig - Model configuration
   * @returns {Object} Provider-specific request
   */
  transformRequest(request, modelConfig) {
    // Base implementation - providers should override if needed
    return {
      prompt: request.prompt,
      max_tokens: request.parameters?.maxTokens || 1000,
      temperature: request.parameters?.temperature || 0.7,
      top_p: request.parameters?.topP || 0.9,
      model: modelConfig.modelId
    };
  }

  /**
   * Normalize provider response to standard format
   * @param {Object} response - Provider response
   * @param {Object} metadata - Request metadata
   * @returns {Object} Normalized response
   */
  normalizeResponse(response, metadata) {
    // Base implementation - providers should override
    return {
      text: response.text || response.content || '',
      tokens: response.tokens || null,
      model: response.model || metadata.modelId,
      finishReason: response.finish_reason || 'completed',
      usage: response.usage || null
    };
  }

  /**
   * Normalize errors to standard format
   * @param {Error} error - Original error
   * @returns {Error} Normalized error
   */
  normalizeError(error) {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      // Rate limiting
      if (status === 429) {
        return new Error('Rate limit exceeded. Please try again later.');
      }

      // Authentication
      if (status === 401 || status === 403) {
        return new Error('Authentication failed. Check your credentials.');
      }

      // Bad request
      if (status === 400) {
        return new Error(`Invalid request: ${data?.message || error.message}`);
      }

      // Server errors
      if (status >= 500) {
        return new Error('Service temporarily unavailable. Please try again later.');
      }

      return new Error(data?.message || error.message || 'Unknown API error');
    }

    return error;
  }

  /**
   * Get model capabilities
   * @param {string} modelId - Model identifier
   * @returns {Object} Model capabilities
   */
  getModelCapabilities(modelId) {
    // Base implementation - providers can override
    return {
      maxTokens: 4096,
      contextWindow: 16384,
      streaming: false,
      functions: false,
      multimodal: false
    };
  }
}

module.exports = TextGenerationInterface;