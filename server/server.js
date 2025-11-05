// server.js
require('dotenv').config();
const app = require('./src/app');
const pool = require('./src/config/database'); 

const PORT = process.env.PORT || 3000;

let server;

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connected successfully');

    // Initialize Redis BEFORE starting server
    const redisService = require('./src/services/redisService');
    try {
      await redisService.connect();
      console.log('✅ Redis connected successfully');
    } catch (redisError) {
      console.warn('⚠️ Redis connection failed - continuing with degraded mode');
      console.warn('⚠️ Queue features will be limited');
      // ✅ DON'T exit - let app run
    }
    server = app.listen(PORT, () => {
      console.log(`🚀 Eternity Ticket Server is running on port ${PORT}`);
      console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 Server URL: http://localhost:${PORT}`);
      console.log(`🔍 Health Check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 ${signal} received, shutting down gracefully...`);
  
  if (server) {
    server.close(async () => {
      console.log('✅ HTTP server closed');
      
      // Close database connections
      try {
        await pool.end();
        console.log('✅ Database connections closed');
      } catch (error) {
        console.error('❌ Error closing database:', error.message);
      }
      
      process.exit(0);
    });

    // Force shutdown after 60 seconds
    setTimeout(() => {
      console.error('⚠️ Forced shutdown after timeout');
      process.exit(1);
    }, 60000);
  } else {
    process.exit(0);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Start the server
startServer();