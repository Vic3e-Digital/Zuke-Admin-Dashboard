const OAuthService = require('./oauth.service');
const crypto = require('crypto');

class TikTokOAuthService extends OAuthService {
  constructor() {
    super('tiktok');
    this.clientKey = process.env.TIKTOK_CLIENT_KEY;
    this.clientSecret = process.env.TIKTOK_CLIENT_SECRET;
    this.apiBaseUrl = 'https://open.tiktokapis.com/v2';
    this.oauthStates = new Map();
  }

  generatePKCE() {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');
    
    return { codeVerifier, codeChallenge };
  }

  getAuthUrl(businessId, redirectUri) {
    const scopes = [
      'user.info.basic',
      'video.list',
      'video.upload'
    ];

    const { codeVerifier, codeChallenge } = this.generatePKCE();
    const stateToken = crypto.randomBytes(32).toString('base64url');
    
    this.oauthStates.set(stateToken, {
      businessId: businessId,
      codeVerifier: codeVerifier,
      timestamp: Date.now()
    });
    
    setTimeout(() => {
      this.oauthStates.delete(stateToken);
    }, 10 * 60 * 1000);

    console.log('[TikTok] 🔐 Generated OAuth state');

    return `https://www.tiktok.com/v2/auth/authorize/?` +
      `client_key=${this.clientKey}` +
      `&scope=${scopes.join(',')}` +
      `&response_type=code` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${stateToken}` +
      `&code_challenge=${codeChallenge}` +
      `&code_challenge_method=S256`;
  }

  async exchangeCodeForToken(code, redirectUri, stateToken) {
    try {
      console.log('[TikTok] 🔄 Exchanging code for token...');
      
      const stateData = this.oauthStates.get(stateToken);
      
      if (!stateData) {
        throw new Error('Invalid or expired state token. Please try connecting again.');
      }

      const { businessId, codeVerifier } = stateData;

      const requestBody = new URLSearchParams({
        client_key: this.clientKey,
        client_secret: this.clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code_verifier: codeVerifier
      });

      const response = await fetch(`${this.apiBaseUrl}/oauth/token/`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cache-Control': 'no-cache'
        },
        body: requestBody
      });

      const data = await response.json();
      this.oauthStates.delete(stateToken);

      if (data.error || !data.access_token) {
        throw new Error(data.error?.message || 'Token exchange failed');
      }

      console.log('[TikTok] ✅ Token exchange successful');

      return {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in || 86400,
        open_id: data.open_id,
        businessId: businessId
      };
    } catch (error) {
      console.error('[TikTok] ❌ Token exchange error:', error);
      throw error;
    }
  }

  async getUserInfo(accessToken) {
    // ✅ ONLY request fields available with user.info.basic
    const fields = ['open_id', 'union_id', 'avatar_url', 'display_name'];

    const url = `${this.apiBaseUrl}/user/info/?fields=${fields.join(',')}`;

    console.log('[TikTok] 📥 Getting basic user info...');

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    console.log('[TikTok] Response status:', response.status);

    if (data.error && data.error.code !== 'ok') {
      console.error('[TikTok] API Error:', data.error);
      throw new Error(data.error.message || 'Failed to get user info');
    }

    if (!data.data?.user) {
      throw new Error('No user data in response');
    }

    console.log('[TikTok] ✅ User info retrieved:', data.data.user.display_name);

    return data.data.user;
  }

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
      
      if (data.error && data.error.code !== 'ok') {
        return false;
      }
      
      return data.data?.user?.open_id === platformData.open_id;
    } catch (error) {
      console.error('[TikTok] Test error:', error);
      return false;
    }
  }

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

    if (data.error || !data.access_token) {
      throw new Error(data.error?.message || 'Failed to refresh token');
    }

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in || 86400
    };
  }

  formatUserData(user, accessToken, refreshToken, expiresIn) {
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      open_id: user.open_id,
      union_id: user.union_id || '',
      username: user.display_name || '', // Use display_name since username not available
      display_name: user.display_name || '',
      avatar_url: user.avatar_url || '',
      follower_count: 0, // Not available with basic scope
      following_count: 0,
      video_count: 0,
      likes_count: 0,
      expires_at: this.calculateExpiry(expiresIn)
    };
  }
}

module.exports = new TikTokOAuthService();