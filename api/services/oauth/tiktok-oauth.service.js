const OAuthService = require('./oauth.service');
const crypto = require('crypto');

class TikTokOAuthService extends OAuthService {
  constructor() {
    super('tiktok');
    this.clientKey = process.env.TIKTOK_CLIENT_KEY;
    this.clientSecret = process.env.TIKTOK_CLIENT_SECRET;
    
    // Use sandbox for testing
    this.apiBaseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://open.tiktokapis.com/v2'
      : 'https://open-sandbox.tiktokapis.com/v2';
    
    // Store PKCE state (in production, use Redis)
    this.authStates = new Map();
    
    console.log('[TikTok] Service initialized:', {
      environment: process.env.NODE_ENV || 'development',
      apiBaseUrl: this.apiBaseUrl,
      hasClientKey: !!this.clientKey,
      hasClientSecret: !!this.clientSecret
    });
  }

  /**
   * Generate PKCE code verifier and challenge
   */
  generatePKCE() {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
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
    // Validate credentials
    if (!this.clientKey || !this.clientSecret) {
      throw new Error('TikTok credentials not configured. Check TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET in .env');
    }

    const scopes = [
      'user.info.basic',
      'video.list',
      'video.upload'
    ];

    // Generate PKCE parameters
    const { codeVerifier, codeChallenge } = this.generatePKCE();
    
    // Generate random state token
    const stateToken = crypto.randomBytes(32).toString('base64url');
    
    // Store state data
    this.authStates.set(stateToken, {
      businessId,
      codeVerifier,
      timestamp: Date.now()
    });
    
    // Clean up after 10 minutes
    setTimeout(() => {
      this.authStates.delete(stateToken);
    }, 10 * 60 * 1000);

    console.log('[TikTok] Generated auth URL:', {
      stateToken: stateToken.substring(0, 10) + '...',
      businessId: businessId.substring(0, 10) + '...',
      redirectUri,
      environment: process.env.NODE_ENV || 'development'
    });

    // Use sandbox authorization URL for development
    const authBaseUrl = process.env.NODE_ENV === 'production'
      ? 'https://www.tiktok.com/v2/auth/authorize/'
      : 'https://www.tiktok.com/v2/auth/authorize/'; // Same for both, but keeping for clarity

    return `${authBaseUrl}?` +
      `client_key=${this.clientKey}` +
      `&scope=${scopes.join(',')}` +
      `&response_type=code` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${stateToken}` +
      `&code_challenge=${codeChallenge}` +
      `&code_challenge_method=S256`;
  }

  /**
   * Exchange authorization code for access token (with PKCE)
   */
  async exchangeCodeForToken(code, redirectUri, stateToken) {
    try {
      console.log('[TikTok] Exchanging code, state token:', stateToken.substring(0, 10) + '...');
      
      // Retrieve stored state data
      const stateData = this.authStates.get(stateToken);
      
      if (!stateData) {
        console.error('[TikTok] State not found for token:', stateToken.substring(0, 10) + '...');
        console.log('[TikTok] Available states:', Array.from(this.authStates.keys()).map(k => k.substring(0, 10) + '...'));
        throw new Error('Invalid state token. Please try connecting again.');
      }

      const { businessId, codeVerifier } = stateData;
      
      console.log('[TikTok] Retrieved state data:', { 
        businessId: businessId.substring(0, 10) + '...', 
        hasVerifier: !!codeVerifier 
      });

      const requestBody = new URLSearchParams({
        client_key: this.clientKey,
        client_secret: this.clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code_verifier: codeVerifier
      });

      console.log('[TikTok] Making token request to:', `${this.apiBaseUrl}/oauth/token/`);

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

      // Clean up the used state
      this.authStates.delete(stateToken);

      // Handle errors
      if (data.error) {
        console.error('[TikTok] Token exchange error:', data.error);
        const errorMessage = data.error.message || data.error_description || 'Token exchange failed';
        throw new Error(errorMessage);
      }

      if (!data.access_token) {
        console.error('[TikTok] No access_token in response:', data);
        throw new Error('No access token received from TikTok');
      }

      console.log('[TikTok] Token exchange successful');

      return {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in || 86400,
        open_id: data.open_id,
        businessId // Return businessId for callback handler
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

    if (data.error) {
      throw new Error(data.error.message || data.error_description || 'Failed to refresh token');
    }

    if (!data.access_token) {
      throw new Error('No access token received from TikTok');
    }

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

    console.log('[TikTok] Fetching user info from:', url);

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    console.log('[TikTok] User info response:', JSON.stringify(data, null, 2));

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