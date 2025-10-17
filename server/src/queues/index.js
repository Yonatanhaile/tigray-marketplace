const Bull = require('bull');
const logger = require('../services/logger');

// Initialize queues
let invoiceQueue;

/**
 * Initialize Bull queues with Redis connection
 */
const initializeQueues = async () => {
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    // Create invoice generation queue
    invoiceQueue = new Bull('invoice-generation', redisUrl, {
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 200, // Keep last 200 failed jobs
      },
    });

    // Queue event listeners
    invoiceQueue.on('completed', (job, result) => {
      logger.info(`Invoice job ${job.id} completed:`, result);
    });

    invoiceQueue.on('failed', (job, err) => {
      logger.error(`Invoice job ${job.id} failed:`, err.message);
    });

    invoiceQueue.on('error', (error) => {
      logger.error('Invoice queue error:', error);
    });

    logger.info('✅ Bull queues initialized successfully');
  } catch (error) {
    logger.error('❌ Failed to initialize queues:', error);
    throw error;
  }
};

/**
 * Add invoice generation job to queue
 */
const addInvoiceJob = async (jobData) => {
  try {
    const job = await invoiceQueue.add('generate-invoice', jobData, {
      priority: jobData.priority || 1,
    });
    
    logger.info(`Invoice job added to queue: ${job.id}`);
    return job;
  } catch (error) {
    logger.error('Error adding invoice job:', error);
    throw error;
  }
};

/**
 * Get queue statistics
 */
const getQueueStats = async () => {
  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      invoiceQueue.getWaitingCount(),
      invoiceQueue.getActiveCount(),
      invoiceQueue.getCompletedCount(),
      invoiceQueue.getFailedCount(),
      invoiceQueue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
    };
  } catch (error) {
    logger.error('Error getting queue stats:', error);
    throw error;
  }
};

/**
 * Clean old jobs from queue
 */
const cleanQueue = async (grace = 7 * 24 * 60 * 60 * 1000) => {
  try {
    await invoiceQueue.clean(grace, 'completed');
    await invoiceQueue.clean(grace, 'failed');
    logger.info('Queue cleaned successfully');
  } catch (error) {
    logger.error('Error cleaning queue:', error);
    throw error;
  }
};

module.exports = {
  initializeQueues,
  addInvoiceJob,
  getQueueStats,
  cleanQueue,
  invoiceQueue,
};

