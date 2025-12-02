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

const eventCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, 
  message: {
    success: false,
    error: {
      message: 'Too many events created, please try again later.',
      retry_after: '1 hour'
    }
  }
});

const eventUpdateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 50, 
  message: {
    success: false,
    error: {
      message: 'Too many event updates, please try again later.'
    }
  }
});

const privateEventLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 50, 
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

router.get('/categories', 
  EventController.getCategories
);

router.get('/public-settings',
  EventController.getPublicSettings
);

router.get('/featured',
  validate(featuredEventsQuerySchema, 'query'),
  EventController.getFeaturedEvents
);

router.get('/search',
  validate(searchQuerySchema, 'query'),
  EventController.searchEvents
);

router.get('/debug/my-events',
  authenticateToken,
  authorizeRoles('organizer'),
  EventController.debugMyEvents
);

router.get('/my/all-events',
  authenticateToken,
  authorizeRoles('organizer'),
  validate(eventQuerySchema, 'query'),
  EventController.getMyEvents
);

router.get('/admin/pending',
  authenticateToken,
  authorizeRoles('admin', 'sub_admin'),
  EventController.getPendingEvents
);

router.get('/slug/:slug',
  privateEventLimiter,
  validate(slugParamSchema, 'params'),
  optionalAuth,
  EventController.getEventBySlug
);

router.get('/:id/statistics',
  authenticateToken,
  // authorizeRoles('organizer'),
  validateUUIDParam('id'),
  authorizeEventOrganizer('id'),
  EventController.getEventStatistics
);

router.get('/my/stats',
  authenticateToken,
  authorizeRoles('organizer'),
  EventController.getOrganizerStats
);

router.get('/team-events',
  authenticateToken,
  EventController.getTeams
)

router.get('/',
  validate(eventQuerySchema, 'query'),
  EventController.getEvents
);

router.post('/',
  eventCreationLimiter,
  authenticateToken,
  authorizeRoles('organizer'),
  uploadEventImages,
  processEventImages,
  parseJSONFields,
  validateEventCreation, 
  logActivity('CREATE_EVENT', 'EVENT'),
  EventController.createEvent
);

router.get('/:id',
  validateUUIDParam('id'),
  optionalAuth,
  EventController.getEventById
);

router.put('/:id',
  eventUpdateLimiter,
  authenticateToken,
  validateUUIDParam('id'),
  authorizeEventOrganizer('id'),
  requireEventRole('owner', 'manager'),
  uploadEventImages,        
  processEventImages, 
  validate(updateEventSchema),
  logActivity('UPDATE_EVENT', 'EVENT'),
  EventController.updateEvent
);

router.post('/:id/submit',
  authenticateToken,
  validateUUIDParam('id'),
  authorizeEventOrganizer('id'),
  requireEventRole('owner'),
  logActivity('SUBMIT_EVENT_FOR_APPROVAL', 'EVENT'),
  EventController.submitEventForApproval
);

router.delete('/:id',
  authenticateToken,
  authorizeRoles('organizer'),
  validateUUIDParam('id'),
  authorizeEventOrganizer('id'),
  requireEventRole('owner'),
  logActivity('DELETE_EVENT', 'EVENT'),
  EventController.deleteEvent
);

router.get('/:eventId/members',
  authenticateToken,
  validateUUIDParam('eventId'),
  authorizeEventOrganizer('eventId'),
  requireEventRole('owner', 'manager', 'checkin_staff'),
  EventController.getEventMembers
);

router.post('/:eventId/members',
  authenticateToken,
  validateUUIDParam('eventId'),
  authorizeEventOrganizer('eventId'),
  requireEventRole('owner', 'manager'),
  validate(addEventMemberSchema),
  EventController.addEventMember
);

router.delete('/:eventId/members/:userId',
  authenticateToken,
  validateUUIDParams('eventId', 'userId'),
  authorizeEventOrganizer('eventId'),
  requireEventRole('owner'),
  EventController.removeEventMember
);

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

router.post('/invitations/:token/accept',
  authenticateToken,
  EventController.acceptInvitation
);

router.get('/:id/orders',
  authenticateToken,
  validateUUIDParam('id'),
  authorizeEventOrganizer('id'),
  requireEventRole('owner', 'manager'),
  validatePagination(),
  EventController.getEventOrders
);

router.get('/:id/attendees',
  authenticateToken,
  validateUUIDParam('id'),
  authorizeEventOrganizer('id'),
  requireEventRole('owner', 'manager', 'checkin_staff'),
  validatePagination(),
  EventController.getAttendees
);

module.exports = router;