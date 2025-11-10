// Auth0 handling
export class AuthService {
    constructor() {
      this.client = null;
    }
  
    async initialize() {
      if (this.client) return this.client;
  
      if (window.auth0Client) {
        this.client = window.auth0Client;
        return this.client;
      }
  
      try {
        const response = await fetch("/auth_config.json");
        const config = await response.json();
  
        this.client = await auth0.createAuth0Client({
          domain: config.domain,
          clientId: config.clientId,
          cacheLocation: 'localstorage',
          useRefreshTokens: true
        });
  
        window.auth0Client = this.client;
        return this.client;
      } catch (error) {
        console.error("Auth0 initialization error:", error);
        throw error;
      }
    }
  
    async getUser() {
      if (!this.client) await this.initialize();
      return this.client.getUser();
    }
  
    async isAuthenticated() {
      if (!this.client) await this.initialize();
      return this.client.isAuthenticated();
    }
  }