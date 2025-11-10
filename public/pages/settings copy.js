// pages/settings.js

// ===== CONFIGURATION (Declare ONCE at top) =====
let auth0Client = null;
let currentBusiness = null;
let businessSettings = {};
let cloudinaryConfig = null;
let isEditingProfile = false;
let originalProfilePicture = '';
let messageListener = null;

const API_BASE = '/api';

// Platform prefix mapping
const platformPrefixMap = {
  facebook: 'fb',
  instagram: 'ig',
  linkedin: 'li',
  youtube: 'yt'
};

// ===== HELPER FUNCTIONS (Declare ONCE) =====

async function getAuth0Client() {
  if (auth0Client) {
    return auth0Client;
  }

  if (window.auth0Client) {
    auth0Client = window.auth0Client;
    return auth0Client;
  }

  try {
    const response = await fetch("/auth_config.json");
    const config = await response.json();

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

// Utility function for safe HTML
function sanitizeHTML(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Cloudinary functions (DECLARE ONLY ONCE)
async function loadCloudinaryConfig() {
  if (cloudinaryConfig) return cloudinaryConfig;
  
  try {
    const response = await fetch(`${API_BASE}/cloudinary-config`);
    cloudinaryConfig = await response.json();
    return cloudinaryConfig;
  } catch (error) {
    console.error('Failed to load Cloudinary config:', error);
    return null;
  }
}

async function uploadToCloudinary(file) {
  const config = await loadCloudinaryConfig();
  
  if (!config) {
    throw new Error('Cloudinary not configured');
  }
  
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', config.uploadPreset);
  formData.append('folder', 'user-profiles');
  
  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Upload failed');
    }
    
    const data = await response.json();
    return data.secure_url;
    
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload image');
  }
}

// Business webhook function
async function sendBusinessWebhook(action, payload) {
  const response = await fetch(`${API_BASE}/business-webhook-config`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      action: action,
      businessId: currentBusiness._id,
      businessName: currentBusiness.store_info?.name,
      timestamp: new Date().toISOString(),
      ...payload
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || 'Request failed');
  }

  return await response.json();
}

// Replace the refreshBusinessData function with this:
async function refreshBusinessData() {
  try {
    // Use the business-settings endpoint which exists and returns business data
    const response = await fetch(`${API_BASE}/business-settings/${currentBusiness._id}`);
    if (response.ok) {
      const data = await response.json();
      
      // Extract business from the response
      if (data.business) {
        currentBusiness = data.business;
      } else {
        // If the response doesn't include business object, 
        // the current business data might be in the root
        currentBusiness = { ...currentBusiness, ...data };
      }
      
      // Update dataManager cache
      if (window.dataManager && window.dataManager.updateBusiness) {
        window.dataManager.updateBusiness(currentBusiness);
      }
      
      // Update UI
      updateBusinessInfo();
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error refreshing business data:', error);
    return false;
  }
}

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
    <span style="flex: 1;">${sanitizeHTML(message)}</span>
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

function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

// Profile picture upload setup
function setupProfilePictureUpload() {
  const profilePictureInput = document.getElementById('profilePictureInput');
  if (profilePictureInput && !profilePictureInput._listenerAdded) {
    profilePictureInput.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (file) {
        if (file.size > 2 * 1024 * 1024) {
          showNotification('File size must be less than 2MB', 'error');
          return;
        }
        
        if (!file.type.match('image.*')) {
          showNotification('Please select an image file', 'error');
          return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
          document.getElementById('profilePicturePreview').src = e.target.result;
        };
        reader.readAsDataURL(file);
      }
    });
    profilePictureInput._listenerAdded = true;
  }
}

// ===== MAIN INITIALIZATION =====

