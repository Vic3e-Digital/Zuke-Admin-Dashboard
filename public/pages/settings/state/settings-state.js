export class SettingsState {
    constructor() {
      this.currentBusiness = null;
      this.businessSettings = {};
      this.isLoading = false;
      this.listeners = [];
    }
  
    setCurrentBusiness(business) {
      this.currentBusiness = business;
      this.notifyListeners('business-changed', business);
    }
  
    setBusinessSettings(settings) {
      this.businessSettings = settings;
      this.notifyListeners('settings-changed', settings);
    }
  
    setLoading(isLoading) {
      this.isLoading = isLoading;
      this.notifyListeners('loading-changed', isLoading);
    }
  
    getCurrentBusiness() {
      return this.currentBusiness;
    }
  
    getBusinessSettings() {
      return this.businessSettings;
    }
  
    isCurrentlyLoading() {
      return this.isLoading;
    }
  
    subscribe(callback) {
      this.listeners.push(callback);
      return () => {
        this.listeners = this.listeners.filter(listener => listener !== callback);
      };
    }
  
    notifyListeners(event, data) {
      this.listeners.forEach(listener => {
        try {
          listener(event, data);
        } catch (error) {
          console.error('Error in state listener:', error);
        }
      });
    }
  
    clear() {
      this.currentBusiness = null;
      this.businessSettings = {};
      this.notifyListeners('state-cleared', null);
    }
  }