const express = require('express');
const router = express.Router();

// POST /api/webhook/service-created
router.post('/service-created', async (req, res) => {
  try {
    console.log('🔗 ===== SERVICE WEBHOOK ENDPOINT HIT =====');
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
    
    const serviceData = req.body;
    
    // Check if body is empty
    if (!serviceData || Object.keys(serviceData).length === 0) {
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
    
    // Validate service data structure
    if (!serviceData.serviceData) {
      console.error('❌ Missing serviceData object');
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid payload structure - serviceData missing'
      });
    }
    
    // Log service details
    console.log('🎯 Service Name:', serviceData.serviceData.name);
    console.log('💰 Pricing Options:', serviceData.serviceData.pricing?.length || 0);
    console.log('📍 Delivery Methods:', serviceData.serviceData.deliveryMethods?.join(', ') || 'none');
    console.log('🖼️ Image IDs:', serviceData.serviceData.wordpressImageIds?.length || 0);
    console.log('🤖 AI Models Used:', JSON.stringify(serviceData.serviceData.aiModelsUsed));
    console.log('💵 Total Cost:', `R${serviceData.generationCosts?.total || 0}`);
    
    // Get webhook URL (try service-specific first, then fall back to general)
    const webhookUrl = process.env.SERVICE_WEBHOOK_URL || 
                       process.env.PRODUCT_WEBHOOK_URL || 
                       serviceData.webhookUrl;
    
    if (!webhookUrl) {
      console.warn('⚠️ No webhook URL configured');
      return res.json({ 
        success: true, 
        message: 'No webhook configured - data received but not forwarded',
        dataReceived: true,
        serviceName: serviceData.serviceData?.name,
        imagesUploaded: serviceData.serviceData?.wordpressImageIds?.length || 0
      });
    }
    
    console.log('📤 Forwarding to webhook:', webhookUrl);
    
    // Forward to external webhook (n8n)
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'Zuke-Service-Webhook/1.0',
        'X-Webhook-Type': 'service-created'
      },
      body: JSON.stringify(serviceData)
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
    
    console.log('✅ Service webhook forwarded successfully');
    console.log('📊 Response:', JSON.stringify(responseData).substring(0, 200));
    
    res.json({ 
      success: true, 
      message: 'Service webhook sent successfully',
      serviceName: serviceData.serviceData.name,
      imagesUploaded: serviceData.serviceData.wordpressImageIds?.length || 0,
      webhookResponse: responseData
    });
    
  } catch (error) {
    console.error('❌ Service webhook error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;