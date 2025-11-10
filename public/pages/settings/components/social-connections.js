import { Formatters } from '../utils/formatters.js';

export class SocialConnectionsComponent {
  constructor(apiService, notificationManager) {
    this.api = apiService;
    this.notifications = notificationManager;
    this.platformPrefixMap = {
      facebook: 'fb',
      instagram: 'ig',
      linkedin: 'li',
      youtube: 'yt',
      tiktok: 'tt'
    };
    this.oauthListener = null;
  }

  render(businessSettings, currentBusiness) {
    const platforms = ['facebook', 'instagram', 'linkedin', 'youtube', 'tiktok'];
    
    platforms.forEach(platform => {
      this.renderPlatform(platform, businessSettings, currentBusiness);
    });

    this.setupEventListeners(currentBusiness);
  }

  renderPlatform(platform, businessSettings, currentBusiness) {
    const settings = businessSettings.social_media?.[platform];
    const prefix = this.platformPrefixMap[platform];

    const elements = {
      status: document.getElementById(`${prefix}Status`),
      badge: document.getElementById(`${prefix}Badge`),
      connectBtn: document.getElementById(`connect${Formatters.capitalize(platform)}Btn`),
      connectedInfo: document.getElementById(`${prefix}ConnectedInfo`)
    };

    if (settings && settings.connected && settings.status === 'active') {
      this.renderConnectedState(platform, settings, elements);
    } else {
      this.renderDisconnectedState(elements);
    }
  }

  renderConnectedState(platform, settings, elements) {
    if (elements.status) elements.status.textContent = 'Connected';
    if (elements.badge) {
      elements.badge.textContent = 'Active';
      elements.badge.className = 'status-badge connected';
    }
    if (elements.connectBtn) elements.connectBtn.style.display = 'none';
    if (elements.connectedInfo) elements.connectedInfo.style.display = 'block';

    this.populatePlatformDetails(platform, settings);
  }

  renderDisconnectedState(elements) {
    if (elements.status) elements.status.textContent = 'Not Connected';
    if (elements.badge) {
      elements.badge.textContent = 'Disconnected';
      elements.badge.className = 'status-badge';
    }
    if (elements.connectBtn) elements.connectBtn.style.display = 'inline-block';
    if (elements.connectedInfo) elements.connectedInfo.style.display = 'none';
  }

  populatePlatformDetails(platform, settings) {
    const prefix = this.platformPrefixMap[platform];

    switch (platform) {
      case 'facebook':
        this.setTextContent('fbPageName', settings.page_name);
        this.setTextContent('fbPageId', settings.page_id);
        this.setTextContent('fbExpiry', Formatters.formatDateShort(settings.expires_at));
        break;

      case 'instagram':
        this.setTextContent('igAccountName', settings.account_name || settings.username);
        this.setTextContent('igUsername', settings.username ? `@${settings.username}` : '—');
        this.setTextContent('igAccountId', settings.account_id);
        this.setTextContent('igConnectedPage', settings.connected_page_name);
        this.setTextContent('igExpiry', Formatters.formatDateShort(settings.expires_at));
        break;

      case 'linkedin':
        this.setTextContent('liOrgName', settings.organization_name);
        this.setTextContent('liVanityName', 
          settings.organization_vanity ? `linkedin.com/company/${settings.organization_vanity}` : '—');
        this.setTextContent('liOrgId', settings.organization_id);
        this.setTextContent('liExpiry', Formatters.formatDateShort(settings.expires_at));
        break;

      case 'youtube':
        this.setTextContent('ytChannelName', settings.channel_name);
        this.setTextContent('ytChannelId', settings.channel_id);
        this.setTextContent('ytCustomUrl', settings.custom_url);
        this.setTextContent('ytSubscribers', 
          settings.subscriber_count !== undefined ? Formatters.formatNumber(settings.subscriber_count) : '—');
        this.setTextContent('ytExpiry', Formatters.formatDateShort(settings.expires_at));
        break;

        case 'tiktok':
      this.setTextContent(`${prefix}Username`, 
        settings.username ? `@${settings.username}` : '—'
      );
      this.setTextContent(`${prefix}DisplayName`, settings.display_name || '—');
      this.setTextContent(`${prefix}OpenId`, settings.open_id || '—');
      this.setTextContent(`${prefix}Followers`, 
        settings.follower_count !== undefined 
          ? Formatters.formatNumber(settings.follower_count) 
          : '—'
      );
      this.setTextContent(`${prefix}Videos`, 
        settings.video_count !== undefined 
          ? Formatters.formatNumber(settings.video_count) 
          : '—'
      );
      this.setTextContent(`${prefix}Expiry`, 
        Formatters.formatDateShort(settings.expires_at)
      );
      break;

    }
  }

