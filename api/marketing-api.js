const express = require('express');
const router = express.Router();

// External webhook endpoints
const WEBHOOKS = {
  'find-leads': 'https://aigents.southafricanorth.azurecontainer.io/webhook/7314886d-74e6-405a-a95a-dda82b490327',
  'enrich-leads': 'https://aigents.southafricanorth.azurecontainer.io/webhook/leads-enrichment',
  'email-leads': 'https://aigent-staging.zuke.co.za/webhook/leads-email'
};

/**
 * POST /api/marketing/find-leads
 * Proxy for finding leads
 */
router.post('/find-leads', async (req, res) => {
  try {
    const { sheetsUrl, targetDescription, userEmail, businessId } = req.body;

    if (!sheetsUrl || !userEmail || !businessId) {
      return res.status(400).json({
        error: 'Missing required fields: sheetsUrl, userEmail, businessId'
      });
    }

    const payload = {
      sheetsUrl,
      targetDescription,
      userEmail,
      businessId,
      timestamp: new Date().toISOString()
    };

    console.log('📤 Forwarding find-leads request to:', WEBHOOKS['find-leads']);
    console.log('📦 Payload:', payload);

    const response = await fetch(WEBHOOKS['find-leads'], {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ Webhook error:', result);
      return res.status(response.status).json(result);
    }

    console.log('✅ Webhook success:', result);
    res.json(result);

  } catch (error) {
    console.error('❌ Error in find-leads endpoint:', error);
    res.status(500).json({
      error: error.message || 'Failed to process find-leads request'
    });
  }
});

/**
 * POST /api/marketing/enrich-leads
 * Proxy for enriching leads
 */
router.post('/enrich-leads', async (req, res) => {
  try {
    const { sheetsUrl, enrichmentFields, userEmail, businessId } = req.body;

    if (!sheetsUrl || !userEmail || !businessId) {
      return res.status(400).json({
        error: 'Missing required fields: sheetsUrl, userEmail, businessId'
      });
    }

    const payload = {
      sheetsUrl,
      enrichmentFields,
      userEmail,
      businessId,
      timestamp: new Date().toISOString()
    };

    console.log('📤 Forwarding enrich-leads request to:', WEBHOOKS['enrich-leads']);
    console.log('📦 Payload:', payload);

    const response = await fetch(WEBHOOKS['enrich-leads'], {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ Webhook error:', result);
      return res.status(response.status).json(result);
    }

    console.log('✅ Webhook success:', result);
    res.json(result);

  } catch (error) {
    console.error('❌ Error in enrich-leads endpoint:', error);
    res.status(500).json({
      error: error.message || 'Failed to process enrich-leads request'
    });
  }
});

/**
 * POST /api/marketing/email-leads
 * Proxy for emailing leads
 */
router.post('/email-leads', async (req, res) => {
  try {
    const { sheetsUrl, emailSubject, emailTemplate, userEmail, businessId } = req.body;

    if (!sheetsUrl || !emailSubject || !userEmail || !businessId) {
      return res.status(400).json({
        error: 'Missing required fields: sheetsUrl, emailSubject, userEmail, businessId'
      });
    }

    const payload = {
      sheetsUrl,
      emailSubject,
      emailTemplate,
      userEmail,
      businessId,
      timestamp: new Date().toISOString()
    };

    console.log('📤 Forwarding email-leads request to:', WEBHOOKS['email-leads']);
    console.log('📦 Payload:', payload);

    const response = await fetch(WEBHOOKS['email-leads'], {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ Webhook error:', result);
      return res.status(response.status).json(result);
    }

    console.log('✅ Webhook success:', result);
    res.json(result);

  } catch (error) {
    console.error('❌ Error in email-leads endpoint:', error);
    res.status(500).json({
      error: error.message || 'Failed to process email-leads request'
    });
  }
});

module.exports = router;
