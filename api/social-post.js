// api/social-post.js
const express = require('express');
const router = express.Router();
const { getDatabase, connectToDatabase } = require('../lib/mongodb');
const { ObjectId } = require('mongodb');
const crypto = require('crypto');

// ✅ Decryption function
function decryptToken(encryptedToken) {
  if (!encryptedToken) return null;
  
  const algorithm = 'aes-256-cbc';
  const key = crypto.createHash('sha256').update(process.env.ENCRYPTION_SECRET || 'your-secret-key').digest();
  
  const parts = encryptedToken.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// ✅ Pricing configuration (in cents/ZAR)
const PRICING = {
  facebook: 500,      // R5.00 per post
  instagram: 500,     // R5.00 per post
  linkedin: 1000,     // R10.00 per post
  youtube: 2000,      // R20.00 per video upload
  base_fee: 0        // Base fee per request (optional)
};

// ✅ Calculate total cost for the request
function calculateCost(platforms) {
  let totalCost = PRICING.base_fee;
  
  platforms.forEach(platform => {
    totalCost += PRICING[platform] || 0;
  });
  
  return totalCost;
}

// ✅ Helper to check if subscription is active
function isSubscriptionActive(wallet) {
  if (!wallet.subscription_end_date || wallet.subscription_status !== 'active') {
    return false;
  }
  
  const endDate = new Date(wallet.subscription_end_date);
  const now = new Date();
  
  return endDate > now;
}

// ✅ POST route with wallet integration
router.post('/post', async (req, res) => {
  try {
    const { businessId, platforms, postContent, userEmail } = req.body;

    // Validate input
    if (!businessId || !platforms || !postContent || !userEmail) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: businessId, platforms, postContent, userEmail' 
      });
    }

    console.log(`[Social Post] Request for business: ${businessId}, platforms: ${platforms.join(', ')}`);

    // ✅ Calculate cost
    const cost = calculateCost(platforms);
    console.log(`[Social Post] Calculated cost: R${(cost / 100).toFixed(2)} (${cost} cents)`);

    // ✅ Get user's wallet
    const { db: walletDb } = await connectToDatabase();
    const walletCollection = walletDb.collection('user_wallets');
    
    let wallet = await walletCollection.findOne({ email: userEmail });

    // Create wallet if doesn't exist
    if (!wallet) {
      console.log('[Social Post] Creating new wallet for:', userEmail);
      wallet = {
        email: userEmail,
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
            metadata: { source: 'signup_bonus' }
          }
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await walletCollection.insertOne(wallet);
    }

    // ✅ Check if user has active subscription (unlimited posts)
    const hasActiveSubscription = isSubscriptionActive(wallet);

    if (!hasActiveSubscription) {
      // Check if user has sufficient balance
      if (wallet.balance < cost) {
        return res.status(402).json({ 
          success: false, 
          error: 'Insufficient funds',
          current_balance: wallet.balance,
          required: cost,
          formatted_balance: `R${(wallet.balance / 100).toFixed(2)}`,
          formatted_required: `R${(cost / 100).toFixed(2)}`,
          message: 'Please add credits or upgrade to a subscription plan.'
        });
      }
    }

    // ✅ Get business from MongoDB
    const db = await getDatabase();
    const business = await db.collection('store_submissions').findOne({
      _id: new ObjectId(businessId)
    });

    if (!business) {
      return res.status(404).json({ 
        success: false, 
        error: 'Business not found' 
      });
    }

    // Check if n8n webhook is configured
    const webhookUrl = business.automation_settings?.n8n_config?.webhook_url;
    
    if (!webhookUrl) {
      return res.status(400).json({ 
        success: false, 
        error: 'n8n webhook URL not configured. Please set it in Settings.' 
      });
    }

    // ✅ Build platform credentials object
    const platformCredentials = {};

    for (const platform of platforms) {
      const platformSettings = business.automation_settings?.social_media?.[platform];

      if (!platformSettings || !platformSettings.connected || platformSettings.status !== 'active') {
        console.warn(`[Social Post] ${platform} not connected or inactive`);
        continue;
      }

      const accessToken = decryptToken(platformSettings.access_token);

      if (!accessToken) {
        console.warn(`[Social Post] Failed to decrypt token for ${platform}`);
        continue;
      }

      if (platform === 'facebook') {
        platformCredentials.facebook = {
          access_token: accessToken,
          page_id: platformSettings.page_id,
          page_name: platformSettings.page_name
        };
      } else if (platform === 'instagram') {
        platformCredentials.instagram = {
          access_token: accessToken,
          account_id: platformSettings.account_id,
          username: platformSettings.username
        };
      } else if (platform === 'linkedin') {
        platformCredentials.linkedin = {
          access_token: accessToken,
          organization_id: platformSettings.organization_id,
          organization_name: platformSettings.organization_name
        };
      } else if (platform === 'youtube') {
        platformCredentials.youtube = {
          access_token: accessToken,
          refresh_token: decryptToken(platformSettings.refresh_token),
          channel_id: platformSettings.channel_id,
          channel_name: platformSettings.channel_name
        };
      }
    }

    if (Object.keys(platformCredentials).length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No active platform connections found for the requested platforms' 
      });
    }

    // ✅ Prepare payload for n8n
    const n8nPayload = {
      businessId: businessId,
      businessName: business.store_info?.name || 'Unknown Business',
      userEmail: userEmail,
      postContent: postContent,
      platforms: platformCredentials,
      timestamp: new Date().toISOString(),
      requestId: `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    console.log('[Social Post] Sending to n8n:', {
      url: webhookUrl,
      platforms: Object.keys(platformCredentials)
    });

    // ✅ Send to n8n webhook
    const n8nResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...(business.automation_settings?.n8n_config?.api_key && {
          'Authorization': `Bearer ${business.automation_settings.n8n_config.api_key}`
        })
      },
      body: JSON.stringify(n8nPayload)
    });

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text();
      console.error('[Social Post] n8n webhook failed:', errorText);
      throw new Error(`n8n webhook failed: ${n8nResponse.status} ${n8nResponse.statusText}`);
    }

    const n8nResult = await n8nResponse.json();

    console.log('[Social Post] n8n webhook success:', n8nResult);

    // ✅ Deduct from wallet (only if no active subscription)
    let walletTransaction = null;
    let newBalance = wallet.balance;

    if (!hasActiveSubscription) {
      newBalance = wallet.balance - cost;
      walletTransaction = {
        transaction_id: n8nPayload.requestId,
        type: 'debit',
        amount: cost,
        balance_after: newBalance,
        description: `Social media post to ${platforms.join(', ')}`,
        timestamp: new Date().toISOString(),
        metadata: {
          businessId: businessId,
          businessName: business.store_info?.name,
          platforms: platforms,
          pricing: PRICING,
          post_preview: postContent.text?.substring(0, 100) || 'No text'
        }
      };

      await walletCollection.updateOne(
        { email: userEmail },
        {
          $set: {
            balance: newBalance,
            updated_at: new Date().toISOString()
          },
          $push: { transactions: walletTransaction }
        }
      );

      console.log(`[Social Post] Deducted R${(cost / 100).toFixed(2)} from wallet. New balance: R${(newBalance / 100).toFixed(2)}`);
    } else {
      console.log(`[Social Post] User has active subscription (${wallet.current_plan}). No charge applied.`);
    }

    // ✅ Store post activity in MongoDB
    await db.collection('social_posts').insertOne({
      businessId: new ObjectId(businessId),
      userEmail: userEmail,
      platforms: platforms,
      postContent: postContent,
      cost: hasActiveSubscription ? 0 : cost,
      charged: !hasActiveSubscription,
      subscription_used: hasActiveSubscription,
      status: 'sent',
      n8nResponse: n8nResult,
      walletTransaction: walletTransaction,
      created_at: new Date()
    });

    res.json({
      success: true,
      message: 'Post sent to n8n successfully',
      platforms: Object.keys(platformCredentials),
      cost: hasActiveSubscription ? 0 : cost,
      charged: !hasActiveSubscription,
      formatted_cost: hasActiveSubscription ? 'Free (Subscription)' : `R${(cost / 100).toFixed(2)}`,
      new_balance: newBalance,
      formatted_balance: `R${(newBalance / 100).toFixed(2)}`,
      subscription_active: hasActiveSubscription,
      n8nResponse: n8nResult
    });

  } catch (error) {
    console.error('[Social Post] Error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ✅ Get pricing info
router.get('/pricing', (req, res) => {
  res.json({
    success: true,
    pricing: {
      facebook: { cents: PRICING.facebook, formatted: `R${(PRICING.facebook / 100).toFixed(2)}` },
      instagram: { cents: PRICING.instagram, formatted: `R${(PRICING.instagram / 100).toFixed(2)}` },
      linkedin: { cents: PRICING.linkedin, formatted: `R${(PRICING.linkedin / 100).toFixed(2)}` },
      youtube: { cents: PRICING.youtube, formatted: `R${(PRICING.youtube / 100).toFixed(2)}` },
      base_fee: { cents: PRICING.base_fee, formatted: `R${(PRICING.base_fee / 100).toFixed(2)}` }
    },
    note: 'Users with active subscriptions post for free'
  });
});

module.exports = router;