export async function initSettingsPage() {
  try {
    auth0Client = await getAuth0Client();
    
    if (!auth0Client) {
      console.error("Failed to get Auth0 client");
      return;
    }

    const isAuthenticated = await auth0Client.isAuthenticated();
    
    if (!isAuthenticated) {
      console.error("User not authenticated");
      window.location.href = '/';
      return;
    }

    currentBusiness = window.dataManager.getSelectedBusinessOrFirst();
    
    if (!currentBusiness) {
      document.getElementById('noBusinessState').style.display = 'block';
      document.getElementById('settingsContent').style.display = 'none';
      return;
    }

    document.getElementById('noBusinessState').style.display = 'none';
    document.getElementById('settingsContent').style.display = 'block';

    updateBusinessInfo();
    await loadBusinessSettings();
    setupTabNavigation();
    setupConnectionButtons();
    setupProfilePictureUpload();

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
      
      // ✅ CRITICAL FIX: Update currentBusiness with fresh data
      if (data.business) {
        currentBusiness = data.business;
        // Also update the dataManager cache
        if (window.dataManager && window.dataManager.updateBusiness) {
          window.dataManager.updateBusiness(currentBusiness);
        }
      }
      
      // Populate all sections
      populateSocialConnections();
      populateAutomationSettings();
      populatePreferences();
      await populateProfileTab();
      
      showNotification('Settings loaded', 'success');
    } else {
      console.log('No existing settings found, using defaults');
      businessSettings = getDefaultSettings();
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
    if (!auth0Client) {
      console.warn('Auth0 client not available for profile tab');
      return;
    }

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
  }

  // Populate Active Business Profile
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
    
    if (businessProfileCategory) {
      const categories = currentBusiness.store_info?.category;
      if (Array.isArray(categories)) {
        businessProfileCategory.textContent = categories.join(', ');
      } else if (categories) {
        businessProfileCategory.textContent = categories;
      } else {
        businessProfileCategory.textContent = 'N/A';
      }
    }
    
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
        const prefix = platformPrefixMap[platform];
    
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
    
    async function populateAutomationSettings() {
      const webhookUrl = document.getElementById('n8nWebhookUrl');
      const apiKey = document.getElementById('n8nApiKey');
      const enabled = document.getElementById('automationEnabled');
      
      // If business has webhook, use it
      if (webhookUrl && businessSettings.n8n_config?.webhook_url) {
        webhookUrl.value = businessSettings.n8n_config.webhook_url;
      } else if (webhookUrl) {
        // Otherwise, load default from server
        try {
          const response = await fetch(`${API_BASE}/default-webhook-config`);
          const defaultConfig = await response.json();
          webhookUrl.value = defaultConfig.webhook_url;
          webhookUrl.placeholder = defaultConfig.webhook_url;
        } catch (error) {
          console.error('Failed to load default webhook:', error);
        }
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
        
        // Remove old listener if exists
        if (messageListener) {
          window.removeEventListener('message', messageListener);
        }
        
        // Open OAuth popup
        const width = 600, height = 700;
        const left = (screen.width - width) / 2;
        const top = (screen.height - height) / 2;
        
        const authWindow = window.open(
          `${API_BASE}/business-settings/auth/${platform}/connect?businessId=${currentBusiness._id}`,
          'OAuth',
          `width=${width},height=${height},left=${left},top=${top}`
        );
        
        // Create new listener
        messageListener = async (event) => {
          if (event.data.type === 'oauth-success' && event.data.platform === platform) {
            authWindow.close();
            showNotification(`${capitalize(platform)} connected successfully!`, 'success');
            
            // Reload settings
            await loadBusinessSettings();
            
            // Clean up listener
            window.removeEventListener('message', messageListener);
            messageListener = null;
          } else if (event.data.type === 'oauth-error' && event.data.platform === platform) {
            showNotification(`Failed to connect ${capitalize(platform)}`, 'error');
            window.removeEventListener('message', messageListener);
            messageListener = null;
          }
        };
        
        window.addEventListener('message', messageListener);
        
      } catch (error) {
        console.error(`Error connecting ${platform}:`, error);
        showNotification(`Failed to connect ${capitalize(platform)}`, 'error');
      }
    }
    
    window.changeFacebookPage = async function() {
      try {
        await disconnectPlatform('facebook');
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
        await disconnectPlatform('instagram');
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
        await disconnectPlatform('youtube');
        setTimeout(() => {
          connectPlatform('youtube');
        }, 500);
      } catch (error) {
        console.error('Error changing YouTube channel:', error);
        showNotification('Failed to change channel', 'error');
      }
    };
    
    window.changeLinkedInOrganization = async function() {
      try {
        await disconnectPlatform('linkedin');
        setTimeout(() => {
          connectPlatform('linkedin');
        }, 500);
      } catch (error) {
        console.error('Error changing LinkedIn organization:', error);
        showNotification('Failed to change organization', 'error');
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
          const prefix = platformPrefixMap[platform];
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
    
        // Validate webhook URL
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
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            'automation_settings.posting_preferences': {
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
    
    window.toggleEditProfile = function() {
      const viewMode = document.getElementById('profileViewMode');
      const editMode = document.getElementById('profileEditMode');
      const editBtn = document.querySelector('.section-title-row .btn-secondary');
      
      isEditingProfile = !isEditingProfile;
      
      if (isEditingProfile) {
        // Switch to edit mode
        viewMode.style.display = 'none';
        editMode.style.display = 'block';
        editBtn.textContent = 'Cancel';
        
        // Populate edit form
        const profileName = document.getElementById('profileName').textContent;
        const profileEmail = document.getElementById('profileEmail').textContent;
        const profilePicture = document.getElementById('profilePicture').src;
        
        document.getElementById('profileNameInput').value = profileName;
        document.getElementById('profileEmailInput').value = profileEmail;
        document.getElementById('profilePicturePreview').src = profilePicture;
        originalProfilePicture = profilePicture;
      } else {
        // Switch back to view mode
        viewMode.style.display = 'block';
        editMode.style.display = 'none';
        editBtn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
          Edit Profile
        `;
      }
    };
    
    window.cancelProfileEdit = function() {
      toggleEditProfile();
      // Reset preview
      document.getElementById('profilePicturePreview').src = originalProfilePicture;
    };
    
    window.saveProfileChanges = async function() {
      try {
        showNotification('Updating profile...', 'info');
        
        const name = document.getElementById('profileNameInput').value;
        const pictureFile = document.getElementById('profilePictureInput').files[0];
        
        if (!name.trim()) {
          showNotification('Name cannot be empty', 'error');
          return;
        }
        
        let pictureUrl = originalProfilePicture;
        
        // Upload picture directly to Cloudinary if provided
        if (pictureFile) {
          showNotification('Uploading image...', 'info');
          pictureUrl = await uploadToCloudinary(pictureFile);
        }
        
        // Get user info
        const user = await auth0Client.getUser();
        
        // Save to your server
        const response = await fetch(`${API_BASE}/user/update-profile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user.sub,
            name: name,
            picture: pictureUrl
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          
          // Update UI
          document.getElementById('profileName').textContent = name;
          document.getElementById('profilePicture').src = pictureUrl;
          
          // Update header avatar if exists
          const userAvatar = document.getElementById('userAvatar');
          if (userAvatar) {
            userAvatar.innerHTML = `<img src="${pictureUrl}" alt="Profile" class="profile-img">`;
          }
          
          showNotification('Profile updated successfully!', 'success');
          toggleEditProfile();
          
        } else {
          const error = await response.json();
          throw new Error(error.message || 'Failed to update profile');
        }
        
      } catch (error) {
        console.error('Error updating profile:', error);
        showNotification(`Failed to update profile: ${error.message}`, 'error');
      }
    };
    
    // Business Management Functions
    window.openBusinessManagement = function() {
      const modal = document.getElementById('businessManagementModal');
      modal.style.display = 'block';
      
      // Load current business managers
      loadBusinessManagers();
      
      // Set current business status
      const statusToggle = document.getElementById('businessActiveToggle');
      if (currentBusiness.status) {
        statusToggle.checked = currentBusiness.status === 'active';
      }
    };
    
    window.closeBusinessManagement = function() {
      const modal = document.getElementById('businessManagementModal');
      modal.style.display = 'none';
    };
    
    // ✅ FIXED loadBusinessManagers function
    async function loadBusinessManagers() {
      try {
        const managersList = document.getElementById('managersList');
        
        // Get managers from current business
        const managers = currentBusiness.managers || [];
        const owner = currentBusiness.personal_info?.email;
        
        // Filter out empty objects FIRST
        const validManagers = managers.filter(m => m && m.email);
        
        // Check if truly empty
        if (validManagers.length === 0 && !owner) {
          managersList.innerHTML = `
            <p style="text-align: center; color: #666; padding: 20px; margin: 0;">
              No managers assigned yet
            </p>
          `;
          return;
        }
        
        // Build managers list
        let managersHTML = '';
        
        // Always show owner if email exists
        if (owner) {
          managersHTML += `
            <div class="manager-item">
              <div class="manager-info">
                <div class="manager-avatar">${sanitizeHTML(owner.charAt(0).toUpperCase())}</div>
                <div class="manager-details">
                  <p style="font-weight: 600; margin: 0 0 2px 0;">Owner</p>
                  <p class="manager-email">${sanitizeHTML(owner)}</p>
                </div>
              </div>
              <span class="status-badge connected">Owner</span>
            </div>
          `;
        }
        
        // Add valid managers only
        validManagers.forEach(manager => {
          managersHTML += `
            <div class="manager-item">
              <div class="manager-info">
                <div class="manager-avatar">${sanitizeHTML((manager.email || '?').charAt(0).toUpperCase())}</div>
                <div class="manager-details">
                  <p style="font-weight: 600; margin: 0 0 2px 0;">${sanitizeHTML(manager.name || 'Manager')}</p>
                  <p class="manager-email">${sanitizeHTML(manager.email)}</p>
                </div>
              </div>
              <button class="btn-danger btn-sm" onclick="removeBusinessManager('${manager.email}')">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          `;
        });
        
        managersList.innerHTML = managersHTML;
        
      } catch (error) {
        console.error('Error loading managers:', error);
        showNotification('Failed to load managers', 'error');
      }
    }
    
    window.addBusinessManager = async function() {
      try {
        const emailInput = document.getElementById('managerEmailInput');
        const email = emailInput.value.trim();
        
        if (!email) {
          showNotification('Please enter an email address', 'error');
          return;
        }
        
        // Validate email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          showNotification('Please enter a valid email address', 'error');
          return;
        }
        
        // Check if already owner
        if (email === currentBusiness.personal_info?.email) {
          showNotification('This email is the business owner', 'error');
          return;
        }
        
        // Check if already a manager
        const existingManagers = currentBusiness.managers || [];
        if (existingManagers.some(m => m.email === email)) {
          showNotification('This user is already a manager', 'error');
          return;
        }
        
        showNotification('Adding manager...', 'info');
        
        await sendBusinessWebhook('add_manager', {
          manager_email: email
        });
        
        showNotification('Manager added successfully!', 'success');
        emailInput.value = '';
        
        // Reload business data
        await refreshBusinessData();
        await loadBusinessSettings();
        await loadBusinessManagers();
        
      } catch (error) {
        console.error('Error adding manager:', error);
        showNotification(`Failed to add manager: ${error.message}`, 'error');
      }
    };
    
    window.removeBusinessManager = async function(email) {
      if (!confirm(`Remove ${email} as a manager?`)) {
        return;
      }
      
      try {
        showNotification('Removing manager...', 'info');
        
        await sendBusinessWebhook('remove_manager', {
          manager_email: email
        });
        
        showNotification('Manager removed successfully!', 'success');
        
        // Ensure we get fresh data
        await refreshBusinessData();
        await loadBusinessSettings();
        await loadBusinessManagers();
        
      } catch (error) {
        console.error('Error removing manager:', error);
        showNotification(`Failed to remove manager: ${error.message}`, 'error');
      }
    };
    
    window.toggleBusinessStatus = async function() {
      try {
        const statusToggle = document.getElementById('businessActiveToggle');
        const newStatus = statusToggle.checked ? 'active' : 'disabled';
        
        const confirmMsg = statusToggle.checked 
          ? 'Enable this business? All automations will resume.'
          : 'Disable this business? All automations will be paused.';
        
        if (!confirm(confirmMsg)) {
          // Revert toggle
          statusToggle.checked = !statusToggle.checked;
          return;
        }
        
        showNotification('Updating business status...', 'info');
        
        await sendBusinessWebhook('update_status', {
          status: newStatus
        });
        
        showNotification(`Business ${newStatus === 'active' ? 'enabled' : 'disabled'} successfully!`, 'success');
        
        // Update UI
        const statusBadge = document.getElementById('businessStatusBadge');
        if (statusBadge) {
          statusBadge.textContent = newStatus === 'active' ? 'Active' : 'Disabled';
          statusBadge.className = newStatus === 'active' ? 'status-badge connected' : 'status-badge';
        }
        
            // Reload business data
    await loadBusinessSettings();
    
  } catch (error) {
    console.error('Error updating business status:', error);
    showNotification(`Failed to update status: ${error.message}`, 'error');
    
    // Revert toggle
    const statusToggle = document.getElementById('businessActiveToggle');
    statusToggle.checked = !statusToggle.checked;
  }
};

async function deleteBusiness() {
  try {
    showNotification('Deleting business...', 'info');
    
    await sendBusinessWebhook('delete_business', {});
    
    showNotification('Business deleted successfully', 'success');
    
    // Close modal
    closeBusinessManagement();
    
    // Clear cache
    window.dataManager.clearCache();
    
    // Redirect to dashboard after delay
    setTimeout(() => {
      window.loadPage('dashboard');
    }, 2000);
    
  } catch (error) {
    console.error('Error deleting business:', error);
    showNotification(`Failed to delete business: ${error.message}`, 'error');
  }
}

window.confirmDeleteBusiness = function() {
  const businessName = currentBusiness.store_info?.name || 'this business';
  
  const confirmed = confirm(
    `⚠️ DELETE BUSINESS?\n\n` +
    `You are about to permanently delete "${businessName}".\n\n` +
    `This will:\n` +
    `• Remove all business data\n` +
    `• Disconnect all social media accounts\n` +
    `• Delete all automation settings\n` +
    `• Cannot be undone\n\n` +
    `Type the business name to confirm deletion.`
  );
  
  if (!confirmed) return;
  
  // Second confirmation with typed name
  const typedName = prompt(`Type "${businessName}" to confirm deletion:`);
  
  if (typedName !== businessName) {
    showNotification('Business name did not match. Deletion cancelled.', 'error');
    return;
  }
  
  deleteBusiness();
};

// Close modal when clicking outside
window.addEventListener('click', function(event) {
  const modal = document.getElementById('businessManagementModal');
  if (event.target === modal) {
    closeBusinessManagement();
  }
});

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
  
  .manager-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px;
    border-bottom: 1px solid #eee;
  }
  
  .manager-item:last-child {
    border-bottom: none;
  }
  
  .manager-info {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .manager-avatar {
    width: 40px;
    height: 40px;
    background: #e5e7eb;
    color: #374151;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 16px;
  }
  
  .manager-details {
    flex: 1;
  }
  
  .manager-email {
    font-size: 14px;
    color: #6b7280;
    margin: 0;
  }
  
  .settings-notification {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
`;
document.head.appendChild(style);

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

// Handle upgrade button clicks
document.addEventListener('click', function(event) {
  const upgradeBtn = event.target.closest('.btn-upgrade');
  
  if (upgradeBtn && upgradeBtn.hasAttribute('data-page')) {
    const page = upgradeBtn.getAttribute('data-page');
    window.loadPage(page); // Direct call since loadPage is global
  }
});

// Clean up on page unload
window.addEventListener('beforeunload', function() {
  // Clean up event listeners
  if (messageListener) {
    window.removeEventListener('message', messageListener);
    messageListener = null;
  }
});

// Keyboard shortcuts
document.addEventListener('keydown', function(event) {
  // ESC key closes modals
  if (event.key === 'Escape') {
    const modal = document.getElementById('businessManagementModal');
    if (modal && modal.style.display === 'block') {
      closeBusinessManagement();
    }
  }
  
  // Ctrl/Cmd + S saves current tab
  if ((event.ctrlKey || event.metaKey) && event.key === 's') {
    event.preventDefault();
    const activeTab = document.querySelector('.settings-tab.active');
    if (activeTab) {
      const tabName = activeTab.getAttribute('data-tab');
      switch(tabName) {
        case 'automation':
          saveAutomationSettings();
          break;
        case 'preferences':
          savePreferences();
          break;
        case 'social':
          saveSocialSettings();
          break;
      }
    }
  }
});

// Export functions for testing
export {
  loadBusinessSettings,
  refreshBusinessData,
  loadBusinessManagers,
  sanitizeHTML
};

console.log('Settings.js loaded successfully');