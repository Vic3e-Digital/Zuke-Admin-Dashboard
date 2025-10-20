// pages/settings.js
let auth0Client = null;
let currentBusiness = null;
let businessSettings = {};

const API_BASE = '/api';

async function getAuth0Client() {
  // ✅ Return cached client if already loaded
  if (auth0Client) {
    return auth0Client;
  }

  // ✅ Check if already initialized globally
  if (window.auth0Client) {
    auth0Client = window.auth0Client;
    return auth0Client;
  }

  try {
    const response = await fetch("/auth_config.json");
    const config = await response.json();

    // ✅ Auth0 will automatically check its own cache (localStorage)
    auth0Client = await auth0.createAuth0Client({
      domain: config.domain,
      clientId: config.clientId,
      cacheLocation: 'localstorage',
      useRefreshTokens: true
    });
    
    window.auth0Client = auth0Client;
    return auth0Client;
  } catch (error) {
    console.error("Error configuring Auth0:", error);
    return null;
  }
}

export async function initSettingsPage() {
  try {
    // ✅ IMPORTANT: Get auth0Client FIRST before doing anything
    auth0Client = await getAuth0Client();
    
    if (!auth0Client) {
      console.error("Failed to get Auth0 client");
      return;
    }

    // ✅ Check authentication (Auth0 checks its own cache here)
    const isAuthenticated = await auth0Client.isAuthenticated();
    
    if (!isAuthenticated) {
      console.error("User not authenticated");
      window.location.href = '/';
      return;
    }

    // Get selected business from dataManager cache
    currentBusiness = window.dataManager.getSelectedBusinessOrFirst();
    
    if (!currentBusiness) {
      // Show no business state
      document.getElementById('noBusinessState').style.display = 'block';
      document.getElementById('settingsContent').style.display = 'none';
      return;
    }

    // Show settings content
    document.getElementById('noBusinessState').style.display = 'none';
    document.getElementById('settingsContent').style.display = 'block';

    // Update business info
    updateBusinessInfo();
    
    // Load business settings from MongoDB
    await loadBusinessSettings();
    
    // Setup tab navigation
    setupTabNavigation();
    
    // Setup connection buttons
    setupConnectionButtons();

    console.log('✅ Settings initialized for:', currentBusiness.store_info?.name);
    
  } catch (error) {
    console.error("❌ Error in initSettingsPage:", error);
    showNotification('Failed to initialize settings page', 'error');
  }
}

