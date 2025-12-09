/**
 * Polling Manager
 * Manages async job polling for long-running AI generation tasks
 */

class PollingManager {
  constructor() {
    this.activeJobs = new Map();
    this.pollingIntervals = new Map();
    this.jobTimeouts = new Map();
    this.defaultConfig = {
      initialDelay: 5000,      // 5 seconds
      maxDelay: 30000,         // 30 seconds
      backoffMultiplier: 1.5,
      maxAttempts: 120,        // 10 minutes at 5s intervals
      timeout: 600000          // 10 minutes total timeout
    };
  }

  /**
   * Start polling for a job
   */
  async startPolling(jobId, provider, statusChecker, options = {}) {
    const config = { ...this.defaultConfig, ...options };
    
    console.log(`🔄 Starting polling for job ${jobId} with ${provider}`);

    const jobInfo = {
      jobId,
      provider,
      statusChecker,
      config,
      startTime: Date.now(),
      attempts: 0,
      currentDelay: config.initialDelay,
      status: 'polling',
      lastUpdate: Date.now()
    };

    this.activeJobs.set(jobId, jobInfo);

    // Set overall timeout
    const timeout = setTimeout(() => {
      this.handleTimeout(jobId);
    }, config.timeout);
    
    this.jobTimeouts.set(jobId, timeout);

    // Start first poll
    return this.pollJob(jobId);
  }

  /**
   * Poll a specific job
   */
  async pollJob(jobId) {
    const jobInfo = this.activeJobs.get(jobId);
    if (!jobInfo) {
      throw new Error(`Job ${jobId} not found in active jobs`);
    }

    try {
      jobInfo.attempts++;
      jobInfo.lastUpdate = Date.now();

      console.log(`🔍 Polling job ${jobId} (attempt ${jobInfo.attempts})`);

      // Check job status
      const statusResult = await jobInfo.statusChecker(jobId);

      // Update job info with latest status
      jobInfo.lastStatus = statusResult;

      switch (statusResult.status) {
        case 'completed':
          return this.completeJob(jobId, statusResult);

        case 'failed':
        case 'error':
          return this.failJob(jobId, statusResult);

        case 'processing':
        case 'pending':
          return this.scheduleNextPoll(jobId, statusResult);

        default:
          console.warn(`Unknown status for job ${jobId}: ${statusResult.status}`);
          return this.scheduleNextPoll(jobId, statusResult);
      }

    } catch (error) {
      console.error(`Error polling job ${jobId}:`, error.message);
      
      // Handle polling error
      if (jobInfo.attempts >= jobInfo.config.maxAttempts) {
        return this.failJob(jobId, { 
          status: 'failed', 
          error: `Polling failed after ${jobInfo.attempts} attempts: ${error.message}` 
        });
      }

      // Continue polling with backoff
      return this.scheduleNextPoll(jobId, { 
        status: 'polling_error', 
        error: error.message 
      });
    }
  }

  /**
   * Schedule next poll for a job
   */
  scheduleNextPoll(jobId, statusResult) {
    const jobInfo = this.activeJobs.get(jobId);
    if (!jobInfo) {
      return { status: 'error', error: 'Job not found' };
    }

    // Check if we've exceeded max attempts
    if (jobInfo.attempts >= jobInfo.config.maxAttempts) {
      return this.failJob(jobId, { 
        status: 'failed', 
        error: `Exceeded maximum polling attempts (${jobInfo.config.maxAttempts})` 
      });
    }

    console.log(`⏱️  Scheduling next poll for job ${jobId} in ${jobInfo.currentDelay}ms`);

    // Schedule next poll
    const interval = setTimeout(() => {
      this.pollJob(jobId).catch(error => {
        console.error(`Scheduled poll failed for job ${jobId}:`, error);
        this.failJob(jobId, { status: 'failed', error: error.message });
      });
    }, jobInfo.currentDelay);

    this.pollingIntervals.set(jobId, interval);

    // Apply exponential backoff
    jobInfo.currentDelay = Math.min(
      jobInfo.currentDelay * jobInfo.config.backoffMultiplier,
      jobInfo.config.maxDelay
    );

    return {
      status: 'polling',
      jobId,
      progress: statusResult.progress,
      estimatedTime: this.getEstimatedTimeRemaining(jobId),
      nextPollIn: jobInfo.currentDelay,
      attempts: jobInfo.attempts,
      maxAttempts: jobInfo.config.maxAttempts
    };
  }

