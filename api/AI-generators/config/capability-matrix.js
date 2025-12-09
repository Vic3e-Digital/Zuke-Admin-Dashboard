/**
 * Capability Matrix
 * Maps capabilities to providers and their models
 * Used for intelligent routing and fallback strategies
 */

const CAPABILITY_MATRIX = {
  "video-generation": {
    description: "AI-powered video generation from text or images",
    useCases: {
      "text-to-video": {
        description: "Generate video content from text prompts",
        providers: {
          google: {
            status: "active",
            models: ["veo-3.1-generate-001", "veo-3.1-fast-generate-001", "veo-3.0-generate-001"],
            strengths: ["High quality", "Realistic motion", "Audio generation"],
            limitations: ["8 second max duration", "Limited aspect ratios"],
            costTier: "premium"
          },
          runway: {
            status: "planned",
            models: ["gen-3-alpha"],
            strengths: ["Motion control", "Extended duration", "4K support"],
            limitations: ["No audio", "Higher cost"],
            costTier: "premium"
          }
        },
        fallbackOrder: ["google", "runway"],
        requirements: {
          essential: ["prompt"],
          optional: ["duration", "resolution", "aspectRatio", "audio"]
        }
      },
      
      "image-to-video": {
        description: "Animate static images into video content",
        providers: {
          google: {
            status: "active",
            models: ["veo-3.1-i2v-generate-001"],
            strengths: ["Natural animation", "Preserves image quality", "Multiple formats"],
            limitations: ["Single image input", "8 second duration"],
            costTier: "premium"
          },
          runway: {
            status: "planned",
            models: ["gen-3-alpha-i2v"],
            strengths: ["Advanced motion control", "Multi-image composition"],
            limitations: ["Complex setup", "Higher cost"],
            costTier: "premium"
          }
        },
        fallbackOrder: ["google", "runway"],
        requirements: {
          essential: ["prompt", "image"],
          optional: ["duration", "resolution", "motionIntensity"]
        }
      }
    }
  },

  "image-generation": {
    description: "AI-powered image creation from text descriptions",
    useCases: {
      "text-to-image": {
        description: "Generate images from text prompts",
        providers: {
          azure: {
            status: "active",
            models: ["gpt-image-1"],
            strengths: ["High quality", "Enterprise security", "Creative interpretation", "1024x1024 HD"],
            limitations: ["Content filters", "Rate limits"],
            costTier: "premium"
          },
          google: {
            status: "active",
            models: ["imagen-3.0"],
            strengths: ["Photorealistic", "Text rendering", "Style variety"],
            limitations: ["Moderate resolution", "Limited fine-tuning"],
            costTier: "standard"
          },
          openai: {
            status: "planned",
            models: ["dall-e-3"],
            strengths: ["Creative interpretation", "High resolution", "Artistic styles"],
            limitations: ["Higher cost", "Content filters"],
            costTier: "premium"
          },
          stability: {
            status: "planned",
            models: ["stable-diffusion-3"],
            strengths: ["Fast generation", "Multiple variations", "Open source"],
            limitations: ["Inconsistent quality", "Complex prompting"],
            costTier: "budget"
          }
        },
        fallbackOrder: ["azure", "google", "openai", "stability"],
        requirements: {
          essential: ["prompt"],
          optional: ["resolution", "style", "aspectRatio", "variations"]
        }
      },
      
      "image-to-image": {
        description: "Transform or edit existing images",
        providers: {
          azure: {
            status: "active",
            models: ["gpt-image-1"],
            strengths: ["High quality editing", "Style transfer", "Enterprise security"],
            limitations: ["Content filters", "Limited inpainting"],
            costTier: "premium"
          },
          stability: {
            status: "planned",
            models: ["stable-diffusion-3-img2img"],
            strengths: ["Precise editing", "Style transfer", "Inpainting"],
            limitations: ["Complex parameters", "Learning curve"],
            costTier: "standard"
          }
        },
        fallbackOrder: ["azure", "stability"],
        requirements: {
          essential: ["prompt", "image"],
          optional: ["strength", "guidance", "mask"]
        }
      },

      "multiple-images": {
        description: "Generate multiple image variations from a single prompt",
        providers: {
          azure: {
            status: "active",
            models: ["gpt-image-1"],
            strengths: ["Consistent quality", "Creative variations", "HD resolution"],
            limitations: ["Max 10 images per request", "Higher cost for multiple"],
            costTier: "premium"
          }
        },
        fallbackOrder: ["azure"],
        requirements: {
          essential: ["prompt", "count"],
          optional: ["resolution", "style", "aspectRatio"]
        }
      }
    }
  },

  "text-generation": {
    description: "AI-powered text creation and conversation",
    useCases: {
      "conversation": {
        description: "Interactive chat and dialogue generation",
        providers: {
          google: {
            status: "active",
            models: ["gemini-1.5-pro"],
            strengths: ["Large context", "Multimodal", "Reasoning"],
            limitations: ["Response time", "Regional availability"],
            costTier: "standard"
          },
          openai: {
            status: "planned", 
            models: ["gpt-4", "gpt-4-turbo"],
            strengths: ["High quality", "Code generation", "Creative writing"],
            limitations: ["Cost", "Rate limits"],
            costTier: "premium"
          },
          azure: {
            status: "active",
            models: ["gpt-4o-mini", "gpt-4.1"],
            strengths: ["Enterprise security", "High availability", "Fast response"],
            limitations: ["Regional deployment", "Configuration complexity"],
            costTier: "standard"
          }
        },
        fallbackOrder: ["azure", "google", "openai"],
        requirements: {
          essential: ["prompt"],
          optional: ["maxTokens", "temperature", "systemPrompt"]
        }
      },
      
      "content-creation": {
        description: "Generate marketing copy, articles, and creative content",
        providers: {
          google: {
            status: "active",
            models: ["gemini-1.5-pro"],
            strengths: ["Factual accuracy", "Multiple languages", "Long form content"],
            limitations: ["Creative limitations", "Formal tone"],
            costTier: "standard"
          },
          azure: {
            status: "active",
            models: ["gpt-4o-mini", "gpt-4.1"],
            strengths: ["Creative content", "Marketing copy", "Brand voice consistency"],
            limitations: ["Token limits", "Cost per request"],
            costTier: "standard"
          }
        },
        fallbackOrder: ["azure", "google"],
        requirements: {
          essential: ["prompt", "contentType"],
          optional: ["tone", "length", "audience"]
        }
      }
    }
  }
};

