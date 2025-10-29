// src/controllers/adminController.js
const pool = require('../config/database');
const UserModel = require('../models/userModel');
const EventModel = require('../models/eventModel');
const { createResponse } = require('../utils/helpers');

// ===============================
// DASHBOARD & USER MANAGEMENT
// ===============================

class AdminController {

  // Get dashboard statistics
  static async getDashboardStats(req, res) {
    try {
        // Get user counts by role
        const userCounts = await UserModel.getUserCountByRole();
        
        // Get recent users
        const recentUsers = await UserModel.getRecentUsers(7, 5);
        
        // Get total events, orders, tickets
        const statsQuery = `
        SELECT 
            -- Event stats
            (SELECT COUNT(*) FROM events WHERE status = 'active') as active_events,
            (SELECT COUNT(*) FROM events WHERE status = 'pending') as pending_events,
            (SELECT COUNT(*) FROM events) as total_events,

            -- Order stats
            (SELECT COUNT(*) FROM orders WHERE status = 'paid') as paid_orders,
            (SELECT COUNT(*) FROM orders WHERE status = 'pending') as pending_orders,
            (SELECT COUNT(*) FROM orders) as total_orders,

            -- Ticket stats
            (SELECT COUNT(*) FROM tickets) as total_tickets,
            (SELECT COUNT(*) FROM tickets WHERE is_checked_in = true) as checked_in_tickets,

            -- Revenue stats
            (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE status = 'paid') as total_revenue,
            (SELECT COALESCE(AVG(total_amount), 0) FROM orders WHERE status = 'paid') as avg_order_value,

            -- Refund stats
            (SELECT COUNT(*) FROM refund_requests WHERE status = 'pending') as pending_refunds,
        
            -- User stats
            (SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '7 days') as new_users_7d,
            (SELECT COUNT(*) FROM users WHERE is_active = true) as active_users
        `;
        
        const statsResult = await pool.query(statsQuery);
        const stats = statsResult.rows[0];
        
        res.json(createResponse(
        true,
        'Dashboard statistics retrieved successfully',
        {
            users: {
            by_role: userCounts,
            recent: recentUsers,
            active: parseInt(stats.active_users),
            new_last_7_days: parseInt(stats.new_users_7d)
            },
            events: {
            active: parseInt(stats.active_events),
            pending: parseInt(stats.pending_events),
            total: parseInt(stats.total_events)
            },
            orders: {
            paid: parseInt(stats.paid_orders),
            pending: parseInt(stats.pending_orders),
            total: parseInt(stats.total_orders)
            },
            tickets: {
            total: parseInt(stats.total_tickets),
            checked_in: parseInt(stats.checked_in_tickets),
            checkin_rate: stats.total_tickets > 0
                ? Math.round((stats.checked_in_tickets / stats.total_tickets) * 100) 
                : 0
            },
            revenue: {
            total: parseFloat(stats.total_revenue),
            average_order: parseFloat(stats.avg_order_value)
            }, 
            refunds: {
            pending: parseInt(stats.pending_refunds)
            }
        }
        ));
        
    } catch (error) {
        console.error('❌ Dashboard stats error:', error);
        res.status(500).json(createResponse(false, 'Failed to retrieve statistics'));
    }
  }

  // Search users
  static async searchUsers(req, res) {
    try {
        const { q, limit = 10 } = req.query;
        
        if (!q || q.trim().length < 2) {
        return res.status(400).json({
            success: false,
            error: { message: 'Search term must be at least 2 characters' }
        });
        }

        const users = await UserModel.searchUsers(q, parseInt(limit));
        
        res.json(createResponse(
        true,
        'Search results retrieved successfully',
        { users, count: users.length }
        ));
        
    } catch (error) {
        console.error('❌ Search users error:', error);
        res.status(500).json(createResponse(false, 'Search failed'));
    }
  }

