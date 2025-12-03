const express = require('express');
const router = express.Router();
const axios = require('axios');
const { ObjectId } = require('mongodb');
const { getDatabase } = require('../lib/mongodb');

const N8N_WEBHOOK_URL = 'https://aigents.southafricanorth.azurecontainer.io/webhook/7314886d-74e6-405a-a95a-dda82b490327';

/**
 * Proxy endpoint for lead generation webhook
 * This avoids CORS issues by making the request from the server
 * Also enriches the payload with Apollo and Mailgun configuration
 */
router.post('/generate', async (req, res) => {
  try {
    console.log('📤 Proxying lead generation request to n8n...');
    console.log('Request body:', req.body);

    const { businessId } = req.body;

    // Enrich payload with Apollo and Mailgun config from business settings
    let enrichedPayload = { ...req.body };

    if (businessId) {
      try {
        const db = await getDatabase();
        const business = await db.collection('store_submissions').findOne({
          _id: new ObjectId(businessId)
        });

        if (business?.automation_settings) {
          const { apollo_config, mailgun_config } = business.automation_settings;

          // Add Apollo config if enabled
          if (apollo_config?.enabled && apollo_config?.api_key) {
            enrichedPayload.apollo = {
              api_key: apollo_config.api_key,
              enabled: true
            };
            console.log('✅ Apollo config added to payload');
          }

          // Add Mailgun config if enabled
          if (mailgun_config?.enabled && mailgun_config?.api_key) {
            enrichedPayload.mailgun = {
              api_key: mailgun_config.api_key,
              api_domain: mailgun_config.api_domain,
              email_domain: mailgun_config.email_domain,
              from_email: mailgun_config.from_email,
              enabled: true
            };
            console.log('✅ Mailgun config added to payload');
          }
        }
      } catch (dbError) {
        console.warn('⚠️ Could not fetch business settings:', dbError.message);
        // Continue without enrichment
      }
    }

    console.log('📦 Enriched payload:', JSON.stringify(enrichedPayload, null, 2));

    // Forward the enriched request to n8n webhook
    const response = await axios.post(N8N_WEBHOOK_URL, enrichedPayload, {
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
