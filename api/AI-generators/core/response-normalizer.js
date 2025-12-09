/**
 * Response Normalizer
 * Standardizes responses from different AI providers into a unified format
 */

class ResponseNormalizer {
  /**
   * Normalize a provider response to standard format
   */
  static normalize(providerResponse, request, metadata = {}) {
    try {
      const baseResponse = this.createBaseResponse(request, metadata);
      
      // Merge with provider-specific response data
      const normalizedResponse = {
        ...baseResponse,
        ...this.normalizeOutput(providerResponse, request),
        ...this.normalizeMetadata(providerResponse, metadata),
        ...this.normalizeUsage(providerResponse),
        ...this.normalizeAsync(providerResponse)
      };

      // Add validation
      const validation = this.validateResponse(normalizedResponse);
      if (!validation.valid) {
        normalizedResponse.warnings = [...(normalizedResponse.warnings || []), ...validation.warnings];
      }

      return normalizedResponse;

    } catch (error) {
      return this.createErrorResponse(error, request, metadata);
    }
  }

  /**
   * Create base response structure
   */
  static createBaseResponse(request, metadata) {
    return {
      success: true,
      status: 'completed',
      requestId: request.requestId || metadata.requestId || this.generateRequestId(),
      timestamp: new Date().toISOString(),
      processingTime: metadata.processingTime || null,
      provider: metadata.provider || 'unknown',
      model: metadata.model || 'unknown',
      capability: request.capability,
      useCase: request.useCase,
      error: null,
      warnings: []
    };
  }

  /**
   * Normalize output data from provider response
   */
  static normalizeOutput(providerResponse, request) {
    const output = {
      output: null,
      outputs: null
    };

    // Handle different response structures from providers
    if (this.isGoogleResponse(providerResponse)) {
      return this.normalizeGoogleOutput(providerResponse, request);
    } else if (this.isOpenAIResponse(providerResponse)) {
      return this.normalizeOpenAIOutput(providerResponse, request);
    } else if (this.isRunwayResponse(providerResponse)) {
      return this.normalizeRunwayOutput(providerResponse, request);
    } else {
      // Generic normalization
      return this.normalizeGenericOutput(providerResponse, request);
    }
  }

  /**
   * Normalize Google Cloud Vertex AI responses
   */
  static normalizeGoogleOutput(response, request) {
    const output = {};

    if (response.predictions && response.predictions.length > 0) {
      const prediction = response.predictions[0];

      // Video generation
      if (request.capability === 'video-generation') {
        output.output = {
          type: 'video',
          format: 'mp4',
          data: prediction.gcsUri || prediction.bytesBase64Encoded,
          duration: prediction.durationSeconds || request.parameters?.duration,
          resolution: request.parameters?.resolution || '1080p',
          size: prediction.sizeBytes,
          thumbnail: prediction.thumbnail
        };
      }
      
      // Image generation
      else if (request.capability === 'image-generation') {
        output.output = {
          type: 'image',
          format: this.detectImageFormat(prediction.bytesBase64Encoded),
          data: prediction.bytesBase64Encoded || prediction.gcsUri,
          resolution: `${prediction.width}x${prediction.height}` || request.parameters?.resolution,
          size: prediction.sizeBytes
        };
      }
      
      // Text generation
      else if (request.capability === 'text-generation') {
        output.output = {
          type: 'text',
          format: 'plain',
          data: prediction.content || prediction.text,
          length: (prediction.content || prediction.text)?.length
        };
      }

      // Multiple outputs
      if (response.predictions.length > 1) {
        output.outputs = response.predictions.map((pred, index) => ({
          ...output.output,
          data: pred.bytesBase64Encoded || pred.gcsUri || pred.content || pred.text,
          variation: index + 1
        }));
      }
    }

    return output;
  }

  /**
   * Normalize OpenAI responses
   */
  static normalizeOpenAIOutput(response, request) {
    const output = {};

    // Image generation (DALL-E)
    if (response.data && request.capability === 'image-generation') {
      output.output = {
        type: 'image',
        format: 'png',
        data: response.data[0].url || response.data[0].b64_json,
        resolution: request.parameters?.resolution || '1024x1024'
      };

      if (response.data.length > 1) {
        output.outputs = response.data.map((item, index) => ({
          type: 'image',
          format: 'png',
          data: item.url || item.b64_json,
          variation: index + 1
        }));
      }
    }
    
    // Text generation (GPT)
    else if (response.choices && request.capability === 'text-generation') {
      output.output = {
        type: 'text',
        format: 'plain',
        data: response.choices[0].message.content,
        length: response.choices[0].message.content.length
      };

      if (response.choices.length > 1) {
        output.outputs = response.choices.map((choice, index) => ({
          type: 'text',
          format: 'plain',
          data: choice.message.content,
          variation: index + 1
        }));
      }
    }

    return output;
  }

  /**
   * Normalize Runway responses
   */
  static normalizeRunwayOutput(response, request) {
    const output = {};

    if (response.output && request.capability === 'video-generation') {
      output.output = {
        type: 'video',
        format: 'mp4',
        data: response.output.url,
        duration: response.output.duration || request.parameters?.duration,
        resolution: response.output.resolution || request.parameters?.resolution,
        thumbnail: response.output.thumbnail
      };
    }

    return output;
  }

  /**
   * Generic output normalization for unknown providers
   */
  static normalizeGenericOutput(response, request) {
    const output = {
      output: {
        type: this.inferOutputType(request.capability),
        format: 'unknown',
        data: response.data || response.output || response.result || JSON.stringify(response)
      }
    };

    return output;
  }

