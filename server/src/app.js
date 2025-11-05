// src/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// =============================================
// SECURITY MIDDLEWARE
// =============================================
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// =============================================
// CORS CONFIGURATION
// =============================================
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5000')
  .split(',')
  .map(origin => origin.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page']
}));

// =============================================
// COMPRESSION
// =============================================
app.use(compression());

// =============================================
// LOGGING
// =============================================
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// =============================================
// BODY PARSING MIDDLEWARE (PHẢI ĐẶT TRƯỚC LOGGING)
// =============================================
app.use(express.json({ 
  limit: process.env.MAX_JSON_SIZE || '10mb',
  type: 'application/json'
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: process.env.MAX_JSON_SIZE || '10mb' 
}));

// =============================================
// REQUEST LOGGING MIDDLEWARE (SAU BODY PARSING)
// =============================================
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    
    // Bây giờ req.body đã được parse rồi
    if (req.body && Object.keys(req.body).length > 0) {
      console.log('Body:', JSON.stringify(req.body, null, 2));
    }
    
    next();
  });
}

// =============================================
// RATE LIMITING
// =============================================
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    }
  },
  skip: (req) => req.path === '/api/health'
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    error: {
      message: 'Too many authentication attempts, please try again later.'
    }
  }
});

app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// =============================================
// STATIC FILES
// =============================================
const uploadsDir = path.join(__dirname, '..', 'uploads');
app.use('/uploads', express.static(uploadsDir, {
  maxAge: '1d',
  etag: true
}));

// =============================================
// INITIALIZE QUEUE PROCESSOR
// =============================================
if (process.env.NODE_ENV !== 'test') {
  const queueProcessor = require('./utils/queueProcessor');
  const redisService = require('./services/redisService');
  
  queueProcessor.initialize().catch(err => {
    console.error('❌ Failed to initialize queue processor:', err);
    // Don't exit - allow API to work without queue processing
  });
}

// Initialize membership cron jobs
if (process.env.NODE_ENV !== 'test') {
  const membershipCron = require('./utils/membershipCron');
  membershipCron.initialize();
}

// =============================================
// HEALTH CHECK
// =============================================
app.get('/api/health', async (req, res) => {
  const queueProcessor = require('./utils/queueProcessor');
  const redisService = require('./services/redisService');

  const queueStatus = queueProcessor.getStatus();
  const redisConnected = await redisService.ping().catch(() => false);
  res.json({
    success: true,
    data: {
      status: 'OK',
      message: 'Eternity Ticket API is running',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
      }
    },
    services: {
      redis: redisConnected ? 'connected' : 'disconnected',
      queue_processor: queueStatus.isRunning ? 'running' : 'stopped'
    }
  });
});

// Add pool health monitoring endpoint
app.get('/api/health/db-pool', async (req, res) => {
  try {
    const pool = require('./config/database');
    const stats = pool.getHealthStats();
    
    const isHealthy = stats.waitingCount === 0 && 
                      stats.utilizationPercent < 80;
    
    res.status(isHealthy ? 200 : 503).json({
      success: isHealthy,
      data: {
        status: isHealthy ? 'healthy' : 'degraded',
        pool: stats,
        warning: stats.utilizationPercent > 80 ? 
          'Pool utilization high - consider increasing max pool size' : null
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// =============================================
// API ROUTES
// =============================================
const API_PREFIX = process.env.API_PREFIX || '/api';

app.use(`${API_PREFIX}/auth`, require('./routes/authRoutes'));
app.use(`${API_PREFIX}/users`, require('./routes/userRoutes'));
app.use(`${API_PREFIX}/admin`, require('./routes/adminRoutes'));
app.use(`${API_PREFIX}/events`, require('./routes/eventRoutes'));
app.use(`${API_PREFIX}/event-sessions`, require('./routes/sessionTicketRoutes'));
app.use(`${API_PREFIX}/orders`, require('./routes/orderRoutes'));
app.use(`${API_PREFIX}/checkin`, require('./routes/checkinRoutes'));
app.use(`${API_PREFIX}/queue`, require('./routes/queueRoutes'));
app.use(`${API_PREFIX}/membership`, require('./routes/membershipRoutes'));
app.use(`${API_PREFIX}/notifications`, require('./routes/notificationRoutes'));

// =============================================
// ROOT ENDPOINT
// =============================================
app.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      message: 'Welcome to Eternity Ticket API',
      documentation: `${API_PREFIX}/health`,
      version: '1.0.0',
      endpoints: {
        health: 'GET /api/health',
        auth: {
          register: 'POST /api/auth/register',
          login: 'POST /api/auth/login',
          refresh: 'POST /api/auth/refresh-token'
        },
        events: {
          list: 'GET /api/events',
          detail: 'GET /api/events/:id',
          create: 'POST /api/events'
        }
      }
    }
  });
});

// =============================================
// 404 HANDLER
// =============================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Endpoint not found',
      path: req.originalUrl,
      method: req.method,
      timestamp: new Date().toISOString()
    }
  });
});

// =============================================
// GLOBAL ERROR HANDLER
// =============================================
app.use((err, req, res, next) => {
  console.error('Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
  
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal server error';
  let details = null;

  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token has expired';
  }

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    details = err.details || err.errors;
  }

  if (err.code === '23505') {
    statusCode = 409;
    message = 'Resource already exists';
    details = err.detail;
  }

  if (err.code === '23503') {
    statusCode = 400;
    message = 'Referenced resource does not exist';
  }

  if (err.code === '22P02') {
    statusCode = 400;
    message = 'Invalid data format';
  }

  if (err.code === '23502') {
    statusCode = 400;
    message = 'Required field is missing';
  }

  if (err.name === 'MulterError') {
    statusCode = 400;
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'File size exceeds limit';
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      message = 'Too many files';
    } else {
      message = 'File upload error';
    }
  }

  if (err.message === 'Not allowed by CORS') {
    statusCode = 403;
    message = 'CORS policy violation';
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(details && { details }),
      ...(process.env.NODE_ENV === 'development' && { 
        stack: err.stack,
        name: err.name,
        code: err.code
      }),
      timestamp: new Date().toISOString()
    }
  });
});

module.exports = app;