/**
 * Model Registry
 * Central registry of all available AI models organized by capability and use case
 */

const MODEL_REGISTRY = {
  "video-generation": {
    "text-to-video": {
      "google": {
        "models": [
          {
            "id": "veo-3.1-generate-001",
            "name": "Veo 3.1 Stable",
            "tier": "premium",
            "capabilities": {
              "maxDuration": 8,
              "resolutions": ["720p", "1080p"],
              "aspectRatios": ["16:9", "9:16", "1:1"],
              "audio": true,
              "quality": ["standard", "high"],
              "maxPromptLength": 2048
            },
            "pricing": { 
              "perSecond": 0.05,
              "currency": "USD"
            },
            "priority": 1,
            "status": "active",
            "description": "Latest stable Veo model with highest quality output"
          },
          {
            "id": "veo-3.1-fast-generate-001",
            "name": "Veo 3.1 Fast",
            "tier": "standard",
            "capabilities": {
              "maxDuration": 6,
              "resolutions": ["720p", "1080p"],
              "aspectRatios": ["16:9", "9:16"],
              "audio": true,
              "quality": ["standard"],
              "maxPromptLength": 1024
            },
            "pricing": { 
              "perSecond": 0.03,
              "currency": "USD"
            },
            "priority": 2,
            "status": "active",
            "description": "Faster generation with good quality"
          },
          {
            "id": "veo-3.0-generate-001",
            "name": "Veo 3.0",
            "tier": "standard",
            "capabilities": {
              "maxDuration": 5,
              "resolutions": ["720p"],
              "aspectRatios": ["16:9"],
              "audio": false,
              "quality": ["standard"],
              "maxPromptLength": 512
            },
            "pricing": { 
              "perSecond": 0.02,
              "currency": "USD"
            },
            "priority": 3,
            "status": "deprecated",
            "description": "Legacy model for basic video generation"
          }
        ]
      },
      // Future providers
      "runway": {
        "models": [
          {
            "id": "gen-3-alpha",
            "name": "Runway Gen-3 Alpha",
            "tier": "premium",
            "capabilities": {
              "maxDuration": 10,
              "resolutions": ["720p", "1080p", "4k"],
              "aspectRatios": ["16:9", "9:16", "1:1"],
              "audio": false,
              "quality": ["high", "ultra"]
            },
            "pricing": { 
              "perSecond": 0.08,
              "currency": "USD"
            },
            "priority": 1,
            "status": "planned",
            "description": "Advanced video generation with motion control"
          }
        ]
      }
    },
    
    "image-to-video": {
      "google": {
        "models": [
          {
            "id": "veo-3.1-i2v-generate-001",
            "name": "Veo 3.1 Image-to-Video",
            "tier": "premium",
            "capabilities": {
              "maxDuration": 8,
              "resolutions": ["720p", "1080p"],
              "aspectRatios": ["16:9", "9:16", "1:1"],
              "audio": true,
              "quality": ["standard", "high"],
              "inputFormats": ["jpeg", "png", "webp"],
              "maxImageSize": "10MB"
            },
            "pricing": { 
              "perSecond": 0.07,
              "currency": "USD"
            },
            "priority": 1,
            "status": "active",
            "description": "Transform static images into dynamic videos"
          }
        ]
      }
    }
  },

  "image-generation": {
    "text-to-image": {
      "google": {
        "models": [
          {
            "id": "imagen-3.0",
            "name": "Imagen 3.0",
            "tier": "premium",
            "capabilities": {
              "resolutions": ["512x512", "1024x1024", "1536x1536"],
              "formats": ["jpeg", "png", "webp"],
              "quality": ["standard", "high"],
              "maxPromptLength": 2048,
              "multipleImages": true
            },
            "pricing": { 
              "perImage": 0.02,
              "currency": "USD"
            },
            "priority": 1,
            "status": "active"
          }
        ]
      }
    }
  },

  "text-generation": {
    "conversation": {
      "google": {
        "models": [
          {
            "id": "gemini-1.5-pro",
            "name": "Gemini 1.5 Pro",
            "tier": "premium",
            "capabilities": {
              "maxTokens": 32000,
              "contextWindow": 1000000,
              "multimodal": true,
              "languages": ["en", "es", "fr", "de", "pt", "it"]
            },
            "pricing": { 
              "per1KTokens": 0.001,
              "currency": "USD"
            },
            "priority": 2,
            "status": "active"
          }
        ]
      },
      "azure": {
        "models": [
          {
            "id": "gpt-4.1",
            "name": "GPT-4.1 (Azure OpenAI)",
            "tier": "premium",
            "capabilities": {
              "maxTokens": 4096,
              "contextWindow": 32768,
              "multimodal": false,
              "streaming": true,
              "languages": ["en", "es", "fr", "de", "pt", "it", "ru", "ja", "ko", "zh"],
              "functions": true,
              "json_mode": true
            },
            "pricing": { 
              "per1KTokens": 0.03,
              "currency": "USD"
            },
            "priority": 1,
            "status": "active",
            "description": "Latest GPT-4.1 model via Azure OpenAI with enterprise features"
          },
          {
            "id": "gpt-4o-mini", 
            "name": "GPT-4o Mini (Azure OpenAI)",
            "tier": "standard",
            "capabilities": {
              "maxTokens": 4096,
              "contextWindow": 16384,
              "multimodal": false,
              "streaming": true,
              "languages": ["en", "es", "fr", "de", "pt", "it"],
              "functions": true,
              "json_mode": true
            },
            "pricing": { 
              "per1KTokens": 0.0015,
              "currency": "USD"
            },
            "priority": 3,
            "status": "active",
            "description": "Fast and efficient GPT-4o Mini for high-volume applications"
          }
        ]
      }
    },
    "content-creation": {
      "google": {
        "models": [
          {
            "id": "gemini-1.5-pro",
            "name": "Gemini 1.5 Pro",
            "tier": "premium",
            "capabilities": {
              "maxTokens": 32000,
              "contextWindow": 1000000,
              "multimodal": true,
              "languages": ["en", "es", "fr", "de", "pt", "it"]
            },
            "pricing": { 
              "per1KTokens": 0.001,
              "currency": "USD"
            },
            "priority": 2,
            "status": "active"
          }
        ]
      },
      "azure": {
        "models": [
          {
            "id": "gpt-4.1",
            "name": "GPT-4.1 Content Creator (Azure OpenAI)",
            "tier": "premium", 
            "capabilities": {
              "maxTokens": 4096,
              "contextWindow": 32768,
              "multimodal": false,
              "streaming": true,
              "contentTypes": ["blog", "marketing", "social", "email", "product_description"],
              "tones": ["professional", "casual", "friendly", "persuasive", "authoritative"],
              "languages": ["en", "es", "fr", "de", "pt", "it"]
            },
            "pricing": { 
              "per1KTokens": 0.03,
              "currency": "USD"
            },
            "priority": 1,
            "status": "active",
            "description": "GPT-4.1 optimized for marketing and creative content generation"
          }
        ]
      }
    }
  },

  "image-generation": {
    "text-to-image": {
      "azure": {
        "models": [
          {
            "id": "gpt-image-1",
            "name": "GPT Image 1 (DALL-E 3 Azure)",
            "tier": "premium",
            "capabilities": {
              "maxResolution": "1024x1024",
              "supportedSizes": ["1024x1024", "1792x1024", "1024x1792"],
              "maxPromptLength": 4000,
              "styles": ["vivid", "natural"],
              "quality": ["low", "standard", "high", "ultra"],
              "format": "png"
            },
            "pricing": { 
              "perImage": 0.04,
              "currency": "USD"
            },
            "priority": 1,
            "status": "active",
            "description": "Latest DALL-E 3 model via Azure OpenAI for high-quality image generation"
          }
        ]
      }
    },

    "image-to-image": {
      "azure": {
        "models": [
          {
            "id": "gpt-image-1",
            "name": "GPT Image 1 Edit (DALL-E 3 Azure)",
            "tier": "premium",
            "capabilities": {
              "maxResolution": "1024x1024",
              "supportedSizes": ["1024x1024", "1792x1024", "1024x1792"],
              "maxPromptLength": 4000,
              "editModes": ["inpainting", "outpainting", "variation"],
              "format": "png"
            },
            "pricing": { 
              "perImage": 0.08,
              "currency": "USD"
            },
            "priority": 1,
            "status": "active",
            "description": "DALL-E 3 image editing capabilities via Azure OpenAI"
          }
        ]
      }
    },

    "multiple-images": {
      "azure": {
        "models": [
          {
            "id": "gpt-image-1",
            "name": "GPT Image 1 Batch (DALL-E 3 Azure)",
            "tier": "premium",
            "capabilities": {
              "maxCount": 10,
              "maxResolution": "1024x1024",
              "supportedSizes": ["1024x1024", "1792x1024", "1024x1792"],
              "maxPromptLength": 4000,
              "styles": ["vivid", "natural"],
              "quality": ["standard", "hd"],
              "format": "png",
              "batchProcessing": true
            },
            "pricing": { 
              "perImage": 0.04,
              "currency": "USD"
            },
            "priority": 1,
            "status": "active",
            "description": "Generate multiple image variations using DALL-E 3 via Azure OpenAI"
          }
        ]
      }
    }
  }
};

