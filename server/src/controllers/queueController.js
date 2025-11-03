// server/src/controllers/queueController.js
const QueueModel = require('../models/queueModel');
const { createResponse } = require('../utils/helpers');

class QueueController {
  /**
   * Join waiting room queue
   * POST /api/queue/join
   */
  static async joinQueue(req, res) {
    try {
      const { session_id } = req.body;
      const userId = req.user.id;
      const membershipTier = req.user.membership_tier || 'basic';

      console.log(`User ${userId} joining queue for session ${session_id}`);

      // Get config
      const config = await QueueModel.getWaitingRoomConfig(session_id);

      if (!config) {
        return res.json(createResponse(
          true,
          'No waiting room required',
          {
            can_purchase: true,
            queue_position: 0,
            waiting_room_enabled: false
          }
        ));
      }

      const { 
        max_capacity, 
        concurrent_purchase_limit, 
        queue_timeout_minutes,
        event_id 
      } = config;

      // Check if already in queue (DB)
      const existingStatus = await QueueModel.getUserQueueStatus(userId, session_id);

      if (existingStatus) {
        if (existingStatus.status === 'active') {
          const activeData = await QueueModel.getActiveUser(session_id, userId);
          
          if (activeData) {
            return res.json(createResponse(
              true,
              'You have an active purchase slot',
              {
                can_purchase: true,
                queue_position: 0,
                expires_at: activeData.expires_at,
                waiting_room_enabled: true
              }
            ));
          }
        } else if (existingStatus.status === 'waiting') {
          const position = await QueueModel.getRedisQueuePosition(session_id, userId);
          
          if (position) {
            const estimatedWait = Math.ceil(position * queue_timeout_minutes / concurrent_purchase_limit);
            
            return res.json(createResponse(
              true,
              `You are already in queue at position ${position}`,
              {
                can_purchase: false,
                queue_position: position,
                estimated_wait_minutes: estimatedWait,
                waiting_room_enabled: true
              }
            ));
          }
        }
      }

      // Check capacity
      const queueLength = await QueueModel.getRedisQueueLength(session_id);

      if (queueLength >= max_capacity) {
        return res.status(429).json(createResponse(
          false,
          'Waiting room is full. Please try again later.',
          {
            can_purchase: false,
            queue_position: null,
            max_capacity,
            current_capacity: queueLength
          }
        ));
      }

      // Calculate priority
      const priorityScore = QueueController.calculatePriorityScore(membershipTier);

      // Add to Redis queue (FIFO)
      const userData = {
        user_id: userId,
        joined_at: new Date().toISOString(),
        membership_tier: membershipTier,
        priority_score: priorityScore
      };

      await QueueModel.addToRedisQueue(session_id, userData);

      // Add to database
      const queueNumber = await QueueModel.getNextQueueNumber(session_id);

      await QueueModel.addToQueue({
        user_id: userId,
        event_id,
        session_id,
        queue_number,
        priority_score: priorityScore
      });

      // Try to activate immediately if slots available
      const activeCount = await QueueModel.getActiveUsersCount(session_id);

      if (activeCount < concurrent_purchase_limit) {
        await QueueController.processQueue(session_id);

        const activeData = await QueueModel.getActiveUser(session_id, userId);
        
        if (activeData) {
          return res.json(createResponse(
            true,
            'You can purchase now!',
            {
              can_purchase: true,
              queue_position: 0,
              expires_at: activeData.expires_at,
              waiting_room_enabled: true
            }
          ));
        }
      }

      // Return queue position
      const position = await QueueModel.getRedisQueuePosition(session_id, userId);
      const estimatedWait = Math.ceil(position * queue_timeout_minutes / concurrent_purchase_limit);

      res.json(createResponse(
        true,
        `You are in queue. Position: ${position}`,
        {
          can_purchase: false,
          queue_position: position,
          estimated_wait_minutes: estimatedWait,
          total_in_queue: queueLength + 1,
          waiting_room_enabled: true
        }
      ));

    } catch (error) {
      console.error('Join queue error:', error);
      res.status(500).json(createResponse(
        false,
        'Failed to join queue. Please try again.'
      ));
    }
  }

  /**
   * Get queue status
   * GET /api/queue/status/:sessionId
   */
  static async getStatus(req, res) {
    try {
      const { sessionId } = req.params;
      const userId = req.user.id;

      // Check if active in Redis
      const activeData = await QueueModel.getActiveUser(sessionId, userId);

      if (activeData) {
        return res.json(createResponse(
          true,
          'You have an active purchase slot',
          {
            in_queue: true,
            status: 'active',
            can_purchase: true,
            queue_position: 0,
            expires_at: activeData.expires_at,
            estimated_wait_minutes: 0
          }
        ));
      }

      // Check position in Redis queue
      const position = await QueueModel.getRedisQueuePosition(sessionId, userId);

      if (position) {
        const config = await QueueModel.getWaitingRoomConfig(sessionId);
        const estimatedWait = config 
          ? Math.ceil(position * config.queue_timeout_minutes / config.concurrent_purchase_limit)
          : 0;

        return res.json(createResponse(
          true,
          'You are in queue',
          {
            in_queue: true,
            status: 'waiting',
            can_purchase: false,
            queue_position: position,
            estimated_wait_minutes: estimatedWait
          }
        ));
      }

      // Check database for completed/expired
      const dbStatus = await QueueModel.getUserQueueStatus(userId, sessionId);

      if (dbStatus) {
        return res.json(createResponse(
          true,
          `Queue status: ${dbStatus.status}`,
          {
            in_queue: true,
            status: dbStatus.status,
            can_purchase: false,
            queue_position: null,
            estimated_wait_minutes: 0
          }
        ));
      }

      res.json(createResponse(
        true,
        'Not in queue',
        {
          in_queue: false,
          status: null,
          can_purchase: false,
          queue_position: null
        }
      ));

    } catch (error) {
      console.error('Get status error:', error);
      res.status(500).json(createResponse(
        false,
        'Failed to get queue status'
      ));
    }
  }

