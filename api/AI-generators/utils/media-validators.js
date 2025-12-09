/**
 * Media Validators
 * Comprehensive validation utilities for media files and data
 */

const FormatConverters = require('./format-converters');

class MediaValidators {
  /**
   * Validate image media object
   */
  static validateImage(imageMedia, options = {}) {
    const errors = [];
    const warnings = [];
    const defaults = {
      maxSize: 15 * 1024 * 1024, // 15MB default
      minSize: 1024, // 1KB minimum
      allowedFormats: ['jpeg', 'jpg', 'png', 'webp'],
      requireDimensions: false,
      minWidth: 64,
      minHeight: 64,
      maxWidth: 4096,
      maxHeight: 4096
    };

    const config = { ...defaults, ...options };

    // Basic structure validation
    if (!imageMedia || typeof imageMedia !== 'object') {
      errors.push('Image media must be an object');
      return { valid: false, errors, warnings, info: null };
    }

    if (!imageMedia.type || imageMedia.type !== 'image') {
      errors.push('Media type must be "image"');
    }

    if (!imageMedia.data) {
      errors.push('Image data is required');
      return { valid: false, errors, warnings, info: null };
    }

    // Parse media info
    const mediaInfo = FormatConverters.parseMediaInfo(imageMedia.data);

    // Format validation
    if (!mediaInfo.isBase64 && !mediaInfo.isDataUrl && !mediaInfo.isUrl) {
      errors.push('Image data must be base64, data URL, or HTTP URL');
    }

    // MIME type validation
    const formatFromMime = mediaInfo.mimeType.split('/')[1];
    if (formatFromMime && !config.allowedFormats.includes(formatFromMime)) {
      errors.push(`Image format ${formatFromMime} not allowed. Allowed: ${config.allowedFormats.join(', ')}`);
    }

    // Size validation
    if (mediaInfo.size > 0) {
      if (mediaInfo.size > config.maxSize) {
        errors.push(`Image size ${FormatConverters.formatFileSize(mediaInfo.size)} exceeds maximum ${FormatConverters.formatFileSize(config.maxSize)}`);
      }
      
      if (mediaInfo.size < config.minSize) {
        errors.push(`Image size ${FormatConverters.formatFileSize(mediaInfo.size)} below minimum ${FormatConverters.formatFileSize(config.minSize)}`);
      }

      // Large file warning
      if (mediaInfo.size > 5 * 1024 * 1024) { // 5MB
        warnings.push(`Large image file (${FormatConverters.formatFileSize(mediaInfo.size)}) may cause processing delays`);
      }
    }

    // URL validation (if applicable)
    if (mediaInfo.isUrl) {
      try {
        new URL(imageMedia.data);
      } catch (error) {
        errors.push('Invalid image URL format');
      }
    }

    // Base64 validation
    if ((mediaInfo.isBase64 || mediaInfo.isDataUrl) && !FormatConverters.isValidBase64(imageMedia.data)) {
      errors.push('Invalid base64 encoding');
    }

    // Additional metadata validation
    if (imageMedia.role) {
      const validRoles = ['subject', 'background', 'style', 'reference', 'mask'];
      if (!validRoles.includes(imageMedia.role)) {
        warnings.push(`Unknown image role "${imageMedia.role}". Valid roles: ${validRoles.join(', ')}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      info: mediaInfo
    };
  }

  /**
   * Validate video media object
   */
  static validateVideo(videoMedia, options = {}) {
    const errors = [];
    const warnings = [];
    const defaults = {
      maxSize: 100 * 1024 * 1024, // 100MB default
      minSize: 10 * 1024, // 10KB minimum
      allowedFormats: ['mp4', 'webm', 'mov'],
      maxDuration: 300, // 5 minutes
      minDuration: 1 // 1 second
    };

    const config = { ...defaults, ...options };

    // Basic structure validation
    if (!videoMedia || typeof videoMedia !== 'object') {
      errors.push('Video media must be an object');
      return { valid: false, errors, warnings, info: null };
    }

    if (!videoMedia.type || videoMedia.type !== 'video') {
      errors.push('Media type must be "video"');
    }

    if (!videoMedia.data) {
      errors.push('Video data is required');
      return { valid: false, errors, warnings, info: null };
    }

    // Parse media info
    const mediaInfo = FormatConverters.parseMediaInfo(videoMedia.data);

    // Format validation
    const formatFromMime = mediaInfo.mimeType.split('/')[1];
    if (formatFromMime && !config.allowedFormats.includes(formatFromMime)) {
      errors.push(`Video format ${formatFromMime} not allowed. Allowed: ${config.allowedFormats.join(', ')}`);
    }

    // Size validation
    if (mediaInfo.size > 0) {
      if (mediaInfo.size > config.maxSize) {
        errors.push(`Video size ${FormatConverters.formatFileSize(mediaInfo.size)} exceeds maximum ${FormatConverters.formatFileSize(config.maxSize)}`);
      }
      
      if (mediaInfo.size < config.minSize) {
        errors.push(`Video size ${FormatConverters.formatFileSize(mediaInfo.size)} below minimum ${FormatConverters.formatFileSize(config.minSize)}`);
      }
    }

    // Duration validation (if provided in metadata)
    if (videoMedia.duration !== undefined) {
      if (typeof videoMedia.duration !== 'number') {
        errors.push('Video duration must be a number');
      } else {
        if (videoMedia.duration > config.maxDuration) {
          errors.push(`Video duration ${videoMedia.duration}s exceeds maximum ${config.maxDuration}s`);
        }
        
        if (videoMedia.duration < config.minDuration) {
          errors.push(`Video duration ${videoMedia.duration}s below minimum ${config.minDuration}s`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      info: mediaInfo
    };
  }

  /**
   * Validate audio media object
   */
  static validateAudio(audioMedia, options = {}) {
    const errors = [];
    const warnings = [];
    const defaults = {
      maxSize: 50 * 1024 * 1024, // 50MB default
      minSize: 1024, // 1KB minimum
      allowedFormats: ['mp3', 'wav', 'ogg', 'aac'],
      maxDuration: 600, // 10 minutes
      minDuration: 0.1 // 0.1 second
    };

    const config = { ...defaults, ...options };

    // Basic structure validation
    if (!audioMedia || typeof audioMedia !== 'object') {
      errors.push('Audio media must be an object');
      return { valid: false, errors, warnings, info: null };
    }

    if (!audioMedia.type || audioMedia.type !== 'audio') {
      errors.push('Media type must be "audio"');
    }

    if (!audioMedia.data) {
      errors.push('Audio data is required');
      return { valid: false, errors, warnings, info: null };
    }

    // Parse media info
    const mediaInfo = FormatConverters.parseMediaInfo(audioMedia.data);

    // Format validation
    const formatFromMime = mediaInfo.mimeType.split('/')[1];
    if (formatFromMime && !config.allowedFormats.includes(formatFromMime)) {
      errors.push(`Audio format ${formatFromMime} not allowed. Allowed: ${config.allowedFormats.join(', ')}`);
    }

    // Size validation
    if (mediaInfo.size > 0) {
      if (mediaInfo.size > config.maxSize) {
        errors.push(`Audio size ${FormatConverters.formatFileSize(mediaInfo.size)} exceeds maximum ${FormatConverters.formatFileSize(config.maxSize)}`);
      }
      
      if (mediaInfo.size < config.minSize) {
        errors.push(`Audio size ${FormatConverters.formatFileSize(mediaInfo.size)} below minimum ${FormatConverters.formatFileSize(config.minSize)}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      info: mediaInfo
    };
  }

  /**
   * Validate array of media objects
   */
  static validateMediaArray(mediaArray, options = {}) {
    const errors = [];
    const warnings = [];
    const validatedMedia = [];

    if (!Array.isArray(mediaArray)) {
      errors.push('Media must be an array');
      return { valid: false, errors, warnings, media: [] };
    }

    if (mediaArray.length === 0) {
      warnings.push('No media provided');
    }

    const defaults = {
      maxItems: 10,
      requireAtLeastOne: true,
      allowedTypes: ['image', 'video', 'audio']
    };

    const config = { ...defaults, ...options };

    // Array size validation
    if (mediaArray.length > config.maxItems) {
      errors.push(`Too many media items. Maximum: ${config.maxItems}, provided: ${mediaArray.length}`);
    }

    if (config.requireAtLeastOne && mediaArray.length === 0) {
      errors.push('At least one media item is required');
    }

    // Validate each media item
    mediaArray.forEach((media, index) => {
      const prefix = `Media[${index}]`;
      
      if (!media.type) {
        errors.push(`${prefix}: Media type is required`);
        return;
      }

      if (!config.allowedTypes.includes(media.type)) {
        errors.push(`${prefix}: Media type "${media.type}" not allowed. Allowed: ${config.allowedTypes.join(', ')}`);
        return;
      }

      let validation;
      
      switch (media.type) {
        case 'image':
          validation = this.validateImage(media, options.image);
          break;
        case 'video':
          validation = this.validateVideo(media, options.video);
          break;
        case 'audio':
          validation = this.validateAudio(media, options.audio);
          break;
        default:
          errors.push(`${prefix}: Unknown media type "${media.type}"`);
          return;
      }

      // Collect validation results
      validation.errors.forEach(err => errors.push(`${prefix}: ${err}`));
      validation.warnings.forEach(warn => warnings.push(`${prefix}: ${warn}`));

      if (validation.valid) {
        validatedMedia.push({
          ...media,
          index,
          info: validation.info
        });
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      media: validatedMedia
    };
  }

  /**
   * Validate media for specific AI capability
   */
  static validateForCapability(mediaArray, capability, useCase, options = {}) {
    const errors = [];
    const warnings = [];

    // First do general media validation
    const generalValidation = this.validateMediaArray(mediaArray, options);
    errors.push(...generalValidation.errors);
    warnings.push(...generalValidation.warnings);

    if (!generalValidation.valid) {
      return { valid: false, errors, warnings, media: [] };
    }

    const validatedMedia = generalValidation.media;

    // Capability-specific validation
    switch (`${capability}/${useCase}`) {
      case 'video-generation/text-to-video':
        // Text-to-video doesn't require media, but if provided, warn
        if (validatedMedia.length > 0) {
          warnings.push('Media provided for text-to-video generation will be ignored');
        }
        break;

      case 'video-generation/image-to-video':
        const images = validatedMedia.filter(m => m.type === 'image');
        if (images.length === 0) {
          errors.push('Image-to-video requires at least one image');
        }
        
        // Check for non-image media
        const nonImages = validatedMedia.filter(m => m.type !== 'image');
        if (nonImages.length > 0) {
          warnings.push(`Non-image media will be ignored for image-to-video generation`);
        }
        break;

      case 'image-generation/text-to-image':
        // Text-to-image doesn't require media
        if (validatedMedia.length > 0) {
          warnings.push('Media provided for text-to-image generation will be ignored');
        }
        break;

      case 'image-generation/image-to-image':
        const sourceImages = validatedMedia.filter(m => m.type === 'image');
        if (sourceImages.length === 0) {
          errors.push('Image-to-image requires at least one source image');
        }
        break;

      default:
        warnings.push(`Unknown capability/use case: ${capability}/${useCase}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      media: validatedMedia
    };
  }

  /**
   * Get validation configuration for specific providers
   */
  static getProviderValidationConfig(provider, capability, useCase) {
    const configs = {
      google: {
        'video-generation': {
          'text-to-video': {
            image: { maxSize: 10 * 1024 * 1024 }, // 10MB
            video: { maxSize: 50 * 1024 * 1024 }  // 50MB
          },
          'image-to-video': {
            image: { 
              maxSize: 10 * 1024 * 1024, 
              allowedFormats: ['jpeg', 'jpg', 'png'],
              requireDimensions: true,
              minWidth: 256,
              minHeight: 256
            }
          }
        }
      },
      
      runway: {
        'video-generation': {
          'text-to-video': {
            image: { maxSize: 15 * 1024 * 1024 }
          }
        }
      }
    };

    return configs[provider]?.[capability]?.[useCase] || {};
  }

  /**
   * Quick validation for common scenarios
   */
  static quickValidate(media, type) {
    const validators = {
      image: (m) => this.validateImage(m),
      video: (m) => this.validateVideo(m),
      audio: (m) => this.validateAudio(m),
      array: (m) => this.validateMediaArray(m)
    };

    const validator = validators[type];
    if (!validator) {
      throw new Error(`Unknown validation type: ${type}`);
    }

    return validator(media);
  }

  /**
   * Get media statistics
   */
  static getMediaStats(mediaArray) {
    if (!Array.isArray(mediaArray)) {
      return { error: 'Media is not an array' };
    }

    const stats = {
      total: mediaArray.length,
      byType: { image: 0, video: 0, audio: 0, other: 0 },
      totalSize: 0,
      averageSize: 0,
      largestFile: { size: 0, type: null, index: null },
      formats: new Set()
    };

    mediaArray.forEach((media, index) => {
      if (media.type && stats.byType.hasOwnProperty(media.type)) {
        stats.byType[media.type]++;
      } else {
        stats.byType.other++;
      }

      if (media.data) {
        const info = FormatConverters.parseMediaInfo(media.data);
        stats.totalSize += info.size;
        
        if (info.size > stats.largestFile.size) {
          stats.largestFile = { size: info.size, type: media.type, index };
        }
        
        if (info.mimeType) {
          stats.formats.add(info.mimeType);
        }
      }
    });

    stats.averageSize = stats.total > 0 ? stats.totalSize / stats.total : 0;
    stats.formats = Array.from(stats.formats);

    return stats;
  }

  /**
   * Security validation to prevent malicious content
   */
  static securityValidation(mediaData) {
    const warnings = [];
    const errors = [];

    if (typeof mediaData !== 'string') {
      return { valid: true, errors, warnings };
    }

    // Check for potentially malicious patterns in URLs
    if (mediaData.startsWith('http')) {
      // Check for suspicious domains or patterns
      const suspiciousPatterns = [
        /localhost/i,
        /127\.0\.0\.1/,
        /192\.168\./,
        /10\./,
        /172\.(1[6-9]|2[0-9]|3[01])\./
      ];

      if (suspiciousPatterns.some(pattern => pattern.test(mediaData))) {
        warnings.push('URL points to internal/private network address');
      }
    }

    // Check for excessively long data
    if (mediaData.length > 100 * 1024 * 1024) { // 100MB as string
      errors.push('Media data excessively large - potential DoS attempt');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}

module.exports = MediaValidators;