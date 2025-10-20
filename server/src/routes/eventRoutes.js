// src/routes/eventRoutes.js
const express = require('express');
const rateLimit = require('express-rate-limit');
const EventController = require('../controllers/eventController');
const { 
  authenticateToken, 
  authorizeRoles, 
  optionalAuth 
} = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');
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
  featuredEventsQuerySchema
} = require('../validations/eventValidation');

const router = express.Router();

// Rate limiting for event operations
const eventCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 event creations per hour
  message: {
    success: false,
    message: 'Too many events created, please try again later.',
    retry_after: '1 hour'
  }
});

const eventUpdateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 updates per 15 minutes
  message: {
    success: false,
    message: 'Too many event updates, please try again later.'
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
router.get('/categories', EventController.getCategories);

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
 * @route   GET /api/events/:id
 * @desc    Get single event by ID (with optional authentication for private events)
 * @access  Public/Private
 */
router.get('/:id',
  validate(uuidParamSchema, 'params'),
  optionalAuth,
  EventController.getEventById
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
 * @route   PUT /api/events/:id
 * @desc    Update event (Event owner/manager only)
 * @access  Private (Event Owner/Manager)
 */
router.put('/:id',
  eventUpdateLimiter,
  authenticateToken,
  authorizeRoles(['organizer']),
  uploadEventImages,        
  processEventImages, 
  validate(uuidParamSchema, 'params'),
  validate(updateEventSchema),
  EventController.updateEvent
);

/**
 * @route   DELETE /api/events/:id
 * @desc    Delete event (Event owner only)
 * @access  Private (Event Owner)
 */
router.delete('/:id',
  authenticateToken,
  authorizeRoles(['organizer']),
  validate(uuidParamSchema, 'params'),
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
  (req, res) => {
    // Placeholder for admin functionality
    const { createResponse } = require('../utils/helpers');
    res.json(createResponse(
      true,
      'Admin functionality will be implemented in future updates',
      { pending_events: [] }
    ));
  }
);

/**
 * @route   PUT /api/events/:id/approve
 * @desc    Approve event (Admin only)
 * @access  Private (Admin)
 */
router.put('/:id/approve',
  authenticateToken,
  authorizeRoles(['admin', 'sub_admin']),
  validate(uuidParamSchema, 'params'),
  (req, res) => {
    // Placeholder for admin event approval
    const { createResponse } = require('../utils/helpers');
    res.json(createResponse(
      true,
      'Event approval functionality will be implemented in future updates'
    ));
  }
);

/**
 * @route   PUT /api/events/:id/reject
 * @desc    Reject event (Admin only)
 * @access  Private (Admin)
 */
router.put('/:id/reject',
  authenticateToken,
  authorizeRoles(['admin', 'sub_admin']),
  validate(uuidParamSchema, 'params'),
  (req, res) => {
    // Placeholder for admin event rejection
    const { createResponse } = require('../utils/helpers');
    res.json(createResponse(
      true,
      'Event rejection functionality will be implemented in future updates'
    ));
  }
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
        SELECT id, title, status, organizer_id, created_at 
        FROM events 
        WHERE organizer_id = $1 
        ORDER BY created_at DESC
      `;
      
      const eventsResult = await pool.query(eventsQuery, [organizerId]);
      
      console.log(`📊 Found ${eventsResult.rows.length} events for organizer`);
      
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

module.exports = router;