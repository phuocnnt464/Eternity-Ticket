// server/src/models/queueModel.js
const pool = require('../config/database');
const redisService = require('../services/redisService');

class QueueModel {
  /**
   * Get waiting room configuration
   */
  static async getWaitingRoomConfig(sessionId) {
    try {
      const query = `
        SELECT 
          wrc.*,
          es.title as session_title,
          es.start_time as session_start_time,
          e.id as event_id,
          e.title as event_title
        FROM waiting_room_configs wrc
        JOIN event_sessions es ON wrc.session_id = es.id
        JOIN events e ON wrc.event_id = e.id
        WHERE wrc.session_id = $1 AND wrc.is_enabled = true
      `;

      const result = await pool.query(query, [sessionId]);
      return result.rows.length > 0 ? result.rows[0] : null;

    } catch (error) {
      throw new Error(`Failed to get waiting room config: ${error.message}`);
    }
  }

  /**
   * Create waiting room config
   */
  static async createWaitingRoomConfig(configData) {
    try {
      const {
        event_id,
        session_id,
        max_capacity = 1000,
        queue_timeout_minutes = 15,
        concurrent_purchase_limit = 100
      } = configData;

      const query = `
        INSERT INTO waiting_room_configs (
          event_id, session_id, max_capacity,
          queue_timeout_minutes, concurrent_purchase_limit, is_enabled
        ) VALUES ($1, $2, $3, $4, $5, true)
        RETURNING *
      `;

      const result = await pool.query(query, [
        event_id,
        session_id,
        max_capacity,
        queue_timeout_minutes,
        concurrent_purchase_limit
      ]);

      return result.rows[0];

    } catch (error) {
      throw new Error(`Failed to create waiting room config: ${error.message}`);
    }
  }

  /**
   * Add user to waiting queue (database)
   */
  static async addToQueue(queueData) {
    try {
      const {
        user_id,
        event_id,
        session_id,
        queue_number,
        priority_score = 0,
        ip_address = null
      } = queueData;

      const query = `
        INSERT INTO waiting_queue (
          user_id, event_id, session_id, queue_number,
          status, priority_score, ip_address, entered_at
        ) VALUES ($1, $2, $3, $4, 'waiting', $5, $6, NOW())
        ON CONFLICT (event_id, session_id, queue_number)
        DO UPDATE SET 
          user_id = EXCLUDED.user_id,
          entered_at = NOW(),
          status = 'waiting'
        RETURNING *
      `;

      const result = await pool.query(query, [
        user_id,
        event_id,
        session_id,
        queue_number,
        priority_score,
        ip_address
      ]);

      return result.rows[0];

    } catch (error) {
      throw new Error(`Failed to add to queue: ${error.message}`);
    }
  }

  /**
   * Get next queue number
   */
  static async getNextQueueNumber(sessionId) {
    // const client = await pool.connect();
    try {
      // await client.query('BEGIN');
      // const query = `
      //   SELECT COALESCE(MAX(queue_number), 0) + 1 as next_number
      //   FROM waiting_queue
      //   WHERE session_id = $1
      //   FOR UPDATE
      // `;

      // const result = await client.query(query, [sessionId]);
      // const nextNumber = result.rows[0].next_number;

      // await client.query('COMMIT');

      const redis = redisService.getClient();
      // ✅ Check null
      if (!redis) {
        throw new Error('Redis unavailable - cannot get next queue number');
      }

      const counterKey = `queue_counter:${sessionId}`;
      
      // ✅ Atomic increment
      const nextNumber = await redis.incr(counterKey);
      
      // Set TTL 24 hours nếu chưa có
      const ttl = await redis.ttl(counterKey);
      if (ttl === -1) {
        await redis.expire(counterKey, 86400);
      }

      return nextNumber;
    } catch (error) {
      // await client.query('ROLLBACK');
      // throw new Error(`Failed to get next queue number: ${error.message}`);
      console.error('Failed to get next queue number:', error);
      return null;
    } 
    // finally {
    //   client.release();
    // }
  }

  /**
   * Activate user for purchase
   */
  static async activateUser(userId, sessionId, expiresAt) {
    try {
      const query = `
        UPDATE waiting_queue
        SET status = 'active',
            activated_at = NOW(),
            expires_at = $3,
            last_heartbeat = NOW()
        WHERE user_id = $1 
          AND session_id = $2 
          AND status = 'waiting'
        RETURNING *
      `;

      const result = await pool.query(query, [userId, sessionId, expiresAt]);
      
      if (result.rows.length === 0) {
        throw new Error('User not found in queue or already active');
      }

      return result.rows[0];

    } catch (error) {
      throw new Error(`Failed to activate user: ${error.message}`);
    }
  }

  /**
   * Mark order as completed
   */
  static async completeOrder(userId, sessionId) {
    try {
      const query = `
        UPDATE waiting_queue
        SET status = 'completed',
            completed_at = NOW()
        WHERE user_id = $1 
          AND session_id = $2 
          AND status = 'active'
        RETURNING *
      `;

      const result = await pool.query(query, [userId, sessionId]);
      return result.rows[0] || null;

    } catch (error) {
      throw new Error(`Failed to complete order: ${error.message}`);
    }
  }

