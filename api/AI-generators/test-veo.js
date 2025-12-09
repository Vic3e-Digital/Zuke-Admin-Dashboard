/**
 * Simple Veo Video Generation Test
 * This file provides easy ways to test the Veo integration
 */

// Test 1: Validate Request (without actually calling Google APIs)
const validateRequest = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/ai-generators/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        capability: 'video-generation',
        useCase: 'text-to-video',
        prompt: 'A cat walking in a beautiful garden with flowers',
        parameters: {
          duration: 5,
          quality: 'high',
          aspectRatio: '16:9'
        },
        preferences: {
          provider: 'google',
          model: 'veo-3.1-generate-001'
        }
      })
    });
    
    const result = await response.json();
    console.log('✅ Request Validation Result:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    return null;
  }
};

// Test 2: Check Available Models
const checkModels = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/ai-generators/capabilities/video-generation/text-to-video');
    const result = await response.json();
    console.log('✅ Available Models:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('❌ Failed to get models:', error.message);
    return null;
  }
};

// Test 3: Actual Video Generation (requires Google Cloud credentials)
const generateVideo = async () => {
  try {
    console.log('🎬 Starting video generation...');
    
    const response = await fetch('http://localhost:3000/api/ai-generators/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        capability: 'video-generation',
        useCase: 'text-to-video',
        prompt: 'A serene mountain landscape with a flowing waterfall at golden hour',
        parameters: {
          duration: 5,
          quality: 'high',
          aspectRatio: '16:9'
        },
        preferences: {
          provider: 'google',
          model: 'veo-3.1-generate-001'
        },
        userId: 'test-user',
        businessId: 'test-business'
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      if (result.status === 'completed') {
        console.log('✅ Video generated successfully!');
        console.log('Video URL:', result.outputs[0].url);
      } else if (result.status === 'processing') {
        console.log('⏳ Video is being generated...');
        console.log('Job ID:', result.async.jobId);
        console.log('Check status at:', result.statusUrl);
        
        // Poll for completion
        await pollForCompletion(result.async.jobId);
      }
    } else {
      console.error('❌ Generation failed:', result.error);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Generation request failed:', error.message);
    return null;
  }
};

// Helper function to poll for completion
const pollForCompletion = async (jobId) => {
  const maxAttempts = 30;
  const interval = 30000; // 30 seconds
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(`http://localhost:3000/api/ai-generators/status/${jobId}`);
      const status = await response.json();
      
      console.log(`📊 Attempt ${attempt + 1}: Status = ${status.status}`);
      
      if (status.status === 'completed') {
        console.log('✅ Video generation completed!');
        console.log('Result:', JSON.stringify(status.result, null, 2));
        return status.result;
      } else if (status.status === 'failed') {
        console.error('❌ Video generation failed:', status.error);
        return null;
      }
      
      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, interval));
      
    } catch (error) {
      console.error('❌ Error checking status:', error.message);
      return null;
    }
  }
  
  console.error('⏰ Generation timed out after', maxAttempts * interval / 1000, 'seconds');
  return null;
};

// Run tests
async function runTests() {
  console.log('🧪 Starting Veo Video Generation Tests...\n');
  
  // Test 1: Validate setup
  console.log('1️⃣ Testing request validation...');
  await validateRequest();
  
  console.log('\n2️⃣ Checking available models...');
  await checkModels();
  
  console.log('\n3️⃣ Testing actual video generation...');
  console.log('⚠️  Note: This requires valid Google Cloud credentials');
  await generateVideo();
}

// Export for use in other files
if (typeof module !== 'undefined') {
  module.exports = {
    validateRequest,
    checkModels, 
    generateVideo,
    pollForCompletion,
    runTests
  };
}

// Run if called directly
if (typeof window === 'undefined' && require.main === module) {
  runTests();
}