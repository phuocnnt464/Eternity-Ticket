// src/routes/sessionTicketRoutes.js
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

// Rate limiting for session/ticket operations
const sessionTicketLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // limit each IP to 50 operations per hour
  message: {
    success: false,
    message: 'Too many session/ticket operations, please try again later.'
  }
});

// ===============================
// SESSION ROUTES
// ===============================

/**
 * @route   POST /api/sessions/:eventId/sessions
 * @desc    Create new session for event
 * @access  Private (Event Owner/Manager)
 */
router.post('/:eventId/sessions',
  sessionTicketLimiter,
  authenticateToken,
  authorizeRoles('organizer'),
  validate(uuidParamSchema, 'params'),
  validate(createSessionSchema),
  SessionTicketController.createSession
);

/**
 * @route   GET /api/sessions/:eventId/sessions
 * @desc    Get all sessions for event
 * @access  Public
 */
router.get('/:eventId/sessions',
  validate(uuidParamSchema, 'params'),
  SessionTicketController.getEventSessions
);

/**
 * @route   PUT /api/sessions/session/:sessionId
 * @desc    Update session
 * @access  Private (Event Owner/Manager)
 */
router.put('/session/:sessionId',
  sessionTicketLimiter,
  authenticateToken,
  authorizeRoles('organizer'),
  validate(uuidParamSchema, 'params'),
  validate(updateSessionSchema),
  SessionTicketController.updateSession
);

/**
 * @route   DELETE /api/sessions/session/:sessionId
 * @desc    Delete session (soft delete)
 * @access  Private (Event Owner/Manager)
 */
router.delete('/session/:sessionId',
  authenticateToken,
  authorizeRoles('organizer'),
  validate(uuidParamSchema, 'params'),
  SessionTicketController.deleteSession
);

// ===============================
// TICKET TYPE ROUTES
// ===============================

/**
 * @route   POST /api/sessions/session/:sessionId/tickets
 * @desc    Create ticket type for session
 * @access  Private (Event Owner/Manager)
 */
router.post('/session/:sessionId/tickets',
  sessionTicketLimiter,
  authenticateToken,
  authorizeRoles('organizer'),
  validate(uuidParamSchema, 'params'),
  validate(createTicketTypeSchema),
  SessionTicketController.createTicketType
);

/**
 * @route   GET /api/sessions/session/:sessionId/tickets
 * @desc    Get ticket types for session
 * @access  Public
 */
router.get('/session/:sessionId/tickets',
  validate(uuidParamSchema, 'params'),
  SessionTicketController.getSessionTicketTypes
);

/**
 * @route   PUT /api/sessions/ticket/:ticketTypeId
 * @desc    Update ticket type
 * @access  Private (Event Owner/Manager)
 */
router.put('/ticket/:ticketTypeId',
  sessionTicketLimiter,
  authenticateToken,
  authorizeRoles('organizer'),
  validate(uuidParamSchema, 'params'),
  validate(updateTicketTypeSchema),
  SessionTicketController.updateTicketType
);

/**
 * @route   DELETE /api/sessions/ticket/:ticketTypeId
 * @desc    Delete ticket type (soft delete)
 * @access  Private (Event Owner/Manager)
 */
router.delete('/ticket/:ticketTypeId',
  authenticateToken,
  authorizeRoles('organizer'),
  validate(uuidParamSchema, 'params'),
  SessionTicketController.deleteTicketType
);

// ===============================
// COMBINED ROUTES
// ===============================

/**
 * @route   GET /api/sessions/:eventId/tickets
 * @desc    Get event with all sessions and ticket types (for purchase page)
 * @access  Public (with optional auth for private events)
 */
router.get('/:eventId/tickets',
  validate(uuidParamSchema, 'params'),
  optionalAuth,
  SessionTicketController.getEventWithTickets
);

module.exports = router;