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
      // await redisService.connect();
      // console.log('Redis connected for queue processing');

      if (!redisService.isReady()) {
        console.warn('⚠️ Redis not ready - attempting to connect');
        try {
          await redisService.connect();
          console.log('Redis connected for queue processing');
        } catch (error) {
          console.error('❌ Redis connection failed for queue processor');
          console.warn('⚠️ Queue processor will not start - API will work with degraded features');
          return; // ✅ Exit gracefully
        }
      } else {
        console.log('✅ Using existing Redis connection for queue processing');
      }      

      this.start();
      this.startCleanupScheduler();
      this.setupGracefulShutdown();

      console.log('Queue processor initialized successfully');

    } catch (error) {
      console.error('Failed to initialize queue processor:', error);
      // throw error;
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
      
      // CLEANUP POSTGRESQL
      const sessionIds = await QueueModel.cleanupExpiredSessions() || [];

      // Cleanup Redis active users
      const redis = require('../services/redisService').getClient();

      // Check null
      if (!redis) {
        console.warn('⚠️ Redis unavailable - skipping Redis cleanup');
        // Still process queues from DB
        for (const sessionId of sessionIds) {
          await QueueController.processQueue(sessionId);
        }
        return;
      }

      let expiredActiveCount = 0;
      let expiredQueueCount = 0;
      let removedCounterKeys = 0;
      const processedSets = new Set();

      // CLEANUP REDIS ACTIVE USERS 
      let cursor = '0';
      do {
        // SCAN với pattern 'active_set:*'
        const {cursor: newCursor, keys} = await redis.scan(cursor, {
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

      // ✅ 3. NEW: CLEANUP REDIS QUEUE LISTS (waiting users)
      cursor = '0';
      const processedQueues = new Set();
      
      do {
        const {cursor: newCursor, keys} = await redis.scan(cursor, {
          MATCH: 'queue:*',
          COUNT: 10
        });
        
        cursor = newCursor;
        
        for (const queueKey of keys) {
          if (processedQueues.has(queueKey)) continue;
          processedQueues.add(queueKey);
          
          try {
            const sessionId = queueKey.replace('queue:', '');
            
            // ✅ Check if session still exists and is active
            const sessionCheck = await pool.query(`
              SELECT 
                wrc.is_enabled,
                es.end_time,
                es.start_time
              FROM waiting_room_configs wrc
              JOIN event_sessions es ON wrc.session_id = es.id
              WHERE wrc.session_id = $1
            `, [sessionId]);
            
            let shouldDelete = false;
            
            if (sessionCheck.rows.length === 0) {
              // Session không tồn tại → delete
              shouldDelete = true;
              console.log(`📝 Queue for non-existent session: ${sessionId}`);
            } else {
              const session = sessionCheck.rows[0];
              const now = new Date();

              // CHECK NULL BEFORE USING
              if (!session.end_time) {
                // Event chưa kết thúc, không xóa
                shouldDelete = false;
              } else {
                const endTime = new Date(session.end_time);
              
              // Delete if:
              // - Waiting room disabled
              // - Session ended > 1 hour ago (grace period)
                if (!session.is_enabled || (endTime < now && (now - endTime) > 3600000)) {
                  shouldDelete = true;
                  console.log(`📝 Expired session queue: ${sessionId}`);
                }
              }
            }
            
            if (shouldDelete) {
              const queueLength = await redis.lLen(queueKey);
              
              if (queueLength > 0) {
                await redis.del(queueKey);
                expiredQueueCount += queueLength;
                console.log(`🗑️ Deleted queue: ${queueKey} (${queueLength} users)`);
              }
            }
            
          } catch (err) {
            console.error(`Error processing queue ${queueKey}:`, err);
          }
        }
      } while (cursor !== '0');

      // ✅ 4. NEW: CLEANUP REDIS QUEUE COUNTERS
      cursor = '0';
      const processedCounters = new Set();
      
      do {
        const {cursor: newCursor, keys} = await redis.scan(cursor, {
          MATCH: 'queue_counter:*',
          COUNT: 10
        });
        
        cursor = newCursor;
        
        for (const counterKey of keys) {
          if (processedCounters.has(counterKey)) continue;
          processedCounters.add(counterKey);
          
          try {
            const sessionId = counterKey.replace('queue_counter:', '');
            
            // Check if corresponding queue exists
            const queueKey = `queue:${sessionId}`;
            const queueExists = await redis.exists(queueKey);
            
            // Also check if session still active
            const sessionCheck = await pool.query(`
              SELECT 
                wrc.is_enabled,
                es.end_time
              FROM waiting_room_configs wrc
              JOIN event_sessions es ON wrc.session_id = es.id
              WHERE wrc.session_id = $1
            `, [sessionId]);
            
            let shouldDelete = false;
            
            if (!queueExists || sessionCheck.rows.length === 0) {
              shouldDelete = true;
            } else {
              const session = sessionCheck.rows[0];
              const now = new Date();
              if (!session.end_time) {
                // Event chưa kết thúc
                shouldDelete = false;
              } else {
                const endTime = new Date(session.end_time);
              
                if (!session.is_enabled || (endTime < now && (now - endTime) > 3600000)) {
                  shouldDelete = true;
                }
              }
            }
            
            if (shouldDelete) {
              await redis.del(counterKey);
              removedCounterKeys++;
              console.log(`🗑️ Deleted counter: ${counterKey}`);
            }
            
          } catch (err) {
            console.error(`Error processing counter ${counterKey}:`, err);
          }
        }
      } while (cursor !== '0');

      // Process remaining queues
      for (const sessionId of sessionIds) {
        await QueueController.processQueue(sessionId);
      }

      if (expiredActiveCount > 0) {
        console.log(`Cleaned up ${expiredActiveCount} expired active users from Redis`);
      }
      
      if (expiredQueueCount > 0) {
        console.log(`Cleaned up ${expiredQueueCount} expired queued users from Redis`);
      }

      if (removedCounterKeys > 0) {
        console.log(`Removed ${removedCounterKeys} obsolete queue counters from Redis`);
      }

      if (sessionIds.length > 0) {
        console.log(`Cleanup complete DB: ${sessionIds.length} sessions affected`);
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
      // process.exit(0);
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