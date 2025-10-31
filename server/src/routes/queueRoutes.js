// server/src/routes/queueRoutes.js
const express = require('express');
const rateLimit = require('express-rate-limit');
const QueueController = require('../controllers/queueController');
const { 
  authenticateToken, 
  authorizeRoles
} = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const Joi = require('joi');

const router = express.Router();

// Rate limiting
const queueLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: {
    success: false,
    message: 'Too many queue requests, please slow down.'
  }
});

// Validation schemas
const joinQueueSchema = Joi.object({
  session_id: Joi.string().uuid().required()
});

const heartbeatSchema = Joi.object({
  session_id: Joi.string().uuid().required()
});

const sessionIdParamSchema = Joi.object({
  sessionId: Joi.string().uuid().required()
});

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   POST /api/queue/join
 * @desc    Join waiting room queue
 * @access  Private (Participant)
 */
router.post('/join',
  queueLimiter,
  authorizeRoles('participant'),
  validate(joinQueueSchema),
  QueueController.joinQueue
);

/**
 * @route   GET /api/queue/status/:sessionId
 * @desc    Get queue status
 * @access  Private
 */
router.get('/status/:sessionId',
  validate(sessionIdParamSchema, 'params'),
  QueueController.getStatus
);

/**
 * @route   POST /api/queue/heartbeat
 * @desc    Update heartbeat
 * @access  Private
 */
router.post('/heartbeat',
  validate(heartbeatSchema),
  QueueController.heartbeat
);

/**
 * @route   DELETE /api/queue/leave/:sessionId
 * @desc    Leave queue
 * @access  Private
 */
router.delete('/leave/:sessionId',
  validate(sessionIdParamSchema, 'params'),
  QueueController.leaveQueue
);

/**
 * @route   GET /api/queue/statistics/:sessionId
 * @desc    Get queue statistics
 * @access  Private (Organizer/Admin)
 */
router.get('/statistics/:sessionId',
  validate(sessionIdParamSchema, 'params'),
  QueueController.getStatistics
);

module.exports = router;