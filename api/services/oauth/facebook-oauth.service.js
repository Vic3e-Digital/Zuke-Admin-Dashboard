const OAuthService = require('./oauth.service');

class FacebookOAuthService extends OAuthService {
  constructor() {
    super('facebook');
    this.clientId = process.env.FACEBOOK_APP_ID;
    this.clientSecret = process.env.FACEBOOK_APP_SECRET;
    this.apiVersion = 'v18.0';
  }

  getAuthUrl(businessId, redirectUri) {
    const scopes = [
      'pages_manage_posts',
      'pages_read_engagement',
      'instagram_basic',
      'instagram_content_publish'
    ];

    return `https://www.facebook.com/${this.apiVersion}/dialog/oauth?` +
      `client_id=${this.clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${businessId}` +
      `&scope=${scopes.join(',')}`;
  }

  async exchangeCodeForToken(code, redirectUri) {
    const tokenUrl = `https://graph.facebook.com/${this.apiVersion}/oauth/access_token?` +
      `client_id=${this.clientId}` +
      `&client_secret=${this.clientSecret}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&code=${code}`;

    const response = await fetch(tokenUrl);
    const data = await response.json();

    if (!data.access_token) {
      throw new Error('Failed to get access token');
    }

    return this.getLongLivedToken(data.access_token);
  }

  async getLongLivedToken(shortLivedToken) {
    const url = `https://graph.facebook.com/${this.apiVersion}/oauth/access_token?` +
      `grant_type=fb_exchange_token` +
      `&client_id=${this.clientId}` +
      `&client_secret=${this.clientSecret}` +
      `&fb_exchange_token=${shortLivedToken}`;

    const response = await fetch(url);
    const data = await response.json();

    return {
      access_token: data.access_token,
      expires_in: 60 * 24 * 60 * 60 // 60 days
    };
  }

  async getPages(accessToken) {
    const url = `https://graph.facebook.com/${this.apiVersion}/me/accounts?` +
      `fields=id,name,category,access_token,picture.type(large)` +
      `&access_token=${accessToken}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      throw new Error('No Facebook pages found. Please create a Facebook page first.');
    }

    return data.data;
  }

  async testConnection(accessToken, platformData) {
    const url = `https://graph.facebook.com/${this.apiVersion}/me?access_token=${accessToken}`;
    const response = await fetch(url);
    return response.ok;
  }

  formatPageData(page, accessToken, expiresIn) {
    return {
      access_token: page.access_token,
      page_id: page.id,
      page_name: page.name,
      page_category: page.category || '',
      page_picture: page.picture?.data?.url || '',
      expires_at: this.calculateExpiry(expiresIn)
    };
  }
}

module.exports = new FacebookOAuthService();