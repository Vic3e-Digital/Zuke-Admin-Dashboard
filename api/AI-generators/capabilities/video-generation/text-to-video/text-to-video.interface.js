/**
 * Text-to-Video Interface
 * All text-to-video providers must implement this interface
 */

class TextToVideoInterface {
  /**
   * Generate video from text prompt
   * @param {Object} request - Standardized request object
   * @param {Object} modelConfig - Selected model configuration
   * @param {Object} metadata - Request metadata (requestId, provider, etc.)
   * @returns {Promise<Object>} - Provider-specific response (will be normalized)
   */
  async generateVideo(request, modelConfig, metadata) {
    throw new Error('generateVideo() method must be implemented by provider');
  }

  /**
   * Check job status for async operations
   * @param {string} jobId - Job identifier from the provider
   * @param {Object} metadata - Request metadata
   * @returns {Promise<Object>} - Job status and result (if completed)
   */
  async checkStatus(jobId, metadata) {
    throw new Error('checkStatus() method must be implemented by provider');
  }

  /**
   * Cancel a running job
   * @param {string} jobId - Job identifier from the provider
   * @param {Object} metadata - Request metadata
   * @returns {Promise<boolean>} - True if successfully cancelled
   */
  async cancelJob(jobId, metadata) {
    throw new Error('cancelJob() method must be implemented by provider');
  }

  /**
   * Get model capabilities and constraints
   * @param {string} modelId - Model identifier
   * @returns {Object} - Model capabilities
   */
  getCapabilities(modelId) {
    throw new Error('getCapabilities() method must be implemented by provider');
  }

  /**
   * Validate request against provider-specific requirements
   * @param {Object} request - Standardized request object
   * @param {string} modelId - Model identifier
   * @returns {Object} - Validation result { valid: boolean, errors: [], warnings: [] }
   */
  validateRequest(request, modelId) {
    // Default implementation - providers can override
    return { valid: true, errors: [], warnings: [] };
  }

  /**
   * Transform standardized request to provider-specific format
   * @param {Object} request - Standardized request object
   * @param {Object} modelConfig - Selected model configuration
   * @returns {Object} - Provider-specific request format
   */
  transformRequest(request, modelConfig) {
    throw new Error('transformRequest() method must be implemented by provider');
  }

  /**
   * Transform provider response to normalized format
   * @param {Object} response - Raw provider response
   * @param {Object} request - Original standardized request
   * @param {Object} metadata - Request metadata
   * @returns {Object} - Normalized response data
   */
  transformResponse(response, request, metadata) {
    throw new Error('transformResponse() method must be implemented by provider');
  }

  /**
   * Get provider-specific error information
   * @param {Error} error - Error object from provider
   * @returns {Object} - Normalized error information
   */
  normalizeError(error) {
    return {
      message: error.message || 'Unknown error',
      code: error.code || 'UNKNOWN_ERROR',
      type: error.name || 'Error',
      details: error.details || null
    };
  }

  /**
   * Get estimated processing time for a request
   * @param {Object} request - Standardized request object
   * @param {string} modelId - Model identifier
   * @returns {number} - Estimated time in seconds
   */
  estimateProcessingTime(request, modelId) {
    // Default estimation based on duration
    const duration = request.parameters?.duration || 5;
    const complexity = request.parameters?.quality === 'high' ? 2 : 1;
    return duration * 15 * complexity; // ~15 seconds per video second
  }

  /**
   * Check if provider supports specific features
   * @param {Array} features - Feature names to check
   * @returns {Object} - Feature support mapping
   */
  supportsFeatures(features) {
    const support = {};
    features.forEach(feature => {
      support[feature] = false; // Default to not supported
    });
    return support;
  }
}

module.exports = TextToVideoInterface;