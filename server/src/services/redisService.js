// server/src/services/redisService.js
const redis = require('redis');

class RedisService {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  /**
   * Initialize Redis connection
   */
  async connect() {
    if (this.isConnected) {
      return this.client;
    }

    try {
      this.client = redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              console.error('Redis max retries reached');
              return new Error('Max retries reached');
            }
            return Math.min(retries * 100, 3000);
          }
        }
      });

      this.client.on('connect', () => {
        console.log('Redis connected');
        this.isConnected = true;
      });

      this.client.on('error', (err) => {
        console.error('❌ Redis error:', err);
        this.isConnected = false;
      });

      this.client.on('reconnecting', () => {
        console.log('Redis reconnecting...');
      });

      await this.client.connect();
      return this.client;

    } catch (error) {
      console.error('Redis connection failed:', error);
      throw error;
    }
  }

  /**
   * Get Redis client
   */
  getClient() {
    if (!this.isConnected) {
      // throw new Error('Redis not connected. Call connect() first.');
      console.warn('⚠️ Redis not connected - operations will be degraded');
      return null;
    }
    return this.client;
  }

/**
 * Check if Redis is ready (non-throwing)
 */
isReady() {
  return this.isConnected && this.client !== null;
}

/**
 * Safe execute Redis operation with fallback
 */
async safeExecute(operation, fallbackValue = null) {
  try {
    if (!this.isReady()) {
      console.warn('⚠️ Redis unavailable - using fallback');
      return fallbackValue;
    }
    return await operation(this.client);
  } catch (error) {
    console.error('Redis operation failed:', error);
    return fallbackValue;
  }
}

  /**
   * Check connection status
   */
  async ping() {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      return false;
    }
  }

  /**
   * Close connection
   */
  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
      console.log('🔌 Redis disconnected');
    }
  }
}

// Export singleton instance
module.exports = new RedisService();