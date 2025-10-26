// src/routes/eventRoutes.js
const express = require('express');
const rateLimit = require('express-rate-limit');
const Joi = require('joi');
const EventController = require('../controllers/eventController');
const { 
  authenticateToken, 
  authorizeRoles, 
  optionalAuth,
  authorizeEventOrganizer,
  requireEventRole
} = require('../middleware/authMiddleware');
const { validate, validateUUIDParam, validateUUIDParams } = require('../middleware/validationMiddleware');
const {
  uploadEventImages,
  processEventImages
} = require('../middleware/uploadMiddleware');
const { 
  logActivity, 
  logAdminAudit 
} = require('../middleware/activityLogger');
const {
  createEventSchema,
  updateEventSchema,
  eventQuerySchema,
  searchQuerySchema,
  featuredEventsQuerySchema,
  rejectEventSchema,
  slugParamSchema
} = require('../validations/eventValidation');
const e = require('express');

const router = express.Router();

// Rate limiting for event operations
const eventCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 event creations per hour
  message: {
    success: false,
    error: {
      message: 'Too many events created, please try again later.',
      retry_after: '1 hour'
    }
  }
});

const eventUpdateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 updates per 15 minutes
  message: {
    success: false,
    error: {
      message: 'Too many event updates, please try again later.'
    }
  }
});

// Public routes (no authentication required)

/**
 * @route   GET /api/events/categories
 * @desc    Get all event categories
 * @access  Public
 */
router.get('/categories', 
  EventController.getCategories
);

/**
 * @route   GET /api/events/featured
 * @desc    Get featured/trending events
 * @access  Public
 */
router.get('/featured',
  validate(featuredEventsQuerySchema, 'query'),
  EventController.getFeaturedEvents
);

/**
 * @route   GET /api/events/search
 * @desc    Search events
 * @access  Public
 */
router.get('/search',
  validate(searchQuerySchema, 'query'),
  EventController.searchEvents
);

/**
 * @route   GET /api/events/debug/my-events
 * @desc    Debug my events
 * @access  Private (Organizer)
 */
router.get('/debug/my-events',
  authenticateToken,
  authorizeRoles('organizer'),
  EventController.debugMyEvents
);

/**
 * @route   GET /api/events/my/events
 * @desc    Get events created by current user
 * @access  Private (Organizer)
 */
router.get('/my/events',
  authenticateToken,
  authorizeRoles('organizer'),
  validate(eventQuerySchema, 'query'),
  EventController.getMyEvents
);

/**
 * @route   GET /api/events/admin/pending
 * @desc    Get pending events for admin approval
 * @access  Private (Admin)
 */
router.get('/admin/pending',
  authenticateToken,
  authorizeRoles('admin', 'sub_admin'),
  EventController.getPendingEvents
);

/**
 * @route   GET /api/events/slug/:slug
 * @desc    Get event by slug (SEO-friendly)
 * @access  Public
 */
router.get('/slug/:slug',
  validate(slugParamSchema, 'params'),
  optionalAuth,
  EventController.getEventBySlug
);

/**
 * @route   GET /api/events/:id/statistics
 * @desc    Get event statistics for organizer dashboard
 * @access  Private (Organizer - Owner/Manager)
 */
router.get('/:id/statistics',
  authenticateToken,
  authorizeRoles('organizer'),
  validateUUIDParam('id'),
  authorizeEventOrganizer('id'),
  EventController.getEventStatistics
);

// Admin routes (for future admin panel)

/**
 * @route   PUT /api/events/:id/approve
 * @desc    Approve event (Admin only)
 * @access  Private (Admin)
 */
router.put('/:id/approve',
  authenticateToken,
  authorizeRoles('admin', 'sub_admin'),
  validateUUIDParam('id'),
  logAdminAudit('APPROVE_EVENT', 'EVENT'),
  EventController.approveEvent
);

/**
 * @route   PUT /api/events/:id/reject
 * @desc    Reject event (Admin only)
 * @access  Private (Admin)
 */
router.put('/:id/reject',
  authenticateToken,
  authorizeRoles('admin', 'sub_admin'),
  validateUUIDParam('id'),
  validate(rejectEventSchema),
  logAdminAudit('REJECT_EVENT', 'EVENT'),
  EventController.rejectEvent
);

