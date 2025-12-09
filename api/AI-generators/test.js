/**
 * AI Generators Test Suite
 * Test endpoints and validation for the AI generation system
 */

const AIRouter = require('./core/ai-router');
const MediaValidators = require('./utils/media-validators');
const { getPollingManager } = require('./utils/polling-manager');
const CapabilityMatrix = require('./config/capability-matrix');
const ModelRegistry = require('./config/model-registry');

class AIGeneratorsTest {
  constructor() {
    this.aiRouter = new AIRouter();
    this.pollingManager = getPollingManager();
    this.testResults = [];
    this.totalTests = 0;
    this.passedTests = 0;
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('\n🧪 Starting AI Generators Architecture Test Suite...\n');

    try {
      // Configuration tests
      await this.testConfigurations();
      
      // Core component tests
      await this.testCoreComponents();
      
      // Video generation tests
      await this.testVideoGeneration();
      
      // Utility tests
      await this.testUtilities();
      
      // Integration tests
      await this.testIntegration();

      // Print summary
      this.printSummary();

      return {
        success: this.passedTests === this.totalTests,
        total: this.totalTests,
        passed: this.passedTests,
        failed: this.totalTests - this.passedTests,
        results: this.testResults
      };

    } catch (error) {
      console.error('❌ Test suite failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Test configuration files
   */
  async testConfigurations() {
    console.log('📋 Testing Configuration Files...\n');

    // Test Model Registry
    this.runTest('Model Registry - Basic Structure', () => {
      const models = ModelRegistry.getAllModels();
      if (!models || typeof models !== 'object') {
        throw new Error('Model registry should return an object');
      }
      
      const categories = Object.keys(models);
      if (!categories.includes('video-generation')) {
        throw new Error('Model registry should include video-generation category');
      }
    });

    // Test Capability Matrix
    this.runTest('Capability Matrix - Basic Structure', () => {
      const capabilities = CapabilityMatrix.getAllCapabilities();
      if (!Array.isArray(capabilities)) {
        throw new Error('Capabilities should be an array');
      }
      
      const hasVideoGen = capabilities.some(cap => cap.name === 'video-generation');
      if (!hasVideoGen) {
        throw new Error('Should include video-generation capability');
      }
    });

    // Test Provider Credentials
    this.runTest('Provider Credentials - Structure', () => {
      const ProviderCredentials = require('./config/provider-credentials');
      const { PROVIDER_CONFIGS } = ProviderCredentials;
      
      if (!PROVIDER_CONFIGS || !PROVIDER_CONFIGS.google) {
        throw new Error('Google provider should exist in configuration');
      }
      
      const google = PROVIDER_CONFIGS.google;
      if (!google.authentication || !google.endpoints) {
        throw new Error('Google provider should have authentication and endpoints');
      }
    });
  }

  /**
   * Test core components
   */
  async testCoreComponents() {
    console.log('⚙️  Testing Core Components...\n');

    // Test Request Validator
    this.runTest('Request Validator - Valid Request', () => {
      const RequestValidator = require('./core/request-validator');
      const validRequest = {
        capability: 'video-generation',
        useCase: 'text-to-video',
        prompt: 'A cat walking in a garden'
      };
      
      const result = RequestValidator.validate(validRequest);
      if (!result.valid) {
        throw new Error('Valid request should pass validation');
      }
    });

    this.runTest('Request Validator - Invalid Request', () => {
      const RequestValidator = require('./core/request-validator');
      const invalidRequest = {
        capability: 'invalid-capability'
      };
      
      const result = RequestValidator.validate(invalidRequest);
      if (result.valid) {
        throw new Error('Invalid request should fail validation');
      }
    });

    // Test Model Selector
    this.runTest('Model Selector - Basic Selection', () => {
      const ModelSelector = require('./core/model-selector');
      const ModelRegistry = require('./config/model-registry');
      
      // First verify models exist
      const models = ModelRegistry.getModels('video-generation', 'text-to-video');
      if (!models || models.length === 0) {
        console.warn('⚠️ No models available for selection test, skipping...');
        return;
      }
      
      const request = {
        capability: 'video-generation',
        useCase: 'text-to-video',
        parameters: { duration: 5 }
      };
      
      const selection = ModelSelector.select(request);
      if (!selection.model || !selection.provider) {
        throw new Error('Model selection should return model and provider');
      }
    });

    // Test Response Normalizer
    this.runTest('Response Normalizer - Basic Normalization', () => {
      const ResponseNormalizer = require('./core/response-normalizer');
      const rawResponse = {
        success: true,
        data: { videoUrl: 'http://example.com/video.mp4' }
      };
      
      const request = {
        capability: 'video-generation',
        useCase: 'text-to-video',
        provider: 'google'
      };
      
      const normalized = ResponseNormalizer.normalize(rawResponse, request);
      
      if (!normalized.success) {
        throw new Error('Response should be normalized successfully');
      }
    });
  }

  /**
   * Test video generation capabilities
   */
  async testVideoGeneration() {
    console.log('🎬 Testing Video Generation Capabilities...\n');

    // Test Video Generation Configuration
    this.runTest('Video Generation - Capability Exists', () => {
      const CapabilityMatrix = require('./config/capability-matrix');
      const videoGenCapability = CapabilityMatrix.getCapability('video-generation');
      
      if (!videoGenCapability) {
        throw new Error('Video generation capability should exist');
      }
      
      if (!videoGenCapability.useCases['text-to-video']) {
        throw new Error('Text-to-video use case should exist');
      }
    });

    // Test Model Registry for Video
    this.runTest('Video Generation - Models Available', () => {
      const ModelRegistry = require('./config/model-registry');
      const models = ModelRegistry.getModels('video-generation', 'text-to-video');
      
      if (!models || models.length === 0) {
        throw new Error('Video generation models should be available');
      }
      
      const googleModels = models.filter(m => m.provider === 'google');
      if (googleModels.length === 0) {
        throw new Error('Google video models should be available');
      }
    });

    // Test Provider Configuration for Video
    this.runTest('Video Generation - Provider Configuration', () => {
      const ProviderCredentials = require('./config/provider-credentials');
      const { PROVIDER_CONFIGS } = ProviderCredentials;
      const googleConfig = PROVIDER_CONFIGS.google;
      
      if (!googleConfig) {
        throw new Error('Google provider configuration should exist');
      }
      
      if (!googleConfig.endpoints || !googleConfig.endpoints['veo-3.1-generate-001']) {
        throw new Error('Google provider should have video generation endpoints');
      }
    });
  }

  /**
   * Test utility functions
   */
  async testUtilities() {
    console.log('🛠  Testing Utility Functions...\n');

    // Test Format Converters
    this.runTest('Format Converters - Base64 Detection', () => {
      const FormatConverters = require('./utils/format-converters');
      const base64Image = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ==';
      
      const isBase64 = FormatConverters.isValidBase64(base64Image);
      if (!isBase64) {
        throw new Error('Should detect base64 format');
      }
      
      const notBase64 = FormatConverters.isValidBase64('http://example.com/image.jpg');
      if (notBase64) {
        throw new Error('Should not detect URL as base64');
      }
    });

    this.runTest('Format Converters - MIME Type Detection', () => {
      const FormatConverters = require('./utils/format-converters');
      const base64Image = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ==';
      
      const mimeType = FormatConverters.detectMimeType(base64Image);
      if (mimeType !== 'image/jpeg') {
        throw new Error('Should detect correct MIME type');
      }
    });

    // Test Media Validators
    this.runTest('Media Validators - Image Validation', () => {
      // Use a simpler validation test
      const result = MediaValidators.validateImage({
        type: 'image',
        data: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAAAAAAAD//2Q='
      }, {
        allowedFormats: ['jpeg', 'jpg', 'png', 'webp', 'octet-stream'],
        maxSize: 50 * 1024 * 1024, // 50MB
        minSize: 10 // 10 bytes
      });
      
      if (!result.valid) {
        throw new Error('Valid image should pass validation: ' + result.errors.join(', '));
      }
    });

    this.runTest('Media Validators - Video Validation', () => {
      const result = MediaValidators.validateVideo({
        type: 'video',
        data: 'https://example.com/video.mp4'
      }, {
        allowedFormats: ['mp4', 'webm', 'mov', 'octet-stream'],
        maxSize: 500 * 1024 * 1024 // 500MB
      });
      
      if (!result.valid) {
        throw new Error('Valid video should pass validation: ' + result.errors.join(', '));
      }
    });

    // Test Polling Manager
    this.runTest('Polling Manager - Job Creation', () => {
      const jobId = 'test-job-' + Date.now();
      const pollConfig = {
        interval: 1000,
        maxAttempts: 3,
        timeout: 30000,
        exponentialBackoff: true
      };
      
      this.pollingManager.startPolling(
        jobId,
        () => Promise.resolve({ status: 'completed' }),
        pollConfig
      );
      
      const status = this.pollingManager.getJobStatus(jobId);
      if (status.status === 'not_found') {
        throw new Error('Job should be found after creation');
      }
      
      // Clean up
      this.pollingManager.cancelJob(jobId);
    });
  }

  /**
   * Test end-to-end integration
   */
  async testIntegration() {
    console.log('🔗 Testing Integration...\n');

    // Test AI Router initialization
    this.runTest('AI Router - Initialization', () => {
      if (!this.aiRouter) {
        throw new Error('AI Router should initialize');
      }
      
      const capabilities = this.aiRouter.getAvailableCapabilities();
      if (!Array.isArray(capabilities)) {
        throw new Error('Should return available capabilities');
      }
    });

    // Test health check
    this.runTest('Health Check - System Status', async () => {
      const health = await this.aiRouter.healthCheck();
      if (!health || !health.status) {
        throw new Error('Health check should return status');
      }
    });

    // Test capability info retrieval
    this.runTest('Capability Info - Video Generation', () => {
      const info = this.aiRouter.getCapabilityInfo('video-generation', 'text-to-video');
      if (!info || !info.capability) {
        throw new Error('Should return capability information');
      }
    });

    // Test stats collection
    this.runTest('Statistics - System Stats', () => {
      const stats = this.aiRouter.getStats();
      if (!stats || typeof stats !== 'object') {
        throw new Error('Should return system statistics');
      }
    });
  }

  /**
   * Run a single test
   */
  runTest(name, testFunction) {
    this.totalTests++;
    
    try {
      const result = testFunction();
      
      // Handle async test functions
      if (result instanceof Promise) {
        return result.then(() => {
          console.log(`✅ ${name}`);
          this.passedTests++;
          this.testResults.push({ name, status: 'passed' });
        }).catch(error => {
          console.log(`❌ ${name}: ${error.message}`);
          this.testResults.push({ name, status: 'failed', error: error.message });
        });
      } else {
        console.log(`✅ ${name}`);
        this.passedTests++;
        this.testResults.push({ name, status: 'passed' });
      }
      
    } catch (error) {
      console.log(`❌ ${name}: ${error.message}`);
      this.testResults.push({ name, status: 'failed', error: error.message });
    }
  }

  /**
   * Print test summary
   */
  printSummary() {
    console.log('\n' + '='.repeat(50));
    console.log('🏁 Test Suite Summary');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${this.totalTests}`);
    console.log(`Passed: ${this.passedTests} ✅`);
    console.log(`Failed: ${this.totalTests - this.passedTests} ❌`);
    console.log(`Success Rate: ${((this.passedTests / this.totalTests) * 100).toFixed(1)}%`);
    
    if (this.passedTests === this.totalTests) {
      console.log('\n🎉 All tests passed! Architecture is working correctly.');
    } else {
      console.log('\n⚠️  Some tests failed. Please review the implementation.');
    }
    
    console.log('='.repeat(50) + '\n');
  }

  /**
   * Generate example requests for testing
   */
  static getExampleRequests() {
    return {
      'text-to-video-basic': {
        capability: 'video-generation',
        useCase: 'text-to-video',
        prompt: 'A serene mountain landscape with a flowing waterfall, golden hour lighting',
        parameters: {
          duration: 5,
          aspectRatio: '16:9',
          quality: 'high'
        },
        preferences: {
          provider: 'google',
          model: 'veo-3.1-generate-001'
        }
      },
      
      'text-to-video-advanced': {
        capability: 'video-generation',
        useCase: 'text-to-video',
        prompt: 'A futuristic city at night with neon lights and flying cars, cyberpunk aesthetic',
        parameters: {
          duration: 10,
          aspectRatio: '16:9',
          quality: 'high',
          fps: 30,
          style: 'cinematic'
        },
        preferences: {
          provider: 'google',
          model: 'veo-3.1-generate-001'
        },
        userId: 'test-user',
        businessId: 'test-business',
        metadata: {
          projectName: 'Test Video Generation',
          tags: ['test', 'futuristic', 'city']
        }
      },
      
      'image-to-video': {
        capability: 'video-generation',
        useCase: 'image-to-video',
        prompt: 'The cat starts walking towards the camera with a playful expression',
        media: [{
          type: 'image',
          url: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD//gA7Q1JFQVRPUjogZ2QtanBlZyB2MS4wICh1c2luZyBJSkcgSlBFRyB2ODApLCBxdWFsaXR5ID0gODAK/9sAQwAGBAUGBQQGBgUGBwcGCAoQCgoJCQoUDg0NDhQUExMTExQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQU',
          format: 'jpeg',
          width: 1024,
          height: 1024
        }],
        parameters: {
          duration: 3,
          aspectRatio: '1:1',
          quality: 'high'
        },
        preferences: {
          provider: 'google',
          model: 'veo-3.1-i2v-generate-001'
        }
      },

      'validation-test': {
        capability: 'video-generation',
        useCase: 'text-to-video',
        prompt: 'Test validation without execution',
        parameters: {
          duration: 5
        }
      }
    };
  }
}

module.exports = AIGeneratorsTest;