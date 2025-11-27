const express = require('express');
const router = express.Router();
const { connectToDatabase } = require('../lib/mongodb');
const https = require('https');

/**
 * Helper function to verify Paystack payment
 */
async function verifyPaystackPayment(reference) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.paystack.co',
      port: 443,
      path: `/transaction/verify/${reference}`,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve(response);
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

/**
 * POST /api/add-credits
 * Adds credits to a user's wallet after successful Paystack payment
 * 
 * Request body:
 * {
 *   email: string,
 *   credits: number,
 *   paymentReference: string (Paystack reference),
 *   bundle: string (small|medium|large|custom),
 *   amount: number (in ZAR)
 * }
 */
router.post('/', async (req, res) => {
  try {
    const { 
      email, 
      credits, 
      paymentReference,
      bundle,
      amount
    } = req.body;

    // Validate required fields
    if (!email || !credits || !paymentReference || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: email, credits, paymentReference, amount'
      });
    }

    console.log('Adding credits request:', {
      email,
      credits,
      paymentReference,
      bundle,
      amount
    });

    const { db } = await connectToDatabase();
    const collection = db.collection('user_wallets');

    // ✅ CHECK 1: Verify this transaction hasn't been processed already
    const existingTransaction = await collection.findOne({
      'transactions.metadata.paymentReference': paymentReference
    });

    if (existingTransaction) {
      console.log('Duplicate transaction detected:', paymentReference);
      return res.status(400).json({
        success: false,
        message: 'This payment has already been processed'
      });
    }

    // ✅ CHECK 2: Verify payment with Paystack
    let verification;
    try {
      verification = await verifyPaystackPayment(paymentReference);
    } catch (error) {
      console.error('Paystack verification error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to verify payment with Paystack',
        error: error.message
      });
    }

    // ✅ CHECK 3: Validate payment status
    if (!verification.status || verification.data.status !== 'success') {
      console.log('Payment verification failed:', verification);
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed',
        details: verification.message
      });
    }

    // ✅ CHECK 4: Validate payment amount
    const paidAmount = verification.data.amount / 100; // Convert kobo to rands
    if (paidAmount !== amount) {
      console.error('Amount mismatch:', { expected: amount, received: paidAmount });
      return res.status(400).json({
        success: false,
        message: `Payment amount mismatch. Expected R${amount}, but received R${paidAmount}`
      });
    }

    // ✅ CHECK 5: Validate email matches
    const paidEmail = verification.data.customer.email;
    if (paidEmail !== email) {
      console.error('Email mismatch:', { expected: email, received: paidEmail });
      return res.status(400).json({
        success: false,
        message: 'Payment email does not match user email'
      });
    }

    // All checks passed - proceed with adding credits
    let wallet = await collection.findOne({ email });

    const currentBalance = wallet ? (wallet.balance || 0) : 0;
    const newBalance = currentBalance + credits;

    const transaction = {
      transaction_id: paymentReference, // Use Paystack reference as transaction ID
      type: 'credit_topup',
      amount: credits,
      balance_after: newBalance,
      description: `Credit top-up: ${bundle} bundle (${credits.toLocaleString()} credits)`,
      timestamp: new Date().toISOString(),
      metadata: {
        source: 'paystack',
        paymentReference,
        bundle,
        amount_paid: amount,
        transaction_type: 'topup',
        paystack_data: {
          reference: verification.data.reference,
          amount: verification.data.amount,
          currency: verification.data.currency,
          status: verification.data.status,
          paid_at: verification.data.paid_at
        }
      }
    };

    if (!wallet) {
      // Create new wallet with credits
      const newWallet = {
        email,
        balance: credits,
        currency: 'ZAR',
        current_plan: 'free',
        billing_period: null,
        subscription_status: 'inactive',
        subscription_start_date: null,
        subscription_end_date: null,
        transactions: [transaction],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await collection.insertOne(newWallet);

      console.log('✅ New wallet created with credits:', email, 'Balance:', credits);

      return res.json({
        success: true,
        message: 'Credits added successfully',
        wallet: {
          email,
          balance: credits,
          credits_added: credits,
          bundle,
          reference: paymentReference
        }
      });
    }

    // Update existing wallet
    const updateResult = await collection.updateOne(
      { email },
      {
        $set: {
          balance: newBalance,
          updated_at: new Date().toISOString()
        },
        $push: {
          transactions: transaction
        }
      }
    );

    if (updateResult.modifiedCount === 0) {
      console.error('Failed to update wallet for:', email);
      return res.status(500).json({
        success: false,
        message: 'Failed to update wallet'
      });
    }

    console.log('✅ Credits added successfully:', {
      email,
      credits_added: credits,
      old_balance: currentBalance,
      new_balance: newBalance,
      bundle,
      reference: paymentReference
    });

    res.json({
      success: true,
      message: 'Credits added successfully',
      wallet: {
        email,
        balance: newBalance,
        credits_added: credits,
        bundle,
        reference: paymentReference
      }
    });

  } catch (error) {
    console.error('❌ Error adding credits:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add credits',
      error: error.message
    });
  }
});

module.exports = router;