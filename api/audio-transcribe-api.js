// api/audio-transcribe-api.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak, Table, TableCell, TableRow, BorderStyle, VerticalAlign } = require('docx');
const { getDatabase } = require('../lib/mongodb');
const { ObjectId } = require('mongodb');

const N8N_WALLET_WEBHOOK = process.env.N8N_WALLET_WEBHOOK_URL;
const EMAIL_WEBHOOK = 'https://aigents.southafricanorth.azurecontainer.io/webhook/send-smart-email';
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET;

// Pricing
const PRICING = {
  TRANSCRIPTION: 15.00,
  DIARIZATION_ADDON: 5.00
};

// Storage config - Use memory storage instead of disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['audio/mpeg', 'audio/wav', 'audio/m4a', 'audio/ogg', 'audio/mp4'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid audio format'));
    }
  }
});

// ========== UPLOAD AUDIO TO CLOUDINARY ==========
async function uploadAudioToCloudinary(fileBuffer, originalFileName) {
  console.log('☁️ Uploading audio to Cloudinary...');
  
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    console.warn('⚠️ Cloudinary credentials not configured, skipping upload');
    return null;
  }

  try {
    const formData = new FormData();
    formData.append('file', fileBuffer, { filename: originalFileName });
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', 'zuke/audio-transcriptions');
    formData.append('resource_type', 'auto');

    const response = await axios.post(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`,
      formData,
      {
        headers: formData.getHeaders(),
        timeout: 60000
      }
    );

    console.log('✅ Audio uploaded to Cloudinary');
    console.log('   Public ID:', response.data.public_id);
    console.log('   URL:', response.data.secure_url);

    return {
      public_id: response.data.public_id,
      url: response.data.secure_url,
      size: response.data.bytes,
      duration: response.data.duration
    };
  } catch (error) {
    console.error('❌ Cloudinary upload error:', error.message);
    throw new Error(`Cloudinary upload failed: ${error.message}`);
  }
}

// ========== FETCH AZURE OPENAI CONFIG ==========
async function getAzureOpenAIConfig() {
  return {
    endpoint: process.env.AZURE_OPENAI_ENDPOINT || 'https://zuke-make-automation.openai.azure.com/',
    apiKey: process.env.AZURE_OPENAI_API_KEY,
    deployment: process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-mini',
    whisperDeployment: process.env.AZURE_OPENAI_WHISPER_DEPLOYMENT || 'whisper',
    diarizationDeployment: process.env.AZURE_OPENAI_DIARIZATION_DEPLOYMENT || process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-mini'
  };
}

// ========== TRANSCRIBE AUDIO WITH AZURE OPENAI WHISPER ==========
async function transcribeAudioWithWhisper(audioBuffer, originalFileName, enableDiarization = false) {
  console.log('🎙️ Starting transcription with Whisper...');
  console.log(`📁 Audio file: ${originalFileName}`);
  console.log(`🎯 Diarization: ${enableDiarization ? 'Enabled' : 'Disabled'}`);

  try {
    const config = await getAzureOpenAIConfig();
    
    // Create form data for audio file upload
    const formData = new FormData();
    formData.append('file', audioBuffer, {
      filename: originalFileName,
      contentType: 'audio/wav'
    });

    // Prepare Whisper API request
    const whisperUrl = `${config.endpoint.replace(/\/$/, '')}/openai/deployments/${config.whisperDeployment}/audio/transcriptions?api-version=2024-08-01-preview`;

    console.log(`📤 Calling Azure Whisper API: ${whisperUrl}`);

    const transcriptionResponse = await axios.post(whisperUrl, formData, {
      headers: {
        ...formData.getHeaders(),
        'api-key': config.apiKey
      },
      timeout: 120000
    });

    const transcription = transcriptionResponse.data;
    
    console.log('✅ Transcription received');
    console.log(`📝 Text length: ${transcription.text?.length || 0} characters`);

    // If diarization is enabled, process speaker identification
    let diarizedSegments = null;
    if (enableDiarization && transcription.text) {
      diarizedSegments = await performDiarization(transcription.text, config);
    }

    // Return structured response
    const result = {
      text: transcription.text,
      language: transcription.language || 'en',
      duration: transcription.duration,
      segments: diarizedSegments || null
    };

    console.log('✅ Transcription complete');
    return result;

  } catch (error) {
    console.error('❌ Transcription error:', error.message);
    throw new Error(`Transcription failed: ${error.message}`);
  }
}

// ========== PERFORM DIARIZATION (Speaker Identification) ==========
async function performDiarization(text, config) {
  console.log('👥 Processing speaker identification (diarization)...');

  try {
    // Use Azure OpenAI to identify speakers and segment text
    const diarizationPrompt = `Analyze the following transcription and identify different speakers. 
Return a JSON object with an array of segments where each segment contains:
- speaker: speaker identifier (e.g., "Speaker 1", "Speaker 2")
- text: the text spoken by that speaker
- startTime: approximate start time (in seconds, if detectable from context)

Transcription:
${text}

IMPORTANT: Return ONLY valid JSON in this exact format:
{
  "segments": [
    {
      "speaker": "Speaker 1",
      "text": "text content",
      "startTime": 0
    }
  ]
}`;

    const diarizationUrl = `${config.endpoint.replace(/\/$/, '')}/openai/deployments/${config.diarizationDeployment}/chat/completions?api-version=2024-08-01-preview`;

    const diarizationResponse = await axios.post(diarizationUrl, {
      messages: [
        {
          role: "system",
          content: "You are an expert transcription analyst. Identify speakers in transcriptions and return valid JSON only."
        },
        {
          role: "user",
          content: diarizationPrompt
        }
      ],
      max_tokens: 2000,
      temperature: 0.5,
      response_format: { type: "json_object" }
    }, {
      headers: {
        'api-key': config.apiKey,
        'Content-Type': 'application/json'
      },
      timeout: 60000
    });

    const responseContent = diarizationResponse.data.choices[0].message.content;
    
    let diarizationResult;
    try {
      diarizationResult = JSON.parse(responseContent);
    } catch (e) {
      // Fallback: try to extract JSON from response
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        diarizationResult = JSON.parse(jsonMatch[0]);
      } else {
        throw e;
      }
    }

    console.log(`✅ Diarization complete: ${diarizationResult.segments?.length || 0} speaker segments identified`);
    return diarizationResult.segments || null;

  } catch (error) {
    console.warn('⚠️ Diarization processing failed:', error.message);
    console.warn('⚠️ Continuing without speaker identification');
    return null;
  }
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

// ========== GENERATE DOCX DOCUMENT ==========
async function generateDocxDocument(transcriptionResult, businessName, userEmail, fileName) {
  console.log('📄 Generating DOCX document...');
  
  try {
    const segments = transcriptionResult.segments || [];
    const docSections = [];

    // Title
    docSections.push(
      new Paragraph({
        text: 'Audio Transcription Report',
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      })
    );

    // Metadata
    docSections.push(
      new Paragraph({
        text: `Business: ${businessName}`,
        spacing: { after: 100 }
      }),
      new Paragraph({
        text: `User: ${userEmail}`,
        spacing: { after: 100 }
      }),
      new Paragraph({
        text: `Generated: ${new Date().toLocaleString()}`,
        spacing: { after: 100 }
      }),
      new Paragraph({
        text: `Language: ${transcriptionResult.language || 'Detected'}`,
        spacing: { after: 100 }
      }),
      new Paragraph({
        text: `Duration: ${transcriptionResult.duration || 'N/A'} seconds`,
        spacing: { after: 300 }
      })
    );

    // Full Transcription
    docSections.push(
      new Paragraph({
        text: 'Full Transcription',
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 200 }
      })
    );

    // If segments with speakers exist, show with speaker labels
    if (segments && segments.length > 0) {
      segments.forEach((segment, idx) => {
        const speakerLabel = segment.speaker ? `Speaker ${segment.speaker}:` : 'Transcription:';
        docSections.push(
          new Paragraph({
            text: speakerLabel,
            bold: true,
            spacing: { before: 100, after: 50 }
          }),
          new Paragraph({
            text: segment.text || '',
            spacing: { after: 100 },
            indent: { left: 360 }
          })
        );
      });
    } else if (transcriptionResult.text) {
      // Plain text transcription
      docSections.push(
        new Paragraph({
          text: transcriptionResult.text,
          spacing: { after: 100 }
        })
      );
    }

    // Create document
    const doc = new Document({
      sections: [
        {
          children: docSections
        }
      ]
    });

    // Generate buffer
    const buffer = await Packer.toBuffer(doc);
    console.log('✅ DOCX document generated successfully');
    
    return buffer;
  } catch (error) {
    console.error('❌ DOCX generation error:', error.message);
    throw new Error(`Document generation failed: ${error.message}`);
  }
}

// ========== SEND EMAIL WITH TRANSCRIPTION ==========
async function sendTranscriptionEmail(emailRecipient, emailSubject, transcriptionText, businessName, userEmail) {
  console.log(`📧 Sending transcription to ${emailRecipient}...`);

  try {
    // Format transcription for email
    let emailBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f55a00; color: white; padding: 20px; border-radius: 4px; margin-bottom: 20px; }
    .header h2 { margin: 0; }
    .content { background: #f9f9f9; padding: 20px; border-radius: 4px; border-left: 4px solid #f55a00; }
    .transcription { background: white; padding: 15px; border-radius: 4px; margin-top: 15px; white-space: pre-wrap; font-family: 'Courier New', monospace; font-size: 12px; max-height: 400px; overflow-y: auto; }
    .footer { margin-top: 20px; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>${emailSubject}</h2>
      <p>Audio Transcription from ${businessName || 'Zuke'}</p>
    </div>
    
    <div class="content">
      <p>Your audio transcription is ready:</p>
      
      <div class="transcription">
${transcriptionText}
      </div>
      
      <p style="margin-top: 20px; font-size: 12px; color: #666;">
        This email was generated by Zuke's Audio Transcription tool.<br>
        Date: ${new Date().toLocaleString()}
      </p>
    </div>
    
    <div class="footer">
      <p>Questions? Contact us at support@zuke.co.za</p>
    </div>
  </div>
</body>
</html>
    `;

    const emailPayload = {
      businessId: 'zuke-system',
      businessName: businessName || 'Zuke',
      userEmail: userEmail || emailRecipient,
      emailType: 'individual',
      recipient: {
        name: emailRecipient.split('@')[0],
        email: emailRecipient
      },
      subject: emailSubject,
      message: emailBody,
      timestamp: new Date().toISOString(),
      isHtml: true
    };

    const emailResponse = await axios.post(EMAIL_WEBHOOK, emailPayload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });

    console.log('✅ Email sent successfully');
    return true;

  } catch (error) {
    console.warn('⚠️ Email delivery failed:', error.message);
    console.warn('⚠️ Transcription completed but email could not be sent');
    return false;
  }
}

