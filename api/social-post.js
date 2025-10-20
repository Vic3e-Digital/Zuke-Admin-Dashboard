// api/social-post.js
const express = require('express');
const router = express.Router();
const { getDatabase, connectToDatabase } = require('../lib/mongodb');
const { ObjectId } = require('mongodb');
const crypto = require('crypto');
const axios = require('axios');

// ✅ n8n Wallet Webhook URL
const N8N_WALLET_WEBHOOK = process.env.N8N_WALLET_WEBHOOK_URL;

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

// ✅ Encryption function (for storing refreshed tokens)
function encryptToken(token) {
  if (!token) return null;
  
  const algorithm = 'aes-256-cbc';
  const key = crypto.createHash('sha256').update(process.env.ENCRYPTION_SECRET || 'your-secret-key').digest();
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return `${iv.toString('hex')}:${encrypted}`;
}

// ✅ Pricing configuration (in ZAR)
const PRICING = {
  facebook: 10,     // R10.00 per post
  instagram: 10,    // R10.00 per post
  linkedin: 10,     // R10.00 per post
  youtube: 10,      // R10.00 per video upload
  base_fee: 0
};

// ✅ Calculate total cost for the request
function calculateCost(platforms) {
  let totalCost = PRICING.base_fee;
  
  platforms.forEach(platform => {
    totalCost += PRICING[platform] || 0;
  });
  
  return totalCost;
}

// ========================================
// TOKEN REFRESH FUNCTIONS
// ========================================

async function refreshYouTubeToken(platformSettings, businessId, db) {
  console.log('[YouTube] Checking token expiration...');
  
  const now = new Date();
  const expiresAt = new Date(platformSettings.expires_at);
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  if (expiresAt > fiveMinutesFromNow) {
    console.log('[YouTube] ✓ Token is still valid');
    return decryptToken(platformSettings.access_token);
  }

  console.log('[YouTube] ⟳ Token expired/expiring, refreshing...');

  try {
    const refreshToken = decryptToken(platformSettings.refresh_token);
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    });

    const newAccessToken = response.data.access_token;
    const expiresIn = response.data.expires_in || 3600;
    const newExpiresAt = new Date(Date.now() + expiresIn * 1000);

    await db.collection('store_submissions').updateOne(
      { _id: new ObjectId(businessId) },
      {
        $set: {
          'automation_settings.social_media.youtube.access_token': encryptToken(newAccessToken),
          'automation_settings.social_media.youtube.expires_at': newExpiresAt,
          'automation_settings.social_media.youtube.last_refreshed': new Date(),
          'automation_settings.social_media.youtube.status': 'active'
        }
      }
    );

    console.log('[YouTube] ✓ Token refreshed successfully');
    return newAccessToken;

  } catch (error) {
    console.error('[YouTube] ✗ Token refresh failed:', error.response?.data || error.message);

    await db.collection('store_submissions').updateOne(
      { _id: new ObjectId(businessId) },
      {
        $set: {
          'automation_settings.social_media.youtube.status': 'error',
          'automation_settings.social_media.youtube.error': 'Token refresh failed - please reconnect'
        }
      }
    );

    throw new Error('YouTube token expired. Please reconnect your YouTube account in Settings.');
  }
}

async function refreshFacebookToken(platformSettings, businessId, db) {
  console.log('[Facebook] Checking token expiration...');
  
  const now = new Date();
  const expiresAt = new Date(platformSettings.expires_at);
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  if (expiresAt > fiveMinutesFromNow) {
    console.log('[Facebook] ✓ Token is still valid');
    return decryptToken(platformSettings.access_token);
  }

  console.log('[Facebook] ⟳ Token expired/expiring, refreshing...');

  try {
    const currentToken = decryptToken(platformSettings.access_token);

    const response = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: process.env.FACEBOOK_APP_ID,
        client_secret: process.env.FACEBOOK_APP_SECRET,
        fb_exchange_token: currentToken
      }
    });

    const newAccessToken = response.data.access_token;
    const expiresIn = response.data.expires_in || 5184000;
    const newExpiresAt = new Date(Date.now() + expiresIn * 1000);

    await db.collection('store_submissions').updateOne(
      { _id: new ObjectId(businessId) },
      {
        $set: {
          'automation_settings.social_media.facebook.access_token': encryptToken(newAccessToken),
          'automation_settings.social_media.facebook.expires_at': newExpiresAt,
          'automation_settings.social_media.facebook.last_refreshed': new Date(),
          'automation_settings.social_media.facebook.status': 'active'
        }
      }
    );

    console.log('[Facebook] ✓ Token refreshed successfully');
    return newAccessToken;

  } catch (error) {
    console.error('[Facebook] ✗ Token refresh failed:', error.response?.data || error.message);

    await db.collection('store_submissions').updateOne(
      { _id: new ObjectId(businessId) },
      {
        $set: {
          'automation_settings.social_media.facebook.status': 'error',
          'automation_settings.social_media.facebook.error': 'Token refresh failed - please reconnect'
        }
      }
    );

    throw new Error('Facebook token expired. Please reconnect your Facebook page in Settings.');
  }
}

