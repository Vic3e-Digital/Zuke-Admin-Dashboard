export class PreferencesPanelComponent {
    constructor(apiService, notificationManager) {
      this.api = apiService;
      this.notifications = notificationManager;
    }
  
    render(businessSettings, currentBusiness) {
      this.populatePreferences(businessSettings);
      this.setupEventListeners(currentBusiness);
    }
  
    populatePreferences(businessSettings) {
      const timezone = document.getElementById('timezone');
      const postTime = document.getElementById('defaultPostTime');
      const autoPost = document.getElementById('autoPost');
  
      if (timezone && businessSettings.posting_preferences?.timezone) {
        timezone.value = businessSettings.posting_preferences.timezone;
      }
  
      if (postTime && businessSettings.posting_preferences?.default_post_time) {
        postTime.value = businessSettings.posting_preferences.default_post_time;
      }
  
      if (autoPost && businessSettings.posting_preferences?.auto_post !== undefined) {
        autoPost.checked = businessSettings.posting_preferences.auto_post;
      }
    }
  
    setupEventListeners(currentBusiness) {
      const saveBtn = document.querySelector('[onclick="savePreferences()"]');
      if (saveBtn) {
        saveBtn.onclick = () => this.savePreferences(currentBusiness);
      }
    }
  
    async savePreferences(currentBusiness) {
      try {
        this.notifications.show('Saving preferences...', 'info');
  
        const timezone = document.getElementById('timezone')?.value || 'Africa/Johannesburg';
        const postTime = document.getElementById('defaultPostTime')?.value || '09:00';
        const autoPost = document.getElementById('autoPost')?.checked || false;
  
        await this.api.updateBusinessSettings(currentBusiness._id, {
          'automation_settings.posting_preferences': {
            timezone,
            default_post_time: postTime,
            auto_post: autoPost
          }
        });
  
        this.notifications.show('Preferences saved!', 'success');
        window.dispatchEvent(new CustomEvent('settings-reload'));
  
      } catch (error) {
        console.error('Error saving preferences:', error);
        this.notifications.show('Failed to save preferences', 'error');
      }
    }
  }