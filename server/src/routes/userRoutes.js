// src/routes/userRoutes.js
const express = require('express');
const rateLimit = require('express-rate-limit');
const UserController = require('../controllers/userController');
const { authenticateToken, authorizeOwnerOrAdmin, authorizeRoles } = require('../middleware/authMiddleware');
const { validate, validateUUIDParam, validatePagination } = require('../middleware/validationMiddleware');
const { 
  updateProfileSchema
} = require('../validations/authValidation');

const { logActivity } = require('../middleware/activityLogger');

const { uploadUserAvatar, processUserAvatar } = require('../middleware/uploadMiddleware');

const router = express.Router();

// Rate limiting for sensitive operations
const sensitiveOperationsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // limit each IP to 3 requests per windowMs
  message: {
    success: false,
    error: {
      message: 'Too many sensitive operations.',
      retry_after: '15 minutes'
    }
  }
});

const profileUpdateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // limit each IP to 10 profile updates per 5 minutes
  message: {
    success: false,
    error: {
      message: 'Too many profile update attempts, please try again later.'
    }  
  }
});

// =============================================
// USER PROFILE ROUTES
// =============================================

/**
 * @route   GET /api/users/:userId
 * @desc    Get user by ID
 * @access  Private (Owner or Admin)
 */
router.get('/:userId',
  authenticateToken,
  validateUUIDParam('userId'),
  authorizeOwnerOrAdmin('userId'),
  UserController.getUserById
);

/**
 * @route   PUT /api/users/:userId
 * @desc    Update user profile
 * @access  Private (Owner or Admin)
 */
router.put('/:userId',
  authenticateToken,
  profileUpdateLimiter,
  validateUUIDParam('userId'),
  authorizeOwnerOrAdmin('userId'),
  validate(updateProfileSchema),
  logActivity('UPDATE_PROFILE', 'USER'),
  UserController.updateProfile
);

/**
 * @route   POST /api/users/:userId/avatar
 * @desc    Upload user avatar
 * @access  Private (Owner or Admin)
 */
router.post('/:userId/avatar',
  authenticateToken,
  validateUUIDParam('userId'),
  authorizeOwnerOrAdmin('userId'),
  uploadUserAvatar,
  processUserAvatar,
  logActivity('UPLOAD_AVATAR', 'USER'),
  UserController.uploadAvatar
);

/**
 * @route   DELETE /api/users/:userId
 * @desc    Deactivate user account
 * @access  Private (Owner or Admin)
 */
router.delete('/:userId',
  authenticateToken,
  sensitiveOperationsLimiter,
  validateUUIDParam('userId'),
  authorizeOwnerOrAdmin('userId'),
  logActivity('DEACTIVATE_PROFILE', 'USER'),
  UserController.deactivateAccount
);

// =============================================
// USER HISTORY ROUTES
// =============================================

/**
 * @route   GET /api/users/:userId/tickets
 * @desc    Get user's ticket history
 * @access  Private (Owner or Admin)
 */
router.get('/:userId/tickets',
  authenticateToken,
  validateUUIDParam('userId'),
  authorizeOwnerOrAdmin('userId'),
  validatePagination(),
  UserController.getTicketHistory
);

/**
 * @route   GET /api/users/:userId/orders
 * @desc    Get user's order history
 * @access  Private (Owner or Admin)
 */
router.get('/:userId/orders',
  authenticateToken,
  validateUUIDParam('userId'),
  authorizeOwnerOrAdmin('userId'),
  validatePagination(),
  UserController.getOrderHistory
);

// =============================================
// USER ACCOUNT MANAGEMENT
// =============================================
// Statistics endpoint
/**
 * @route   GET /api/users/stats
 * @desc    Get user statistics (orders, tickets, spending)
 * @access  Private
 */
