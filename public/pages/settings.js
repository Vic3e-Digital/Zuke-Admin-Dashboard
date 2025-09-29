// pages/settings.js
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
    
    // Initialize settings
    loadUserData();
    setupTabNavigation();
    setupEventHandlers();
    
  } catch (error) {
    console.error("Error in initSettingsPage:", error);
  }
}

function loadUserData() {
  // Load profile data
  if (currentUser) {
    document.getElementById('fullName').value = currentUser.name || '';
    document.getElementById('email').value = currentUser.email || '';
    
    // Load avatar
    if (currentUser.picture) {
      const avatar = document.getElementById('profileAvatar');
      avatar.src = currentUser.picture;
      avatar.style.display = 'block';
      avatar.nextElementSibling.style.display = 'none';
    }
  }

  // Load saved preferences from localStorage
  const preferences = JSON.parse(localStorage.getItem('userPreferences') || '{}');
  
  // Apply saved settings
  if (preferences.darkMode) {
    document.getElementById('darkMode').checked = preferences.darkMode;
    document.body.classList.toggle('dark-mode', preferences.darkMode);
  }
  
  if (preferences.language) {
    document.getElementById('language').value = preferences.language;
  }
  
  if (preferences.timezone) {
    document.getElementById('timezone').value = preferences.timezone;
  }
  
  if (preferences.dateFormat) {
    document.getElementById('dateFormat').value = preferences.dateFormat;
  }
  
  if (preferences.compactView !== undefined) {
    document.getElementById('compactView').checked = preferences.compactView;
  }
  
  if (preferences.animations !== undefined) {
    document.getElementById('animations').checked = preferences.animations;
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
      
      // Remove active class from all tabs and panels
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      
      // Add active class to clicked tab and corresponding panel
      tab.classList.add('active');
      document.getElementById(`${targetPanel}-panel`).classList.add('active');
    });
  });
}

function setupEventHandlers() {
  // Dark mode toggle
  document.getElementById('darkMode').addEventListener('change', (e) => {
    document.body.classList.toggle('dark-mode', e.target.checked);
  });

  // Notification toggles
  const notificationToggles = document.querySelectorAll('#notifications-panel input[type="checkbox"]');
  notificationToggles.forEach(toggle => {
    toggle.addEventListener('change', () => {
      saveNotificationPreferences();
    });
  });
}

// Global functions for onclick handlers
window.saveProfileSettings = async function() {
  const profileData = {
    fullName: document.getElementById('fullName').value,
    bio: document.getElementById('bio').value,
    phone: document.getElementById('phone').value,
    location: document.getElementById('location').value
  };

  try {
    // Here you would typically send this to your backend
    console.log('Saving profile:', profileData);
    showNotification('Profile updated successfully!', 'success');
  } catch (error) {
    showNotification('Failed to update profile', 'error');
  }
};

window.savePreferences = function() {
  const preferences = {
    language: document.getElementById('language').value,
    timezone: document.getElementById('timezone').value,
    dateFormat: document.getElementById('dateFormat').value,
    darkMode: document.getElementById('darkMode').checked,
    compactView: document.getElementById('compactView').checked,
    animations: document.getElementById('animations').checked
  };

  // pages/settings.js (continued)

  localStorage.setItem('userPreferences', JSON.stringify(preferences));
  showNotification('Preferences saved successfully!', 'success');
};

function saveNotificationPreferences() {
  const notifications = {
    marketingEmails: document.getElementById('marketingEmails').checked,
    businessActivity: document.getElementById('businessActivity').checked,
    socialAlerts: document.getElementById('socialAlerts').checked,
    weeklySummary: document.getElementById('weeklySummary').checked,
    browserNotifications: document.getElementById('browserNotifications').checked
  };

  localStorage.setItem('notificationPreferences', JSON.stringify(notifications));
  
  // If browser notifications are enabled, request permission
  if (notifications.browserNotifications && 'Notification' in window) {
    Notification.requestPermission();
  }
}

window.copyAccountId = function() {
  const accountId = document.getElementById('accountId').textContent;
  navigator.clipboard.writeText(accountId).then(() => {
    showNotification('Account ID copied to clipboard!', 'success');
  });
};

window.toggleApiKey = function() {
  const apiKeyInput = document.getElementById('apiKey');
  const isPassword = apiKeyInput.type === 'password';
  apiKeyInput.type = isPassword ? 'text' : 'password';
};

window.copyApiKey = function() {
  const apiKey = document.getElementById('apiKey').value;
  navigator.clipboard.writeText(apiKey).then(() => {
    showNotification('API Key copied to clipboard!', 'success');
  });
};

function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <span>${message}</span>
      <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
    </div>
  `;
  
  // Add to page
  document.body.appendChild(notification);
  
  // Remove after 5 seconds
  setTimeout(() => {
    notification.remove();
  }, 5000);
}