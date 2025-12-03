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

    // ✅ Load Mailgun settings
    const mailgunApiKey = document.getElementById('mailgunApiKey');
    const mailgunApiDomain = document.getElementById('mailgunApiDomain');
    const mailgunEmailDomain = document.getElementById('mailgunEmailDomain');
    const mailgunFromEmail = document.getElementById('mailgunFromEmail');
    const mailgunEnabled = document.getElementById('mailgunEnabled');

    if (mailgunApiKey && businessSettings.mailgun_config?.api_key) {
      mailgunApiKey.value = businessSettings.mailgun_config.api_key;
    }

    if (mailgunApiDomain && businessSettings.mailgun_config?.api_domain) {
      mailgunApiDomain.value = businessSettings.mailgun_config.api_domain;
    }

    if (mailgunEmailDomain && businessSettings.mailgun_config?.email_domain) {
      mailgunEmailDomain.value = businessSettings.mailgun_config.email_domain;
    }

    if (mailgunFromEmail && businessSettings.mailgun_config?.from_email) {
      mailgunFromEmail.value = businessSettings.mailgun_config.from_email;
    }

    if (mailgunEnabled && businessSettings.mailgun_config?.enabled !== undefined) {
      mailgunEnabled.checked = businessSettings.mailgun_config.enabled;
    }

    // ✅ Load Email Signature settings
    const signatureName = document.getElementById('signatureName');
    const signatureClosing = document.getElementById('signatureClosing');
    const signatureCompany = document.getElementById('signatureCompany');
    const signaturePhone = document.getElementById('signaturePhone');
    const signatureWebsite = document.getElementById('signatureWebsite');
    const signatureLinkedin = document.getElementById('signatureLinkedin');
    const signatureCalendar = document.getElementById('signatureCalendar');
    const signatureNote = document.getElementById('signatureNote');
    const signatureEnabled = document.getElementById('signatureEnabled');

    if (businessSettings.email_signature) {
      const sig = businessSettings.email_signature;
      if (signatureName) signatureName.value = sig.name || '';
      if (signatureClosing) signatureClosing.value = sig.closing || 'Kind regards';
      if (signatureCompany) signatureCompany.value = sig.company || '';
      if (signaturePhone) signaturePhone.value = sig.phone || '';
      if (signatureWebsite) signatureWebsite.value = sig.website || '';
      if (signatureLinkedin) signatureLinkedin.value = sig.linkedin || '';
      if (signatureCalendar) signatureCalendar.value = sig.calendar || '';
      if (signatureNote) signatureNote.value = sig.note || '';
      if (signatureEnabled && sig.enabled !== undefined) signatureEnabled.checked = sig.enabled;
    }

    // Update preview
    this.updateSignaturePreview();
  }

  updateSignaturePreview() {
    const preview = document.getElementById('signaturePreview');
    if (!preview) return;

    const closing = document.getElementById('signatureClosing')?.value || 'Kind regards';
    const name = document.getElementById('signatureName')?.value || 'Your Name';
    const company = document.getElementById('signatureCompany')?.value || '';
    const phone = document.getElementById('signaturePhone')?.value || '';
    const website = document.getElementById('signatureWebsite')?.value || '';
    const linkedin = document.getElementById('signatureLinkedin')?.value || '';
    const calendar = document.getElementById('signatureCalendar')?.value || '';
    const note = document.getElementById('signatureNote')?.value || '';

    let html = `<p style="margin: 0;">${closing},</p>`;
    html += `<p style="margin: 5px 0 0 0; font-weight: 600;">${name}</p>`;
    
    if (company) {
      html += `<p style="margin: 2px 0 0 0; color: #666;">${company}</p>`;
    }
    
    const links = [];
    if (phone) links.push(`📱 ${phone}`);
    if (website) links.push(`<a href="${website}" style="color: #667eea; text-decoration: none;">🌐 Website</a>`);
    if (linkedin) links.push(`<a href="${linkedin}" style="color: #0077b5; text-decoration: none;">💼 LinkedIn</a>`);
    if (calendar) links.push(`<a href="${calendar}" style="color: #4CAF50; text-decoration: none;">📅 Book a Meeting</a>`);
    
    if (links.length > 0) {
      html += `<p style="margin: 8px 0 0 0; font-size: 13px;">${links.join(' | ')}</p>`;
    }
    
    if (note) {
      html += `<p style="margin: 10px 0 0 0; font-style: italic; color: #888; font-size: 13px;">${note}</p>`;
    }

    preview.innerHTML = html;
  }

  setupEventListeners(currentBusiness) {
    const saveBtn = document.querySelector('[onclick="saveAutomationSettings()"]');
    const testBtn = document.querySelector('[onclick="testWebhook()"]');
    
    // ✅ Add Apollo test button
    const testApolloBtn = document.querySelector('[onclick="testApolloConnection()"]');
    
    // ✅ Add Mailgun test button
    const testMailgunBtn = document.querySelector('[onclick="testMailgunConnection()"]');

    if (saveBtn) {
      saveBtn.onclick = () => this.saveSettings(currentBusiness);
    }

    if (testBtn) {
      testBtn.onclick = () => this.testWebhook(currentBusiness);
    }

    if (testApolloBtn) {
      testApolloBtn.onclick = () => this.testApolloConnection(currentBusiness);
    }

    if (testMailgunBtn) {
      testMailgunBtn.onclick = () => this.testMailgunConnection(currentBusiness);
    }

    // ✅ Add signature preview update listeners
    const signatureInputs = [
      'signatureName', 'signatureClosing', 'signatureCompany', 
      'signaturePhone', 'signatureWebsite', 'signatureLinkedin', 
      'signatureCalendar', 'signatureNote'
    ];

    signatureInputs.forEach(id => {
      const input = document.getElementById(id);
      if (input) {
        input.addEventListener('input', () => this.updateSignaturePreview());
        input.addEventListener('change', () => this.updateSignaturePreview());
      }
    });
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

      // ✅ Get Mailgun settings
      const mailgunApiKey = document.getElementById('mailgunApiKey')?.value || '';
      const mailgunApiDomain = document.getElementById('mailgunApiDomain')?.value || '';
      const mailgunEmailDomain = document.getElementById('mailgunEmailDomain')?.value || '';
      const mailgunFromEmail = document.getElementById('mailgunFromEmail')?.value || '';
      const mailgunEnabled = document.getElementById('mailgunEnabled')?.checked || false;

      // ✅ Get Email Signature settings
      const signatureName = document.getElementById('signatureName')?.value || '';
      const signatureClosing = document.getElementById('signatureClosing')?.value || 'Kind regards';
      const signatureCompany = document.getElementById('signatureCompany')?.value || '';
      const signaturePhone = document.getElementById('signaturePhone')?.value || '';
      const signatureWebsite = document.getElementById('signatureWebsite')?.value || '';
      const signatureLinkedin = document.getElementById('signatureLinkedin')?.value || '';
      const signatureCalendar = document.getElementById('signatureCalendar')?.value || '';
      const signatureNote = document.getElementById('signatureNote')?.value || '';
      const signatureEnabled = document.getElementById('signatureEnabled')?.checked || false;

      // Validate webhook URL
      if (webhookUrl && !Validators.isValidUrl(webhookUrl)) {
        this.notifications.show('Invalid webhook URL. Must start with http:// or https://', 'error');
        return;
      }

      // ✅ Validate Apollo API key format (optional)
      if (apolloApiKey && apolloApiKey.length < 20) {
        this.notifications.show('Apollo API key seems invalid. Please check the key.', 'warning');
      }

      // ✅ Validate Mailgun settings
      if (mailgunEnabled && (!mailgunApiKey || !mailgunApiDomain || !mailgunEmailDomain || !mailgunFromEmail)) {
        this.notifications.show('All Mailgun fields are required when enabled', 'error');
        return;
      }

      // ✅ Save n8n, Apollo, Mailgun, and Email Signature configs
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
        },
        'automation_settings.mailgun_config': {
          api_key: mailgunApiKey,
          api_domain: mailgunApiDomain,
          email_domain: mailgunEmailDomain,
          from_email: mailgunFromEmail,
          enabled: mailgunEnabled,
          last_updated: new Date().toISOString()
        },
        'automation_settings.email_signature': {
          name: signatureName,
          closing: signatureClosing,
          company: signatureCompany,
          phone: signaturePhone,
          website: signatureWebsite,
          linkedin: signatureLinkedin,
          calendar: signatureCalendar,
          note: signatureNote,
          enabled: signatureEnabled,
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

  // ✅ New method to test Mailgun connection
  async testMailgunConnection(currentBusiness) {
    try {
      const mailgunApiKey = document.getElementById('mailgunApiKey')?.value;
      const mailgunApiDomain = document.getElementById('mailgunApiDomain')?.value;
      const mailgunEmailDomain = document.getElementById('mailgunEmailDomain')?.value;

      if (!mailgunApiKey || !mailgunApiDomain || !mailgunEmailDomain) {
        this.notifications.show('Please fill in all Mailgun fields first', 'error');
        return;
      }

      this.notifications.show('Testing Mailgun connection...', 'info');

      // Call backend endpoint to test Mailgun
      const response = await fetch(`/api/business-settings/${currentBusiness._id}/test-mailgun`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          api_key: mailgunApiKey,
          api_domain: mailgunApiDomain,
          email_domain: mailgunEmailDomain
        })
      });

      const result = await response.json();

      if (result.success) {
        this.notifications.show(`Mailgun connected! Domain: ${result.domain_name || mailgunEmailDomain}`, 'success');
      } else {
        this.notifications.show(`Mailgun test failed: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Error testing Mailgun connection:', error);
      this.notifications.show('Mailgun test failed', 'error');
    }
  }
}