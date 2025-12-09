/**
 * Veo Rate Limit Handler with Exponential Backoff
 * Implements Google's recommended retry strategy for 429 errors
 */

const fetch = require('node-fetch');

class VeoRateLimitHandler {
  constructor() {
    this.baseDelay = 1000; // 1 second
    this.maxDelay = 60000; // 60 seconds
    this.maxRetries = 5;
    this.backoffMultiplier = 2;
  }

  /**
   * Exponential backoff with jitter (Google's recommendation)
   */
  calculateDelay(attempt) {
    const delay = Math.min(
      this.baseDelay * Math.pow(this.backoffMultiplier, attempt),
      this.maxDelay
    );
    
    // Add jitter (±25% randomization)
    const jitter = delay * 0.25 * (Math.random() * 2 - 1);
    return Math.round(delay + jitter);
  }

  /**
   * Sleep function
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate video with retry logic
   */
  async generateVideoWithRetry(request, maxRetries = this.maxRetries) {
    let lastError = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log(`🎬 Attempt ${attempt + 1}/${maxRetries}: Generating video...`);
        
        const response = await fetch('http://localhost:3000/api/ai-generators/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request)
        });
        
        const result = await response.json();
        
        // Success!
        if (response.ok && result.success) {
          console.log('✅ SUCCESS! Video generation started');
          return result;
        }
        
        // Handle 429 rate limit specifically
        if (response.status === 429 || result.code === 'RATE_LIMIT_EXCEEDED') {
          const delay = this.calculateDelay(attempt);
          console.log(`⚠️ Rate limit hit (429). Retrying in ${Math.round(delay/1000)}s...`);
          
          if (attempt < maxRetries - 1) {
            await this.sleep(delay);
            continue;
          }
        }
        
        // Other errors
        lastError = result;
        console.log(`❌ Attempt ${attempt + 1} failed:`, result.message || result.error);
        
      } catch (error) {
        lastError = { message: error.message, type: 'NetworkError' };
        console.log(`❌ Network error on attempt ${attempt + 1}:`, error.message);
      }
    }
    
    // All retries failed
    throw new Error(`All ${maxRetries} attempts failed. Last error: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Test multiple models with rate limit handling
   */
  async testModelsWithRetry() {
    const models = [
      {
        id: "veo-3.1-fast-generate-001",
        name: "Veo Fast",
        prompt: "A peaceful mountain lake reflecting clouds"
      },
      {
        id: "veo-3.1-generate-001", 
        name: "Veo Stable",
        prompt: "Gentle rainfall on green leaves in a forest"
      }
    ];
    
    console.log('🔄 Testing Veo models with exponential backoff retry strategy...\n');
    
    for (const model of models) {
      console.log(`\n🎯 Testing ${model.name} (${model.id})`);
      
      const request = {
        capability: "video-generation",
        useCase: "text-to-video",
        prompt: model.prompt,
        parameters: {
          duration: 4, // Shorter duration to reduce quota usage
          aspectRatio: "16:9",
          resolution: "720p",
          model: model.id
        },
        preferences: {
          quality: "standard", // Use standard quality to reduce quota
          provider: "google"
        }
      };
      
      try {
        const result = await this.generateVideoWithRetry(request);
        
        console.log(`✅ SUCCESS with ${model.name}!`);
        console.log(`   Job ID: ${result.jobId || 'Generated immediately'}`);
        
        if (result.jobId) {
          console.log(`   📊 Track progress: curl http://localhost:3000/api/ai-generators/status/${result.jobId}`);
        }
        
        // Success! Stop trying other models
        return result;
        
      } catch (error) {
        console.log(`❌ ${model.name} failed after all retries: ${error.message}`);
      }
    }
    
    console.log('\n💡 All models failed. Recommendations:');
    console.log('   1. Wait longer (quotas reset hourly/daily)');
    console.log('   2. Try again in 1-2 hours');
    console.log('   3. Consider upgrading to Provisioned Throughput');
    console.log('   4. Check Google Cloud Console for quota usage');
  }
}

// Usage examples
console.log(`
💡 GOOGLE'S 429 ERROR SOLUTIONS IMPLEMENTED:

✅ Truncated Exponential Backoff
  - Base delay: 1s, Max delay: 60s
  - Multiplier: 2x per retry
  - Jitter: ±25% randomization

✅ Retry Strategy  
  - Max retries: 5 attempts
  - Automatic retry on 429 errors
  - Progressive delay between attempts

📋 ADDITIONAL RECOMMENDATIONS:

1. 🌍 Use Global Endpoint (already implemented)
2. 📊 Request Quota Increase:
   - Go to Google Cloud Console
   - Navigate to IAM & Admin > Quotas
   - Search for "Vertex AI" quotas
   - Submit Quota Increase Request (QIR)

3. 💰 Consider Provisioned Throughput:
   - Guarantees consistent capacity
   - Reduces 429 errors
   - Better for production workloads

4. ⏰ Traffic Smoothing:
   - Space out requests over time
   - Avoid burst traffic patterns
   - Use queuing for multiple requests
`);

// Create and run the handler
const handler = new VeoRateLimitHandler();
handler.testModelsWithRetry();