/**
 * Get capability information
 */
function getCapability(capability) {
  const cap = CAPABILITY_MATRIX[capability];
  if (!cap) {
    throw new Error(`Capability '${capability}' not found in matrix`);
  }
  return cap;
}

/**
 * Get use case information
 */
function getUseCase(capability, useCase) {
  const cap = getCapability(capability);
  const uc = cap.useCases[useCase];
  if (!uc) {
    throw new Error(`Use case '${useCase}' not found for capability '${capability}'`);
  }
  return uc;
}

/**
 * Get all available capabilities
 */
function getAllCapabilities() {
  return Object.keys(CAPABILITY_MATRIX).map(key => ({
    name: key,
    description: CAPABILITY_MATRIX[key].description,
    useCases: Object.keys(CAPABILITY_MATRIX[key].useCases)
  }));
}

/**
 * Get all use cases for a capability
 */
function getUseCases(capability) {
  const cap = getCapability(capability);
  return Object.keys(cap.useCases).map(key => ({
    name: key,
    description: cap.useCases[key].description,
    providers: Object.keys(cap.useCases[key].providers)
  }));
}

/**
 * Get active providers for a use case
 */
function getActiveProviders(capability, useCase) {
  const uc = getUseCase(capability, useCase);
  return Object.keys(uc.providers).filter(provider => 
    uc.providers[provider].status === 'active'
  );
}

/**
 * Get fallback order for a use case
 */
