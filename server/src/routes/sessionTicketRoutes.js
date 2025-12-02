const express = require('express');
const rateLimit = require('express-rate-limit');
const SessionTicketController = require('../controllers/sessionTicketController');
const { 
  authenticateToken, 
  authorizeRoles,
  optionalAuth 
} = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const {
  createSessionSchema,
  updateSessionSchema,
  createTicketTypeSchema,
  updateTicketTypeSchema,
  uuidParamSchema
} = require('../validations/sessionTicketValidation');

const router = express.Router();

const sessionTicketLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, 
  max: 50,
  message: {
    success: false,
    message: 'Too many session/ticket operations, please try again later.'
  }
});

router.post('/:eventId/sessions',
  sessionTicketLimiter,
  authenticateToken,
  authorizeRoles('organizer'),
  validate(uuidParamSchema, 'params'),
  validate(createSessionSchema),
  SessionTicketController.createSession
);

router.get('/:eventId/sessions',
  validate(uuidParamSchema, 'params'),
  SessionTicketController.getEventSessions
);

router.put('/session/:sessionId',
  sessionTicketLimiter,
  authenticateToken,
  authorizeRoles('organizer'),
  validate(uuidParamSchema, 'params'),
  validate(updateSessionSchema),
  SessionTicketController.updateSession
);

router.delete('/session/:sessionId',
  authenticateToken,
  authorizeRoles('organizer'),
  validate(uuidParamSchema, 'params'),
  SessionTicketController.deleteSession
);

router.post('/session/:sessionId/tickets',
  sessionTicketLimiter,
  authenticateToken,
  authorizeRoles('organizer'),
  validate(uuidParamSchema, 'params'),
  validate(createTicketTypeSchema),
  SessionTicketController.createTicketType
);

router.get('/session/:sessionId/tickets',
  validate(uuidParamSchema, 'params'),
  SessionTicketController.getSessionTicketTypes
);

router.put('/ticket/:ticketTypeId',
  sessionTicketLimiter,
  authenticateToken,
  authorizeRoles('organizer'),
  validate(uuidParamSchema, 'params'),
  validate(updateTicketTypeSchema),
  SessionTicketController.updateTicketType
);

router.delete('/ticket/:ticketTypeId',
  authenticateToken,
  authorizeRoles('organizer'),
  validate(uuidParamSchema, 'params'),
  SessionTicketController.deleteTicketType
);

router.get('/:eventId/tickets',
  validate(uuidParamSchema, 'params'),
  optionalAuth,
  SessionTicketController.getEventWithTickets
);

module.exports = router;