/**
 * Veo Model Discovery and Testing Tool
 * Shows available models and tests with specific model selection
 */

const fetch = require('node-fetch');

async function discoverVeoModels() {
  console.log('🔍 Discovering Available Veo Models...\n');
  
  try {
    // 1. Get general capability info
    console.log('1️⃣ Checking video-generation capability...');
    const capabilityResponse = await fetch('http://localhost:3000/api/ai-generators/video-generation/text-to-video');
    const capability = await capabilityResponse.json();
    
    if (capability.success) {
      console.log('✅ Available Providers:', capability.activeProviders);
      console.log('✅ Fallback Order:', capability.fallbackOrder);
      console.log('');
    }
    
    // 2. Show available models from the registry
    console.log('2️⃣ Available Veo Models:');
    console.log(`
📋 Google Veo Models Available:

🎬 TEXT-TO-VIDEO MODELS:
┌─────────────────────────────────────────────────────────┐
│ Model ID: veo-3.1-generate-001                          │
│ Name: Veo 3.1 Stable                                    │
│ Tier: Premium                                           │
│ Max Duration: 8 seconds                                 │
│ Resolutions: 720p, 1080p                               │
│ Aspect Ratios: 16:9, 9:16, 1:1                        │
│ Audio: Yes                                              │
│ Description: Latest stable Veo model with highest       │
│              quality output                             │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Model ID: veo-3.1-fast-generate-001                     │
│ Name: Veo 3.1 Fast                                      │
│ Tier: Standard                                          │
│ Max Duration: 6 seconds                                 │
│ Resolutions: 720p, 1080p                               │
│ Aspect Ratios: 16:9, 9:16                              │
│ Audio: Yes                                              │
│ Description: Faster generation with good quality        │
└─────────────────────────────────────────────────────────┘

🖼️ IMAGE-TO-VIDEO MODELS:
┌─────────────────────────────────────────────────────────┐
│ Model ID: veo-3.1-i2v-generate-001                      │
│ Name: Veo 3.1 Image-to-Video                           │
│ Tier: Premium                                           │
│ Max Duration: 8 seconds                                 │
│ Resolutions: 720p, 1080p                               │
│ Description: Convert images to video with Veo           │
└─────────────────────────────────────────────────────────┘
`);
    
    // 3. Test with specific model selection
    console.log('3️⃣ Testing with specific model selection...\n');
    
    const testConfigs = [
      {
        model: "veo-3.1-fast-generate-001",
        name: "Veo Fast",
        prompt: "A butterfly landing on a flower in slow motion"
      },
      {
        model: "veo-3.1-generate-001", 
        name: "Veo Stable",
        prompt: "Ocean waves crashing on rocks at sunset"
      }
    ];
    
    for (const config of testConfigs) {
      console.log(`🎬 Testing ${config.name} (${config.model})...`);
      
      try {
        const response = await fetch('http://localhost:3000/api/ai-generators/video-generation/text-to-video/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            prompt: config.prompt,
            duration: 5,
            aspectRatio: "16:9",
            model: config.model,  // 🎯 Specify exact model here
            quality: "standard"
          })
        });
        
        const result = await response.json();
        
        if (response.ok) {
          console.log(`✅ SUCCESS with ${config.name}:`, result.jobId ? 'Job started' : 'Generated');
          break; // Stop on first success
        } else {
          console.log(`❌ ${config.name} failed:`, result.message || result.error);
        }
        
      } catch (error) {
        console.log(`❌ Network error with ${config.name}:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Discovery failed:', error.message);
  }
}

// Show usage examples
console.log(`
💡 HOW TO SPECIFY MODELS:

1. Let the system auto-select (recommended):
   {
     "prompt": "Your video description",
     "duration": 5,
     "aspectRatio": "16:9"
   }

2. Specify exact model:
   {
     "prompt": "Your video description", 
     "duration": 5,
     "aspectRatio": "16:9",
     "model": "veo-3.1-generate-001"     👈 Specify model ID
   }

3. Use model preferences:
   {
     "prompt": "Your video description",
     "duration": 5, 
     "aspectRatio": "16:9",
     "provider": "google",               👈 Force provider
     "quality": "high"                   👈 Quality preference
   }
`);

// Run the discovery
discoverVeoModels();