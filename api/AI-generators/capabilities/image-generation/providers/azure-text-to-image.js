/**
 * Azure OpenAI Text-to-Image Provider
 * Handles image generation from text using Azure OpenAI DALL-E 3
 */

const TextToImageInterface = require('../interfaces/TextToImageInterface');
const ProviderCredentials = require('../../../config/provider-credentials');
const axios = require('axios');

class AzureTextToImage extends TextToImageInterface {
  constructor() {
    super();
    this.provider = 'azure';
    this.config = ProviderCredentials.getProviderConfig(this.provider);
  }

  /**
   * Generate image from text using Azure OpenAI DALL-E 3
   */
  async generateImage(request, modelConfig, metadata) {
    try {
      console.log(`🎨 Azure OpenAI: Generating image with model ${modelConfig.id}`);

      // Transform request to Azure OpenAI format
      const azureRequest = this.transformRequest(request, modelConfig);
      
      // Get endpoint and headers for DALL-E 3
      const endpoint = this.getImageEndpoint(modelConfig.id);
      const headers = await ProviderCredentials.getAuthHeaders(this.provider);
      
      // Make API call
      console.log(`🌐 Calling Azure OpenAI Images: ${endpoint}`);
      
      const response = await axios.post(endpoint, azureRequest, {
        headers,
        timeout: this.config.timeout || 60000
      });

      console.log(`✅ Azure OpenAI image response received`);
      console.log('🔍 Raw response data:', JSON.stringify(response.data, null, 2));
      
      return this.normalizeResponse(response.data, { ...metadata, modelId: modelConfig.id });

    } catch (error) {
      console.error('❌ Azure OpenAI image generation failed:', error.message);
      
      if (error.response) {
        console.error('Response error:', error.response.data);
      }
      
      throw this.normalizeError(error);
    }
  }

  /**
   * Transform request to Azure OpenAI DALL-E format
   */
  transformRequest(request, modelConfig) {
    return {
      prompt: request.prompt,
      n: 1, // Always 1 for text-to-image
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
    
    // Ensure no trailing slash on base endpoint
    const cleanBase = baseEndpoint.replace(/\/+$/, '');
    
    // Use the deployment name from model registry (gpt-image-1)
    return `${cleanBase}/openai/deployments/gpt-image-1/images/generations?api-version=2025-04-01-preview`;
  }

  /**
   * Normalize Azure OpenAI response
   */
  normalizeResponse(response, metadata) {
    if (!response.data || !response.data[0]) {
      throw new Error('Invalid response from Azure OpenAI: no image data returned');
    }

    const imageData = response.data[0];
    
    // Handle both URL and base64 formats
    let imageUrl = imageData.url;
    if (!imageUrl && imageData.b64_json) {
      // Convert base64 to data URL for immediate use
      imageUrl = `data:image/png;base64,${imageData.b64_json}`;
    }
    
    if (!imageUrl && !imageData.b64_json) {
      throw new Error('Invalid response from Azure OpenAI: no image URL or base64 data returned');
    }

    return {
      text: null,
      finishReason: 'completed',
      model: metadata.modelId,
      url: imageUrl, // Primary image URL or data URL
      b64_json: imageData.b64_json || null, // Include base64 if available
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
      useCase: 'text-to-image'
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

module.exports = AzureTextToImage;