async function refreshInstagramToken(platformSettings, businessId, db) {
  // Instagram uses Facebook's token
  return await refreshFacebookToken(platformSettings, businessId, db);
}

async function refreshLinkedInToken(platformSettings, businessId, db) {
  console.log('[LinkedIn] Checking token expiration...');
  
  const now = new Date();
  const expiresAt = new Date(platformSettings.expires_at);
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  if (expiresAt > fiveMinutesFromNow) {
    console.log('[LinkedIn] ✓ Token is still valid');
    return decryptToken(platformSettings.access_token);
  }

  console.log('[LinkedIn] ⟳ Token expired/expiring, refreshing...');

  try {
    const refreshToken = decryptToken(platformSettings.refresh_token);
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', null, {
      params: {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const newAccessToken = response.data.access_token;
    const newRefreshToken = response.data.refresh_token;
    const expiresIn = response.data.expires_in || 5184000;
    const newExpiresAt = new Date(Date.now() + expiresIn * 1000);

    await db.collection('store_submissions').updateOne(
      { _id: new ObjectId(businessId) },
      {
        $set: {
          'automation_settings.social_media.linkedin.access_token': encryptToken(newAccessToken),
          'automation_settings.social_media.linkedin.refresh_token': encryptToken(newRefreshToken),
          'automation_settings.social_media.linkedin.expires_at': newExpiresAt,
          'automation_settings.social_media.linkedin.last_refreshed': new Date(),
          'automation_settings.social_media.linkedin.status': 'active'
        }
      }
    );

    console.log('[LinkedIn] ✓ Token refreshed successfully');
    return newAccessToken;

  } catch (error) {
    console.error('[LinkedIn] ✗ Token refresh failed:', error.response?.data || error.message);

    await db.collection('store_submissions').updateOne(
      { _id: new ObjectId(businessId) },
      {
        $set: {
          'automation_settings.social_media.linkedin.status': 'error',
          'automation_settings.social_media.linkedin.error': 'Token refresh failed - please reconnect'
        }
      }
    );

    throw new Error('LinkedIn token expired. Please reconnect your LinkedIn organization in Settings.');
  }
}

// ========================================
// MAIN POST ROUTE
// ========================================

router.post('/post', async (req, res) => {
  try {
    const { businessId, platforms, postContent, userEmail, totalCost, skipPosting, skipWalletCheck } = req.body;
    
    // Validate input
    if (!businessId || !platforms || !postContent || !userEmail) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: businessId, platforms, postContent, userEmail' 
      });
    }

    console.log(`[Social Post] Request for business: ${businessId}, platforms: ${platforms.join(', ')}`);

    // ✅ STEP 1: Calculate cost (use totalCost if provided)
    const cost = totalCost !== undefined ? totalCost : calculateCost(platforms);
    console.log(`[Social Post] ${totalCost !== undefined ? 'Total cost (incl. AI generation)' : 'Calculated cost'}: R${cost.toFixed(2)}`);

    // ✅ Generate requestId BEFORE wallet check (so it's always available)
    const requestId = `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // ✅ STEP 2: Get business from MongoDB
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
    
    if (!webhookUrl && !skipWalletCheck) {
      return res.status(400).json({ 
        success: false, 
        error: 'n8n webhook URL not configured. Please set it in Settings.' 
      });
    }

    // ✅ NEW: Skip wallet check if already charged
    let walletResult;
    if (skipWalletCheck) {
      console.log('[Social Post] ⊘ Skipping wallet check (already charged)');
      walletResult = { success: true, message: 'Wallet already charged' };
    } else if (cost > 0) {
      // ✅ STEP 3: Call n8n wallet webhook to check balance and deduct
      
      // ✅ CHECK: Ensure N8N_WALLET_WEBHOOK is configured
      if (!N8N_WALLET_WEBHOOK) {
        console.error('[Social Post] ✗ N8N_WALLET_WEBHOOK_URL is not set in environment variables');
        return res.status(500).json({
          success: false,
          error: 'Wallet service not configured. Please contact support.',
          details: 'N8N_WALLET_WEBHOOK_URL environment variable is missing'
        });
      }

      const walletPayload = {
        userEmail: userEmail,
        businessId: businessId,
        businessName: business.store_info?.name || 'Unknown Business',
        platforms: platforms,
        cost: cost,
        postContent: postContent,
        requestId: requestId,
        description: req.body.description || `Posting to ${platforms.join(', ')}`
      };

      console.log('[Social Post] 📤 Calling wallet webhook:', N8N_WALLET_WEBHOOK);
      console.log('[Social Post] 📦 Wallet payload:', JSON.stringify(walletPayload, null, 2));

      try {
        const walletResponse = await axios.post(N8N_WALLET_WEBHOOK, walletPayload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000, // 30 seconds
          validateStatus: function (status) {
            // ✅ Treat 402 as valid response (insufficient funds)
            return status >= 200 && status < 300 || status === 402;
          }
        });

        walletResult = walletResponse.data;
        
        console.log('[Social Post] 📥 Wallet response:', JSON.stringify(walletResult, null, 2));

        // ✅ Handle insufficient funds (402 status)
        if (walletResponse.status === 402 || !walletResult.success) {
          console.log('[Social Post] ⚠️ Insufficient funds:', walletResult);
          return res.status(402).json({
            success: false,
            error: 'Insufficient funds',
            current_balance: walletResult.current_balance,
            required: walletResult.required || cost,
            formatted_balance: walletResult.formatted_balance,
            formatted_required: walletResult.formatted_required || `R${cost.toFixed(2)}`,
            message: 'Please add credits or upgrade to a subscription plan.'
          });
        }

        console.log('[Social Post] ✓ Wallet deduction successful. New balance:', walletResult.formatted_balance);

        // ✅ If skipPosting is true, return after wallet deduction
        if (skipPosting) {
          console.log('[Social Post] skipPosting=true, returning after wallet deduction');
          
          return res.json({
            success: true,
            message: 'Wallet deducted successfully',
            cost: cost,
            charged: true,
            formatted_cost: `R${cost.toFixed(2)}`,
            new_balance: walletResult.new_balance,
            formatted_balance: walletResult.formatted_balance || `R${(walletResult.new_balance || 0).toFixed(2)}`
          });
        }

      } catch (walletError) {
        console.error('[Social Post] ✗ Wallet webhook error:');
        console.error('  - Error message:', walletError.message);
        console.error('  - Error code:', walletError.code);
        console.error('  - Response status:', walletError.response?.status);
        console.error('  - Response data:', JSON.stringify(walletError.response?.data, null, 2));
        console.error('  - Webhook URL:', N8N_WALLET_WEBHOOK);
        
        // More specific error messages
        let errorMessage = 'Wallet service unavailable. Please try again later.';
        let errorDetails = walletError.message;
        
        if (walletError.code === 'ECONNREFUSED') {
          errorMessage = 'Cannot connect to wallet service. Service may be down.';
          errorDetails = 'Connection refused to ' + N8N_WALLET_WEBHOOK;
        } else if (walletError.code === 'ETIMEDOUT' || walletError.message.includes('timeout')) {
          errorMessage = 'Wallet service timeout. Please try again.';
          errorDetails = 'Request timed out after 30 seconds';
        } else if (walletError.response?.status === 404) {
          errorMessage = 'Wallet webhook endpoint not found.';
          errorDetails = 'Check N8N_WALLET_WEBHOOK_URL configuration';
        }
        
        return res.status(503).json({
          success: false,
          error: errorMessage,
          details: errorDetails,
          webhook_url: N8N_WALLET_WEBHOOK.replace(/\/\/.*@/, '//***@') // Hide credentials
        });
      }

    // ... rest of the code continues (token refresh, n8n posting, etc.)
    }
    

    // ✅ STEP 4: Build platform credentials object WITH TOKEN REFRESH
    const platformCredentials = {};
    const tokenRefreshErrors = [];

    for (const platform of platforms) {
      const platformSettings = business.automation_settings?.social_media?.[platform];

      if (!platformSettings || !platformSettings.connected || platformSettings.status !== 'active') {
        console.warn(`[Social Post] ${platform} not connected or inactive`);
        tokenRefreshErrors.push(`${platform} is not connected`);
        continue;
      }

      try {
        let accessToken;

        // Refresh token if needed before getting credentials
        if (platform === 'youtube') {
          accessToken = await refreshYouTubeToken(platformSettings, businessId, db);
          platformCredentials.youtube = {
            access_token: accessToken,
            refresh_token: decryptToken(platformSettings.refresh_token),
            channel_id: platformSettings.channel_id,
            channel_name: platformSettings.channel_name
          };
        } else if (platform === 'facebook') {
          accessToken = await refreshFacebookToken(platformSettings, businessId, db);
          platformCredentials.facebook = {
            access_token: accessToken,
            page_id: platformSettings.page_id,
            page_name: platformSettings.page_name
          };
        } else if (platform === 'instagram') {
          accessToken = await refreshInstagramToken(platformSettings, businessId, db);
          platformCredentials.instagram = {
            access_token: accessToken,
            account_id: platformSettings.account_id,
            username: platformSettings.username
          };
        } else if (platform === 'linkedin') {
          accessToken = await refreshLinkedInToken(platformSettings, businessId, db);
          platformCredentials.linkedin = {
            access_token: accessToken,
            organization_id: platformSettings.organization_id,
            organization_name: platformSettings.organization_name
          };
        }

      } catch (error) {
        console.error(`[Social Post] Token refresh failed for ${platform}:`, error.message);
        tokenRefreshErrors.push(`${platform}: ${error.message}`);
      }
    }

    if (Object.keys(platformCredentials).length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No active platform connections found for the requested platforms',
        details: tokenRefreshErrors.length > 0 ? tokenRefreshErrors : undefined
      });
    }

    // ✅ STEP 5: Prepare payload for n8n posting workflow
    const n8nPayload = {
      businessId: businessId,
      businessName: business.store_info?.name || 'Unknown Business',
      userEmail: userEmail,
      postContent: postContent,
      platforms: platformCredentials,
      timestamp: new Date().toISOString(),
      requestId: requestId
    };

    console.log('[Social Post] Sending to n8n posting workflow:', {
      url: webhookUrl,
      platforms: Object.keys(platformCredentials)
    });

    // ✅ STEP 6: Send to n8n posting webhook
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
      console.error('[Social Post] n8n posting webhook failed:', errorText);
      
      // TODO: Consider refunding the user here if posting fails
      throw new Error(`n8n webhook failed: ${n8nResponse.status} ${n8nResponse.statusText}`);
    }

    const n8nResult = await n8nResponse.json();

    console.log('[Social Post] ✓ n8n posting webhook success:', n8nResult);

    // ✅ STEP 7: Store post activity in MongoDB
    await db.collection('social_posts').insertOne({
      businessId: new ObjectId(businessId),
      userEmail: userEmail,
      platforms: platforms,
      postContent: postContent,
      cost: cost,
      charged: true,
      status: 'sent',
      n8nResponse: n8nResult,
      requestId: requestId,
      token_refresh_warnings: tokenRefreshErrors.length > 0 ? tokenRefreshErrors : undefined,
      created_at: new Date()
    });


    // ✅ STEP 8: Return success response
    res.json({
      success: true,
      message: 'Post sent successfully and payment processed',
      platforms: Object.keys(platformCredentials),
      cost: cost,
      charged: true,
      formatted_cost: `R${cost.toFixed(2)}`,
      new_balance: walletResult.new_balance, // ✅ Add this
      formatted_balance: walletResult.formatted_balance || `R${(walletResult.new_balance || 0).toFixed(2)}`, // ✅ Add fallback
      token_refresh_warnings: tokenRefreshErrors.length > 0 ? tokenRefreshErrors : undefined,
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
// ✅ Get pricing info
router.get('/pricing', (req, res) => {
  res.json({
    success: true,
    pricing: {
      facebook: { amount: PRICING.facebook, formatted: `R${PRICING.facebook.toFixed(2)}` },
      instagram: { amount: PRICING.instagram, formatted: `R${PRICING.instagram.toFixed(2)}` },
      linkedin: { amount: PRICING.linkedin, formatted: `R${PRICING.linkedin.toFixed(2)}` },
      youtube: { amount: PRICING.youtube, formatted: `R${PRICING.youtube.toFixed(2)}` },
      base_fee: { amount: PRICING.base_fee, formatted: `R${PRICING.base_fee.toFixed(2)}` }
    }
  });
});

module.exports = router;