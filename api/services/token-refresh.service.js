const businessSettingsService = require('./business-settings.service');
const tiktokOAuth = require('./oauth/tiktok-oauth.service');

class TokenRefreshService {
  constructor() {
    this.refreshInterval = 12 * 60 * 60 * 1000; // 12 hours
  }

  /**
   * Start automatic token refresh for all platforms
   */
  startAutoRefresh() {
    console.log('[TokenRefresh] Starting automatic token refresh...');
    
    // Run immediately on startup
    this.refreshAllTokens();
    
    // Then run every 12 hours
    setInterval(() => {
      this.refreshAllTokens();
    }, this.refreshInterval);
  }

  /**
   * Refresh tokens for all businesses
   */
  async refreshAllTokens() {
    try {
      console.log('[TokenRefresh] Checking tokens for all businesses...');
      
      // Get all businesses with TikTok connected
      const businesses = await this.getBusinessesWithTikTok();
      
      for (const business of businesses) {
        await this.refreshTikTokToken(business._id);
      }
      
      console.log(`[TokenRefresh] ✅ Refreshed tokens for ${businesses.length} businesses`);
    } catch (error) {
      console.error('[TokenRefresh] Error refreshing tokens:', error);
    }
  }

  /**
   * Refresh TikTok token for a specific business
   */
  async refreshTikTokToken(businessId) {
    try {
      const settings = await businessSettingsService.getSettings(businessId);
      const tiktok = settings.social_media?.tiktok;
      
      if (!tiktok?.connected || !tiktok.refresh_token) {
        return;
      }

      // Check if token expires within 24 hours
      const expiresAt = new Date(tiktok.expires_at);
      const hoursUntilExpiry = (expiresAt - Date.now()) / (1000 * 60 * 60);
      
      if (hoursUntilExpiry > 24) {
        console.log(`[TokenRefresh] Token for ${businessId} still valid for ${hoursUntilExpiry.toFixed(1)} hours`);
        return;
      }

      console.log(`[TokenRefresh] Refreshing TikTok token for ${businessId}...`);

      // Decrypt refresh token
      const tokenData = await businessSettingsService.getPlatformToken(businessId, 'tiktok');
      
      // Refresh token
      const newTokenData = await tiktokOAuth.refreshToken(tokenData.refresh_token);

      // Save new token
      await businessSettingsService.updatePlatformConnection(businessId, 'tiktok', {
        access_token: newTokenData.access_token,
        refresh_token: newTokenData.refresh_token,
        expires_at: tiktokOAuth.calculateExpiry(newTokenData.expires_in)
      });

      console.log(`[TokenRefresh] ✅ Refreshed TikTok token for ${businessId}`);
    } catch (error) {
      console.error(`[TokenRefresh] Error refreshing TikTok for ${businessId}:`, error);
    }
  }

  /**
   * Get all businesses with TikTok connected
   */
  async getBusinessesWithTikTok() {
    const { getDatabase } = require('../../lib/mongodb');
    const db = await getDatabase();
    
    return await db.collection('store_submissions').find({
      'automation_settings.social_media.tiktok.connected': true,
      'automation_settings.social_media.tiktok.status': 'active'
    }).toArray();
  }
}

module.exports = new TokenRefreshService();