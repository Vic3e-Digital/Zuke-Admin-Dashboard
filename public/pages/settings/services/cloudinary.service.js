// Image upload handling
export class CloudinaryService {
    constructor(apiService) {
      this.apiService = apiService;
      this.config = null;
    }
  
    async loadConfig() {
      if (this.config) return this.config;
      this.config = await this.apiService.getCloudinaryConfig();
      return this.config;
    }
  
    async uploadImage(file, folder = 'user-profiles') {
      const config = await this.loadConfig();
  
      if (!config) {
        throw new Error('Cloudinary not configured');
      }
  
      // Validate file
      if (file.size > 2 * 1024 * 1024) {
        throw new Error('File size must be less than 2MB');
      }
  
      if (!file.type.match('image.*')) {
        throw new Error('Please select an image file');
      }
  
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', config.uploadPreset);
      formData.append('folder', folder);
  
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
  }