  /**
   * Get user's queue status from database
   */
  static async getUserQueueStatus(userId, sessionId) {
    try {
      const query = `
        SELECT 
          wq.*,
          wrc.queue_timeout_minutes
        FROM waiting_queue wq
        LEFT JOIN waiting_room_configs wrc ON wq.session_id = wrc.session_id
        WHERE wq.user_id = $1 
          AND wq.session_id = $2
        ORDER BY wq.entered_at DESC
        LIMIT 1
      `;

      const result = await pool.query(query, [userId, sessionId]);
      return result.rows[0] || null;

    } catch (error) {
      throw new Error(`Failed to get user queue status: ${error.message}`);
    }
  }

  /**
   * Cleanup expired sessions
   */
  static async cleanupExpiredSessions() {
    try {
      const query = `
        UPDATE waiting_queue
        SET status = 'expired'
        WHERE status = 'active' 
          AND expires_at < NOW()
          AND completed_at IS NULL
        RETURNING session_id
      `;

      const result = await pool.query(query);
      const sessionIds = [...new Set(result.rows.map(r => r.session_id))];

      console.log(`🧹 Cleaned up ${result.rowCount} expired sessions`);
      return sessionIds;

    } catch (error) {
      throw new Error(`Failed to cleanup expired sessions: ${error.message}`);
    }
  }

  /**
   * Update heartbeat timestamp
   */
  static async updateHeartbeat(userId, sessionId) {
    try {
      const query = `
        UPDATE waiting_queue
        SET last_heartbeat = NOW()
        WHERE user_id = $1 
          AND session_id = $2 
          AND status = 'active'
      `;

      const result = await pool.query(query, [userId, sessionId]);
      return result.rowCount > 0;

    } catch (error) {
      throw new Error(`Failed to update heartbeat: ${error.message}`);
    }
  }

  /**
   * Leave queue (cancel)
   */
  static async leaveQueue(userId, sessionId) {
    try {
      const query = `
        UPDATE waiting_queue
        SET status = 'cancelled',
            completed_at = NOW()
        WHERE user_id = $1 
          AND session_id = $2 
          AND status IN ('waiting', 'active')
      `;

      const result = await pool.query(query, [userId, sessionId]);
      return result.rowCount > 0;

    } catch (error) {
      throw new Error(`Failed to leave queue: ${error.message}`);
    }
  }

  /**
   * Get queue statistics
   */
  static async getQueueStatistics(sessionId) {
    try {
      const query = `
        SELECT 
          COUNT(*) FILTER (WHERE status = 'waiting') as waiting_count,
          COUNT(*) FILTER (WHERE status = 'active') as active_count,
          COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
          COUNT(*) FILTER (WHERE status = 'expired') as expired_count,
          AVG(EXTRACT(EPOCH FROM (activated_at - entered_at)) / 60) 
            FILTER (WHERE status = 'active' OR status = 'completed') as avg_wait_minutes
        FROM waiting_queue
        WHERE session_id = $1
          AND entered_at >= NOW() - INTERVAL '24 hours'
      `;

      const result = await pool.query(query, [sessionId]);
      return result.rows[0];

    } catch (error) {
      throw new Error(`Failed to get queue statistics: ${error.message}`);
    }
  }

  // =============================================
  // REDIS OPERATIONS
  // =============================================

  /**
   * Add to Redis queue (FIFO)
   */
  static async addToRedisQueue(sessionId, userData) {
    try {
      const redis = redisService.getClient();

      // ✅ Graceful degradation
      if (!redis) {
        console.warn('⚠️ Redis unavailable - queue operations degraded');
        // Có thể lưu vào database thay thế
        return 0;
      }
    
      const queueKey = `queue:${sessionId}`;
      const queueData = JSON.stringify(userData);

      const length = await redis.rPush(queueKey, queueData);

      // ✅ Set TTL 2 giờ cho queue key (nếu chưa có TTL)
      const ttl = await redis.ttl(queueKey);
      if (ttl === -1) { // -1 = key tồn tại nhưng không có TTL
        await redis.expire(queueKey, 2 * 60 * 60); // 2 hours
      }

      return length;

    } catch (error) {
      // throw new Error(`Failed to add to Redis queue: ${error.message}`);
      console.error('Failed to add to Redis queue:', error);
      return 0; // Graceful fallback
    }
  }

  /**
   * Get Redis queue length
   */
  static async getRedisQueueLength(sessionId) {
    try {
      const redis = redisService.getClient();

      // ✅ Check null
      if (!redis) {
        console.warn('⚠️ Redis unavailable - returning 0 for queue length');
        return 0;
      }
    
      const queueKey = `queue:${sessionId}`;
      
      return await redis.lLen(queueKey);

    } catch (error) {
      // throw new Error(`Failed to get queue length: ${error.message}`);
      console.error('Failed to get Redis queue length:', error);
      return 0; // Graceful fallback
    }
  }

