/**
 * Background Worker for Tigray Marketplace
 * 
 * Processes:
 * - PDF invoice generation using Puppeteer
 * - Email notifications (if needed)
 * - Other async tasks
 */

require('dotenv').config();
const Bull = require('bull');
const mongoose = require('mongoose');
const logger = require('./services/logger');
const { generateInvoicePDF } = require('./jobs/invoiceGenerator');

// Redis connection
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Initialize invoice queue
const invoiceQueue = new Bull('invoice-generation', redisUrl, {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
});

// ============ Database Connection ============
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    logger.info('✅ MongoDB connected (Worker)');
  } catch (error) {
    logger.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// ============ Queue Processors ============

/**
 * Process invoice generation jobs
 */
invoiceQueue.process('generate-invoice', async (job) => {
  const { invoiceId, orderId, orderData } = job.data;
  
  logger.info(`Processing invoice job ${job.id} for order ${orderId}`);
  
  try {
    // Update progress
    job.progress(10);
    
    // Generate PDF
    const result = await generateInvoicePDF(invoiceId, orderData);
    
    job.progress(100);
    
    logger.info(`Invoice job ${job.id} completed. PDF: ${result.pdfUrl}`);
    
    return {
      success: true,
      invoiceId,
      orderId,
      pdfUrl: result.pdfUrl,
      fileSize: result.fileSize,
      generationTime: result.generationTime,
    };
  } catch (error) {
    logger.error(`Invoice job ${job.id} failed:`, error);
    throw error;
  }
});

// ============ Queue Event Handlers ============

invoiceQueue.on('completed', (job, result) => {
  logger.info(`✅ Job ${job.id} completed:`, result);
});

invoiceQueue.on('failed', (job, err) => {
  logger.error(`❌ Job ${job.id} failed:`, err.message);
});

invoiceQueue.on('progress', (job, progress) => {
  logger.info(`Job ${job.id} progress: ${progress}%`);
});

invoiceQueue.on('stalled', (job) => {
  logger.warn(`⚠️  Job ${job.id} stalled`);
});

invoiceQueue.on('error', (error) => {
  logger.error('Queue error:', error);
});

// ============ Graceful Shutdown ============
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  
  try {
    await invoiceQueue.close();
    logger.info('Queue closed');
    
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
    
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ============ Start Worker ============
const startWorker = async () => {
  await connectDB();
  
  logger.info('🚀 Worker started and listening for jobs...');
  logger.info(`📡 Connected to Redis: ${redisUrl}`);
  logger.info(`📊 Queue: invoice-generation`);
};

startWorker();

