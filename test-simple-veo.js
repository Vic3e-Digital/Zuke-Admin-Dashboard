/**
 * Simple Veo Test - Wait for Rate Limits to Reset
 */

const fetch = require('node-fetch');

async function testVeoAfterWait() {
  console.log('🕒 Waiting 60 seconds for rate limits to reset...');
  
  // Wait 60 seconds for rate limits to potentially reset
  await new Promise(resolve => setTimeout(resolve, 60000));
  
  console.log('🎬 Testing video generation after waiting...');
  
  try {
    const response = await fetch('http://localhost:3000/api/ai-generators/video-generation/text-to-video/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: "A calm ocean wave gently washing onto a sandy beach at sunset",
        duration: 5,
        aspectRatio: "16:9"
      })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ SUCCESS! Video generation started:', result);
    } else {
      console.log('❌ Still getting errors:', result);
      
      if (result.message?.includes('rate limit') || result.message?.includes('quota')) {
        console.log('💡 Suggestions:');
        console.log('   1. Check your Google Cloud quotas for Vertex AI');
        console.log('   2. Wait longer between requests');
        console.log('   3. Try again tomorrow (daily quotas might be exceeded)');
      }
    }
    
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
}

// Run the test
testVeoAfterWait();