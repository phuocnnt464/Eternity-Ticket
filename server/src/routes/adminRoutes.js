// src/routes/adminRoutes.js
const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const UserController = require('../controllers/userController');
const EventController = require('../controllers/eventController');
const AdminController = require('../controllers/adminController');
const { 
  authenticateToken, 
  authorizeRoles 
} = require('../middleware/authMiddleware');
const {  validate, validateUUIDParam, validatePagination } = require('../middleware/validationMiddleware');
const { logAdminAudit } = require('../middleware/activityLogger');

const {
  rejectEventSchema,
} = require('../validations/eventValidation');

const {
  createSubAdminSchema,
  updateUserRoleSchema,
  rejectRefundSchema,
  updateSettingSchema,
  searchUsersSchema
} = require('../validations/adminValidation');

const pool = require('../config/database');


// =============================================
// RATE LIMITERS
// =============================================

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: { message: 'Too many admin requests. Please try again later.' }
  }
});

const sensitiveAdminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    error: { message: 'Too many sensitive operations.' }
  }
});

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(authorizeRoles('admin', 'sub_admin'));
router.use(adminLimiter);

/**
 * @route   GET /api/admin/dashboard/stats
 * @desc    Get dashboard statistics
 * @access  Private (Admin only)
 */
router.get('/dashboard/stats', 
  AdminController.getDashboardStats
);

/**
 * @route   GET /api/admin/users/search
 * @desc    Search users
 * @access  Private (Admin only)
 */
router.get('/users/search', 
  validate(searchUsersSchema, 'query'),
  AdminController.searchUsers
);

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
 * @route   PATCH /api/admin/users/:userId/role
 * @desc    Update user role
 * @access  Private (Admin only)
 */
router.patch('/users/:userId/role', 
  validateUUIDParam('userId'),
  validate(updateUserRoleSchema), 
  logAdminAudit('UPDATE_USER_ROLE', 'USER'),
  AdminController.updateUserRole
);

/**
 * @route   POST /api/admin/users/:userId/reactivate
 * @desc    Reactivate user account
 * @access  Private (Admin only)
 */
router.post('/users/:userId/reactivate',  
  validateUUIDParam('userId'),
  logAdminAudit('REACTIVATE_ACCOUNT', 'USER'),
  AdminController.reactivateAccount
);

/**
 * GET /api/admin/events/pending
 * Get events pending approval
 */
router.get('/events/pending',
  validatePagination(),
  EventController.getPendingEvents  // From eventController
);

/**
 * @route   POST /api/admin/events/:eventId/approve
 * @desc    Approve event
 * @access  Private (Admin only)
 */
router.post('/events/:id/approve',
  validateUUIDParam('id'),
  logAdminAudit('APPROVE_EVENT', 'EVENT'),
  EventController.approveEvent
);

/**
 * GET /api/admin/events
 * Get all events (all statuses)
 */
router.get('/events',
  validatePagination(),
  AdminController.getAllEvents 
);

/**
 * @route   POST /api/admin/events/:eventId/reject
 * @desc    Reject event with reason
 * @access  Private (Admin only)
 */
router.post('/events/:id/reject',
  validateUUIDParam('id'),
  validate(rejectEventSchema),
  logAdminAudit('REJECT_EVENT', 'EVENT'),
  EventController.rejectEvent
);

router.post('/events/:eventId/cancel',
  authenticateToken,
  authorizeRoles('admin', 'sub_admin'),
  AdminController.cancelEvent
);

/**
 * GET /api/admin/orders
 * Get all orders with filters
 */
router.get('/orders',
  validatePagination(),
  AdminController.getAllOrders
);

/**
 * GET /api/admin/orders/:orderId
 * Get order details
 */
router.get('/orders/:orderId',
  validateUUIDParam('orderId'),
  AdminController.getOrderDetails
);

/**
 * GET /api/admin/refunds/pending
 * Get pending refund requests
 */
router.get('/refunds/pending',
  validatePagination(),
  AdminController.getPendingRefunds
);

/**
 * POST /api/admin/refunds/:refundId/approve
 * Approve refund request
 */
// router.post('/refunds/:refundId/approve',
//   sensitiveAdminLimiter,
//   validateUUIDParam('refundId'),
//   logAdminAudit('APPROVE_REFUND', 'REFUND'),
//   AdminController.approveRefund
// );

/**
 * POST /api/admin/refunds/:refundId/reject
 * Reject refund request
 */
// router.post('/refunds/:refundId/reject',
//   sensitiveAdminLimiter,
//   validateUUIDParam('refundId'),
//   validate(rejectRefundSchema), 
//   logAdminAudit('REJECT_REFUND', 'REFUND'),
//   AdminController.rejectRefund
// );

/**
 * GET /api/admin/settings
 * Get all system settings
 */
router.get('/settings', 
  AdminController.getSettings
);

/**
 * PUT /api/admin/settings/:key
 * Update system setting
 */
router.put('/settings/:key',
  sensitiveAdminLimiter,
  validate(updateSettingSchema),
  logAdminAudit('UPDATE_SETTING', 'SYSTEM_SETTING'),
  AdminController.updateSetting
);

/**
 * GET /api/admin/activity-logs
 * Get system activity logs
 */
router.get('/activity-logs',
  validatePagination(),
  AdminController.getActivityLogs
);

/**
 * GET /api/admin/audit-logs
 * Get admin audit logs
 * Get admin audit logs with filters
 * Query params: admin_id, action, target_type, start_date, end_date, page, limit
 */
router.get('/audit-logs',
  validatePagination(),
  AdminController.getAuditLogs
);

/**
 * GET /api/admin/audit-logs/:targetType/:targetId
 * Get audit logs for specific target entity
 */
router.get('/audit-logs/:targetType/:targetId', 
  AdminController.getAuditLogsByTarget);

/**
 * @route   POST /api/admin/sub-admins
 * @desc    Create new sub-admin account
 * @access  Private (Admin only - NOT sub_admin)
 */
router.post('/sub-admins',
  sensitiveAdminLimiter,
  (req, res, next) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: { message: 'Only main admin can create sub-admins' }
      });
    }
    next();
  },
  validate(createSubAdminSchema),
  logAdminAudit('CREATE_SUB_ADMIN', 'USER'),
  AdminController.createSubAdmin
);

/**
 * @route   GET /api/admin/sub-admins
 * @desc    Get all sub-admin accounts
 * @access  Private (Admin only)
 */
router.get('/sub-admins',
  (req, res, next) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: { message: 'Only main admin can create sub-admins' }
      });
    }
    next();
  },
  validatePagination(),
  AdminController.getSubAdmins
);

/**
 * @route   DELETE /api/admin/sub-admins/:userId
 * @desc    Deactivate sub-admin account
 * @access  Private (Admin only)
 */
router.delete('/sub-admins/:userId',
  sensitiveAdminLimiter,
  (req, res, next) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: { message: 'Only main admin can deactivate sub-admins' }
      });
    }
    next();
  },
  validateUUIDParam('userId'),
  logAdminAudit('DEACTIVATE_SUB_ADMIN', 'USER'),
  AdminController.deactivateSubAdmin
);

module.exports = router;