function getFallbackOrder(capability, useCase) {
  const uc = getUseCase(capability, useCase);
  return uc.fallbackOrder || [];
}

/**
 * Get requirements for a use case
 */
function getRequirements(capability, useCase) {
  const uc = getUseCase(capability, useCase);
  return uc.requirements;
}

/**
 * Check if a provider supports a specific capability/use case
 */
function supportsCapability(provider, capability, useCase) {
  try {
    const uc = getUseCase(capability, useCase);
    return uc.providers[provider] !== undefined;
  } catch (error) {
    return false;
  }
}

/**
 * Get provider information for a specific capability/use case
 */
function getProviderInfo(provider, capability, useCase) {
  const uc = getUseCase(capability, useCase);
  const providerInfo = uc.providers[provider];
  if (!providerInfo) {
    throw new Error(`Provider '${provider}' not found for ${capability}/${useCase}`);
  }
  return providerInfo;
}

/**
 * Get recommended provider based on requirements
 */
function getRecommendedProvider(capability, useCase, preferences = {}) {
  const uc = getUseCase(capability, useCase);
  const activeProviders = getActiveProviders(capability, useCase);
  
  if (activeProviders.length === 0) {
    throw new Error(`No active providers available for ${capability}/${useCase}`);
  }

  // If specific provider requested and available
  if (preferences.provider && activeProviders.includes(preferences.provider)) {
    return preferences.provider;
  }

  // If cost preference specified
  if (preferences.costTier) {
    const matchingProviders = activeProviders.filter(provider => 
      uc.providers[provider].costTier === preferences.costTier
    );
    if (matchingProviders.length > 0) {
      return matchingProviders[0];
    }
  }

  // Use fallback order
  const fallbackOrder = getFallbackOrder(capability, useCase);
  for (const provider of fallbackOrder) {
    if (activeProviders.includes(provider)) {
      return provider;
    }
  }

  // Default to first active provider
  return activeProviders[0];
}

/**
 * Validate request requirements
 */
function validateRequirements(capability, useCase, request) {
  const requirements = getRequirements(capability, useCase);
  const errors = [];

  // Check essential requirements
  for (const field of requirements.essential) {
    let fieldExists = false;
    
    // Check direct field or in parameters
    if (request[field] || request.parameters?.[field]) {
      fieldExists = true;
    }
    
    // Special handling for image-to-image: check media array for image field
    if (!fieldExists && field === 'image' && capability === 'image-generation' && useCase === 'image-to-image') {
      if (request.media && Array.isArray(request.media)) {
        const imageMedia = request.media.filter(m => m.type === 'image');
        if (imageMedia.length > 0 && imageMedia[0].data) {
          fieldExists = true;
        }
      }
    }
    
    if (!fieldExists) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get capability matrix stats
 */
function getStats() {
  const capabilities = Object.keys(CAPABILITY_MATRIX);
  let totalUseCases = 0;
  let totalProviders = 0;
  let activeProviders = 0;

  capabilities.forEach(capability => {
    const useCases = Object.keys(CAPABILITY_MATRIX[capability].useCases);
    totalUseCases += useCases.length;

    useCases.forEach(useCase => {
      const providers = Object.keys(CAPABILITY_MATRIX[capability].useCases[useCase].providers);
      totalProviders += providers.length;
      
      providers.forEach(provider => {
        const status = CAPABILITY_MATRIX[capability].useCases[useCase].providers[provider].status;
        if (status === 'active') {
          activeProviders++;
        }
      });
    });
  });

  return {
    capabilities: capabilities.length,
    useCases: totalUseCases,
    providers: totalProviders,
    activeProviders
  };
}

module.exports = {
  CAPABILITY_MATRIX,
  getCapability,
  getUseCase,
  getAllCapabilities,
  getUseCases,
  getActiveProviders,
  getFallbackOrder,
  getRequirements,
  supportsCapability,
  getProviderInfo,
  getRecommendedProvider,
  validateRequirements,
  getStats
};