  // Update user role
  static async updateUserRole(req, res) {
    try {
      const { userId } = req.params;
      const { role } = req.body;
      
      if (!role) {
        return res.status(400).json({
          success: false,
          error: { message: 'Role is required' }
        });
      }
      
      const updatedUser = await UserModel.updateUserRole(userId, role);
      
      res.json(createResponse(
        true,
        'User role updated successfully',
        { user: updatedUser }
      ));
      
    } catch (error) {
      console.error('❌ Update user role error:', error);

      let statusCode = 500;
      let message = 'Failed to update user role';
      
      if (error.message === 'Invalid role') {
        statusCode = 400;
        message = error.message;
      } else if (error.message === 'User not found') {
        statusCode = 404;
        message = error.message;
      }
      
      res.status(statusCode).json(createResponse(false, message));
    }
  }

  // Reactivate account
  static async reactivateAccount(req, res) {
    try {
      const { userId } = req.params;
      
      const success = await UserModel.reactivateAccount(userId);
      
      if (!success) {
        return res.status(404).json(
          createResponse(false, 'User not found')
        );
      }
      
      res.json(createResponse(
        true,
        'User account reactivated successfully'
      ));
      
    } catch (error) {
      console.error('❌ Reactivate account error:', error);
      res.status(500).json(createResponse(false, 'Failed to reactivate account'));
    }
  }

  // ===============================
  // EVENT MANAGEMENT
  // ===============================

  static async getAllEvents(req, res) {
    try {
      const { page = 1, limit = 20, status } = req.query;
      
      const filters = status ? { status } : {};
      const result = await EventModel.findMany(filters, { 
        page: parseInt(page), 
        limit: parseInt(limit)
      });
      
      res.json(createResponse(
        true,
        'Events retrieved successfully',
        result
      ));
    } catch (error) {
      console.error('❌ Admin get events error:', error);
      res.status(500).json(createResponse(false, 'Failed to retrieve events'));
    }
  }

  // ===============================
  // ORDERS & REFUNDS
  // ===============================

