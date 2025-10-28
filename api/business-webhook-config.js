// api/business-webhook-config.js
const express = require('express');
const router = express.Router();
// const fetch = require('node-fetch');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));


// POST proxy to forward business management actions to n8n webhook
router.post('/', async (req, res) => {
  try {
    const webhookUrl = process.env.BUSINESS_MANAGEMENT_WEBHOOK_URL;
    
    if (!webhookUrl) {
      return res.status(500).json({ 
        success: false, 
        message: 'Business management webhook URL not configured' 
      });
    }

    console.log('[Business Management] Forwarding action:', req.body.action);

    // Forward the request to n8n webhook
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Business Management] Webhook error:', errorText);
      throw new Error(`Webhook returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    console.log('[Business Management] Success:', req.body.action);

    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('[Business Management] Error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

module.exports = router;