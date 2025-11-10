const express = require('express');
const router = express.Router();
const { getDatabase } = require('../../lib/mongodb');  // Note: ../../
const { ObjectId } = require('mongodb');
const crypto = require('crypto');


// Services
const businessSettingsService = require('../services/business-settings.service');
const encryptionService = require('../services/encryption.service');

const facebookOAuth = require('../services/oauth/facebook-oauth.service');
const instagramOAuth = require('../services/oauth/instagram-oauth.service');
const linkedinOAuth = require('../services/oauth/linkedin-oauth.service');
const youtubeOAuth = require('../services/oauth/youtube-oauth.service');
const tiktokOAuth = require('../services/oauth/tiktok-oauth.service');


const OAuthTemplates = require('../services/template/oauth-templates');




// Middleware
const ValidationMiddleware = require('../middleware/validation.middleware');

// -------------------------
// GET Business Settings
// -------------------------
router.get('/:businessId', 
  ValidationMiddleware.validateBusinessId,
  async (req, res) => {
    try {
      const { businessId } = req.params;
      
      console.log(`[Settings] Fetching settings for business: ${businessId}`);
      
      const settings = await businessSettingsService.getSettings(businessId);

      res.json({
        success: true,
        automation_settings: settings
      });
    } catch (error) {
      console.error('[Settings] Error fetching business settings:', error);
      res.status(error.message === 'Business not found' ? 404 : 500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }
);

// -------------------------
// PATCH Business Settings
// -------------------------
router.patch('/:businessId',
  ValidationMiddleware.validateBusinessId,
  ValidationMiddleware.validateUpdateBody,
  async (req, res) => {
    try {
      const { businessId } = req.params;
      const updates = req.body;

      console.log(`[Settings] PATCH updating settings for business: ${businessId}`);

      const updatedSettings = await businessSettingsService.updateSettings(businessId, updates);

      res.json({
        success: true,
        message: 'Settings updated successfully',
        automation_settings: updatedSettings
      });
    } catch (error) {
      console.error('[Settings] Error updating business settings:', error);
      res.status(error.message === 'Business not found' ? 404 : 500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }
);

// -------------------------
// PUT Business Settings (Legacy - full updates)
// -------------------------
router.put('/:businessId',
  ValidationMiddleware.validateBusinessId,
  async (req, res) => {
    try {
      const { businessId } = req.params;
      const { automation_settings } = req.body;

      console.log(`[Settings] PUT updating settings for business: ${businessId}`);

      const updatedSettings = await businessSettingsService.updateSettings(
        businessId, 
        { automation_settings }
      );

      res.json({
        success: true,
        message: 'Settings updated successfully'
      });
    } catch (error) {
      console.error('[Settings] Error updating business settings:', error);
      res.status(error.message === 'Business not found' ? 404 : 500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }
);

// -------------------------
// OAuth Connect Routes
// -------------------------

// Facebook Connect
router.get('/auth/facebook/connect', (req, res) => {
  const { businessId } = req.query;
  const redirectUri = `${process.env.APP_URL}/api/business-settings/auth/facebook/callback`;
  const authUrl = facebookOAuth.getAuthUrl(businessId, redirectUri);
  
  console.log(`[OAuth] Redirecting to Facebook auth for business: ${businessId}`);
  res.redirect(authUrl);
});

// Facebook Callback
router.get('/auth/facebook/callback', async (req, res) => {
  try {
    const { code, state: businessId, page_id, user_token } = req.query;
    
    if (!code && !user_token) {
      throw new Error('No authorization code or token received');
    }

    console.log(`[OAuth] Facebook callback for business: ${businessId}`);

    let accessToken;
    const redirectUri = `${process.env.APP_URL}/api/business-settings/auth/facebook/callback`;

    // Get or exchange token
    if (user_token) {
      accessToken = user_token;
    } else {
      const tokenData = await facebookOAuth.exchangeCodeForToken(code, redirectUri);
      accessToken = tokenData.access_token;
    }

    // Get pages
    const pages = await facebookOAuth.getPages(accessToken);

    // Show page selector if needed
    if (!page_id && pages.length > 1) {
      return res.send(OAuthTemplates.pageSelector(pages, 'facebook', accessToken));
    }

    // Get selected page
    const selectedPage = page_id 
      ? pages.find(p => p.id === page_id) || pages[0]
      : pages[0];

    // Format and save connection data
    const connectionData = facebookOAuth.formatPageData(
      selectedPage, 
      selectedPage.access_token, 
      60 * 24 * 60 * 60
    );

    await businessSettingsService.updatePlatformConnection(
      businessId,
      'facebook',
      connectionData
    );

    console.log(`[OAuth] Facebook connected - Business: ${businessId}, Page: ${selectedPage.name}`);

    // Show success page
    res.send(OAuthTemplates.success('facebook', {
      page_name: selectedPage.name,
      page_category: selectedPage.category
    }));

  } catch (error) {
    console.error('[OAuth] Facebook error:', error);
    res.send(OAuthTemplates.error('facebook', error.message));
  }
});

// Instagram Connect
router.get('/auth/instagram/connect', (req, res) => {
  const { businessId } = req.query;
  const redirectUri = `${process.env.APP_URL}/api/business-settings/auth/instagram/callback`;
  const authUrl = instagramOAuth.getAuthUrl(businessId, redirectUri);
  
  console.log(`[OAuth] Redirecting to Instagram auth for business: ${businessId}`);
  res.redirect(authUrl);
});

// Instagram Callback
router.get('/auth/instagram/callback', async (req, res) => {
  try {
    const { code, state: businessId, ig_account_id, user_token } = req.query;
    
    if (!code && !user_token) {
      throw new Error('No authorization code or token received');
    }

    console.log(`[OAuth] Instagram callback for business: ${businessId}`);

    let accessToken;
    const redirectUri = `${process.env.APP_URL}/api/business-settings/auth/instagram/callback`;

    // Get or exchange token
    if (user_token) {
      accessToken = user_token;
    } else {
      const tokenData = await facebookOAuth.exchangeCodeForToken(code, redirectUri);
      accessToken = tokenData.access_token;
    }

    // Get Instagram accounts
    const pagesWithInstagram = await instagramOAuth.getInstagramAccounts(accessToken);

    // Show account selector if needed
    if (!ig_account_id && pagesWithInstagram.length > 1) {
      return res.send(OAuthTemplates.pageSelector(
        pagesWithInstagram.map(p => ({
          ...p.instagram_business_account,
          page_name: p.name
        })),
        'instagram',
        accessToken
      ));
    }

    // Get selected account
    const selectedPage = ig_account_id
      ? pagesWithInstagram.find(p => p.instagram_business_account.id === ig_account_id) || pagesWithInstagram[0]
      : pagesWithInstagram[0];

    // Format and save connection data
    const connectionData = instagramOAuth.formatAccountData(
      selectedPage,
      accessToken,
      60 * 24 * 60 * 60
    );

    await businessSettingsService.updatePlatformConnection(
      businessId,
      'instagram',
      connectionData
    );

    const igAccount = selectedPage.instagram_business_account;
    console.log(`[OAuth] Instagram connected - Business: ${businessId}, Account: @${igAccount.username}`);

    // Show success page
    res.send(OAuthTemplates.success('instagram', {
      account_name: igAccount.name || igAccount.username,
      username: igAccount.username
    }));

  } catch (error) {
    console.error('[OAuth] Instagram error:', error);
    res.send(OAuthTemplates.error('instagram', error.message));
  }
});

// LinkedIn Connect
router.get('/auth/linkedin/connect', (req, res) => {
  const { businessId } = req.query;
  const redirectUri = `${process.env.APP_URL}/api/business-settings/auth/linkedin/callback`;
  const authUrl = linkedinOAuth.getAuthUrl(businessId, redirectUri);
  
  console.log(`[OAuth] Redirecting to LinkedIn auth for business: ${businessId}`);
  res.redirect(authUrl);
});

// LinkedIn Callback
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
    const redirectUri = `${process.env.APP_URL}/api/business-settings/auth/linkedin/callback`;

    // Get or exchange token
    if (user_token) {
      accessToken = user_token;
    } else {
      const tokenData = await linkedinOAuth.exchangeCodeForToken(code, redirectUri);
      accessToken = tokenData.access_token;
    }

    // Get user profile
    const profileData = await linkedinOAuth.fetchWithAuth(
      'https://api.linkedin.com/v2/me',
      accessToken,
      { headers: { 'LinkedIn-Version': '202409' } }
    );

    // Get organizations
    const organizations = await linkedinOAuth.getOrganizations(accessToken);

    // Show organization selector if needed
    if (!org_id && organizations.length > 1) {
      return res.send(OAuthTemplates.pageSelector(organizations, 'linkedin', accessToken));
    }

    // Get selected organization
    const selectedOrg = org_id
      ? organizations.find(o => o.id === decodeURIComponent(org_id)) || organizations[0]
      : organizations[0];

    // Format and save connection data
    const connectionData = linkedinOAuth.formatOrganizationData(
      selectedOrg,
      profileData.id,
      accessToken,
      5184000 // 60 days
    );

    await businessSettingsService.updatePlatformConnection(
      businessId,
      'linkedin',
      connectionData
    );

    console.log(`[OAuth] LinkedIn connected - Business: ${businessId}, Org: ${selectedOrg.name}`);

    // Show success page
    res.send(OAuthTemplates.success('linkedin', {
      organization_name: selectedOrg.name
    }));

  } catch (error) {
    console.error('[OAuth] LinkedIn error:', error);
    res.send(OAuthTemplates.error('linkedin', error.message));
  }
});

// YouTube Connect
router.get('/auth/youtube/connect', (req, res) => {
  const { businessId } = req.query;
  const redirectUri = `${process.env.APP_URL}/api/business-settings/auth/youtube/callback`;
  const authUrl = youtubeOAuth.getAuthUrl(businessId, redirectUri);
  
  console.log(`[OAuth] Redirecting to YouTube auth for business: ${businessId}`);
  res.redirect(authUrl);
});

// YouTube Callback
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

    let accessToken, refreshTokenValue;
    const redirectUri = `${process.env.APP_URL}/api/business-settings/auth/youtube/callback`;

    // Get or exchange token
    if (user_token) {
      accessToken = user_token;
      refreshTokenValue = refresh_token;
    } else {
      const tokenData = await youtubeOAuth.exchangeCodeForToken(code, redirectUri);
      accessToken = tokenData.access_token;
      refreshTokenValue = tokenData.refresh_token;
    }

    // Get channels
    const channels = await youtubeOAuth.getChannels(accessToken);

    // Show channel selector if needed
    if (!channel_id && channels.length > 1) {
      return res.send(OAuthTemplates.pageSelector(channels, 'youtube', accessToken));
    }

    // Get selected channel
    const selectedChannel = channel_id
      ? channels.find(c => c.id === channel_id) || channels[0]
      : channels[0];

    // Format and save connection data
    const connectionData = youtubeOAuth.formatChannelData(
      selectedChannel,
      accessToken,
      refreshTokenValue,
      3600
    );

    await businessSettingsService.updatePlatformConnection(
      businessId,
      'youtube',
      connectionData
    );

    console.log(`[OAuth] YouTube connected - Business: ${businessId}, Channel: ${selectedChannel.name}`);

    // Show success page
    res.send(OAuthTemplates.success('youtube', {
      channel_name: selectedChannel.name,
      custom_url: selectedChannel.customUrl,
      subscriber_count: selectedChannel.subscriberCount
    }));

  } catch (error) {
    console.error('[OAuth] YouTube error:', error);
    res.send(OAuthTemplates.error('youtube', error.message));
  }
});

