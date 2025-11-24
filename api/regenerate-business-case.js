const express = require('express');
const router = express.Router();
const { connectToDatabase } = require('../lib/mongodb');
const { ObjectId } = require('mongodb');
const axios = require('axios');

// Webhook URL - you can make this configurable
const WEBHOOK_URL = 'https://aigents.southafricanorth.azurecontainer.io/webhook/business-case-021f635f-80d0-49f0-b68a-89339c6e6553-webhook';

router.post('/', async (req, res) => {
  console.log('🔄 Regenerate Business Case Request:', req.body);
  
  try {
    const { businessId, userEmail } = req.body;
    
    if (!businessId || !userEmail) {
      return res.status(400).json({
        success: false,
        error: 'Missing businessId or userEmail'
      });
    }
    
    // Fetch business from MongoDB
    const { db } = await connectToDatabase();
    const collection = db.collection('store_submissions');
    
    const business = await collection.findOne({
      _id: new ObjectId(businessId),
      'personal_info.email': userEmail
    });
    
    if (!business) {
      return res.status(404).json({
        success: false,
        error: 'Business not found'
      });
    }
    
    console.log('✅ Business found:', business.store_info?.name);
    
    // Format data for webhook (matching your n8n structure)
    const webhookPayload = {
      store_id: business._id.toString(),
      store_name: business.store_info?.name || '',
      store_slug: business.store_info?.slug || '',
      owner: {
        first_name: business.personal_info?.first_name || '',
        last_name: business.personal_info?.last_name || '',
        email: business.personal_info?.email || '',
        phone: business.personal_info?.phone || ''
      },
      store_details: {
        category: business.store_info?.category || [],
        description: business.store_info?.description || '',
        address: business.store_info?.address || '',
        website: business.store_info?.website || ''
      },
      media: {
        logo: business.media_files?.store_logo || business.marketplace_info?.store_logo || '',
        banner: business.media_files?.store_banner || business.marketplace_info?.store_banner || ''
      },
      social_media: {
        instagram: business.social_media?.instagram || business.marketplace_info?.social_media?.instagram || null,
        twitter: business.social_media?.twitter || business.marketplace_info?.social_media?.twitter || null,
        tiktok: business.social_media?.tiktok || business.marketplace_info?.social_media?.tiktok || null,
        facebook: business.social_media?.facebook || business.marketplace_info?.social_media?.facebook || null,
        linkedin: business.social_media?.linkedin || business.marketplace_info?.social_media?.linkedin || null
      },
      metadata: {
        form_source: business.form_metadata?.source || 'Regeneration Request',
        form_version: business.form_metadata?.version || '2.0',
        submitted_at: new Date().toISOString(),
        processing_status: 'regenerating',
        created_at: business.processing_status?.created_at || new Date().toISOString()
      }
    };
    
    console.log('📤 Sending to webhook:', WEBHOOK_URL);
    console.log('📦 Payload preview:', {
      store_name: webhookPayload.store_name,
      owner: webhookPayload.owner.email,
      has_description: !!webhookPayload.store_details.description
    });
    
    // Send to webhook
    const webhookResponse = await axios.post(WEBHOOK_URL, webhookPayload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    });
    
    console.log('✅ Webhook response:', webhookResponse.status);
    
    // Update processing status in MongoDB
    await collection.updateOne(
      { _id: new ObjectId(businessId) },
      {
        $set: {
          'processing_status.status': 'regenerating',
          'processing_status.regenerated_at': new Date().toISOString(),
          'processing_status.updated_at': new Date().toISOString()
        }
      }
    );
    
    res.json({
      success: true,
      message: 'Business case regeneration initiated successfully',
      webhook_status: webhookResponse.status,
      business_name: webhookPayload.store_name
    });
    
  } catch (error) {
    console.error('❌ Regeneration error:', error);
    
    // More detailed error message
    let errorMessage = 'Failed to regenerate business case';
    if (error.response) {
      errorMessage += `: Webhook returned ${error.response.status}`;
      console.error('Webhook error response:', error.response.data);
    } else if (error.code === 'ECONNABORTED') {
      errorMessage += ': Webhook timeout';
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage += ': Could not connect to webhook';
    }
    
    res.status(500).json({
      success: false,
      error: errorMessage,
      details: error.message
    });
  }
});

module.exports = router;