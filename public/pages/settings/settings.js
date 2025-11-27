// Import all dependencies
import { ApiService } from './services/api.service.js';
import { AuthService } from './services/auth.service.js';
import { CloudinaryService } from './services/cloudinary.service.js';
import { NotificationManager } from './utils/notifications.js';
import { SocialConnectionsComponent } from './components/social-connections.js';
import { AutomationPanelComponent } from './components/automation-panel.js';
import { PreferencesPanelComponent } from './components/preferences-panel.js';
import { ProfilePanelComponent } from './components/profile-panel.js';
import { BusinessManagementComponent } from './components/business-management.js';
import { CreativePanelComponent } from './components/creative-panel.js';
import { SettingsState } from './state/settings-state.js';

// ===== MAIN SETTINGS CONTROLLER =====
class SettingsController {
  constructor() {
    // Initialize services
    this.api = new ApiService();
    this.auth = new AuthService();
    this.cloudinary = new CloudinaryService(this.api);
    this.notifications = new NotificationManager();

    // Initialize state
    this.state = new SettingsState();

    // Initialize components
    this.socialConnections = new SocialConnectionsComponent(this.api, this.notifications);
    this.automationPanel = new AutomationPanelComponent(this.api, this.notifications);
    this.preferencesPanel = new PreferencesPanelComponent(this.api, this.notifications);
    this.profilePanel = new ProfilePanelComponent(
      this.api,
      this.auth,
      this.cloudinary,
      this.notifications
    );
    this.businessManagement = new BusinessManagementComponent(this.api, this.notifications);
    this.creativePanel = new CreativePanelComponent(this.api, this.notifications);

    // Bind methods
    this.init = this.init.bind(this);
    this.loadBusinessSettings = this.loadBusinessSettings.bind(this);
    this.refreshData = this.refreshData.bind(this);
  }

  async init() {
    try {
      // Initialize Auth0
      await this.auth.initialize();

      const isAuthenticated = await this.auth.isAuthenticated();
      if (!isAuthenticated) {
        console.error("User not authenticated");
        window.location.href = '/';
        return;
      }

      // Get current business
      const currentBusiness = window.dataManager?.getSelectedBusinessOrFirst();

      if (!currentBusiness) {
        this.showNoBusinessState();
        return;
      }

      this.state.setCurrentBusiness(currentBusiness);
      this.showSettingsContent();

      // Load settings
      await this.loadBusinessSettings();

      // Setup navigation
      this.setupTabNavigation();

      // Setup global event listeners
      this.setupGlobalListeners();

      // Expose global functions for HTML onclick handlers
      this.exposeGlobalFunctions();

      console.log('✅ Settings initialized for:', currentBusiness.store_info?.name);

    } catch (error) {
      console.error("❌ Error initializing settings:", error);
      this.notifications.show('Failed to initialize settings page', 'error');
    }
  }

  showNoBusinessState() {
    document.getElementById('noBusinessState').style.display = 'block';
    document.getElementById('settingsContent').style.display = 'none';
  }

  showSettingsContent() {
    document.getElementById('noBusinessState').style.display = 'none';
    document.getElementById('settingsContent').style.display = 'block';
    this.updateBusinessInfo();
  }

  updateBusinessInfo() {
    const currentBusiness = this.state.getCurrentBusiness();
    if (!currentBusiness) return;

    const subtitle = document.getElementById('businessSubtitle');
    const businessName = document.getElementById('businessName');
    const businessEmail = document.getElementById('businessEmail');
    const businessLogo = document.getElementById('businessLogo');

    if (subtitle) {
      subtitle.textContent = `Configure automation for ${currentBusiness.store_info?.name || 'your business'}`;
    }

    if (businessName) {
      businessName.textContent = currentBusiness.store_info?.name || 'Business Name';
    }

    if (businessEmail) {
      businessEmail.textContent = currentBusiness.personal_info?.email || '';
    }

    if (businessLogo && currentBusiness.media_files?.store_logo) {
      businessLogo.src = currentBusiness.media_files.store_logo;
      businessLogo.style.display = 'block';
    }
  }

  async loadBusinessSettings() {
    try {
      this.state.setLoading(true);
      this.notifications.show('Loading settings...', 'info');

      const currentBusiness = this.state.getCurrentBusiness();
      const data = await this.api.getBusinessSettings(currentBusiness._id);

      const businessSettings = data.automation_settings || this.getDefaultSettings();
      this.state.setBusinessSettings(businessSettings);

      // Update current business if fresh data available
      if (data.business) {
        this.state.setCurrentBusiness(data.business);
        if (window.dataManager?.updateBusiness) {
          window.dataManager.updateBusiness(data.business);
        }
        this.updateBusinessInfo();
      }

      // Render all components
      await this.renderAllComponents();

      this.notifications.show('Settings loaded', 'success');

    } catch (error) {
      console.error('Error loading business settings:', error);
      this.notifications.show('Failed to load settings', 'error');
      this.state.setBusinessSettings(this.getDefaultSettings());
    } finally {
      this.state.setLoading(false)

    }
  }

