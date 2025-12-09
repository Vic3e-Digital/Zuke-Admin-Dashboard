/**
 * Format Converters
 * Utilities for converting between different media formats and encodings
 */

class FormatConverters {
  /**
   * Convert base64 data URL to pure base64
   */
  static extractBase64FromDataUrl(dataUrl) {
    if (!dataUrl || typeof dataUrl !== 'string') {
      throw new Error('Invalid data URL provided');
    }

    if (!dataUrl.startsWith('data:')) {
      // Already pure base64 or URL
      return dataUrl;
    }

    const base64Index = dataUrl.indexOf(',');
    if (base64Index === -1) {
      throw new Error('Invalid data URL format');
    }

    return dataUrl.substring(base64Index + 1);
  }

  /**
   * Create data URL from base64 and MIME type
   */
  static createDataUrl(base64Data, mimeType) {
    if (!base64Data || !mimeType) {
      throw new Error('Base64 data and MIME type are required');
    }

    return `data:${mimeType};base64,${base64Data}`;
  }

  /**
   * Detect MIME type from data URL or file extension
   */
  static detectMimeType(data) {
    if (data.startsWith('data:')) {
      const mimeMatch = data.match(/^data:([^;]+)/);
      if (mimeMatch) {
        return mimeMatch[1];
      }
    }

    // Try to detect from base64 header (limited detection)
    if (typeof data === 'string') {
      const decoded = this.safeBase64Decode(data.substring(0, 20));
      if (decoded) {
        // JPEG magic bytes: FF D8 FF
        if (decoded.startsWith('\xFF\xD8\xFF')) return 'image/jpeg';
        // PNG magic bytes: 89 50 4E 47
        if (decoded.startsWith('\x89PNG')) return 'image/png';
        // WebP magic bytes: RIFF...WEBP
        if (decoded.includes('WEBP')) return 'image/webp';
        // GIF magic bytes: GIF87a or GIF89a
        if (decoded.startsWith('GIF87a') || decoded.startsWith('GIF89a')) return 'image/gif';
      }
    }

    return 'application/octet-stream'; // Default
  }

  /**
   * Safely decode base64 without throwing errors
   */
  static safeBase64Decode(base64String) {
    try {
      if (typeof Buffer !== 'undefined') {
        return Buffer.from(base64String, 'base64').toString('binary');
      }
      return atob(base64String);
    } catch (error) {
      return null;
    }
  }

  /**
   * Convert file size from bytes to human readable format
   */
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Estimate file size from base64 data
   */
  static estimateFileSize(base64Data) {
    if (!base64Data) return 0;
    
    // Remove data URL prefix if present
    const cleanBase64 = this.extractBase64FromDataUrl(base64Data);
    
    // Base64 encoding increases size by ~33%
    return Math.round(cleanBase64.length * 0.75);
  }

  /**
   * Validate base64 string
   */
  static isValidBase64(str) {
    if (!str || typeof str !== 'string') return false;
    
    // Remove data URL prefix if present
    const cleanBase64 = str.startsWith('data:') ? this.extractBase64FromDataUrl(str) : str;
    
    // Base64 validation regex
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    
    return base64Regex.test(cleanBase64) && cleanBase64.length % 4 === 0;
  }

  /**
   * Convert URL to base64 (for future implementation)
   */
  static async urlToBase64(url) {
    throw new Error('URL to base64 conversion not yet implemented');
    // Future implementation would fetch the URL and convert to base64
  }

  /**
   * Compress base64 image (placeholder for future implementation)
   */
  static compressBase64Image(base64Data, quality = 0.8) {
    // This would require image processing library like sharp or canvas
    console.warn('Image compression not implemented - returning original data');
    return base64Data;
  }

  /**
   * Resize image dimensions in base64 (placeholder)
   */
  static resizeBase64Image(base64Data, width, height) {
    // This would require image processing library
    console.warn('Image resizing not implemented - returning original data');
    return base64Data;
  }

  /**
   * Convert video formats (placeholder)
   */
  static convertVideoFormat(videoData, fromFormat, toFormat) {
    // This would require video processing library like ffmpeg
    throw new Error('Video format conversion not yet implemented');
  }

  /**
   * Extract video thumbnail (placeholder)
   */
  static extractVideoThumbnail(videoUrl, timeSeconds = 1) {
    // This would require video processing capabilities
    throw new Error('Video thumbnail extraction not yet implemented');
  }

