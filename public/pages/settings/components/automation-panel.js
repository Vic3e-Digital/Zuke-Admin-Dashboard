import { Validators } from '../utils/validators.js';

export class AutomationPanelComponent {
  constructor(apiService, notificationManager) {
    this.api = apiService;
    this.notifications = notificationManager;
  }

  async render(businessSettings, currentBusiness) {
    await this.populateAutomationSettings(businessSettings);
    this.setupEventListeners(currentBusiness);
  }

  async populateAutomationSettings(businessSettings) {
    const webhookUrl = document.getElementById('n8nWebhookUrl');
    const apiKey = document.getElementById('n8nApiKey');
    const enabled = document.getElementById('automationEnabled');

    // Load webhook URL
    if (webhookUrl) {
      if (businessSettings.n8n_config?.webhook_url) {
        webhookUrl.value = businessSettings.n8n_config.webhook_url;
      } else {
        try {
          const defaultConfig = await this.api.getDefaultWebhookConfig();
          webhookUrl.value = defaultConfig.webhook_url;
          webhookUrl.placeholder = defaultConfig.webhook_url;
        } catch (error) {
          console.error('Failed to load default webhook:', error);
        }
      }
    }

    // Load API key
    if (apiKey && businessSettings.n8n_config?.api_key) {
      apiKey.value = businessSettings.n8n_config.api_key;
    }

    // Load enabled state
    if (enabled && businessSettings.n8n_config?.enabled !== undefined) {
      enabled.checked = businessSettings.n8n_config.enabled;
    }

    // ✅ Load Apollo API settings
    const apolloApiKey = document.getElementById('apolloApiKey');
    const apolloEnabled = document.getElementById('apolloEnabled');

    if (apolloApiKey && businessSettings.apollo_config?.api_key) {
      apolloApiKey.value = businessSettings.apollo_config.api_key;
    }

    if (apolloEnabled && businessSettings.apollo_config?.enabled !== undefined) {
      apolloEnabled.checked = businessSettings.apollo_config.enabled;
    }
  }

  setupEventListeners(currentBusiness) {
    const saveBtn = document.querySelector('[onclick="saveAutomationSettings()"]');
    const testBtn = document.querySelector('[onclick="testWebhook()"]');
    
    // ✅ Add Apollo test button
    const testApolloBtn = document.querySelector('[onclick="testApolloConnection()"]');

    if (saveBtn) {
      saveBtn.onclick = () => this.saveSettings(currentBusiness);
    }

    if (testBtn) {
      testBtn.onclick = () => this.testWebhook(currentBusiness);
    }

    if (testApolloBtn) {
      testApolloBtn.onclick = () => this.testApolloConnection(currentBusiness);
    }
  }

  async saveSettings(currentBusiness) {
    try {
      this.notifications.show('Saving automation settings...', 'info');

      const webhookUrl = document.getElementById('n8nWebhookUrl')?.value || '';
      const apiKey = document.getElementById('n8nApiKey')?.value || '';
      const enabled = document.getElementById('automationEnabled')?.checked || false;

      // ✅ Get Apollo settings
      const apolloApiKey = document.getElementById('apolloApiKey')?.value || '';
      const apolloEnabled = document.getElementById('apolloEnabled')?.checked || false;

      // Validate webhook URL
      if (webhookUrl && !Validators.isValidUrl(webhookUrl)) {
        this.notifications.show('Invalid webhook URL. Must start with http:// or https://', 'error');
        return;
      }

      // ✅ Validate Apollo API key format (optional)
      if (apolloApiKey && apolloApiKey.length < 20) {
        this.notifications.show('Apollo API key seems invalid. Please check the key.', 'warning');
      }

      // ✅ Save both n8n and Apollo configs
      await this.api.updateBusinessSettings(currentBusiness._id, {
        'automation_settings.n8n_config': {
          webhook_url: webhookUrl,
          api_key: apiKey,
          enabled: enabled
        },
        'automation_settings.apollo_config': {
          api_key: apolloApiKey,
          enabled: apolloEnabled,
          last_updated: new Date().toISOString()
        }
      });

      this.notifications.show('Automation settings saved successfully!', 'success');
      window.dispatchEvent(new CustomEvent('settings-reload'));

    } catch (error) {
      console.error('Error saving automation settings:', error);
      this.notifications.show(`Failed to save automation settings: ${error.message}`, 'error');
    }
  }

  async testWebhook(currentBusiness) {
    try {
      const webhookUrl = document.getElementById('n8nWebhookUrl')?.value;

      if (!webhookUrl) {
        this.notifications.show('Please enter a webhook URL first', 'error');
        return;
      }

      this.notifications.show('Testing webhook...', 'info');

      const testPayload = {
        businessId: currentBusiness._id,
        businessName: currentBusiness.store_info?.name,
        test: true,
        timestamp: new Date().toISOString()
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload)
      });

      if (response.ok) {
        this.notifications.show('Webhook test successful!', 'success');
      } else {
        this.notifications.show(`Webhook test failed: ${response.statusText}`, 'error');
      }
    } catch (error) {
      console.error('Error testing webhook:', error);
      this.notifications.show('Webhook test failed', 'error');
    }
  }

  // ✅ New method to test Apollo API connection
  async testApolloConnection(currentBusiness) {
    try {
      const apolloApiKey = document.getElementById('apolloApiKey')?.value;

      if (!apolloApiKey) {
        this.notifications.show('Please enter Apollo API key first', 'error');
        return;
      }

      this.notifications.show('Testing Apollo API connection...', 'info');

      // Call your backend endpoint to test Apollo
      const response = await fetch(`/api/business-settings/${currentBusiness._id}/test-apollo`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ api_key: apolloApiKey })
      });

      const result = await response.json();

      if (result.success) {
        this.notifications.show(`Apollo API connected! Account: ${result.account_name || 'Valid'}`, 'success');
      } else {
        this.notifications.show(`Apollo API test failed: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Error testing Apollo connection:', error);
      this.notifications.show('Apollo API test failed', 'error');
    }
  }
}