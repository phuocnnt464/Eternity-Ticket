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

const sensitiveOperationsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 3,
  message: {
    success: false,
    error: {
      message: 'Too many sensitive operations.',
      retry_after: '15 minutes'
    }
  }
});

const profileUpdateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, 
  max: 10, 
  message: {
    success: false,
    error: {
      message: 'Too many profile update attempts, please try again later.'
    }  
  }
});


router.get('/:userId',
  authenticateToken,
  validateUUIDParam('userId'),
  authorizeOwnerOrAdmin('userId'),
  UserController.getUserById
);

router.put('/:userId',
  authenticateToken,
  profileUpdateLimiter,
  validateUUIDParam('userId'),
  authorizeOwnerOrAdmin('userId'),
  validate(updateProfileSchema),
  logActivity('UPDATE_PROFILE', 'USER'),
  UserController.updateProfile
);

router.post('/:userId/avatar',
  authenticateToken,
  validateUUIDParam('userId'),
  authorizeOwnerOrAdmin('userId'),
  uploadUserAvatar,
  processUserAvatar,
  logActivity('UPLOAD_AVATAR', 'USER'),
  UserController.uploadAvatar
);

router.delete('/:userId',
  authenticateToken,
  sensitiveOperationsLimiter,
  validateUUIDParam('userId'),
  authorizeOwnerOrAdmin('userId'),
  logActivity('DEACTIVATE_PROFILE', 'USER'),
  UserController.deactivateAccount
);

router.get('/:userId/tickets',
  authenticateToken,
  validateUUIDParam('userId'),
  authorizeOwnerOrAdmin('userId'),
  validatePagination(),
  UserController.getTicketHistory
);

router.get('/:userId/orders',
  authenticateToken,
  validateUUIDParam('userId'),
  authorizeOwnerOrAdmin('userId'),
  validatePagination(),
  UserController.getOrderHistory
);

router.get('/:userId/stats',
  authenticateToken,
  validateUUIDParam('userId'),
  authorizeOwnerOrAdmin('userId'),
  async (req, res) => {
    try {
      const UserModel = require('../models/userModel');
      const { createResponse } = require('../utils/helpers');
      
      const stats = await UserModel.getUserStats(req.params.userId);
      
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
module.exports = router;