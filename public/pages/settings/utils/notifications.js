// Toast notification system
export class NotificationManager {
    show(message, type = 'info') {
      // Remove existing notifications
      document.querySelectorAll('.settings-notification').forEach(n => n.remove());
  
      const notification = this.createNotification(message, type);
      document.body.appendChild(notification);
  
      setTimeout(() => this.hide(notification), 5000);
    }
  
    createNotification(message, type) {
      const notification = document.createElement('div');
      notification.className = `settings-notification ${type}`;
      notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        padding: 15px 20px;
        background: ${this.getColor(type)};
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
  
      const icon = this.getIcon(type);
      notification.innerHTML = `
        <span style="font-size: 20px; font-weight: bold;">${icon}</span>
        <span style="flex: 1;">${this.sanitize(message)}</span>
        <button onclick="this.parentElement.remove()" 
                style="background: none; border: none; color: white; 
                       font-size: 20px; cursor: pointer; padding: 0; 
                       line-height: 1;">×</button>
      `;
  
      return notification;
    }
  
    getColor(type) {
      const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
      };
      return colors[type] || colors.info;
    }
  
    getIcon(type) {
      const icons = {
        success: '✓',
        error: '✗',
        warning: '⚠',
        info: 'ℹ'
      };
      return icons[type] || icons.info;
    }
  
    hide(notification) {
      if (notification.parentElement) {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
      }
    }
  
    sanitize(str) {
      if (!str) return '';
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }
  }