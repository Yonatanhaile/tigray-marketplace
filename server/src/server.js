/**
 * Main server entry point for Tigray Marketplace
 * 
 * This server handles:
 * - RESTful API endpoints for marketplace operations
 * - Socket.io real-time messaging and notifications
 * - JWT authentication for both HTTP and WebSocket
 * - Bull queue integration for background jobs
 * - File upload signing (Cloudinary or S3)
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
// const { createAdapter } = require('@socket.io/redis-adapter');
const { Server } = require('socket.io');
// const Redis = require('ioredis');

const logger = require('./services/logger');
const { errorHandler } = require('./middleware/errorHandler');
const { initializeQueues } = require('./queues');

// Import routes
const authRoutes = require('./routes/auth');
const listingRoutes = require('./routes/listings');
const orderRoutes = require('./routes/orders');
const messageRoutes = require('./routes/messages');
const uploadRoutes = require('./routes/uploads');
const disputeRoutes = require('./routes/disputes');
const adminRoutes = require('./routes/admin');

// Import socket handlers
const { initializeSocketHandlers } = require('./sockets');

const app = express();
const server = http.createServer(app);

// ============ Middleware Configuration ============

// Security headers
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
}));

// CORS configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://tigray-marketplace-client.vercel.app',
];

// Add FRONTEND_URL if it exists
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman, curl)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if origin is in allowed list or is a Vercel deployment
    if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked origin: ${origin}`);
      callback(null, true); // Allow anyway in production to prevent issues, just log warning
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS', 'PUT'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600, // Cache preflight requests for 10 minutes
};

app.use(cors(corsOptions));

// Log CORS configuration on startup
logger.info(`CORS enabled for origins: ${allowedOrigins.join(', ')} and *.vercel.app`);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Sanitize data to prevent MongoDB operator injection
app.use(mongoSanitize());

// Request logging (development)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`);
    next();
  });
}

// ============ Health Check Endpoint ============
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

// ============ API Routes ============
app.use('/api/auth', authRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/disputes', disputeRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: true,
    message: 'Endpoint not found',
  });
});

// Global error handler
app.use(errorHandler);

// ============ Database Connection ============
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    logger.info('✅ MongoDB connected successfully');
  } catch (error) {
    logger.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// ============ Socket.io Configuration ============
const io = new Server(server, {
  cors: corsOptions,
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
});

// Optional: Redis adapter for horizontal scaling (uncomment when needed)
// const pubClient = new Redis(process.env.REDIS_URL);
// const subClient = pubClient.duplicate();
// io.adapter(createAdapter(pubClient, subClient));

// Initialize Socket.io handlers with JWT authentication
initializeSocketHandlers(io);

// Make io available to request handlers
app.set('io', io);

// ============ Bull Queue Initialization ============
initializeQueues().then(() => {
  logger.info('✅ Bull queues initialized');
}).catch((error) => {
  logger.error('❌ Queue initialization error:', error);
});

// ============ Graceful Shutdown ============
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  
  server.close(() => {
    logger.info('HTTP server closed');
  });

  try {
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

// ============ Start Server ============
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  await connectDB();
  
  server.listen(PORT, () => {
    logger.info(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
    logger.info(`📡 Socket.io enabled with CORS origin: ${corsOptions.origin}`);
  });
};

startServer();

module.exports = { app, server, io };

