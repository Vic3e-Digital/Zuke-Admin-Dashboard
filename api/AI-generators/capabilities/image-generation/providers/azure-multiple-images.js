/**
 * Azure OpenAI Multiple Images Provider
 * Handles generation of multiple image variations using Azure OpenAI DALL-E 3
 */

const MultipleImagesInterface = require('../interfaces/MultipleImagesInterface');
const ProviderCredentials = require('../../../config/provider-credentials');
const axios = require('axios');

class AzureMultipleImages extends MultipleImagesInterface {
  constructor() {
    super();
    this.provider = 'azure';
    this.config = ProviderCredentials.getProviderConfig(this.provider);
  }

  /**
   * Generate multiple images from text using Azure OpenAI DALL-E 3
   */
  async generateMultipleImages(request, modelConfig, metadata) {
    try {
      console.log(`🎨 Azure OpenAI: Generating ${request.count} images with model ${modelConfig.id}`);

      // Transform request to Azure OpenAI format
      const azureRequest = this.transformRequest(request, modelConfig);
      
      // Get endpoint and headers for DALL-E 3
      const endpoint = this.getImageEndpoint(modelConfig.id);
      const headers = await ProviderCredentials.getAuthHeaders(this.provider);
      
      // Make API call
      console.log(`🌐 Calling Azure OpenAI Images: ${endpoint}`);
      
      const response = await axios.post(endpoint, azureRequest, {
        headers,
        timeout: this.config.timeout || 120000, // Longer timeout for multiple images
      });

      console.log(`✅ Azure OpenAI multiple images response received`);
      
      return this.normalizeMultipleResponse(response.data, { ...metadata, modelId: modelConfig.id });

    } catch (error) {
      console.error('❌ Azure OpenAI multiple images generation failed:', error.message);
      
      if (error.response) {
        console.error('Response error:', error.response.data);
      }
      
      throw this.normalizeError(error);
    }
  }

  /**
   * Transform request to Azure OpenAI DALL-E format for multiple images
   */
  transformRequest(request, modelConfig) {
    // Ensure count doesn't exceed API limits
    const count = Math.min(request.count || 1, 10);
    
    return {
      prompt: request.prompt,
      n: count, // Number of images to generate
      size: request.parameters?.size || '1024x1024',
      quality: request.parameters?.quality || 'medium',
      output_compression: 100,
      output_format: 'png'
    };
  }

  /**
   * Get the correct Azure OpenAI images endpoint
   */
  getImageEndpoint(modelId) {
    const baseEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
    if (!baseEndpoint) {
      throw new Error('AZURE_OPENAI_ENDPOINT environment variable not set');
    }
    
    // Use the deployment name from model registry (gpt-image-1)
    return `${baseEndpoint}/openai/deployments/gpt-image-1/images/generations?api-version=2025-04-01-preview`;
  }

  /**
   * Normalize Azure OpenAI multiple images response
   */
  normalizeMultipleResponse(response, metadata) {
    if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
      throw new Error('Invalid response from Azure OpenAI: no images returned');
    }

    const images = response.data.map((imageData, index) => {
      // Handle both URL and base64 formats
      let imageUrl = imageData.url;
      if (!imageUrl && imageData.b64_json) {
        // Convert base64 to data URL for immediate use
        imageUrl = `data:image/png;base64,${imageData.b64_json}`;
      }
      
      if (!imageUrl && !imageData.b64_json) {
        throw new Error(`Invalid image data at index ${index}: no URL or base64 data returned`);
      }
      
      return {
        url: imageUrl,
        b64_json: imageData.b64_json || null,
        index: index
      };
    });

    return {
      text: null,
      finishReason: 'completed',
      model: metadata.modelId,
      images: images, // Array of image objects
      count: images.length,
      usage: {
        promptTokens: null,
        completionTokens: null,
        totalTokens: null
      },
      functionCall: null,
      metadata: {
        provider: this.provider,
        requestId: response.id || null,
        created: response.created || Date.now()
      },
      executionTime: metadata.executionTime || 0,
      provider: this.provider,
      capability: 'image-generation',
      useCase: 'multiple-images'
    };
  }

  /**
   * Normalize errors from Azure OpenAI
   */
  normalizeError(error) {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      
      if (status === 401) {
        return new Error('Azure OpenAI authentication failed');
      } else if (status === 400) {
        return new Error(`Azure OpenAI request error: ${data.error?.message || 'Invalid request'}`);
      } else if (status === 429) {
        return new Error('Azure OpenAI rate limit exceeded');
      } else if (status >= 500) {
        return new Error('Azure OpenAI service unavailable');
      }
      
      return new Error(`Azure OpenAI error (${status}): ${data.error?.message || error.message}`);
    }
    
    return error;
  }
}

module.exports = AzureMultipleImages;