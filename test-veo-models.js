/**
 * Correct Veo Model Testing
 * Using the actual unified API endpoints
 */

const fetch = require('node-fetch');

async function testVeoModels() {
  console.log('🎯 Testing Veo Models with Correct API...\n');
  
  // Available Veo Models
  const models = {
    "veo-stable": {
      id: "veo-3.1-generate-001",
      name: "Veo 3.1 Stable (Premium)",
      maxDuration: 8,
      description: "Highest quality, slower generation"
    },
    "veo-fast": {
      id: "veo-3.1-fast-generate-001", 
      name: "Veo 3.1 Fast (Standard)",
      maxDuration: 6,
      description: "Good quality, faster generation"
    },
    "veo-i2v": {
      id: "veo-3.1-i2v-generate-001",
      name: "Veo 3.1 Image-to-Video",
      maxDuration: 8,
      description: "Convert images to video"
    }
  };

  console.log('📋 Available Google Veo Models:\n');
  Object.entries(models).forEach(([key, model]) => {
    console.log(`🎬 ${model.name}`);
    console.log(`   ID: ${model.id}`);
    console.log(`   Max Duration: ${model.maxDuration}s`);
    console.log(`   ${model.description}\n`);
  });

  // 1. Test Validation First
  console.log('1️⃣ Testing request validation...');
  
  const validationRequest = {
    capability: "video-generation",
    useCase: "text-to-video", 
    prompt: "A serene lake reflecting mountains at dawn",
    parameters: {
      duration: 5,
      aspectRatio: "16:9",
      model: "veo-3.1-fast-generate-001"  // 🎯 Specify model here
    }
  };
  
  try {
    const validateResponse = await fetch('http://localhost:3000/api/ai-generators/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validationRequest)
    });
    
    const validateResult = await validateResponse.json();
    console.log('✅ Validation Result:', validateResult.success ? 'PASSED' : 'FAILED');
    
    if (!validateResult.success) {
      console.log('❌ Validation errors:', validateResult.error);
      return;
    }
  } catch (error) {
    console.log('❌ Validation failed:', error.message);
    return;
  }

  // 2. Test Generation with Different Models
  console.log('\n2️⃣ Testing video generation with different models...\n');
  
  const testCases = [
    {
      model: "veo-3.1-fast-generate-001",
      prompt: "A butterfly gently landing on a blooming flower in a garden",
      duration: 4
    },
    {
      model: "veo-3.1-generate-001", 
      prompt: "Ocean waves slowly washing over smooth pebbles on a beach",
      duration: 6
    }
  ];
  
  for (const testCase of testCases) {
    const modelInfo = Object.values(models).find(m => m.id === testCase.model);
    console.log(`🎬 Testing ${modelInfo.name}...`);
    
    const request = {
      capability: "video-generation",
      useCase: "text-to-video",
      prompt: testCase.prompt,
      parameters: {
        duration: testCase.duration,
        aspectRatio: "16:9",
        resolution: "720p",
        model: testCase.model  // 🎯 This is how you specify the exact model
      },
      preferences: {
        quality: "standard",
        provider: "google"
      },
      metadata: {
        requestId: `test-${Date.now()}`,
        source: "model-testing"
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
        console.log(`✅ SUCCESS with ${modelInfo.name}!`);
        console.log(`   Job ID: ${result.jobId || result.data?.jobId || 'Generated immediately'}`);
        console.log(`   Status: ${result.status || 'Started'}`);
        
        if (result.jobId) {
          console.log(`   📊 Track progress: GET /api/ai-generators/status/${result.jobId}`);
        }
        
        break; // Success! Stop testing other models
        
      } else {
        console.log(`❌ ${modelInfo.name} failed:`, result.message || result.error);
        
        if (result.message?.includes('rate limit') || result.message?.includes('quota')) {
          console.log(`   💡 Rate limit hit - try again later`);
        }
      }
      
    } catch (error) {
      console.log(`❌ Network error with ${modelInfo.name}:`, error.message);
    }
    
    console.log(''); // Empty line between tests
  }
}

// Show usage examples
console.log(`
💡 HOW TO SPECIFY VEO MODELS IN YOUR REQUESTS:

curl -X POST http://localhost:3000/api/ai-generators/generate \\
  -H "Content-Type: application/json" \\
  -d '{
    "capability": "video-generation",
    "useCase": "text-to-video",
    "prompt": "Your video description here",
    "parameters": {
      "duration": 5,
      "aspectRatio": "16:9",
      "resolution": "720p", 
      "model": "veo-3.1-fast-generate-001"    👈 Specify model ID here
    },
    "preferences": {
      "quality": "standard",
      "provider": "google"
    }
  }'

🎯 Available Model IDs:
  • veo-3.1-generate-001      (Stable, Premium, 8s max)
  • veo-3.1-fast-generate-001 (Fast, Standard, 6s max)  
  • veo-3.1-i2v-generate-001  (Image-to-Video, 8s max)
`);

// Run the tests
testVeoModels();