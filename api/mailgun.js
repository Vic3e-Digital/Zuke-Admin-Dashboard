const express = require('express');
const router = express.Router();
const { connectToDatabase } = require('../lib/mongodb');
const mailgun = require('mailgun.js');
const FormData = require('form-data');

// Initialize Mailgun
const mg = new mailgun(FormData);
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN;
const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;
const MAILGUN_FROM_EMAIL = process.env.MAILGUN_FROM_EMAIL || `noreply@${MAILGUN_DOMAIN}`;

// Helper function to send email via Mailgun
async function sendEmail(to, subject, htmlContent) {
  try {
    if (!MAILGUN_API_KEY || !MAILGUN_DOMAIN) {
      console.error('❌ Mailgun credentials not configured');
      throw new Error('Mailgun not configured');
    }

    const client = mailgun.client({ username: 'api', key: MAILGUN_API_KEY });

    const messageData = {
      from: MAILGUN_FROM_EMAIL,
      to: to,
      subject: subject,
      html: htmlContent
    };

    const result = await client.messages.create(MAILGUN_DOMAIN, messageData);
    console.log('✅ Email sent successfully:', result);
    return result;
  } catch (error) {
    console.error('❌ Error sending email:', error);
    throw error;
  }
}

// Endpoint to request model contact details
router.post('/request-contact-details', async (req, res) => {
  try {
    const { businessEmail, modelId, modelEmail, amount = 10, modelName } = req.body;

    if (!businessEmail || !modelId || !modelEmail) {
      return res.status(400).json({
        success: false,
        error: 'businessEmail, modelId, and modelEmail are required'
      });
    }

    const { db } = await connectToDatabase();

    // 1. Deduct from business wallet
    const walletsCollection = db.collection('user_wallets');
    const businessWallet = await walletsCollection.findOne({ email: businessEmail });

    if (!businessWallet) {
      return res.status(404).json({
        success: false,
        error: 'Business wallet not found'
      });
    }

    if (businessWallet.balance < amount) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient funds',
        current_balance: businessWallet.balance,
        required: amount
      });
    }

    // 2. Create transaction record with revenue split
    const modelRevenue = amount * 0.65; // 65% to model
    const zukeRevenue = amount * 0.35; // 35% to Zuke

    const transaction = {
      transaction_id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'contact_request',
      amount: amount,
      model_revenue: modelRevenue,
      zuke_revenue: zukeRevenue,
      balance_after: businessWallet.balance - amount,
      description: `Contact details request for ${modelName || 'model'}`,
      timestamp: new Date().toISOString(),
      metadata: {
        modelId: modelId,
        modelEmail: modelEmail,
        modelName: modelName
      }
    };

    // 3. Update wallet with transaction
    await walletsCollection.updateOne(
      { email: businessEmail },
      {
        $set: {
          balance: businessWallet.balance - amount,
          updated_at: new Date().toISOString()
        },
        $push: { transactions: transaction }
      }
    );

    // 4. Log contact request in creative_models collection
    const creativeModelsCollection = db.collection('creative_models');
    const contactRequest = {
      request_id: transaction.transaction_id,
      business_email: businessEmail,
      model_revenue: modelRevenue,
      zuke_revenue: zukeRevenue,
      requested_at: new Date().toISOString(),
      paid: false
    };

    await creativeModelsCollection.updateOne(
      { _id: modelId },
      {
        $push: { contact_requests: contactRequest },
        $inc: { 
          'revenue_tracking.total_requests': 1,
          'revenue_tracking.pending_payment': zukeRevenue
        }
      },
      { upsert: false }
    );

    // 5. Send email to business with model's contact details
    const businessEmailContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5;">
        <div style="background: white; padding: 30px; border-radius: 8px; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; margin-bottom: 20px;">Model Contact Details</h2>
          
          <p style="color: #666; margin-bottom: 20px;">
            Here are the contact details for <strong>${modelName || 'the model'}</strong>:
          </p>

          <div style="background: #f9f9f9; padding: 20px; border-left: 4px solid #FF8B00; margin: 20px 0;">
            <p><strong>Email:</strong> ${modelEmail}</p>
          </div>

          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            A charge of R${amount.toFixed(2)} has been deducted from your Zuke wallet for this service.
          </p>

          <p style="color: #999; font-size: 12px;">
            Transaction ID: ${transaction.transaction_id}
          </p>
        </div>
      </div>
    `;

    await sendEmail(
      businessEmail,
      `Contact Details: ${modelName || 'Model'}`,
      businessEmailContent
    );

    // 6. Send confirmation to model that contact was requested
    const modelEmailContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5;">
        <div style="background: white; padding: 30px; border-radius: 8px; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; margin-bottom: 20px;">Your Contact Details Were Requested</h2>
          
          <p style="color: #666; margin-bottom: 20px;">
            A business has requested your contact details from the Zuke Creative Hub.
          </p>

          <div style="background: #f9f9f9; padding: 20px; border-left: 4px solid #FF8B00; margin: 20px 0;">
            <p><strong>Business Email:</strong> ${businessEmail}</p>
            <p><strong>Amount:</strong> R${amount.toFixed(2)}</p>
            <p><strong>Your Revenue:</strong> R${modelRevenue.toFixed(2)} (65%)</p>
            <p style="color: #FF8B00; font-weight: bold;">Status: Pending Processing</p>
          </div>

          <p style="color: #666; margin-top: 20px;">
            Your earnings will be processed within 5-7 business days.
          </p>

          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            Transaction ID: ${transaction.transaction_id}
          </p>
        </div>
      </div>
    `;

    await sendEmail(
      modelEmail,
      'Your Contact Details Were Requested',
      modelEmailContent
    );

    res.json({
      success: true,
      transaction_id: transaction.transaction_id,
      amount: amount,
      model_revenue: modelRevenue,
      zuke_revenue: zukeRevenue,
      new_balance: businessWallet.balance - amount,
      message: 'Contact details sent successfully'
    });

  } catch (error) {
    console.error('❌ Error processing contact request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process contact request',
      details: error.message
    });
  }
});

module.exports = router;
