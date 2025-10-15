// api/business-settings.js
const express = require('express');
const router = express.Router();
const { getDatabase } = require('../lib/mongodb');
const { ObjectId } = require('mongodb');
const crypto = require('crypto');

// -------------------------
// Encryption Helpers
// -------------------------
function encryptToken(token) {
  if (!token) return null;
  
  const algorithm = 'aes-256-cbc';
  const key = crypto.createHash('sha256').update(process.env.ENCRYPTION_SECRET || 'your-secret-key').digest();
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
}

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

// -------------------------
// GET Business Settings
// -------------------------
router.get('/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;
    
    console.log(`[Settings] Fetching settings for business: ${businessId}`);
    
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

    res.json({
      success: true,
      automation_settings: business.automation_settings || {
        social_media: {
          facebook: { connected: false, status: 'disconnected' },
          instagram: { connected: false, status: 'disconnected' },
          linkedin: { connected: false, status: 'disconnected' }
        },
        n8n_config: {
          webhook_url: '',
          enabled: true
        },
        posting_preferences: {
          auto_post: false,
          default_post_time: '09:00',
          timezone: 'Africa/Johannesburg'
        }
      }
    });
  } catch (error) {
    console.error('[Settings] Error fetching business settings:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// -------------------------
// PATCH Business Settings - FIXED
// -------------------------
router.patch('/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;
    const updates = req.body;

    console.log(`[Settings] PATCH updating settings for business: ${businessId}`, updates);

    // Validate business ID
    if (!businessId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid business ID' 
      });
    }

    const db = await getDatabase();
    
    // ✅ Use $set with the updates object directly (which has dot notation keys)
    const result = await db.collection('store_submissions').findOneAndUpdate(
      { _id: new ObjectId(businessId) },
      { 
        $set: {
          ...updates,
          updated_at: new Date()
        }
      },
      { 
        returnDocument: 'after'
      }
    );

    if (!result.value) {
      return res.status(404).json({ 
        success: false, 
        error: 'Business not found' 
      });
    }

    console.log(`[Settings] PATCH successful for business: ${businessId}`);

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: result.value
    });
  } catch (error) {
    console.error('[Settings] Error updating business settings:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// -------------------------
// PUT Business Settings (Legacy - for full updates)
// -------------------------
router.put('/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;
    const { automation_settings } = req.body;

    console.log(`[Settings] PUT updating settings for business: ${businessId}`);

    // Encrypt sensitive tokens before storing
    if (automation_settings.social_media) {
      for (const platform in automation_settings.social_media) {
        const platformData = automation_settings.social_media[platform];
        
        if (platformData.access_token && !platformData.access_token.includes(':')) {
          platformData.access_token = encryptToken(platformData.access_token);
        }
      }
    }

    if (automation_settings.n8n_config?.api_key && 
        !automation_settings.n8n_config.api_key.includes(':')) {
      automation_settings.n8n_config.api_key = 
        encryptToken(automation_settings.n8n_config.api_key);
    }

    const db = await getDatabase();
    const result = await db.collection('store_submissions').updateOne(
      { _id: new ObjectId(businessId) },
      { 
        $set: { 
          automation_settings,
          updated_at: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Business not found' 
      });
    }

    res.json({
      success: true,
      message: 'Settings updated successfully'
    });
  } catch (error) {
    console.error('[Settings] Error updating business settings:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// -------------------------
// OAuth Connect Routes
// -------------------------

router.get('/auth/facebook/connect', async (req, res) => {
  const { businessId } = req.query;
  
  const fbAppId = process.env.FACEBOOK_APP_ID;
  const redirectUri = `${process.env.APP_URL}/api/business-settings/auth/facebook/callback`;
  
  const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
    `client_id=${fbAppId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${businessId}` +
    `&scope=pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish`;
  
  console.log(`[OAuth] Redirecting to Facebook auth for business: ${businessId}`);
  res.redirect(authUrl);
});

// ✅ FIXED: Facebook OAuth Callback
router.get('/auth/facebook/callback', async (req, res) => {
  try {
    const { code, state: businessId, page_id, user_token } = req.query;
    
    if (!code && !user_token) {
      throw new Error('No authorization code or token received');
    }

    console.log(`[OAuth] Facebook callback for business: ${businessId}`);

    let longLivedToken;

    if (user_token) {
      longLivedToken = user_token;
    } else {
      // Exchange code for access token
      const tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token?` +
        `client_id=${process.env.FACEBOOK_APP_ID}` +
        `&client_secret=${process.env.FACEBOOK_APP_SECRET}` +
        `&redirect_uri=${encodeURIComponent(process.env.APP_URL + '/api/business-settings/auth/facebook/callback')}` +
        `&code=${code}`;

      const tokenResponse = await fetch(tokenUrl);
      const tokenData = await tokenResponse.json();

      if (!tokenData.access_token) {
        throw new Error('Failed to get access token');
      }

      // Get long-lived token
      const longLivedUrl = `https://graph.facebook.com/v18.0/oauth/access_token?` +
        `grant_type=fb_exchange_token` +
        `&client_id=${process.env.FACEBOOK_APP_ID}` +
        `&client_secret=${process.env.FACEBOOK_APP_SECRET}` +
        `&fb_exchange_token=${tokenData.access_token}`;

      const longLivedResponse = await fetch(longLivedUrl);
      const longLivedData = await longLivedResponse.json();
      
      longLivedToken = longLivedData.access_token;
    }

    // Get user pages with picture
    const pagesUrl = `https://graph.facebook.com/v18.0/me/accounts?fields=id,name,category,access_token,picture.type(large)&access_token=${longLivedToken}`;
    const pagesResponse = await fetch(pagesUrl);
    const pagesData = await pagesResponse.json();

    if (!pagesData.data || pagesData.data.length === 0) {
      throw new Error('No Facebook pages found. Please create a Facebook page first.');
    }

    // Show page selector if needed
    if (!page_id && pagesData.data.length > 1) {
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Select Facebook Page</title>
          <link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: 'Hanken Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: #f8f9fa;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
            }
            .page-selector {
              background: white;
              border-radius: 12px;
              padding: 32px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.08);
              max-width: 480px;
              width: 100%;
              max-height: 85vh;
              overflow-y: auto;
            }
            h2 {
              margin: 0 0 8px 0;
              color: #2c3e50;
              font-size: 20px;
              font-weight: 600;
            }
            .subtitle {
              color: #666;
              margin-bottom: 24px;
              font-size: 14px;
            }
            .page-option {
              display: flex;
              align-items: center;
              gap: 14px;
              padding: 14px;
              margin: 8px 0;
              border: 1px solid #e0e0e0;
              border-radius: 8px;
              cursor: pointer;
              transition: all 0.15s ease;
            }
            .page-option:hover {
              border-color: #1877F2;
              background: #f8fbff;
            }
            .page-logo {
              width: 48px;
              height: 48px;
              border-radius: 8px;
              object-fit: cover;
              flex-shrink: 0;
            }
            .page-info {
              flex: 1;
              min-width: 0;
            }
            .page-name {
              font-weight: 500;
              color: #2c3e50;
              font-size: 15px;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .page-category {
              font-size: 13px;
              color: #999;
            }
            .select-btn {
              padding: 8px 16px;
              background: #1877F2;
              color: white;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-weight: 500;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="page-selector">
            <h2>Select Facebook Page</h2>
            <p class="subtitle">Choose which page you want to connect</p>
            ${pagesData.data.map(page => `
              <div class="page-option" onclick="selectPage('${page.id}', '${page.access_token}')">
                <img src="${page.picture?.data?.url || ''}" alt="${page.name}" class="page-logo" />
                <div class="page-info">
                  <div class="page-name">${page.name}</div>
                  <div class="page-category">${page.category || 'Page'}</div>
                </div>
                <button class="select-btn">Select</button>
              </div>
            `).join('')}
          </div>
          <script>
            function selectPage(pageId, pageAccessToken) {
              const url = new URL(window.location.href);
              url.searchParams.delete('code');
              url.searchParams.set('page_id', pageId);
              url.searchParams.set('user_token', '${longLivedToken}');
              window.location.href = url.toString();
            }
          </script>
        </body>
        </html>
      `);
    }

    // Get selected page
    let selectedPage = pagesData.data[0];
    if (page_id) {
      selectedPage = pagesData.data.find(p => p.id === page_id) || selectedPage;
    }

    const pageAccessToken = selectedPage.access_token;

    if (!pageAccessToken) {
      throw new Error('Failed to get page access token');
    }

    const expiresAt = new Date(Date.now() + (60 * 24 * 60 * 60 * 1000)); // 60 days

    const db = await getDatabase();
    const business = await db.collection('store_submissions').findOne({
      _id: new ObjectId(businessId)
    });

    // ✅ FIX: Only use dot notation - NEVER set parent object
    const updateFields = {
      'automation_settings.social_media.facebook.connected': true,
      'automation_settings.social_media.facebook.access_token': encryptToken(pageAccessToken),
      'automation_settings.social_media.facebook.page_id': selectedPage.id,
      'automation_settings.social_media.facebook.page_name': selectedPage.name,
      'automation_settings.social_media.facebook.page_category': selectedPage.category || '',
      'automation_settings.social_media.facebook.page_picture': selectedPage.picture?.data?.url || '',
      'automation_settings.social_media.facebook.expires_at': expiresAt,
      'automation_settings.social_media.facebook.last_refreshed': new Date(),
      'automation_settings.social_media.facebook.status': 'active',
      'updated_at': new Date()
    };

    // ✅ Only preserve existing n8n_node_id if it exists
    if (business?.automation_settings?.social_media?.facebook?.n8n_node_id) {
      updateFields['automation_settings.social_media.facebook.n8n_node_id'] = 
        business.automation_settings.social_media.facebook.n8n_node_id;
    } else {
      updateFields['automation_settings.social_media.facebook.n8n_node_id'] = '';
    }

    // ✅ If automation_settings doesn't exist, initialize other platforms too
    if (!business.automation_settings) {
      updateFields['automation_settings.social_media.instagram'] = { 
        connected: false, 
        status: 'disconnected' 
      };
      updateFields['automation_settings.social_media.linkedin'] = { 
        connected: false, 
        status: 'disconnected' 
      };
      updateFields['automation_settings.n8n_config'] = {
        webhook_url: '',
        enabled: true
      };
      updateFields['automation_settings.posting_preferences'] = {
        auto_post: false,
        default_post_time: '09:00',
        timezone: 'Africa/Johannesburg'
      };
    }

    // Update MongoDB
    const updateResult = await db.collection('store_submissions').updateOne(
      { _id: new ObjectId(businessId) },
      { $set: updateFields }
    );

    console.log(`[OAuth] Facebook connected - Business: ${businessId}, Page: ${selectedPage.name}`, {
      matchedCount: updateResult.matchedCount,
      modifiedCount: updateResult.modifiedCount
    });

    // Success page
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Connected</title>
        <link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          body {
            font-family: 'Hanken Grotesk', sans-serif;
            background: #f8f9fa;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          .success-card {
            background: white;
            border-radius: 12px;
            padding: 40px;
            text-align: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            max-width: 380px;
          }
          .success-icon {
            width: 64px;
            height: 64px;
            background: #10b981;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 20px;
            font-size: 32px;
            color: white;
          }
          h2 {
            color: #2c3e50;
            margin: 0 0 12px 0;
            font-size: 20px;
            font-weight: 600;
          }
          .page-name {
            font-weight: 500;
            color: #2c3e50;
            font-size: 15px;
                    }
          .page-category {
            font-size: 13px;
            color: #999;
            margin-top: 4px;
          }
          p {
            color: #999;
            font-size: 13px;
            margin-top: 16px;
          }
        </style>
      </head>
      <body>
        <div class="success-card">
          <div class="success-icon">✓</div>
          <h2>Connected Successfully</h2>
          <div class="page-name">${selectedPage.name}</div>
          <div class="page-category">${selectedPage.category || 'Facebook Page'}</div>
          <p>This window will close automatically...</p>
        </div>
        <script>
          window.opener.postMessage({ 
            type: 'oauth-success', 
            platform: 'facebook',
            pageName: '${selectedPage.name}'
          }, '*');
          setTimeout(() => window.close(), 2000);
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('[OAuth] Facebook error:', error);
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Connection Failed</title>
        <link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          body {
            font-family: 'Hanken Grotesk', sans-serif;
            background: #f8f9fa;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          .error-card {
            background: white;
            border-radius: 12px;
            padding: 40px;
            text-align: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            max-width: 380px;
          }
          .error-icon {
            width: 64px;
            height: 64px;
            background: #ef4444;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 20px;
            font-size: 32px;
            color: white;
          }
          h2 {
            color: #2c3e50;
            margin: 0 0 12px 0;
            font-size: 20px;
            font-weight: 600;
          }
          .error-message {
            color: #666;
            font-size: 14px;
            padding: 16px;
            background: #fef2f2;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 3px solid #ef4444;
          }
          p {
            color: #999;
            font-size: 13px;
          }
        </style>
      </head>
      <body>
        <div class="error-card">
          <div class="error-icon">✗</div>
          <h2>Connection Failed</h2>
          <div class="error-message">${error.message}</div>
          <p>This window will close automatically...</p>
        </div>
        <script>
          window.opener.postMessage({ 
            type: 'oauth-error', 
            platform: 'facebook',
            error: '${error.message.replace(/'/g, "\\'")}'
          }, '*');
          setTimeout(() => window.close(), 3500);
        </script>
      </body>
      </html>
    `);
  }
});

// -------------------------
// Instagram OAuth Connect
// -------------------------
router.get('/auth/instagram/connect', async (req, res) => {
  const { businessId } = req.query;
  
  const fbAppId = process.env.FACEBOOK_APP_ID;
  const redirectUri = `${process.env.APP_URL}/api/business-settings/auth/instagram/callback`;
  
  const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
    `client_id=${fbAppId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${businessId}` +
    `&scope=instagram_basic,instagram_content_publish,pages_read_engagement`;
  
  console.log(`[OAuth] Redirecting to Instagram auth for business: ${businessId}`);
  res.redirect(authUrl);
});


// ✅ UPDATED: Instagram OAuth Callback with Page Selector
router.get('/auth/instagram/callback', async (req, res) => {
    try {
      const { code, state: businessId, ig_account_id, user_token } = req.query;
      
      if (!code && !user_token) {
        throw new Error('No authorization code or token received');
      }
  
      console.log(`[OAuth] Instagram callback for business: ${businessId}`);
  
      let accessToken;
  
      // If we have user_token, it means we're coming back from account selection
      if (user_token) {
        accessToken = user_token;
      } else {
        // First time: Exchange code for access token
        const tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token?` +
          `client_id=${process.env.FACEBOOK_APP_ID}` +
          `&client_secret=${process.env.FACEBOOK_APP_SECRET}` +
          `&redirect_uri=${encodeURIComponent(process.env.APP_URL + '/api/business-settings/auth/instagram/callback')}` +
          `&code=${code}`;
  
        const tokenResponse = await fetch(tokenUrl);
        const tokenData = await tokenResponse.json();
  
        if (!tokenData.access_token) {
          throw new Error('Failed to get access token');
        }
  
        accessToken = tokenData.access_token;
      }
  
      // Get all Facebook Pages with Instagram Business Accounts
      const pagesUrl = `https://graph.facebook.com/v18.0/me/accounts?fields=id,name,instagram_business_account{id,username,name,profile_picture_url},picture.type(large)&access_token=${accessToken}`;
      const pagesResponse = await fetch(pagesUrl);
      const pagesData = await pagesResponse.json();
  
      if (!pagesData.data || pagesData.data.length === 0) {
        throw new Error('No Facebook pages found.');
      }
  
      // Filter pages that have Instagram Business accounts
      const pagesWithInstagram = pagesData.data.filter(page => page.instagram_business_account);
  
      if (pagesWithInstagram.length === 0) {
        throw new Error('No Instagram Business Accounts found. Please connect an Instagram Business account to one of your Facebook Pages first.');
      }
  
      console.log(`[OAuth] Found ${pagesWithInstagram.length} Instagram Business account(s)`);
  
      // ✅ If no ig_account_id provided and multiple accounts, show selector
      if (!ig_account_id && pagesWithInstagram.length > 1) {
        return res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Select Instagram Account</title>
            <link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
            <style>
              * { 
                box-sizing: border-box; 
                margin: 0; 
                padding: 0; 
              }
              body {
                font-family: 'Hanken Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: #f8f9fa;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
              }
              .account-selector {
                background: white;
                border-radius: 12px;
                padding: 32px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                max-width: 480px;
                width: 100%;
                max-height: 85vh;
                overflow-y: auto;
              }
              h2 {
                margin: 0 0 8px 0;
                color: #2c3e50;
                font-size: 20px;
                font-weight: 600;
              }
              .subtitle {
                color: #666;
                margin-bottom: 24px;
                font-size: 14px;
                line-height: 1.5;
              }
              .account-option {
                display: flex;
                align-items: center;
                gap: 14px;
                padding: 14px;
                margin: 8px 0;
                border: 1px solid #e0e0e0;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.15s ease;
                background: white;
              }
              .account-option:hover {
                border-color: #E1306C;
                background: linear-gradient(135deg, #fff5f8 0%, #ffeef5 100%);
              }
              .account-logo {
                width: 48px;
                height: 48px;
                border-radius: 50%;
                object-fit: cover;
                flex-shrink: 0;
                background: linear-gradient(45deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%);
                border: 2px solid #fff;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              }
              .account-info {
                flex: 1;
                min-width: 0;
              }
              .account-name {
                font-weight: 500;
                color: #2c3e50;
                margin-bottom: 3px;
                font-size: 15px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              }
              .account-username {
                font-size: 13px;
                color: #999;
              }
              .page-badge {
                font-size: 11px;
                color: #666;
                background: #f0f0f0;
                padding: 3px 8px;
                border-radius: 4px;
                margin-top: 4px;
                display: inline-block;
              }
              .select-btn {
                padding: 8px 16px;
                background: linear-gradient(45deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%);
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 500;
                font-size: 14px;
                transition: transform 0.15s ease;
                flex-shrink: 0;
              }
              .select-btn:hover {
                transform: scale(1.05);
              }
            </style>
          </head>
          <body>
            <div class="account-selector">
              <h2>Select Instagram Account</h2>
              <p class="subtitle">Choose which Instagram Business account you want to connect</p>
              ${pagesWithInstagram.map(page => {
                const igAccount = page.instagram_business_account;
                return `
                  <div class="account-option" onclick="selectAccount('${igAccount.id}')">
                    <img src="${igAccount.profile_picture_url || page.picture?.data?.url || ''}" 
                         alt="${igAccount.username}" 
                         class="account-logo"
                         onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 48 48%22%3E%3Ccircle fill=%22%23E1306C%22 cx=%2224%22 cy=%2224%22 r=%2224%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22white%22 font-size=%2220%22 font-weight=%22bold%22%3E${igAccount.username.charAt(0).toUpperCase()}%3C/text%3E%3C/svg%3E'"
                    />
                    <div class="account-info">
                      <div class="account-name">${igAccount.name || igAccount.username}</div>
                      <div class="account-username">@${igAccount.username}</div>
                      <span class="page-badge">via ${page.name}</span>
                    </div>
                    <button class="select-btn">Select</button>
                  </div>
                `;
              }).join('')}
            </div>
            
            <script>
              function selectAccount(igAccountId) {
                const url = new URL(window.location.href);
                url.searchParams.delete('code');
                url.searchParams.set('ig_account_id', igAccountId);
                url.searchParams.set('user_token', '${accessToken}');
                window.location.href = url.toString();
              }
            </script>
          </body>
          </html>
        `);
      }
  
      // ✅ Get the selected Instagram account or use first/only account
      let selectedPage = pagesWithInstagram[0];
      if (ig_account_id) {
        selectedPage = pagesWithInstagram.find(p => p.instagram_business_account.id === ig_account_id) || selectedPage;
      }
  
      const igAccount = selectedPage.instagram_business_account;
  
      if (!igAccount) {
        throw new Error('Failed to get Instagram account details');
      }
  
      // Calculate expiry
      const expiresAt = new Date(Date.now() + (60 * 24 * 60 * 60 * 1000)); // 60 days
  
      const db = await getDatabase();
      const business = await db.collection('store_submissions').findOne({
        _id: new ObjectId(businessId)
      });
  
      // ✅ Store Instagram account details
      const updateFields = {
        'automation_settings.social_media.instagram.connected': true,
        'automation_settings.social_media.instagram.access_token': encryptToken(accessToken),
        'automation_settings.social_media.instagram.account_id': igAccount.id,
        'automation_settings.social_media.instagram.username': igAccount.username || '',
        'automation_settings.social_media.instagram.account_name': igAccount.name || igAccount.username || '',
        'automation_settings.social_media.instagram.profile_picture': igAccount.profile_picture_url || '',
        'automation_settings.social_media.instagram.connected_page_id': selectedPage.id,
        'automation_settings.social_media.instagram.connected_page_name': selectedPage.name,
        'automation_settings.social_media.instagram.expires_at': expiresAt,
        'automation_settings.social_media.instagram.last_refreshed': new Date(),
        'automation_settings.social_media.instagram.status': 'active',
        'updated_at': new Date()
      };
  
      // Initialize other platforms if needed
      if (!business.automation_settings) {
        updateFields['automation_settings.social_media.facebook'] = { 
          connected: false, 
          status: 'disconnected' 
        };
        updateFields['automation_settings.social_media.linkedin'] = { 
          connected: false, 
          status: 'disconnected' 
        };
        updateFields['automation_settings.n8n_config'] = {
          webhook_url: '',
          enabled: true
        };
        updateFields['automation_settings.posting_preferences'] = {
          auto_post: false,
          default_post_time: '09:00',
          timezone: 'Africa/Johannesburg'
        };
      }
  
      await db.collection('store_submissions').updateOne(
        { _id: new ObjectId(businessId) },
        { $set: updateFields }
      );
  
      console.log(`[OAuth] Instagram connected - Business: ${businessId}, Account: @${igAccount.username}`);
  
      // Success page
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Connected</title>
          <link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
          <style>
            body {
              font-family: 'Hanken Grotesk', sans-serif;
              background: #f8f9fa;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
            }
            .success-card {
              background: white;
              border-radius: 12px;
              padding: 40px;
              text-align: center;
              box-shadow: 0 2px 8px rgba(0,0,0,0.08);
              max-width: 380px;
            }
            .success-icon {
              width: 64px;
              height: 64px;
              background: linear-gradient(45deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%);
              border-radius: 50%;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              margin-bottom: 20px;
              font-size: 32px;
              color: white;
            }
            h2 {
              color: #2c3e50;
              margin: 0 0 12px 0;
              font-size: 20px;
              font-weight: 600;
            }
            .account-info {
              background: #f8f9fa;
              padding: 16px;
              border-radius: 8px;
              margin: 20px 0;
            }
            .account-name {
              font-weight: 500;
              color: #2c3e50;
              font-size: 15px;
              margin-bottom: 4px;
            }
            .account-username {
              font-size: 13px;
              color: #999;
              margin-bottom: 8px;
            }
            .page-badge {
              font-size: 11px;
              color: #666;
              background: #fff;
              padding: 4px 10px;
              border-radius: 4px;
              display: inline-block;
            }
            p {
              color: #999;
              font-size: 13px;
              margin-top: 16px;
            }
          </style>
        </head>
        <body>
          <div class="success-card">
            <div class="success-icon">✓</div>
            <h2>Instagram Connected</h2>
            <div class="account-info">
              <div class="account-name">${igAccount.name || igAccount.username}</div>
              <div class="account-username">@${igAccount.username}</div>
              <span class="page-badge">via ${selectedPage.name}</span>
            </div>
            <p>This window will close automatically...</p>
          </div>
          <script>
            window.opener.postMessage({ 
              type: 'oauth-success', 
              platform: 'instagram',
              username: '${igAccount.username}'
            }, '*');
            setTimeout(() => window.close(), 2000);
          </script>
        </body>
        </html>
      `);
    } catch (error) {
      console.error('[OAuth] Instagram error:', error);
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Connection Failed</title>
          <link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
          <style>
            body {
              font-family: 'Hanken Grotesk', sans-serif;
              background: #f8f9fa;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
            }
            .error-card {
              background: white;
              border-radius: 12px;
              padding: 40px;
              text-align: center;
              box-shadow: 0 2px 8px rgba(0,0,0,0.08);
              max-width: 380px;
            }
            .error-icon {
              width: 64px;
              height: 64px;
              background: #ef4444;
              border-radius: 50%;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              margin-bottom: 20px;
              font-size: 32px;
              color: white;
            }
            h2 {
              color: #2c3e50;
              margin: 0 0 12px 0;
              font-size: 20px;
              font-weight: 600;
            }
            .error-message {
              color: #666;
              font-size: 14px;
              padding: 16px;
              background: #fef2f2;
              border-radius: 8px;
              margin: 20px 0;
              border-left: 3px solid #ef4444;
            }
            p {
              color: #999;
              font-size: 13px;
            }
          </style>
        </head>
        <body>
          <div class="error-card">
            <div class="error-icon">✗</div>
            <h2>Connection Failed</h2>
            <div class="error-message">${error.message}</div>
            <p>This window will close automatically...</p>
          </div>
          <script>
            window.opener.postMessage({ 
              type: 'oauth-error', 
              platform: 'instagram',
              error: '${error.message.replace(/'/g, "\\'")}'
            }, '*');
            setTimeout(() => window.close(), 3500);
          </script>
        </body>
        </html>
      `);
    }
  });



// -------------------------
// LinkedIn Organization OAuth Connect
// -------------------------
router.get('/auth/linkedin/connect', async (req, res) => {
  const { businessId } = req.query;
  
  const linkedInClientId = process.env.LINKEDIN_CLIENT_ID;
  const redirectUri = `${process.env.APP_URL}/api/business-settings/auth/linkedin/callback`;
  
  // ✅ Scopes for managing LinkedIn Organization Pages
  const scopes = [
    'rw_organization_admin',      // Required to manage organizations
    'w_organization_social',      // Required to post on organization's behalf
    'r_organization_social',      // Read organization's posts and engagement
    'r_organization_social_feed', // Read comments/reactions
    'r_basicprofile'              // Basic profile info of the authorizing user
  ].join(' ');
  
  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?` +
    `response_type=code` +
    `&client_id=${linkedInClientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${businessId}` +
    `&scope=${encodeURIComponent(scopes)}`;
  
  console.log('[OAuth] LinkedIn Organization Auth URL:', authUrl);
  
  res.redirect(authUrl);
});


// -------------------------
// LinkedIn Organization OAuth Callback - FIXED
// -------------------------
router.get('/auth/linkedin/callback', async (req, res) => {
    try {
      const { code, state: businessId, org_id, user_token, error, error_description } = req.query;
      
      if (error) {
        throw new Error(error_description || `LinkedIn error: ${error}`);
      }
      
      if (!code && !user_token) {
        throw new Error('No authorization code or token received');
      }
  
      console.log(`[OAuth] LinkedIn callback for business: ${businessId}`);
  
      let accessToken;
  
      // If we have user_token, it means we're coming back from organization selection
      if (user_token) {
        accessToken = user_token;
      } else {
        // First time: Exchange code for access token
        const redirectUri = `${process.env.APP_URL}/api/business-settings/auth/linkedin/callback`;
  
        const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: redirectUri,
            client_id: process.env.LINKEDIN_CLIENT_ID,
            client_secret: process.env.LINKEDIN_CLIENT_SECRET
          })
        });
  
        const tokenData = await tokenResponse.json();
  
        if (!tokenData.access_token) {
          throw new Error(tokenData.error_description || 'Failed to get access token');
        }
  
        accessToken = tokenData.access_token;
      }
  
      // Get user's basic profile
      const profileResponse = await fetch('https://api.linkedin.com/v2/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'LinkedIn-Version': '202409'
        }
      });
  
      if (!profileResponse.ok) {
        throw new Error('Failed to fetch user profile');
      }
  
      const profileData = await profileResponse.json();
  
      // ✅ UPDATED: Simpler API call without complex projection
      const orgsResponse = await fetch(
        `https://api.linkedin.com/v2/organizationalEntityAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'LinkedIn-Version': '202409'
          }
        }
      );
  
      if (!orgsResponse.ok) {
        const errorText = await orgsResponse.text();
        console.error('[OAuth] Failed to fetch organizations:', errorText);
        throw new Error('Failed to fetch organizations. Make sure you have admin access to at least one LinkedIn company page.');
      }
  
      const orgsData = await orgsResponse.json();
      
      // ✅ Debug log to see actual response structure
      console.log('[OAuth] Organizations API response:', JSON.stringify(orgsData, null, 2));
  
      if (!orgsData.elements || orgsData.elements.length === 0) {
        throw new Error('No LinkedIn company pages found. You must be an admin of at least one LinkedIn company page to connect.');
      }
  
      // ✅ UPDATED: Fetch organization details separately for each org
      const organizations = [];
      
      for (const element of orgsData.elements) {
        const orgUrn = element.organizationalTarget;
        
        // Extract organization ID from URN (e.g., "urn:li:organization:12345678" -> "12345678")
        const orgId = orgUrn.split(':').pop();
        
        try {
          // Fetch organization details
          const orgDetailsResponse = await fetch(
            `https://api.linkedin.com/v2/organizations/${orgId}`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'LinkedIn-Version': '202409'
              }
            }
          );
  
          if (orgDetailsResponse.ok) {
            const orgDetails = await orgDetailsResponse.json();
            
            console.log('[OAuth] Organization details:', JSON.stringify(orgDetails, null, 2));
            
            // Extract localized name
            const localizedName = orgDetails.localizedName || 
                                 orgDetails.name?.localized?.en_US || 
                                 orgDetails.name ||
                                 'Unknown Organization';
            
            // Extract vanity name
            const vanityName = orgDetails.vanityName || '';
            
            // Extract logo
            let logo = '';
            if (orgDetails.logoV2) {
              // Try to get the original image
              const original = orgDetails.logoV2['original~'];
              if (original && original.elements && original.elements.length > 0) {
                const firstElement = original.elements[0];
                if (firstElement.identifiers && firstElement.identifiers.length > 0) {
                  logo = firstElement.identifiers[0].identifier;
                }
              }
            }
            
            organizations.push({
              id: orgUrn,
              name: localizedName,
              vanityName: vanityName,
              logo: logo
            });
          } else {
            console.warn(`[OAuth] Failed to fetch details for organization ${orgId}`);
            // Add with minimal info
            organizations.push({
              id: orgUrn,
              name: `Organization ${orgId}`,
              vanityName: '',
              logo: ''
            });
          }
        } catch (err) {
          console.error(`[OAuth] Error fetching organization ${orgId}:`, err);
          // Add with minimal info
          organizations.push({
            id: orgUrn,
            name: `Organization ${orgId}`,
            vanityName: '',
            logo: ''
          });
        }
      }
  
      console.log(`[OAuth] Found ${organizations.length} organization(s):`, organizations.map(o => o.name));
  
      if (organizations.length === 0) {
        throw new Error('Could not retrieve organization details. Please try again.');
      }
  
      // ✅ If no org_id provided and multiple organizations, show selector
      if (!org_id && organizations.length > 1) {
        return res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Select LinkedIn Organization</title>
            <link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
            <style>
              * { 
                box-sizing: border-box; 
                margin: 0; 
                padding: 0; 
              }
              body {
                font-family: 'Hanken Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: #f8f9fa;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
              }
              .org-selector {
                background: white;
                border-radius: 12px;
                padding: 32px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                max-width: 480px;
                width: 100%;
                max-height: 85vh;
                overflow-y: auto;
              }
              h2 {
                margin: 0 0 8px 0;
                color: #2c3e50;
                font-size: 20px;
                font-weight: 600;
              }
              .subtitle {
                color: #666;
                margin-bottom: 24px;
                font-size: 14px;
                line-height: 1.5;
              }
              .org-option {
                display: flex;
                align-items: center;
                gap: 14px;
                padding: 14px;
                margin: 8px 0;
                border: 1px solid #e0e0e0;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.15s ease;
                background: white;
              }
              .org-option:hover {
                border-color: #0A66C2;
                background: #f0f7ff;
              }
              .org-logo {
                width: 48px;
                height: 48px;
                border-radius: 8px;
                object-fit: cover;
                flex-shrink: 0;
                background: #E0F2FF;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #0A66C2;
                font-weight: 600;
                font-size: 18px;
              }
              .org-info {
                flex: 1;
                min-width: 0;
              }
              .org-name {
                font-weight: 500;
                color: #2c3e50;
                margin-bottom: 3px;
                font-size: 15px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              }
              .org-vanity {
                font-size: 13px;
                color: #999;
              }
              .select-btn {
                padding: 8px 16px;
                background: #0A66C2;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 500;
                font-size: 14px;
                transition: background 0.15s ease;
                flex-shrink: 0;
              }
              .select-btn:hover {
                background: #004182;
              }
            </style>
          </head>
          <body>
            <div class="org-selector">
              <h2>Select LinkedIn Organization</h2>
              <p class="subtitle">Choose which company page you want to connect</p>
              ${organizations.map(org => `
                <div class="org-option" onclick="selectOrganization('${org.id.replace(/'/g, "\\'")}')">
                  ${org.logo ? 
                    `<img src="${org.logo}" alt="${org.name}" class="org-logo" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                     <div class="org-logo" style="display:none;">${org.name.charAt(0).toUpperCase()}</div>` :
                    `<div class="org-logo">${org.name.charAt(0).toUpperCase()}</div>`
                  }
                  <div class="org-info">
                    <div class="org-name">${org.name}</div>
                    <div class="org-vanity">${org.vanityName ? `linkedin.com/company/${org.vanityName}` : 'Company Page'}</div>
                  </div>
                  <button class="select-btn">Select</button>
                </div>
              `).join('')}
            </div>
            
            <script>
              function selectOrganization(orgId) {
                const url = new URL(window.location.href);
                url.searchParams.delete('code');
                url.searchParams.set('org_id', encodeURIComponent(orgId));
                url.searchParams.set('user_token', '${accessToken}');
                window.location.href = url.toString();
              }
            </script>
          </body>
          </html>
        `);
      }
  
      // ✅ Get the selected organization or use first/only organization
      let selectedOrg = organizations[0];
      if (org_id) {
        selectedOrg = organizations.find(o => o.id === decodeURIComponent(org_id)) || selectedOrg;
      }
  
      const expiresIn = 5184000; // 60 days
      const expiresAt = new Date(Date.now() + (expiresIn * 1000));
  
      const db = await getDatabase();
      const business = await db.collection('store_submissions').findOne({
        _id: new ObjectId(businessId)
      });
  
      // Store LinkedIn organization connection
      const updateFields = {
        'automation_settings.social_media.linkedin.connected': true,
        'automation_settings.social_media.linkedin.access_token': encryptToken(accessToken),
        'automation_settings.social_media.linkedin.organization_id': selectedOrg.id,
        'automation_settings.social_media.linkedin.organization_name': selectedOrg.name,
        'automation_settings.social_media.linkedin.organization_vanity': selectedOrg.vanityName,
        'automation_settings.social_media.linkedin.organization_logo': selectedOrg.logo || '',
        'automation_settings.social_media.linkedin.authorized_user_id': profileData.id,
        'automation_settings.social_media.linkedin.expires_at': expiresAt,
        'automation_settings.social_media.linkedin.last_refreshed': new Date(),
        'automation_settings.social_media.linkedin.status': 'active',
        'automation_settings.social_media.linkedin.type': 'organization',
        'updated_at': new Date()
      };
  
      if (!business.automation_settings) {
        updateFields['automation_settings.social_media.facebook'] = { 
          connected: false, status: 'disconnected' 
        };
        updateFields['automation_settings.social_media.instagram'] = { 
          connected: false, status: 'disconnected' 
        };
        updateFields['automation_settings.n8n_config'] = {
          webhook_url: '', enabled: true
        };
        updateFields['automation_settings.posting_preferences'] = {
          auto_post: false,
          default_post_time: '09:00',
          timezone: 'Africa/Johannesburg'
        };
      }
  
      await db.collection('store_submissions').updateOne(
        { _id: new ObjectId(businessId) },
        { $set: updateFields }
      );
  
      console.log(`[OAuth] LinkedIn Organization connected - Business: ${businessId}, Org: ${selectedOrg.name}`);
  
      // Success page
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Connected</title>
          <link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
          <style>
            body {
              font-family: 'Hanken Grotesk', sans-serif;
              background: #f8f9fa;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
            }
            .success-card {
              background: white;
              border-radius: 12px;
              padding: 40px;
              text-align: center;
              box-shadow: 0 2px 8px rgba(0,0,0,0.08);
              max-width: 400px;
            }
            .success-icon {
              width: 64px;
              height: 64px;
              background: #0A66C2;
              border-radius: 50%;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              margin-bottom: 20px;
              font-size: 32px;
              color: white;
            }
            h2 { 
              color: #2c3e50; 
              margin: 0 0 12px 0;
              font-size: 20px;
              font-weight: 600;
            }
            .org-info {
              background: #f8f9fa;
              padding: 16px;
              border-radius: 8px;
              margin: 20px 0;
            }
            .org-name { 
              font-weight: 600; 
              color: #2c3e50; 
              font-size: 16px;
              margin-bottom: 6px;
            }
            .org-type {
              font-size: 12px;
              color: #666;
              background: #fff;
              padding: 4px 10px;
              border-radius: 12px;
              display: inline-block;
            }
            p { 
              color: #999; 
              font-size: 13px; 
            }
          </style>
        </head>
        <body>
          <div class="success-card">
            <div class="success-icon">✓</div>
            <h2>LinkedIn Page Connected</h2>
            <div class="org-info">
              <div class="org-name">${selectedOrg.name}</div>
              <span class="org-type">Company Page</span>
            </div>
            <p>You can now post on behalf of this organization</p>
            <p style="margin-top: 16px;">This window will close automatically...</p>
          </div>
          <script>
            window.opener.postMessage({ 
              type: 'oauth-success', 
              platform: 'linkedin',
              organizationName: '${selectedOrg.name.replace(/'/g, "\\'")}'
            }, '*');
            setTimeout(() => window.close(), 2500);
          </script>
        </body>
        </html>
      `);
    } catch (error) {
      console.error('[OAuth] LinkedIn Organization error:', error);
      console.error('[OAuth] Error stack:', error.stack);
      
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Connection Failed</title>
          <link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
          <style>
            body {
              font-family: 'Hanken Grotesk', sans-serif;
              background: #f8f9fa;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
            }
            .error-card {
              background: white;
              border-radius: 12px;
              padding: 40px;
                          text-align: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            max-width: 400px;
          }
          .error-icon {
            width: 64px;
            height: 64px;
            background: #ef4444;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 20px;
            font-size: 32px;
            color: white;
          }
          h2 {
            color: #2c3e50;
            margin: 0 0 12px 0;
            font-size: 20px;
            font-weight: 600;
          }
          .error-message {
            background: #fef2f2;
            padding: 16px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 3px solid #ef4444;
            color: #666;
            font-size: 14px;
            text-align: left;
          }
          p { color: #999; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="error-card">
          <div class="error-icon">✗</div>
          <h2>Connection Failed</h2>
          <div class="error-message">${error.message}</div>
          <p>This window will close automatically...</p>
        </div>
        <script>
          window.opener.postMessage({ 
            type: 'oauth-error', 
            platform: 'linkedin',
            error: '${error.message.replace(/'/g, "\\'")}'
          }, '*');
          setTimeout(() => window.close(), 4000);
        </script>
      </body>
      </html>
    `);
  }
});


// -------------------------
// YouTube OAuth Connect
// -------------------------
router.get('/auth/youtube/connect', async (req, res) => {
  const { businessId } = req.query;
  
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = `${process.env.APP_URL}/api/business-settings/auth/youtube/callback`;
  
  // ✅ YouTube API scopes
  const scopes = [
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube.force-ssl',
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/userinfo.profile'
  ].join(' ');
  
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `response_type=code` +
    `&client_id=${googleClientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${businessId}` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&access_type=offline` +  // Get refresh token
    `&prompt=consent`;        // Force consent to get refresh token
  
  console.log('[OAuth] YouTube Auth URL:', authUrl);
  
  res.redirect(authUrl);
});