// ========== MAIN TRANSCRIPTION ROUTE ==========
router.post('/transcribe', upload.single('audio'), async (req, res) => {
  console.log('\n🎙️ ========== AUDIO TRANSCRIPTION REQUEST ==========');

  try {
    const {
      businessId,
      userEmail,
      enableDiarization,
      sendEmail,
      emailRecipient,
      emailSubject
    } = req.body;

    console.log('📦 Request Body:');
    console.log('  - businessId:', businessId);
    console.log('  - userEmail:', userEmail);
    console.log('  - enableDiarization:', enableDiarization);
    console.log('  - sendEmail:', sendEmail);
    console.log('  - Audio file:', req.file?.originalname);

    // Validate required fields
    if (!businessId || !userEmail || !req.file) {
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

    const businessName = business?.store_info?.name || 'Your Business';

    console.log(`\n✅ Business found: ${businessName}`);

    // Calculate cost
    const enableDiarizationBool = enableDiarization === 'true' || enableDiarization === true;
    const baseCost = PRICING.TRANSCRIPTION;
    const diarizationCost = enableDiarizationBool ? PRICING.DIARIZATION_ADDON : 0;
    const totalCost = baseCost + diarizationCost;

    console.log(`\n💰 Pricing:`);
    console.log(`  - Base transcription: R${PRICING.TRANSCRIPTION.toFixed(2)}`);
    if (enableDiarizationBool) {
      console.log(`  - Speaker diarization addon: R${PRICING.DIARIZATION_ADDON.toFixed(2)}`);
    }
    console.log(`  - Total cost: R${totalCost.toFixed(2)}`);

    // ✅ WALLET CHECK AND DEDUCTION
    console.log('\n💳 Processing wallet...');
    const walletResult = await deductCost(
      userEmail,
      businessId,
      totalCost,
      `Audio transcription${enableDiarizationBool ? ' with diarization' : ''}`
    );

    // ✅ UPLOAD AUDIO TO CLOUDINARY
    console.log('\n☁️ Uploading audio to Cloudinary...');
    const cloudinaryResult = await uploadAudioToCloudinary(req.file.buffer, req.file.originalname);

    // ✅ PERFORM TRANSCRIPTION
    console.log('\n🎙️ Processing audio...');
    const transcriptionResult = await transcribeAudioWithWhisper(req.file.buffer, req.file.originalname, enableDiarizationBool);

    // Create preview (first 300 chars or first few speaker segments)
    let preview;
    if (transcriptionResult.segments && transcriptionResult.segments.length > 0) {
      // Show first 3 segments in preview
      preview = {
        segments: transcriptionResult.segments.slice(0, 3),
        total_segments: transcriptionResult.segments.length
      };
    } else {
      // Plain text preview
      preview = transcriptionResult.text.substring(0, 300) + (transcriptionResult.text.length > 300 ? '...' : '');
    }

    console.log('\n📤 Response prepared');

    // ✅ SEND EMAIL IF REQUESTED
    let emailSent = false;
    if (sendEmail === 'true' && emailRecipient && emailSubject) {
      console.log('\n📧 Email delivery requested');
      
      const fullTranscriptionText = transcriptionResult.segments
        ? transcriptionResult.segments.map(s => `${s.speaker}: ${s.text}`).join('\n\n')
        : transcriptionResult.text;

      emailSent = await sendTranscriptionEmail(
        emailRecipient,
        emailSubject,
        fullTranscriptionText,
        businessName,
        userEmail
      );
    }

    // ✅ STORE TRANSCRIPTION IN DATABASE
    console.log('\n💾 Storing transcription...');
    const transcriptionRecord = {
      businessId: new ObjectId(businessId),
      userEmail,
      businessName,
      audioCloudinary: cloudinaryResult ? {
        public_id: cloudinaryResult.public_id,
        url: cloudinaryResult.url,
        size: cloudinaryResult.size
      } : null,
      audioFileName: req.file.originalname,
      audioSize: req.file.size,
      enableDiarization: enableDiarizationBool,
      language: transcriptionResult.language,
      duration: transcriptionResult.duration,
      transcriptionPreview: typeof preview === 'string' ? preview : JSON.stringify(preview),
      fullTranscription: JSON.stringify({
        text: transcriptionResult.text,
        segments: transcriptionResult.segments
      }),
      cost: totalCost,
      charged: true,
      emailSent: emailSent,
      emailRecipient: sendEmail === 'true' ? emailRecipient : null,
      status: 'completed',
      created_at: new Date()
    };

    await db.collection('audio_transcriptions').insertOne(transcriptionRecord);
    console.log('✅ Transcription stored in database');

    // ✅ RETURN SUCCESS RESPONSE
    const responseData = {
      success: true,
      message: 'Audio transcription completed successfully',
      preview: preview,
      fullTranscription: {
        text: transcriptionResult.text,
        segments: transcriptionResult.segments
      },
      metadata: {
        language: transcriptionResult.language,
        duration: transcriptionResult.duration,
        hasDiarization: enableDiarizationBool && !!transcriptionResult.segments
      },
      costs: {
        transcription: PRICING.TRANSCRIPTION,
        diarization: enableDiarizationBool ? PRICING.DIARIZATION_ADDON : 0,
        total: totalCost,
        formatted: `R${totalCost.toFixed(2)}`,
        breakdown: enableDiarizationBool 
          ? `R${PRICING.TRANSCRIPTION.toFixed(2)} + R${PRICING.DIARIZATION_ADDON.toFixed(2)} (diarization)`
          : `R${PRICING.TRANSCRIPTION.toFixed(2)}`
      },
      emailSent: emailSent,
      newBalance: walletResult.new_balance,
      formattedBalance: walletResult.formatted_balance
    };

    console.log('\n✅ SUCCESS - Returning response\n');
    
    // Clean up audio file
    try {
      fs.unlinkSync(audioFilePath);
      console.log('🗑️ Temporary audio file cleaned up');
    } catch (e) {
      console.warn('⚠️ Could not delete temporary file:', e.message);
    }

    return res.json(responseData);

  } catch (error) {
    console.error('\n❌ CRITICAL ERROR:', error.message);
    console.error('❌ Stack:', error.stack);

    // Clean up audio file
    if (audioFilePath) {
      try {
        fs.unlinkSync(audioFilePath);
      } catch (e) {
        console.warn('⚠️ Could not delete temporary file:', e.message);
      }
    }

    // Handle specific error types
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

// ========== UPLOAD TRANSCRIPTION FILE TO CLOUDINARY ==========
async function uploadTranscriptionToCloudinary(fileBuffer, fileName, format) {
  console.log('☁️ Uploading transcription file to Cloudinary...');
  
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    console.warn('⚠️ Cloudinary credentials not configured, skipping upload');
    return null;
  }

  try {
    const formData = new FormData();
    
    // Determine MIME type based on format
    let mimeType = 'text/plain';
    if (format === 'docx') {
      mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else if (format === 'json') {
      mimeType = 'application/json';
    }

    formData.append('file', fileBuffer, { 
      filename: `${fileName}.${format}`,
      contentType: mimeType
    });
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', 'zuke/transcriptions');
    formData.append('resource_type', 'auto');

    const response = await axios.post(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`,
      formData,
      {
        headers: formData.getHeaders(),
        timeout: 60000
      }
    );

    console.log('✅ Transcription file uploaded to Cloudinary');
    console.log('   Public ID:', response.data.public_id);
    console.log('   URL:', response.data.secure_url);

    return {
      public_id: response.data.public_id,
      url: response.data.secure_url,
      size: response.data.bytes,
      type: format
    };
  } catch (error) {
    console.error('❌ Cloudinary upload error:', error.message);
    throw new Error(`Cloudinary upload failed: ${error.message}`);
  }
}

// ========== DOWNLOAD TRANSCRIPTION IN VARIOUS FORMATS ==========
router.post('/download', express.json({ limit: '50mb' }), async (req, res) => {
  try {
    console.log('📥 Download request received');
    console.log('   Format:', req.body.format);
    console.log('   Has transcription:', !!req.body.transcription);
    
    const { format, transcription, businessName, userEmail, fileName } = req.body;

    if (!format || !transcription) {
      console.error('❌ Missing required fields:', { format: !!format, transcription: !!transcription });
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: format, transcription'
      });
    }

    console.log(`📥 Generating ${format.toUpperCase()} download...`);

    let content, contentType, extension;

    switch (format.toLowerCase()) {
      case 'docx':
        try {
          content = await generateDocxDocument(
            transcription,
            businessName || 'Transcription',
            userEmail || 'user@example.com',
            fileName || 'transcription'
          );
          contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          extension = 'docx';
        } catch (error) {
          return res.status(500).json({
            success: false,
            error: `DOCX generation failed: ${error.message}`
          });
        }
        break;

      case 'txt':
        // Plain text format
        if (Array.isArray(transcription.segments) && transcription.segments.length > 0) {
          content = transcription.segments
            .map(seg => `${seg.speaker ? `Speaker ${seg.speaker}: ` : ''}${seg.text}`)
            .join('\n\n');
        } else if (typeof transcription === 'string') {
          content = transcription;
        } else if (transcription.text) {
          content = transcription.text;
        }
        contentType = 'text/plain';
        extension = 'txt';
        content = Buffer.from(content, 'utf-8');
        break;

      case 'json':
        // JSON format
        content = JSON.stringify(transcription, null, 2);
        contentType = 'application/json';
        extension = 'json';
        content = Buffer.from(content, 'utf-8');
        break;

      default:
        return res.status(400).json({
          success: false,
          error: `Unsupported format: ${format}. Supported formats: txt, json, docx`
        });
    }

    // Ensure content is a Buffer
    if (!Buffer.isBuffer(content) && typeof content === 'string') {
      content = Buffer.from(content, 'utf-8');
    }

    // ☁️ UPLOAD TO CLOUDINARY
    const timestamp = Date.now();
    const fileNameWithoutExt = `transcription_${timestamp}`;
    
    console.log('\n☁️ Uploading file to Cloudinary...');
    const cloudinaryResult = await uploadTranscriptionToCloudinary(
      content,
      fileNameWithoutExt,
      extension
    );

    if (!cloudinaryResult) {
      // If Cloudinary fails, fall back to direct download
      console.warn('⚠️ Cloudinary upload failed, falling back to direct download');
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileNameWithoutExt}.${extension}"`);
      res.send(content);
      console.log(`✅ ${extension.toUpperCase()} file sent successfully (local fallback)`);
      return;
    }

    // ✅ RETURN CLOUDINARY URL AND FILE INFO
    const responseData = {
      success: true,
      message: 'Transcription file ready for download',
      file: {
        name: `${fileNameWithoutExt}.${extension}`,
        format: extension,
        type: contentType,
        cloudinaryUrl: cloudinaryResult.url,
        cloudinaryPublicId: cloudinaryResult.public_id,
        size: cloudinaryResult.size
      },
      download: {
        url: cloudinaryResult.url,
        type: 'cloudinary'
      }
    };

    console.log(`✅ ${extension.toUpperCase()} file uploaded to Cloudinary and ready for download`);
    res.json(responseData);

  } catch (error) {
    console.error('❌ Download error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Download failed'
    });
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
        description: 'Audio transcription with Azure OpenAI Whisper'
      },
      diarizationAddon: {
        amount: PRICING.DIARIZATION_ADDON,
        formatted: `R${PRICING.DIARIZATION_ADDON.toFixed(2)}`,
        description: 'Speaker identification (diarization)'
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
        emailSent: t.emailSent,
        emailRecipient: t.emailRecipient,
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

module.exports = router;
