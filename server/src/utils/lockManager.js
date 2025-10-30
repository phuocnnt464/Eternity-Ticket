// server/src/utils/lockManager.js
const redis = require('redis');

class LockManager {
  constructor() {
    this.client = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    
    this.client.on('error', (err) => console.error('Redis error:', err));
    this.client.connect().catch(console.error);
  }

  /**
   * Acquire distributed lock
   * @param {String} key - Lock key
   * @param {Number} ttl - Time to live in milliseconds
   * @returns {String|null} Lock token if acquired, null if failed
   */
  async acquireLock(key, ttl = 10000) {
    const lockKey = `lock:${key}`;
    const token = `${Date.now()}-${Math.random()}`;
    
    try {
      const result = await this.client.set(lockKey, token, {
        PX: ttl,
        NX: true
      });
      
      return result === 'OK' ? token : null;
    } catch (error) {
      console.error('Lock acquire error:', error);
      return null;
    }
  }

  /**
   * Release distributed lock
   * @param {String} key - Lock key
   * @param {String} token - Lock token
   */
  async releaseLock(key, token) {
    const lockKey = `lock:${key}`;
    
    try {
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;
      
      await this.client.eval(script, {
        keys: [lockKey],
        arguments: [token]
      });
    } catch (error) {
      console.error('Lock release error:', error);
    }
  }

  /**
   * Extend lock TTL
   * @param {String} key - Lock key
   * @param {String} token - Lock token
   * @param {Number} ttl - New TTL in milliseconds
   */
  async extendLock(key, token, ttl = 10000) {
    const lockKey = `lock:${key}`;
    
    try {
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("pexpire", KEYS[1], ARGV[2])
        else
          return 0
        end
      `;
      
      const result = await this.client.eval(script, {
        keys: [lockKey],
        arguments: [token, ttl.toString()]
      });
      
      return result === 1;
    } catch (error) {
      console.error('Lock extend error:', error);
      return false;
    }
  }
}

// Export singleton instance
module.exports = new LockManager();