// -------------------------
// YouTube OAuth Callback - WITH CHANNEL SELECTOR
// -------------------------
router.get('/auth/youtube/callback', async (req, res) => {
  try {
    const { code, state: businessId, channel_id, user_token, refresh_token, error } = req.query;
    
    if (error) {
      throw new Error(`YouTube auth error: ${error}`);
    }
    
    if (!code && !user_token) {
      throw new Error('No authorization code or token received');
    }

    console.log(`[OAuth] YouTube callback for business: ${businessId}`);

    let accessToken;
    let refreshToken;

    // If we have user_token, it means we're coming back from channel selection
    if (user_token) {
      accessToken = user_token;
      refreshToken = refresh_token; // Pass through the refresh token
    } else {
      // First time: Exchange code for access token
      const redirectUri = `${process.env.APP_URL}/api/business-settings/auth/youtube/callback`;

      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: code,
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code'
        })
      });

      const tokenData = await tokenResponse.json();

      if (!tokenData.access_token) {
        throw new Error(tokenData.error_description || 'Failed to get access token');
      }

      accessToken = tokenData.access_token;
      refreshToken = tokenData.refresh_token; // ✅ Store refresh token for later use
      
      console.log('[OAuth] YouTube tokens received:', {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken
      });
    }

    // Get user's YouTube channels
    const channelsUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails,statistics&mine=true`;
    
    const channelsResponse = await fetch(channelsUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    if (!channelsResponse.ok) {
      const errorText = await channelsResponse.text();
      console.error('[OAuth] Failed to fetch YouTube channels:', errorText);
      throw new Error('Failed to fetch YouTube channels. Please make sure you have a YouTube channel.');
    }

    const channelsData = await channelsResponse.json();
    
    console.log('[OAuth] YouTube channels response:', JSON.stringify(channelsData, null, 2));

    if (!channelsData.items || channelsData.items.length === 0) {
      throw new Error('No YouTube channel found. Please create a YouTube channel first.');
    }

    const channels = channelsData.items.map(item => ({
      id: item.id,
      name: item.snippet.title,
      customUrl: item.snippet.customUrl || '',
      description: item.snippet.description || '',
      thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url || '',
      subscriberCount: parseInt(item.statistics?.subscriberCount || '0'),
      videoCount: parseInt(item.statistics?.videoCount || '0'),
      viewCount: parseInt(item.statistics?.viewCount || '0')
    }));

    console.log(`[OAuth] Found ${channels.length} YouTube channel(s):`, channels.map(c => c.name));

    // ✅ If no channel_id provided and multiple channels, show selector
    if (!channel_id && channels.length > 1) {
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Select YouTube Channel</title>
          <link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
          <style>
            * { 
              box-sizing: border-box; 
              margin: 0; 
              padding: 0; 
            }
            body {
              font-family: 'Hanken Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: #f8f9fa;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
            }
            .channel-selector {
              background: white;
              border-radius: 12px;
              padding: 32px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.08);
              max-width: 520px;
              width: 100%;
              max-height: 85vh;
              overflow-y: auto;
            }
            h2 {
              margin: 0 0 8px 0;
              color: #2c3e50;
              font-size: 20px;
              font-weight: 600;
            }
            .subtitle {
              color: #666;
              margin-bottom: 24px;
              font-size: 14px;
              line-height: 1.5;
            }
            .channel-option {
              display: flex;
              align-items: center;
              gap: 14px;
              padding: 16px;
              margin: 10px 0;
              border: 2px solid #e0e0e0;
              border-radius: 8px;
              cursor: pointer;
              transition: all 0.15s ease;
              background: white;
            }
            .channel-option:hover {
              border-color: #FF0000;
              background: #fff5f5;
            }
            .channel-thumbnail {
              width: 60px;
              height: 60px;
              border-radius: 50%;
              object-fit: cover;
              flex-shrink: 0;
              border: 2px solid #FF0000;
            }
            .channel-info {
              flex: 1;
              min-width: 0;
            }
            .channel-name {
              font-weight: 600;
              color: #2c3e50;
              margin-bottom: 4px;
              font-size: 16px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .channel-custom-url {
              font-size: 13px;
              color: #999;
              margin-bottom: 6px;
            }
            .channel-stats {
              display: flex;
              gap: 12px;
              font-size: 12px;
              color: #666;
            }
            .stat-item {
              display: flex;
              align-items: center;
              gap: 4px;
            }
            .select-btn {
              padding: 10px 18px;
              background: #FF0000;
              color: white;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-weight: 500;
              font-size: 14px;
              transition: background 0.15s ease;
              flex-shrink: 0;
            }
            .select-btn:hover {
              background: #CC0000;
            }
          </style>
        </head>
        <body>
          <div class="channel-selector">
            <h2>Select YouTube Channel</h2>
            <p class="subtitle">Choose which channel you want to connect for posting videos</p>
            ${channels.map(channel => `
              <div class="channel-option" onclick="selectChannel('${channel.id}')">
                <img src="${channel.thumbnail}" alt="${channel.name}" class="channel-thumbnail" 
                     onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 48 48%22%3E%3Ccircle fill=%22%23FF0000%22 cx=%2224%22 cy=%2224%22 r=%2224%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22white%22 font-size=%2220%22 font-weight=%22bold%22%3E${channel.name.charAt(0).toUpperCase()}%3C/text%3E%3C/svg%3E'"
                />
                <div class="channel-info">
                  <div class="channel-name">${channel.name}</div>
                  ${channel.customUrl ? `<div class="channel-custom-url">youtube.com/${channel.customUrl}</div>` : ''}
                  <div class="channel-stats">
                    <span class="stat-item">👥 ${formatCount(channel.subscriberCount)} subs</span>
                    <span class="stat-item">🎥 ${formatCount(channel.videoCount)} videos</span>
                  </div>
                </div>
                <button class="select-btn">Select</button>
              </div>
            `).join('')}
          </div>
          
          <script>
            function formatCount(num) {
              if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
              if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
              return num.toString();
            }
            
            function selectChannel(channelId) {
              const url = new URL(window.location.href);
              url.searchParams.delete('code');
              url.searchParams.set('channel_id', channelId);
              url.searchParams.set('user_token', '${accessToken}');
              url.searchParams.set('refresh_token', '${refreshToken || ''}');
              window.location.href = url.toString();
            }
          </script>
        </body>
        </html>
      `);
    }

    // ✅ Get the selected channel or use first/only channel
    let selectedChannel = channels[0];
    if (channel_id) {
      selectedChannel = channels.find(c => c.id === channel_id) || selectedChannel;
    }

    // Calculate expiry (YouTube tokens expire in 1 hour, but we have refresh token)
    const expiresAt = new Date(Date.now() + (3600 * 1000)); // 1 hour

    const db = await getDatabase();
    const business = await db.collection('store_submissions').findOne({
      _id: new ObjectId(businessId)
    });

    // ✅ Store YouTube channel connection
    const updateFields = {
      'automation_settings.social_media.youtube.connected': true,
      'automation_settings.social_media.youtube.access_token': encryptToken(accessToken),
      'automation_settings.social_media.youtube.refresh_token': refreshToken ? encryptToken(refreshToken) : null,
      'automation_settings.social_media.youtube.channel_id': selectedChannel.id,
      'automation_settings.social_media.youtube.channel_name': selectedChannel.name,
      'automation_settings.social_media.youtube.custom_url': selectedChannel.customUrl,
      'automation_settings.social_media.youtube.channel_thumbnail': selectedChannel.thumbnail,
      'automation_settings.social_media.youtube.subscriber_count': selectedChannel.subscriberCount,
      'automation_settings.social_media.youtube.video_count': selectedChannel.videoCount,
      'automation_settings.social_media.youtube.view_count': selectedChannel.viewCount,
      'automation_settings.social_media.youtube.expires_at': expiresAt,
      'automation_settings.social_media.youtube.last_refreshed': new Date(),
      'automation_settings.social_media.youtube.status': 'active',
      'updated_at': new Date()
    };

    // Initialize other platforms if needed
    if (!business.automation_settings) {
      updateFields['automation_settings.social_media.facebook'] = { 
        connected: false, status: 'disconnected' 
      };
      updateFields['automation_settings.social_media.instagram'] = { 
        connected: false, status: 'disconnected' 
      };
      updateFields['automation_settings.social_media.linkedin'] = { 
        connected: false, status: 'disconnected' 
      };
      updateFields['automation_settings.n8n_config'] = {
        webhook_url: '', enabled: true
      };
      updateFields['automation_settings.posting_preferences'] = {
        auto_post: false,
        default_post_time: '09:00',
        timezone: 'Africa/Johannesburg'
      };
    }

    await db.collection('store_submissions').updateOne(
      { _id: new ObjectId(businessId) },
      { $set: updateFields }
    );
    
    console.log(`[OAuth] YouTube connected - Business: ${businessId}, Channel: ${selectedChannel.name}`);
    
    // ✅ Format numbers BEFORE using in template string
    const formattedSubs = selectedChannel.subscriberCount >= 1000000 
      ? (selectedChannel.subscriberCount / 1000000).toFixed(1) + 'M'
      : selectedChannel.subscriberCount >= 1000
      ? (selectedChannel.subscriberCount / 1000).toFixed(1) + 'K'
      : selectedChannel.subscriberCount.toString();
    
    const formattedVideos = selectedChannel.videoCount >= 1000000
      ? (selectedChannel.videoCount / 1000000).toFixed(1) + 'M'
      : selectedChannel.videoCount >= 1000
      ? (selectedChannel.videoCount / 1000).toFixed(1) + 'K'
      : selectedChannel.videoCount.toString();
    
    // Success page
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Connected</title>
        <link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          body {
            font-family: 'Hanken Grotesk', sans-serif;
            background: #f8f9fa;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          .success-card {
            background: white;
            border-radius: 12px;
            padding: 40px;
            text-align: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            max-width: 420px;
          }
          .success-icon {
            width: 64px;
            height: 64px;
            background: #FF0000;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 20px;
            font-size: 32px;
            color: white;
          }
          h2 { 
            color: #2c3e50; 
            margin: 0 0 12px 0;
            font-size: 20px;
            font-weight: 600;
          }
          .channel-info {
            background: #f8f9fa;
            padding: 18px;
            border-radius: 8px;
            margin: 20px 0;
          }
          .channel-thumbnail {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            margin: 0 auto 12px;
            border: 2px solid #FF0000;
          }
          .channel-name { 
            font-weight: 600; 
            color: #2c3e50; 
            font-size: 16px;
            margin-bottom: 6px;
          }
          .channel-stats {
            font-size: 13px;
            color: #666;
            display: flex;
            justify-content: center;
            gap: 16px;
            margin-top: 8px;
          }
          .stat-item {
            display: flex;
            align-items: center;
            gap: 4px;
          }
          p { 
            color: #999; 
            font-size: 13px; 
          }
        </style>
      </head>
      <body>
        <div class="success-card">
          <div class="success-icon">✓</div>
          <h2>YouTube Channel Connected</h2>
          <div class="channel-info">
            <img src="${selectedChannel.thumbnail}" alt="${selectedChannel.name}" class="channel-thumbnail" />
            <div class="channel-name">${selectedChannel.name}</div>
            ${selectedChannel.customUrl ? `<div style="font-size: 13px; color: #999;">youtube.com/${selectedChannel.customUrl}</div>` : ''}
            <div class="channel-stats">
              <span class="stat-item">👥 ${formattedSubs}</span>
              <span class="stat-item">🎥 ${formattedVideos}</span>
            </div>
          </div>
          <p>You can now upload videos to this channel</p>
          <p style="margin-top: 12px;">This window will close automatically...</p>
        </div>
        <script>
          window.opener.postMessage({ 
            type: 'oauth-success', 
            platform: 'youtube',
            channelName: '${selectedChannel.name.replace(/'/g, "\\'")}'
          }, '*');
          setTimeout(() => window.close(), 2500);
        </script>
      </body>
      </html>
    `);

    // Success page
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Connected</title>
        <link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          body {
            font-family: 'Hanken Grotesk', sans-serif;
            background: #f8f9fa;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          .success-card {
            background: white;
            border-radius: 12px;
            padding: 40px;
            text-align: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            max-width: 420px;
          }
          .success-icon {
            width: 64px;
            height: 64px;
            background: #ff8b00;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 20px;
            font-size: 32px;
            color: white;
          }
          h2 { 
            color: #2c3e50; 
            margin: 0 0 12px 0;
            font-size: 20px;
            font-weight: 600;
          }
          .channel-info {
            background: #f8f9fa;
            padding: 18px;
            border-radius: 8px;
            margin: 20px 0;
          }
          .channel-thumbnail {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            margin: 0 auto 12px;
            border: 2px solid #FF0000;
          }
          .channel-name { 
            font-weight: 600; 
            color: #2c3e50; 
            font-size: 16px;
            margin-bottom: 6px;
          }
          .channel-stats {
            font-size: 13px;
            color: #666;
            display: flex;
            justify-content: center;
            gap: 16px;
            margin-top: 8px;
          }
          .stat-item {
            display: flex;
            align-items: center;
            gap: 4px;
          }
          p { 
            color: #999; 
            font-size: 13px; 
          }
        </style>
      </head>
      <body>
        <div class="success-card">
          <div class="success-icon">✓</div>
          <h2>YouTube Channel Connected</h2>
          <div class="channel-info">
            <img src="${selectedChannel.thumbnail}" alt="${selectedChannel.name}" class="channel-thumbnail" />
            <div class="channel-name">${selectedChannel.name}</div>
            ${selectedChannel.customUrl ? `<div style="font-size: 13px; color: #999;">youtube.com/${selectedChannel.customUrl}</div>` : ''}
            <div class="channel-stats">
              <span class="stat-item">👥 ${formatNumber(selectedChannel.subscriberCount)}</span>
              <span class="stat-item">🎥 ${formatNumber(selectedChannel.videoCount)}</span>
            </div>
          </div>
          <p>You can now upload videos to this channel</p>
          <p style="margin-top: 12px;">This window will close automatically...</p>
        </div>
        <script>
          window.opener.postMessage({ 
            type: 'oauth-success', 
            platform: 'youtube',
            channelName: '${selectedChannel.name.replace(/'/g, "\\'")}'
          }, '*');
          setTimeout(() => window.close(), 2500);
        </script>
      </body>
      </html>
    `);

  } catch (error) {
    console.error('[OAuth] YouTube error:', error);
    console.error('[OAuth] Error stack:', error.stack);
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Connection Failed</title>
        <link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          body {
            font-family: 'Hanken Grotesk', sans-serif;
            background: #f8f9fa;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          .error-card {
            background: white;
            border-radius: 12px;
            padding: 40px;
            text-align: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            max-width: 420px;
          }
          .error-icon {
            width: 64px;
            height: 64px;
            background: #ff7b00;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 20px;
            font-size: 32px;
            color: white;
          }
          h2 {
            color: #2c3e50;
            margin: 0 0 12px 0;
            font-size: 20px;
            font-weight: 600;
          }
          .error-message {
            background: #fef2f2;
            padding: 16px;
                        border-radius: 8px;
            margin: 20px 0;
            border-left: 3px solid #ef4444;
            color: #666;
            font-size: 14px;
            text-align: left;
          }
          p { color: #999; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="error-card">
          <div class="error-icon">✗</div>
          <h2>Connection Failed</h2>
          <div class="error-message">${error.message}</div>
          <p>This window will close automatically...</p>
        </div>
        <script>
          window.opener.postMessage({ 
            type: 'oauth-error', 
            platform: 'youtube',
            error: '${error.message.replace(/'/g, "\\'")}'
          }, '*');
          setTimeout(() => window.close(), 4000);
        </script>
      </body>
      </html>
    `);
  }
});

router.post('/auth/:platform/test', async (req, res) => {
  try {
    const { platform } = req.params;
    const { businessId } = req.body;

    const db = await getDatabase();
    const business = await db.collection('store_submissions').findOne({
      _id: new ObjectId(businessId)
    });

    const platformSettings = business.automation_settings?.social_media?.[platform];

    if (!platformSettings || !platformSettings.connected) {
      return res.json({ 
        success: false, 
        error: 'Platform not connected' 
      });
    }

    const accessToken = decryptToken(platformSettings.access_token);

    let testUrl;
    let testHeaders = {};

    if (platform === 'facebook') {
      testUrl = `https://graph.facebook.com/v18.0/me?access_token=${accessToken}`;
    } else if (platform === 'instagram') {
      testUrl = `https://graph.facebook.com/v18.0/${platformSettings.account_id}?fields=username&access_token=${accessToken}`;
    } else if (platform === 'linkedin') {
      testUrl = `https://api.linkedin.com/v2/me`;
      testHeaders = { 
        'Authorization': `Bearer ${accessToken}`,
        'LinkedIn-Version': '202409'
      };
      
      const orgId = platformSettings.organization_id;
      if (orgId) {
        const numericOrgId = orgId.split(':').pop();
        const orgTestUrl = `https://api.linkedin.com/v2/organizations/${numericOrgId}`;
        const orgTestResponse = await fetch(orgTestUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'LinkedIn-Version': '202409'
          }
        });
        
        if (orgTestResponse.ok) {
          return res.json({ 
            success: true, 
            message: 'LinkedIn organization connection is working',
            organization: platformSettings.organization_name
          });
        } else {
          const errorText = await orgTestResponse.text();
          console.error('[Test] LinkedIn org test failed:', errorText);
          return res.json({ 
            success: false, 
            error: 'Cannot access organization. Token may be invalid or permissions missing.' 
          });
        }
      }
    } else if (platform === 'youtube') {
      // ✅ Test YouTube connection
      testUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${platformSettings.channel_id}`;
      testHeaders = { 
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      };
      
      const testResponse = await fetch(testUrl, { headers: testHeaders });
      
      if (testResponse.ok) {
        const data = await testResponse.json();
        if (data.items && data.items.length > 0) {
          return res.json({ 
            success: true, 
            message: 'YouTube channel connection is working',
            channel: platformSettings.channel_name
          });
        } else {
          return res.json({ 
            success: false, 
            error: 'Channel not found or inaccessible' 
          });
        }
      } else {
        const errorData = await testResponse.json();
        console.error('[Test] YouTube test failed:', errorData);
        
        // If token expired, try to refresh
        if (errorData.error?.code === 401 && platformSettings.refresh_token) {
          return res.json({ 
            success: false, 
            error: 'Token expired. Please use the Refresh Token button.' 
          });
        }
        
        return res.json({ 
          success: false, 
          error: errorData.error?.message || 'Connection test failed' 
        });
      }
    }

    const testResponse = await fetch(testUrl, { headers: testHeaders });

    if (testResponse.ok) {
      res.json({ success: true, message: 'Connection is working' });
    } else {
      res.json({ success: false, error: 'Token is invalid or expired' });
    }
  } catch (error) {
    console.error(`[Settings] Error testing connection:`, error);
    res.json({ success: false, error: error.message });
  }
});

router.post('/auth/:platform/disconnect', async (req, res) => {
  try {
    const { platform } = req.params;
    const { businessId } = req.body;

    console.log(`[Settings] Disconnecting ${platform} for business: ${businessId}`);

    const db = await getDatabase();
    
    let disconnectFields = {
      'updated_at': new Date()
    };

    if (platform === 'facebook') {
      disconnectFields[`automation_settings.social_media.${platform}.connected`] = false;
      disconnectFields[`automation_settings.social_media.${platform}.status`] = 'disconnected';
      disconnectFields[`automation_settings.social_media.${platform}.access_token`] = null;
      disconnectFields[`automation_settings.social_media.${platform}.page_id`] = null;
      disconnectFields[`automation_settings.social_media.${platform}.page_name`] = null;
      disconnectFields[`automation_settings.social_media.${platform}.page_category`] = null;
      disconnectFields[`automation_settings.social_media.${platform}.page_picture`] = null;
    } else if (platform === 'instagram') {
      disconnectFields[`automation_settings.social_media.${platform}.connected`] = false;
      disconnectFields[`automation_settings.social_media.${platform}.status`] = 'disconnected';
      disconnectFields[`automation_settings.social_media.${platform}.access_token`] = null;
      disconnectFields[`automation_settings.social_media.${platform}.account_id`] = null;
      disconnectFields[`automation_settings.social_media.${platform}.username`] = null;
      disconnectFields[`automation_settings.social_media.${platform}.account_name`] = null;
      disconnectFields[`automation_settings.social_media.${platform}.profile_picture`] = null;
      disconnectFields[`automation_settings.social_media.${platform}.connected_page_id`] = null;
      disconnectFields[`automation_settings.social_media.${platform}.connected_page_name`] = null;
    } else if (platform === 'linkedin') {
      disconnectFields[`automation_settings.social_media.${platform}.connected`] = false;
      disconnectFields[`automation_settings.social_media.${platform}.status`] = 'disconnected';
      disconnectFields[`automation_settings.social_media.${platform}.access_token`] = null;
      disconnectFields[`automation_settings.social_media.${platform}.organization_id`] = null;
      disconnectFields[`automation_settings.social_media.${platform}.organization_name`] = null;
      disconnectFields[`automation_settings.social_media.${platform}.organization_vanity`] = null;
      disconnectFields[`automation_settings.social_media.${platform}.organization_logo`] = null;
      disconnectFields[`automation_settings.social_media.${platform}.authorized_user_id`] = null;
      disconnectFields[`automation_settings.social_media.${platform}.type`] = null;
    } else if (platform === 'youtube') {
      // ✅ Clear YouTube channel fields
      disconnectFields[`automation_settings.social_media.${platform}.connected`] = false;
      disconnectFields[`automation_settings.social_media.${platform}.status`] = 'disconnected';
      disconnectFields[`automation_settings.social_media.${platform}.access_token`] = null;
      disconnectFields[`automation_settings.social_media.${platform}.refresh_token`] = null;
      disconnectFields[`automation_settings.social_media.${platform}.channel_id`] = null;
      disconnectFields[`automation_settings.social_media.${platform}.channel_name`] = null;
      disconnectFields[`automation_settings.social_media.${platform}.custom_url`] = null;
      disconnectFields[`automation_settings.social_media.${platform}.channel_thumbnail`] = null;
      disconnectFields[`automation_settings.social_media.${platform}.subscriber_count`] = null;
      disconnectFields[`automation_settings.social_media.${platform}.video_count`] = null;
      disconnectFields[`automation_settings.social_media.${platform}.view_count`] = null;
    }
    
    await db.collection('store_submissions').updateOne(
      { _id: new ObjectId(businessId) },
      { $set: disconnectFields }
    );

    res.json({ success: true, message: `${platform} disconnected` });
  } catch (error) {
    console.error(`[Settings] Error disconnecting platform:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// -------------------------
// Refresh Token - UPDATED with YouTube support
// -------------------------
router.post('/auth/:platform/refresh', async (req, res) => {
  try {
    const { platform } = req.params;
    const { businessId } = req.body;

    const db = await getDatabase();
    const business = await db.collection('store_submissions').findOne({
      _id: new ObjectId(businessId)
    });

    if (!business) {
      return res.json({ success: false, error: 'Business not found' });
    }

    const platformSettings = business.automation_settings?.social_media?.[platform];

    if (!platformSettings || !platformSettings.connected) {
      return res.json({ success: false, error: 'Platform not connected' });
    }

    // ✅ YouTube token refresh
    if (platform === 'youtube') {
      const refreshToken = decryptToken(platformSettings.refresh_token);
      
      if (!refreshToken) {
        return res.json({ 
          success: false, 
          error: 'No refresh token available. Please reconnect your YouTube channel.' 
        });
      }

      try {
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            refresh_token: refreshToken,
            grant_type: 'refresh_token'
          })
        });

        const tokenData = await tokenResponse.json();

        if (!tokenData.access_token) {
          throw new Error(tokenData.error_description || 'Failed to refresh token');
        }

        // Update with new access token
        const newExpiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));
        
        await db.collection('store_submissions').updateOne(
          { _id: new ObjectId(businessId) },
          { 
            $set: { 
              'automation_settings.social_media.youtube.access_token': encryptToken(tokenData.access_token),
              'automation_settings.social_media.youtube.expires_at': newExpiresAt,
              'automation_settings.social_media.youtube.last_refreshed': new Date(),
              'updated_at': new Date()
            }
          }
        );

        console.log(`[OAuth] YouTube token refreshed for business: ${businessId}`);

        return res.json({ 
          success: true, 
          message: 'YouTube token refreshed successfully',
          expires_at: newExpiresAt
        });
      } catch (error) {
        console.error('[OAuth] YouTube token refresh error:', error);
        return res.json({ 
          success: false, 
          error: 'Failed to refresh token. You may need to reconnect your YouTube channel.' 
        });
      }
    }

    // TODO: Implement token refresh for other platforms
    res.json({ 
      success: true, 
      message: 'Token refresh not yet implemented for this platform' 
    });
  } catch (error) {
    console.error(`[Settings] Error refreshing token:`, error);
    res.json({ success: false, error: error.message });
  }
});
  