// -------------------------
// Test Connection
// -------------------------
router.post('/auth/:platform/test',
  ValidationMiddleware.validatePlatform,
  async (req, res) => {
    try {
      const { platform } = req.params;
      const { businessId } = req.body;

      const tokenData = await businessSettingsService.getPlatformToken(businessId, platform);
      
      let oauthService;
      switch(platform) {
        case 'facebook':
          oauthService = facebookOAuth;
          break;
        case 'instagram':
          oauthService = instagramOAuth;
          break;
        case 'linkedin':
          oauthService = linkedinOAuth;
          break;
        case 'youtube':
          oauthService = youtubeOAuth;
          break;
      }

      const isValid = await oauthService.testConnection(tokenData.token, tokenData);

      if (isValid) {
        res.json({ 
          success: true, 
          message: 'Connection is working' 
        });
      } else {
        res.json({ 
          success: false, 
          error: 'Token is invalid or expired' 
        });
      }
    } catch (error) {
      console.error(`[Settings] Error testing connection:`, error);
      res.json({ 
        success: false, 
        error: error.message 
      });
    }
  }
);

// -------------------------
// Disconnect Platform
// -------------------------
router.post('/auth/:platform/disconnect',
  ValidationMiddleware.validatePlatform,
  async (req, res) => {
    try {
      const { platform } = req.params;
      const { businessId } = req.body;

      console.log(`[Settings] Disconnecting ${platform} for business: ${businessId}`);

      await businessSettingsService.disconnectPlatform(businessId, platform);

      res.json({ 
        success: true, 
        message: `${platform} disconnected` 
      });
    } catch (error) {
      console.error(`[Settings] Error disconnecting platform:`, error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }
);

// -------------------------
// Refresh Token
// -------------------------
router.post('/auth/:platform/refresh',
  ValidationMiddleware.validatePlatform,
  async (req, res) => {
    try {
      const { platform } = req.params;
      const { businessId } = req.body;

      // Currently only YouTube supports token refresh
      if (platform !== 'youtube') {
        return res.json({ 
          success: false, 
          error: 'Token refresh not supported for this platform' 
        });
      }

      const tokenData = await businessSettingsService.getPlatformToken(businessId, platform);

      if (!tokenData.refresh_token) {
        return res.json({ 
          success: false, 
          error: 'No refresh token available. Please reconnect your account.' 
        });
      }

      const newTokenData = await youtubeOAuth.refreshToken(tokenData.refresh_token);

      await businessSettingsService.updatePlatformConnection(businessId, platform, {
        access_token: newTokenData.access_token,
        expires_at: youtubeOAuth.calculateExpiry(newTokenData.expires_in)
      });

      console.log(`[OAuth] ${platform} token refreshed for business: ${businessId}`);

      res.json({ 
        success: true, 
        message: 'Token refreshed successfully',
        expires_at: youtubeOAuth.calculateExpiry(newTokenData.expires_in)
      });

    } catch (error) {
      console.error(`[Settings] Error refreshing token:`, error);
      res.json({ 
        success: false, 
        error: 'Failed to refresh token. You may need to reconnect your account.' 
      });
    }
  }
);

// -------------------------
// Get Decrypted Token (for n8n)
// -------------------------
router.post('/get-token', async (req, res) => {
  try {
    const { businessId, platform } = req.body;

    const tokenData = await businessSettingsService.getPlatformToken(businessId, platform);

    res.json({
      success: true,
      token: tokenData.token,
      platform_data: tokenData
    });
  } catch (error) {
    console.error('[Settings] Error getting token:', error);
    res.status(error.message === 'Platform not connected' ? 404 : 500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// -------------------------
// TikTok OAuth Connect
// -------------------------
router.get('/auth/tiktok/connect', (req, res) => {
  const { businessId } = req.query;
  
  if (!businessId) {
    return res.status(400).send('Missing businessId parameter');
  }

  const redirectUri = `${process.env.APP_URL}/api/business-settings/auth/tiktok/callback`;
  const authUrl = tiktokOAuth.getAuthUrl(businessId, redirectUri);
  
  console.log(`[OAuth] Redirecting to TikTok auth for business: ${businessId}`);
  res.redirect(authUrl);
});

// -------------------------
// TikTok OAuth Callback
// -------------------------
// -------------------------
// TikTok OAuth Callback
// -------------------------
router.get('/auth/tiktok/callback', async (req, res) => {
  try {
    const { code, state: businessId, error, error_description } = req.query;
    
    if (error) {
      throw new Error(error_description || `TikTok error: ${error}`);
    }
    
    if (!code) {
      throw new Error('No authorization code received');
    }

    console.log(`[OAuth] TikTok callback for business: ${businessId}`);

    const redirectUri = `${process.env.APP_URL}/api/business-settings/auth/tiktok/callback`;

    // ✅ UPDATED: Pass businessId to exchangeCodeForToken
    const tokenData = await tiktokOAuth.exchangeCodeForToken(code, redirectUri, businessId);

    // Get user info
    const userInfo = await tiktokOAuth.getUserInfo(tokenData.access_token);

    // Format data for storage
    const connectionData = tiktokOAuth.formatUserData(
      userInfo,
      tokenData.access_token,
      tokenData.refresh_token,
      tokenData.expires_in
    );

    // Save to database
    await businessSettingsService.updatePlatformConnection(
      businessId,
      'tiktok',
      connectionData
    );

    console.log(`[OAuth] TikTok connected - Business: ${businessId}, User: @${userInfo.username}`);

    // Success page (same as before)
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
            background: linear-gradient(135deg, #00f2ea 0%, #ff0050 100%);
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
          .user-info {
            background: #f8f9fa;
            padding: 18px;
            border-radius: 8px;
            margin: 20px 0;
          }
          .user-avatar {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            margin: 0 auto 12px;
            border: 2px solid #00f2ea;
          }
          .user-name { 
            font-weight: 600; 
            color: #2c3e50; 
            font-size: 16px;
            margin-bottom: 6px;
          }
          .user-stats {
            font-size: 13px;
            color: #666;
            display: flex;
            justify-content: center;
            gap: 16px;
            margin-top: 8px;
          }
          p { color: #999; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="success-card">
          <div class="success-icon">✓</div>
          <h2>TikTok Connected</h2>
          <div class="user-info">
            <img src="${userInfo.avatar_url}" alt="${userInfo.display_name}" class="user-avatar" 
                 onerror="this.style.display='none'" />
            <div class="user-name">${userInfo.display_name}</div>
            <div style="font-size: 13px; color: #999;">@${userInfo.username}</div>
            <div class="user-stats">
              <span>👥 ${formatCount(userInfo.follower_count)}</span>
              <span>🎥 ${formatCount(userInfo.video_count)}</span>
            </div>
          </div>
          <p>You can now post videos to this account</p>
          <p style="margin-top: 12px;">This window will close automatically...</p>
        </div>
        <script>
          function formatCount(num) {
            if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
            if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
            return num.toString();
          }
          
          window.opener.postMessage({ 
            type: 'oauth-success', 
            platform: 'tiktok',
            username: '${userInfo.username.replace(/'/g, "\\'")}'
          }, '*');
          setTimeout(() => window.close(), 2500);
        </script>
      </body>
      </html>
    `);

  } catch (error) {
    console.error('[OAuth] TikTok error:', error);
    
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
            platform: 'tiktok',
            error: '${error.message.replace(/'/g, "\\'")}'
          }, '*');
          setTimeout(() => window.close(), 4000);
        </script>
      </body>
      </html>
    `);
  }
});

module.exports = router;