  setTextContent(id, value) {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value || '—';
    }
  }

  setupEventListeners(currentBusiness) {
    // Connect buttons
    ['facebook', 'instagram', 'linkedin', 'youtube'].forEach(platform => {
      const btn = document.getElementById(`connect${Formatters.capitalize(platform)}Btn`);
      if (btn) {
        btn.onclick = () => this.connectPlatform(platform, currentBusiness);
      }
    });
  }

  async connectPlatform(platform, currentBusiness) {
    try {
      this.notifications.show(`Connecting to ${Formatters.capitalize(platform)}...`, 'info');

      // Remove old listener
      if (this.oauthListener) {
        window.removeEventListener('message', this.oauthListener);
      }

      // Open OAuth popup
      const width = 600, height = 700;
      const left = (screen.width - width) / 2;
      const top = (screen.height - height) / 2;

      const authWindow = window.open(
        `/api/business-settings/auth/${platform}/connect?businessId=${currentBusiness._id}`,
        'OAuth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Setup message listener
      this.oauthListener = async (event) => {
        if (event.data.type === 'oauth-success' && event.data.platform === platform) {
          authWindow.close();
          this.notifications.show(`${Formatters.capitalize(platform)} connected successfully!`, 'success');
          
          // Trigger reload (emit event)
          window.dispatchEvent(new CustomEvent('settings-reload'));
          
          this.cleanup();
        } else if (event.data.type === 'oauth-error' && event.data.platform === platform) {
          this.notifications.show(`Failed to connect ${Formatters.capitalize(platform)}`, 'error');
          this.cleanup();
        }
      };

      window.addEventListener('message', this.oauthListener);

    } catch (error) {
      console.error(`Error connecting ${platform}:`, error);
      this.notifications.show(`Failed to connect ${Formatters.capitalize(platform)}`, 'error');
    }
  }

  async disconnectPlatform(platform, currentBusiness) {
    if (!confirm(`Are you sure you want to disconnect ${Formatters.capitalize(platform)}?`)) {
      return;
    }

    try {
      this.notifications.show(`Disconnecting ${Formatters.capitalize(platform)}...`, 'info');
      
      await this.api.disconnectPlatform(platform, currentBusiness._id);
      
      this.notifications.show(`${Formatters.capitalize(platform)} disconnected`, 'success');
      
      // Trigger reload
      window.dispatchEvent(new CustomEvent('settings-reload'));    } catch (error) {
        console.error(`Error disconnecting ${platform}:`, error);
        this.notifications.show(`Failed to disconnect ${Formatters.capitalize(platform)}`, 'error');
      }
    }
  
    async testConnection(platform, currentBusiness) {
      try {
        this.notifications.show(`Testing ${Formatters.capitalize(platform)} connection...`, 'info');
        
        const result = await this.api.testConnection(platform, currentBusiness._id);
        
        if (result.success) {
          this.notifications.show(`${Formatters.capitalize(platform)} connection is working!`, 'success');
        } else {
          this.notifications.show(`${Formatters.capitalize(platform)} connection failed: ${result.error}`, 'error');
        }
      } catch (error) {
        console.error(`Error testing ${platform}:`, error);
        this.notifications.show(`Failed to test ${Formatters.capitalize(platform)} connection`, 'error');
      }
    }
  
    async refreshToken(platform, currentBusiness) {
      try {
        this.notifications.show(`Refreshing ${Formatters.capitalize(platform)} token...`, 'info');
        
        const result = await this.api.refreshToken(platform, currentBusiness._id);
        
        if (result.success) {
          this.notifications.show(`${Formatters.capitalize(platform)} token refreshed!`, 'success');
          window.dispatchEvent(new CustomEvent('settings-reload'));
        } else {
          this.notifications.show(`Failed to refresh token: ${result.error}`, 'error');
        }
      } catch (error) {
        console.error(`Error refreshing ${platform} token:`, error);
        this.notifications.show(`Failed to refresh ${Formatters.capitalize(platform)} token`, 'error');
      }
    }
  
    async changePlatformAccount(platform, currentBusiness) {
      try {
        await this.disconnectPlatform(platform, currentBusiness);
        setTimeout(() => {
          this.connectPlatform(platform, currentBusiness);
        }, 500);
      } catch (error) {
        console.error(`Error changing ${platform} account:`, error);
        this.notifications.show(`Failed to change ${platform} account`, 'error');
      }
    }
  
    cleanup() {
      if (this.oauthListener) {
        window.removeEventListener('message', this.oauthListener);
        this.oauthListener = null;
      }
    }
  
    destroy() {
      this.cleanup();
    }
  }