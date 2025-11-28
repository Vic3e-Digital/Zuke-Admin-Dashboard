const express = require('express');
const router = express.Router();
const axios = require('axios');

const N8N_WEBHOOK_URL = 'https://aigents.southafricanorth.azurecontainer.io/webhook/7314886d-74e6-405a-a95a-dda82b490327';

/**
 * Proxy endpoint for lead generation webhook
 * This avoids CORS issues by making the request from the server
 */
router.post('/generate', async (req, res) => {
  try {
    console.log('📤 Proxying lead generation request to n8n...');
    console.log('Request body:', req.body);

    // Forward the request to n8n webhook
    const response = await axios.post(N8N_WEBHOOK_URL, req.body, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 60000 // 60 second timeout
    });

    console.log('✅ n8n response received:', response.status);
    
    // Return the n8n response to the client
    res.json(response.data);

  } catch (error) {
    console.error('❌ Error proxying to n8n:', error.message);
    
    if (error.response) {
      // n8n returned an error response
      console.error('n8n error response:', error.response.data);
      res.status(error.response.status).json({
        success: false,
        error: error.response.data.error || 'Lead generation failed',
        details: error.response.data
      });
    } else if (error.request) {
      // Request was made but no response received
      console.error('No response from n8n');
      res.status(504).json({
        success: false,
        error: 'No response from lead generation service'
      });
    } else {
      // Error setting up the request
      res.status(500).json({
        success: false,
        error: 'Failed to initiate lead generation'
      });
    }
  }
});

module.exports = router;
