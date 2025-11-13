const express = require('express');
const router = express.Router();

// POST /api/webhook/product-created
router.post('/product-created', async (req, res) => {
  try {
    console.log('🔗 ===== WEBHOOK ENDPOINT HIT =====');
    console.log('📦 Content-Type:', req.headers['content-type']);
    console.log('📦 Content-Length:', req.headers['content-length']);
    console.log('📦 Body type:', typeof req.body);
    console.log('📦 Body is empty?', Object.keys(req.body || {}).length === 0);
    
    if (req.body && Object.keys(req.body).length > 0) {
      console.log('📦 Body keys:', Object.keys(req.body));
      console.log('📦 Full body:', JSON.stringify(req.body, null, 2).substring(0, 1000) + '...');
    } else {
      console.error('❌ EMPTY BODY RECEIVED!');
      console.log('Raw body:', req.body);
    }
    
    const productData = req.body;
    
    // Check if body is empty
    if (!productData || Object.keys(productData).length === 0) {
      console.error('❌ Empty payload - returning 400');
      return res.status(400).json({ 
        success: false, 
        error: 'No data provided',
        debug: {
          contentType: req.headers['content-type'],
          bodyType: typeof req.body,
          bodyKeys: Object.keys(req.body || {}),
          bodyLength: req.headers['content-length']
        }
      });
    }
    
    // Get webhook URL
    const webhookUrl = process.env.PRODUCT_WEBHOOK_URL || productData.webhookUrl;
    
    if (!webhookUrl) {
      console.warn('⚠️ No webhook URL configured');
      return res.json({ 
        success: true, 
        message: 'No webhook configured - data received but not forwarded',
        dataReceived: true,
        productName: productData.productData?.name
      });
    }
    
    console.log('📤 Forwarding to webhook:', webhookUrl);
    
    // Forward to external webhook (n8n)
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'Zuke-Product-Webhook/1.0'
      },
      body: JSON.stringify(productData)
    });
    
    console.log('📥 n8n responded with status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ n8n error:', errorText);
      throw new Error(`Webhook failed: ${response.status} - ${errorText}`);
    }
    
    let responseData;
    try {
      responseData = await response.json();
    } catch (e) {
      responseData = { message: 'Webhook accepted' };
    }
    
    console.log('✅ Webhook forwarded successfully');
    
    res.json({ 
      success: true, 
      message: 'Webhook sent successfully',
      webhookResponse: responseData
    });
    
  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: error.stack
    });
  }
});

module.exports = router;