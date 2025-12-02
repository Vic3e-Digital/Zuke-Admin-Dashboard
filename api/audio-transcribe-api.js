// api/audio-transcribe-api.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const OpenAI = require('openai').default;
const { Document, Packer, Paragraph, Table, TableCell, TableRow, BorderStyle, AlignmentType, TextRun } = require('docx');
const { getDatabase } = require('../lib/mongodb');
const { ObjectId } = require('mongodb');

const N8N_WALLET_WEBHOOK = process.env.N8N_WALLET_WEBHOOK_URL;

// Pricing
const PRICING = {
  TRANSCRIPTION: 15.00
};

// Storage config - Allow up to 4 audio files
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { 
    fileSize: 25 * 1024 * 1024,  // 25MB per file
    files: 4  // Maximum 4 files
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['audio/mpeg', 'audio/wav', 'audio/m4a', 'audio/ogg', 'audio/mp4'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid audio format'));
    }
  }
});

// ========== FETCH AZURE OPENAI CONFIG ==========
async function getAzureOpenAIConfig() {
  return {
    apiKey: process.env.AZURE_OPENAI_DIARIZATION_DEPLOYMENT,
    endpoint: process.env.AZURE_OPENAI_ENDPOINT || 'https://zuke-n8n-videos.cognitiveservices.azure.com/',
    deploymentName: 'gpt-4o-transcribe-diarize'
  };
}

// ========== INITIALIZE OPENAI CLIENT ==========
async function getOpenAIClient() {
  const config = await getAzureOpenAIConfig();
  
  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: `${config.endpoint}/openai/deployments/${config.deploymentName}`,
    defaultQuery: { 'api-version': '2025-03-01-preview' },
    defaultHeaders: {
      'api-key': config.apiKey
    }
  });
}

