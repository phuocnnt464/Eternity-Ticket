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

const { autoCompleteEvents } = require('../utils/helpers');

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

router.use(authenticateToken);
router.use(authorizeRoles('admin', 'sub_admin'));
router.use(adminLimiter);

router.get('/dashboard/stats', 
  AdminController.getDashboardStats
);

router.get('/users/search', 
  validate(searchUsersSchema, 'query'),
  AdminController.searchUsers
);

router.get('/users',
  validatePagination(),
  UserController.getAllUsers
);

router.patch('/users/:userId/role', 
  validateUUIDParam('userId'),
  validate(updateUserRoleSchema), 
  logAdminAudit('UPDATE_USER_ROLE', 'USER'),
  AdminController.updateUserRole
);

router.post('/users/:userId/reactivate',  
  validateUUIDParam('userId'),
  logAdminAudit('REACTIVATE_ACCOUNT', 'USER'),
  AdminController.reactivateAccount
);

router.post('/users/:userId/deactivate',  
  validateUUIDParam('userId'),
  logAdminAudit('DEACTIVATE_ACCOUNT', 'USER'),
  AdminController.deactivateAccount
);

router.get('/events/pending',
  validatePagination(),
  EventController.getPendingEvents  
);

router.post('/events/:id/approve',
  validateUUIDParam('id'),
  logAdminAudit('APPROVE_EVENT', 'EVENT'),
  EventController.approveEvent
);

router.get('/events',
  validatePagination(),
  AdminController.getAllEvents 
);

router.post('/events/:id/reject',
  validateUUIDParam('id'),
  validate(rejectEventSchema),
  logAdminAudit('REJECT_EVENT', 'EVENT'),
  EventController.rejectEvent
);

router.post('/events/:eventId/cancel',
  validateUUIDParam('eventId'),
  AdminController.cancelEvent
);

router.get('/orders',
  validatePagination(),
  AdminController.getAllOrders
);

router.get('/orders/:orderId',
  validateUUIDParam('orderId'),
  AdminController.getOrderDetails
);

router.get('/refunds/pending',
  validatePagination(),
  AdminController.getPendingRefunds
);

router.get('/settings', 
  AdminController.getSettings
);

router.put('/settings/bulk',
  sensitiveAdminLimiter,
  logAdminAudit('UPDATE_SETTINGS_BULK', 'SYSTEM_SETTING'),
  AdminController.updateSettingsBulk
);

router.put('/settings/:key',
  sensitiveAdminLimiter,
  validate(updateSettingSchema),
  logAdminAudit('UPDATE_SETTING', 'SYSTEM_SETTING'),
  AdminController.updateSetting
);

router.get('/activity-logs',
  validatePagination(),
  AdminController.getActivityLogs
);

router.get('/audit-logs',
  validatePagination(),
  AdminController.getAuditLogs
);

router.get('/audit-logs/export',
  AdminController.exportAuditLogs
);

router.get('/activity-logs/export',
  AdminController.exportActivityLogs
);

router.get('/audit-logs/:targetType/:targetId', 
  AdminController.getAuditLogsByTarget);

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

router.post('/events/complete-past', 
  async (req, res) => {
    try {
      const completedEvents = await autoCompleteEvents();
      
      res.json({
        success: true,
        message: `Successfully completed ${completedEvents.length} events`,
        data: {
          completed_count: completedEvents.length,
          events: completedEvents
        }
      });
    } catch (error) {
      console.error('❌ Manual complete events error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to complete events',
        error: error.message
      });
    }
  }
);

module.exports = router;