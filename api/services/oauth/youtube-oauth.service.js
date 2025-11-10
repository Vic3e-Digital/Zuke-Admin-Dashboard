const OAuthService = require('./oauth.service');

class YouTubeOAuthService extends OAuthService {
  constructor() {
    super('youtube');
    this.clientId = process.env.GOOGLE_CLIENT_ID;
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  }

  getAuthUrl(businessId, redirectUri) {
    const scopes = [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.force-ssl',
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/userinfo.profile'
    ];

    return `https://accounts.google.com/o/oauth2/v2/auth?` +
      `response_type=code` +
      `&client_id=${this.clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${businessId}` +
      `&scope=${encodeURIComponent(scopes.join(' '))}` +
      `&access_type=offline` +
      `&prompt=consent`;
  }

  async exchangeCodeForToken(code, redirectUri) {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });

    const data = await response.json();

    if (!data.access_token) {
      throw new Error(data.error_description || 'Failed to get access token');
    }

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in || 3600
    };
  }

  async refreshToken(refreshToken) {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })
    });

    const data = await response.json();

    if (!data.access_token) {
      throw new Error(data.error_description || 'Failed to refresh token');
    }

    return {
      access_token: data.access_token,
      expires_in: data.expires_in || 3600
    };
  }

  async getChannels(accessToken) {
    const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails,statistics&mine=true`;
    
    const data = await this.fetchWithAuth(url, accessToken);

    if (!data.items || data.items.length === 0) {
      throw new Error('No YouTube channel found. Please create a YouTube channel first.');
    }

    return data.items.map(item => ({
      id: item.id,
      name: item.snippet.title,
      customUrl: item.snippet.customUrl || '',
      description: item.snippet.description || '',
      thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url || '',
      subscriberCount: parseInt(item.statistics?.subscriberCount || '0'),
      videoCount: parseInt(item.statistics?.videoCount || '0'),
      viewCount: parseInt(item.statistics?.viewCount || '0')
    }));
  }

  async testConnection(accessToken, platformData) {
    try {
      const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${platformData.channel_id}`;
      const data = await this.fetchWithAuth(url, accessToken);
      return data.items && data.items.length > 0;
    } catch (error) {
      return false;
    }
  }

  formatChannelData(channel, accessToken, refreshToken, expiresIn) {
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      channel_id: channel.id,
      channel_name: channel.name,
      custom_url: channel.customUrl,
      channel_thumbnail: channel.thumbnail,
      subscriber_count: channel.subscriberCount,
      video_count: channel.videoCount,
      view_count: channel.viewCount,
      expires_at: this.calculateExpiry(expiresIn)
    };
  }
}

module.exports = new YouTubeOAuthService();