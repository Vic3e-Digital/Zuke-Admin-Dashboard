const express = require('express');
const router = express.Router();

// External webhook endpoints
const WEBHOOKS = {
  'find-leads': 'https://aigents.southafricanorth.azurecontainer.io/webhook/7314886d-74e6-405a-a95a-dda82b490327',
  'enrich-leads': 'https://aigents.southafricanorth.azurecontainer.io/webhook/leads-enrichment',
  'email-leads': 'https://aigents.southafricanorth.azurecontainer.io/webhook/4aa556bb-de21-4d0f-b396-493bcef81500-email-leads-v3'
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
 * POST /api/marketing/send-one-email
 * Send a single email using business Mailgun configuration
 */
router.post('/send-one-email', async (req, res) => {
  try {
    const { businessId, recipientEmail, subject, body, mailgunConfig } = req.body;

    if (!businessId || !recipientEmail || !subject || !body) {
      return res.status(400).json({
        error: 'Missing required fields: businessId, recipientEmail, subject, body'
      });
    }

    if (!mailgunConfig || !mailgunConfig.api_key || !mailgunConfig.api_domain || !mailgunConfig.from_email) {
      return res.status(400).json({
        error: 'Invalid Mailgun configuration. Please configure Mailgun in Settings.'
      });
    }

    console.log('📧 Sending one-to-one email via Mailgun...');

    // Import Mailgun
    const mailgun = require('mailgun.js');
    const FormData = require('form-data');
    const mg = new mailgun(FormData);

    // Initialize client with business-specific config
    const client = mg.client({ 
      username: 'api', 
      key: mailgunConfig.api_key,
      url: mailgunConfig.api_domain 
    });

    const messageData = {
      from: mailgunConfig.from_email,
      to: recipientEmail,
      subject: subject,
      text: body,
      html: body.replace(/\n/g, '<br>')
    };

    const result = await client.messages.create(mailgunConfig.email_domain, messageData);

    console.log('✅ Email sent successfully:', result);

    res.json({
      success: true,
      message: 'Email sent successfully',
      messageId: result.id
    });

  } catch (error) {
    console.error('❌ Error sending email:', error);
    res.status(500).json({
      error: error.message || 'Failed to send email'
    });
  }
});

/**
 * POST /api/marketing/email-leads
 * Proxy for bulk emailing leads (sends to webhook with Mailgun config and business case)
 */
router.post('/email-leads', async (req, res) => {
  try {
    const { sheetsUrl, emailSubject, emailTemplate, userEmail, businessId, mailgunConfig, emailSignature, aiEnhancement } = req.body;

    if (!sheetsUrl || !emailSubject || !userEmail || !businessId) {
      return res.status(400).json({
        error: 'Missing required fields: sheetsUrl, emailSubject, userEmail, businessId'
      });
    }

    if (!mailgunConfig || !mailgunConfig.api_key) {
      return res.status(400).json({
        error: 'Mailgun configuration is required for bulk email sending'
      });
    }

    // Fetch business case from database
    const { ObjectId } = require('mongodb');
    const db = req.app.locals.db;
    
    let businessCase = {};
    let businessInfo = {};
    
    if (db) {
      try {
        // Get business case from business_cases collection
        const existingCase = await db.collection('business_cases').findOne({
          business_id: businessId
        });

        if (existingCase) {
          businessCase = existingCase.business_case || {};
          console.log('✅ Found business case from business_cases collection');
        } else {
          // Fallback to initial_business_case in store_submissions
          const submission = await db.collection('store_submissions').findOne({
            _id: new ObjectId(businessId)
          });

          if (submission) {
            businessCase = submission.initial_business_case || {};
            businessInfo = {
              name: submission.store_info?.name || '',
              description: submission.store_info?.description || '',
              industry: submission.store_info?.industry || ''
            };
            console.log('✅ Found business case from store_submissions');
          }
        }
      } catch (dbError) {
        console.error('⚠️ Error fetching business case:', dbError);
        // Continue without business case
      }
    }

    const payload = {
      sheetsUrl,
      emailSubject,
      emailTemplate,
      userEmail,
      businessId,
      mailgunConfig: {
        api_key: mailgunConfig.api_key,
        api_domain: mailgunConfig.api_domain,
        email_domain: mailgunConfig.email_domain,
        from_email: mailgunConfig.from_email
      },
      emailSignature: emailSignature || null,
      aiEnhancement: aiEnhancement || { enabled: false, level: 0, instructions: '' },
      businessCase: businessCase,
      businessInfo: businessInfo,
      timestamp: new Date().toISOString()
    };

    console.log('📤 Forwarding bulk email-leads request to:', WEBHOOKS['email-leads']);
    console.log('📦 Payload (without sensitive data):', {
      ...payload,
      mailgunConfig: { ...payload.mailgunConfig, api_key: '***' },
      businessCase: businessCase ? 'Included' : 'Not found',
      emailSignature: emailSignature ? 'Included' : 'Not configured',
      aiEnhancement: aiEnhancement?.enabled ? `Enabled (Level: ${aiEnhancement.level})` : 'Disabled'
    });

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
