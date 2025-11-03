// server/src/routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/notificationController');
const { authenticateToken } = require('../middleware/authMiddleware');

const { validate } = require('../middleware/validationMiddleware');
const Joi = require('joi');

// Validation schemas
const notificationIdSchema = Joi.object({
  notificationId: Joi.string().uuid().required()
});

const notificationQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
  unread_only: Joi.string().valid('true', 'false').default('false')
});

router.use(authenticateToken);

// Get notifications
router.get('/', 
    validate(notificationQuerySchema, 'query'), 
    NotificationController.getNotifications
);

// Get unread count
router.get('/unread-count', 
  NotificationController.getUnreadCount
);

// Mark as read
router.put('/:notificationId/read', 
    validate(notificationIdSchema, 'params'), 
    NotificationController.markAsRead
);

// Mark all as read
router.put('/read-all', 
    NotificationController.markAllAsRead
);

// Delete notification
router.delete('/:notificationId', 
    validate(notificationIdSchema, 'params'), 
    NotificationController.deleteNotification
);

module.exports = router;