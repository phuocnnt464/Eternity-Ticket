const redisService = require('../services/redisService');

class LockManager {
  constructor() {
    this.client = null;
  }

  async initialize() {
    if (!this.client) {
      this.client = await redisService.getClient();
      if (!this.client) {
        console.warn('Redis not available for lock manager');
        return false;
      }
    }
    return true;
  }

  async acquireLock(key, ttl = 10000) {
    const initialized = await this.initialize();
    
    if (!initialized || !this.client) {
      console.warn('Lock manager unavailable - proceeding without lock');
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


  async releaseLock(key, token) {
    const initialized = await this.initialize();

    if (!initialized || !this.client) {
      return;
    }
    
    if (token && token.startsWith('no-lock-')) {
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

  async extendLock(key, token, ttl = 10000) {
    const initialized = await this.initialize();
    
    if (!initialized || !this.client) {
      return false;
    }
    
    if (token && token.startsWith('no-lock-')) {
      return true; 
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

module.exports = new LockManager();