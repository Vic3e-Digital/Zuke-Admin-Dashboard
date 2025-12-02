// api/veo-vertex-api.js
const express = require('express');
const router = express.Router();
const { getDatabase } = require('../lib/mongodb');
const { ObjectId } = require('mongodb');
const axios = require('axios');

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID;
const LOCATION = process.env.VERTEX_AI_LOCATION || 'us-central1';
const VERTEX_API_KEY = process.env.VERTEX_AI_API_KEY;
const N8N_WALLET_WEBHOOK = process.env.N8N_WALLET_WEBHOOK_URL;

// Pricing
const PRICING = {
  generation: 20  // R20.00 per video generation
};

// Available models
const MODELS = {
  'veo-2.0': 'veo-2.0-generate-001',
  'veo-3.0': 'veo-3.0-generate-001',
  'veo-3.0-fast': 'veo-3.0-fast-generate-001',
  'veo-3.1': 'veo-3.1-generate-preview',
  'veo-3.1-fast': 'veo-3.1-fast-generate-preview'
};


// ========== GENERATE VIDEO ROUTE ==========
router.post('/generate', async (req, res) => {
  console.log('🎬 ========== VERTEX AI VEO GENERATION ==========');
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
    const requestId = `veo_vertex_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // ✅ WALLET CHECK AND DEDUCTION
    const walletPayload = {
      userEmail,
      businessId,
      cost: PRICING.generation,
      requestId,
      description: 'Veo AI video generation (Vertex AI)',
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

    // ✅ BUILD VERTEX AI REQUEST
    console.log('🎬 Calling Vertex AI...');
    
    // Map model name to Vertex AI model ID
    const modelId = MODELS[model] || model;
    
    const instance = {
      prompt: prompt
    };

    // Add image if provided (image-to-video)
    if (image) {
      instance.image = {
        bytesBase64Encoded: image.imageBytes,
        mimeType: image.mimeType || 'image/jpeg'
      };
    }

    // Build parameters
    const parameters = {
      aspectRatio: config?.aspectRatio || "16:9",
      durationSeconds: parseInt(config?.durationSeconds) || 8,
      sampleCount: config?.numberOfVideos || 1
    };

    // Add resolution for Veo 3+ models
    if (modelId.startsWith('veo-3')) {
      parameters.resolution = config?.resolution || "720p";
      parameters.generateAudio = true;  // Required for Veo 3
      
      // Add resizeMode for image-to-video
      if (image) {
        parameters.resizeMode = config?.resizeMode || "pad";
      }
    }

    // Add negative prompt if provided
    if (negativePrompt && negativePrompt.trim()) {
      parameters.negativePrompt = negativePrompt.trim();
    }

    const requestBody = {
      instances: [instance],
      parameters: parameters
    };

    console.log('📦 Vertex AI Request:', JSON.stringify(requestBody, null, 2));

    // ✅ CALL VERTEX AI WITH API KEY (Simple!)
    const endpoint = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${modelId}:predictLongRunning?key=${VERTEX_API_KEY}`;
    
    console.log('📍 Endpoint:', endpoint.replace(VERTEX_API_KEY, 'API_KEY'));

    const response = await axios.post(endpoint, requestBody, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 60000
    });

    const operationName = response.data.name;

    if (!operationName) {
      console.error('❌ No operation name in response');
      throw new Error('No operation name returned from Vertex AI');
    }

    console.log('✅ Video generation started:', operationName);

      // In the generate endpoint, after storing in MongoDB:
await db.collection('veo_generations').insertOne({
  businessId: new ObjectId(businessId),
  userEmail,
  model: modelId,
  prompt,
  negativePrompt: negativePrompt || null,
  config,
  operationName,
  provider: 'vertex-ai', // ✅ Store the provider
  cost: PRICING.generation,
  charged: true,
  status: 'processing',
  requestId,
  created_at: new Date()
});

// Return provider in response
res.json({
  success: true,
  operationName: operationName,
  provider: 'vertex-ai', // ✅ Return the provider
  message: 'Video generation started',
  charged: true,
  formatted_cost: `R${PRICING.generation.toFixed(2)}`,
  new_balance: walletResult.new_balance,
  formatted_balance: walletResult.formatted_balance
});
    // ✅ STORE GENERATION REQUEST IN MONGODB
    // await db.collection('veo_generations').insertOne({
    //   businessId: new ObjectId(businessId),
    //   userEmail,
    //   model: modelId,
    //   prompt,
    //   negativePrompt: negativePrompt || null,
    //   config,
    //   operationName,
    //   cost: PRICING.generation,
    //   charged: true,
    //   status: 'processing',
    //   requestId,
    //   provider: 'vertex-ai',
    //   created_at: new Date()
    // });

    // ✅ RETURN SUCCESS WITH OPERATION NAME
    // res.json({
    //   success: true,
    //   operationName: operationName,
    //   message: 'Video generation started',
    //   charged: true,
    //   formatted_cost: `R${PRICING.generation.toFixed(2)}`,
    //   new_balance: walletResult.new_balance,
    //   formatted_balance: walletResult.formatted_balance
    // });

  } catch (error) {
    console.error('❌ Generation error:', error);
    
    if (error.response) {
      console.error('❌ Error response:', error.response.status);
      console.error('❌ Error data:', JSON.stringify(error.response.data, null, 2));
      return res.status(500).json({
        success: false,
        error: `Vertex AI error: ${error.response.status}`,
        details: error.response.data
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ========== CHECK VIDEO STATUS ROUTE ==========
router.post('/check-status', async (req, res) => {
  console.log('🔍 ========== CHECKING VERTEX AI STATUS ==========');
  
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

    // Extract model ID from operation name
    // Format: projects/.../models/MODEL_ID/operations/...
    const modelMatch = operationName.match(/models\/([^/]+)/);
    const modelId = modelMatch ? modelMatch[1] : 'veo-3.1-generate-preview';

    console.log('📍 Model ID:', modelId);
    console.log('🔄 Calling Vertex AI fetchPredictOperation...');

    // ✅ CALL VERTEX AI WITH API KEY
    const endpoint = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${modelId}:fetchPredictOperation?key=${VERTEX_API_KEY}`;
    
    const response = await axios.post(endpoint, {
      operationName: operationName
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    const operation = response.data;

    console.log('✅ Vertex AI response received');
    console.log('📊 Operation done?', operation.done);
    console.log('📊 Full response keys:', Object.keys(operation));
    
    if (operation.done) {
      console.log('✅ Video generation complete!');
      console.log('📦 Full response:', JSON.stringify(operation, null, 2));

      if (operation.response) {
        console.log('📦 Response @type:', operation.response['@type']);
        
        const videos = operation.response.videos;
        
        if (videos && videos.length > 0) {
          console.log('✅ Has videos:', videos.length);
          console.log('📹 First video:', JSON.stringify(videos[0], null, 2));
        } else {
          console.log('⚠️ No videos in response');
        }

        if (operation.response.raiMediaFilteredCount > 0) {
          console.log('⚠️ Filtered videos:', operation.response.raiMediaFilteredCount);
          console.log('⚠️ Reasons:', operation.response.raiMediaFilteredReasons);
        }
      }

      if (operation.error) {
        console.error('❌ Operation error:', JSON.stringify(operation.error, null, 2));
      }
      
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

      // Return operation with videoFile for easy frontend consumption
      const response = { ...operation };
      if (operation.response && operation.response.videos && operation.response.videos.length > 0) {
        response.videoFile = operation.response.videos[0];
      }
      return response;
    } else {
      console.log('⏳ Video still processing...');
    }

    // Return the operation
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

// ========== DOWNLOAD VIDEO ROUTE ==========
router.post('/download', async (req, res) => {
  console.log('⬇️ ========== DOWNLOADING VIDEO ==========');
  
  try {
    const { videoFile } = req.body;

    if (!videoFile) {
      return res.status(400).json({
        success: false,
        error: 'Missing video file'
      });
    }

    console.log('📍 Video file:', JSON.stringify(videoFile, null, 2));

    // Check if it's a GCS URI or base64
    if (videoFile.gcsUri) {
      console.log('📦 GCS URI detected:', videoFile.gcsUri);
      
      // Download from GCS using API key
      // Format: gs://bucket/path/file.mp4
      const gcsPath = videoFile.gcsUri.replace('gs://', '');
      const [bucket, ...pathParts] = gcsPath.split('/');
      const filePath = pathParts.join('/');
      
      const downloadUrl = `https://storage.googleapis.com/storage/v1/b/${bucket}/o/${encodeURIComponent(filePath)}?alt=media&key=${VERTEX_API_KEY}`;
      
      console.log('📍 GCS Download URL (key hidden)');
      
      const response = await axios({
        method: 'get',
        url: downloadUrl,
        responseType: 'stream',
        timeout: 120000
      });

      console.log('✅ Stream started from GCS');
      
      res.set('Content-Type', videoFile.mimeType || 'video/mp4');
      
      if (response.headers['content-length']) {
        res.set('Content-Length', response.headers['content-length']);
      }

      response.data.pipe(res);

      response.data.on('error', (error) => {
        console.error('❌ Stream error:', error.message);
      });

      response.data.on('end', () => {
        console.log('✅ Video stream completed');
      });

    } else if (videoFile.bytesBase64Encoded) {
      console.log('📦 Base64 video detected');
      
      // Decode base64
      const videoBuffer = Buffer.from(videoFile.bytesBase64Encoded, 'base64');
      
      console.log('✅ Video decoded, size:', videoBuffer.length, 'bytes');
      
      res.set('Content-Type', videoFile.mimeType || 'video/mp4');
      res.set('Content-Length', videoBuffer.length);
      res.send(videoBuffer);
      
    } else {
      throw new Error('Video file must have either gcsUri or bytesBase64Encoded');
    }

  } catch (error) {
    console.error('❌ ========== DOWNLOAD ERROR ==========');
    console.error('❌ Error message:', error.message);
    
    if (error.response) {
      console.error('❌ Response status:', error.response.status);
    }
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
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
    },
    models: MODELS
  });
});

module.exports = router;