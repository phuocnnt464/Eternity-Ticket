require('dotenv').config();
const app = require('./src/app');
const pool = require('./src/config/database'); 

const PORT = process.env.PORT || 3000;

let server;

const startServer = async () => {
  try {
    await pool.query('SELECT NOW()');
    console.log('Database connected successfully');

    const redisService = require('./src/services/redisService');
    try {
      await redisService.connect();
      console.log('Redis connected successfully');
    } catch (redisError) {
      console.warn('⚠️ Redis connection failed - continuing with degraded mode');
      console.warn('⚠️ Queue features will be limited');
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
  console.log(`\n${signal} received, shutting down gracefully...`);
  
  if (server) {
    server.close(async () => {
      console.log('HTTP server closed');
      
      try {
        const redisService = require('./src/services/redisService');
        if (redisService.isConnected) {
          await redisService.disconnect();
          console.log('Redis disconnected');
        }
      } catch (error) {
        console.error('Error disconnecting Redis:', error.message);
      }

      // Close database connections
      try {
        await pool.end();
        console.log('Database connections closed');
      } catch (error) {
        console.error('Error closing database:', error.message);
      }
      
      process.exit(0);
    });

    setTimeout(() => {
      console.error('Forced shutdown after timeout');
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
  console.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

startServer();