// js/dataManager.js
class DataManager {
    constructor() {
      this.cache = {
        businesses: null,
        businessesTimestamp: null,
        cacheExpiry: 5 * 60 * 1000, // 5 minutes
        selectedBusiness: null,
        businessChangeCallbacks: [], // Initialize this array
        userEmail: null,
        userEmailTimestamp: null,
        businessCase: null,
        businessCaseTimestamp: null,
        auth0Client: null, // Auth0 client cache
        creativeModels: null, // Creative models cache
        creativeModelsTimestamp: null
      };
    }
  
    // Cache businesses data
    setBusinesses(businesses) {
      this.cache.businesses = businesses;
      this.cache.businessesTimestamp = Date.now();
      // Also store in sessionStorage for persistence across page reloads
      sessionStorage.setItem('cachedBusinesses', JSON.stringify({
        data: businesses,
        timestamp: this.cache.businessesTimestamp
      }));
    }
  
    // Get cached businesses
    getBusinesses() {
      // Check memory cache first
      if (this.cache.businesses && this.isCacheValid()) {
        return this.cache.businesses;
      }
  
      // Check sessionStorage
      const stored = sessionStorage.getItem('cachedBusinesses');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Date.now() - parsed.timestamp < this.cache.cacheExpiry) {
          this.cache.businesses = parsed.data;
          this.cache.businessesTimestamp = parsed.timestamp;
          return parsed.data;
        }
      }
  
      return null;
    }
  
    // Check if cache is still valid
    isCacheValid() {
      if (!this.cache.businessesTimestamp) return false;
      return Date.now() - this.cache.businessesTimestamp < this.cache.cacheExpiry;
    }
  
    // Set selected business (single definition)
    setSelectedBusiness(business) {
      this.cache.selectedBusiness = business;
      sessionStorage.setItem('selectedBusiness', JSON.stringify(business));
      
      // Notify all registered callbacks
      if (this.cache.businessChangeCallbacks) {
        this.cache.businessChangeCallbacks.forEach(callback => {
          try {
            callback(business);
          } catch (error) {
            console.error('Error in business change callback:', error);
          }
        });
      }
    }
  
    // Get selected business
    getSelectedBusiness() {
      if (this.cache.selectedBusiness) {
        return this.cache.selectedBusiness;
      }
  
      const stored = sessionStorage.getItem('selectedBusiness');
      if (stored) {
        this.cache.selectedBusiness = JSON.parse(stored);
        return this.cache.selectedBusiness;
      }
  
      return null;
    }
  
    // Clear cache
    clearCache() {
      this.cache = {
        businesses: null,
        businessesTimestamp: null,
        cacheExpiry: 5 * 60 * 1000,
        selectedBusiness: null,
        businessChangeCallbacks: [],
        userEmail: null,
        userEmailTimestamp: null,
        businessCase: null,
        businessCaseTimestamp: null,
        auth0Client: null,
        creativeModels: null,
        creativeModelsTimestamp: null
      };
      sessionStorage.removeItem('cachedBusinesses');
      sessionStorage.removeItem('selectedBusiness');
      sessionStorage.removeItem('cachedUserEmail');
      sessionStorage.removeItem('cachedBusinessCase');
      sessionStorage.removeItem('cachedCreativeModels');
    }
  
    // Register a callback for business changes
    onBusinessChange(callback) {
      if (!this.cache.businessChangeCallbacks) {
        this.cache.businessChangeCallbacks = [];
      }
      this.cache.businessChangeCallbacks.push(callback);
    }
  
    // Remove a callback
    offBusinessChange(callback) {
      if (this.cache.businessChangeCallbacks) {
        this.cache.businessChangeCallbacks = this.cache.businessChangeCallbacks.filter(cb => cb !== callback);
      }
    }
  
    // Get selected business with fallback to first business
    getSelectedBusinessOrFirst() {
      let selected = this.getSelectedBusiness();
      
      if (!selected && this.cache.businesses && this.cache.businesses.length > 0) {
        selected = this.cache.businesses[0];
        this.setSelectedBusiness(selected);
      }
      
      return selected;
    }

    // Add this method to the DataManager class in dataManager.js
    updateBusiness(updatedBusiness) {
      // Update in the businesses array if it exists
      if (this.cache.businesses) {
        const index = this.cache.businesses.findIndex(b => b._id === updatedBusiness._id);
        if (index !== -1) {
          this.cache.businesses[index] = updatedBusiness;
          // Update the cache in sessionStorage
          this.setBusinesses(this.cache.businesses);
        }
      }
      
      // Update if it's the selected business
      if (this.cache.selectedBusiness && this.cache.selectedBusiness._id === updatedBusiness._id) {
        this.setSelectedBusiness(updatedBusiness);
      }
    }

    // Cache user email
    setUserEmail(email) {
      this.cache.userEmail = email;
      this.cache.userEmailTimestamp = Date.now();
      sessionStorage.setItem('cachedUserEmail', JSON.stringify({
        data: email,
        timestamp: this.cache.userEmailTimestamp
      }));
    }

    // Get cached user email
    getUserEmail() {
      // Check memory cache first
      if (this.cache.userEmail && this.isCacheValid(this.cache.userEmailTimestamp)) {
        return this.cache.userEmail;
      }

      // Check sessionStorage
      const stored = sessionStorage.getItem('cachedUserEmail');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Date.now() - parsed.timestamp < this.cache.cacheExpiry) {
          this.cache.userEmail = parsed.data;
          this.cache.userEmailTimestamp = parsed.timestamp;
          return parsed.data;
        }
      }

      return null;
    }

    // Cache business case
    setBusinessCase(businessCase) {
      this.cache.businessCase = businessCase;
      this.cache.businessCaseTimestamp = Date.now();
      sessionStorage.setItem('cachedBusinessCase', JSON.stringify({
        data: businessCase,
        timestamp: this.cache.businessCaseTimestamp
      }));
    }

    // Get cached business case
    getBusinessCase() {
      // Check memory cache first
      if (this.cache.businessCase && this.isCacheValid(this.cache.businessCaseTimestamp)) {
        return this.cache.businessCase;
      }

      // Check sessionStorage
      const stored = sessionStorage.getItem('cachedBusinessCase');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Date.now() - parsed.timestamp < this.cache.cacheExpiry) {
          this.cache.businessCase = parsed.data;
          this.cache.businessCaseTimestamp = parsed.timestamp;
          return parsed.data;
        }
      }

      return null;
    }

    // Check cache validity with custom timestamp
    isCacheValid(timestamp) {
      if (!timestamp) return false;
      return Date.now() - timestamp < this.cache.cacheExpiry;
    }

    // Cache user name
    setUserName(name) {
      this.cache.userName = name;
      sessionStorage.setItem('cachedUserName', name);
    }

    // Get cached user name
    getUserName() {
      if (this.cache.userName) {
        return this.cache.userName;
      }
      const stored = sessionStorage.getItem('cachedUserName');
      if (stored) {
        this.cache.userName = stored;
        return stored;
      }
      return null;
    }

    // Cache Auth0 Client
    setAuth0Client(auth0Client) {
      this.cache.auth0Client = auth0Client;
    }

    // Get cached Auth0 Client
    getAuth0Client() {
      return this.cache.auth0Client;
    }

    // Cache creative models
    setCreativeModels(models) {
      this.cache.creativeModels = models;
      this.cache.creativeModelsTimestamp = Date.now();
      sessionStorage.setItem('cachedCreativeModels', JSON.stringify({
        data: models,
        timestamp: this.cache.creativeModelsTimestamp
      }));
    }

    // Get cached creative models
    getCreativeModels() {
      // Check memory cache first
      if (this.cache.creativeModels && this.isCacheValid(this.cache.creativeModelsTimestamp)) {
        return this.cache.creativeModels;
      }

      // Check sessionStorage
      const stored = sessionStorage.getItem('cachedCreativeModels');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Date.now() - parsed.timestamp < this.cache.cacheExpiry) {
            this.cache.creativeModels = parsed.data;
            this.cache.creativeModelsTimestamp = parsed.timestamp;
            return parsed.data;
          }
        } catch (error) {
          console.error('Error parsing cached creative models:', error);
        }
      }

      return null;
    }

    // Clear creative models cache (for refresh)
    clearCreativeModelsCache() {
      this.cache.creativeModels = null;
      this.cache.creativeModelsTimestamp = null;
      sessionStorage.removeItem('cachedCreativeModels');
    }
  }

  
  
  // Create singleton instance
  window.dataManager = new DataManager();