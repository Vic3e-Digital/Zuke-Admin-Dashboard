class OAuthTemplates {
    static pageSelector(pages, platform, userToken) {
      const platformConfig = {
        facebook: {
          title: 'Select Facebook Page',
          color: '#1877F2',
          description: 'Choose which page you want to connect'
        },
        instagram: {
          title: 'Select Instagram Account',
          color: '#E1306C',
          description: 'Choose which Instagram Business account you want to connect'
        },
        linkedin: {
          title: 'Select LinkedIn Organization',
          color: '#0A66C2',
          description: 'Choose which company page you want to connect'
        },
        youtube: {
          title: 'Select YouTube Channel',
          color: '#FF0000',
          description: 'Choose which channel you want to connect for posting videos'
        }
      };
  
      const config = platformConfig[platform];
  
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${config.title}</title>
          ${this.getBaseStyles()}
          <style>
            .selector:hover { border-color: ${config.color}; }
            .select-btn { background: ${config.color}; }
          </style>
        </head>
        <body>
          <div class="selector-container">
            <h2>${config.title}</h2>
            <p class="subtitle">${config.description}</p>
            ${pages.map(page => this.renderPageOption(page, platform)).join('')}
          </div>
          <script>
            function selectItem(id) {
              const url = new URL(window.location.href);
              url.searchParams.delete('code');
              url.searchParams.set('${platform}_id', id);
              url.searchParams.set('user_token', '${userToken}');
              window.location.href = url.toString();
            }
          </script>
        </body>
        </html>
      `;
    }
  
    static success(platform, data) {
      const platformConfig = {
        facebook: { color: '#1877F2', icon: '✓' },
        instagram: { color: '#E1306C', icon: '✓' },
        linkedin: { color: '#0A66C2', icon: '✓' },
        youtube: { color: '#FF0000', icon: '✓' }
      };
  
      const config = platformConfig[platform];
  
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Connected</title>
          ${this.getBaseStyles()}
        </head>
        <body>
          <div class="success-card">
            <div class="icon" style="background: ${config.color};">${config.icon}</div>
                      <h2>Connected Successfully</h2>
          <div class="info-card">
            ${this.renderSuccessInfo(platform, data)}
          </div>
          <p>This window will close automatically...</p>
        </div>
        <script>
          window.opener.postMessage({ 
            type: 'oauth-success', 
            platform: '${platform}',
            data: ${JSON.stringify(data)}
          }, '*');
          setTimeout(() => window.close(), 2000);
        </script>
      </body>
      </html>
    `;
  }

  static error(platform, errorMessage) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Connection Failed</title>
        ${this.getBaseStyles()}
      </head>
      <body>
        <div class="error-card">
          <div class="icon error">✗</div>
          <h2>Connection Failed</h2>
          <div class="error-message">${errorMessage}</div>
          <p>This window will close automatically...</p>
        </div>
        <script>
          window.opener.postMessage({ 
            type: 'oauth-error', 
            platform: '${platform}',
            error: '${errorMessage.replace(/'/g, "\\'")}'
          }, '*');
          setTimeout(() => window.close(), 3500);
        </script>
      </body>
      </html>
    `;
  }

  static getBaseStyles() {
    return `
      <link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'Hanken Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #f8f9fa;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .selector-container, .success-card, .error-card {
          background: white;
          border-radius: 12px;
          padding: 32px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          max-width: 480px;
          width: 100%;
          text-align: center;
        }
        h2 {
          margin: 0 0 8px 0;
          color: #2c3e50;
          font-size: 20px;
          font-weight: 600;
        }
        .subtitle {
          color: #666;
          margin-bottom: 24px;
          font-size: 14px;
          line-height: 1.5;
        }
        .selector {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px;
          margin: 8px 0;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .selector:hover {
          background: #f8fbff;
        }
        .thumbnail {
          width: 48px;
          height: 48px;
          border-radius: 8px;
          object-fit: cover;
          flex-shrink: 0;
        }
        .info {
          flex: 1;
          min-width: 0;
          text-align: left;
        }
        .name {
          font-weight: 500;
          color: #2c3e50;
          font-size: 15px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .meta {
          font-size: 13px;
          color: #999;
          margin-top: 2px;
        }
        .select-btn {
          padding: 8px 16px;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          font-size: 14px;
          transition: transform 0.15s ease;
        }
        .select-btn:hover {
          transform: scale(1.05);
        }
        .icon {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
          font-size: 32px;
          color: white;
        }
        .icon.error {
          background: #ef4444;
        }
        .info-card {
          background: #f8f9fa;
          padding: 16px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .error-message {
          background: #fef2f2;
          padding: 16px;
          border-radius: 8px;
          margin: 20px 0;
          border-left: 3px solid #ef4444;
          color: #666;
          font-size: 14px;
          text-align: left;
        }
        p {
          color: #999;
          font-size: 13px;
          margin-top: 16px;
        }
      </style>
    `;
  }

  static renderPageOption(page, platform) {
    let thumbnail, name, meta;

    switch(platform) {
      case 'facebook':
        thumbnail = page.picture?.data?.url || '';
        name = page.name;
        meta = page.category || 'Page';
        break;
      case 'instagram':
        thumbnail = page.profile_picture_url || '';
        name = page.name || page.username;
        meta = `@${page.username}`;
        break;
      case 'linkedin':
        thumbnail = page.logo || '';
        name = page.name;
        meta = page.vanityName ? `linkedin.com/company/${page.vanityName}` : 'Company Page';
        break;
      case 'youtube':
        thumbnail = page.thumbnail || '';
        name = page.name;
        meta = page.customUrl ? `youtube.com/${page.customUrl}` : `${this.formatNumber(page.subscriberCount)} subscribers`;
        break;
    }

    return `
      <div class="selector" onclick="selectItem('${page.id}')">
        <img src="${thumbnail}" alt="${name}" class="thumbnail" />
        <div class="info">
          <div class="name">${name}</div>
          <div class="meta">${meta}</div>
        </div>
        <button class="select-btn">Select</button>
      </div>
    `;
  }

  static renderSuccessInfo(platform, data) {
    switch(platform) {
      case 'facebook':
        return `
          <div class="name">${data.page_name}</div>
          <div class="meta">${data.page_category || 'Facebook Page'}</div>
        `;
      case 'instagram':
        return `
          <div class="name">${data.account_name}</div>
          <div class="meta">@${data.username}</div>
        `;
      case 'linkedin':
        return `
          <div class="name">${data.organization_name}</div>
          <div class="meta">Company Page</div>
        `;
      case 'youtube':
        return `
          <div class="name">${data.channel_name}</div>
          <div class="meta">${data.custom_url ? `youtube.com/${data.custom_url}` : ''}</div>
        `;
      default:
        return '';
    }
  }

  static formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }
}

module.exports = OAuthTemplates;