const redis = require('redis');

class RedisService {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

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
        console.error('Redis error:', err);
        this.isConnected = false;
      });

      this.client.on('reconnecting', () => {
        console.log('Redis reconnecting');
        this.isConnected = false;
      });

      this.client.on('end', () => {
        console.log('Redis connection closed');
        this.isConnected = false;
      });

      await this.client.connect();
      return this.client;

    } catch (error) {
      console.error('Redis connection failed:', error);
      throw error;
    }
  }

  getClient() {
    if (!this.isConnected) {
      console.warn('Redis not connected - operations will be degraded');
      return null;
    }
    return this.client;
  }


  isReady() {
    return this.isConnected && this.client !== null;
  }

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

  async ping() {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      return false;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
      console.log('Redis disconnected');
    }
  }
}

module.exports = new RedisService();