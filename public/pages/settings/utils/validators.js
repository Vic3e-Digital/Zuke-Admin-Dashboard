// Input validation utilities
export class Validators {
    static isValidEmail(email) {
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return regex.test(email);
    }
  
    static isValidUrl(url) {
      return url.startsWith('http://') || url.startsWith('https://');
    }
  
    static isValidFile(file, maxSize = 2 * 1024 * 1024) {
      if (file.size > maxSize) {
        return { valid: false, error: 'File size must be less than 2MB' };
      }
      if (!file.type.match('image.*')) {
        return { valid: false, error: 'Please select an image file' };
      }
      return { valid: true };
    }
  
    static isNotEmpty(value) {
      return value && value.trim().length > 0;
    }
  }