// ========== TRANSCRIBE AUDIO WITH AZURE OPENAI ==========
async function transcribeAudioWithWhisper(audioBuffer, originalFileName) {
  console.log('🎙️ Starting transcription...');
  console.log(`📁 Audio file: ${originalFileName}`);
  console.log(`📦 File size: ${(audioBuffer.length / 1024 / 1024).toFixed(2)} MB`);

  try {
    const client = await getOpenAIClient();
    const config = await getAzureOpenAIConfig();

    console.log(`📤 Calling Azure OpenAI: ${config.deploymentName}`);
    console.log(`🔗 Endpoint: ${config.endpoint}`);
    console.log(`🔗 API Version: 2025-03-01-preview`);

    // Create a File-like object from the buffer
    const file = new File([audioBuffer], originalFileName, {
      type: getAudioMimeType(originalFileName)
    });

    console.log(`⏱️ Starting transcription request...`);
    const startTime = Date.now();

    const transcription = await client.audio.transcriptions.create({
      file: file,
      model: 'gpt-4o-transcribe-diarize',
      response_format: 'diarized_json',
      chunking_strategy: 'auto',
      timestamp_granularities: ['segment']
    }, {
      timeout: 600000, // 10 minutes timeout for long files
      maxRetries: 2
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Transcription received in ${duration}s`);
    console.log(`📝 Text length: ${transcription.text?.length || 0} characters`);
    console.log(`🎤 Segments: ${transcription.segments?.length || 0}`);

    // Validate response
    if (!transcription.text && !transcription.segments) {
      throw new Error('Empty transcription received from API');
    }

    return transcription;

  } catch (error) {
    console.error('❌ Transcription error:', error.message);
    
    if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
      throw new Error('Audio file is too long or processing timed out. Please try a shorter file or split your audio.');
    }
    
    if (error.response?.data) {
      console.error('API Response:', JSON.stringify(error.response.data, null, 2));
    }
    if (error.response?.status) {
      console.error('Status Code:', error.response.status);
    }
    
    throw new Error(`Transcription failed: ${error.message}`);
  }
}

// ========== BATCH TRANSCRIBE MULTIPLE FILES ==========
async function transcribeMultipleFiles(files, userEmail, businessId) {
  console.log(`🎙️ Starting batch transcription of ${files.length} files...`);
  
  const results = [];
  const errors = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    console.log(`\n📁 Processing file ${i + 1}/${files.length}: ${file.originalname}`);
    
    try {
      const transcription = await transcribeAudioWithWhisper(file.buffer, file.originalname);
      
      results.push({
        fileName: file.originalname,
        fileSize: file.size,
        success: true,
        transcription: transcription,
        index: i
      });
      
      console.log(`✅ File ${i + 1} transcribed successfully`);
      
    } catch (error) {
      console.error(`❌ File ${i + 1} failed:`, error.message);
      
      errors.push({
        fileName: file.originalname,
        fileSize: file.size,
        success: false,
        error: error.message,
        index: i
      });
    }
  }
  
  return { results, errors };
}

// Helper function to get proper MIME type
function getAudioMimeType(fileName) {
  const ext = fileName.toLowerCase().split('.').pop();
  const mimeTypes = {
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'm4a': 'audio/m4a',
    'ogg': 'audio/ogg',
    'mp4': 'audio/mp4',
    'webm': 'audio/webm'
  };
  return mimeTypes[ext] || 'audio/mpeg';
}

// ========== DEDUCT COST FROM WALLET ==========
async function deductCost(userEmail, businessId, cost, description) {
  console.log('💰 Deducting cost from wallet...');
  console.log(`👤 User: ${userEmail}, Business: ${businessId}, Cost: R${cost.toFixed(2)}`);

  if (!N8N_WALLET_WEBHOOK) {
    console.error('❌ N8N_WALLET_WEBHOOK not configured');
    throw new Error('Wallet service not configured');
  }

  const walletPayload = {
    userEmail,
    businessId,
    cost: cost,
    requestId: `transcribe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    description: description || 'Audio transcription with diarization'
  };

  try {
    const walletResponse = await axios.post(N8N_WALLET_WEBHOOK, walletPayload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
      validateStatus: (status) => status >= 200 && status < 300 || status === 402
    });

    const walletResult = walletResponse.data;

    if (walletResponse.status === 402 || !walletResult.success) {
      console.log('⚠️ Insufficient funds');
      throw {
        status: 402,
        formatted_balance: walletResult.formatted_balance,
        required: cost,
        formatted_required: `R${cost.toFixed(2)}`
      };
    }

    console.log('✅ Cost deducted. New balance:', walletResult.formatted_balance);
    return walletResult;

  } catch (error) {
    if (error.status === 402) {
      throw error;
    }
    console.error('❌ Wallet error:', error.message);
    throw error;
  }
}

// ========== ESTIMATE PROCESSING TIME ==========
function estimateProcessingTime(fileSizeBytes) {
  // Rough estimate: ~1 minute per MB for transcription + diarization
  const sizeMB = fileSizeBytes / 1024 / 1024;
  const estimatedSeconds = Math.ceil(sizeMB * 60);
  return {
    seconds: estimatedSeconds,
    formatted: estimatedSeconds > 60 
      ? `${Math.ceil(estimatedSeconds / 60)} minutes` 
      : `${estimatedSeconds} seconds`
  };
}


// ========== MAIN TRANSCRIPTION ROUTE - SUPPORTS MULTIPLE FILES ==========
router.post('/transcribe', upload.array('audio', 4), async (req, res) => {
  console.log('\n🎙️ ========== AUDIO TRANSCRIPTION REQUEST ==========');

  try {
    const {
      businessId,
      userEmail
    } = req.body;

    const files = req.files;

    console.log('📦 Request Body:');
    console.log('  - businessId:', businessId);
    console.log('  - userEmail:', userEmail);
    console.log('  - Number of files:', files?.length || 0);
    
    if (files && files.length > 0) {
      files.forEach((file, i) => {
        console.log(`  - File ${i + 1}: ${file.originalname} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
      });
    }

    // Validate required fields
    if (!businessId || !userEmail || !files || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: businessId, userEmail, or audio files'
      });
    }

    // Validate file count
    if (files.length > 4) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 4 audio files allowed per request'
      });
    }

    // Calculate total size
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const totalSizeMB = (totalSize / 1024 / 1024).toFixed(2);
    console.log(`📦 Total upload size: ${totalSizeMB} MB`);

    // Get business info
    const db = await getDatabase();
    const business = await db.collection('store_submissions').findOne({
      _id: new ObjectId(businessId)
    });

    const businessName = business?.store_info?.name || 'Your Business';
    console.log(`\n✅ Business found: ${businessName}`);

    // Calculate cost - charge per file
    const costPerFile = PRICING.TRANSCRIPTION;
    const totalCost = costPerFile * files.length;

    console.log(`\n💰 Pricing:`);
    console.log(`  - Cost per file: R${costPerFile.toFixed(2)}`);
    console.log(`  - Number of files: ${files.length}`);
    console.log(`  - Total cost: R${totalCost.toFixed(2)}`);

    // ✅ WALLET CHECK AND DEDUCTION
    console.log('\n💳 Processing wallet...');
    const walletResult = await deductCost(
      userEmail,
      businessId,
      totalCost,
      `Audio transcription (${files.length} file${files.length > 1 ? 's' : ''})`
    );

    // ✅ PERFORM BATCH TRANSCRIPTION
    console.log('\n🎙️ Processing audio files...');
    
    let batchResult;
    try {
      batchResult = await transcribeMultipleFiles(files, userEmail, businessId);
    } catch (transcriptionError) {
      console.error('❌ Batch transcription failed:', transcriptionError.message);
      
      // Attempt to refund if all transcriptions failed
      console.log('💰 Attempting to refund due to transcription failure...');
      try {
        await axios.post(N8N_WALLET_WEBHOOK, {
          userEmail,
          businessId,
          cost: -totalCost,
          requestId: `refund_transcribe_${Date.now()}`,
          description: 'Refund: Transcription failed'
        }, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
        });
        console.log('✅ Refund processed');
      } catch (refundError) {
        console.error('⚠️ Refund failed:', refundError.message);
      }
      
      throw transcriptionError;
    }

    // Process results
    const processedFiles = [];
    
    batchResult.results.forEach((result) => {
      // Group segments by speaker
      let fullText = result.transcription.text;
      let groupedBySpeaker = [];
      
      if (result.transcription.segments && Array.isArray(result.transcription.segments)) {
        fullText = result.transcription.segments
          .map(seg => seg.text)
          .join(' ');
        
        let currentSpeaker = null;
        let currentGroup = null;
        
        result.transcription.segments.forEach(segment => {
          const speaker = segment.speaker || 'Unknown';
          
          if (speaker !== currentSpeaker) {
            if (currentGroup) {
              groupedBySpeaker.push(currentGroup);
            }
            currentSpeaker = speaker;
            currentGroup = {
              speaker: speaker,
              text: segment.text.trim(),
              segments: [segment],
              start: segment.start,
              end: segment.end
            };
          } else {
            currentGroup.text += ' ' + segment.text.trim();
            currentGroup.segments.push(segment);
            currentGroup.end = segment.end;
          }
        });
        
        if (currentGroup) {
          groupedBySpeaker.push(currentGroup);
        }
      }
      
      processedFiles.push({
        fileName: result.fileName,
        fileSize: result.fileSize,
        success: true,
        text: fullText,
        grouped: groupedBySpeaker,
        metadata: {
          language: result.transcription.language || 'en',
          duration: result.transcription.duration || null,
          segmentCount: result.transcription.segments?.length || 0,
          speakerGroups: groupedBySpeaker.length
        },
        transcription: result.transcription
      });
    });

    // Add failed files
    batchResult.errors.forEach((error) => {
      processedFiles.push({
        fileName: error.fileName,
        fileSize: error.fileSize,
        success: false,
        error: error.error
      });
    });

    // Sort by original index
    processedFiles.sort((a, b) => {
      const aIndex = batchResult.results.find(r => r.fileName === a.fileName)?.index ?? 
                     batchResult.errors.find(e => e.fileName === a.fileName)?.index ?? 0;
      const bIndex = batchResult.results.find(r => r.fileName === b.fileName)?.index ?? 
                     batchResult.errors.find(e => e.fileName === b.fileName)?.index ?? 0;
      return aIndex - bIndex;
    });

    // ✅ STORE TRANSCRIPTIONS IN DATABASE
    console.log('\n💾 Storing transcriptions...');
    
    const transcriptionRecords = processedFiles.filter(f => f.success).map(file => ({
      businessId: new ObjectId(businessId),
      userEmail,
      businessName,
      audioFileName: file.fileName,
      audioSize: file.fileSize,
      language: file.metadata.language,
      duration: file.metadata.duration,
      fullTranscription: JSON.stringify(file.transcription),
      cost: costPerFile,
      charged: true,
      status: 'completed',
      batchId: `batch_${Date.now()}`,
      batchSize: files.length,
      created_at: new Date()
    }));

    if (transcriptionRecords.length > 0) {
      await db.collection('audio_transcriptions').insertMany(transcriptionRecords);
      console.log(`✅ ${transcriptionRecords.length} transcription(s) stored in database`);
    }

    // Calculate partial refund if some files failed
    const failedCount = batchResult.errors.length;
    if (failedCount > 0) {
      const refundAmount = costPerFile * failedCount;
      console.log(`⚠️ ${failedCount} file(s) failed. Refunding R${refundAmount.toFixed(2)}`);
      
      try {
        await axios.post(N8N_WALLET_WEBHOOK, {
          userEmail,
          businessId,
          cost: -refundAmount,
          requestId: `partial_refund_${Date.now()}`,
          description: `Partial refund: ${failedCount} file(s) failed`
        }, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
        });
        console.log('✅ Partial refund processed');
      } catch (refundError) {
        console.error('⚠️ Partial refund failed:', refundError.message);
      }
    }

    const responseData = {
      success: true,
      message: `Transcription completed for ${batchResult.results.length} of ${files.length} file(s)`,
      files: processedFiles,
      summary: {
        total: files.length,
        successful: batchResult.results.length,
        failed: batchResult.errors.length,
        totalCost: totalCost,
        charged: totalCost - (failedCount * costPerFile),
        refunded: failedCount > 0 ? costPerFile * failedCount : 0
      },
      costs: {
        perFile: costPerFile,
        total: totalCost,
        charged: totalCost - (failedCount * costPerFile),
        formatted: `R${(totalCost - (failedCount * costPerFile)).toFixed(2)}`
      },
      newBalance: walletResult.new_balance,
      formattedBalance: walletResult.formatted_balance
    };

    console.log('✅ SUCCESS - Returning batch transcription results');
    console.log(`📊 Stats: ${batchResult.results.length} successful, ${batchResult.errors.length} failed`);

    return res.json(responseData);

  } catch (error) {
    console.error('\n❌ CRITICAL ERROR:', error.message);
    console.error('❌ Stack:', error.stack);

    if (error.status === 402) {
      return res.status(402).json({
        success: false,
        error: 'Insufficient funds',
        required: error.required,
        formatted_balance: error.formatted_balance,
        formatted_required: error.formatted_required
      });
    }

    if (error.message.includes('Invalid audio')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid audio format. Please use MP3, WAV, M4A, or OGG'
      });
    }

    return res.status(500).json({
      success: false,
      error: error.message || 'Transcription failed'
    });
  }
});

// ========== DOWNLOAD ENDPOINT ==========
router.post('/download', async (req, res) => {
  try {
    const { format, transcription, fileName } = req.body;

    if (!transcription) {
      return res.status(400).json({ success: false, error: 'No transcription data provided' });
    }

    let fileContent;
    let mimeType;
    let extension;

    switch (format) {
      case 'txt':
        // Plain text format with speaker labels
        if (transcription.grouped && Array.isArray(transcription.grouped)) {
          fileContent = transcription.grouped
            .map(group => `[${group.speaker}]: ${group.text}`)
            .join('\n\n');
        } else if (transcription.text) {
          fileContent = transcription.text;
        } else {
          fileContent = JSON.stringify(transcription);
        }
        mimeType = 'text/plain';
        extension = 'txt';
        break;

      case 'json':
        fileContent = JSON.stringify(transcription, null, 2);
        mimeType = 'application/json';
        extension = 'json';
        break;

      default:
        return res.status(400).json({ success: false, error: 'Invalid format. Use txt or json' });
    }

    const finalFileName = `${fileName || 'transcription'}.${extension}`;

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${finalFileName}"`);
    res.send(fileContent);

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== PRICING ENDPOINT ==========
router.get('/pricing', (req, res) => {
  res.json({
    success: true,
    pricing: {
      transcription: {
        amount: PRICING.TRANSCRIPTION,
        formatted: `R${PRICING.TRANSCRIPTION.toFixed(2)}`,
        description: 'Audio transcription with speaker identification (diarization)'
      }
    }
  });
});

// ========== GET TRANSCRIPTION HISTORY ==========
router.get('/history/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;
    const { userEmail } = req.query;

    if (!businessId || !userEmail) {
      return res.status(400).json({
        success: false,
        error: 'businessId and userEmail are required'
      });
    }

    const db = await getDatabase();
    const transcriptions = await db.collection('audio_transcriptions')
      .find({
        businessId: new ObjectId(businessId),
        userEmail: userEmail
      })
      .sort({ created_at: -1 })
      .limit(50)
      .toArray();

    res.json({
      success: true,
      count: transcriptions.length,
      transcriptions: transcriptions.map(t => ({
        id: t._id,
        audioFileName: t.audioFileName,
        audioSize: t.audioSize,
        language: t.language,
        duration: t.duration,
        cost: t.cost,
        created_at: t.created_at
      }))
    });

  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ========== AZURE SPEECH API - TRANSCRIBE WITH DIARIZATION ==========
// Storage config for Azure transcriber - support single large file up to 500MB
const uploadAzure = multer({
  storage: multer.memoryStorage(),
  limits: { 
    fileSize: 500 * 1024 * 1024  // 500MB per file
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['audio/mpeg', 'audio/wav', 'audio/m4a', 'audio/ogg', 'audio/mp4', 'audio/webm', 'audio/flac'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid audio format'));
    }
  }
});

// Transcribe audio using Azure Cognitive Services Speech API
async function transcribeWithAzureSpeech(audioBuffer, originalFileName, diarization = true) {
  console.log('🎙️ Starting Azure Speech transcription...');
  console.log(`📁 Audio file: ${originalFileName}`);
  console.log(`📦 File size: ${(audioBuffer.length / 1024 / 1024).toFixed(2)} MB`);
  console.log(`🎤 Diarization enabled: ${diarization}`);

  try {
    const azureRegion = process.env.AZURE_SPEECH_REGION || 'eastus';
    const azureKey = process.env.AZURE_SPEECH_KEY;

    if (!azureKey) {
      throw new Error('AZURE_SPEECH_KEY environment variable is not set');
    }

    const apiUrl = `https://${azureRegion}.api.cognitive.microsoft.com/speechtotext/transcriptions:transcribe?api-version=2025-10-15`;

    console.log(`📤 Calling Azure Speech API: ${azureRegion}`);
    console.log(`🔗 Endpoint: ${apiUrl}`);

    // Build definition based on diarization setting
    const definition = {
      locales: ['en-US'],
      profanityFilterMode: 'Masked'
    };

    if (diarization) {
      definition.diarization = {
        enabled: true,
        maxSpeakers: 10
      };
    }

    console.log(`📋 Definition:`, JSON.stringify(definition, null, 2));

    // Create FormData for multipart request
    const FormData = require('form-data');
    const form = new FormData();
    form.append('audio', audioBuffer, {
      filename: originalFileName,
      contentType: getAudioMimeType(originalFileName)
    });
    form.append('definition', JSON.stringify(definition));

    const startTime = Date.now();

    const response = await axios.post(apiUrl, form, {
      headers: {
        ...form.getHeaders(),
        'Ocp-Apim-Subscription-Key': azureKey
      },
      timeout: 600000, // 10 minutes timeout
      validateStatus: (status) => status >= 200 && status < 300
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Transcription received in ${duration}s`);

    const result = response.data;
    console.log(`📝 Combined text length: ${result.combinedPhrases?.[0]?.text?.length || 0} characters`);
    console.log(`🔤 Phrases: ${result.phrases?.length || 0}`);

    if (diarization && result.phrases) {
      const speakers = new Set(result.phrases.map(p => p.speaker).filter(s => s !== undefined));
      console.log(`🎤 Speakers identified: ${speakers.size}`);
    }

    // Validate response
    if (!result.combinedPhrases && !result.phrases) {
      throw new Error('Empty transcription received from Azure API');
    }

    // Extract duration from response
    const durationMs = result.durationMilliseconds || 0;
    const durationMinutes = durationMs / 60000;

    return {
      text: result.combinedPhrases?.[0]?.text || '',
      phrases: result.phrases || [],
      durationMilliseconds: durationMs,
      durationMinutes: parseFloat(durationMinutes.toFixed(2)),
      speakers: diarization ? Array.from(new Set(result.phrases?.map(p => p.speaker).filter(s => s !== undefined) || [])).sort() : [],
      confidence: result.phrases?.length > 0 
        ? (result.phrases.reduce((sum, p) => sum + (p.confidence || 0), 0) / result.phrases.length).toFixed(4)
        : 0,
      language: result.phrases?.[0]?.locale || 'en-US',
      raw: result
    };

  } catch (error) {
    console.error('❌ Azure Speech transcription error:', error.message);

    if (error.response?.data) {
      console.error('API Response:', JSON.stringify(error.response.data, null, 2));
    }
    if (error.response?.status) {
      console.error('Status Code:', error.response.status);
    }

    if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
      throw new Error('Audio file is too long or processing timed out. Please try a shorter file.');
    }

    throw new Error(`Azure Speech transcription failed: ${error.message}`);
  }
}

// Calculate cost based on audio duration (R0.50 per minute) + optional diarization (R5.00)
function calculateTranscriptionCost(durationMinutes, includeDiarization = false) {
  const costPerMinute = 0.50;
  const diarizationCost = includeDiarization ? 5.00 : 0;
  const transcriptionCost = parseFloat((durationMinutes * costPerMinute).toFixed(2));
  const totalCost = parseFloat((transcriptionCost + diarizationCost).toFixed(2));
  
  return {
    transcriptionCost: transcriptionCost,
    diarizationCost: diarizationCost,
    totalCost: totalCost,
    breakdown: `${transcriptionCost} (transcription) + ${diarizationCost} (diarization)`
  };
}

// ========== AZURE TRANSCRIPTION ROUTE ==========
router.post('/azure', uploadAzure.single('audio'), async (req, res) => {
  console.log('\n🎙️ ========== AZURE SPEECH TRANSCRIPTION REQUEST ==========');

  try {
    const {
      businessId,
      userEmail,
      diarization = true
    } = req.body;

    const file = req.file;

    console.log('📦 Request Body:');
    console.log('  - businessId:', businessId);
    console.log('  - userEmail:', userEmail);
    console.log('  - diarization:', diarization);
    console.log(`  - Audio file: ${file?.originalname || 'none'} (${file ? (file.size / 1024 / 1024).toFixed(2) : 0} MB)`);

    // Validate required fields
    if (!businessId || !userEmail || !file) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: businessId, userEmail, or audio file'
      });
    }

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

    const businessName = business?.store_info?.name || 'Your Business';
    console.log(`\n✅ Business found: ${businessName}`);

    // Transcribe with Azure
    console.log('\n🔄 Transcribing with Azure Speech API...');
    const transcription = await transcribeWithAzureSpeech(file.buffer, file.originalname, diarization === 'true' || diarization === true);

    // Calculate cost based on duration + diarization
    const isDiarizationEnabled = diarization === 'true' || diarization === true;
    const costBreakdown = calculateTranscriptionCost(transcription.durationMinutes, isDiarizationEnabled);
    const cost = costBreakdown.totalCost;
    
    console.log(`\n💰 Pricing:`);
    console.log(`  - Duration: ${transcription.durationMinutes} minutes @ R0.50/min = R${costBreakdown.transcriptionCost}`);
    if (isDiarizationEnabled) {
      console.log(`  - Diarization (Speaker ID): R${costBreakdown.diarizationCost}`);
    }
    console.log(`  - Total cost: R${cost.toFixed(2)}`);

    // ✅ WALLET CHECK AND DEDUCTION
    console.log('\n💳 Processing wallet...');
    let walletResult;
    try {
      const description = isDiarizationEnabled 
        ? `Azure Speech transcription with diarization: ${file.originalname} (${transcription.durationMinutes} min)`
        : `Azure Speech transcription: ${file.originalname} (${transcription.durationMinutes} min)`;
      
      walletResult = await deductCost(
        userEmail,
        businessId,
        cost,
        description
      );
    } catch (error) {
      if (error.status === 402) {
        return res.status(402).json({
          success: false,
          error: 'Insufficient credits',
          current_balance: error.formatted_balance,
          required_amount: error.formatted_required
        });
      }
      throw error;
    }

    // Save to database
    console.log('\n💾 Saving transcription to database...');
    const transcriptionRecord = {
      businessId: new ObjectId(businessId),
      userEmail: userEmail,
      audioFileName: file.originalname,
      audioSize: file.size,
      language: transcription.language,
      duration: transcription.durationMinutes,
      durationMs: transcription.durationMilliseconds,
      speakers: transcription.speakers,
      confidence: parseFloat(transcription.confidence),
      cost: cost,
      diarization: diarization === 'true' || diarization === true,
      phrases: transcription.phrases,
      text: transcription.text,
      created_at: new Date(),
      updated_at: new Date()
    };

    const insertResult = await db.collection('audio_transcriptions').insertOne(transcriptionRecord);
    console.log(`✅ Saved to database with ID: ${insertResult.insertedId}`);

    // Return success response
    res.json({
      success: true,
      transcription: {
        text: transcription.text,
        confidence: transcription.confidence,
        language: transcription.language,
        durationMinutes: transcription.durationMinutes,
        speakers: transcription.speakers,
        phrases: transcription.phrases.map(p => ({
          text: p.text,
          offsetMs: p.offsetMilliseconds,
          durationMs: p.durationMilliseconds,
          confidence: p.confidence,
          speaker: p.speaker,
          words: p.words
        }))
      },
      cost: {
        amount: cost,
        formatted: `R${cost.toFixed(2)}`,
        durationMinutes: transcription.durationMinutes,
        transcriptionCost: costBreakdown.transcriptionCost,
        diarizationCost: costBreakdown.diarizationCost,
        breakdown: costBreakdown.breakdown,
        costPerMinute: 'R0.50',
        diarizationFee: 'R5.00 (if enabled)'
      },
      wallet: {
        new_balance: walletResult.formatted_balance
      }
    });

    console.log('✅ Transcription completed successfully\n');

  } catch (error) {
    console.error('❌ Error:', error.message);

    if (error.message.includes('Invalid audio')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid audio format. Please use MP3, WAV, M4A, OGG, or FLAC'
      });
    }

    if (error.message.includes('too long')) {
      return res.status(413).json({
        success: false,
        error: error.message
      });
    }

    return res.status(500).json({
      success: false,
      error: error.message || 'Azure Speech transcription failed'
    });
  }
});

// ========== DOWNLOAD TRANSCRIPTION AS WORD ==========
router.post('/download-word', async (req, res) => {
  try {
    const { 
      transcription,
      fileName = 'transcription',
      metadata = {}
    } = req.body;

    if (!transcription || !transcription.text) {
      return res.status(400).json({ 
        success: false, 
        error: 'No transcription data provided' 
      });
    }

    // Create document sections
    const docSections = [];

    // Add title
    docSections.push(
      new Paragraph({
        text: 'Audio Transcription Report',
        heading: 'Heading1',
        bold: true,
        size: 28,
        spacing: { after: 200 }
      })
    );

    // Add metadata information
    if (metadata && Object.keys(metadata).length > 0) {
      if (metadata.fileName) {
        docSections.push(new Paragraph({ text: `File: ${metadata.fileName}`, spacing: { after: 100 } }));
      }
      if (metadata.duration) {
        docSections.push(new Paragraph({ text: `Duration: ${metadata.duration} minutes`, spacing: { after: 100 } }));
      }
      if (metadata.language) {
        docSections.push(new Paragraph({ text: `Language: ${metadata.language}`, spacing: { after: 100 } }));
      }
      if (metadata.confidence) {
        docSections.push(new Paragraph({ text: `Confidence: ${(parseFloat(metadata.confidence) * 100).toFixed(1)}%`, spacing: { after: 100 } }));
      }
      if (metadata.speakers && metadata.speakers.length > 0) {
        docSections.push(new Paragraph({ text: `Speakers: ${metadata.speakers.join(', ')}`, spacing: { after: 100 } }));
      }
      if (metadata.cost) {
        docSections.push(new Paragraph({ text: `Cost: R${metadata.cost}`, spacing: { after: 200 } }));
      }
    }

    // Add transcription section heading
    docSections.push(
      new Paragraph({
        text: 'Transcription',
        heading: 'Heading2',
        bold: true,
        size: 24,
        spacing: { before: 200, after: 100 }
      })
    );

    // Add transcription content with speaker labels if available
    if (transcription.phrases && transcription.phrases.length > 0 && transcription.speakers && transcription.speakers.length > 0) {
      // Group by speaker
      let currentSpeaker = null;
      let speakerText = '';

      transcription.phrases.forEach(phrase => {
        const speaker = phrase.speaker !== undefined ? phrase.speaker : -1;

        if (currentSpeaker !== speaker && speakerText) {
          docSections.push(
            new Paragraph({
              text: `Speaker ${currentSpeaker}:`,
              bold: true,
              spacing: { before: 100, after: 50 }
            })
          );
          docSections.push(
            new Paragraph({
              text: speakerText,
              spacing: { after: 100 }
            })
          );
          speakerText = '';
        }

        currentSpeaker = speaker;
        speakerText += (speakerText ? ' ' : '') + phrase.text;
      });

      if (speakerText && currentSpeaker !== null) {
        docSections.push(
          new Paragraph({
            text: `Speaker ${currentSpeaker}:`,
            bold: true,
            spacing: { before: 100, after: 50 }
          })
        );
        docSections.push(
          new Paragraph({
            text: speakerText,
            spacing: { after: 100 }
          })
        );
      }
    } else {
      // Plain transcription without speaker labels
      docSections.push(
        new Paragraph({
          text: transcription.text,
          spacing: { line: 240 }
        })
      );
    }

    // Create and generate document
    const doc = new Document({
      sections: [{
        children: docSections
      }]
    });

    const buffer = await Packer.toBuffer(doc);

    // Send file
    const finalFileName = `${fileName.replace(/\.[^/.]+$/, '')}_transcription.docx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${finalFileName}"`);
    res.send(buffer);

  } catch (error) {
    console.error('Word download error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to generate Word document' 
    });
  }
});

module.exports = router;