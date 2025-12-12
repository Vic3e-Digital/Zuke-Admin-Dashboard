const express = require('express');
const router = express.Router();
const { connectToDatabase } = require('../lib/mongodb');
const { ObjectId } = require('mongodb');

// Checklist items configuration with credit rewards
const CHECKLIST_ITEMS = {
  social_media: {
    id: 'social_media',
    title: 'Connect Social Media',
    description: 'Connect at least 2 social media profiles',
    reward: 50,
    icon: '📱',
    validation: async (db, businessId) => {
      const business = await db.collection('store_submissions').findOne({
        _id: new ObjectId(businessId)
      });
      
      if (!business?.automation_settings?.social_media) return false;
      
      const connectedPlatforms = Object.values(business.automation_settings.social_media)
        .filter(platform => platform.connected === true).length;
      
      return connectedPlatforms >= 2;
    }
  },
  automation: {
    id: 'automation',
    title: 'Setup Automation',
    description: 'Enable automation settings and configure webhook',
    reward: 50,
    icon: '🤖',
    validation: async (db, businessId) => {
      const business = await db.collection('store_submissions').findOne({
        _id: new ObjectId(businessId)
      });
      
      if (!business?.automation_settings?.n8n_config) return false;
      
      return business.automation_settings.n8n_config.enabled === true &&
             business.automation_settings.n8n_config.webhook_url?.length > 0;
    }
  },
  creative_model: {
    id: 'creative_model',
    title: 'Choose Creative Model',
    description: 'Select at least one AI creative model',
    reward: 50,
    icon: '🎨',
    validation: async (db, businessId) => {
      const business = await db.collection('store_submissions').findOne({
        _id: new ObjectId(businessId)
      });
      
      if (!business?.creative_settings?.selected_models) return false;
      
      return business.creative_settings.selected_models.length > 0;
    }
  }
};