  static async getAllOrders(req, res) {
    try {
      const { page = 1, limit = 20, status, user_id, event_id } = req.query;
      
      let whereConditions = [];
      let params = [];
      let paramIndex = 1;
      
      if (status) {
        whereConditions.push(`o.status = $${paramIndex}`);
        params.push(status);
        paramIndex++;
      }
      
      if (user_id) {
        whereConditions.push(`o.user_id = $${paramIndex}`);
        params.push(user_id);
        paramIndex++;
      }
      
      if (event_id) {
        whereConditions.push(`o.event_id = $${paramIndex}`);
        params.push(event_id);
        paramIndex++;
      }
      
      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}` 
        : '';
      
      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      const query = `
        SELECT 
          o.*,
          u.first_name || ' ' || u.last_name as customer_name,
          u.email as customer_email,
          e.title as event_title,
          COUNT(t.id) as ticket_count
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        LEFT JOIN events e ON o.event_id = e.id
        LEFT JOIN tickets t ON o.id = t.order_id
        ${whereClause}
        GROUP BY o.id, u.first_name, u.last_name, u.email, e.title
        ORDER BY o.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      const countQuery = `
        SELECT COUNT(*) as total FROM orders o ${whereClause}
      `;
      
      params.push(parseInt(limit), offset);
      const countParams = params.slice(0, -2);
      
      const [ordersResult, countResult] = await Promise.all([
        pool.query(query, params),
        pool.query(countQuery, countParams)
      ]);
      
      const totalCount = parseInt(countResult.rows[0].total);
      
      res.json(createResponse(
        true,
        'Orders retrieved successfully',
        {
          orders: ordersResult.rows.map(o => ({
            ...o,
            subtotal: parseFloat(o.subtotal),
            total_amount: parseFloat(o.total_amount),
            ticket_count: parseInt(o.ticket_count)
          })),
          pagination: {
            current_page: parseInt(page),
            total_pages: Math.ceil(totalCount / limit),
            total_count: totalCount,
            per_page: parseInt(limit)
          }
        }
      ));
    } catch (error) {
      console.error('❌ Admin get orders error:', error);
      res.status(500).json(createResponse(false, 'Failed to retrieve orders'));
    }
  }
  
  static async getOrderDetails(req, res) {
    try {
      const { orderId } = req.params;
      const OrderModel = require('../models/orderModel');
      
      const order = await OrderModel.findById(orderId);
      
      if (!order) {
        return res.status(404).json(
          createResponse(false, 'Order not found')
        );
      }
      
      res.json(createResponse(
        true,
        'Order details retrieved successfully',
        { order }
      ));
    } catch (error) {
      console.error('❌ Admin get order error:', error);
      res.status(500).json(createResponse(false, 'Failed to retrieve order'));
    }
  }

  // ===============================
  // SETTINGS & LOGS
  // ===============================

  static async getSettings(req, res) {
    try {
        const query = `
        SELECT 
            setting_key, 
            setting_value, 
            description, 
            is_public,
            updated_at
        FROM system_settings
        ORDER BY setting_key
        `;
        
        const result = await pool.query(query);
        
        res.json(createResponse(
        true,
        'System settings retrieved successfully',
        { settings: result.rows }
        ));
    } catch (error) {
        console.error('❌ Get settings error:', error);
        res.status(500).json(createResponse(false, 'Failed to retrieve settings'));
    }
  }

  static async updateSetting(req, res) {
    try {
      const { key } = req.params;
      const { value } = req.body;
      const adminId = req.user.id;
      
      if (value === undefined) {
        return res.status(400).json(
          createResponse(false, 'Setting value is required')
        );
      }
      
      const query = `
        UPDATE system_settings
        SET setting_value = $1,
            updated_by = $2,
            updated_at = NOW()
        WHERE setting_key = $3
        RETURNING *
      `;
      
      const result = await pool.query(query, [value, adminId, key]);
      
      if (result.rows.length === 0) {
        return res.status(404).json(
          createResponse(false, 'Setting not found')
        );
      }
      
      res.json(createResponse(
        true,
        'Setting updated successfully',
        { setting: result.rows[0] }
      ));
    } catch (error) {
      console.error('❌ Update setting error:', error);
      res.status(500).json(createResponse(false, 'Failed to update setting'));
    }
  }

  static async getPendingRefunds(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      const query = `
        SELECT 
          r.*,
          o.order_number,
          u.first_name || ' ' || u.last_name as customer_name,
          u.email as customer_email,
          e.title as event_title
        FROM refund_requests r
        JOIN orders o ON r.order_id = o.id
        JOIN users u ON r.user_id = u.id
        JOIN events e ON o.event_id = e.id
        WHERE r.status = 'pending'
        ORDER BY r.created_at ASC
        LIMIT $1 OFFSET $2
      `;
      
      const countQuery = `
        SELECT COUNT(*) as total 
        FROM refund_requests 
        WHERE status = 'pending'
      `;
      
      const [refundsResult, countResult] = await Promise.all([
        pool.query(query, [parseInt(limit), offset]),
        pool.query(countQuery)
      ]);
      
      const totalCount = parseInt(countResult.rows[0].total);
      
      res.json(createResponse(
        true,
        'Pending refunds retrieved successfully',
        {
          refunds: refundsResult.rows.map(r => ({
            ...r,
            refund_amount: parseFloat(r.refund_amount)
          })),
          pagination: {
            current_page: parseInt(page),
            total_pages: Math.ceil(totalCount / limit),
            total_count: totalCount,
            per_page: parseInt(limit)
          }
        }
      ));
    } catch (error) {
      console.error('❌ Get pending refunds error:', error);
      res.status(500).json(createResponse(false, 'Failed to retrieve refunds'));
    }
  }

  static async approveRefund(req, res) {
    const client = await pool.connect();
    try {
      const { refundId } = req.params;
      const adminId = req.user.id;
      
      // TODO: Implement RefundModel.approve()
      await client.query('BEGIN');

      // 1. Get refund details
      const refundQuery = await client.query(`
        SELECT r.*, o.total_amount, o.user_id, o.payment_method,
              u.email, u.first_name, e.title as event_title
        FROM refund_requests r
        JOIN orders o ON r.order_id = o.id
        JOIN users u ON o.user_id = u.id
        JOIN events e ON o.event_id = e.id
        WHERE r.id = $1 AND r.status = 'pending'
        FOR UPDATE
      `, [refundId]);

      if (refundQuery.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json(
          createResponse(false, 'Refund request not found or already processed')
        );
      }

      const refund = refundQuery.rows[0];

      // 2. Update refund status
      await client.query(`
        UPDATE refund_requests 
        SET status = 'approved',
            processed_by = $1,
            processed_at = NOW(),
            updated_at = NOW()
        WHERE id = $2
      `, [adminId, refundId]);


      // 3. Update order status
      await client.query(`
        UPDATE orders 
        SET status = 'refunded',
            updated_at = NOW()
        WHERE id = $1
      `, [refund.order_id]);

      // 4. Update tickets
      await client.query(`
        UPDATE tickets 
        SET status = 'refunded',
            updated_at = NOW()
        WHERE order_id = $1
      `, [refund.order_id]);

      // 5. Restore ticket quantities
      await client.query(`
        UPDATE ticket_types tt
        SET sold_quantity = sold_quantity - oi.quantity,
            updated_at = NOW()
        FROM order_items oi
        WHERE tt.id = oi.ticket_type_id 
          AND oi.order_id = $1
      `, [refund.order_id]);

      // 6. Create notification for user
      await client.query(`
        INSERT INTO notifications (user_id, type, title, message, data)
        VALUES ($1, 'refund_approved', 'Refund Approved', $2, $3)
      `, [
        refund.user_id,
        `Your refund request for ${refund.event_title} has been approved.`,
        JSON.stringify({
          order_id: refund.order_id,
          refund_amount: refund.total_amount,
          refund_id: refundId
        })
      ]);

      await client.query('COMMIT');

      // TODO: Send email notification
      // await emailService.sendRefundApprovalEmail(refund);

      res.json(createResponse(
        true,
        'Refund approved successfully (TODO: implement)',
        { refund_id: refundId }
      ));
    } catch (error) {
      console.error('❌ Approve refund error:', error);
      res.status(500).json(createResponse(false, 'Failed to approve refund'));
    } finally {
      client.release();
    }
  }

  static async rejectRefund(req, res) {
    const client = await pool.connect();

    try {
      const { refundId } = req.params;
      const { reason } = req.body;
      const adminId = req.user.id;

      await client.query('BEGIN'); 
    
      if (!reason) {
        await client.query('ROLLBACK');
        return res.status(400).json(
          createResponse(false, 'Rejection reason is required')
        );
      }
      
      // TODO: Implement RefundModel.reject()
       // 1. Get refund details
      const refundQuery = await client.query(`
        SELECT r.*, o.user_id, u.email, u.first_name, e.title as event_title
        FROM refund_requests r
        JOIN orders o ON r.order_id = o.id
        JOIN users u ON o.user_id = u.id
        JOIN events e ON o.event_id = e.id
        WHERE r.id = $1 AND r.status = 'pending'
      `, [refundId]);

      if (refundQuery.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json(
          createResponse(false, 'Refund request not found or already processed')
        );
      }

      const refund = refundQuery.rows[0];

      // 2. Update refund status
      await client.query(`
        UPDATE refund_requests 
        SET status = 'rejected',
            processed_by = $1,
            processed_at = NOW(),
            rejection_reason = $2,
            updated_at = NOW()
        WHERE id = $3
      `, [adminId, reason, refundId]);

      // 3. Create notification
      await client.query(`
        INSERT INTO notifications (user_id, type, title, message, data)
        VALUES ($1, 'refund_rejected', 'Refund Rejected', $2, $3)
      `, [
        refund.user_id,
        `Your refund request for ${refund.event_title} has been rejected.`,
        JSON.stringify({
          order_id: refund.order_id,
          refund_id: refundId,
          rejection_reason: reason
        })
      ]);

      await client.query('COMMIT');

      // TODO: Send email notification
      // await emailService.sendRefundRejectionEmail(refund, reason);

      res.json(createResponse(
        true,
        'Refund rejected successfully (TODO: implement)',
        { refund_id: refundId }
      ));
    } catch (error) {
      console.error('❌ Reject refund error:', error);
      res.status(500).json(createResponse(false, 'Failed to reject refund'));
    } finally {
      client.release();
    }
  }

  static async getActivityLogs(req, res) {
    try {
      const { page = 1, limit = 50, user_id, action, entity_type } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      let whereConditions = [];
      let params = [];
      let paramIndex = 1;
      
      if (user_id) {
        whereConditions.push(`al.user_id = $${paramIndex}`);
        params.push(user_id);
        paramIndex++;
      }
      
      if (action) {
        whereConditions.push(`al.action = $${paramIndex}`);
        params.push(action);
        paramIndex++;
      }
      
      if (entity_type) {
        whereConditions.push(`al.entity_type = $${paramIndex}`);
        params.push(entity_type);
        paramIndex++;
      }
      
      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}` 
        : '';
      
      const query = `
        SELECT 
          al.*,
          u.first_name || ' ' || u.last_name as user_name,
          u.email as user_email,
          u.role as user_role
        FROM activity_logs al
        LEFT JOIN users u ON al.user_id = u.id
        ${whereClause}
        ORDER BY al.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      const countQuery = `
        SELECT COUNT(*) as total FROM activity_logs al ${whereClause}
      `;
      
      params.push(parseInt(limit), offset);
      const countParams = params.slice(0, -2);
      
      const [logsResult, countResult] = await Promise.all([
        pool.query(query, params),
        pool.query(countQuery, countParams)
      ]);
      
      const totalCount = parseInt(countResult.rows[0].total);
      
      res.json(createResponse(
        true,
        'Activity logs retrieved successfully',
        {
          logs: logsResult.rows,
          pagination: {
            current_page: parseInt(page),
            total_pages: Math.ceil(totalCount / limit),
            total_count: totalCount,
            per_page: parseInt(limit)
          }
        }
      ));
    } catch (error) {
      console.error('❌ Get activity logs error:', error);
      res.status(500).json(createResponse(false, 'Failed to retrieve logs'));
    }
  }

  static async getAuditLogs(req, res) {
    try {
      const { page = 1, limit = 50 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      const query = `
        SELECT 
          al.*,
          u.first_name || ' ' || u.last_name as admin_name,
          u.email as admin_email
        FROM admin_audit_logs al
        LEFT JOIN users u ON al.admin_id = u.id
        ORDER BY al.created_at DESC
        LIMIT $1 OFFSET $2
      `;
      
      const countQuery = `SELECT COUNT(*) as total FROM admin_audit_logs`;
      
      const [logsResult, countResult] = await Promise.all([
        pool.query(query, [parseInt(limit), offset]),
        pool.query(countQuery)
      ]);
      
      const totalCount = parseInt(countResult.rows[0].total);
      
      res.json(createResponse(
        true,
        'Audit logs retrieved successfully',
        {
          logs: logsResult.rows,
          pagination: {
            current_page: parseInt(page),
            total_pages: Math.ceil(totalCount / limit),
            total_count: totalCount,
            per_page: parseInt(limit)
          }
        }
      ));
    } catch (error) {
      console.error('❌ Get audit logs error:', error);
      res.status(500).json(createResponse(false, 'Failed to retrieve logs'));
    }
  }
}

module.exports = AdminController;
