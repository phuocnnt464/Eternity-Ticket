// server/src/utils/lockManager.js
const redisService = require('../services/redisService');

class LockManager {
  constructor() {
    this.client = null;
  }

  async initialize() {
    if (!this.client) {
      this.client = await redisService.getClient();
        // ✅ CHECK IF CLIENT IS NULL
      if (!this.client) {
        console.warn('⚠️ Redis not available for lock manager');
        return false; // Signal that initialization failed
      }
    }
    return true;
  }

  /**
   * Acquire distributed lock
   * @param {String} key - Lock key
   * @param {Number} ttl - Time to live in milliseconds
   * @returns {String|null} Lock token if acquired, null if failed
   */
  async acquireLock(key, ttl = 10000) {
    const initialized = await this.initialize();
    
    // ✅ GRACEFUL DEGRADATION
    if (!initialized || !this.client) {
      console.warn('⚠️ Lock manager unavailable - proceeding without lock');
      // Return a fake token to allow operation to continue
      // This is acceptable because database FOR UPDATE locks will protect data
      return `no-lock-${Date.now()}-${Math.random()}`;
    }

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
    const initialized = await this.initialize();
    
    // ✅ GRACEFUL DEGRADATION
    if (!initialized || !this.client) {
      // No-op if lock manager not available
      return;
    }
    
    // ✅ CHECK FOR FAKE TOKEN
    if (token && token.startsWith('no-lock-')) {
      // This was a fake token, no need to release
      return;
    }

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
    const initialized = await this.initialize();
    
    // ✅ GRACEFUL DEGRADATION
    if (!initialized || !this.client) {
      return false;
    }
    
    // ✅ CHECK FOR FAKE TOKEN
    if (token && token.startsWith('no-lock-')) {
      return true; // Pretend it worked
    }
    
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