  /**
   * Complete a job successfully
   */
  completeJob(jobId, result) {
    console.log(`✅ Job ${jobId} completed successfully`);

    const jobInfo = this.activeJobs.get(jobId);
    const completionTime = Date.now() - (jobInfo?.startTime || Date.now());

    this.cleanupJob(jobId);

    return {
      status: 'completed',
      jobId,
      result: result.result,
      completionTime,
      attempts: jobInfo?.attempts || 0
    };
  }

  /**
   * Mark a job as failed
   */
  failJob(jobId, result) {
    console.log(`❌ Job ${jobId} failed: ${result.error || 'Unknown error'}`);

    const jobInfo = this.activeJobs.get(jobId);
    const failureTime = Date.now() - (jobInfo?.startTime || Date.now());

    this.cleanupJob(jobId);

    return {
      status: 'failed',
      jobId,
      error: result.error || 'Job failed',
      failureTime,
      attempts: jobInfo?.attempts || 0
    };
  }

  /**
   * Handle job timeout
   */
  handleTimeout(jobId) {
    console.log(`⏰ Job ${jobId} timed out`);

    const jobInfo = this.activeJobs.get(jobId);
    this.failJob(jobId, { 
      status: 'failed', 
      error: `Job timed out after ${jobInfo?.config.timeout || this.defaultConfig.timeout}ms` 
    });
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId, cancelFunction = null) {
    console.log(`🛑 Cancelling job ${jobId}`);

    const jobInfo = this.activeJobs.get(jobId);
    if (!jobInfo) {
      return { success: false, error: 'Job not found' };
    }

    try {
      // Try to cancel with provider if cancellation function provided
      if (cancelFunction) {
        await cancelFunction(jobId);
      }

      this.cleanupJob(jobId);

      return {
        success: true,
        jobId,
        cancelledAt: Date.now(),
        attempts: jobInfo.attempts
      };

    } catch (error) {
      console.error(`Failed to cancel job ${jobId}:`, error);
      
      // Still cleanup locally even if provider cancellation failed
      this.cleanupJob(jobId);
      
      return {
        success: false,
        jobId,
        error: error.message,
        localCleanup: true
      };
    }
  }

  /**
   * Cleanup job resources
   */
  cleanupJob(jobId) {
    // Clear polling interval
    const interval = this.pollingIntervals.get(jobId);
    if (interval) {
      clearTimeout(interval);
      this.pollingIntervals.delete(jobId);
    }

    // Clear timeout
    const timeout = this.jobTimeouts.get(jobId);
    if (timeout) {
      clearTimeout(timeout);
      this.jobTimeouts.delete(jobId);
    }

    // Remove from active jobs
    this.activeJobs.delete(jobId);
  }

  /**
   * Get job status
   */
  getJobStatus(jobId) {
    const jobInfo = this.activeJobs.get(jobId);
    if (!jobInfo) {
      return { status: 'not_found', error: 'Job not found' };
    }

    const runningTime = Date.now() - jobInfo.startTime;

    return {
      status: jobInfo.status,
      jobId,
      provider: jobInfo.provider,
      attempts: jobInfo.attempts,
      maxAttempts: jobInfo.config.maxAttempts,
      runningTime,
      lastUpdate: jobInfo.lastUpdate,
      lastStatus: jobInfo.lastStatus,
      estimatedTimeRemaining: this.getEstimatedTimeRemaining(jobId),
      nextPollIn: jobInfo.currentDelay
    };
  }

  /**
   * Get all active jobs
   */
  getActiveJobs() {
    const jobs = {};
    
    for (const [jobId, jobInfo] of this.activeJobs) {
      jobs[jobId] = {
        jobId,
        provider: jobInfo.provider,
        status: jobInfo.status,
        attempts: jobInfo.attempts,
        runningTime: Date.now() - jobInfo.startTime,
        lastUpdate: jobInfo.lastUpdate
      };
    }

    return jobs;
  }