/**
 * @route   GET /api/events
 * @desc    Get all public events with filtering and pagination
 * @access  Public
 */
router.get('/',
  validate(eventQuerySchema, 'query'),
  EventController.getEvents
);

/**
 * @route   POST /api/events
 * @desc    Create new event (Organizers only)
 * @access  Private (Organizer)
 */
router.post('/',
  eventCreationLimiter,
  authenticateToken,
  authorizeRoles('organizer'),
  uploadEventImages,
  processEventImages,
  validate(createEventSchema),
  logActivity('CREATE_EVENT', 'EVENT'),
  EventController.createEvent
);

/**
 * @route   GET /api/events/:id
 * @desc    Get single event by ID (with optional authentication for private events)
 * @access  Public/Private
 */
router.get('/:id',
  validateUUIDParam('id'),
  optionalAuth,
  EventController.getEventById
);

/**
 * @route   PUT /api/events/:id
 * @desc    Update event (Event owner/manager only)
 * @access  Private (Event Owner/Manager)
 */
router.put('/:id',
  eventUpdateLimiter,
  authenticateToken,
  authorizeRoles('organizer'),
  validateUUIDParam('id'),
  authorizeEventOrganizer('id'),
  requireEventRole('owner', 'manager'),
  uploadEventImages,        
  processEventImages, 
  validate(updateEventSchema),
  logActivity('UPDATE_EVENT', 'EVENT'),
  EventController.updateEvent
);



/**
 * @route   DELETE /api/events/:id
 * @desc    Delete event (Event owner only)
 * @access  Private (Event Owner)
 */
router.delete('/:id',
  authenticateToken,
  authorizeRoles('organizer'),
  validateUUIDParam('id'),
  authorizeEventOrganizer('id'),
  requireEventRole('owner'),
  logActivity('DELETE_EVENT', 'EVENT'),
  EventController.deleteEvent
);

// Thêm vào cuối file trước module.exports

/**
 * @route   POST /api/events/:eventId/members
 * @desc    Add team member to event
 * @access  Private (Event Owner/Manager)
 */
router.post('/:eventId/members',
  authenticateToken,
  authorizeRoles('organizer'),
  validateUUIDParam('eventId'),
  authorizeEventOrganizer('eventId'),
  requireEventRole('owner', 'manager'),
  validate(Joi.object({
    email: Joi.string().email().required(),
    role: Joi.string().valid('manager', 'checkin_staff').required()
  })),
  EventController.addEventMember
);

/**
 * @route   GET /api/events/:eventId/members
 * @desc    Get event team members
 * @access  Private (Event Team)
 */
router.get('/:eventId/members',
  authenticateToken,
  authorizeRoles('organizer'),
  validateUUIDParam('eventId'),
  authorizeEventOrganizer('eventId'),
  EventController.getEventMembers
);

/**
 * @route   DELETE /api/events/:eventId/members/:memberId
 * @desc    Remove team member
 * @access  Private (Event Owner only)
 */
router.delete('/:eventId/members/:memberId',
  authenticateToken,
  authorizeRoles('organizer'),
  validateUUIDParams('eventId', 'memberId'),
  authorizeEventOrganizer('eventId'),
  requireEventRole('owner'),
  EventController.removeEventMember
);

/**
 * @route   GET /api/events/health
 * @desc    Event routes health check
 * @access  Public
 */
router.get('/health', (req, res) => {
  const { createResponse } = require('../utils/helpers');
  res.json(createResponse(
    true,
    'Event routes are working',
    {
      timestamp: new Date().toISOString(),
      endpoints: {
        public: [
          'GET /api/events',
          'GET /api/events/categories',
          'GET /api/events/featured',
          'GET /api/events/search',
          'GET /api/events/slug/:slug',
          'GET /api/events/:id'
        ],
        organizer: [
          'POST /api/events',
          'GET /api/events/my/events',
          'PUT /api/events/:id',
          'POST /api/events/:id/submit',
          'GET /api/events/:id/statistics',
          'DELETE /api/events/:id'
        ],
        admin: [
          'GET /api/events/admin/pending',
          'POST /api/events/:id/approve',
          'POST /api/events/:id/reject'
        ]
      }
    }
  ));
});

module.exports = router;