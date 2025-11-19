// src/controllers/adminController.js
const pool = require('../config/database');
const UserModel = require('../models/userModel');
const EventModel = require('../models/eventModel');
const { createResponse } = require('../utils/helpers');
const emailService = require('../services/emailService');
const AuditLogModel = require('../models/auditLogModel');
const RefundModel = require('../models/refundModel');

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

        // Get recent events - THÊM DÒNG NÀY
        const recentEventsQuery = `
          SELECT 
            e.id as event_id,
            e.title,
            e.status,
            e.created_at,
            u.first_name || ' ' || u.last_name as organizer_name,
            u.email as organizer_email
          FROM events e
          LEFT JOIN users u ON e.organizer_id = u.id
          ORDER BY e.created_at DESC
          LIMIT 5
        `;
        const recentEventsResult = await pool.query(recentEventsQuery);
        
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
            total: parseInt(stats.total_events),
            recent: recentEventsResult.rows
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
      const requestingUser = req.user;
      
      if (!role) {
        return res.status(400).json({
          success: false,
          error: { message: 'Role is required' }
        });
      }

      // Get target user
      const targetUser = await pool.query(
        'SELECT id, role, email FROM users WHERE id = $1',
        [userId]
      );
      
      if (targetUser.rows.length === 0) {
        return res.status(404).json(
          createResponse(false, 'User not found')
        );
      }
      
      const target = targetUser.rows[0];
      
      // PROTECTION: Sub-admin cannot change admin/sub_admin roles
      if (requestingUser.role === 'sub_admin') {
        if (target.role === 'admin' || target.role === 'sub_admin') {
          return res.status(403).json(
            createResponse(
              false, 
              'Sub-admins cannot modify admin or sub-admin accounts'
            )
          );
        }
        
        if (role === 'admin' || role === 'sub_admin') {
          return res.status(403).json(
            createResponse(
              false, 
              'Sub-admins cannot promote users to admin or sub-admin'
            )
          );
        }
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

  /**
   * Deactivate user account
   * POST /api/admin/users/:userId/deactivate
   */
  static async deactivateAccount(req, res) {
    try {
      const { userId } = req.params;
      const requestingUser = req.user;

      // Get target user
      const targetUser = await pool.query(
        'SELECT id, role, email, is_active FROM users WHERE id = $1',
        [userId]
      );
      
      if (targetUser.rows.length === 0) {
        return res.status(404).json(
          createResponse(false, 'User not found')
        );
      }
      
      const target = targetUser.rows[0];
      
      // PROTECTION: Cannot deactivate admin
      if (target.role === 'admin') {
        return res.status(403).json(
          createResponse(false, 'Cannot deactivate admin accounts')
        );
      }
      
      // PROTECTION: Sub-admin cannot deactivate other sub-admins
      if (requestingUser.role === 'sub_admin' && target.role === 'sub_admin') {
        return res.status(403).json(
          createResponse(false, 'Sub-admins cannot deactivate other sub-admins')
        );
      }

      // Check if already inactive
      if (!target.is_active) {
        return res.status(400).json(
          createResponse(false, 'User is already inactive')
        );
      }
      
      const success = await UserModel.deactivateAccount(userId);
      
      if (!success) {
        return res.status(500).json(
          createResponse(false, 'Failed to deactivate account')
        );
      }
      
      console.log(`✅ Admin ${requestingUser.id} deactivated user ${userId}`);
      
      res.json(createResponse(
        true,
        'User account deactivated successfully'
      ));
      
    } catch (error) {
      console.error('❌ Deactivate account error:', error);
      res.status(500).json(createResponse(false, 'Failed to deactivate account'));
    }
  }

  // ===============================
  // EVENT MANAGEMENT
  // ===============================

  static async getAllEvents(req, res) {
    try {
      const { page = 1, limit = 20, status } = req.query;
      
      // const filters = status ? { status } : {};
      const filters = {
        admin_view: true 
      };
      if (status) {
        filters.status = status;
      }
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

  static async updateSettingsBulk(req, res) {
    try {
      const { settings } = req.body;
      const adminId = req.user.id;
      
      if (!settings || typeof settings !== 'object') {
        return res.status(400).json(
          createResponse(false, 'Settings object is required')
        );
      }
      
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        const updatedSettings = [];
        
        for (const [key, value] of Object.entries(settings)) {
          if (value === undefined || value === null || value === '') {
            continue;
          }
          
          const query = `
            UPDATE system_settings
            SET setting_value = $1,
                updated_by = $2,
                updated_at = NOW()
            WHERE setting_key = $3
            RETURNING *
          `;
          
          const result = await client.query(query, [value, adminId, key]);
          
          if (result.rows.length > 0) {
            updatedSettings.push(result.rows[0]);
          }
        }
        
        await client.query('COMMIT');
        
        res.json(createResponse(
          true,
          `${updatedSettings.length} settings updated successfully`,
          { settings: updatedSettings }
        ));
        
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
      
    } catch (error) {
      console.error('❌ Bulk update settings error:', error);
      res.status(500).json(createResponse(false, 'Failed to update settings'));
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
    try {
      const { refundId } = req.params;
      const adminId = req.user.id;

      // Use RefundModel.approve with full transaction handling
      const refundData = await RefundModel.approve(refundId, adminId, null);

      // Send approval email
      try {
        await emailService.sendRefundApprovalEmail({
          email: refundData.user_email,
          user_name: refundData.user_name,
          order_number: refundData.order_number,
          event_title: refundData.event_title,
          refund_amount: parseFloat(refundData.refund_amount)
        });
      } catch (emailError) {
        console.error('Failed to send approval email:', emailError);
      }

      res.json(createResponse(
        true,
        'Refund approved successfully',
        { refund_id: refundId }
      ));
    } catch (error) {
      console.error('❌ Approve refund error:', error);
      
      let statusCode = 500;
      let message = 'Failed to approve refund';
      
      if (error.message.includes('not found') || error.message.includes('already processed')) {
        statusCode = 404;
        message = error.message;
      }
      
      res.status(statusCode).json(createResponse(false, message));
    }
  }

  static async rejectRefund(req, res) {
    try {
      const { refundId } = req.params;
      const { reason } = req.body;
      const adminId = req.user.id;

      // Use RefundModel.reject with full transaction handling
      const refundData = await RefundModel.reject(refundId, adminId, reason);

      // Send rejection email
      try {
        await emailService.sendRefundRejectionEmail({
          email: refundData.user_email,
          user_name: refundData.user_name,
          order_number: refundData.order_number,
          event_title: refundData.event_title,
          refund_amount: parseFloat(refundData.refund_amount),
          rejection_reason: reason
        });
      } catch (emailError) {
        console.error('Failed to send rejection email:', emailError);
      }

      res.json(createResponse(
        true,
        'Refund rejected successfully',
        { refund_id: refundId }
      ));
    } catch (error) {
      console.error('❌ Reject refund error:', error);
      
      let statusCode = 500;
      let message = 'Failed to reject refund';
      
      if (error.message.includes('not found') || error.message.includes('already processed')) {
        statusCode = 404;
        message = error.message;
      } else if (error.message.includes('required')) {
        statusCode = 400;
        message = error.message;
      }
      
      res.status(statusCode).json(createResponse(false, message));
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
      const {
        admin_id, 
        action, 
        target_type, 
        start_date, 
        end_date,
        page = 1, 
        limit = 50 
      } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      const filters = {};

      if (admin_id) filters.admin_id = admin_id;
      if (action) filters.action = action;
      if (target_type) filters.target_type = target_type;
      if (start_date) filters.start_date = start_date;
      if (end_date) filters.end_date = end_date;
      
      // const query = `
      //   SELECT 
      //     al.*,
      //     u.first_name || ' ' || u.last_name as admin_name,
      //     u.email as admin_email
      //   FROM admin_audit_logs al
      //   LEFT JOIN users u ON al.admin_id = u.id
      //   ORDER BY al.created_at DESC
      //   LIMIT $1 OFFSET $2
      // `;
      const result = await AuditLogModel.findAll(filters, parseInt(limit), offset);
      
      // const countQuery = `SELECT COUNT(*) as total FROM admin_audit_logs`;
      
      // const [logsResult, countResult] = await Promise.all([
      //   pool.query(query, [parseInt(limit), offset]),
      //   pool.query(countQuery)
      // ]);
      
      // const totalCount = parseInt(countResult.rows[0].total);
      
      res.json(createResponse(
        true,
        'Audit logs retrieved successfully',
        {
          logs: result.logs,
          pagination: {
            current_page: parseInt(page),
            total_pages: Math.ceil(result.total_count / limit),
            total_count: result.total_count,
            per_page: parseInt(limit)
          }
        }
      ));
    } catch (error) {
      console.error('❌ Get audit logs error:', error);
      res.status(500).json(createResponse(false, 'Failed to retrieve logs'));
    }
  }

  /**
   * Get audit logs for a specific target
   * GET /api/admin/audit-logs/:targetType/:targetId
   */
  static async getAuditLogsByTarget(req, res) {
    try {
      const { targetType, targetId } = req.params;
      
      const logs = await AuditLogModel.findByTarget(targetType, targetId);
      
      res.json(createResponse(
        true,
        'Audit logs retrieved successfully',
        { logs, count: logs.length }
      ));
    } catch (error) {
      console.error('❌ Get audit logs by target error:', error);
      res.status(500).json(createResponse(false, 'Failed to retrieve logs'));
    }
  }

  /**
   * Export audit logs to CSV
   * GET /api/admin/audit-logs/export
   */
  static async exportAuditLogs(req, res) {
    try {
      const { start_date, end_date, action, admin_id } = req.query;
      
      console.log('📊 Export request:', { start_date, end_date, action, admin_id });
      
      let whereConditions = [];
      let params = [];
      let paramIndex = 1;
      
      // Chỉ add filter khi có giá trị
      if (admin_id && admin_id.trim()) {
        whereConditions.push(`al.admin_id = $${paramIndex}`);
        params.push(admin_id);
        paramIndex++;
      }
      
      if (action && action !== 'all' && action.trim()) {
        whereConditions.push(`al.action = $${paramIndex}`);
        params.push(action);
        paramIndex++;
      }
      
      if (start_date && start_date.trim()) {
        whereConditions.push(`al.created_at >= $${paramIndex}::timestamp`);
        params.push(start_date);
        paramIndex++;
      }
      
      if (end_date && end_date.trim()) {
        whereConditions.push(`al.created_at <= $${paramIndex}::timestamp`);
        params.push(end_date + ' 23:59:59');
        paramIndex++;
      }
      
      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}` 
        : '';
      
      const query = `
        SELECT 
          al.created_at,
          al.admin_id,
          u.first_name || ' ' || u.last_name as admin_name,
          u.email as admin_email,
          al.action,
          al.target_type,
          al.target_id,
          al.description,
          al.ip_address
        FROM admin_audit_logs al
        LEFT JOIN users u ON al.admin_id = u.id
        ${whereClause}
        ORDER BY al.created_at DESC
        LIMIT 10000
      `;
      
      const result = await pool.query(query, params);
      
      console.log(`✅ Found ${result.rows.length} logs to export`);
      
      if (result.rows.length === 0) {
        return res.status(404).json(createResponse(false, 'No audit logs found'));
      }
      
      // Create CSV with proper escaping
      const headers = ['Timestamp', 'Admin ID', 'Admin Name', 'Admin Email', 'Action', 'Target Type', 'Target ID', 'Description', 'IP Address'];
      const csvRows = [headers.join(',')];

      result.rows.forEach(row => {
        const values = [
          `"${row.created_at ? new Date(row.created_at).toISOString() : 'N/A'}"`,
          `"${row.admin_id || 'N/A'}"`,
          `"${(row.admin_name || 'System').replace(/"/g, '""')}"`,
          `"${(row.admin_email || 'N/A').replace(/"/g, '""')}"`,
          `"${(row.action || 'N/A').replace(/"/g, '""')}"`,
          `"${(row.target_type || 'N/A').replace(/"/g, '""')}"`,
          `"${(row.target_id || 'N/A').replace(/"/g, '""')}"`,
          `"${(row.description || '').replace(/"/g, '""')}"`,
          `"${row.ip_address || 'N/A'}"`
        ];
        csvRows.push(values.join(','));
      });
      
      const csv = csvRows.join('\n');
      
      // ✅ SỬA: Đặt headers ĐÚNG THỨ TỰ và tránh cache
      res.status(200); // Force 200 status
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`);
      res.setHeader('Content-Length', Buffer.byteLength(csv, 'utf8'));
      
      // ✅ QUAN TRỌNG: Tắt cache hoàn toàn
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('ETag', ''); // Remove ETag
      res.setHeader('Last-Modified', new Date().toUTCString()); // Always new
      
      res.send(csv);
      
      console.log('✅ CSV exported successfully:', csv.length, 'bytes');
      
    } catch (error) {
      console.error('❌ Export audit logs error:', error);
      res.status(500).json(createResponse(false, 'Failed to export audit logs'));
    }
  }

  /**
   * Export activity logs to CSV
   * GET /api/admin/activity-logs/export
   */
  static async exportActivityLogs(req, res) {
    try {
      const { start_date, end_date, action, user_id } = req.query;
      
      console.log('📊 Export activity logs request:', { start_date, end_date, action, user_id });
      
      let whereConditions = [];
      let params = [];
      let paramIndex = 1;
      
      // Filters
      if (user_id && user_id.trim()) {
        whereConditions.push(`al.user_id = $${paramIndex}`);
        params.push(user_id);
        paramIndex++;
      }
      
      if (action && action !== 'all' && action.trim()) {
        whereConditions.push(`al.action = $${paramIndex}`);
        params.push(action);
        paramIndex++;
      }
      
      if (start_date && start_date.trim()) {
        whereConditions.push(`al.created_at >= $${paramIndex}::timestamp`);
        params.push(start_date);
        paramIndex++;
      }
      
      if (end_date && end_date.trim()) {
        whereConditions.push(`al.created_at <= $${paramIndex}::timestamp`);
        params.push(end_date + ' 23:59:59');
        paramIndex++;
      }
      
      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}` 
        : '';
      
      const query = `
        SELECT 
          al.created_at,
          al.user_id,
          u.first_name || ' ' || u.last_name as user_name,
          u.email as user_email,
          u.role as user_role,
          al.action,
          al.entity_type,
          al.entity_id,
          al.description,
          al.ip_address
        FROM activity_logs al
        LEFT JOIN users u ON al.user_id = u.id
        ${whereClause}
        ORDER BY al.created_at DESC
        LIMIT 10000
      `;
      
      const result = await pool.query(query, params);
      
      console.log(`✅ Found ${result.rows.length} activity logs to export`);
      
      if (result.rows.length === 0) {
        return res.status(404).json(createResponse(false, 'No activity logs found'));
      }
      
      // Create CSV
      const headers = ['Timestamp', 'User ID', 'User Name', 'User Email', 'User Role', 'Action', 'Entity Type', 'Entity ID', 'Description', 'IP Address'];
      const csvRows = [headers.join(',')];

      result.rows.forEach(row => {
        const values = [
          `"${row.created_at ? new Date(row.created_at).toISOString() : 'N/A'}"`,
          `"${row.user_id || 'N/A'}"`,
          `"${(row.user_name || 'Unknown').replace(/"/g, '""')}"`,
          `"${(row.user_email || 'N/A').replace(/"/g, '""')}"`,
          `"${(row.user_role || 'N/A').replace(/"/g, '""')}"`,
          `"${(row.action || 'N/A').replace(/"/g, '""')}"`,
          `"${(row.entity_type || 'N/A').replace(/"/g, '""')}"`,
          `"${(row.entity_id || 'N/A').replace(/"/g, '""')}"`,
          `"${(row.description || '').replace(/"/g, '""')}"`,
          `"${row.ip_address || 'N/A'}"`
        ];
        csvRows.push(values.join(','));
      });
      
      const csv = csvRows.join('\n');
      
      // Set headers
      res.status(200);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="activity-logs-eternity-${new Date().toISOString().split('T')[0]}.csv"`);
      res.setHeader('Content-Length', Buffer.byteLength(csv, 'utf8'));
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      res.send(csv);
      
      console.log('✅ Activity logs CSV exported successfully:', csv.length, 'bytes');
      
    } catch (error) {
      console.error('❌ Export activity logs error:', error);
      res.status(500).json(createResponse(false, 'Failed to export activity logs'));
    }
  }

  /**
   * Create sub-admin account
   * POST /api/admin/sub-admins
   * @access Private (Admin only - NOT sub_admin)
   */
  static async createSubAdmin(req, res) {
    try {
      const { email, password, first_name, last_name, phone } = req.body;
      const createdBy = req.user.id;

      console.log(`👤 Admin ${createdBy} creating sub-admin: ${email}`);

      // Check if email exists
      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        return res.status(409).json(
          createResponse(false, 'Email already exists')
        );
      }

      // Create sub-admin user
      const result = await UserModel.create({
        email,
        password,
        role: 'sub_admin',
        first_name,
        last_name,
        phone,
        is_email_verified: true  // Auto-verify for admin-created accounts
      });

      // Log activity
      try {
        await pool.query(`
          INSERT INTO admin_audit_logs 
          (admin_id, action, target_type, target_id, new_values, description, ip_address)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          createdBy, 
          'CREATE_SUB_ADMIN',
          'USER',
          result.user.id,
          JSON.stringify({ 
            email, 
            first_name, 
            last_name,
            role: 'sub_admin'
          }),
          `Admin created sub-admin account: ${email}`,
          req.ip || null
        ]);
      } catch (auditError) {
        console.error('⚠️ Failed to create audit log (non-critical):', auditError.message);
        // Don't fail the request
      }

      try {
        // Send welcome email
        const emailService = require('../services/emailService');
        await emailService.sendAdminAccountCreated({
          email,
          first_name,
          last_name,
          role: 'sub_admin',
          temporary_password: password
        });
      } catch (emailError) {
        console.error('⚠️ Failed to send welcome email (non-critical):', emailError.message);
        // Don't fail the request
      }

      res.status(201).json(createResponse(
        true,
        'Sub-admin account created successfully',
        { 
          user: {
            id: result.user.id,
            email: result.user.email,
            first_name: result.user.first_name,
            last_name: result.user.last_name,
            role: result.user.role,
            is_email_verified: result.user.is_email_verified,
            created_at: result.user.created_at
          }
        }
      ));

    } catch (error) {
      console.error('❌ Create sub-admin error:', error);
      
      let statusCode = 500;
      let message = 'Failed to create sub-admin account';
      
      if (error.code === '23505') {
        statusCode = 409;
        message = 'Email already exists';
      }
      
      res.status(statusCode).json(createResponse(false, message));
    }
  }

  /**
   * Get all sub-admins
   * GET /api/admin/sub-admins
   * @access Private (Admin only)
   */
  static async getSubAdmins(req, res) {
    try {
      const { page = 1, limit = 20, is_active } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      let whereConditions = ["role = 'sub_admin'"];
      let params = [];
      let paramIndex = 1;
      
      if (is_active !== undefined) {
        whereConditions.push(`is_active = $${paramIndex}`);
        params.push(is_active === 'true');
        paramIndex++;
      }
      
      const whereClause = whereConditions.join(' AND ');
      
      const query = `
        SELECT 
          id,
          email,
          first_name,
          last_name,
          phone,
          is_active,
          is_email_verified,
          created_at,
          last_login_at
        FROM users
        WHERE ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      const countQuery = `
        SELECT COUNT(*) as total FROM users WHERE ${whereClause}
      `;
      
      params.push(parseInt(limit), offset);
      const countParams = params.slice(0, -2);
      
      const [usersResult, countResult] = await Promise.all([
        pool.query(query, params),
        pool.query(countQuery, countParams)
      ]);
      
      const totalCount = parseInt(countResult.rows[0].total);
      
      res.json(createResponse(
        true,
        'Sub-admins retrieved successfully',
        {
          sub_admins: usersResult.rows,
          pagination: {
            current_page: parseInt(page),
            total_pages: Math.ceil(totalCount / limit),
            total_count: totalCount,
            per_page: parseInt(limit)
          }
        }
      ));
    } catch (error) {
      console.error('❌ Get sub-admins error:', error);
      res.status(500).json(createResponse(false, 'Failed to retrieve sub-admins'));
    }
  }

  static async deactivateSubAdmin(req, res) {
    try {
      const { userId } = req.params;

      // Verify is sub_admin
      const user = await pool.query(
        'SELECT role FROM users WHERE id = $1', 
        [userId]
      );
      
      if (user.rows.length === 0) {
        return res.status(404).json(createResponse(false, 'User not found'));
      }

      if (user.rows[0].role !== 'sub_admin') {
        return res.status(400).json(createResponse(false, 'User is not a sub-admin'));
      }

      await UserModel.deactivateAccount(userId);

      res.json(createResponse(true, 'Sub-admin account deactivated'));

    } catch (error) {
      console.error('❌ Deactivate sub-admin error:', error);
      res.status(500).json(createResponse(false, 'Failed to deactivate'));
    }
  }

  static async cancelEvent(req, res) {
    try {
      const { eventId } = req.params;
      const { cancellation_reason } = req.body;
      const adminId = req.user.id;
      
      if (!cancellation_reason) {
        return res.status(400).json(
          createResponse(false, 'Cancellation reason is required')
        );
      }
      
      const EventModel = require('../models/eventModel');
      const result = await EventModel.cancelEvent(
        eventId, 
        adminId, 
        cancellation_reason
      );
      
      res.json(createResponse(
        true,
        `Event cancelled successfully. ${result.refunds_created} refund requests created.`,
        result
      ));
      
    } catch (error) {
      console.error('❌ Cancel event error:', error);
      res.status(500).json(createResponse(false, error.message));
    }
  }
}

module.exports = AdminController;
