// services/oauth/instagram-oauth.service.js
const OAuthService = require('./oauth.service');

class InstagramOAuthService extends OAuthService {
  constructor() {
    super('instagram');
    this.clientId = process.env.FACEBOOK_APP_ID;
    this.clientSecret = process.env.FACEBOOK_APP_SECRET;
    this.apiVersion = 'v18.0';
  }

  getAuthUrl(businessId, redirectUri) {
    const scopes = [
      'instagram_basic',
      'instagram_content_publish',
      'pages_read_engagement'
    ];

    return `https://www.facebook.com/${this.apiVersion}/dialog/oauth?` +
      `client_id=${this.clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${businessId}` +
      `&scope=${scopes.join(',')}`;
  }

  async getInstagramAccounts(accessToken) {
    const url = `https://graph.facebook.com/${this.apiVersion}/me/accounts?` +
      `fields=id,name,instagram_business_account{id,username,name,profile_picture_url},picture.type(large)` +
      `&access_token=${accessToken}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      throw new Error('No Facebook pages found.');
    }

    const pagesWithInstagram = data.data.filter(page => page.instagram_business_account);

    if (pagesWithInstagram.length === 0) {
      throw new Error('No Instagram Business Accounts found. Please connect an Instagram Business account to one of your Facebook Pages first.');
    }

    return pagesWithInstagram;
  }

  formatAccountData(page, accessToken, expiresIn) {
    const igAccount = page.instagram_business_account;
    return {
      access_token: accessToken,
      account_id: igAccount.id,
      username: igAccount.username || '',
      account_name: igAccount.name || igAccount.username || '',
      profile_picture: igAccount.profile_picture_url || '',
      connected_page_id: page.id,
      connected_page_name: page.name,
      expires_at: this.calculateExpiry(expiresIn)
    };
  }
}

module.exports = new InstagramOAuthService();