// Get checklist status for a business
router.get('/', async (req, res) => {
  try {
    const { businessId, email } = req.query;

    if (!businessId || !email) {
      return res.status(400).json({
        success: false,
        error: 'businessId and email are required'
      });
    }

    const { db } = await connectToDatabase();
    const collection = db.collection('business_unlock_checklist');

    // Find or create checklist for this business
    let checklist = await collection.findOne({
      business_id: businessId,
      user_email: email
    });

    if (!checklist) {
      // Create new checklist
      checklist = {
        business_id: businessId,
        user_email: email,
        items: {
          social_media: {
            completed: false,
            unlocked: false,
            completed_at: null
          },
          automation: {
            completed: false,
            unlocked: false,
            completed_at: null
          },
          creative_model: {
            completed: false,
            unlocked: false,
            completed_at: null
          }
        },
        total_credits_earned: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await collection.insertOne(checklist);
    }

    // Check current completion status for each item
    const itemsStatus = [];
    for (const [key, config] of Object.entries(CHECKLIST_ITEMS)) {
      const isComplete = await config.validation(db, businessId);
      const item = checklist.items[key];

      itemsStatus.push({
        id: config.id,
        title: config.title,
        description: config.description,
        reward: config.reward,
        icon: config.icon,
        completed: isComplete,
        unlocked: item.unlocked,
        canUnlock: isComplete && !item.unlocked,
        completed_at: item.completed_at
      });
    }

    res.json({
      success: true,
      checklist: {
        business_id: businessId,
        user_email: email,
        items: itemsStatus,
        total_credits_earned: checklist.total_credits_earned,
        progress: {
          completed: itemsStatus.filter(i => i.unlocked).length,
          total: itemsStatus.length,
          percentage: Math.round((itemsStatus.filter(i => i.unlocked).length / itemsStatus.length) * 100)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching unlock checklist:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch checklist',
      message: error.message
    });
  }
});

// Unlock credits for a specific checklist item
router.post('/unlock', async (req, res) => {
  try {
    const { businessId, email, itemId } = req.body;

    if (!businessId || !email || !itemId) {
      return res.status(400).json({
        success: false,
        error: 'businessId, email, and itemId are required'
      });
    }

    const { db } = await connectToDatabase();
    const checklistCollection = db.collection('business_unlock_checklist');
    
    // Get checklist config for this item
    const itemConfig = CHECKLIST_ITEMS[itemId];
    if (!itemConfig) {
      return res.status(400).json({
        success: false,
        error: 'Invalid itemId'
      });
    }

    // Find checklist
    const checklist = await checklistCollection.findOne({
      business_id: businessId,
      user_email: email
    });

    if (!checklist) {
      return res.status(404).json({
        success: false,
        error: 'Checklist not found'
      });
    }

    // Check if already unlocked
    if (checklist.items[itemId]?.unlocked) {
      return res.status(400).json({
        success: false,
        error: 'Credits already unlocked for this item'
      });
    }

    // Validate completion
    const isComplete = await itemConfig.validation(db, businessId);
    if (!isComplete) {
      return res.status(400).json({
        success: false,
        error: 'Requirements not met for this item'
      });
    }

    // Award credits using existing wallet.js logic
    const walletCollection = db.collection('user_wallets');
    let wallet = await walletCollection.findOne({ email: email });

    if (!wallet) {
      // Create wallet if it doesn't exist
      wallet = {
        email: email,
        balance: 0,
        currency: 'ZAR',
        current_plan: 'free',
        billing_period: null,
        transactions: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      await walletCollection.insertOne(wallet);
    }

    const creditAmount = itemConfig.reward;
    const newBalance = wallet.balance + creditAmount;
    
    const transaction = {
      transaction_id: `unlock_${itemId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'credit',
      amount: creditAmount,
      balance_after: newBalance,
      description: `Unlock Credits: ${itemConfig.title}`,
      timestamp: new Date().toISOString(),
      metadata: {
        source: 'unlock_credits',
        item_id: itemId,
        business_id: businessId
      }
    };

    // Update wallet
    await walletCollection.updateOne(
      { email: email },
      {
        $set: {
          balance: newBalance,
          updated_at: new Date().toISOString()
        },
        $push: { transactions: transaction }
      }
    );

    // Update checklist
    await checklistCollection.updateOne(
      {
        business_id: businessId,
        user_email: email
      },
      {
        $set: {
          [`items.${itemId}.completed`]: true,
          [`items.${itemId}.unlocked`]: true,
          [`items.${itemId}.completed_at`]: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        $inc: {
          total_credits_earned: creditAmount
        }
      }
    );

    res.json({
      success: true,
      message: `Successfully unlocked R${creditAmount} credits!`,
      item: {
        id: itemId,
        title: itemConfig.title,
        reward: creditAmount
      },
      transaction_id: transaction.transaction_id,
      new_balance: newBalance,
      formatted_balance: `R${newBalance.toFixed(2)}`
    });

  } catch (error) {
    console.error('Error unlocking credits:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unlock credits',
      message: error.message
    });
  }
});

// Get overall progress summary
router.get('/progress', async (req, res) => {
  try {
    const { businessId, email } = req.query;

    if (!businessId || !email) {
      return res.status(400).json({
        success: false,
        error: 'businessId and email are required'
      });
    }

    const { db } = await connectToDatabase();
    const collection = db.collection('business_unlock_checklist');

    const checklist = await collection.findOne({
      business_id: businessId,
      user_email: email
    });

    if (!checklist) {
      return res.json({
        success: true,
        progress: {
          completed: 0,
          total: Object.keys(CHECKLIST_ITEMS).length,
          percentage: 0,
          total_credits_earned: 0,
          potential_credits: Object.values(CHECKLIST_ITEMS).reduce((sum, item) => sum + item.reward, 0)
        }
      });
    }

    const completedCount = Object.values(checklist.items).filter(item => item.unlocked).length;
    const totalCount = Object.keys(CHECKLIST_ITEMS).length;
    const potentialCredits = Object.values(CHECKLIST_ITEMS).reduce((sum, item) => sum + item.reward, 0);

    res.json({
      success: true,
      progress: {
        completed: completedCount,
        total: totalCount,
        percentage: Math.round((completedCount / totalCount) * 100),
        total_credits_earned: checklist.total_credits_earned,
        potential_credits: potentialCredits
      }
    });

  } catch (error) {
    console.error('Error fetching progress:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch progress',
      message: error.message
    });
  }
});

module.exports = router;
