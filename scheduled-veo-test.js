/**
 * Scheduled Veo Tester
 * Automatically retries video generation every hour until quota resets
 */

const fetch = require('node-fetch');

class ScheduledVeoTester {
  constructor() {
    this.testInterval = 60 * 60 * 1000; // 1 hour
    this.maxAttempts = 24; // Try for 24 hours
    this.currentAttempt = 0;
  }

  async testGeneration() {
    console.log(`🕐 Scheduled Test #${this.currentAttempt + 1} - ${new Date().toLocaleTimeString()}`);
    
    const request = {
      capability: "video-generation",
      useCase: "text-to-video",
      prompt: "A gentle stream flowing through a peaceful forest",
      parameters: {
        duration: 3, // Very short to minimize quota usage
        aspectRatio: "16:9",
        resolution: "720p",
        model: "veo-3.1-fast-generate-001" // Use fast model
      },
      preferences: {
        quality: "standard",
        provider: "google"
      }
    };

    try {
      const response = await fetch('http://localhost:3000/api/ai-generators/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        console.log('🎉 SUCCESS! Quota has reset and video generation is working!');
        console.log('   Job ID:', result.jobId || 'Generated immediately');
        
        if (result.jobId) {
          // Monitor the job
          this.monitorJob(result.jobId);
        }
        
        return true; // Success, stop testing
      } 
      
      if (response.status === 429) {
        console.log('⏳ Still rate limited. Next check in 1 hour...');
        return false; // Continue testing
      }

      console.log('❌ Other error:', result.message || result.error);
      return false;

    } catch (error) {
      console.log('❌ Network error:', error.message);
      return false;
    }
  }

  async monitorJob(jobId) {
    console.log('📊 Monitoring job progress...');
    
    const checkStatus = async () => {
      try {
        const response = await fetch(`http://localhost:3000/api/ai-generators/status/${jobId}`);
        const status = await response.json();
        
        console.log(`   Status: ${status.status || 'unknown'}`);
        
        if (status.status === 'completed') {
          console.log('✅ Video generation completed successfully!');
          if (status.result?.videoUrl) {
            console.log('🎥 Video URL:', status.result.videoUrl);
          }
          return;
        }
        
        if (status.status === 'failed') {
          console.log('❌ Video generation failed:', status.error);
          return;
        }
        
        // Still processing, check again in 30 seconds
        setTimeout(checkStatus, 30000);
        
      } catch (error) {
        console.log('❌ Status check failed:', error.message);
      }
    };
    
    // Start monitoring
    setTimeout(checkStatus, 5000);
  }

  start() {
    console.log('🚀 Starting scheduled Veo quota tester...');
    console.log(`   Will check every hour for up to ${this.maxAttempts} hours`);
    console.log('   Press Ctrl+C to stop\n');

    const runTest = async () => {
      this.currentAttempt++;
      
      const success = await this.testGeneration();
      
      if (success) {
        console.log('🎯 Testing completed successfully!');
        process.exit(0);
      }
      
      if (this.currentAttempt >= this.maxAttempts) {
        console.log('⏰ Reached maximum attempts. Stopping.');
        console.log('💡 Consider requesting a quota increase or upgrading to Provisioned Throughput');
        process.exit(1);
      }
      
      console.log(`   Next attempt in 1 hour (attempt ${this.currentAttempt + 1}/${this.maxAttempts})\n`);
      setTimeout(runTest, this.testInterval);
    };

    // Start immediately
    runTest();
  }
}

// Show current status first
console.log(`
🎯 SCHEDULED VEO QUOTA TESTER

Current Time: ${new Date().toLocaleString()}
Strategy: Check every hour until quotas reset
Model: veo-3.1-fast-generate-001 (lowest quota usage)

💡 While this runs, you can:
1. Check Google Cloud Console quotas
2. Request quota increases  
3. Wait for automatic quota reset (usually 1-24 hours)

Starting in 5 seconds...
`);

setTimeout(() => {
  const tester = new ScheduledVeoTester();
  tester.start();
}, 5000);