/**
 * Get all models for a specific capability and use case
 */
function getModels(capability, useCase, provider = null) {
  const capabilityModels = MODEL_REGISTRY[capability];
  if (!capabilityModels) {
    throw new Error(`Capability '${capability}' not found in registry`);
  }

  const useCaseModels = capabilityModels[useCase];
  if (!useCaseModels) {
    throw new Error(`Use case '${useCase}' not found for capability '${capability}'`);
  }

  if (provider) {
    const providerModels = useCaseModels[provider];
    if (!providerModels) {
      throw new Error(`Provider '${provider}' not found for ${capability}/${useCase}`);
    }
    return providerModels.models;
  }

  // Return all models from all providers, sorted by priority
  const allModels = [];
  Object.keys(useCaseModels).forEach(providerKey => {
    const models = useCaseModels[providerKey].models.map(model => ({
      ...model,
      provider: providerKey
    }));
    allModels.push(...models);
  });

  return allModels.sort((a, b) => a.priority - b.priority);
}

/**
 * Get a specific model by ID
 */
function getModelById(modelId) {
  for (const capability of Object.keys(MODEL_REGISTRY)) {
    for (const useCase of Object.keys(MODEL_REGISTRY[capability])) {
      for (const provider of Object.keys(MODEL_REGISTRY[capability][useCase])) {
        const models = MODEL_REGISTRY[capability][useCase][provider].models;
        const model = models.find(m => m.id === modelId);
        if (model) {
          return {
            ...model,
            provider,
            capability,
            useCase
          };
        }
      }
    }
  }
  throw new Error(`Model '${modelId}' not found in registry`);
}

/**
 * Get all available providers for a capability/use case
 */
function getProviders(capability, useCase) {
  const useCaseModels = MODEL_REGISTRY[capability]?.[useCase];
  if (!useCaseModels) {
    return [];
  }
  return Object.keys(useCaseModels);
}

/**
 * Get all models across all capabilities
 */
function getAllModels() {
  return MODEL_REGISTRY;
}

/**
 * Check if a provider supports a capability/use case
 */
function supportsCapability(provider, capability, useCase) {
  return MODEL_REGISTRY[capability]?.[useCase]?.[provider] !== undefined;
}

/**
 * Get model capabilities for validation
 */
function getModelCapabilities(modelId) {
  const model = getModelById(modelId);
  return model.capabilities;
}

module.exports = {
  MODEL_REGISTRY,
  getAllModels,
  getModels,
  getModelById,
  getProviders,
  supportsCapability,
  getModelCapabilities
};