  /**
   * Get estimated time remaining for a job
   */
  getEstimatedTimeRemaining(jobId) {
    const jobInfo = this.activeJobs.get(jobId);
    if (!jobInfo || !jobInfo.lastStatus) {
      return null;
    }

    // If provider gives us an estimate, use it
    if (jobInfo.lastStatus.estimatedTime) {
      return jobInfo.lastStatus.estimatedTime;
    }

    // If we have progress, calculate based on that
    if (jobInfo.lastStatus.progress && jobInfo.lastStatus.progress > 0) {
      const runningTime = Date.now() - jobInfo.startTime;
      const totalEstimatedTime = runningTime / (jobInfo.lastStatus.progress / 100);
      return Math.max(totalEstimatedTime - runningTime, 0);
    }

    // Default estimation based on typical processing times
    const runningTime = Date.now() - jobInfo.startTime;
    const typicalTotalTime = jobInfo.config.timeout * 0.5; // Assume 50% of timeout is typical
    
    return Math.max(typicalTotalTime - runningTime, 0);
  }

  /**
   * Get polling statistics
   */
  getStats() {
    const stats = {
      activeJobs: this.activeJobs.size,
      totalPollingIntervals: this.pollingIntervals.size,
      totalTimeouts: this.jobTimeouts.size
    };

    // Job breakdown by provider
    const byProvider = {};
    for (const jobInfo of this.activeJobs.values()) {
      byProvider[jobInfo.provider] = (byProvider[jobInfo.provider] || 0) + 1;
    }
    stats.byProvider = byProvider;

    // Job breakdown by status
    const byStatus = {};
    for (const jobInfo of this.activeJobs.values()) {
      byStatus[jobInfo.status] = (byStatus[jobInfo.status] || 0) + 1;
    }
    stats.byStatus = byStatus;

    return stats;
  }

  /**
   * Health check for polling manager
   */
  healthCheck() {
    const health = {
      status: 'healthy',
      activeJobs: this.activeJobs.size,
      memoryUsage: {
        activeJobs: this.activeJobs.size,
        intervals: this.pollingIntervals.size,
        timeouts: this.jobTimeouts.size
      }
    };

    // Check for stuck jobs (running too long)
    const stuckJobs = [];
    const maxRunTime = 15 * 60 * 1000; // 15 minutes

    for (const [jobId, jobInfo] of this.activeJobs) {
      const runTime = Date.now() - jobInfo.startTime;
      if (runTime > maxRunTime) {
        stuckJobs.push({
          jobId,
          runTime,
          attempts: jobInfo.attempts,
          provider: jobInfo.provider
        });
      }
    }

    if (stuckJobs.length > 0) {
      health.status = 'warning';
      health.stuckJobs = stuckJobs;
    }

    // Check for memory leaks (too many jobs)
    if (this.activeJobs.size > 100) {
      health.status = 'warning';
      health.warning = 'High number of active jobs - possible memory leak';
    }

    return health;
  }

  /**
   * Cleanup all jobs (for shutdown)
   */
  shutdown() {
    console.log(`🛑 Shutting down polling manager with ${this.activeJobs.size} active jobs`);

    // Cancel all timeouts and intervals
    for (const interval of this.pollingIntervals.values()) {
      clearTimeout(interval);
    }

    for (const timeout of this.jobTimeouts.values()) {
      clearTimeout(timeout);
    }

    // Clear all maps
    this.activeJobs.clear();
    this.pollingIntervals.clear();
    this.jobTimeouts.clear();

    console.log('✅ Polling manager shutdown complete');
  }

  /**
   * Create a status checker function for a provider
   */
  static createStatusChecker(provider, capability, useCase) {
    return async (jobId) => {
      try {
        // Load the appropriate handler
        const handlerPath = `../capabilities/${capability}/${useCase}/index.js`;
        const Handler = require(handlerPath);
        const handler = new Handler();

        // Check status using the handler
        return await handler.checkStatus(jobId, provider);

      } catch (error) {
        throw new Error(`Status check failed: ${error.message}`);
      }
    };
  }
}

// Singleton instance
let pollingManagerInstance = null;

/**
 * Get singleton polling manager instance
 */
function getPollingManager() {
  if (!pollingManagerInstance) {
    pollingManagerInstance = new PollingManager();
  }
  return pollingManagerInstance;
}

module.exports = {
  PollingManager,
  getPollingManager
};