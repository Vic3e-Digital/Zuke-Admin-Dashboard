class FormatUtils {
    static formatNumber(num) {
      if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
      if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
      return num.toString();
    }
  
    static sanitizeForHTML(text) {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }
  
    static truncate(text, maxLength = 50) {
      if (text.length <= maxLength) return text;
      return text.substring(0, maxLength) + '...';
    }
  }
  
  module.exports = FormatUtils;