  /**
   * Normalize metadata from provider response
   */
  static normalizeMetadata(response, metadata) {
    return {
      processingTime: metadata.processingTime || this.extractProcessingTime(response),
      provider: metadata.provider,
      model: metadata.model || metadata.modelId
    };
  }

  /**
   * Normalize usage/billing information
   */
  static normalizeUsage(response) {
    const usage = {};

    // Google Cloud format
    if (response.metadata && response.metadata.billableCharacterCount) {
      usage.usage = {
        tokensUsed: response.metadata.billableCharacterCount,
        credits: this.calculateCredits(response.metadata.billableCharacterCount),
        cost: null // Will be calculated based on model pricing
      };
    }
    
    // OpenAI format
    else if (response.usage) {
      usage.usage = {
        tokensUsed: response.usage.total_tokens,
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        cost: null
      };
    }
    
    // Generic format
    else {
      usage.usage = {
        credits: 1,
        tokensUsed: null,
        cost: null
      };
    }

    return usage;
  }

  /**
   * Normalize async operation information
   */
  static normalizeAsync(response) {
    const async = {};

    // If response contains operation information
    if (response.name || response.operation_id || response.job_id) {
      async.async = {
        jobId: response.name || response.operation_id || response.job_id,
        statusUrl: this.buildStatusUrl(response.name || response.operation_id || response.job_id),
        estimatedTime: response.estimated_time || null
      };
      
      // Update status if it's still processing
      if (response.done === false || response.status === 'processing') {
        async.status = 'processing';
      }
    }

    return async;
  }

  /**
   * Create error response
   */
  static createErrorResponse(error, request, metadata) {
    return {
      success: false,
      status: 'failed',
      requestId: request.requestId || metadata.requestId || this.generateRequestId(),
      timestamp: new Date().toISOString(),
      processingTime: metadata.processingTime || null,
      provider: metadata.provider || 'unknown',
      model: metadata.model || 'unknown',
      capability: request.capability,
      useCase: request.useCase,
      output: null,
      usage: null,
      async: null,
      error: {
        message: error.message,
        code: error.code || 'UNKNOWN_ERROR',
        type: error.name || 'Error',
        details: error.details || null
      },
      warnings: []
    };
  }

  /**
   * Validate normalized response
   */
  static validateResponse(response) {
    const warnings = [];

    // Check required fields
    if (!response.requestId) warnings.push('Missing requestId');
    if (!response.provider) warnings.push('Missing provider information');
    if (!response.model) warnings.push('Missing model information');

    // Check output structure
    if (response.success && !response.output && !response.async) {
      warnings.push('No output or async information provided');
    }

    // Check async operations
    if (response.status === 'processing' && !response.async?.jobId) {
      warnings.push('Processing status but no job ID provided');
    }

    return {
      valid: warnings.length === 0,
      warnings
    };
  }

  // Helper methods
  static isGoogleResponse(response) {
    return response.predictions !== undefined || response.name !== undefined;
  }

  static isOpenAIResponse(response) {
    return response.choices !== undefined || (response.data && response.object);
  }

  static isRunwayResponse(response) {
    return response.output !== undefined && response.id !== undefined;
  }

  static detectImageFormat(base64Data) {
    if (!base64Data) return 'unknown';
    
    const header = base64Data.substring(0, 50).toLowerCase();
    if (header.includes('jpeg') || header.includes('jpg')) return 'jpeg';
    if (header.includes('png')) return 'png';
    if (header.includes('webp')) return 'webp';
    if (header.includes('gif')) return 'gif';
    
    return 'jpeg'; // Default assumption
  }

  static inferOutputType(capability) {
    switch (capability) {
      case 'video-generation': return 'video';
      case 'image-generation': return 'image';
      case 'text-generation': return 'text';
      default: return 'unknown';
    }
  }

  static extractProcessingTime(response) {
    // Try to extract processing time from various response formats
    if (response.processing_time) return response.processing_time;
    if (response.metadata?.processing_time) return response.metadata.processing_time;
    if (response.duration) return response.duration;
    
    return null;
  }

  static calculateCredits(characterCount) {
    // Simple credit calculation - can be customized
    return Math.ceil(characterCount / 1000);
  }

  static buildStatusUrl(jobId) {
    return `/api/ai-generators/status/${jobId}`;
  }

  static generateRequestId() {
    return 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Normalize error from provider
   */
  static normalizeError(error, provider) {
    let normalizedError = {
      message: error.message || 'Unknown error occurred',
      code: 'UNKNOWN_ERROR',
      type: 'Error',
      details: null
    };

    // Google Cloud errors
    if (provider === 'google' && error.response) {
      normalizedError = {
        message: error.response.data?.error?.message || error.message,
        code: error.response.data?.error?.code || error.response.status,
        type: 'GoogleCloudError',
        details: error.response.data?.error?.details
      };
    }
    
    // OpenAI errors
    else if (provider === 'openai' && error.response) {
      normalizedError = {
        message: error.response.data?.error?.message || error.message,
        code: error.response.data?.error?.code || error.response.status,
        type: 'OpenAIError',
        details: error.response.data?.error
      };
    }
    
    // Runway errors
    else if (provider === 'runway' && error.response) {
      normalizedError = {
        message: error.response.data?.message || error.message,
        code: error.response.status,
        type: 'RunwayError',
        details: error.response.data
      };
    }

    return normalizedError;
  }
}

module.exports = ResponseNormalizer;