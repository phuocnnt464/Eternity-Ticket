// server/src/utils/queueProcessor.js
const QueueController = require('../controllers/queueController');
const QueueModel = require('../models/queueModel');
const pool = require('../config/database');

class QueueProcessor {
  constructor() {
    this.isRunning = false;
    this.interval = parseInt(process.env.QUEUE_PROCESSOR_INTERVAL) || 5000;
    this.intervalId = null;
    this.cleanupIntervalId = null;
  }

  /**
   * Initialize and start queue processor
   */
  async initialize() {
    if (this.isRunning) {
      console.log('Queue processor already running');
      return;
    }

    try {
      console.log('Initializing queue processor...');

      const redisService = require('../services/redisService');
      await redisService.connect();
      console.log('Redis connected for queue processing');

      this.start();
      this.startCleanupScheduler();
      this.setupGracefulShutdown();

      console.log('Queue processor initialized successfully');

    } catch (error) {
      console.error('Failed to initialize queue processor:', error);
      throw error;
    }
  }

  /**
   * Start queue processing loop
   */
  start() {
    if (this.isRunning) return;

    console.log(`🚀 Starting queue processor (interval: ${this.interval}ms)`);
    this.isRunning = true;

    this.processAllQueues().catch(err => {
      console.error('Initial queue processing failed:', err);
    });

    this.intervalId = setInterval(() => {
      this.processAllQueues().catch(err => {
        console.error('Queue processing error:', err);
      });
    }, this.interval);
  }

  /**
   * Stop queue processor
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }

    this.isRunning = false;
    console.log('Queue processor stopped');
  }

  /**
   * Process all active queues
   */
  async processAllQueues() {
    try {
      const result = await pool.query(`
        SELECT DISTINCT session_id
        FROM waiting_room_configs
        WHERE is_enabled = true
      `);

      const sessionIds = result.rows.map(r => r.session_id);

      if (sessionIds.length === 0) return;

      console.log(`🔄 Processing ${sessionIds.length} queues...`);

      for (const sessionId of sessionIds) {
        try {
          await QueueController.processQueue(sessionId);
        } catch (error) {
          console.error(`Error processing queue ${sessionId}:`, error.message);
        }
      }

    } catch (error) {
      console.error('Error in processAllQueues:', error);
    }
  }

  /**
   * Start cleanup scheduler
   */
  startCleanupScheduler() {
    console.log('🧹 Starting cleanup scheduler (interval: 1 minute)');

    this.cleanupIntervalId = setInterval(() => {
      this.cleanupExpired().catch(err => {
        console.error('Cleanup error:', err);
      });
    }, 60 * 1000);
  }

  /**
   * Cleanup expired sessions
   */
  async cleanupExpired() {
    try {
      console.log('Running cleanup...');
      
      const sessionIds = await QueueModel.cleanupExpiredSessions();

      // Cleanup Redis active users
      const redis = require('../services/redisService').getClient();

      // Get all session IDs có active users
      // const activeSessions = await redis.keys('active_set:*');
      
      let cursor = '0';
      let expiredActiveCount = 0;
      const processedSets = new Set();

      do {
        // SCAN với pattern 'active_set:*'
        const [newCursor, keys] = await redis.scan(cursor, {
          MATCH: 'active_set:*',
          COUNT: 10 // Process 10 keys per iteration
        });
        
        cursor = newCursor;
        
        for (const setKey of keys) {
          // Skip if already processed
          if (processedSets.has(setKey)) continue;
          processedSets.add(setKey);
          
          try {
            const sessionId = setKey.replace('active_set:', '');
            
            // Get all members trong SET
            const userIds = await redis.sMembers(setKey);
            
            // Check từng user có expired không
            for (const userId of userIds) {
              const activeKey = `active:${sessionId}:${userId}`;
              
              try {
                const data = await redis.get(activeKey);
                
                if (!data) {
                  // Key đã expired tự động, remove khỏi SET
                  await redis.sRem(setKey, userId);
                  expiredActiveCount++;
                } else {
                  const parsed = JSON.parse(data);
                  if (new Date(parsed.expires_at) < new Date()) {
                    await redis.del(activeKey);
                    await redis.sRem(setKey, userId);
                    expiredActiveCount++;
                  }
                }
              } catch (err) {
                console.error(`Error processing user ${userId}:`, err);
              }
            }
            
            // ✅ Xóa SET nếu rỗng
            const remaining = await redis.sCard(setKey);
            if (remaining === 0) {
              await redis.del(setKey);
              console.log(`🗑️ Removed empty set: ${setKey}`);
            }
            
          } catch (err) {
            console.error(`Error processing set ${setKey}:`, err);
          }
        }
      } while (cursor !== '0');
      
      if (expiredActiveCount > 0) {
        console.log(`Cleaned up ${expiredActiveCount} expired active users from Redis`);
      }
      
      for (const sessionId of sessionIds) {
        await QueueController.processQueue(sessionId);
      }

      if (sessionIds.length > 0) {
        console.log(`Cleanup complete: ${sessionIds.length} sessions affected`);
      }

    } catch (error) {
      console.error('Error in cleanupExpired:', error);
    }
  }

  /**
   * Setup graceful shutdown
   */
  setupGracefulShutdown() {
    const shutdown = async () => {
      console.log('\n Shutting down queue processor...');
      
      this.stop();
      
      const redisService = require('../services/redisService');
      await redisService.disconnect();
      
      console.log('Queue processor shutdown complete');
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }

  /**
   * Get processor status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      interval: this.interval,
      hasIntervalId: !!this.intervalId,
      hasCleanupId: !!this.cleanupIntervalId
    };
  }
}

module.exports = new QueueProcessor();