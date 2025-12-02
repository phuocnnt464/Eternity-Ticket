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

const queueLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: {
    success: false,
    message: 'Too many queue requests, please slow down.'
  }
});

const joinQueueSchema = Joi.object({
  session_id: Joi.string().uuid().required()
});

const heartbeatSchema = Joi.object({
  session_id: Joi.string().uuid().required()
});

const sessionIdParamSchema = Joi.object({
  sessionId: Joi.string().uuid().required()
});

router.use(authenticateToken);

router.post('/join',
  queueLimiter,
  authorizeRoles('participant'),
  validate(joinQueueSchema),
  QueueController.joinQueue
);

router.get('/status/:sessionId',
  validate(sessionIdParamSchema, 'params'),
  QueueController.getStatus
);

router.post('/heartbeat',
  validate(heartbeatSchema),
  QueueController.heartbeat
);

router.delete('/leave/:sessionId',
  validate(sessionIdParamSchema, 'params'),
  QueueController.leaveQueue
);

router.get('/statistics/:sessionId',
  validate(sessionIdParamSchema, 'params'),
  QueueController.getStatistics
);

module.exports = router;