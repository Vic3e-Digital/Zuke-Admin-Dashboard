// api/send-email-api.js
const express = require('express');
const router = express.Router();
const { getDatabase } = require('../lib/mongodb');
const { ObjectId } = require('mongodb');
const axios = require('axios');

const EMAIL_WEBHOOK = 'https://aigents.southafricanorth.azurecontainer.io/webhook/send-smart-email';
const N8N_WALLET_WEBHOOK = process.env.N8N_WALLET_WEBHOOK_URL;

// Pricing
const PRICING = {
  individual: 5,    // R5.00 per individual email
  bulkPerEmail: 3   // R3.00 per email in bulk
};

// ========== SEND EMAIL ROUTE ==========
router.post('/send', async (req, res) => {
  console.log('📨 ========== EMAIL API REQUEST ==========');
  console.log('📦 Request Body:', JSON.stringify(req.body, null, 2));
  
  try {
    const {
      businessId,
      userEmail,
      emailType,
      recipient,
      sheetsUrl,
      subject,
      message,
      totalCost,
      description
    } = req.body;

    // Log what we received
    console.log('🔍 Parsed Fields:');
    console.log('  - businessId:', businessId);
    console.log('  - userEmail:', userEmail);
    console.log('  - emailType:', emailType);
    console.log('  - subject:', subject ? '✓' : '✗');
    console.log('  - message:', message ? '✓' : '✗');
    console.log('  - totalCost:', totalCost);

    // Validate required fields
    if (!businessId) {
      console.error('❌ Missing: businessId');
      return res.status(400).json({
        success: false,
        error: 'Missing required field: businessId',
        received: { businessId, userEmail, emailType, subject: !!subject, message: !!message }
      });
    }

    if (!userEmail) {
      console.error('❌ Missing: userEmail');
      return res.status(400).json({
        success: false,
        error: 'Missing required field: userEmail',
        received: { businessId, userEmail, emailType, subject: !!subject, message: !!message }
      });
    }

    if (!emailType) {
      console.error('❌ Missing: emailType');
      return res.status(400).json({
        success: false,
        error: 'Missing required field: emailType',
        received: { businessId, userEmail, emailType, subject: !!subject, message: !!message }
      });
    }

    if (!subject) {
      console.error('❌ Missing: subject');
      return res.status(400).json({
        success: false,
        error: 'Missing required field: subject',
        received: { businessId, userEmail, emailType, subject: !!subject, message: !!message }
      });
    }

    if (!message) {
      console.error('❌ Missing: message');
      return res.status(400).json({
        success: false,
        error: 'Missing required field: message',
        received: { businessId, userEmail, emailType, subject: !!subject, message: !!message }
      });
    }

    if (emailType === 'individual' && (!recipient?.name || !recipient?.email)) {
      console.error('❌ Missing recipient details for individual email');
      return res.status(400).json({
        success: false,
        error: 'Recipient name and email are required for individual emails',
        received: { recipient }
      });
    }

    if (emailType === 'bulk' && !sheetsUrl) {
      console.error('❌ Missing sheets URL for bulk email');
      return res.status(400).json({
        success: false,
        error: 'Google Sheets URL is required for bulk emails'
      });
    }

    console.log(`✅ All validations passed for ${emailType} email`);

    // Get business info
    const db = await getDatabase();
    const business = await db.collection('store_submissions').findOne({
      _id: new ObjectId(businessId)
    });

    if (!business) {
      console.error('❌ Business not found:', businessId);
      return res.status(404).json({
        success: false,
        error: 'Business not found'
      });
    }

    console.log('✅ Business found:', business.store_info?.name);

    // Generate request ID
    const requestId = `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // ✅ WALLET CHECK AND DEDUCTION
    if (!N8N_WALLET_WEBHOOK) {
      console.error('❌ N8N_WALLET_WEBHOOK not configured');
      return res.status(500).json({
        success: false,
        error: 'Wallet service not configured'
      });
    }

    const walletPayload = {
      userEmail,
      businessId,
      cost: totalCost,
      requestId,
      description: description || (emailType === 'individual' 
        ? `Email to ${recipient.name}` 
        : 'Bulk email campaign'),
      metadata: {
        emailType,
        recipient: emailType === 'individual' ? recipient.email : undefined,
        sheetsUrl: emailType === 'bulk' ? sheetsUrl : undefined
      }
    };

    console.log('💰 Checking wallet...');

    try {
      const walletResponse = await axios.post(N8N_WALLET_WEBHOOK, walletPayload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000,
        validateStatus: (status) => status >= 200 && status < 300 || status === 402
      });

      const walletResult = walletResponse.data;

      if (walletResponse.status === 402 || !walletResult.success) {
        console.log('⚠️ Insufficient funds');
        return res.status(402).json({
          success: false,
          error: 'Insufficient funds',
          current_balance: walletResult.current_balance,
          required: walletResult.required || totalCost,
          formatted_balance: walletResult.formatted_balance,
          formatted_required: walletResult.formatted_required || `R${totalCost.toFixed(2)}`
        });
      }

      console.log('✅ Wallet deduction successful:', walletResult.formatted_balance);

      // ✅ PREPARE EMAIL PAYLOAD FOR WEBHOOK
      const emailPayload = {
        businessId,
        businessName: business.store_info?.name || 'Unknown Business',
        userEmail,
        emailType,
        subject,
        message,
        timestamp: new Date().toISOString(),
        requestId
      };

      if (emailType === 'individual') {
        emailPayload.recipient = recipient;
        emailPayload.personalizedSubject = subject.replace(/{name}/g, recipient.name);
        emailPayload.personalizedMessage = message.replace(/{name}/g, recipient.name);
      } else {
        emailPayload.sheetsUrl = sheetsUrl;
        emailPayload.templateSubject = subject;
        emailPayload.templateMessage = message;
      }

      console.log('📤 Sending to email webhook...');

      const webhookResponse = await axios.post(EMAIL_WEBHOOK, emailPayload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000
      });

      const webhookResult = webhookResponse.data;
      console.log('✅ Email webhook success');

      // ✅ STORE EMAIL ACTIVITY IN MONGODB
      await db.collection('email_campaigns').insertOne({
        businessId: new ObjectId(businessId),
        userEmail,
        emailType,
        recipient: emailType === 'individual' ? recipient : undefined,
        sheetsUrl: emailType === 'bulk' ? sheetsUrl : undefined,
        subject,
        message,
        cost: totalCost,
        charged: true,
        status: 'sent',
        webhookResponse: webhookResult,
        requestId,
        created_at: new Date()
      });

      // ✅ RETURN SUCCESS RESPONSE
      const responseData = {
        success: true,
        message: emailType === 'individual' 
          ? 'Email sent successfully' 
          : 'Bulk email campaign initiated',
        emailType,
        charged: true,
        formatted_cost: `R${totalCost.toFixed(2)}`,
        new_balance: walletResult.new_balance,
        formatted_balance: walletResult.formatted_balance || `R${(walletResult.new_balance || 0).toFixed(2)}`,
        webhookResponse: webhookResult
      };

      if (emailType === 'individual') {
        responseData.recipient = recipient.email;
      } else {
        responseData.sheetsUrl = sheetsUrl;
        responseData.note = 'Emails are being processed from your Google Sheet';
      }

      console.log('✅ SUCCESS - Returning response');
      res.json(responseData);

    } catch (walletError) {
      console.error('❌ Wallet error:', walletError.message);

      let errorMessage = 'Wallet service unavailable';
      let errorDetails = walletError.message;

      if (walletError.code === 'ECONNREFUSED') {
        errorMessage = 'Cannot connect to wallet service';
        errorDetails = 'Service may be down';
      } else if (walletError.code === 'ETIMEDOUT') {
        errorMessage = 'Wallet service timeout';
        errorDetails = 'Please try again';
      }

      return res.status(503).json({
        success: false,
        error: errorMessage,
        details: errorDetails
      });
    }

  } catch (error) {
    console.error('❌ CRITICAL ERROR:', error);
    console.error('❌ Stack:', error.stack);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ========== GET PRICING ==========
router.get('/pricing', (req, res) => {
  res.json({
    success: true,
    pricing: {
      individual: {
        amount: PRICING.individual,
        formatted: `R${PRICING.individual.toFixed(2)}`
      },
      bulkPerEmail: {
        amount: PRICING.bulkPerEmail,
        formatted: `R${PRICING.bulkPerEmail.toFixed(2)}`
      }
    }
  });
});

module.exports = router;