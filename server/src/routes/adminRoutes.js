// src/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const { 
  authenticateToken, 
  authorizeRoles 
} = require('../middleware/authMiddleware');
const { validatePagination } = require('../middleware/validationMiddleware');

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

    const UserModel = require('../models/userModel');
    const { createResponse } = require('../utils/helpers');
    
    const users = await UserModel.searchUsers(q, parseInt(limit));
    
    res.json(createResponse(
      true,
      'Search results retrieved successfully',
      { users, count: users.length }
    ));
    
  } catch (error) {
    console.error('❌ Search users error:', error);
    const { createResponse } = require('../utils/helpers');
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
    const UserModel = require('../models/userModel');
    const { createResponse } = require('../utils/helpers');
    const pool = require('../config/database');
    
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
    const { createResponse } = require('../utils/helpers');
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

    const UserModel = require('../models/userModel');
    const { createResponse } = require('../utils/helpers');
    
    const updatedUser = await UserModel.updateUserRole(userId, role);
    
    res.json(createResponse(
      true,
      'User role updated successfully',
      { user: updatedUser }
    ));
    
  } catch (error) {
    console.error('❌ Update user role error:', error);
    const { createResponse } = require('../utils/helpers');
    
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
    
    const UserModel = require('../models/userModel');
    const { createResponse } = require('../utils/helpers');
    
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
    const { createResponse } = require('../utils/helpers');
    res.status(500).json(createResponse(false, 'Failed to reactivate account'));
  }
});

module.exports = router;