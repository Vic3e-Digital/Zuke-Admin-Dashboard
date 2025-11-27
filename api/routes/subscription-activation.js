const express = require('express');
const router = express.Router();
const { connectToDatabase } = require('../../lib/mongodb');

/**
 * POST /api/activate-subscription
 * Activates a subscription after successful Paystack payment
 * 
 * Request body:
 * {
 *   email: string,
 *   plan: string,
 *   planName: string,
 *   isYearly: boolean,
 *   amount: number (in ZAR),
 *   paymentReference: string (Paystack reference),
 *   paymentMethod: 'paystack',
 *   billingPeriod: string,
 *   autoRenew: boolean (optional, defaults to false),
 *   userId: string (Auth0 user ID)
 * }
 */
router.post('/', async (req, res) => {
  try {
    const { 
      email, 
      plan, 
      planName,
      isYearly, 
      amount, 
      paymentReference,
      paymentMethod,
      billingPeriod,
      autoRenew = false,
      userId
    } = req.body;

    // Validate required fields
    if (!email || !plan || !amount || !paymentReference) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: email, plan, amount, paymentReference'
      });
    }

    if (paymentMethod !== 'paystack') {
      return res.status(400).json({
        success: false,
        message: 'Unsupported payment method'
      });
    }

    const { db } = await connectToDatabase();
    const walletsCollection = db.collection('user_wallets');

    console.log('Activating subscription:', {
      email,
      plan,
      amount,
      paymentReference,
      isYearly
    });

    // Calculate subscription end date
    const subscriptionStartDate = new Date();
    let subscriptionEndDate = new Date();
    
    if (isYearly) {
      subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + 1);
    } else {
      // 3-month cycle
      subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 3);
    }

    // Find or create wallet
    let wallet = await walletsCollection.findOne({ email });

    if (!wallet) {
      // Create new wallet with subscription
      const newWallet = {
        email,
        user_id: userId,
        balance: 0,
        currency: 'ZAR',
        current_plan: plan,
        plan_name: planName,
        billing_period: billingPeriod,
        subscription_status: 'active',
        subscription_start_date: subscriptionStartDate.toISOString(),
        subscription_end_date: subscriptionEndDate.toISOString(),
        auto_renew: autoRenew,
        transactions: [
          {
            transaction_id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'subscription',
            amount: amount,
            balance_after: 0,
            description: `${planName} subscription activated (${billingPeriod})${autoRenew ? ' - AUTO-RENEWAL ENABLED' : ''}`,
            timestamp: new Date().toISOString(),
            metadata: {
              source: 'paystack',
              paymentReference,
              paymentMethod: 'paystack',
              plan,
              planName,
              billing: billingPeriod,
              isYearly,
              auto_renew: autoRenew
            }
          }
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await walletsCollection.insertOne(newWallet);

      console.log('New wallet created with subscription:', email);
      console.log('Auto-renew enabled:', autoRenew);

      return res.json({
        success: true,
        message: 'Subscription activated successfully',
        subscription: {
          id: newWallet._id,
          plan: plan,
          status: 'active',
          startDate: subscriptionStartDate.toISOString(),
          endDate: subscriptionEndDate.toISOString(),
          autoRenew: autoRenew
        }
      });
    }

    // Update existing wallet
    const updateResult = await walletsCollection.updateOne(
      { email },
      {
        $set: {
          current_plan: plan,
          plan_name: planName,
          billing_period: billingPeriod,
          subscription_status: 'active',
          subscription_start_date: subscriptionStartDate.toISOString(),
          subscription_end_date: subscriptionEndDate.toISOString(),
          auto_renew: autoRenew,
          updated_at: new Date().toISOString()
        },
        $push: {
          transactions: {
            transaction_id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'subscription',
            amount: amount,
            balance_after: wallet.balance || 0,
            description: `${planName} subscription activated (${billingPeriod})${autoRenew ? ' - AUTO-RENEWAL ENABLED' : ''}`,
            timestamp: new Date().toISOString(),
            metadata: {
              source: 'paystack',
              paymentReference,
              paymentMethod: 'paystack',
              plan,
              planName,
              billing: billingPeriod,
              isYearly,
              auto_renew: autoRenew
            }
          }
        }
      }
    );

    if (updateResult.modifiedCount === 0) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update wallet'
      });
    }

    console.log('Subscription activated for:', email);
    console.log('Auto-renew enabled:', autoRenew);

    res.json({
      success: true,
      message: 'Subscription activated successfully',
      subscription: {
        plan,
        planName,
        status: 'active',
        billingPeriod,
        startDate: subscriptionStartDate.toISOString(),
        endDate: subscriptionEndDate.toISOString(),
        autoRenew: autoRenew
      }
    });

  } catch (error) {
    console.error('Error activating subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to activate subscription',
      error: error.message
    });
  }
});

module.exports = router;