router.get('/:userId/stats',
  authenticateToken,
  validateUUIDParam('userId'),
  authorizeOwnerOrAdmin('userId'),
  async (req, res) => {
    try {
      const UserModel = require('../models/userModel');
      const { createResponse } = require('../utils/helpers');
      
      const stats = await UserModel.getUserStats(req.user.id);
      
      const responseData = {
        statistics: {
          total_orders: parseInt(stats.total_orders) || 0,
          total_tickets: parseInt(stats.total_tickets) || 0,
          used_tickets: parseInt(stats.used_tickets) || 0,
          total_spent: parseFloat(stats.total_spent) || 0,
          unused_tickets: (parseInt(stats.total_tickets) || 0) - (parseInt(stats.used_tickets) || 0),
          usage_rate: stats.total_tickets > 0 ? 
            Math.round((stats.used_tickets / stats.total_tickets) * 100) : 0
        }
      };

      const response = createResponse(
        true,
        'User statistics retrieved successfully',
        responseData
      );

      res.json(response);
    } catch (error) {
      console.error('❌ Get user stats error:', error.message);
      
      const { createResponse } = require('../utils/helpers');
      const response = createResponse(
        false,
        'Failed to retrieve user statistics'
      );
      
      res.status(500).json(response);
    }
  }
);

// Preferences endpoint (for future features)
/**
 * @route   GET /api/users/preferences
 * @desc    Get user preferences
 * @access  Private
 */
router.get('/:userId/preferences', 
  authenticateToken,
  validateUUIDParam('userId'),
  authorizeOwnerOrAdmin('userId'),
  (req, res) => {
    // Placeholder for user preferences
    const { createResponse } = require('../utils/helpers');
  
    const defaultPreferences = {
      notifications: {
        email: true,
        sms: false,
        push: true,
        event_reminders: true,
        marketing: false
      },
      privacy: {
        profile_visibility: 'private',
        show_activity: false,
        // data_usage: 'essential_only'
      },
      display: {
        language: 'en',
        timezone: 'Asia/Ho_Chi_Minh',
        currency: 'VND',
        date_format: 'DD/MM/YYYY'
      }
    };

    res.json(createResponse(
      true,
      'User preferences retrieved successfully',
      { preferences: defaultPreferences }
    ));
  }
);

/**
 * @route   PUT /api/users/preferences
 * @desc    Update user preferences
 * @access  Private
 */
router.put('/:userId/preferences',
  authenticateToken,
  validateUUIDParam('userId'),
  authorizeOwnerOrAdmin('userId'),
  (req, res) => {
    // Placeholder for updating user preferences
    const { createResponse } = require('../utils/helpers');
  
    res.json(createResponse(
      true,
      'User preferences updated successfully',
      { preferences: req.body }
    ));
  }
);

/**
 * @route   GET /api/users/debug
 * @desc    Debug user data
 * @access  Private
 */
router.get('/debug', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const pool = require('../config/database');
    
    console.log(`🔍 Debug info for user: ${userId}`);
    
    // Check user exists
    const userCheck = await pool.query('SELECT id, email, role FROM users WHERE id = $1', [userId]);
    console.log('👤 User found:', userCheck.rows[0]);
    
    // Check orders
    const orderCheck = await pool.query('SELECT COUNT(*) as count FROM orders WHERE user_id = $1', [userId]);
    console.log('📋 Orders count:', orderCheck.rows[0].count);
    
    // Check tickets
    const ticketCheck = await pool.query('SELECT COUNT(*) as count FROM tickets WHERE user_id = $1', [userId]);
    console.log('🎫 Tickets count:', ticketCheck.rows[0].count);
    
    // Check events
    const eventCheck = await pool.query('SELECT COUNT(*) as count FROM events');
    console.log('🎉 Events count:', eventCheck.rows[0].count);
    
    // Check categories
    const categoryCheck = await pool.query('SELECT COUNT(*) as count FROM categories');
    console.log('📂 Categories count:', categoryCheck.rows[0].count);
    
    const { createResponse } = require('../utils/helpers');
    
    res.json(createResponse(true, 'Debug info retrieved', {
      user: userCheck.rows[0],
      counts: {
        orders: parseInt(orderCheck.rows[0].count),
        tickets: parseInt(ticketCheck.rows[0].count),
        events: parseInt(eventCheck.rows[0].count),
        categories: parseInt(categoryCheck.rows[0].count)
      }
    }));
    
  } catch (error) {
    console.error('❌ Debug error:', error.message);
    const { createResponse } = require('../utils/helpers');
    res.status(500).json(createResponse(false, `Debug error: ${error.message}`));
  }
});

module.exports = router;