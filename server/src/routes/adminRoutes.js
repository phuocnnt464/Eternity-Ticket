// src/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const { 
  authenticateToken, 
  authorizeRoles 
} = require('../middleware/authMiddleware');
const { validatePagination } = require('../middleware/validationMiddleware');
const { logActivity } = require('../middleware/activityLogger');

const UserModel = require('../models/userModel');
const { createResponse } = require('../utils/helpers');
const pool = require('../config/database');

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(authorizeRoles('admin', 'sub_admin'));

/**
 * @route   GET /api/admin/users
 * @desc    Get all users (with filters)
 * @access  Private (Admin only)
 */
router.get('/users',
  validatePagination(),
  UserController.getAllUsers
);

/**
 * @route   GET /api/admin/users/search
 * @desc    Search users
 * @access  Private (Admin only)
 */
router.get('/users/search', async (req, res) => {
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
});

/**
 * @route   GET /api/admin/dashboard/stats
 * @desc    Get dashboard statistics
 * @access  Private (Admin only)
 */
router.get('/dashboard/stats', async (req, res) => {
  try {
    // Get user counts by role
    const userCounts = await UserModel.getUserCountByRole();
    
    // Get recent users
    const recentUsers = await UserModel.getRecentUsers(7, 5);
    
    // Get total events, orders, tickets
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM events WHERE status = 'active') as active_events,
        (SELECT COUNT(*) FROM events) as total_events,
        (SELECT COUNT(*) FROM orders WHERE status = 'paid') as paid_orders,
        (SELECT COUNT(*) FROM tickets) as total_tickets,
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE status = 'paid') as total_revenue
    `;
    
    const statsResult = await pool.query(statsQuery);
    const stats = statsResult.rows[0];
    
    res.json(createResponse(
      true,
      'Dashboard statistics retrieved successfully',
      {
        users: {
          by_role: userCounts,
          recent: recentUsers
        },
        events: {
          active: parseInt(stats.active_events),
          total: parseInt(stats.total_events)
        },
        orders: {
          paid: parseInt(stats.paid_orders)
        },
        tickets: {
          total: parseInt(stats.total_tickets)
        },
        revenue: {
          total: parseFloat(stats.total_revenue)
        }
      }
    ));
    
  } catch (error) {
    console.error('❌ Dashboard stats error:', error);
    res.status(500).json(createResponse(false, 'Failed to retrieve statistics'));
  }
});

/**
 * @route   PATCH /api/admin/users/:userId/role
 * @desc    Update user role
 * @access  Private (Admin only)
 */
router.patch('/users/:userId/role', logActivity('UPDATE_USER_ROLE', 'USER'),
 async (req, res) => {
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
});

/**
 * @route   POST /api/admin/users/:userId/reactivate
 * @desc    Reactivate user account
 * @access  Private (Admin only)
 */
router.post('/users/:userId/reactivate',  logActivity('REACTIVATE_ACCOUNT', 'USER'),
 async (req, res) => {
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
});

/**
 * GET /api/admin/events/pending
 * Get events pending approval
 */
router.get('/events/pending',
  validatePagination(),
  EventController.getPendingEvents  // From eventController
);

/**
 * POST /api/admin/events/:eventId/approve
 * Approve event
 */
router.post('/events/:eventId/approve',
  validateUUIDParam('eventId'),
  logActivity('APPROVE_EVENT', 'EVENT'),
  EventController.approveEvent
);

/**
 * POST /api/admin/events/:eventId/reject
 * Reject event with reason
 */
router.post('/events/:eventId/reject',
  validateUUIDParam('eventId'),
  validate(rejectEventSchema),
  logActivity('REJECT_EVENT', 'EVENT'),
  EventController.rejectEvent
);

/**
 * GET /api/admin/events
 * Get all events (all statuses)
 */
router.get('/events',
  validatePagination(),
  async (req, res) => {
    try {
      const { page = 1, limit = 20, status } = req.query;
      const EventModel = require('../models/eventModel');
      
      const filters = status ? { status } : {};
      const result = await EventModel.findMany(filters, { page, limit });
      
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
);

/**
 * GET /api/admin/orders
 * Get all orders with filters
 */
router.get('/orders',
  validatePagination(),
  async (req, res) => {
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
          orders: ordersResult.rows,
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
);

/**
 * GET /api/admin/orders/:orderId
 * Get order details
 */
router.get('/orders/:orderId',
  validateUUIDParam('orderId'),
  async (req, res) => {
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
);

/**
 * GET /api/admin/refunds/pending
 * Get pending refund requests
 */
router.get('/refunds/pending',
  validatePagination(),
  async (req, res) => {
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
          refunds: refundsResult.rows,
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
);

/**
 * POST /api/admin/refunds/:refundId/approve
 * Approve refund request
 */
router.post('/refunds/:refundId/approve',
  validateUUIDParam('refundId'),
  logActivity('APPROVE_REFUND', 'REFUND'),
  async (req, res) => {
    try {
      const { refundId } = req.params;
      const adminId = req.user.id;
      
      // TODO: Implement RefundModel.approve()
      res.json(createResponse(
        true,
        'Refund approved successfully (TODO: implement)'
      ));
    } catch (error) {
      console.error('❌ Approve refund error:', error);
      res.status(500).json(createResponse(false, 'Failed to approve refund'));
    }
  }
);

/**
 * POST /api/admin/refunds/:refundId/reject
 * Reject refund request
 */
router.post('/refunds/:refundId/reject',
  validateUUIDParam('refundId'),
  logActivity('REJECT_REFUND', 'REFUND'),
  async (req, res) => {
    try {
      const { refundId } = req.params;
      const { reason } = req.body;
      const adminId = req.user.id;
      
      if (!reason) {
        return res.status(400).json(
          createResponse(false, 'Rejection reason is required')
        );
      }
      
      // TODO: Implement RefundModel.reject()
      res.json(createResponse(
        true,
        'Refund rejected successfully (TODO: implement)'
      ));
    } catch (error) {
      console.error('❌ Reject refund error:', error);
      res.status(500).json(createResponse(false, 'Failed to reject refund'));
    }
  }
);

/**
 * GET /api/admin/settings
 * Get all system settings
 */
router.get('/settings', async (req, res) => {
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
});

/**
 * PUT /api/admin/settings/:key
 * Update system setting
 */
router.put('/settings/:key',
  logActivity('UPDATE_SETTING', 'SYSTEM_SETTING'),
  async (req, res) => {
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
);

/**
 * GET /api/admin/activity-logs
 * Get system activity logs
 */
router.get('/activity-logs',
  validatePagination(),
  async (req, res) => {
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
          u.email as user_email
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
);

/**
 * GET /api/admin/audit-logs
 * Get admin audit logs
 */
router.get('/audit-logs',
  validatePagination(),
  async (req, res) => {
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
);

module.exports = router;