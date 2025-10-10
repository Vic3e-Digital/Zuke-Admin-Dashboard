const express = require('express');
const router = express.Router();
const { connectToDatabase } = require('../lib/mongodb');
const { ObjectId } = require('mongodb');


// Helper function to check if subscription is active
function isSubscriptionActive(wallet) {
    if (!wallet.subscription_end_date || wallet.subscription_status !== 'active') {
      return false;
    }
    
    const endDate = new Date(wallet.subscription_end_date);
    const now = new Date();
    
    return endDate > now;
  }
// Get wallet by email only
router.get('/', async (req, res) => {
    console.log('=== Wallet API Called ===');
    console.log('Query params:', req.query);
  
    try {
      const { email } = req.query;
  
      if (!email) {
        return res.status(400).json({
          success: false,
          error: 'email is required'
        });
      }
  
      const { db } = await connectToDatabase();
      const collection = db.collection('user_wallets');
  
      console.log('Searching in collection: user_wallets');
      console.log('Searching for email:', email);
      
      let wallet = await collection.findOne({ email: email });
  
      console.log('Wallet found:', wallet ? 'YES' : 'NO');
  
      // If wallet doesn't exist, create a new one with initial credits
      if (!wallet) {
        console.log('Creating new wallet for:', email);
        const newWallet = {
          email: email,
          balance: 99,
          currency: 'ZAR',
          current_plan: 'free',
          billing_period: null,
          subscription_status: 'inactive',
          subscription_start_date: null,
          subscription_end_date: null,
          transactions: [
            {
              transaction_id: `initial_${Date.now()}`,
              type: 'credit',
              amount: 99,
              balance_after: 99,
              description: 'Welcome bonus - Initial credits',
              timestamp: new Date().toISOString(),
              metadata: {
                source: 'signup_bonus'
              }
            }
          ],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
  
        await collection.insertOne(newWallet);
        
        return res.json({
          success: true,
          wallet: newWallet,
          isNew: true,
          hasActivePlan: false
        });
      }
  
      // Check if subscription is still active
      const hasActivePlan = isSubscriptionActive(wallet);
      
      // If subscription expired, update status
      if (!hasActivePlan && wallet.subscription_status === 'active') {
        await collection.updateOne(
          { email: email },
          {
            $set: {
              subscription_status: 'expired',
              current_plan: 'free',
              updated_at: new Date().toISOString()
            }
          }
        );
        
        wallet.subscription_status = 'expired';
        wallet.current_plan = 'free';
      }
  
      console.log('Returning wallet with balance:', wallet.balance);
      console.log('Active plan:', hasActivePlan ? wallet.current_plan : 'none');
      
      res.json({
        success: true,
        wallet: wallet,
        isNew: false,
        hasActivePlan: hasActivePlan
      });
  
    } catch (error) {
      console.error('Error in wallet API:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch wallet',
        message: error.message
      });
    }
  });

// Get transaction history by email
router.get('/transactions', async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'email is required'
      });
    }

    const { db } = await connectToDatabase();
    const collection = db.collection('user_wallets');  // ✅ user_wallets

    const wallet = await collection.findOne({ email: email });

    if (!wallet) {
      return res.status(404).json({
        success: false,
        error: 'Wallet not found'
      });
    }

    res.json({
      success: true,
      transactions: wallet.transactions || [],
      current_balance: wallet.balance
    });

  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transactions'
    });
  }
});

// Deduct from wallet by email
router.post('/deduct', async (req, res) => {
  try {
    const { email, amount, description, metadata } = req.body;

    if (!email || !amount) {
      return res.status(400).json({
        success: false,
        error: 'email and amount are required'
      });
    }

    const { db } = await connectToDatabase();
    const collection = db.collection('user_wallets');  // ✅ user_wallets

    const wallet = await collection.findOne({ email: email });

    if (!wallet) {
      return res.status(404).json({
        success: false,
        error: 'Wallet not found'
      });
    }

    if (wallet.balance < amount) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient funds',
        current_balance: wallet.balance,
        required: amount
      });
    }

    const newBalance = wallet.balance - amount;
    const transaction = {
      transaction_id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'debit',
      amount: amount,
      balance_after: newBalance,
      description: description || 'Transaction fee',
      timestamp: new Date().toISOString(),
      metadata: metadata || {}
    };

    await collection.updateOne(
      { email: email },
      {
        $set: {
          balance: newBalance,
          updated_at: new Date().toISOString()
        },
        $push: { transactions: transaction }
      }
    );

    res.json({
      success: true,
      transaction_id: transaction.transaction_id,
      new_balance: newBalance,
      formatted_balance: `R${(newBalance / 100).toFixed(2)}`
    });

  } catch (error) {
    console.error('Error deducting from wallet:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to deduct from wallet'
    });
  }
});

// Add credits to wallet (for Paystack webhook)
router.post('/credit', async (req, res) => {
  try {
    const { email, amount, description, metadata } = req.body;

    if (!email || !amount) {
      return res.status(400).json({
        success: false,
        error: 'email and amount are required'
      });
    }

    const { db } = await connectToDatabase();
    const collection = db.collection('user_wallets');  // ✅ user_wallets

    const wallet = await collection.findOne({ email: email });

    if (!wallet) {
      // Create new wallet if doesn't exist
      const newWallet = {
        email: email,
        balance: amount,
        currency: 'ZAR',
        current_plan: metadata?.plan || 'free',
        billing_period: metadata?.billing_period || null,
        transactions: [
          {
            transaction_id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'credit',
            amount: amount,
            balance_after: amount,
            description: description || 'Credit added',
            timestamp: new Date().toISOString(),
            metadata: metadata || {}
          }
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await collection.insertOne(newWallet);
      
      return res.json({
        success: true,
        message: 'Wallet created and credited',
        new_balance: amount,
        formatted_balance: `R${(amount / 100).toFixed(2)}`
      });
    }

    const newBalance = wallet.balance + amount;
    const transaction = {
      transaction_id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'credit',
      amount: amount,
      balance_after: newBalance,
      description: description || 'Credit added',
      timestamp: new Date().toISOString(),
      metadata: metadata || {}
    };

    const updateFields = {
      balance: newBalance,
      updated_at: new Date().toISOString()
    };

    // Update plan info if provided in metadata
    if (metadata?.plan) {
      updateFields.current_plan = metadata.plan;
    }
    if (metadata?.billing_period) {
      updateFields.billing_period = metadata.billing_period;
    }

    await collection.updateOne(
      { email: email },
      {
        $set: updateFields,
        $push: { transactions: transaction }
      }
    );

    res.json({
      success: true,
      transaction_id: transaction.transaction_id,
      new_balance: newBalance,
      formatted_balance: `R${(newBalance / 100).toFixed(2)}`
    });

  } catch (error) {
    console.error('Error crediting wallet:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to credit wallet'
    });
  }
});

module.exports = router;