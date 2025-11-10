const OAuthService = require('./oauth.service');
const crypto = require('crypto');

class TikTokOAuthService extends OAuthService {
  constructor() {
    super('tiktok');
    this.clientKey = process.env.TIKTOK_CLIENT_KEY;
    this.clientSecret = process.env.TIKTOK_CLIENT_SECRET;
    this.apiBaseUrl = 'https://open.tiktokapis.com/v2';
    
    // Store code verifiers temporarily (in production, use Redis or session storage)
    this.codeVerifiers = new Map();
  }

  /**
   * Generate PKCE code verifier and challenge
   */
  generatePKCE() {
    // Generate code_verifier (43-128 characters)
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    
    // Generate code_challenge (SHA256 hash of verifier, base64url encoded)
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');
    
    return { codeVerifier, codeChallenge };
  }

  /**
   * Generate TikTok OAuth authorization URL with PKCE
   */
  getAuthUrl(businessId, redirectUri) {
    const scopes = [
      'user.info.basic',
      'video.list',
      'video.upload'
    ];

    // Generate PKCE parameters
    const { codeVerifier, codeChallenge } = this.generatePKCE();
    
    // Store code_verifier for later use (keyed by businessId)
    this.codeVerifiers.set(businessId, codeVerifier);
    
    // Clean up old verifiers after 10 minutes
    setTimeout(() => {
      this.codeVerifiers.delete(businessId);
    }, 10 * 60 * 1000);

    const state = encodeURIComponent(businessId);

    return `https://www.tiktok.com/v2/auth/authorize/?` +
      `client_key=${this.clientKey}` +
      `&scope=${scopes.join(',')}` +
      `&response_type=code` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${state}` +
      `&code_challenge=${codeChallenge}` +  // ✅ ADD THIS
      `&code_challenge_method=S256`;         // ✅ ADD THIS
  }


  /**
 * Exchange authorization code for access token (with PKCE)
 */
async exchangeCodeForToken(code, redirectUri, businessId) {
    try {
      // Retrieve the stored code_verifier
      const codeVerifier = this.codeVerifiers.get(businessId);
      
      if (!codeVerifier) {
        console.error('[TikTok] Code verifier not found for businessId:', businessId);
        throw new Error('Code verifier not found. Please try connecting again.');
      }
  
      console.log('[TikTok] Token exchange request:', {
        businessId,
        hasCode: !!code,
        hasVerifier: !!codeVerifier,
        redirectUri
      });
  
      const requestBody = new URLSearchParams({
        client_key: this.clientKey,
        client_secret: this.clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code_verifier: codeVerifier
      });
  
      console.log('[TikTok] Request body:', requestBody.toString());
  
      const response = await fetch(`${this.apiBaseUrl}/oauth/token/`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cache-Control': 'no-cache'
        },
        body: requestBody
      });
  
      console.log('[TikTok] Response status:', response.status);
      
      const responseText = await response.text();
      console.log('[TikTok] Response body:', responseText);
  
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('[TikTok] Failed to parse response:', parseError);
        throw new Error(`Invalid response from TikTok: ${responseText.substring(0, 200)}`);
      }
  
      // Clean up the used code_verifier
      this.codeVerifiers.delete(businessId);
  
      // ✅ FIXED: TikTok returns data at root level, not nested under "data"
      if (data.error) {
        console.error('[TikTok] Token exchange error:', data.error);
        const errorMessage = data.error.message || data.error_description || 'Token exchange failed';
        throw new Error(errorMessage);
      }
  
      // ✅ Check for access_token at root level
      if (!data.access_token) {
        console.error('[TikTok] No access_token in response:', data);
        throw new Error('No access token received from TikTok');
      }
  
      console.log('[TikTok] Token exchange successful');
  
      // ✅ Return data from root level
      return {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in || 86400,
        open_id: data.open_id  // Also return open_id for reference
      };
    } catch (error) {
      console.error('[TikTok] exchangeCodeForToken error:', error);
      throw error;
    }
  }

  
  /**
 * Refresh access token
 */
async refreshToken(refreshToken) {
    const response = await fetch(`${this.apiBaseUrl}/oauth/token/`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cache-Control': 'no-cache'
      },
      body: new URLSearchParams({
        client_key: this.clientKey,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      })
    });
  
    const data = await response.json();
  
    // ✅ FIXED: Check at root level
    if (data.error) {
      throw new Error(data.error.message || data.error_description || 'Failed to refresh token');
    }
  
    if (!data.access_token) {
      throw new Error('No access token received from TikTok');
    }
  
    // ✅ Return from root level
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in || 86400
    };
  }

  /**
   * Get user information
   */
  async getUserInfo(accessToken) {
    const fields = [
      'open_id',
      'union_id',
      'avatar_url',
      'display_name',
      'username',
      'follower_count',
      'following_count',
      'likes_count',
      'video_count'
    ];

    const url = `${this.apiBaseUrl}/user/info/?fields=${fields.join(',')}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (data.error || !data.data?.user) {
      throw new Error(data.error?.message || 'Failed to get user info');
    }

    return data.data.user;
  }

  /**
   * Test if connection is valid
   */
  async testConnection(accessToken, platformData) {
    try {
      const url = `${this.apiBaseUrl}/user/info/?fields=open_id,display_name`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      return data.data?.user?.open_id === platformData.open_id;
    } catch (error) {
      console.error('[TikTok] Test connection error:', error);
      return false;
    }
  }

  /**
   * Format user data for database storage
   */
  formatUserData(user, accessToken, refreshToken, expiresIn) {
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      open_id: user.open_id,
      union_id: user.union_id || '',
      username: user.username || '',
      display_name: user.display_name || '',
      avatar_url: user.avatar_url || '',
      follower_count: user.follower_count || 0,
      following_count: user.following_count || 0,
      video_count: user.video_count || 0,
      likes_count: user.likes_count || 0,
      expires_at: this.calculateExpiry(expiresIn)
    };
  }
}

module.exports = new TikTokOAuthService();