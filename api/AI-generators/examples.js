/**
 * AI Generators Example Usage
 * Practical examples and integration guide
 */

// Example: Integrating AI Generators into existing server.js

/*
// Add to your main server.js file:

const aiGeneratorsRouter = require('./api/AI-generators/api');

// Mount the AI generators router
app.use('/api/ai-generators', aiGeneratorsRouter);

*/

// Example API Usage:

const exampleUsage = {
  
  /**
   * Text-to-Video Generation
   */
  textToVideo: async () => {
    const request = {
      capability: 'video-generation',
      useCase: 'text-to-video',
      prompt: 'A beautiful sunset over the ocean with gentle waves',
      parameters: {
        duration: 5,
        aspectRatio: '16:9',
        quality: 'high'
      },
      preferences: {
        provider: 'google',
        model: 'veo-3.1-generate-001'
      },
      userId: 'user123',
      businessId: 'business456'
    };

    try {
      const response = await fetch('/api/ai-generators/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      });

      const result = await response.json();
      
      if (result.success) {
        if (result.status === 'completed') {
          // Synchronous completion
          console.log('Video generated:', result.outputs[0].url);
          return result.outputs[0].url;
        } else if (result.status === 'processing') {
          // Async completion - poll for status
          return await pollForCompletion(result.async.jobId);
        }
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Generation failed:', error);
      throw error;
    }
  },

  /**
   * Image-to-Video Generation
   */
  imageToVideo: async (imageBase64) => {
    const request = {
      capability: 'video-generation',
      useCase: 'image-to-video',
      prompt: 'The subject in the image comes to life with natural movement',
      media: [{
        type: 'image',
        data: imageBase64,
        format: 'jpeg'
      }],
      parameters: {
        duration: 3,
        quality: 'high'
      }
    };

    const response = await fetch('/api/ai-generators/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });

    return await response.json();
  },

  /**
   * Poll for async job completion
   */
  pollForCompletion: async (jobId) => {
    const maxAttempts = 30;
    const interval = 2000;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const response = await fetch(`/api/ai-generators/status/${jobId}`);
      const status = await response.json();
      
      if (status.success) {
        if (status.status === 'completed') {
          return status.result;
        } else if (status.status === 'failed') {
          throw new Error(status.error || 'Generation failed');
        }
        // Still processing, wait and try again
        await new Promise(resolve => setTimeout(resolve, interval));
      } else {
        throw new Error('Failed to check job status');
      }
    }
    
    throw new Error('Job timed out');
  },

  /**
   * Check system health
   */
  healthCheck: async () => {
    const response = await fetch('/api/ai-generators/health');
    return await response.json();
  },

  /**
   * Get available capabilities
   */
  getCapabilities: async () => {
    const response = await fetch('/api/ai-generators/capabilities');
    return await response.json();
  },

  /**
   * Validate request without executing
   */
  validateRequest: async (request) => {
    const response = await fetch('/api/ai-generators/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });
    
    return await response.json();
  },

  /**
   * Cancel running job
   */
  cancelJob: async (jobId) => {
    const response = await fetch(`/api/ai-generators/cancel/${jobId}`, {
      method: 'POST'
    });
    
    return await response.json();
  },

  /**
   * Get system statistics
   */
  getStats: async () => {
    const response = await fetch('/api/ai-generators/stats');
    return await response.json();
  }
};

// Frontend JavaScript Integration Example:
const frontendExample = `
<script>
class AIVideoGenerator {
  constructor(baseUrl = '/api/ai-generators') {
    this.baseUrl = baseUrl;
  }

  async generateVideo(prompt, options = {}) {
    const request = {
      capability: 'video-generation',
      useCase: 'text-to-video',
      prompt: prompt,
      parameters: {
        duration: options.duration || 5,
        aspectRatio: options.aspectRatio || '16:9',
        quality: options.quality || 'high'
      },
      preferences: {
        provider: options.provider || 'google'
      }
    };

    try {
      const response = await fetch(\`\${this.baseUrl}/generate\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      });

      const result = await response.json();
      
      if (result.success) {
        if (result.status === 'completed') {
          return result.outputs[0].url;
        } else if (result.status === 'processing') {
          return await this.waitForCompletion(result.async.jobId);
        }
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Video generation failed:', error);
      throw error;
    }
  }

  async waitForCompletion(jobId, onProgress = null) {
    const checkStatus = async () => {
      const response = await fetch(\`\${this.baseUrl}/status/\${jobId}\`);
      const status = await response.json();
      
      if (onProgress) {
        onProgress(status);
      }
      
      if (status.success) {
        if (status.status === 'completed') {
          return status.result;
        } else if (status.status === 'failed') {
          throw new Error(status.error);
        }
      }
      
      // Still processing
      return new Promise(resolve => {
        setTimeout(() => resolve(checkStatus()), 2000);
      });
    };
    
    return await checkStatus();
  }

  async validateBeforeGenerate(request) {
    const response = await fetch(\`\${this.baseUrl}/validate\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });
    
    return await response.json();
  }
}

// Usage Example:
const generator = new AIVideoGenerator();

document.getElementById('generateButton').addEventListener('click', async () => {
  const prompt = document.getElementById('promptInput').value;
  const statusDiv = document.getElementById('status');
  
  try {
    statusDiv.textContent = 'Generating video...';
    
    const videoUrl = await generator.generateVideo(prompt, {
      duration: 5,
      quality: 'high'
    });
    
    statusDiv.innerHTML = \`<video controls src="\${videoUrl}"></video>\`;
  } catch (error) {
    statusDiv.textContent = 'Generation failed: ' + error.message;
  }
});
</script>
`;

// Node.js/Express Integration Example:
const expressExample = `
// In your Express routes file:
const aiGenerators = require('./api/AI-generators/api');
app.use('/api/ai-generators', aiGenerators);

// Custom endpoint that uses AI Generators:
app.post('/api/create-marketing-video', async (req, res) => {
  try {
    const { businessName, productDescription, style } = req.body;
    
    const prompt = \`Create a marketing video for \${businessName}. 
    Product: \${productDescription}. 
    Style: \${style}. 
    Include engaging visuals and professional presentation.\`;
    
    const request = {
      capability: 'video-generation',
      useCase: 'text-to-video',
      prompt: prompt,
      parameters: {
        duration: 15,
        aspectRatio: '16:9',
        quality: 'high'
      },
      preferences: {
        provider: 'google'
      },
      userId: req.user.id,
      businessId: req.user.businessId
    };
    
    // Use AI Generators internally
    const AIRouter = require('./api/AI-generators/core/ai-router');
    const aiRouter = new AIRouter();
    
    const result = await aiRouter.route(request);
    
    if (result.success) {
      res.json({
        success: true,
        videoUrl: result.outputs[0].url,
        jobId: result.async?.jobId
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
`;

// Testing Examples:
const testingExamples = {
  
  /**
   * Run the built-in test suite
   */
  runTests: async () => {
    const AIGeneratorsTest = require('./test');
    const test = new AIGeneratorsTest();
    
    const results = await test.runAllTests();
    console.log('Test Results:', results);
    
    return results;
  },

  /**
   * Test individual components
   */
  testComponent: async (componentName) => {
    const AIGeneratorsTest = require('./test');
    const test = new AIGeneratorsTest();
    
    switch (componentName) {
      case 'config':
        return await test.testConfigurations();
      case 'core':
        return await test.testCoreComponents();
      case 'video':
        return await test.testVideoGeneration();
      case 'utils':
        return await test.testUtilities();
      case 'integration':
        return await test.testIntegration();
      default:
        throw new Error('Unknown component: ' + componentName);
    }
  },

  /**
   * Example requests for manual testing
   */
  getExampleRequests: () => {
    const AIGeneratorsTest = require('./test');
    return AIGeneratorsTest.getExampleRequests();
  }
};

module.exports = {
  exampleUsage,
  frontendExample,
  expressExample,
  testingExamples
};

/*
QUICK START GUIDE:

1. Add to your server.js:
   const aiGenerators = require('./api/AI-generators/api');
   app.use('/api/ai-generators', aiGenerators);

2. Test the setup:
   POST /api/ai-generators/health
   GET /api/ai-generators/capabilities

3. Generate your first video:
   POST /api/ai-generators/generate
   Body: {
     "capability": "video-generation",
     "useCase": "text-to-video",
     "prompt": "A beautiful sunset over mountains"
   }

4. Check generation status (if async):
   GET /api/ai-generators/status/{jobId}

5. Run the test suite:
   const test = require('./api/AI-generators/test');
   new test().runAllTests();

ENVIRONMENT VARIABLES NEEDED:

# Google Cloud (for Veo video generation)
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_REGION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json

# Optional: Override default settings
AI_GENERATORS_DEFAULT_PROVIDER=google
AI_GENERATORS_DEFAULT_TIMEOUT=300000
AI_GENERATORS_MAX_CONCURRENT_JOBS=5

*/