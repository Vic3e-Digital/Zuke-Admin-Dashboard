/**
 * Conversation Text Generation Interface
 * Specific interface for conversational text generation
 */

const TextGenerationInterface = require('../text-generation.interface');

class ConversationInterface extends TextGenerationInterface {
  constructor() {
    super();
    this.useCase = "conversation";
  }

  /**
   * Validate conversation-specific request
   */
  validateRequest(request, modelConfig) {
    const baseValidation = super.validateRequest(request, modelConfig);
    
    const errors = [...baseValidation.errors];
    const warnings = [...baseValidation.warnings];

    // Validate conversation-specific fields
    if (request.messages && Array.isArray(request.messages)) {
      // Using messages format (OpenAI-style)
      if (request.messages.length === 0) {
        errors.push('Messages array cannot be empty');
      }

      for (const message of request.messages) {
        if (!message.role || !['user', 'assistant', 'system'].includes(message.role)) {
          errors.push('Each message must have a valid role (user, assistant, or system)');
        }
        if (!message.content || typeof message.content !== 'string') {
          errors.push('Each message must have content as a string');
        }
      }
    } else if (!request.prompt) {
      errors.push('Either prompt or messages array is required');
    }

    // Validate system prompt if provided
    if (request.systemPrompt && typeof request.systemPrompt !== 'string') {
      errors.push('systemPrompt must be a string');
    }

    // Validate conversation parameters
    if (request.parameters?.functions) {
      if (!Array.isArray(request.parameters.functions)) {
        errors.push('functions must be an array');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Transform request to conversation format
   */
  transformRequest(request, modelConfig) {
    const baseRequest = super.transformRequest(request, modelConfig);
    
    // Handle messages format
    if (request.messages) {
      return {
        ...baseRequest,
        messages: request.messages,
        stream: request.parameters?.stream || false,
        functions: request.parameters?.functions || null,
        function_call: request.parameters?.function_call || null
      };
    }

    // Convert prompt to messages format
    const messages = [];
    
    if (request.systemPrompt) {
      messages.push({
        role: "system",
        content: request.systemPrompt
      });
    }
    
    messages.push({
      role: "user", 
      content: request.prompt
    });

    return {
      ...baseRequest,
      messages,
      stream: request.parameters?.stream || false
    };
  }
}

module.exports = ConversationInterface;