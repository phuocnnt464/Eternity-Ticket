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

  async initialize() {
    if (this.isRunning) {
      console.log('Queue processor already running');
      return;
    }

    try {
      console.log('Initializing queue processor...');

      const redisService = require('../services/redisService');

      if (!redisService.isReady()) {
        console.warn('Redis not ready - attempting to connect');
        try {
          await redisService.connect();
          console.log('Redis connected for queue processing');
        } catch (error) {
          console.error('Redis connection failed for queue processor');
          console.warn('Queue processor will not start - API will work with degraded features');
          return; 
        }
      } else {
        console.log('Using existing Redis connection for queue processing');
      }      

      this.start();
      this.startCleanupScheduler();
      this.setupGracefulShutdown();

      console.log('Queue processor initialized successfully');
    } catch (error) {
      console.error('Failed to initialize queue processor:', error);
    }
  }

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

  startCleanupScheduler() {
    console.log('Starting cleanup scheduler (interval: 1 minute)');

    this.cleanupIntervalId = setInterval(() => {
      this.cleanupExpired().catch(err => {
        console.error('Cleanup error:', err);
      });
    }, 60 * 1000);
  }

  async cleanupExpired() {
    try {
      console.log('Running cleanup...');
      
      const sessionIds = await QueueModel.cleanupExpiredSessions() || [];

      const redis = require('../services/redisService').getClient();

      if (!redis) {
        console.warn('Redis unavailable - skipping Redis cleanup');
        for (const sessionId of sessionIds) {
          await QueueController.processQueue(sessionId);
        }
        return;
      }

      let expiredActiveCount = 0;
      let expiredQueueCount = 0;
      let removedCounterKeys = 0;
      const processedSets = new Set();

      let cursor = '0';
      do {
        const {cursor: newCursor, keys} = await redis.scan(cursor, {
          MATCH: 'active_set:*',
          COUNT: 10
        });
        
        cursor = newCursor;
        
        for (const setKey of keys) {
          if (processedSets.has(setKey)) continue;
          processedSets.add(setKey);
          
          try {
            const sessionId = setKey.replace('active_set:', '');
 
            const userIds = await redis.sMembers(setKey);
            
            for (const userId of userIds) {
              const activeKey = `active:${sessionId}:${userId}`;
              
              try {
                const data = await redis.get(activeKey);
                
                if (!data) {
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
            
            const remaining = await redis.sCard(setKey);
            if (remaining === 0) {
              await redis.del(setKey);
              console.log(`Removed empty set: ${setKey}`);
            }
            
          } catch (err) {
            console.error(`Error processing set ${setKey}:`, err);
          }
        }
      } while (cursor !== '0');

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
              shouldDelete = true;
              console.log(`Queue for non-existent session: ${sessionId}`);
            } else {
              const session = sessionCheck.rows[0];
              const now = new Date();

              if (!session.end_time) {
                shouldDelete = false;
              } else {
                const endTime = new Date(session.end_time);
              
                if (!session.is_enabled || (endTime < now && (now - endTime) > 3600000)) {
                  shouldDelete = true;
                  console.log(`Expired session queue: ${sessionId}`);
                }
              }
            }
            
            if (shouldDelete) {
              const queueLength = await redis.lLen(queueKey);
              
              if (queueLength > 0) {
                await redis.del(queueKey);
                expiredQueueCount += queueLength;
                console.log(`Deleted queue: ${queueKey} (${queueLength} users)`);
              }
            }
            
          } catch (err) {
            console.error(`Error processing queue ${queueKey}:`, err);
          }
        }
      } while (cursor !== '0');

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
      
            const queueKey = `queue:${sessionId}`;
            const queueExists = await redis.exists(queueKey);
            
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

  setupGracefulShutdown() {
    const shutdown = async () => {
      console.log('\n Shutting down queue processor...');
      
      this.stop();
      
      const redisService = require('../services/redisService');
      await redisService.disconnect();
      
      console.log('Queue processor shutdown complete');
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }

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