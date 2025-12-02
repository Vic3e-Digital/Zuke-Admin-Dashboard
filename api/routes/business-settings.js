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
      
      // Also fetch the full business document to include business_creatives
      const db = req.app.locals.db;
      if (!db) {
        return res.status(500).json({ error: 'Database connection error' });
      }
      
      const business = await db.collection('store_submissions').findOne({
        _id: new ObjectId(businessId)
      });

      res.json({
        success: true,
        automation_settings: settings,
        business: business
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
        case 'tiktok':
          oauthService = tiktokOAuth;
          break;
        default:
          return res.json({ success: false, error: 'Unsupported platform' });
      }

      const isValid = await oauthService.testConnection(tokenData.token, tokenData);

      if (isValid) {
        res.json({ success: true, message: 'Connection is working' });
      } else {
        res.json({ success: false, error: 'Token is invalid or expired' });
      }
    } catch (error) {
      console.error(`[Settings] Error testing connection:`, error);
      res.json({ success: false, error: error.message });
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

      // YouTube and TikTok support token refresh
      if (!['youtube', 'tiktok'].includes(platform)) {
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

      let newTokenData;
      if (platform === 'youtube') {
        newTokenData = await youtubeOAuth.refreshToken(tokenData.refresh_token);
      } else if (platform === 'tiktok') {
        newTokenData = await tiktokOAuth.refreshToken(tokenData.refresh_token);
      }

      // For YouTube, include expires_at in response; for TikTok, preserve all existing fields
      let updateData = {
        access_token: newTokenData.access_token,
        refresh_token: newTokenData.refresh_token || tokenData.refresh_token
      };

      if (platform === 'youtube') {
        updateData.expires_at = youtubeOAuth.calculateExpiry(newTokenData.expires_in);
      } else if (platform === 'tiktok') {
        updateData.expires_at = tiktokOAuth.calculateExpiry(newTokenData.expires_in);
        
        // Preserve other TikTok fields from current data
        const db = await getDatabase();
        const business = await db.collection('store_submissions').findOne({
          _id: new ObjectId(businessId)
        });
        const currentTikTokData = business?.automation_settings?.social_media?.tiktok || {};
        updateData = { ...currentTikTokData, ...updateData };
      }

      await businessSettingsService.updatePlatformConnection(businessId, platform, updateData);

      console.log(`[OAuth] ${platform} token refreshed for business: ${businessId}`);

      const response = {
        success: true,
        message: 'Token refreshed successfully'
      };

      if (platform === 'youtube') {
        response.expires_at = youtubeOAuth.calculateExpiry(newTokenData.expires_in);
      } else if (platform === 'tiktok') {
        response.expires_at = tiktokOAuth.calculateExpiry(newTokenData.expires_in);
      }

      res.json(response);

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

router.get('/auth/tiktok/callback', async (req, res) => {
  try {
    // ✅ Extract stateToken (NOT businessId)
    const { code, state: stateToken, error, error_description } = req.query;
    
    console.log('[OAuth] TikTok callback received:', {
      hasCode: !!code,
      stateToken: stateToken?.substring(0, 16) + '...',
      error,
      error_description
    });
    
    if (error) {
      throw new Error(error_description || `TikTok error: ${error}`);
    }
    
    if (!code || !stateToken) {
      throw new Error('Missing authorization code or state token');
    }

    const redirectUri = `${process.env.APP_URL}/api/business-settings/auth/tiktok/callback`;

    console.log('[OAuth] Attempting token exchange...');
    
    // ✅ Pass stateToken - service will return businessId
    const tokenData = await tiktokOAuth.exchangeCodeForToken(code, redirectUri, stateToken);
    console.log('[OAuth] Token exchange successful');

    // ✅ Get businessId from returned token data
    const businessId = tokenData.businessId;
    
    if (!businessId) {
      throw new Error('Business ID not found in token response');
    }

    console.log('[OAuth] Business ID from state:', businessId.substring(0, 8) + '...');

    console.log('[OAuth] Fetching user info...');
    const userInfo = await tiktokOAuth.getUserInfo(tokenData.access_token);
    console.log('[OAuth] User info retrieved:', userInfo.username || userInfo.display_name);

    // Format data for storage
    const connectionData = tiktokOAuth.formatUserData(
      userInfo,
      tokenData.access_token,
      tokenData.refresh_token,
      tokenData.expires_in
    );

    // ✅ Save to database using businessId
    console.log('[OAuth] Saving TikTok connection...');
    await businessSettingsService.updatePlatformConnection(
      businessId,
      'tiktok',
      connectionData
    );

    console.log(`[OAuth] ✅ TikTok connected successfully`);
    console.log(`[OAuth] Business: ${businessId.substring(0, 8)}...`);
    console.log(`[OAuth] TikTok Account: ${userInfo.display_name || userInfo.open_id}`);

    // Success page
    res.send(OAuthTemplates.success('tiktok', {
      display_name: userInfo.display_name || userInfo.open_id || 'TikTok Account',
      username: userInfo.display_name || userInfo.open_id || 'TikTok',
      follower_count: 0
    }));

  } catch (error) {
    console.error('[OAuth] TikTok callback error:', error);
    console.error('[OAuth] Error stack:', error.stack);
    
    res.send(OAuthTemplates.error('tiktok', error.message));
  }
});


// TikTok Disconnect
router.post('/auth/tiktok/disconnect', async (req, res) => {
  try {
    const { businessId } = req.body;
    await businessSettingsService.disconnectPlatform(businessId, 'tiktok');
    res.json({ success: true, message: 'TikTok disconnected' });
  } catch (error) {
    console.error('[OAuth] TikTok disconnect error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// TikTok Test Connection
router.post('/auth/tiktok/test', async (req, res) => {
  try {
    const { businessId } = req.body;
    const tokenData = await businessSettingsService.getPlatformToken(businessId, 'tiktok');
    
    if (!tokenData || !tokenData.token) {
      return res.json({ success: false, error: 'TikTok not connected' });
    }

    const isValid = await tiktokOAuth.testConnection(tokenData.token, tokenData);
    
    if (isValid) {
      res.json({ success: true, message: 'Connection is working' });
    } else {
      res.json({ success: false, error: 'Token is invalid or expired' });
    }
  } catch (error) {
    console.error('[OAuth] TikTok test error:', error);
    res.json({ success: false, error: error.message });
  }
});



// -------------------------
// Test Apollo API Connection
// -------------------------
router.post('/:businessId/test-apollo',
  ValidationMiddleware.validateBusinessId,
  async (req, res) => {
    try {
      const { api_key } = req.body;

      if (!api_key) {
        return res.json({ 
          success: false, 
          error: 'API key is required' 
        });
      }

      console.log('[Apollo] Testing API connection...');

      // Test Apollo API with a simple request (e.g., get account info)
      const response = await fetch('https://api.apollo.io/v1/auth/health', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'X-Api-Key': api_key
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Invalid API key');
      }

      const data = await response.json();

      // Optionally get account details
      let accountName = 'Valid Account';
      try {
        const accountResponse = await fetch('https://api.apollo.io/v1/users/me', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': api_key
          }
        });
        
        if (accountResponse.ok) {
          const accountData = await accountResponse.json();
          accountName = accountData.user?.email || accountData.user?.name || 'Valid Account';
        }
      } catch (err) {
        console.warn('[Apollo] Could not fetch account details:', err.message);
      }

      res.json({ 
        success: true, 
        message: 'Apollo API connected successfully',
        account_name: accountName
      });

    } catch (error) {
      console.error('[Apollo] Test connection error:', error);
      res.json({ 
        success: false, 
        error: error.message || 'Failed to connect to Apollo API'
      });
    }
  }
);

module.exports = router;