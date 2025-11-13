/**
 * WordPress REST API Integration
 * Handles category fetching, image uploads, and listing creation
 */

class WordPressAPI {
    constructor(baseUrl, credentials) {
      this.baseUrl = baseUrl;
      this.credentials = credentials; // { username, password }
    }
  
    /**
     * Static method to initialize from backend config
     */
    static async initialize() {
      try {
        const response = await fetch('/api/get-wordpress-config');
        
        if (!response.ok) {
          throw new Error('Failed to get WordPress config');
        }
  
        const config = await response.json();
        
        return new WordPressAPI(config.url, {
          username: config.username,
          password: config.password
        });
      } catch (error) {
        console.error('Error initializing WordPress API:', error);
        throw error;
      }
    }
  
    /**
     * Fetch listing categories from WordPress
     */
    async getListingCategories() {
      try {
        const response = await fetch(`${this.baseUrl}/wp-json/wp/v2/listing_categories?per_page=100`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch categories');
        }
  
        const categories = await response.json();
        
        return categories.map(cat => ({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          count: cat.count,
          parent: cat.parent
        }));
      } catch (error) {
        console.error('Error fetching categories:', error);
        throw error;
      }
    }
  
    /**
     * Upload image to WordPress Media Library
     * Returns the media ID
     */
    async uploadImage(imageFile, altText = '') {
      try {
        const formData = new FormData();
        formData.append('file', imageFile);
        formData.append('alt_text', altText);
  
        const response = await fetch(`${this.baseUrl}/wp-json/wp/v2/media`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa(`${this.credentials.username}:${this.credentials.password}`)}`
          },
          body: formData
        });
  
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Image upload failed');
        }
  
        const media = await response.json();
        
        return {
          id: media.id,
          url: media.source_url,
          title: media.title.rendered,
          alt: media.alt_text
        };
      } catch (error) {
        console.error('Error uploading image to WordPress:', error);
        throw error;
      }
    }
  
    /**
     * Upload image from URL to WordPress
     */
    async uploadImageFromUrl(imageUrl, filename, altText = '') {
      try {
        // Download image as blob
        const imageResponse = await fetch(imageUrl);
        const imageBlob = await imageResponse.blob();
        
        // Create File object
        const imageFile = new File([imageBlob], filename, { type: imageBlob.type });
        
        return await this.uploadImage(imageFile, altText);
      } catch (error) {
        console.error('Error uploading image from URL:', error);
        throw error;
      }
    }
  
    /**
     * Create a new listing/product
     */
    async createListing(listingData) {
      try {
        const response = await fetch(`${this.baseUrl}/wp-json/wp/v2/listings`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa(`${this.credentials.username}:${this.credentials.password}`)}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(listingData)
        });
  
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to create listing');
        }
  
        const listing = await response.json();
        return listing;
      } catch (error) {
        console.error('Error creating listing:', error);
        throw error;
      }
    }
  
    /**
     * Get user by email
     */
    async getUserByEmail(email) {
      try {
        const response = await fetch(`${this.baseUrl}/wp-json/custom/v1/user-by-email?email=${encodeURIComponent(email)}`, {
          headers: {
            'Authorization': `Basic ${btoa(`${this.credentials.username}:${this.credentials.password}`)}`
          }
        });
  
        if (response.status === 404) {
          return null;
        }
  
        if (!response.ok) {
          throw new Error('Failed to fetch user');
        }
  
        return await response.json();
      } catch (error) {
        console.error('Error fetching user:', error);
        throw error;
      }
    }
  }
  
  // Export for use in other files
  window.WordPressAPI = WordPressAPI;