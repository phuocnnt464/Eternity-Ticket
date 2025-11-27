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
const { validate, validateUUIDParam, validateUUIDParams, validatePagination } = require('../middleware/validationMiddleware');
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
  createDraftEventSchema,
  updateEventSchema,
  eventQuerySchema,
  searchQuerySchema,
  featuredEventsQuerySchema,
  rejectEventSchema,
  slugParamSchema,
  addEventMemberSchema,
  updateMemberRoleSchema
} = require('../validations/eventValidation');

const router = express.Router();

// Rate limiting for event operations
const eventCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // limit each IP to 100 event creations per hour
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
  max: 50, // limit each IP to 50 updates per 15 minutes
  message: {
    success: false,
    error: {
      message: 'Too many event updates, please try again later.'
    }
  }
});

// ✅ Thêm limiter cho private event access
const privateEventLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 attempts per 15 minutes
  message: {
    success: false,
    message: 'Too many failed access attempts. Try again later.'
  },
  skipSuccessfulRequests: true // Chỉ count failed attempts
});

const parseJSONFields = (req, res, next) => {
  console.log('📦 req.body before parsing:', req.body);
  if (req.body.payment_account_info && typeof req.body.payment_account_info === 'string') {
    try {
      req.body.payment_account_info = JSON.parse(req.body.payment_account_info);
      console.log('✅ Parsed payment_account_info:', req.body.payment_account_info);
    } catch (error) {
      console.error('❌ Failed to parse payment_account_info:', error);
      return res.status(400).json({
        success: false,
        message: 'Invalid payment_account_info format'
      });
    }
  }
  
  if (req.body.additional_info && typeof req.body.additional_info === 'string') {
    try {
      req.body.additional_info = JSON.parse(req.body.additional_info);
    } catch (error) {
      console.error('❌ Failed to parse additional_info:', error);
    }
  }
  
  next();
};

const validateEventCreation = (req, res, next) => {
  const isDraft = req.body.status === 'draft';
  const schema = isDraft ? createDraftEventSchema : createEventSchema;
  
  const { error } = schema.validate(req.body, { abortEarly: false });
  
  if (error) {
    const errors = {};
    error.details.forEach(detail => {
      errors[detail.path[0]] = detail.message;
    });
    
    console.log('⚠️ Validation error:', errors);
    
    return res.status(400).json({
      success: false,
      timestamp: new Date().toISOString(),
      message: 'Validation failed. Please check your input and try again.',
      meta: { errors }
    });
  }
  
  next();
};

// Public routes (no authentication required)

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
          'GET /api/events/my/all-events',
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

/**
 * @route   GET /api/events/categories
 * @desc    Get all event categories
 * @access  Public
 */
router.get('/categories', 
  EventController.getCategories
);

/**
 * @route   GET /api/events/public-settings
 * @desc    Get public system settings
 * @access  Public
 */
router.get('/public-settings',
  EventController.getPublicSettings
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
 * @route   GET /api/events/my/all-events
 * @desc    Get events created by current user
 * @access  Private (Organizer)
 */
router.get('/my/all-events',
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
  privateEventLimiter,
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

/**
 * @route   GET /api/events/my/stats
 * @desc    Get organizer dashboard statistics
 * @access  Private (Organizer)
 */
router.get('/my/stats',
  authenticateToken,
  authorizeRoles('organizer'),
  EventController.getOrganizerStats
);

router.get('/team-events',
  authenticateToken,
  EventController.getTeams
)

// Admin routes (for future admin panel)

/**
 * @route   PUT /api/events/:id/approve
 * @desc    Approve event (Admin only)
 * @access  Private (Admin)
 */
// router.put('/:id/approve',
//   authenticateToken,
//   authorizeRoles('admin', 'sub_admin'),
//   validateUUIDParam('id'),
//   logAdminAudit('APPROVE_EVENT', 'EVENT'),
//   EventController.approveEvent
// );

/**
 * @route   PUT /api/events/:id/reject
 * @desc    Reject event (Admin only)
 * @access  Private (Admin)
 */
// router.put('/:id/reject',
//   authenticateToken,
//   authorizeRoles('admin', 'sub_admin'),
//   validateUUIDParam('id'),
//   validate(rejectEventSchema),
//   logAdminAudit('REJECT_EVENT', 'EVENT'),
//   EventController.rejectEvent
// );

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
  parseJSONFields,
  // validate(createEventSchema),
  validateEventCreation, 
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
 * @route   POST /api/events/:id/submit
 * @desc    Submit event for admin approval
 * @access  Private (Event Owner)
 */
router.post('/:id/submit',
  authenticateToken,
  authorizeRoles('organizer'),
  validateUUIDParam('id'),
  authorizeEventOrganizer('id'),
  requireEventRole('owner'),
  logActivity('SUBMIT_EVENT_FOR_APPROVAL', 'EVENT'),
  EventController.submitEventForApproval
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

/**
 * @route   GET /api/events/:eventId/members
 * @desc    Get event team members
 * @access  Private (Event Team)
 */
router.get('/:eventId/members',
  authenticateToken,
  validateUUIDParam('eventId'),
  authorizeEventOrganizer('eventId'),
  requireEventRole('owner', 'manager'),
  EventController.getEventMembers
);

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
  validate(addEventMemberSchema),
  EventController.addEventMember
);

/**
 * @route   DELETE /api/events/:eventId/members/:userId
 * @desc    Remove team member
 * @access  Private (Event Owner only)
 */
router.delete('/:eventId/members/:userId',
  authenticateToken,
  authorizeRoles('organizer'),
  validateUUIDParams('eventId', 'userId'),
  authorizeEventOrganizer('eventId'),
  requireEventRole('owner'),
  EventController.removeEventMember
);

/**
 * @route   PATCH /api/events/:eventId/members/:userId
 * @desc    Update member role
 * @access  Private (Event Owner)
 */
router.patch('/:eventId/members/:userId',
  authenticateToken,
  validateUUIDParams('eventId', 'userId'),
  authorizeEventOrganizer('eventId'),
  requireEventRole('owner'),
  validate(updateMemberRoleSchema),
  EventController.updateMemberRole
);

router.get('/image-requirements',
  EventController.getImageRequirements
);

/**
 * @route   POST /api/events/invitations/:token/accept
 * @desc    Accept event team invitation
 * @access  Private
 */
router.post('/invitations/:token/accept',
  authenticateToken,
  EventController.acceptInvitation
);

/**
 * @route   GET /api/events/:id/orders
 * @desc    Get orders for this event
 * @access  Private (Event Owner/Manager)
 */
router.get('/:id/orders',
  authenticateToken,
  authorizeRoles('organizer', 'admin', 'sub_admin'),
  validateUUIDParam('id'),
  authorizeEventOrganizer('id'),
  requireEventRole('owner', 'manager'),
  validatePagination(),
  EventController.getEventOrders
);

/**
 * @route   GET /api/events/:id/attendees
 * @desc    Get attendees list for this event
 * @access  Private (Event Owner/Manager)
 */
router.get('/:id/attendees',
  authenticateToken,
  authorizeRoles('organizer', 'admin', 'sub_admin'),
  validateUUIDParam('id'),
  authorizeEventOrganizer('id'),
  requireEventRole('owner', 'manager', 'checkin_staff'),
  validatePagination(),
  EventController.getAttendees
);

module.exports = router;