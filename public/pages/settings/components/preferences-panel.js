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
      
      // AI Model preferences
      const textModel = document.getElementById('defaultTextModel');
      const imageModel = document.getElementById('defaultImageModel');
      const videoModel = document.getElementById('defaultVideoModel');
  
      if (timezone && businessSettings.posting_preferences?.timezone) {
        timezone.value = businessSettings.posting_preferences.timezone;
      }
  
      if (postTime && businessSettings.posting_preferences?.default_post_time) {
        postTime.value = businessSettings.posting_preferences.default_post_time;
      }
  
      if (autoPost && businessSettings.posting_preferences?.auto_post !== undefined) {
        autoPost.checked = businessSettings.posting_preferences.auto_post;
      }
      
      // Load AI model preferences
      if (textModel && businessSettings.ai_model_preferences?.text_model) {
        textModel.value = businessSettings.ai_model_preferences.text_model;
      }
      
      if (imageModel && businessSettings.ai_model_preferences?.image_model) {
        imageModel.value = businessSettings.ai_model_preferences.image_model;
      }
      
      if (videoModel && businessSettings.ai_model_preferences?.video_model) {
        videoModel.value = businessSettings.ai_model_preferences.video_model;
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
        
        // Get AI model preferences
        const textModel = document.getElementById('defaultTextModel')?.value;
        const imageModel = document.getElementById('defaultImageModel')?.value;
        const videoModel = document.getElementById('defaultVideoModel')?.value;
  
        const updateData = {
          'automation_settings.posting_preferences': {
            timezone,
            default_post_time: postTime,
            auto_post: autoPost
          }
        };
        
        // Add AI model preferences if selected
        if (textModel || imageModel || videoModel) {
          updateData['automation_settings.ai_model_preferences'] = {
            text_model: textModel || 'gpt-4-turbo',
            image_model: imageModel || 'dall-e-3',
            video_model: videoModel || 'veo-2'
          };
        }
        
        await this.api.updateBusinessSettings(currentBusiness._id, updateData);
  
        this.notifications.show('Preferences saved!', 'success');
        window.dispatchEvent(new CustomEvent('settings-reload'));
  
      } catch (error) {
        console.error('Error saving preferences:', error);
        this.notifications.show('Failed to save preferences', 'error');
      }
    }
  }