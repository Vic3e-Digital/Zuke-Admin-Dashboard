class OAuthService {
    constructor(platform) {
      this.platform = platform;
    }
  
    getAuthUrl(businessId, clientId, redirectUri, scopes) {
      throw new Error('getAuthUrl must be implemented by subclass');
    }
  
    async exchangeCodeForToken(code, redirectUri) {
      throw new Error('exchangeCodeForToken must be implemented by subclass');
    }
  
    async refreshToken(refreshToken) {
      throw new Error('refreshToken must be implemented by subclass');
    }
  
    async getUserData(accessToken) {
      throw new Error('getUserData must be implemented by subclass');
    }
  
    async testConnection(accessToken, platformData) {
      throw new Error('testConnection must be implemented by subclass');
    }
  
    calculateExpiry(expiresIn) {
      return new Date(Date.now() + (expiresIn * 1000));
    }
  
    async fetchWithAuth(url, accessToken, options = {}) {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          ...options.headers
        }
      });
  
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error_description || error.message || 'API request failed');
      }
  
      return response.json();
    }
  }
  
  module.exports = OAuthService;