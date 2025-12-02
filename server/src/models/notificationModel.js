const pool = require('../config/database');

class NotificationModel {
  static async create(data) {
    try {
      const { 
        user_id, 
        type, 
        title, 
        content, 
        event_id = null, 
        order_id = null,
        data: notificationData = null 
      } = data;
      
      const query = `
        INSERT INTO notifications (
          user_id, type, title, content, event_id, order_id, data, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING *
      `;
      
      const result = await pool.query(query, [
        user_id,
        type,
        title,
        content,
        event_id,
        order_id,
        notificationData ? JSON.stringify(notificationData) : null
      ]);
      
      return result.rows[0];
      
    } catch (error) {
      console.error('Create notification error:', error);
      throw error;
    }
  }

  static async findByUser(userId, options = {}) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        unread_only = false 
      } = options;
      
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

      if (unread_only) {
        query += ` AND n.is_read = false`;
      }

      query += ` ORDER BY n.created_at DESC LIMIT $2 OFFSET $3`;
      params.push(limit, offset);

      const result = await pool.query(query, params);
      return result.rows;
      
    } catch (error) {
      console.error('Find notifications error:', error);
      throw error;
    }
  }

  static async markAsRead(notificationId, userId) {
    try {
      const result = await pool.query(`
        UPDATE notifications
        SET is_read = true, read_at = NOW()
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `, [notificationId, userId]);

      return result.rows[0] || null;
    } catch (error) {
      console.error('Mark as read error:', error);
      throw error;
    }
  }
    
  static async markAllAsRead(userId) {
    try {
      const result = await pool.query(`
        UPDATE notifications
        SET is_read = true, read_at = NOW()
        WHERE user_id = $1 AND is_read = false
        RETURNING *
      `, [userId]);

      return result.rowCount;
    } catch (error) {
      console.error('Mark all as read error:', error);
      throw error;
    }
  }

  static async delete(notificationId, userId) {
    try {
      const result = await pool.query(`
        DELETE FROM notifications
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `, [notificationId, userId]);

      return result.rows[0] || null;
    } catch (error) {
      console.error('Delete notification error:', error);
      throw error;
    }
  }

  static async getUnreadCount(userId) {
    try {
      const result = await pool.query(`
        SELECT COUNT(*) as unread_count
        FROM notifications
        WHERE user_id = $1 AND is_read = false
      `, [userId]);

      return parseInt(result.rows[0].unread_count) || 0;
    } catch (error) {
      console.error('Get unread count error:', error);
      throw error;
    }
  }

  static async notifyEventApproved(userId, eventId, eventTitle) {
    return await this.create({
      user_id: userId,
      type: 'system',
      title: 'Event Approved',
      content: `Your event "${eventTitle}" has been approved and is now live!`,
      event_id: eventId
    });
  }

 
  static async notifyEventRejected(userId, eventId, eventTitle, reason) {
    return await this.create({
      user_id: userId,
      type: 'system',
      title: 'Event Rejected',
      content: `Your event "${eventTitle}" was not approved. Reason: ${reason}`,
      event_id: eventId
    });
  }

  /**
   * Helper: Create refund completed notification
   */
  static async notifyRefundCompleted(userId, orderId, orderNumber, amount) {
    return await this.create({
      user_id: userId,
      type: 'refund_completed',
      title: 'Refund Completed',
      content: `Your refund for order ${orderNumber} has been completed. Amount: ${amount} VND`,
      order_id: orderId
    });
  }
}

module.exports = NotificationModel;