// server/src/controllers/notificationController.js
const pool = require('../config/database');
const { createResponse } = require('../utils/helpers');

class NotificationController {
  /**
   * Get user notifications
   * GET /api/notifications
   */
  static async getNotifications(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20, unread_only = false } = req.query;
      const offset = (page - 1) * limit;

      let query = `
        SELECT 
          n.*,
          e.title as event_title,
          o.order_number
        FROM notifications n
        LEFT JOIN events e ON n.event_id = e.id
        LEFT JOIN orders o ON n.order_id = o.id
        WHERE n.user_id = $1
      `;

      const params = [userId];

      if (unread_only === 'true') {
        query += ` AND n.is_read = false`;
      }

      query += ` ORDER BY n.created_at DESC LIMIT $2 OFFSET $3`;
      params.push(limit, offset);

      const result = await pool.query(query, params);

      // Get unread count
      const countQuery = await pool.query(`
        SELECT COUNT(*) as unread_count
        FROM notifications
        WHERE user_id = $1 AND is_read = false
      `, [userId]);

      res.json(createResponse(
        true,
        'Notifications retrieved successfully',
        {
          notifications: result.rows,
          unread_count: parseInt(countQuery.rows[0].unread_count),
          page: parseInt(page),
          limit: parseInt(limit)
        }
      ));
    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(500).json(createResponse(false, 'Failed to get notifications'));
    }
  }

  /**
   * Mark notification as read
   * PUT /api/notifications/:notificationId/read
   */
  static async markAsRead(req, res) {
    try {
      const { notificationId } = req.params;
      const userId = req.user.id;

      await pool.query(`
        UPDATE notifications
        SET is_read = true, read_at = NOW()
        WHERE id = $1 AND user_id = $2
      `, [notificationId, userId]);

      if (result.rows.length === 0) {
        return res.status(404).json(
          createResponse(false, 'Notification not found')
        );
      }

      res.json(createResponse(true, 'Notification marked as read'));
    } catch (error) {
      console.error('Mark notification error:', error);
      res.status(500).json(createResponse(false, 'Failed to mark notification'));
    }
  }

  /**
   * Mark all as read
   * PUT /api/notifications/read-all
   */
  static async markAllAsRead(req, res) {
    try {
      const userId = req.user.id;

      await pool.query(`
        UPDATE notifications
        SET is_read = true, read_at = NOW()
        WHERE user_id = $1 AND is_read = false
      `, [userId]);

      res.json(createResponse(true, 
        'All notifications marked as read',
        `Marked ${result.rowCount} notifications as read`,
        { marked_count: result.rowCount }
      ));
    } catch (error) {
      console.error('Mark all notifications error:', error);
      res.status(500).json(createResponse(false, 'Failed to mark notifications'));
    }
  }

  /**
   * Delete notification
   * DELETE /api/notifications/:notificationId
   */
  static async deleteNotification(req, res) {
    try {
      const { notificationId } = req.params;
      const userId = req.user.id;

      await pool.query(`
        DELETE FROM notifications
        WHERE id = $1 AND user_id = $2
      `, [notificationId, userId]);

      if (result.rows.length === 0) {
        return res.status(404).json(
          createResponse(false, 'Notification not found')
        );
      }

      res.json(createResponse(true, 'Notification deleted'));
    } catch (error) {
      console.error('Delete notification error:', error);
      res.status(500).json(createResponse(false, 'Failed to delete notification'));
    }
  }

  /**
   * Get unread count
   * GET /api/notifications/unread-count
   */
  static async getUnreadCount(req, res) {
    try {
      const userId = req.user.id;

      const result = await pool.query(`
        SELECT COUNT(*) as unread_count
        FROM notifications
        WHERE user_id = $1 AND is_read = false
      `, [userId]);

      res.json(createResponse(
        true,
        'Unread count retrieved',
        { unread_count: parseInt(result.rows[0].unread_count) }
      ));
    } catch (error) {
      console.error('Get unread count error:', error);
      res.status(500).json(createResponse(false, 'Failed to get count'));
    }
  }
}

module.exports = NotificationController;