  async renderAllComponents() {
    const currentBusiness = this.state.getCurrentBusiness();
    const businessSettings = this.state.getBusinessSettings();

    // Render each panel
    this.socialConnections.render(businessSettings, currentBusiness);
    await this.automationPanel.render(businessSettings, currentBusiness);
    this.preferencesPanel.render(businessSettings, currentBusiness);
    await this.creativePanel.render(businessSettings, currentBusiness);
    await this.profilePanel.render(currentBusiness);
    this.businessManagement.setupEventListeners(currentBusiness);
  }

  getDefaultSettings() {
    return {
      social_media: {
        facebook: { connected: false, status: 'disconnected' },
        instagram: { connected: false, status: 'disconnected' },
        linkedin: { connected: false, status: 'disconnected' },
        youtube: { connected: false, status: 'disconnected' },
        tiktok: { connected: false, status: 'disconnected' } 
      },
      n8n_config: {
        webhook_url: '',
        api_key: '',
        enabled: true
      },
      posting_preferences: {
        auto_post: false,
        default_post_time: '09:00',
        timezone: 'Africa/Johannesburg'
      }
    };
  }

  setupTabNavigation() {
    const tabs = document.querySelectorAll('.settings-tab');
    const panels = document.querySelectorAll('.settings-panel');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetPanel = tab.getAttribute('data-tab');

        tabs.forEach(t => t.classList.remove('active'));
        panels.forEach(p => p.classList.remove('active'));

        tab.classList.add('active');
        const panel = document.getElementById(`${targetPanel}-panel`);
        if (panel) panel.classList.add('active');
      });
    });
  }

  setupGlobalListeners() {
    // Listen for settings reload events
    window.addEventListener('settings-reload', async () => {
      await this.refreshData();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (event) => {
      this.handleKeyboardShortcuts(event);
    });

    // Upgrade button clicks
    document.addEventListener('click', (event) => {
      const upgradeBtn = event.target.closest('.btn-upgrade');
      if (upgradeBtn && upgradeBtn.hasAttribute('data-page')) {
        const page = upgradeBtn.getAttribute('data-page');
        if (window.loadPage) {
          window.loadPage(page);
        }
      }
    });

    // Notify me buttons
    document.addEventListener('click', (event) => {
      const notifyBtn = event.target.closest('.btn-notify');
      if (notifyBtn && notifyBtn.hasAttribute('data-feature')) {
        this.handleNotifyMe(notifyBtn.getAttribute('data-feature'));
      }
    });
  }

  handleKeyboardShortcuts(event) {
    // ESC key closes modals
    if (event.key === 'Escape') {
      const modal = document.getElementById('businessManagementModal');
      if (modal && modal.style.display === 'block') {
        this.businessManagement.closeModal();
      }
    }

    // Ctrl/Cmd + S saves current tab
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      const activeTab = document.querySelector('.settings-tab.active');
      if (activeTab) {
        const tabName = activeTab.getAttribute('data-tab');
        this.saveCurrentTab(tabName);
      }
    }
  }

  saveCurrentTab(tabName) {
    const currentBusiness = this.state.getCurrentBusiness();
    
    switch(tabName) {
      case 'automation':
        this.automationPanel.saveSettings(currentBusiness);
        break;
      case 'preferences':
        this.preferencesPanel.savePreferences(currentBusiness);
        break;
      case 'social':
        this.notifications.show('Social media settings are managed automatically!', 'success');
        break;
    }
  }

  async handleNotifyMe(feature) {
    try {
      this.notifications.show(`You'll be notified when ${feature.replace('-', ' ')} launches!`, 'success');

      const user = await this.auth.getUser();
      const currentBusiness = this.state.getCurrentBusiness();

      await this.api.request('/notifications/subscribe', {
        method: 'POST',
        body: JSON.stringify({
          email: user.email,
          feature: feature,
          businessId: currentBusiness._id
        })
      });
    } catch (error) {
      console.error('Error subscribing to notifications:', error);
    }
  }

  async refreshData() {
    try {
      const currentBusiness = this.state.getCurrentBusiness();
      const data = await this.api.getBusinessSettings(currentBusiness._id);

      if (data.business) {
        this.state.setCurrentBusiness(data.business);
        if (window.dataManager?.updateBusiness) {
          window.dataManager.updateBusiness(data.business);
        }
      }

      await this.loadBusinessSettings();
    } catch (error) {
      console.error('Error refreshing data:', error);
      return false;
    }
  }

  // Expose functions that are called from HTML onclick attributes
  exposeGlobalFunctions() {
    const currentBusiness = this.state.getCurrentBusiness();

    // Social connections
    window.connectPlatform = (platform) => {
      this.socialConnections.connectPlatform(platform, currentBusiness);
    };

    window.disconnectPlatform = (platform) => {
      this.socialConnections.disconnectPlatform(platform, currentBusiness);
    };

    window.testConnection = (platform) => {
      this.socialConnections.testConnection(platform, currentBusiness);
    };

    window.refreshToken = (platform) => {
      this.socialConnections.refreshToken(platform, currentBusiness);
    };

    window.changeFacebookPage = () => {
      this.socialConnections.changePlatformAccount('facebook', currentBusiness);
    };

    window.changeInstagramAccount = () => {
      this.socialConnections.changePlatformAccount('instagram', currentBusiness);
    };

    window.changeLinkedInOrganization = () => {
      this.socialConnections.changePlatformAccount('linkedin', currentBusiness);
    };

    window.changeYouTubeChannel = () => {
      this.socialConnections.changePlatformAccount('youtube', currentBusiness);
    };

    window.changeTikTokAccount = () => {
      this.socialConnections.connectPlatform('tiktok', currentBusiness);
    };

    // In settings.js - exposeGlobalFunctions method
    window.changeTikTokAccount = () => {
      this.socialConnections.changePlatformAccount('tiktok', this.currentBusiness);
    };

    // Automation
    window.saveAutomationSettings = () => {
      this.automationPanel.saveSettings(currentBusiness);
    };

    window.testWebhook = () => {
      this.automationPanel.testWebhook(currentBusiness);
    };

    // Preferences
    window.savePreferences = () => {
      this.preferencesPanel.savePreferences(currentBusiness);
    };

    // Social settings (no-op)
    window.saveSocialSettings = () => {
      this.notifications.show('Social media settings are managed automatically!', 'success');
    };

    // Profile
    window.toggleEditProfile = () => {
      this.profilePanel.toggleEditProfile();
    };

    window.cancelProfileEdit = () => {
      this.profilePanel.cancelProfileEdit();
    };

    window.saveProfileChanges = () => {
      this.profilePanel.saveProfileChanges();
    };

    // Business management
    window.openBusinessManagement = () => {
      this.profilePanel.openBusinessManagement(currentBusiness);
    };

    window.closeBusinessManagement = () => {
      this.businessManagement.closeModal();
    };

    window.addBusinessManager = () => {
      this.businessManagement.addBusinessManager(currentBusiness);
    };

    window.removeBusinessManager = (email) => {
      this.businessManagement.removeBusinessManager(email, currentBusiness);
    };

    window.toggleBusinessStatus = () => {
      this.businessManagement.toggleBusinessStatus(currentBusiness);
    };

    window.confirmDeleteBusiness = () => {
      this.businessManagement.confirmDeleteBusiness(currentBusiness);
    };

    // Creative panel
    window.openModelPicker = () => {
      const modal = document.getElementById('modelPickerModal');
      if (modal) {
        modal.style.display = 'block';
        this.creativePanel.renderModelsList();
      }
    };

    window.closeModelPicker = () => {
      this.creativePanel.closeModelPicker();
    };

    window.confirmModelSelection = () => {
      this.creativePanel.saveCreativeSettings(currentBusiness);
    };

    window.searchModels = (event) => {
      const searchQuery = event.target.value;
      this.creativePanel.renderModelsList(searchQuery);
    };
  }

  destroy() {
    // Clean up event listeners
    window.removeEventListener('settings-reload', this.refreshData);
    
    // Clean up components
    if (this.socialConnections.destroy) {
      this.socialConnections.destroy();
    }

    // Clear state
    this.state.clear();

    console.log('Settings controller destroyed');
  }
}

// ===== INITIALIZATION =====
let settingsController = null;

export async function initSettingsPage() {
  try {
    // Clean up previous instance
    if (settingsController) {
      settingsController.destroy();
    }

    // Create and initialize new controller
    settingsController = new SettingsController();
    await settingsController.init();

  } catch (error) {
    console.error("❌ Error initializing settings page:", error);
  }
}

// Export for testing
export { SettingsController };

console.log('✅ Settings.js (refactored) loaded successfully');