  /**
   * Normalize aspect ratio string
   */
  static normalizeAspectRatio(aspectRatio) {
    if (!aspectRatio) return '16:9'; // Default

    const ratios = {
      'landscape': '16:9',
      'portrait': '9:16',
      'square': '1:1',
      'wide': '21:9',
      'cinema': '2.39:1'
    };

    return ratios[aspectRatio.toLowerCase()] || aspectRatio;
  }

  /**
   * Convert resolution string to dimensions
   */
  static resolutionToDimensions(resolution, aspectRatio = '16:9') {
    const resolutions = {
      '480p': { width: 854, height: 480 },
      '720p': { width: 1280, height: 720 },
      '1080p': { width: 1920, height: 1080 },
      '4k': { width: 3840, height: 2160 },
      'uhd': { width: 3840, height: 2160 }
    };

    let dimensions = resolutions[resolution.toLowerCase()];
    
    if (!dimensions) {
      // Try to parse custom resolution like "1920x1080"
      const match = resolution.match(/(\d+)x(\d+)/);
      if (match) {
        dimensions = { width: parseInt(match[1]), height: parseInt(match[2]) };
      } else {
        dimensions = resolutions['1080p']; // Default
      }
    }

    // Adjust for aspect ratio if needed
    if (aspectRatio !== '16:9') {
      dimensions = this.adjustDimensionsForAspectRatio(dimensions, aspectRatio);
    }

    return dimensions;
  }

  /**
   * Adjust dimensions for aspect ratio
   */
  static adjustDimensionsForAspectRatio(dimensions, aspectRatio) {
    const [widthRatio, heightRatio] = aspectRatio.split(':').map(Number);
    
    if (!widthRatio || !heightRatio) {
      return dimensions;
    }

    const targetRatio = widthRatio / heightRatio;
    const currentRatio = dimensions.width / dimensions.height;

    if (Math.abs(targetRatio - currentRatio) < 0.01) {
      return dimensions; // Already correct ratio
    }

    // Adjust to match target aspect ratio, keeping larger dimension
    if (targetRatio > currentRatio) {
      // Target is wider
      return {
        width: Math.round(dimensions.height * targetRatio),
        height: dimensions.height
      };
    } else {
      // Target is taller
      return {
        width: dimensions.width,
        height: Math.round(dimensions.width / targetRatio)
      };
    }
  }

  /**
   * Generate file extension from MIME type
   */
  static mimeTypeToExtension(mimeType) {
    const mimeMap = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
      'video/mp4': '.mp4',
      'video/webm': '.webm',
      'video/quicktime': '.mov',
      'audio/mpeg': '.mp3',
      'audio/wav': '.wav',
      'audio/ogg': '.ogg',
      'text/plain': '.txt',
      'application/json': '.json'
    };

    return mimeMap[mimeType.toLowerCase()] || '.bin';
  }

  /**
   * Create filename with timestamp
   */
  static generateFilename(prefix = 'file', extension = '.bin', includeTimestamp = true) {
    let filename = prefix;
    
    if (includeTimestamp) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      filename += '_' + timestamp;
    }
    
    if (!extension.startsWith('.')) {
      extension = '.' + extension;
    }
    
    return filename + extension;
  }

  /**
   * Sanitize filename for safe storage
   */
  static sanitizeFilename(filename) {
    return filename
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  /**
   * Parse media info from data
   */
  static parseMediaInfo(mediaData) {
    const info = {
      type: 'unknown',
      mimeType: 'application/octet-stream',
      size: 0,
      extension: '.bin',
      isBase64: false,
      isUrl: false,
      isDataUrl: false
    };

    if (!mediaData || typeof mediaData !== 'string') {
      return info;
    }

    // Check format type
    if (mediaData.startsWith('data:')) {
      info.isDataUrl = true;
      info.mimeType = this.detectMimeType(mediaData);
      info.size = this.estimateFileSize(mediaData);
    } else if (mediaData.startsWith('http://') || mediaData.startsWith('https://')) {
      info.isUrl = true;
    } else if (this.isValidBase64(mediaData)) {
      info.isBase64 = true;
      info.size = this.estimateFileSize(mediaData);
    }

    // Determine media type from MIME type
    if (info.mimeType.startsWith('image/')) {
      info.type = 'image';
    } else if (info.mimeType.startsWith('video/')) {
      info.type = 'video';
    } else if (info.mimeType.startsWith('audio/')) {
      info.type = 'audio';
    }

    info.extension = this.mimeTypeToExtension(info.mimeType);

    return info;
  }
}

module.exports = FormatConverters;