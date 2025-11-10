// Centralized API handling
export class ApiService {
    constructor(baseUrl = '/api') {
      this.baseUrl = baseUrl;
    }
  
    async request(endpoint, options = {}) {
      try {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          headers: {
            'Content-Type': 'application/json',
            ...options.headers
          },
          ...options
        });
  
        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.message || `Request failed: ${response.statusText}`);
        }
  
        return await response.json();
      } catch (error) {
        console.error(`API Error [${endpoint}]:`, error);
        throw error;
      }
    }
  
    // Business settings
    async getBusinessSettings(businessId) {
      return this.request(`/business-settings/${businessId}`);
    }
  
    async updateBusinessSettings(businessId, settings) {
      return this.request(`/business-settings/${businessId}`, {
        method: 'PATCH',
        body: JSON.stringify(settings)
      });
    }
  
    // Social media connections
    async connectPlatform(platform, businessId) {
      return this.request(`/business-settings/auth/${platform}/connect?businessId=${businessId}`);
    }
  
    async disconnectPlatform(platform, businessId) {
      return this.request(`/business-settings/auth/${platform}/disconnect`, {
        method: 'POST',
        body: JSON.stringify({ businessId })
      });
    }
  
    async testConnection(platform, businessId) {
      return this.request(`/business-settings/auth/${platform}/test`, {
        method: 'POST',
        body: JSON.stringify({ businessId })
      });
    }
  
    async refreshToken(platform, businessId) {
      return this.request(`/business-settings/auth/${platform}/refresh`, {
        method: 'POST',
        body: JSON.stringify({ businessId })
      });
    }
  
    // Business management
    async sendBusinessWebhook(action, businessId, payload) {
      return this.request('/business-webhook-config', {
        method: 'POST',
        body: JSON.stringify({
          action,
          businessId,
          timestamp: new Date().toISOString(),
          ...payload
        })
      });
    }
  
    // User profile
    async updateUserProfile(userId, data) {
      return this.request('/user/update-profile', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, ...data })
      });
    }
  
    // Configuration
    async getCloudinaryConfig() {
      return this.request('/cloudinary-config');
    }
  
    async getDefaultWebhookConfig() {
      return this.request('/default-webhook-config');
    }
  }