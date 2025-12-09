/**
 * Request Validator
 * Validates incoming AI generation requests against capability requirements
 */

const CapabilityMatrix = require('../config/capability-matrix');
const ModelRegistry = require('../config/model-registry');

class RequestValidator {
  /**
   * Validate a complete AI generation request
   */
  static validate(request) {
    const errors = [];
    const warnings = [];

    try {
      // 1. Basic structure validation
      const structureValidation = this.validateStructure(request);
      if (!structureValidation.valid) {
        errors.push(...structureValidation.errors);
      }
      warnings.push(...structureValidation.warnings);

      // If basic structure is invalid, stop here
      if (errors.length > 0) {
        return { valid: false, errors, warnings };
      }

      // 2. Capability validation
      const capabilityValidation = this.validateCapability(request);
      if (!capabilityValidation.valid) {
        errors.push(...capabilityValidation.errors);
      }
      warnings.push(...capabilityValidation.warnings);

      // 3. Parameters validation
      const paramValidation = this.validateParameters(request);
      if (!paramValidation.valid) {
        errors.push(...paramValidation.errors);
      }
      warnings.push(...paramValidation.warnings);

      // 4. Media validation (if present)
      if (request.media && Array.isArray(request.media)) {
        const mediaValidation = this.validateMedia(request);
        if (!mediaValidation.valid) {
          errors.push(...mediaValidation.errors);
        }
        warnings.push(...mediaValidation.warnings);
      }

      // 5. Provider/model validation (if specified)
      if (request.preferences) {
        const prefValidation = this.validatePreferences(request);
        if (!prefValidation.valid) {
          errors.push(...prefValidation.errors);
        }
        warnings.push(...prefValidation.warnings);
      }

    } catch (error) {
      errors.push(`Validation error: ${error.message}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate basic request structure
   */
  static validateStructure(request) {
    const errors = [];
    const warnings = [];

    // Required top-level fields
    const requiredFields = ['capability', 'useCase', 'prompt'];
    
    for (const field of requiredFields) {
      if (!request[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Type validations
    if (request.capability && typeof request.capability !== 'string') {
      errors.push('Field "capability" must be a string');
    }

    if (request.useCase && typeof request.useCase !== 'string') {
      errors.push('Field "useCase" must be a string');
    }

    if (request.prompt && typeof request.prompt !== 'string') {
      errors.push('Field "prompt" must be a string');
    }

    // Optional field type validations
    if (request.parameters && typeof request.parameters !== 'object') {
      errors.push('Field "parameters" must be an object');
    }

    if (request.preferences && typeof request.preferences !== 'object') {
      errors.push('Field "preferences" must be an object');
    }

    if (request.media && !Array.isArray(request.media)) {
      errors.push('Field "media" must be an array');
    }

    // Prompt length validation
    if (request.prompt && request.prompt.length > 5000) {
      warnings.push('Prompt is very long and may be truncated by some providers');
    }

    if (request.prompt && request.prompt.length === 0) {
      errors.push('Prompt cannot be empty');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate capability and use case
   */
  static validateCapability(request) {
    const errors = [];
    const warnings = [];

    try {
      // Check if capability exists
      const capability = CapabilityMatrix.getCapability(request.capability);
      
      // Check if use case exists for this capability
      const useCase = CapabilityMatrix.getUseCase(request.capability, request.useCase);
      
      // Validate against capability requirements
      const reqValidation = CapabilityMatrix.validateRequirements(
        request.capability, 
        request.useCase, 
        request
      );

      if (!reqValidation.valid) {
        errors.push(...reqValidation.errors);
      }

      // Check if there are active providers
      const activeProviders = CapabilityMatrix.getActiveProviders(
        request.capability, 
        request.useCase
      );

      if (activeProviders.length === 0) {
        errors.push(`No active providers available for ${request.capability}/${request.useCase}`);
      }

    } catch (error) {
      errors.push(`Invalid capability/use case: ${error.message}`);
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate request parameters
   */
  static validateParameters(request) {
    const errors = [];
    const warnings = [];

    if (!request.parameters) {
      return { valid: true, errors, warnings };
    }

    const params = request.parameters;

    // Common parameter validations
    if (params.duration !== undefined) {
      if (typeof params.duration !== 'number' || params.duration <= 0) {
        errors.push('Parameter "duration" must be a positive number');
      } else if (params.duration > 60) {
        warnings.push('Duration over 60 seconds may not be supported by all providers');
      }
    }

    if (params.resolution !== undefined) {
      const validResolutions = ['480p', '720p', '1080p', '4k', '512x512', '1024x1024', '1536x1536'];
      if (!validResolutions.includes(params.resolution)) {
        errors.push(`Invalid resolution "${params.resolution}". Valid options: ${validResolutions.join(', ')}`);
      }
    }

    if (params.aspectRatio !== undefined) {
      const validRatios = ['16:9', '9:16', '1:1', '4:3', '3:4'];
      if (!validRatios.includes(params.aspectRatio)) {
        errors.push(`Invalid aspect ratio "${params.aspectRatio}". Valid options: ${validRatios.join(', ')}`);
      }
    }

    if (params.quality !== undefined) {
      const validQualities = ['low', 'standard', 'high', 'ultra'];
      if (!validQualities.includes(params.quality)) {
        errors.push(`Invalid quality "${params.quality}". Valid options: ${validQualities.join(', ')}`);
      }
    }

    if (params.audio !== undefined && typeof params.audio !== 'boolean') {
      errors.push('Parameter "audio" must be a boolean');
    }

    // Video-specific validations
    if (request.capability === 'video-generation') {
      if (params.fps !== undefined) {
        if (typeof params.fps !== 'number' || params.fps < 1 || params.fps > 60) {
          errors.push('Parameter "fps" must be between 1 and 60');
        }
      }
    }

    // Image-specific validations
    if (request.capability === 'image-generation') {
      if (params.variations !== undefined) {
        if (typeof params.variations !== 'number' || params.variations < 1 || params.variations > 10) {
          errors.push('Parameter "variations" must be between 1 and 10');
        }
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate media inputs
   */
  static validateMedia(request) {
    const errors = [];
    const warnings = [];

    for (let i = 0; i < request.media.length; i++) {
      const media = request.media[i];
      const prefix = `Media[${i}]`;

      // Required fields
      if (!media.type) {
        errors.push(`${prefix}: Missing required field "type"`);
        continue;
      }

      if (!media.data) {
        errors.push(`${prefix}: Missing required field "data"`);
        continue;
      }

      // Type validation
      const validTypes = ['image', 'video', 'audio'];
      if (!validTypes.includes(media.type)) {
        errors.push(`${prefix}: Invalid type "${media.type}". Valid types: ${validTypes.join(', ')}`);
      }

      // Data validation
      if (typeof media.data !== 'string') {
        errors.push(`${prefix}: Field "data" must be a string (base64 or URL)`);
      } else {
        // Basic format validation
        const isBase64 = media.data.startsWith('data:') || /^[A-Za-z0-9+/]+=*$/.test(media.data);
        const isUrl = media.data.startsWith('http://') || media.data.startsWith('https://');
        
        if (!isBase64 && !isUrl) {
          warnings.push(`${prefix}: Data format unclear - should be base64 or URL`);
        }

        // Size warning for base64
        if (isBase64 && media.data.length > 10000000) { // ~7MB base64
          warnings.push(`${prefix}: Large media file may cause timeout issues`);
        }
      }

      // Role validation (optional)
      if (media.role) {
        const validRoles = ['subject', 'background', 'style', 'reference', 'mask'];
        if (!validRoles.includes(media.role)) {
          warnings.push(`${prefix}: Unknown role "${media.role}". Common roles: ${validRoles.join(', ')}`);
        }
      }
    }

    // Use case specific validations
    if (request.useCase === 'image-to-video') {
      const imageMedia = request.media.filter(m => m.type === 'image');
      if (imageMedia.length === 0) {
        errors.push('Image-to-video generation requires at least one image input');
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate preferences
   */
  static validatePreferences(request) {
    const errors = [];
    const warnings = [];

    const prefs = request.preferences;

    // Provider validation
    if (prefs.provider) {
      if (typeof prefs.provider !== 'string') {
        errors.push('Preference "provider" must be a string');
      } else {
        // Check if provider supports this capability/use case
        const supports = CapabilityMatrix.supportsCapability(
          prefs.provider, 
          request.capability, 
          request.useCase
        );
        
        if (!supports) {
          errors.push(`Provider "${prefs.provider}" does not support ${request.capability}/${request.useCase}`);
        }
      }
    }

    // Model validation
    if (prefs.model) {
      if (typeof prefs.model !== 'string') {
        errors.push('Preference "model" must be a string');
      } else {
        try {
          const modelInfo = ModelRegistry.getModelById(prefs.model);
          
          // Check if model supports the requested capability
          if (modelInfo.capability !== request.capability) {
            errors.push(`Model "${prefs.model}" is for ${modelInfo.capability}, not ${request.capability}`);
          }
        } catch (error) {
          errors.push(`Unknown model: ${prefs.model}`);
        }
      }
    }

    // Fallback validation
    if (prefs.fallback !== undefined && typeof prefs.fallback !== 'boolean') {
      errors.push('Preference "fallback" must be a boolean');
    }

    // Cost tier validation
    if (prefs.costTier) {
      const validTiers = ['budget', 'standard', 'premium'];
      if (!validTiers.includes(prefs.costTier)) {
        errors.push(`Invalid cost tier "${prefs.costTier}". Valid tiers: ${validTiers.join(', ')}`);
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate against specific model capabilities
   */
  static validateAgainstModel(request, modelId) {
    const errors = [];
    const warnings = [];

    try {
      const capabilities = ModelRegistry.getModelCapabilities(modelId);
      const params = request.parameters || {};

      // Duration validation
      if (params.duration && capabilities.maxDuration) {
        if (params.duration > capabilities.maxDuration) {
          errors.push(`Duration ${params.duration}s exceeds model limit of ${capabilities.maxDuration}s`);
        }
      }

      // Resolution validation
      if (params.resolution && capabilities.resolutions) {
        if (!capabilities.resolutions.includes(params.resolution)) {
          errors.push(`Resolution "${params.resolution}" not supported. Supported: ${capabilities.resolutions.join(', ')}`);
        }
      }

      // Aspect ratio validation
      if (params.aspectRatio && capabilities.aspectRatios) {
        if (!capabilities.aspectRatios.includes(params.aspectRatio)) {
          errors.push(`Aspect ratio "${params.aspectRatio}" not supported. Supported: ${capabilities.aspectRatios.join(', ')}`);
        }
      }

      // Audio validation
      if (params.audio && capabilities.audio === false) {
        warnings.push('Audio generation requested but not supported by this model');
      }

      // Prompt length validation
      if (request.prompt && capabilities.maxPromptLength) {
        if (request.prompt.length > capabilities.maxPromptLength) {
          warnings.push(`Prompt length ${request.prompt.length} exceeds recommended ${capabilities.maxPromptLength} characters`);
        }
      }

    } catch (error) {
      errors.push(`Model validation error: ${error.message}`);
    }

    return { valid: errors.length === 0, errors, warnings };
  }
}

module.exports = RequestValidator;