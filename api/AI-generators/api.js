/**
 * AI Generators API
 * Main Express router for the unified AI generation system
 */

const express = require('express');
const AIRouter = require('./core/ai-router');
const CapabilityMatrix = require('./config/capability-matrix');
const MediaValidators = require('./utils/media-validators');
const { getPollingManager } = require('./utils/polling-manager');

const router = express.Router();



// Initialize AI Router
const aiRouter = new AIRouter();
const pollingManager = getPollingManager();

/**
 * Main AI Generation Endpoint
 * POST /api/ai-generators/generate
 * Unified endpoint for all AI generation requests
 */
router.post('/generate', async (req, res) => {
  const startTime = Date.now();
  
  try {
    console.log('🚀 AI Generators API: New generation request');
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    // Extract and validate basic request structure
    const request = {
      capability: req.body.capability,
      useCase: req.body.useCase,
      prompt: req.body.prompt,
      media: req.body.media || [],
      parameters: req.body.parameters || {},
      preferences: req.body.preferences || {},
      userId: req.body.userId,
      businessId: req.body.businessId,
      metadata: req.body.metadata || {}
    };

    // Validate media if present
    if (request.media && request.media.length > 0) {
      const mediaValidation = MediaValidators.validateForCapability(
        request.media, 
        request.capability, 
        request.useCase
      );

      if (!mediaValidation.valid) {
        return res.status(400).json({
          success: false,
          error: 'Media validation failed',
          details: mediaValidation.errors,
          warnings: mediaValidation.warnings
        });
      }

      if (mediaValidation.warnings.length > 0) {
        console.warn('⚠️  Media validation warnings:', mediaValidation.warnings);
      }
    }

    // Route the request through AI Router
    const result = await aiRouter.route(request);

    // Handle async operations
    if (result.status === 'processing' && result.async?.jobId) {
      console.log(`🔄 Async operation started: ${result.async.jobId}`);
      
      // Return immediate response for async operations
      const processingTime = Date.now() - startTime;
      
      return res.status(202).json({
        ...result,
        message: 'Generation started - use job ID to check status',
        processingTime,
        statusUrl: `/api/ai-generators/status/${result.async.jobId}`
      });
    }

    // Return synchronous result
    const processingTime = Date.now() - startTime;
    result.processingTime = processingTime;

    console.log(`✅ Generation completed in ${processingTime}ms`);
    
    return res.json(result);

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    console.error('❌ AI generation failed:', error);

    return res.status(500).json({
      success: false,
      error: error.message,
      processingTime,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Check Job Status
 * GET /api/ai-generators/status/:jobId
 */
router.get('/status/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    console.log(`📊 Checking status for job: ${jobId}`);

    // Check if job is in polling manager
    const pollingStatus = pollingManager.getJobStatus(jobId);
    
    if (pollingStatus.status === 'not_found') {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
        jobId
      });
    }

    return res.json({
      success: true,
      jobId,
      ...pollingStatus
    });

  } catch (error) {
    console.error('❌ Status check failed:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message,
      jobId: req.params.jobId
    });
  }
});

/**
 * Cancel Job
 * POST /api/ai-generators/cancel/:jobId
 */
router.post('/cancel/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    console.log(`🛑 Cancelling job: ${jobId}`);

    const result = await pollingManager.cancelJob(jobId);

    if (result.success) {
      return res.json({
        success: true,
        message: 'Job cancelled successfully',
        ...result
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.error || 'Failed to cancel job',
        jobId
      });
    }

  } catch (error) {
    console.error('❌ Cancel job failed:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message,
      jobId: req.params.jobId
    });
  }
});

/**
 * Get Available Capabilities
 * GET /api/ai-generators/capabilities
 */
