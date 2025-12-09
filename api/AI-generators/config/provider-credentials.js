/**
 * Provider Credentials Configuration
 * Manages API keys, endpoints, and authentication for all AI providers
 */

const { GoogleAuth } = require('google-auth-library');

const PROVIDER_CONFIGS = {
  google: {
    name: "Google Cloud Vertex AI",
    baseUrl: "https://us-central1-aiplatform.googleapis.com/v1",
    authentication: {
      type: "service_account", // or "api_key"
      credentials: {
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
        location: process.env.VERTEX_AI_LOCATION || "us-central1",
        apiKey: process.env.VERTEX_AI_API_KEY,
        serviceAccountPath: process.env.GOOGLE_SERVICE_ACCOUNT_PATH
      }
    },
    endpoints: {
      "veo-3.1-generate-001": "/projects/{projectId}/locations/{location}/publishers/google/models/veo-3.1-generate-001:predict",
      "veo-3.1-fast-generate-001": "/projects/{projectId}/locations/{location}/publishers/google/models/veo-3.1-fast-generate-001:predict",
      "veo-3.1-i2v-generate-001": "/projects/{projectId}/locations/{location}/publishers/google/models/veo-3.1-i2v-generate-001:predict",
      "imagen-3.0": "/projects/{projectId}/locations/{location}/publishers/google/models/imagen-3.0:predict",
      "gemini-1.5-pro": "/projects/{projectId}/locations/{location}/publishers/google/models/gemini-1.5-pro:predict"
    },
    rateLimits: {
      requestsPerMinute: 60,
      requestsPerDay: 1000
    },
    timeout: 300000, // 5 minutes for video generation
    retryConfig: {
      maxRetries: 3,
      backoffMultiplier: 2,
      initialDelay: 1000
    }
  },

  runway: {
    name: "Runway ML",
    baseUrl: "https://api.runwayml.com/v1",
    authentication: {
      type: "api_key",
      credentials: {
        apiKey: process.env.RUNWAY_API_KEY
      }
    },
    endpoints: {
      "gen-3-alpha": "/video/generate"
    },
    rateLimits: {
      requestsPerMinute: 10,
      requestsPerDay: 100
    },
    timeout: 600000, // 10 minutes
    retryConfig: {
      maxRetries: 2,
      backoffMultiplier: 3,
      initialDelay: 2000
    }
  },

  azure: {
    name: "Azure OpenAI",
    baseUrl: process.env.AZURE_OPENAI_ENDPOINT || "https://zuke-n8n-videos.cognitiveservices.azure.com",
    authentication: {
      type: "api_key",
      credentials: {
        apiKey: process.env.AZURE_OPENAI_API_KEY,
        deployment: process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4.1"
      }
    },
    endpoints: {
      "gpt-4.1": "/openai/deployments/{deployment}/chat/completions?api-version=2024-08-01-preview",
      "gpt-4o-mini": "/openai/deployments/{deployment}/chat/completions?api-version=2024-08-01-preview"
    },
    rateLimits: {
      requestsPerMinute: 120,
      requestsPerDay: 50000
    },
    timeout: 60000, // 60 seconds for text generation
    retryConfig: {
      maxRetries: 3,
      backoffMultiplier: 1.5,
      initialDelay: 500
    }
  },

  openai: {
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    authentication: {
      type: "bearer_token",
      credentials: {
        apiKey: process.env.OPENAI_API_KEY
      }
    },
    endpoints: {
      "gpt-4": "/chat/completions",
      "dall-e-3": "/images/generations"
    },
    rateLimits: {
      requestsPerMinute: 500,
      requestsPerDay: 10000
    },
    timeout: 120000, // 2 minutes
    retryConfig: {
      maxRetries: 3,
      backoffMultiplier: 2,
      initialDelay: 1000
    }
  },

  stability: {
    name: "Stability AI",
    baseUrl: "https://api.stability.ai/v2beta",
    authentication: {
      type: "api_key",
      credentials: {
        apiKey: process.env.STABILITY_API_KEY
      }
    },
    endpoints: {
      "stable-diffusion-3": "/generate/sd3"
    },
    rateLimits: {
      requestsPerMinute: 150,
      requestsPerDay: 2000
    },
    timeout: 180000, // 3 minutes
    retryConfig: {
      maxRetries: 3,
      backoffMultiplier: 2,
      initialDelay: 1500
    }
  }
};

/**
 * Get provider configuration
 */
function getProviderConfig(provider) {
  const config = PROVIDER_CONFIGS[provider];
  if (!config) {
    throw new Error(`Provider '${provider}' not found in configuration`);
  }

  // Validate that required credentials are present
  if (!validateCredentials(config)) {
    throw new Error(`Invalid or missing credentials for provider '${provider}'`);
  }

  return config;
}

