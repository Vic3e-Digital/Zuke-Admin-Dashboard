const express = require('express');
const router = express.Router();
const multer = require('multer');
const fetch = require('node-fetch');
const FormData = require('form-data');

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB per file (per Azure docs)
    files: 10
  },
  fileFilter: (req, file, cb) => {
    // Only allow PNG and JPG per Azure docs
    if (file.mimetype === 'image/png' || file.mimetype === 'image/jpeg') {
      cb(null, true);
    } else {
      cb(new Error('Only PNG and JPG files are allowed'));
    }
  }
});

/**
 * Multi-Image Generation Endpoint
 * Uses GPT-image-1 with multiple reference images
 * POST /api/image-generation/multi-image
 */
router.post('/multi-image', upload.array('images', 10), async (req, res) => {
  try {
    const { prompt, size, quality } = req.body;
    const files = req.files;

    // Validation
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one image is required'
      });
    }

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required'
      });
    }

    console.log(`[Multi-Image] Generating with ${files.length} images`);
    console.log(`[Multi-Image] Prompt: "${prompt.substring(0, 100)}..."`);

    const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const azureApiKey = process.env.AZURE_OPENAI_API_KEY;
    
    if (!azureEndpoint || !azureApiKey) {
      return res.status(500).json({
        success: false,
        error: 'Azure OpenAI configuration missing'
      });
    }

    const deployment = 'gpt-image-1';
    const apiVersion = '2025-04-01-preview';
    
    // Use /images/edits endpoint for image editing with references
    const url = `${azureEndpoint}openai/deployments/${deployment}/images/edits?api-version=${apiVersion}`;

    console.log(`[Multi-Image] URL: ${url}`);

    // Build multipart form data using form-data package
    const formData = new FormData();
    formData.append('prompt', prompt);
    formData.append('n', '1');
    formData.append('size', size || '1024x1024');
    formData.append('quality', quality || 'high');

    // Method 1: Add images using array syntax (image[])
    // Based on documentation: -F "image[]=@beach.png"
    files.forEach((file, index) => {
      formData.append('image[]', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype
      });
      console.log(`[Multi-Image] Added image[${index}]: ${file.originalname}`);
    });

    // Alternative Method 2: If array syntax doesn't work,
    // use single image with the first file
    // Uncomment below and comment out the forEach above:
    /*
    formData.append('image', files[0].buffer, {
      filename: files[0].originalname,
      contentType: files[0].mimetype
    });
    */

    console.log(`[Multi-Image] Calling Azure OpenAI...`);

    const azureResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'api-key': azureApiKey,
        ...formData.getHeaders() // Important: gets correct Content-Type with boundary
      },
      body: formData
    });

    if (!azureResponse.ok) {
      const errorText = await azureResponse.text();
      console.error('[Multi-Image] Azure OpenAI error:', azureResponse.status, errorText);
      
      // Parse error for better message
      let errorDetails;
      try {
        errorDetails = JSON.parse(errorText);
      } catch {
        errorDetails = errorText;
      }
      
      return res.status(azureResponse.status).json({
        success: false,
        error: `Azure OpenAI failed: ${azureResponse.status}`,
        details: errorDetails
      });
    }

    const azureData = await azureResponse.json();
    console.log('[Multi-Image] Azure OpenAI response received');

    // GPT-image-1 always returns base64 (no URL option per docs)
    let imageData = null;
    if (azureData.data && azureData.data[0] && azureData.data[0].b64_json) {
      imageData = azureData.data[0].b64_json;
      console.log('[Multi-Image] Received base64 image data');
    }

    if (!imageData) {
      console.error('[Multi-Image] Unexpected response format:', JSON.stringify(azureData));
      throw new Error('No image data in Azure response');
    }
    
    console.log(`[Multi-Image] ✅ Generation successful! Image size: ${(imageData.length / 1024).toFixed(2)}KB`);

    res.json({
      success: true,
      imageData: imageData,
      model: 'gpt-image-1',
      prompt: prompt,
      imageCount: files.length
    });

  } catch (error) {
    console.error('[Multi-Image] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate image'
    });
  }
});

module.exports = router;