router.get('/capabilities', (req, res) => {
  try {
    const capabilities = aiRouter.getAvailableCapabilities();
    
    return res.json({
      success: true,
      capabilities,
      stats: CapabilityMatrix.getStats()
    });

  } catch (error) {
    console.error('❌ Get capabilities failed:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get Specific Capability Information
 * GET /api/ai-generators/capabilities/:capability
 */
router.get('/capabilities/:capability', (req, res) => {
  try {
    const { capability } = req.params;
    
    const info = aiRouter.getCapabilityInfo(capability);
    
    return res.json({
      success: true,
      ...info
    });

  } catch (error) {
    console.error('❌ Get capability info failed:', error);
    
    return res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get Specific Use Case Information
 * GET /api/ai-generators/capabilities/:capability/:useCase
 */
router.get('/capabilities/:capability/:useCase', (req, res) => {
  try {
    const { capability, useCase } = req.params;
    
    const info = aiRouter.getCapabilityInfo(capability, useCase);
    
    return res.json({
      success: true,
      ...info
    });

  } catch (error) {
    console.error('❌ Get capability info failed:', error);
    
    return res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Health Check
 * GET /api/ai-generators/health
 */
router.get('/health', async (req, res) => {
  try {
    const health = await aiRouter.healthCheck();
    const pollingHealth = pollingManager.healthCheck();
    
    const overallHealth = {
      status: health.status === 'healthy' && pollingHealth.status === 'healthy' ? 'healthy' : 'warning',
      timestamp: new Date().toISOString(),
      aiRouter: health,
      pollingManager: pollingHealth,
      stats: aiRouter.getStats()
    };

    const statusCode = overallHealth.status === 'healthy' ? 200 : 503;
    
    return res.status(statusCode).json(overallHealth);

  } catch (error) {
    console.error('❌ Health check failed:', error);
    
    return res.status(503).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get Active Jobs
 * GET /api/ai-generators/jobs
 */
router.get('/jobs', (req, res) => {
  try {
    const activeJobs = pollingManager.getActiveJobs();
    const stats = pollingManager.getStats();
    
    return res.json({
      success: true,
      activeJobs,
      stats
    });

  } catch (error) {
    console.error('❌ Get active jobs failed:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Validate Request (without executing)
 * POST /api/ai-generators/validate
 */
router.post('/validate', async (req, res) => {
  try {
    const request = {
      capability: req.body.capability,
      useCase: req.body.useCase,
      prompt: req.body.prompt,
      media: req.body.media || [],
      parameters: req.body.parameters || {},
      preferences: req.body.preferences || {}
    };

    // Use the request validator from AI Router
    const RequestValidator = require('./core/request-validator');
    const validation = RequestValidator.validate(request);

    // Also validate media if present
    let mediaValidation = { valid: true, errors: [], warnings: [] };
    if (request.media && request.media.length > 0) {
      mediaValidation = MediaValidators.validateForCapability(
        request.media, 
        request.capability, 
        request.useCase
      );
    }

    const overall = {
      valid: validation.valid && mediaValidation.valid,
      request: validation,
      media: mediaValidation
    };

    return res.json({
      success: true,
      validation: overall
    });

  } catch (error) {
    console.error('❌ Validation failed:', error);
    
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get System Statistics
 * GET /api/ai-generators/stats
 */
router.get('/stats', (req, res) => {
  try {
    const aiStats = aiRouter.getStats();
    const pollingStats = pollingManager.getStats();
    const capabilityStats = CapabilityMatrix.getStats();

    return res.json({
      success: true,
      timestamp: new Date().toISOString(),
      aiRouter: aiStats,
      polling: pollingStats,
      capabilities: capabilityStats
    });

  } catch (error) {
    console.error('❌ Get stats failed:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Developer Tools - Clear Caches (Development only)
 * POST /api/ai-generators/dev/clear-cache
 */
if (process.env.NODE_ENV !== 'production') {
  router.post('/dev/clear-cache', (req, res) => {
    try {
      aiRouter.clearCache();
      
      return res.json({
        success: true,
        message: 'Caches cleared successfully'
      });

    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * Developer Tools - Preload Handlers
   * POST /api/ai-generators/dev/preload
   */
  router.post('/dev/preload', async (req, res) => {
    try {
      await aiRouter.preloadHandlers();
      
      return res.json({
        success: true,
        message: 'Handlers preloaded successfully',
        stats: aiRouter.getStats()
      });

    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
}

/**
 * Error handling middleware for this router
 */
router.use((error, req, res, next) => {
  console.error('🚨 AI Generators API Error:', error);
  
  return res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;