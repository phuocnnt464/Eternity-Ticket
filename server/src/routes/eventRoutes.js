// src/routes/eventRoutes.js
const express = require('express');
const rateLimit = require('express-rate-limit');
const EventController = require('../controllers/eventController');
const { 
  authenticateToken, 
  authorizeRoles, 
  optionalAuth 
} = require('../middleware/authMiddleware');
const { validate, validateUUIDParam } = require('../middleware/validationMiddleware');
const {
  uploadEventImages,
  processEventImages
} = require('../middleware/uploadMiddleware');
const {
  createEventSchema,
  updateEventSchema,
  eventQuerySchema,
  searchQuerySchema,
  uuidParamSchema,
  featuredEventsQuerySchema,
  rejectEventSchema,
  myEventsQuerySchema,
  slugParamSchema
} = require('../validations/eventValidation');

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
 * @route   GET /api/events
 * @desc    Get all public events with filtering and pagination
 * @access  Public
 */
router.get('/',
  validate(eventQuerySchema, 'query'),
  EventController.getEvents
);

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
 * @route   GET /api/events/slug/:slug
 * @desc    Get event by slug (SEO-friendly)
 * @access  Public
 */
router.get('/slug/:slug',
  validate(slugParamSchema, 'params'),
  optionalAuth,
  EventController.getEventBySlug
);

// Protected routes (authentication required)

/**
 * @route   POST /api/events
 * @desc    Create new event (Organizers only)
 * @access  Private (Organizer)
 */
router.post('/',
  eventCreationLimiter,
  authenticateToken,
  authorizeRoles(['organizer']),
  uploadEventImages,
  processEventImages,
  validate(createEventSchema),
  EventController.createEvent
);

/**
 * @route   GET /api/events/my/events
 * @desc    Get events created by current user
 * @access  Private (Organizer)
 */
router.get('/my/events',
  authenticateToken,
  authorizeRoles(['organizer']),
  validate(eventQuerySchema, 'query'),
  EventController.getMyEvents
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
  authorizeRoles(['organizer']),
  validateUUIDParam('id'),
  uploadEventImages,        
  processEventImages, 
  validate(updateEventSchema),
  EventController.updateEvent
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
  EventController.getEventStatistics
);

/**
 * @route   DELETE /api/events/:id
 * @desc    Delete event (Event owner only)
 * @access  Private (Event Owner)
 */
router.delete('/:id',
  authenticateToken,
  authorizeRoles(['organizer']),
  validateUUIDParam('id'),
  EventController.deleteEvent
);

// Admin routes (for future admin panel)

/**
 * @route   GET /api/events/admin/pending
 * @desc    Get pending events for admin approval
 * @access  Private (Admin)
 */
router.get('/admin/pending',
  authenticateToken,
  authorizeRoles(['admin', 'sub_admin']),
  EventController.getPendingEvents
);

/**
 * @route   PUT /api/events/:id/approve
 * @desc    Approve event (Admin only)
 * @access  Private (Admin)
 */
router.put('/:id/approve',
  authenticateToken,
  authorizeRoles(['admin', 'sub_admin']),
  validateUUIDParam('id'),
  EventController.approveEvent
);

/**
 * @route   PUT /api/events/:id/reject
 * @desc    Reject event (Admin only)
 * @access  Private (Admin)
 */
router.put('/:id/reject',
  authenticateToken,
  authorizeRoles(['admin', 'sub_admin']),
  validateUUIDParam('id'),
  validate(rejectEventSchema),
  EventController.rejectEvent
);

/**
 * @route   GET /api/events/debug/my-events
 * @desc    Debug my events
 * @access  Private (Organizer)
 */
router.get('/debug/my-events',
  authenticateToken,
  authorizeRoles(['organizer']),
  async (req, res) => {
    try {
      const organizerId = req.user.id;
      const pool = require('../config/database');
      
      console.log(`🔍 Debug my events for organizer: ${organizerId}`);
      
      // Check events created by this organizer
      const eventsQuery = `
        SELECT id, title, status, organizer_id, created_at ,
          (SELECT COUNT(*) FROM event_sessions WHERE event_id = e.id) as session_count,
          (SELECT COUNT(*) FROM ticket_types WHERE event_id = e.id) as ticket_count
        FROM events e
        WHERE organizer_id = $1 
        ORDER BY created_at DESC
      `;
      
      const eventsResult = await pool.query(eventsQuery, [organizerId]);
      
      console.log(`📊 Found ${eventsResult.rows.length} events`);
      
      const { createResponse } = require('../utils/helpers');
      res.json(createResponse(true, 'Debug info for my events', {
        organizer_id: organizerId,
        events_count: eventsResult.rows.length,
        events: eventsResult.rows
      }));
      
    } catch (error) {
      console.error('❌ Debug my events error:', error.message);
      const { createResponse } = require('../utils/helpers');
      res.status(500).json(createResponse(false, `Debug error: ${error.message}`));
    }
  }
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