  /**
   * Heartbeat - keep alive
   * POST /api/queue/heartbeat
   */
  static async heartbeat(req, res) {
    try {
      const { session_id } = req.body;
      const userId = req.user.id;

      const success = await QueueModel.updateHeartbeat(userId, session_id);

      res.json(createResponse(
        success,
        success ? 'Heartbeat updated' : 'Not in active queue'
      ));

    } catch (error) {
      console.error('Heartbeat error:', error);
      res.status(500).json(createResponse(false, 'Heartbeat failed'));
    }
  }

  /**
   * Leave queue
   * DELETE /api/queue/leave/:sessionId
   */
  static async leaveQueue(req, res) {
    try {
      const { sessionId } = req.params;
      const userId = req.user.id;

      await QueueModel.leaveQueue(userId, sessionId);
      await QueueModel.removeActiveUser(sessionId, userId);
      await QueueController.processQueue(sessionId);

      res.json(createResponse(
        true,
        'Successfully left the queue'
      ));

    } catch (error) {
      console.error('Leave queue error:', error);
      res.status(500).json(createResponse(
        false,
        'Failed to leave queue'
      ));
    }
  }

  /**
   * Get statistics (Admin/Organizer)
   * GET /api/queue/statistics/:sessionId
   */
  static async getStatistics(req, res) {
    try {
      const { sessionId } = req.params;

      const config = await QueueModel.getWaitingRoomConfig(sessionId);

      if (!config) {
        return res.status(404).json(createResponse(
          false,
          'Waiting room not configured for this session'
        ));
      }

      const [dbStats, queueLength, activeCount] = await Promise.all([
        QueueModel.getQueueStatistics(sessionId),
        QueueModel.getRedisQueueLength(sessionId),
        QueueModel.getActiveUsersCount(sessionId)
      ]);

      res.json(createResponse(
        true,
        'Queue statistics retrieved',
        {
          waiting_room: {
            max_capacity: config.max_capacity,
            concurrent_purchase_limit: config.concurrent_purchase_limit,
            queue_timeout_minutes: config.queue_timeout_minutes
          },
          current: {
            waiting_count: queueLength,
            active_count: activeCount,
            available_slots: config.concurrent_purchase_limit - activeCount
          },
          statistics: {
            ...dbStats,
            capacity_utilization: Math.round((queueLength / config.max_capacity) * 100)
          }
        }
      ));

    } catch (error) {
      console.error('Get statistics error:', error);
      res.status(500).json(createResponse(
        false,
        'Failed to get statistics'
      ));
    }
  }

  /**
   * Process queue (Internal method)
   */
  static async processQueue(sessionId) {
    try {
      const config = await QueueModel.getWaitingRoomConfig(sessionId);
      
      if (!config) return;

      const { concurrent_purchase_limit, queue_timeout_minutes } = config;

      const activeCount = await QueueModel.getActiveUsersCount(sessionId);
      const slotsAvailable = concurrent_purchase_limit - activeCount;

      if (slotsAvailable <= 0) return;

      console.log(`🔄 Processing queue: ${slotsAvailable} slots available`);

      const users = await QueueModel.popFromRedisQueue(sessionId, slotsAvailable);

      for (const userData of users) {
        const expiresAt = new Date(Date.now() + queue_timeout_minutes * 60 * 1000);

        await QueueModel.activateUser(userData.user_id, sessionId, expiresAt);
        await QueueModel.setActiveUser(sessionId, userData.user_id, queue_timeout_minutes);

        console.log(`Activated user ${userData.user_id}`);
      }

    } catch (error) {
      console.error('Process queue error:', error);
    }
  }

  /**
   * Complete order (Called by OrderController)
   */
  static async completeOrder(userId, sessionId) {
    try {
      await QueueModel.completeOrder(userId, sessionId);
      await QueueModel.removeActiveUser(sessionId, userId);
      await QueueController.processQueue(sessionId);

      console.log(`Order completed for user ${userId}`);

    } catch (error) {
      console.error('Complete order error:', error);
    }
  }

  /**
   * Check if user can purchase
   */
  static async checkCanPurchase(userId, sessionId) {
    try {
      const config = await QueueModel.getWaitingRoomConfig(sessionId);

      if (!config) return true;

      const activeData = await QueueModel.getActiveUser(sessionId, userId);

      if (!activeData) return false;

      const expiresAt = new Date(activeData.expires_at);
      return expiresAt > new Date();

    } catch (error) {
      console.error('Check can purchase error:', error);
      return false;
    }
  }

  /**
   * Calculate priority score
   */
  static calculatePriorityScore(membershipTier) {
    switch (membershipTier) {
      case 'premium': return 100;
      case 'advanced': return 50;
      default: return 0;
    }
  }
}

module.exports = QueueController;