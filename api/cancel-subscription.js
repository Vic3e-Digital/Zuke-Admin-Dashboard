const express = require('express');
const router = express.Router();
const { connectToDatabase } = require('../lib/mongodb');

/**
 * POST /api/cancel-subscription
 * Cancels a subscription (disables auto-renewal)
 * 
 * Request body:
 * {
 *   email: string
 * }
 */
router.post('/', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    const { db } = await connectToDatabase();
    const collection = db.collection('user_wallets');

    console.log('Attempting to cancel subscription for:', email);

    const wallet = await collection.findOne({ email });

    if (!wallet) {
      return res.status(404).json({
        success: false,
        error: 'Wallet not found'
      });
    }

    if (wallet.subscription_status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'No active subscription to cancel'
      });
    }

    // Update wallet to disable auto-renewal
    const updateResult = await collection.updateOne(
      { email },
      {
        $set: {
          auto_renew: false,
          subscription_status: 'cancelled',
          cancellation_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        $push: {
          transactions: {
            transaction_id: `cancel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'subscription_cancellation',
            amount: 0,
            balance_after: wallet.balance || 0,
            description: `Subscription cancelled - ${wallet.plan_name} plan. Access maintained until ${wallet.subscription_end_date}`,
            timestamp: new Date().toISOString(),
            metadata: {
              plan: wallet.current_plan,
              end_date: wallet.subscription_end_date,
              auto_renew_disabled: true
            }
          }
        }
      }
    );

    if (updateResult.modifiedCount === 0) {
      return res.status(500).json({
        success: false,
        error: 'Failed to cancel subscription'
      });
    }

    console.log('Subscription cancelled for:', email);
    console.log('Access until:', wallet.subscription_end_date);

    res.json({
      success: true,
      message: 'Subscription cancelled successfully',
      access_until: wallet.subscription_end_date,
      details: {
        plan: wallet.current_plan,
        plan_name: wallet.plan_name,
        access_until: wallet.subscription_end_date,
        note: 'You will continue to have full access until the end of your billing period'
      }
    });

  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel subscription',
      message: error.message
    });
  }
});

module.exports = router;
