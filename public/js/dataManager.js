// js/dataManager.js
class DataManager {
    constructor() {
      this.cache = {
        businesses: null,
        businessesTimestamp: null,
        cacheExpiry: 5 * 60 * 1000, // 5 minutes
        selectedBusiness: null,
        businessChangeCallbacks: [] // Initialize this array
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
        businessChangeCallbacks: []
      };
      sessionStorage.removeItem('cachedBusinesses');
      sessionStorage.removeItem('selectedBusiness');
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
  }

  
  
  // Create singleton instance
  window.dataManager = new DataManager();