// -------------------------
// Refresh Token
// -------------------------
// router.post('/auth/:platform/refresh', async (req, res) => {
//   try {
//     const { platform } = req.params;
//     const { businessId } = req.body;

//     // TODO: Implement token refresh logic for each platform
//     res.json({ 
//       success: true, 
//       message: 'Token refresh not yet implemented for this platform' 
//     });
//   } catch (error) {
//     console.error(`[Settings] Error refreshing token:`, error);
//     res.json({ success: false, error: error.message });
//   }
// });

// -------------------------
// Get Decrypted Token (for n8n)
// -------------------------
router.post('/get-token', async (req, res) => {
  try {
    const { businessId, platform } = req.body;

    const db = await getDatabase();
    const business = await db.collection('store_submissions').findOne({
      _id: new ObjectId(businessId)
    });

    if (!business) {
      return res.status(404).json({ success: false, error: 'Business not found' });
    }

    const platformSettings = business.automation_settings?.social_media?.[platform];

    if (!platformSettings || !platformSettings.connected) {
      return res.status(404).json({ success: false, error: 'Platform not connected' });
    }

    const decryptedToken = decryptToken(platformSettings.access_token);

    res.json({
      success: true,
      token: decryptedToken,
      node_id: platformSettings.n8n_node_id,
      platform_data: {
        page_id: platformSettings.page_id,
        account_id: platformSettings.account_id,
        profile_id: platformSettings.profile_id
      }
    });
  } catch (error) {
    console.error('[Settings] Error getting token:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;