function updateBusinessInfo() {
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

async function loadBusinessSettings() {
  try {
    showNotification('Loading settings...', 'info');
    
    const response = await fetch(`${API_BASE}/business-settings/${currentBusiness._id}`);
    
    if (response.ok) {
      const data = await response.json();
      businessSettings = data.automation_settings || {};
      
      // Populate all sections
      populateSocialConnections();
      populateAutomationSettings();
      populatePreferences();
      
      // ✅ Populate profile tab (async but don't block)
      await populateProfileTab();
      
      showNotification('Settings loaded', 'success');
    } else {
      console.log('No existing settings found, using defaults');
      businessSettings = getDefaultSettings();
      
      // Still populate profile
      await populateProfileTab();
    }
  } catch (error) {
    console.error('Error loading business settings:', error);
    showNotification('Failed to load settings', 'error');
    businessSettings = getDefaultSettings();
  }
}

function getDefaultSettings() {
  return {
    social_media: {
      facebook: { connected: false, status: 'disconnected' },
      instagram: { connected: false, status: 'disconnected' },
      linkedin: { connected: false, status: 'disconnected' },
      youtube: { connected: false, status: 'disconnected' }
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

async function populateProfileTab() {
  try {
    // ✅ Ensure auth0Client is available (it should be by now)
    if (!auth0Client) {
      console.warn('Auth0 client not available for profile tab');
      return;
    }

    // ✅ Auth0 will check its cache (localStorage) automatically
    const user = await auth0Client.getUser();
    
    if (user) {
      // Populate Auth0 User Profile
      const profilePicture = document.getElementById('profilePicture');
      const profileName = document.getElementById('profileName');
      const profileEmail = document.getElementById('profileEmail');
      const profileSub = document.getElementById('profileSub');
      const profileEmailVerified = document.getElementById('profileEmailVerified');
      const profileUpdated = document.getElementById('profileUpdated');

      if (profilePicture) profilePicture.src = user.picture || '/images/default-avatar.png';
      if (profileName) profileName.textContent = user.name || 'N/A';
      if (profileEmail) profileEmail.textContent = user.email || 'N/A';
      if (profileSub) profileSub.textContent = user.sub || 'N/A';
      if (profileEmailVerified) profileEmailVerified.textContent = user.email_verified ? 'Yes ✓' : 'No ✗';
      
      if (user.updated_at && profileUpdated) {
        profileUpdated.textContent = new Date(user.updated_at).toLocaleString();
      }
    }
  } catch (error) {
    console.error('Error loading Auth0 user profile:', error);
    // Don't throw - just log the error
  }

  // Populate Active Business Profile (independent of Auth0)
  if (currentBusiness) {
    const businessProfileId = document.getElementById('businessProfileId');
    const businessProfileName = document.getElementById('businessProfileName');
    const businessProfileEmail = document.getElementById('businessProfileEmail');
    const businessProfilePhone = document.getElementById('businessProfilePhone');
    const businessProfileAddress = document.getElementById('businessProfileAddress');
    const businessProfileCategory = document.getElementById('businessProfileCategory');
    const businessProfileCreated = document.getElementById('businessProfileCreated');
    const businessProfileUpdated = document.getElementById('businessProfileUpdated');
    const businessProfileLogo = document.getElementById('businessProfileLogo');

    if (businessProfileId) businessProfileId.textContent = currentBusiness._id || 'N/A';
    if (businessProfileName) businessProfileName.textContent = currentBusiness.store_info?.name || 'N/A';
    if (businessProfileEmail) businessProfileEmail.textContent = currentBusiness.personal_info?.email || 'N/A';
    if (businessProfilePhone) businessProfilePhone.textContent = currentBusiness.personal_info?.phone || 'N/A';
    if (businessProfileAddress) businessProfileAddress.textContent = currentBusiness.store_info?.address || 'N/A';
    if (businessProfileCategory) businessProfileCategory.textContent = currentBusiness.store_info?.category || 'N/A';
    
    if (currentBusiness.created_at && businessProfileCreated) {
      businessProfileCreated.textContent = new Date(currentBusiness.created_at).toLocaleString();
    }
    
    if (currentBusiness.updated_at && businessProfileUpdated) {
      businessProfileUpdated.textContent = new Date(currentBusiness.updated_at).toLocaleString();
    }

    // Display business logo
    if (businessProfileLogo && currentBusiness.media_files?.store_logo) {
      businessProfileLogo.src = currentBusiness.media_files.store_logo;
      businessProfileLogo.style.display = 'block';
    }
  }
}

function populateSocialConnections() {
  const platforms = ['facebook', 'instagram', 'linkedin', 'youtube'];
  
  platforms.forEach(platform => {
    const settings = businessSettings.social_media?.[platform];
    
    // ✅ Handle prefix correctly
    let prefix;
    if (platform === 'facebook') {
      prefix = 'fb';
    } else if (platform === 'instagram') {
      prefix = 'ig';
    } else if (platform === 'linkedin') {
      prefix = 'li';
    } else if (platform === 'youtube') {
      prefix = 'yt';
    }

    // Get UI elements
    const statusEl = document.getElementById(`${prefix}Status`);
    const badgeEl = document.getElementById(`${prefix}Badge`);
    const connectBtn = document.getElementById(`connect${capitalize(platform)}Btn`);
    const connectedInfo = document.getElementById(`${prefix}ConnectedInfo`);
    
    console.log(`[Settings] ${platform} settings:`, settings);
    
    if (settings && settings.connected && settings.status === 'active') {
      // Platform is connected
      if (statusEl) statusEl.textContent = 'Connected';
      if (badgeEl) {
        badgeEl.textContent = 'Active';
        badgeEl.className = 'status-badge connected';
      }
      
      // Hide connect button, show connected info
      if (connectBtn) {
        connectBtn.style.display = 'none';
      }
      if (connectedInfo) {
        connectedInfo.style.display = 'block';
      }
      
      // Populate platform-specific details
      if (platform === 'facebook') {
        const pageName = document.getElementById('fbPageName');
        const pageId = document.getElementById('fbPageId');
        const expiry = document.getElementById('fbExpiry');
        
        if (pageName) pageName.textContent = settings.page_name || '—';
        if (pageId) pageId.textContent = settings.page_id || '—';
        if (expiry && settings.expires_at) {
          expiry.textContent = new Date(settings.expires_at).toLocaleDateString();
        }
      } else if (platform === 'instagram') {
        const accountName = document.getElementById('igAccountName');
        const username = document.getElementById('igUsername');
        const accountId = document.getElementById('igAccountId');
        const connectedPage = document.getElementById('igConnectedPage');
        const expiry = document.getElementById('igExpiry');
        
        if (accountName) accountName.textContent = settings.account_name || settings.username || '—';
        if (username) username.textContent = settings.username ? `@${settings.username}` : '—';
        if (accountId) accountId.textContent = settings.account_id || '—';
        
        if (connectedPage) {
          if (settings.connected_page_name) {
            connectedPage.textContent = settings.connected_page_name;
            connectedPage.style.fontWeight = '500';
          } else {
            connectedPage.textContent = '—';
          }
        }
        
        if (expiry && settings.expires_at) {
          expiry.textContent = new Date(settings.expires_at).toLocaleDateString();
        }
      } else if (platform === 'linkedin') {
        const orgName = document.getElementById('liOrgName');
        const vanityName = document.getElementById('liVanityName');
        const orgId = document.getElementById('liOrgId');
        const expiry = document.getElementById('liExpiry');
        
        if (orgName) {
          orgName.textContent = settings.organization_name || '—';
        }
        if (vanityName) {
          if (settings.organization_vanity) {
            vanityName.textContent = `linkedin.com/company/${settings.organization_vanity}`;
            vanityName.style.fontFamily = 'monospace';
            vanityName.style.fontSize = '13px';
          } else {
            vanityName.textContent = '—';
          }
        }
        if (orgId) {
          orgId.textContent = settings.organization_id || '—';
        }
        if (expiry && settings.expires_at) {
          expiry.textContent = new Date(settings.expires_at).toLocaleDateString();
        }
      } else if (platform === 'youtube') {
        const channelName = document.getElementById('ytChannelName');
        const channelId = document.getElementById('ytChannelId');
        const customUrl = document.getElementById('ytCustomUrl');
        const subscribers = document.getElementById('ytSubscribers');
        const expiry = document.getElementById('ytExpiry');
        
        if (channelName) channelName.textContent = settings.channel_name || '—';
        if (channelId) channelId.textContent = settings.channel_id || '—';
        if (customUrl) {
          if (settings.custom_url) {
            customUrl.textContent = settings.custom_url;
            customUrl.style.fontFamily = 'monospace';
            customUrl.style.fontSize = '13px';
          } else {
            customUrl.textContent = '—';
          }
        }
        if (subscribers) {
          if (settings.subscriber_count !== undefined) {
            subscribers.textContent = formatNumber(settings.subscriber_count);
          } else {
            subscribers.textContent = '—';
          }
        }
        if (expiry && settings.expires_at) {
          expiry.textContent = new Date(settings.expires_at).toLocaleDateString();
        }
      }
    } else {
      // Platform is not connected or disconnected
      if (statusEl) statusEl.textContent = 'Not Connected';
      if (badgeEl) {
        badgeEl.textContent = 'Disconnected';
        badgeEl.className = 'status-badge';
      }
      
      // Show connect button, hide connected info
      if (connectBtn) {
        connectBtn.style.display = 'inline-block';
      }
      if (connectedInfo) {
        connectedInfo.style.display = 'none';
      }
    }
  });
}

function populateAutomationSettings() {
  const webhookUrl = document.getElementById('n8nWebhookUrl');
  const apiKey = document.getElementById('n8nApiKey');
  const enabled = document.getElementById('automationEnabled');
  
  if (webhookUrl && businessSettings.n8n_config?.webhook_url) {
    webhookUrl.value = businessSettings.n8n_config.webhook_url;
  }
  
  if (apiKey && businessSettings.n8n_config?.api_key) {
    apiKey.value = businessSettings.n8n_config.api_key;
  }
  
  if (enabled && businessSettings.n8n_config?.enabled !== undefined) {
    enabled.checked = businessSettings.n8n_config.enabled;
  }
}

function populatePreferences() {
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

// Helper function for formatting numbers
function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

function setupTabNavigation() {
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

function setupConnectionButtons() {
  // Facebook
  const fbBtn = document.getElementById('connectFacebookBtn');
  if (fbBtn) {
    fbBtn.onclick = () => connectPlatform('facebook');
  }

  // Instagram
  const igBtn = document.getElementById('connectInstagramBtn');
  if (igBtn) {
    igBtn.onclick = () => connectPlatform('instagram');
  }

  // LinkedIn
  const liBtn = document.getElementById('connectLinkedInBtn');
  if (liBtn) {
    liBtn.onclick = () => connectPlatform('linkedin');
  }

  // YouTube
  const ytBtn = document.getElementById('connectYouTubeBtn');
  if (ytBtn) {
    ytBtn.onclick = () => connectPlatform('youtube');
  }
}

async function connectPlatform(platform) {
  try {
    showNotification(`Connecting to ${capitalize(platform)}...`, 'info');
    
    // Open OAuth popup
    const width = 600, height = 700;
    const left = (screen.width - width) / 2;
    const top = (screen.height - height) / 2;
    
    const authWindow = window.open(
        `${API_BASE}/business-settings/auth/${platform}/connect?businessId=${currentBusiness._id}`,
        'OAuth',
        `width=${width},height=${height},left=${left},top=${top}`
      );
    
    // Listen for OAuth callback
    window.addEventListener('message', async (event) => {
      if (event.data.type === 'oauth-success' && event.data.platform === platform) {
        authWindow.close();
        showNotification(`${capitalize(platform)} connected successfully!`, 'success');
        
        // Reload settings
        await loadBusinessSettings();
      } else if (event.data.type === 'oauth-error') {
        showNotification(`Failed to connect ${capitalize(platform)}`, 'error');
      }
    });
    
  } catch (error) {
    console.error(`Error connecting ${platform}:`, error);
    showNotification(`Failed to connect ${capitalize(platform)}`, 'error');
  }
}

window.changeFacebookPage = async function() {
    try {
      // Disconnect current page
      await disconnectPlatform('facebook');
      
      // Reconnect (will show page selector)
      setTimeout(() => {
        connectPlatform('facebook');
      }, 500);
      
    } catch (error) {
      console.error('Error changing Facebook page:', error);
      showNotification('Failed to change page', 'error');
    }
  };


window.changeInstagramAccount = async function() {
    try {
      // Disconnect current account
      await disconnectPlatform('instagram');
      
      // Reconnect (will show account selector if multiple)
      setTimeout(() => {
        connectPlatform('instagram');
      }, 500);
      
    } catch (error) {
      console.error('Error changing Instagram account:', error);
      showNotification('Failed to change account', 'error');
    }
  };

  window.changeYouTubeChannel = async function() {
    try {
      // Disconnect current channel
      await disconnectPlatform('youtube');
      
      // Reconnect (will show channel selector if multiple)
      setTimeout(() => {
        connectPlatform('youtube');
      }, 500);
      
    } catch (error) {
      console.error('Error changing YouTube channel:', error);
      showNotification('Failed to change channel', 'error');
    }
  };
  
window.disconnectPlatform = async function(platform) {
  if (!confirm(`Are you sure you want to disconnect ${capitalize(platform)}?`)) {
    return;
  }

  try {
    showNotification(`Disconnecting ${capitalize(platform)}...`, 'info');
    
    const response = await fetch(`${API_BASE}/business-settings/auth/${platform}/disconnect`, {
        method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId: currentBusiness._id
      })
    });

    if (response.ok) {
      showNotification(`${capitalize(platform)} disconnected`, 'success');
      await loadBusinessSettings();
      
      // Reset UI
      const prefix = platform.substring(0, 2);
      const statusEl = document.getElementById(`${prefix}Status`);
      const badgeEl = document.getElementById(`${prefix}Badge`);
      const connectBtn = document.getElementById(`connect${capitalize(platform)}Btn`);
      const connectedInfo = document.getElementById(`${prefix}ConnectedInfo`);
      
      if (statusEl) statusEl.textContent = 'Not Connected';
      if (badgeEl) {
        badgeEl.textContent = 'Disconnected';
        badgeEl.className = 'status-badge';
      }
      if (connectBtn) connectBtn.style.display = 'inline-block';
      if (connectedInfo) connectedInfo.style.display = 'none';
    } else {
      throw new Error('Failed to disconnect');
    }
  } catch (error) {
    console.error(`Error disconnecting ${platform}:`, error);
    showNotification(`Failed to disconnect ${capitalize(platform)}`, 'error');
  }
};

window.testConnection = async function(platform) {
  try {
    showNotification(`Testing ${capitalize(platform)} connection...`, 'info');
    
    const response = await fetch(`${API_BASE}/business-settings/auth/${platform}/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId: currentBusiness._id
      })
    });

    const data = await response.json();
    
    if (data.success) {
      showNotification(`${capitalize(platform)} connection is working!`, 'success');
    } else {
      showNotification(`${capitalize(platform)} connection failed: ${data.error}`, 'error');
    }
  } catch (error) {
    console.error(`Error testing ${platform}:`, error);
    showNotification(`Failed to test ${capitalize(platform)} connection`, 'error');
  }
};

window.refreshToken = async function(platform) {
  try {
    showNotification(`Refreshing ${capitalize(platform)} token...`, 'info');
    
    const response = await fetch(`${API_BASE}/business-settings/auth/${platform}/refresh`, {
        method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId: currentBusiness._id
      })
    });

    const data = await response.json();
    
    if (data.success) {
      showNotification(`${capitalize(platform)} token refreshed!`, 'success');
      await loadBusinessSettings();
    } else {
      showNotification(`Failed to refresh token: ${data.error}`, 'error');
    }
  } catch (error) {
    console.error(`Error refreshing ${platform} token:`, error);
    showNotification(`Failed to refresh ${capitalize(platform)} token`, 'error');
  }
};

window.saveSocialSettings = async function() {
    try {
      showNotification('Saving social media settings...', 'info');
      
      // ✅ REMOVED: No longer collecting n8n_node_id values
      // Just reload the current settings
      
      showNotification('Social media settings are managed automatically!', 'success');
      await loadBusinessSettings();
      
    } catch (error) {
      console.error('Error saving social settings:', error);
      showNotification('Failed to save social media settings', 'error');
    }
  };


  window.saveAutomationSettings = async function() {
    try {
      showNotification('Saving automation settings...', 'info');
      
      const webhookUrl = document.getElementById('n8nWebhookUrl')?.value || '';
      const apiKey = document.getElementById('n8nApiKey')?.value || '';
      const enabled = document.getElementById('automationEnabled')?.checked || false;
  
      // ✅ Validate webhook URL
      if (webhookUrl && !webhookUrl.startsWith('http')) {
        showNotification('Invalid webhook URL. Must start with http:// or https://', 'error');
        return;
      }
  
      const response = await fetch(`${API_BASE}/business-settings/${currentBusiness._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          'automation_settings.n8n_config': {
            webhook_url: webhookUrl,
            api_key: apiKey,
            enabled: enabled
          }
        })
      });
  
      if (response.ok) {
        showNotification('Automation settings saved!', 'success');
        await loadBusinessSettings();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving automation settings:', error);
      showNotification(`Failed to save automation settings: ${error.message}`, 'error');
    }
  };

window.savePreferences = async function() {
    try {
      showNotification('Saving preferences...', 'info');
      
      const timezone = document.getElementById('timezone')?.value || 'Africa/Johannesburg';
      const postTime = document.getElementById('defaultPostTime')?.value || '09:00';
      const autoPost = document.getElementById('autoPost')?.checked || false;
  
      const response = await fetch(`${API_BASE}/business-settings/${currentBusiness._id}`, {
        method: 'PATCH', // Changed from PUT to PATCH
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          'automation_settings.posting_preferences': { // Use dot notation
            timezone,
            default_post_time: postTime,
            auto_post: autoPost
          }
        })
      });
  
      if (response.ok) {
        showNotification('Preferences saved!', 'success');
        await loadBusinessSettings();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      showNotification('Failed to save preferences', 'error');
    }
  };


// Add this function
window.changeLinkedInOrganization = async function() {
    try {
      // Disconnect current organization
      await disconnectPlatform('linkedin');
      
      // Reconnect (will show organization selector if multiple)
      setTimeout(() => {
        connectPlatform('linkedin');
      }, 500);
      
    } catch (error) {
      console.error('Error changing LinkedIn organization:', error);
      showNotification('Failed to change organization', 'error');
    }
  };
window.testWebhook = async function() {
  try {
    const webhookUrl = document.getElementById('n8nWebhookUrl')?.value;
    
    if (!webhookUrl) {
      showNotification('Please enter a webhook URL first', 'error');
      return;
    }

    showNotification('Testing webhook...', 'info');
    
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
      showNotification('Webhook test successful!', 'success');
    } else {
      showNotification(`Webhook test failed: ${response.statusText}`, 'error');
    }
  } catch (error) {
    console.error('Error testing webhook:', error);
    showNotification('Webhook test failed', 'error');
  }
};

// Utility functions
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function showNotification(message, type = 'info') {
  document.querySelectorAll('.settings-notification').forEach(n => n.remove());
  
  const notification = document.createElement('div');
  notification.className = `settings-notification ${type}`;
  notification.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    padding: 15px 20px;
    background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    max-width: 350px;
    animation: slideIn 0.3s ease;
    display: flex;
    align-items: center;
    gap: 10px;
  `;
  
  const icon = type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ';
  
  notification.innerHTML = `
    <span style="font-size: 20px; font-weight: bold;">${icon}</span>
    <span style="flex: 1;">${message}</span>
    <button onclick="this.parentElement.remove()" style="background: none; border: none; color: white; font-size: 20px; cursor: pointer; padding: 0; line-height: 1;">×</button>
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    if (notification.parentElement) {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }
}, 5000);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);
// Add this function at the bottom of settings.js
window.notifyMe = async function(feature) {
  try {
    showNotification(`You'll be notified when ${feature.replace('-', ' ')} launches!`, 'success');
    
    // Optional: Save to database
    const user = await auth0Client.getUser();
    const response = await fetch(`${API_BASE}/notifications/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: user.email,
        feature: feature,
        businessId: currentBusiness._id
      })
    });
    
    if (!response.ok) {
      console.warn('Failed to save notification preference');
    }
  } catch (error) {
    console.error('Error subscribing to notifications:', error);
  }
};

// Add at the bottom of settings.js

// Handle upgrade button clicks
// document.addEventListener('click', function(event) {
//   const upgradeBtn = event.target.closest('.btn-upgrade, .btn-notify');
  
//   if (upgradeBtn && upgradeBtn.hasAttribute('data-page')) {
//     const page = upgradeBtn.getAttribute('data-page');
    
//     // Navigate using the same pattern as dashboard
//     if (window.parent && window.parent.navigateToPage) {
//       window.parent.navigateToPage(page);
//     } else {
//       // Fallback: use postMessage to communicate with parent
//       window.parent.postMessage({
//         type: 'navigate',
//         page: page
//       }, '*');
//     }
//   }
// });

// Add at the bottom of settings.js

// Handle upgrade button clicks
document.addEventListener('click', function(event) {
  const upgradeBtn = event.target.closest('.btn-upgrade');
  
  if (upgradeBtn && upgradeBtn.hasAttribute('data-page')) {
    const page = upgradeBtn.getAttribute('data-page');
    window.loadPage(page); // Direct call since loadPage is global
  }
});