/**
 * Validate provider credentials
 */
function validateCredentials(config) {
  const { authentication } = config;
  
  switch (authentication.type) {
    case 'api_key':
      return !!authentication.credentials.apiKey;
    
    case 'bearer_token':
      return !!authentication.credentials.apiKey;
    
    case 'service_account':
      return !!(authentication.credentials.projectId && 
               (authentication.credentials.apiKey || authentication.credentials.serviceAccountPath));
    
    default:
      return false;
  }
}

/**
 * Get endpoint URL for a specific model
 */
function getEndpointUrl(provider, modelId) {
  const config = getProviderConfig(provider);
  const endpoint = config.endpoints[modelId];
  
  if (!endpoint) {
    throw new Error(`Endpoint not found for model '${modelId}' in provider '${provider}'`);
  }

  let url = config.baseUrl + endpoint;

  // Replace placeholders for Google Cloud
  if (provider === 'google') {
    const { projectId, location } = config.authentication.credentials;
    url = url.replace('{projectId}', projectId).replace('{location}', location);
  }

  // Replace placeholders for Azure OpenAI
  if (provider === 'azure') {
    const { deployment } = config.authentication.credentials;
    url = url.replace('{deployment}', deployment);
  }

  return url;
}

/**
 * Get authentication headers for a provider
 */
async function getAuthHeaders(provider) {
  const config = getProviderConfig(provider);
  const { authentication } = config;

  switch (authentication.type) {
    case 'api_key':
      return {
        'Authorization': `Bearer ${authentication.credentials.apiKey}`,
        'Content-Type': 'application/json'
      };
    
    case 'bearer_token':
      return {
        'Authorization': `Bearer ${authentication.credentials.apiKey}`,
        'Content-Type': 'application/json'
      };
    
    case 'service_account':
      // For Google Cloud, try different authentication methods in order
      try {
        // Method 1: Service account file if provided
        if (authentication.credentials.serviceAccountPath) {
          console.log('🔑 Using service account file authentication...');
          const auth = new GoogleAuth({
            projectId: authentication.credentials.projectId,
            keyFile: authentication.credentials.serviceAccountPath,
            scopes: ['https://www.googleapis.com/auth/cloud-platform']
          });
          
          const accessToken = await auth.getAccessToken();
          
          return {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'x-goog-user-project': authentication.credentials.projectId
          };
        }
        
        // Method 2: Application Default Credentials (ADC)
        try {
          console.log('🔑 Trying Application Default Credentials...');
          const auth = new GoogleAuth({
            projectId: authentication.credentials.projectId,
            scopes: ['https://www.googleapis.com/auth/cloud-platform']
          });
          
          const accessToken = await auth.getAccessToken();
          
          return {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'x-goog-user-project': authentication.credentials.projectId
          };
        } catch (adcError) {
          console.log('⚠️ ADC failed, trying API key fallback...');
        }
        
        // Method 3: Fallback to API key (for development/testing)
        if (authentication.credentials.apiKey) {
          console.log('🔄 Using API key for Google Cloud authentication...');
          return {
            'Authorization': `Bearer ${authentication.credentials.apiKey}`,
            'Content-Type': 'application/json',
            'x-goog-user-project': authentication.credentials.projectId
          };
        }
        
        throw new Error('No valid Google Cloud credentials found. Need service account file, ADC, or API key.');
        
      } catch (error) {
        console.error('❌ Google Auth failed:', error.message);
        throw new Error('Service account authentication failed: ' + error.message);
      }
    
    default:
      throw new Error(`Unknown authentication type: ${authentication.type}`);
  }
}

/**
 * Check if provider is properly configured
 */
function isProviderConfigured(provider) {
  try {
    getProviderConfig(provider);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get all configured providers
 */
function getConfiguredProviders() {
  return Object.keys(PROVIDER_CONFIGS).filter(provider => 
    isProviderConfigured(provider)
  );
}

/**
 * Get rate limit info for provider
 */
function getRateLimits(provider) {
  const config = getProviderConfig(provider);
  return config.rateLimits;
}

/**
 * Get timeout for provider
 */
function getTimeout(provider) {
  const config = getProviderConfig(provider);
  return config.timeout;
}

/**
 * Get retry configuration for provider
 */
function getRetryConfig(provider) {
  const config = getProviderConfig(provider);
  return config.retryConfig;
}

/**
 * Get credentials for a provider (alias for getProviderConfig)
 */
function getCredentials(provider) {
  return getProviderConfig(provider);
}

module.exports = {
  PROVIDER_CONFIGS,
  getProviderConfig,
  getCredentials,
  getEndpointUrl,
  getAuthHeaders,
  isProviderConfigured,
  getConfiguredProviders,
  getRateLimits,
  getTimeout,
  getRetryConfig,
  validateCredentials
};