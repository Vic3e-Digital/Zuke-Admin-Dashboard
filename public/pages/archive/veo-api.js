// api/veo-api.js
const express = require('express');
const router = express.Router();
const { getDatabase } = require('../../../lib/mongodb');
const { ObjectId } = require('mongodb');
const axios = require('axios');
const { GoogleGenAI } = require('@google/genai');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const N8N_WALLET_WEBHOOK = process.env.N8N_WALLET_WEBHOOK_URL;

// Initialize Google Generative AI client
const ai = new GoogleGenAI({
  apiKey: GEMINI_API_KEY
});

// Pricing
const PRICING = {
  generation: 20  // R20.00 per video generation
};

// ========== GENERATE VIDEO ROUTE ==========
router.post('/generate', async (req, res) => {
  console.log('🎬 ========== VEO GENERATION REQUEST ==========');
  console.log('📦 Request Body:', JSON.stringify(req.body, null, 2));
  
  try {
    const {
      businessId,
      userEmail,
      model,
      prompt,
      negativePrompt,
      image,
      config
    } = req.body;

    // Validate required fields
    if (!businessId || !userEmail || !model || !prompt) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        received: { businessId, userEmail, model, prompt: !!prompt }
      });
    }

    console.log('✅ Validation passed');

    // Get business info
    const db = await getDatabase();
    const business = await db.collection('store_submissions').findOne({
      _id: new ObjectId(businessId)
    });

    if (!business) {
      return res.status(404).json({
        success: false,
        error: 'Business not found'
      });
    }

    console.log('✅ Business found:', business.store_info?.name);

    // Generate request ID
    const requestId = `veo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // ✅ WALLET CHECK AND DEDUCTION
    const walletPayload = {
      userEmail,
      businessId,
      cost: PRICING.generation,
      requestId,
      description: 'Veo AI video generation',
      metadata: {
        model,
        duration: config?.durationSeconds,
        resolution: config?.resolution
      }
    };

    console.log('💰 Checking wallet...');

    const walletResponse = await axios.post(N8N_WALLET_WEBHOOK, walletPayload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
      validateStatus: (status) => status >= 200 && status < 300 || status === 402
    });

    const walletResult = walletResponse.data;

    if (walletResponse.status === 402 || !walletResult.success) {
      console.log('⚠️ Insufficient funds');
      return res.status(402).json({
        success: false,
        error: 'Insufficient funds',
        current_balance: walletResult.current_balance,
        required: PRICING.generation,
        formatted_balance: walletResult.formatted_balance,
        formatted_required: `R${PRICING.generation.toFixed(2)}`
      });
    }

    console.log('✅ Wallet deduction successful:', walletResult.formatted_balance);

    // ✅ CALL GEMINI VEO API USING SDK
    console.log('🎬 Calling Gemini Veo API with SDK...');
    
    // Build the request object
    const generateRequest = {
      model: model,
      prompt: prompt
    };

    // Add config if provided
    if (config) {
      generateRequest.config = {
        aspectRatio: config.aspectRatio || "16:9",
        resolution: config.resolution || "720p",
        durationSeconds: parseInt(config.durationSeconds) || 8,
        numberOfVideos: config.numberOfVideos || 1
      };
    }

    // Add negative prompt if provided
    if (negativePrompt && negativePrompt.trim()) {
      generateRequest.negativePrompt = negativePrompt.trim();
    }

    // Add image if provided (for image-to-video)
    if (image) {
      generateRequest.image = {
        imageBytes: image.imageBytes,
        mimeType: image.mimeType || 'image/png'
      };
    }

    console.log('📦 SDK Request:', JSON.stringify(generateRequest, null, 2));

    // ✅ USE SDK TO GENERATE VIDEO
    const operation = await ai.models.generateVideos(generateRequest);

    const operationName = operation.name;

    if (!operationName) {
      console.error('❌ No operation name in response');
      throw new Error('No operation name returned from Gemini API');
    }

    console.log('✅ Video generation started:', operationName);

    // ✅ STORE GENERATION REQUEST IN MONGODB
    await db.collection('veo_generations').insertOne({
      businessId: new ObjectId(businessId),
      userEmail,
      model,
      prompt,
      negativePrompt: negativePrompt || null,
      config,
      operationName,
      cost: PRICING.generation,
      charged: true,
      status: 'processing',
      requestId,
      created_at: new Date()
    });

    // ✅ RETURN SUCCESS WITH OPERATION NAME
    res.json({
      success: true,
      operationName: operationName,
      message: 'Video generation started',
      charged: true,
      formatted_cost: `R${PRICING.generation.toFixed(2)}`,
      new_balance: walletResult.new_balance,
      formatted_balance: walletResult.formatted_balance
    });

  } catch (error) {
    console.error('❌ Generation error:', error);
    
    if (error.response) {
      console.error('❌ Error response:', error.response.status);
      console.error('❌ Error data:', JSON.stringify(error.response.data, null, 2));
      return res.status(500).json({
        success: false,
        error: `Gemini API error: ${error.response.status}`,
        details: error.response.data
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});


// ========== CHECK VIDEO STATUS ROUTE (UPDATED LOGGING) ==========
router.post('/check-status', async (req, res) => {
    console.log('🔍 ========== CHECKING VIDEO STATUS ==========');
    
    try {
      const { operationName } = req.body;
  
      if (!operationName) {
        console.error('❌ Missing operationName');
        return res.status(400).json({
          success: false,
          error: 'Missing operationName'
        });
      }
  
      console.log('📍 Operation Name:', operationName);
      console.log('🔄 Calling Google REST API directly...');
  
      const apiUrl = `https://generativelanguage.googleapis.com/v1alpha/${operationName}`;
      
      const response = await axios.get(apiUrl, {
        headers: {
          'x-goog-api-key': GEMINI_API_KEY
        },
        timeout: 30000
      });
  
      const operation = response.data;
  
      console.log('✅ REST API response received');
      console.log('📊 Operation.done:', operation.done);
      
      if (operation.done) {
        console.log('\n🎉 ========== VIDEO GENERATION COMPLETE! ==========');
        
        if (operation.error) {
          console.error('❌ Operation has error:', JSON.stringify(operation.error, null, 2));
        }
        
        if (operation.response) {
          console.log('📦 operation.response exists ✓');
          console.log('📦 operation.response.@type:', operation.response['@type']);
          
          // ✅ Check the ACTUAL path
          const videoResponse = operation.response.generateVideoResponse;
          
          if (videoResponse) {
            console.log('✅ operation.response.generateVideoResponse exists ✓');
            console.log('📦 generateVideoResponse keys:', Object.keys(videoResponse));
            
            const generatedSamples = videoResponse.generatedSamples;
            
            if (generatedSamples) {
              console.log('✅ generatedSamples exists ✓');
              console.log('📊 generatedSamples.length:', generatedSamples.length);
              
              if (generatedSamples.length > 0) {
                console.log('\n📹 ========== FIRST VIDEO SAMPLE ==========');
                const firstSample = generatedSamples[0];
                console.log('📦 Sample keys:', Object.keys(firstSample));
                console.log('📹 Video URI:', firstSample.video?.uri);
                console.log('📹 Full sample:', JSON.stringify(firstSample, null, 2));
              }
            } else {
              console.log('⚠️ No generatedSamples');
            }
          } else {
            console.log('⚠️ No generateVideoResponse');
            console.log('📦 Response keys:', Object.keys(operation.response));
          }
        }
        
        console.log('========================================\n');
        
        // Update status in database
        const db = await getDatabase();
        await db.collection('veo_generations').updateOne(
          { operationName: operationName },
          { 
            $set: { 
              status: operation.error ? 'failed' : 'completed',
              completed_at: new Date(),
              fullOperation: operation
            }
          }
        );
      } else {
        console.log('⏳ Video still processing...');
      }
  
      // Return the raw REST API response
      res.json(operation);
  
    } catch (error) {
      console.error('❌ ========== STATUS CHECK ERROR ==========');
      console.error('❌ Error message:', error.message);
      
      if (error.response) {
        console.error('❌ HTTP Status:', error.response.status);
        console.error('❌ Response data:', JSON.stringify(error.response.data, null, 2));
        
        return res.status(error.response.status).json({
          success: false,
          error: error.response.data?.error?.message || error.message,
          details: error.response.data
        });
      }
      
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });


// ========== DOWNLOAD VIDEO ROUTE (FIXED) ==========
router.post('/download', async (req, res) => {
  console.log('⬇️ ========== DOWNLOADING VIDEO ==========');
  
  try {
    const { videoFile } = req.body;

    if (!videoFile || !videoFile.uri) {
      return res.status(400).json({
        success: false,
        error: 'Missing video file URI'
      });
    }

    console.log('📍 Video file object:', JSON.stringify(videoFile, null, 2));

    // ✅ FIXED: Use & instead of ? to append the API key
    // The URI already has ?alt=media, so we append with &
    const downloadUrl = `${videoFile.uri}&key=${GEMINI_API_KEY}`;
    console.log('📍 Download URL:', downloadUrl);
    
    const response = await axios.get(downloadUrl, {
      responseType: 'arraybuffer',
      timeout: 120000,  // 2 minutes for large videos
      maxContentLength: 100 * 1024 * 1024,  // 100MB max
      headers: {
        'Accept': 'video/mp4'
      }
    });

    console.log('✅ Video downloaded successfully');
    console.log('📊 Size:', response.data.length, 'bytes');
    console.log('📊 Content-Type:', response.headers['content-type']);

    res.set('Content-Type', 'video/mp4');
    res.set('Content-Length', response.data.length);
    res.send(Buffer.from(response.data));

  } catch (error) {
    console.error('❌ ========== DOWNLOAD ERROR ==========');
    console.error('❌ Error message:', error.message);
    
    if (error.response) {
      console.error('❌ Response status:', error.response.status);
      console.error('❌ Response data:', error.response.data?.toString());
    }
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ========== GET PRICING ==========
router.get('/pricing', (req, res) => {
  res.json({
    success: true,
    pricing: {
      generation: {
        amount: PRICING.generation,
        formatted: `R${PRICING.generation.toFixed(2)}`
      }
    }
  });
});

module.exports = router;