  /**
   * Get user position in Redis queue
   */
  static async getRedisQueuePosition(sessionId, userId) {
    try {
      const redis = redisService.getClient();

      // ✅ Check null
      if (!redis) {
        console.warn('⚠️ Redis unavailable - cannot get queue position');
        return null;
      }
      const queueKey = `queue:${sessionId}`;
      const queueData = await redis.lRange(queueKey, 0, -1);

      for (let i = 0; i < queueData.length; i++) {
        const data = JSON.parse(queueData[i]);
        if (data.user_id === userId) {
          return i + 1; // 1-indexed position
        }
      }

      return null;

    } catch (error) {
      // throw new Error(`Failed to get queue position: ${error.message}`);
      console.error('Failed to get Redis queue position:', error);
      return null;
    }
  }

  /**
   * Pop users from Redis queue (FIFO)
   */
  static async popFromRedisQueue(sessionId, count) {
    try {
      const redis = redisService.getClient();

      // ✅ Check null
      if (!redis) {
        console.warn('⚠️ Redis unavailable - cannot pop from queue');
        return [];
      }

      const queueKey = `queue:${sessionId}`;
      const users = [];

      for (let i = 0; i < count; i++) {
        const data = await redis.lPop(queueKey);
        if (!data) break;
        users.push(JSON.parse(data));
      }

      return users;

    } catch (error) {
      // throw new Error(`Failed to pop from queue: ${error.message}`);
      console.error('Failed to pop from Redis queue:', error);
      return [];
    }
  }

  /**
   * Set active user in Redis
   */
  static async setActiveUser(sessionId, userId, timeoutMinutes) {
    try {
      const redis = redisService.getClient();

      // ✅ Check null
      if (!redis) {
        console.warn('⚠️ Redis unavailable - cannot set active user');
        return false;
      }

      const activeSetKey = `active_set:${sessionId}`;
      const activeKey = `active:${sessionId}:${userId}`;
      const expiresAt = new Date(Date.now() + timeoutMinutes * 60 * 1000);

      const data = JSON.stringify({
        activated_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString()
      });

      // await redis.setEx(activeKey, timeoutMinutes * 60, data);

      // Pipeline to atomic operations
      const pipeline = redis.multi();
      pipeline.setEx(activeKey, timeoutMinutes * 60, data);
      pipeline.sAdd(activeSetKey, userId);  // Add to SET
      pipeline.expire(activeSetKey, timeoutMinutes * 60 + 60); // Buffer 1 min
      await pipeline.exec();

      return true;

    } catch (error) {
      // throw new Error(`Failed to set active user: ${error.message}`);
      console.error('Failed to set active user in Redis:', error);
      return false;
    }
  }

  /**
   * Check if user is active in Redis
   */
  static async getActiveUser(sessionId, userId) {
    try {
      const redis = redisService.getClient();

      // ✅ Check null
      if (!redis) {
        console.warn('⚠️ Redis unavailable - cannot get active user');
        return null;
      }
      const activeKey = `active:${sessionId}:${userId}`;
      const data = await redis.get(activeKey);

      if (!data) return null;

      return JSON.parse(data);

    } catch (error) {
      // throw new Error(`Failed to get active user: ${error.message}`);
      console.error('Failed to get active user in Redis:', error);
      return null;
    }
  }

  /**
   * Remove active user from Redis
   */
  static async removeActiveUser(sessionId, userId) {
    try {
      const redis = redisService.getClient();

      // ✅ Check null
      if (!redis) {
        console.warn('⚠️ Redis unavailable - cannot remove active user');
        return false;
      }

      const activeKey = `active:${sessionId}:${userId}`;
      const activeSetKey = `active_set:${sessionId}`;
      
      // await redis.del(activeKey);
      // Atomic remove from both
      const pipeline = redis.multi();
      pipeline.del(activeKey);
      pipeline.sRem(activeSetKey, userId);  // Remove from SET
      await pipeline.exec();
      return true;

    } catch (error) {
      // throw new Error(`Failed to remove active user: ${error.message}`);
      console.error('Failed to remove active user in Redis:', error);
      return false;
    }
  }

  /**
   * Get active users count
   */
  static async getActiveUsersCount(sessionId) {
    try {
      const redis = redisService.getClient();
      // const pattern = `active:${sessionId}:*`;
      // const keys = await redis.keys(pattern);
      
      // return keys.length;

      // ✅ Handle Redis unavailable
      if (!redis) {
        console.warn('⚠️ Redis unavailable - returning 0 for active count');
        // Có thể query từ database như fallback
        return 0;
      }
      const activeSetKey = `active_set:${sessionId}`;
    
      // O(1) operation instead of O(N) scan
      return await redis.sCard(activeSetKey);

    } catch (error) {
      // throw new Error(`Failed to get active users count: ${error.message}`);
      console.error('Failed to get active users count:', error);
      return 0; // Graceful fallback
    }
  }
}

module.exports = QueueModel;