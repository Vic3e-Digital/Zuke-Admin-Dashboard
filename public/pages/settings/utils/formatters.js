// Data formatting utilities
export class Formatters {
    static formatNumber(num) {
      if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
      } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
      }
      return num.toString();
    }
  
    static formatDate(dateString) {
      return new Date(dateString).toLocaleString();
    }
  
    static formatDateShort(dateString) {
      return new Date(dateString).toLocaleDateString();
    }
  
    static capitalize(str) {
      return str.charAt(0).toUpperCase() + str.slice(1);
    }
  
    static sanitizeHTML(str) {
      if (!str) return '';
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }
  }