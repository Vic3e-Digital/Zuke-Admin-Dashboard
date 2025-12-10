// pages/settings.js - Coming Soon Version
let auth0Client = null;
let currentUser = null;

async function getAuth0Client() {
  if (window.auth0Client) {
    return window.auth0Client;
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

export async function initSettingsPage() {
  const auth0Client = await getAuth0Client();
  
  if (!auth0Client) {
    console.error("Failed to get Auth0 client");
    return;
  }

  try {
    const isAuthenticated = await auth0Client.isAuthenticated();
    
    if (!isAuthenticated) {
      console.error("User not authenticated");
      window.location.href = '/';
      return;
    }

    currentUser = await auth0Client.getUser();
    console.log('Settings page initialized (Coming Soon mode)');
    
    // Don't initialize any functionality since the page is disabled
    // Just log that the user accessed the page
    
  } catch (error) {
    console.error("Error in initSettingsPage:", error);
  }
}

// Stub functions to prevent errors if called from onclick handlers
window.saveProfileSettings = function() {
  console.log('Settings page not available yet');
};

window.savePreferences = function() {
  console.log('Settings page not available yet');
};

window.copyAccountId = function() {
  console.log('Settings page not available yet');
};

window.toggleApiKey = function() {
  console.log('Settings page not available yet');
};

window.copyApiKey = function() {
  console.log('Settings page not available yet');
};

// When you're ready to activate the settings page, uncomment this section:

function loadUserData() {
  if (!currentUser) return;
  
  // Safely check if elements exist before accessing them
  const fullName = document.getElementById('fullName');
  const email = document.getElementById('email');
  const profileAvatar = document.getElementById('profileAvatar');
  
  if (fullName) fullName.value = currentUser.name || '';
  if (email) email.value = currentUser.email || '';
  
  if (profileAvatar && currentUser.picture) {
    profileAvatar.src = currentUser.picture;
    profileAvatar.style.display = 'block';
    const placeholder = profileAvatar.nextElementSibling;
    if (placeholder) placeholder.style.display = 'none';
  }

  // Load saved preferences from localStorage
  const preferences = JSON.parse(localStorage.getItem('userPreferences') || '{}');
  
  // Apply saved settings
  const darkMode = document.getElementById('darkMode');
  if (darkMode && preferences.darkMode) {
    darkMode.checked = preferences.darkMode;
    document.body.classList.toggle('dark-mode', preferences.darkMode);
  }
  
  const language = document.getElementById('language');
  if (language && preferences.language) {
    language.value = preferences.language;
  }
  
  const timezone = document.getElementById('timezone');
  if (timezone && preferences.timezone) {
    timezone.value = preferences.timezone;
  }
  
  const dateFormat = document.getElementById('dateFormat');
  if (dateFormat && preferences.dateFormat) {
    dateFormat.value = preferences.dateFormat;
  }
  
  const compactView = document.getElementById('compactView');
  if (compactView && preferences.compactView !== undefined) {
    compactView.checked = preferences.compactView;
  }
  
  const animations = document.getElementById('animations');
  if (animations && preferences.animations !== undefined) {
    animations.checked = preferences.animations;
  }

  // Load notification preferences
  const notifications = JSON.parse(localStorage.getItem('notificationPreferences') || '{}');
  Object.keys(notifications).forEach(key => {
    const element = document.getElementById(key);
    if (element) {
      element.checked = notifications[key];
    }
  });
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

function setupEventHandlers() {
  const darkModeToggle = document.getElementById('darkMode');
  if (darkModeToggle) {
    darkModeToggle.addEventListener('change', (e) => {
      document.body.classList.toggle('dark-mode', e.target.checked);
    });
  }

  const notificationToggles = document.querySelectorAll('#notifications-panel input[type="checkbox"]');
  notificationToggles.forEach(toggle => {
    toggle.addEventListener('change', () => {
      saveNotificationPreferences();
    });
  });
}

window.saveProfileSettings = async function() {
  const fullName = document.getElementById('fullName');
  const bio = document.getElementById('bio');
  const phone = document.getElementById('phone');
  const location = document.getElementById('location');
  
  if (!fullName) return;
  
  const profileData = {
    fullName: fullName.value,
    bio: bio?.value || '',
    phone: phone?.value || '',
    location: location?.value || ''
  };

  try {
    console.log('Saving profile:', profileData);
    showNotification('Profile updated successfully!', 'success');
  } catch (error) {
    showNotification('Failed to update profile', 'error');
  }
};

window.savePreferences = function() {
  const language = document.getElementById('language');
  const timezone = document.getElementById('timezone');
  const dateFormat = document.getElementById('dateFormat');
  const darkMode = document.getElementById('darkMode');
  const compactView = document.getElementById('compactView');
  const animations = document.getElementById('animations');
  
  const preferences = {
    language: language?.value || 'en',
    timezone: timezone?.value || 'UTC',
    dateFormat: dateFormat?.value || 'MM/DD/YYYY',
    darkMode: darkMode?.checked || false,
    compactView: compactView?.checked || false,
    animations: animations?.checked || true
  };

  localStorage.setItem('userPreferences', JSON.stringify(preferences));
  showNotification('Preferences saved successfully!', 'success');
};

function saveNotificationPreferences() {
  const notifications = {
    marketingEmails: document.getElementById('marketingEmails')?.checked || false,
    businessActivity: document.getElementById('businessActivity')?.checked || false,
    socialAlerts: document.getElementById('socialAlerts')?.checked || false,
    weeklySummary: document.getElementById('weeklySummary')?.checked || false,
    browserNotifications: document.getElementById('browserNotifications')?.checked || false
  };

  localStorage.setItem('notificationPreferences', JSON.stringify(notifications));
  
  if (notifications.browserNotifications && 'Notification' in window) {
    Notification.requestPermission();
  }
}

window.copyAccountId = function() {
  const accountId = document.getElementById('accountId');
  if (!accountId) return;
  
  navigator.clipboard.writeText(accountId.textContent).then(() => {
    showNotification('Account ID copied to clipboard!', 'success');
  });
};

window.toggleApiKey = function() {
  const apiKeyInput = document.getElementById('apiKey');
  if (!apiKeyInput) return;
  
  const isPassword = apiKeyInput.type === 'password';
  apiKeyInput.type = isPassword ? 'text' : 'password';
};

window.copyApiKey = function() {
  const apiKeyInput = document.getElementById('apiKey');
  if (!apiKeyInput) return;
  
  navigator.clipboard.writeText(apiKeyInput.value).then(() => {
    showNotification('API Key copied to clipboard!', 'success');
  });
};

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <span>${message}</span>
      <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 5000);
}
