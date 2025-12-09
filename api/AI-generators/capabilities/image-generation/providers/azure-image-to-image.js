/**
 * Azure OpenAI Image-to-Image Provider
 * Handles image editing and transformation using Azure OpenAI DALL-E 3
 */

const ImageToImageInterface = require('../interfaces/ImageToImageInterface');
const ProviderCredentials = require('../../../config/provider-credentials');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

class AzureImageToImage extends ImageToImageInterface {
  constructor() {
    super();
    this.provider = 'azure';
    this.config = ProviderCredentials.getProviderConfig(this.provider);
  }

  /**
   * Generate image from existing image using Azure OpenAI DALL-E 3
   */
  async generateImageFromImage(request, modelConfig, metadata) {
    try {
      console.log(`🎨 Azure OpenAI: Generating enhanced image with model ${modelConfig.id}`);

      // Prepare payload for image generation
      const payload = await this.prepareFormData(request, modelConfig);
      
      // Get endpoint for DALL-E 3 generations
      const endpoint = this.getImageEditEndpoint(modelConfig.id);
      const headers = await ProviderCredentials.getAuthHeaders(this.provider);
      
      // Set JSON content type
      headers['Content-Type'] = 'application/json';
      
      // Make API call
      console.log(`🌐 Calling Azure OpenAI Image Generation: ${endpoint}`);
      
      const response = await axios.post(endpoint, payload, {
        headers,
        timeout: this.config.timeout || 120000, // Longer timeout for image processing
        maxContentLength: 50 * 1024 * 1024, // 50MB max
        maxBodyLength: 50 * 1024 * 1024
      });

      console.log(`✅ Azure OpenAI image generation response received`);
      
      return this.normalizeResponse(response.data, { ...metadata, modelId: modelConfig.id });

    } catch (error) {
      console.error('❌ Azure OpenAI image editing failed:', error.message);
      
      if (error.response) {
        console.error('Response error:', error.response.data);
      }
      
      throw this.normalizeError(error);
    }
  }

  /**
   * Prepare request data for Azure OpenAI image generation
   * Note: Azure OpenAI doesn't support image edits, so we use generation with enhanced prompt
   */
  async prepareFormData(request, modelConfig) {
    // For Azure OpenAI generations, we use JSON payload
    const payload = {
      prompt: `Create a professional product image with the following specifications: ${request.prompt}. Make it suitable for e-commerce with clean, high-quality styling.`,
      n: 1,
      size: request.parameters?.size || '1024x1024',
      quality: request.parameters?.quality || 'standard'
    };
    
    console.log('🔧 Using image generation for Azure OpenAI (edits not supported)');
    console.log('📝 Generation prompt:', payload.prompt);
    
    return payload;
  }

  /**
   * Get the correct Azure OpenAI image edits endpoint
   */
  getImageEditEndpoint(modelId) {
    const baseEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
    if (!baseEndpoint) {
      throw new Error('AZURE_OPENAI_ENDPOINT environment variable not set');
    }
    
    // Ensure no double slashes in URL
    const cleanEndpoint = baseEndpoint.replace(/\/$/, '');
    
    // Azure OpenAI doesn't support image edits, use generations instead
    return `${cleanEndpoint}/openai/deployments/gpt-image-1/images/edits?api-version=2025-04-01-preview`;
  }

  /**
   * Normalize Azure OpenAI response
   */
  normalizeResponse(response, metadata) {
    if (!response.data || !response.data[0] || !response.data[0].url) {
      throw new Error('Invalid response from Azure OpenAI: no image URL returned');
    }

    return {
      text: null,
      finishReason: 'completed',
      model: metadata.modelId,
      url: response.data[0].url, // Primary image URL
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
      useCase: 'image-to-image'
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
      } else if (status === 413) {
        return new Error('Image file too large for Azure OpenAI');
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

module.exports = AzureImageToImage;