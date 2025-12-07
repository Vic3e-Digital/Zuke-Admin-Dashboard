// api/promo-codes.js
const express = require('express');
const router = express.Router();
const { connectToDatabase } = require('../lib/mongodb');

// Promotional codes database
const PROMO_CODES = {
  'ZUKEXAFAA': {
    plan: 'ignite',
    description: 'AFAA Ignite Plan Access',
    duration: 90, // days
    credits: 297, // R297 for 3 months
    active: true,
    yearlyAllowed: false // Only 3-month cycle allowed
  },
  'ZUKEXREDISCOVERMECOACHING': {
    plan: 'ignite',
    description: 'Rediscover Me Coaching Ignite Access',
    duration: 90,
    credits: 297, // R297 for 3 months
    active: true,
    yearlyAllowed: false // Only 3-month cycle allowed
  },
  'ZUKEXSPARK': {
    plan: 'spark',
    description: 'Spark Plan Promotional Access',
    duration: 90,
    credits: 1797, // R1797 for 3 months
    active: true,
    yearlyAllowed: false // Only 3-month cycle allowed
  },
  'ZUKEXAISURVEY': {
    plan: 'spark',
    description: 'Spark Plan Promotional Access',
    duration: 90,
    credits: 1797, // R1797 for 3 months
    active: true,
    yearlyAllowed: false // Only 3-month cycle allowed
  }
};

// Validate promo code
router.post('/validate-promo-code', async (req, res) => {
  try {
    const { code, email, planId, isYearly, description } = req.body;

    if (!code || !email || !planId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    const codeUpper = code.toUpperCase();
    const promoDetails = PROMO_CODES[codeUpper];

    if (!promoDetails) {
      return res.json({
        success: false,
        message: 'Invalid promotional code'
      });
    }

    if (!promoDetails.active) {
      return res.json({
        success: false,
        message: 'This promotional code has expired'
      });
    }

    if (promoDetails.plan !== planId) {
      return res.json({
        success: false,
        message: `This code is only valid for the ${promoDetails.plan} plan`
      });
    }

    // Check if yearly plan is selected but not allowed for this promo code
    if (isYearly && !promoDetails.yearlyAllowed) {
      return res.json({
        success: false,
        message: 'This promotional code is only valid for the 3-month billing cycle'
      });
    }

    // Check if user has already used this code
    const { db } = await connectToDatabase();
    const existingUse = await db.collection('promo_code_usage').findOne({
      email: email.toLowerCase(),
      code: codeUpper
    });

    if (existingUse) {
      return res.json({
        success: false,
        message: 'You have already used this promotional code'
      });
    }

    return res.json({
      success: true,
      code: codeUpper,
      planId: promoDetails.plan,
      description: promoDetails.description,
      duration: promoDetails.duration
    });

  } catch (error) {
    console.error('Error validating promo code:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error validating promo code'
    });
  }
});

// Activate subscription with promo code
router.post('/activate-promo-subscription', async (req, res) => {
  try {
    const {
      email,
      code,
      plan,
      planName,
      isYearly,
      amount,
      autoRenew,
      userId
    } = req.body;

    if (!email || !code || !plan) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    const codeUpper = code.toUpperCase();
    const promoDetails = PROMO_CODES[codeUpper];

    if (!promoDetails || !promoDetails.active || promoDetails.plan !== plan) {
      return res.json({
        success: false,
        message: 'Invalid promotional code'
      });
    }

    // Check if yearly plan is selected but not allowed
    if (isYearly && !promoDetails.yearlyAllowed) {
      return res.json({
        success: false,
        message: 'This promotional code is only valid for the 3-month billing cycle'
      });
    }

    const { db } = await connectToDatabase();

    // Check if already used
    const existingUse = await db.collection('promo_code_usage').findOne({
      email: email.toLowerCase(),
      code: codeUpper
    });

    if (existingUse) {
      return res.json({
        success: false,
        message: 'You have already used this promotional code'
      });
    }

    // Calculate subscription dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + promoDetails.duration);

    // Calculate credits to add based on promo code
    const creditsToAdd = promoDetails.credits || 0;

    // Get existing wallet or create new one
    const walletCollection = db.collection('user_wallets');
    let wallet = await walletCollection.findOne({ email: email.toLowerCase() });

    if (!wallet) {
      // Create new wallet with promo credits
      const newWallet = {
        email: email.toLowerCase(),
        balance: creditsToAdd,
        currency: 'ZAR',
        current_plan: plan.toUpperCase(),
        billing_period: '3-month',
        subscription_status: 'active',
        subscription_start_date: startDate.toISOString(),
        subscription_end_date: endDate.toISOString(),
        auto_renew: false,
        transactions: [
          {
            transaction_id: `promo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'credit',
            amount: creditsToAdd,
            balance_after: creditsToAdd,
            description: `Promotional code applied: ${promoDetails.description}`,
            timestamp: new Date().toISOString(),
            metadata: {
              source: 'promo_code',
              code: codeUpper,
              plan: plan,
              planName: planName
            }
          }
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await walletCollection.insertOne(newWallet);
    } else {
      // Update existing wallet - add credits and update subscription
      const newBalance = wallet.balance + creditsToAdd;
      const transaction = {
        transaction_id: `promo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'credit',
        amount: creditsToAdd,
        balance_after: newBalance,
        description: `Promotional code applied: ${promoDetails.description}`,
        timestamp: new Date().toISOString(),
        metadata: {
          source: 'promo_code',
          code: codeUpper,
          plan: plan,
          planName: planName
        }
      };

      await walletCollection.updateOne(
        { email: email.toLowerCase() },
        {
          $set: {
            balance: newBalance,
            current_plan: plan.toUpperCase(),
            billing_period: '3-month',
            subscription_status: 'active',
            subscription_start_date: startDate.toISOString(),
            subscription_end_date: endDate.toISOString(),
            auto_renew: false,
            updated_at: new Date().toISOString()
          },
          $push: { transactions: transaction }
        }
      );
    }

    // Record promo code usage
    await db.collection('promo_code_usage').insertOne({
      email: email.toLowerCase(),
      code: codeUpper,
      plan: plan,
      planName: planName,
      description: promoDetails.description,
      used_at: new Date(),
      subscription_start: startDate,
      subscription_end: endDate,
      credits_added: creditsToAdd,
      userId: userId
    });

    // Log the subscription activation
    await db.collection('subscription_history').insertOne({
      email: email.toLowerCase(),
      plan: plan,
      planName: planName,
      type: 'activation',
      method: 'promo_code',
      code: codeUpper,
      amount: 0,
      startDate: startDate,
      endDate: endDate,
      autoRenew: false,
      timestamp: new Date()
    });

    console.log(`✅ Promo subscription activated for ${email} with code ${codeUpper} - Added R${creditsToAdd} credits`);

    return res.json({
      success: true,
      message: 'Subscription activated successfully',
      subscription: {
        plan: plan,
        planName: planName,
        startDate: startDate,
        endDate: endDate,
        duration: promoDetails.duration,
        code: codeUpper,
        creditsAdded: creditsToAdd
      }
    });

  } catch (error) {
    console.error('Error activating promo subscription:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error activating subscription'
    });
  }
});

module.exports = router;
