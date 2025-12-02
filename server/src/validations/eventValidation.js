const Joi = require('joi');

const createEventSchema = Joi.object({
  title: Joi.string()
    .min(5)
    .max(200)
    .required()
    .messages({
      'string.min': 'Event title must be at least 5 characters',
      'string.max': 'Event title cannot exceed 200 characters',
      'any.required': 'Event title is required'
    }),

  description: Joi.string()
    .min(20)
    .max(5000)
    .required()
    .messages({
      'string.min': 'Event description must be at least 20 characters',
      'string.max': 'Event description cannot exceed 5000 characters',
      'any.required': 'Event description is required'
    }),

  short_description: Joi.string()
    .max(500)
    .optional()
    .messages({
      'string.max': 'Short description cannot exceed 500 characters'
    }),

  category_id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.uuid': 'Invalid category ID format',
      'any.required': 'Event category is required'
    }),

  start_date: Joi.date()
    .iso()
    .optional()  
    .messages({
      'date.base': 'Start date must be a valid date',
      'date.format': 'Start date must be in ISO format'
    }),

  end_date: Joi.date()
    .iso()
    .min(Joi.ref('start_date'))
    .optional()  
    .messages({
      'date.base': 'End date must be a valid date',
      'date.format': 'End date must be in ISO format',
      'date.min': 'End date must be after start date'
    }),

  venue_name: Joi.string()
    .min(2)
    .max(200)
    .required()
    .messages({
      'string.min': 'Venue name must be at least 2 characters',
      'string.max': 'Venue name cannot exceed 200 characters',
      'any.required': 'Venue name is required'
    }),

  venue_address: Joi.string()
    .min(5)
    .max(500)
    .required()
    .messages({
      'string.min': 'Venue address must be at least 5 characters',
      'string.max': 'Venue address cannot exceed 500 characters',
      'any.required': 'Venue address is required'
    }),

  venue_city: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'Venue city must be at least 2 characters',
      'string.max': 'Venue city cannot exceed 100 characters',
      'any.required': 'Venue city is required'
    }),

  organizer_name: Joi.string()
    .min(2)
    .max(200)
    .required()
    .messages({
      'string.min': 'Organizer name must be at least 2 characters',
      'string.max': 'Organizer name cannot exceed 200 characters',
      'any.required': 'Organizer name is required'
    }),

  organizer_description: Joi.string()
    .max(1000)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Organizer description cannot exceed 1000 characters'
    }),

  organizer_contact_email: Joi.string()
    .email()
    .optional()
    .messages({
      'string.email': 'Please provide a valid organizer contact email'
    }),

  organizer_contact_phone: Joi.string()
    .pattern(/^[0-9+\-\s()]{10,20}$/)
    .optional()
    .allow('')
    .messages({
      'string.pattern.base': 'Please provide a valid organizer contact phone number'
    }),

  privacy_type: Joi.string()
    .valid('public', 'private')
    .default('public')
    .messages({
      'any.only': 'Privacy type must be either public or private'
    }),

  payment_account_info: Joi.object()
    .required()
    .messages({
      'any.required': 'Payment account information is required'
    }),

  status: Joi.string()
    .valid('draft', 'pending')
    .optional()
    .default('draft')
    .messages({ 
      'any.only': 'Status must be either draft or pending' 
    }),

  terms_and_conditions: Joi.string()
    .max(3000)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Terms and conditions cannot exceed 3000 characters'
    }),

  additional_info: Joi.object().optional(),

  cover_image: Joi.string().optional().allow(''),
  thumbnail_image: Joi.string().optional().allow(''),
  logo_image: Joi.string().optional().allow(''),
  venue_map_image: Joi.string().optional().allow('')
});

const createDraftEventSchema = Joi.object({
  // Basic Info
  title: Joi.string()
    .max(200)
    .optional()
    .allow('')
    .messages({ 'string.max': 'Event title cannot exceed 200 characters' }),

  description: Joi.string()
    .max(5000)
    .optional()
    .allow('')
    .messages({ 'string.max': 'Event description cannot exceed 5000 characters' }),

  short_description: Joi.string()
    .max(500)
    .optional()
    .allow('')
    .messages({ 'string.max': 'Short description cannot exceed 500 characters' }),

  category_id: Joi.string()
    .uuid()
    .optional()
    .allow('')
    .messages({ 'string.uuid': 'Invalid category ID format' }),

  // Venue Info
  venue_name: Joi.string()
    .max(200)
    .optional()
    .allow('')
    .messages({ 'string.max': 'Venue name cannot exceed 200 characters' }),

  venue_address: Joi.string()
    .max(500)
    .optional()
    .allow('')
    .messages({ 'string.max': 'Venue address cannot exceed 500 characters' }),

  venue_city: Joi.string()
    .max(100)
    .optional()
    .allow('')
    .messages({ 'string.max': 'Venue city cannot exceed 100 characters' }),

  venue_coordinates: Joi.string()
    .optional()
    .allow(''),

  // Organizer Info
  organizer_name: Joi.string()
    .max(200)
    .optional()
    .allow('')
    .messages({ 'string.max': 'Organizer name cannot exceed 200 characters' }),

  organizer_description: Joi.string()
    .max(1000)
    .optional()
    .allow('')
    .messages({ 'string.max': 'Organizer description cannot exceed 1000 characters' }),

  organizer_contact_email: Joi.string()
    .optional()
    .allow('')
    .messages({}),

  organizer_contact_phone: Joi.string()
    .optional()
    .allow('')
    .messages({}),

  privacy_type: Joi.string()
    .valid('public', 'private')
    .optional()
    .default('public')
    .messages({ 'any.only': 'Privacy type must be either public or private' }),

  private_access_code: Joi.string()
    .optional()
    .allow(''),

  payment_account_info: Joi.object()
    .optional()
    .allow(null, {}) 
    .messages({}),

  booking_confirmation_content: Joi.string()
    .optional()
    .allow('')
    .messages({}),

  terms_and_conditions: Joi.string()
    .max(3000)
    .optional()
    .allow('')
    .messages({ 'string.max': 'Terms and conditions cannot exceed 3000 characters' }),

  additional_info: Joi.object()
    .optional(),

  status: Joi.string()
    .valid('draft', 'pending')
    .optional()
    .default('draft')
    .messages({ 'any.only': 'Status must be either draft or pending' }),

  cover_image: Joi.string().optional().allow(''),
  thumbnail_image: Joi.string().optional().allow(''),
  logo_image: Joi.string().optional().allow(''),
  venue_map_image: Joi.string().optional().allow('')
});

const updateEventSchema = Joi.object({
  title: Joi.string()
    .min(5)
    .max(200)
    .messages({
      'string.min': 'Event title must be at least 5 characters',
      'string.max': 'Event title cannot exceed 200 characters'
    }),

  description: Joi.string()
    .min(10)
    .max(5000)
    .messages({
      'string.min': 'Event description must be at least 10 characters',
      'string.max': 'Event description cannot exceed 5000 characters'
    }),

  short_description: Joi.string()
    .max(500)
    .allow('')
    .messages({
      'string.max': 'Short description cannot exceed 500 characters'
    }),

  category_id: Joi.string()
    .uuid()
    .messages({
      'string.uuid': 'Invalid category ID format'
    }),

  start_date: Joi.date()
    .iso()
    .messages({
      'date.base': 'Start date must be a valid date',
      'date.format': 'Start date must be in ISO format'
    }),

  end_date: Joi.date()
    .iso()
    .min(Joi.ref('start_date'))
    .messages({
      'date.base': 'End date must be a valid date',
      'date.format': 'End date must be in ISO format',
      'date.min': 'End date must be after start date'
    }),

  venue_name: Joi.string()
    .min(2)
    .max(200)
    .messages({
      'string.min': 'Venue name must be at least 2 characters',
      'string.max': 'Venue name cannot exceed 200 characters'
    }),

  venue_address: Joi.string()
    .min(5)
    .max(500)
    .messages({
      'string.min': 'Venue address must be at least 5 characters',
      'string.max': 'Venue address cannot exceed 500 characters'
    }),

  venue_city: Joi.string()
    .min(2)
    .max(100)
    .messages({
      'string.min': 'Venue city must be at least 2 characters',
      'string.max': 'Venue city cannot exceed 100 characters'
    }),

  venue_capacity: Joi.number()
    .integer()
    .min(1)
    .allow(null)
    .messages({
      'number.base': 'Venue capacity must be a number',
      'number.min': 'Venue capacity must be at least 1'
    }),

  organizer_name: Joi.string()
    .min(2)
    .max(200)
    .messages({
      'string.min': 'Organizer name must be at least 2 characters',
      'string.max': 'Organizer name cannot exceed 200 characters'
    }),

  organizer_description: Joi.string()
    .max(1000)
    .allow('')
    .messages({
      'string.max': 'Organizer description cannot exceed 1000 characters'
    }),

  organizer_contact_email: Joi.string()
    .email()
    .allow('')
    .messages({
      'string.email': 'Please provide a valid organizer contact email'
    }),

  organizer_contact_phone: Joi.string()
    .pattern(/^[0-9+\-\s()]{10,15}$/)
    .allow('')
    .messages({
      'string.pattern.base': 'Please provide a valid organizer contact phone number'
    }),

  privacy_type: Joi.string()
    .valid('public', 'private')
    .messages({
      'any.only': 'Privacy type must be either public or private'
    }),

  terms_and_conditions: Joi.string()
    .max(3000)
    .allow('')
    .messages({
      'string.max': 'Terms and conditions cannot exceed 3000 characters'
    }),

  additional_info: Joi.object(),

  cover_image: Joi.string().optional().allow(''),
  thumbnail_image: Joi.string().optional().allow(''),
  logo_image: Joi.string().optional().allow(''),
  venue_map_image: Joi.string().optional().allow('')

}).min(0).messages({
  'object.min': 'At least one field is required for update'
});

const eventQuerySchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.integer': 'Page must be an integer',
      'number.min': 'Page must be at least 1'
    }),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(50)
    .default(12)
    .messages({
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 50'
    }),

  category: Joi.string()
    .uuid()
    .optional()
    .messages({
      'string.uuid': 'Invalid category ID format'
    }),

  search: Joi.string()
    .min(2)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Search query must be at least 2 characters',
      'string.max': 'Search query cannot exceed 100 characters'
    }),

  city: Joi.string()
    .max(100)
    .optional()
    .messages({
      'string.max': 'City cannot exceed 100 characters'
    }),

  status: Joi.string()
    .valid('draft', 'pending', 'approved', 'rejected', 'active', 'completed', 'cancelled')
    .optional()
    .messages({
      'any.only': 'Invalid status value'
    })
});

const searchQuerySchema = Joi.object({
  q: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'Search query must be at least 2 characters',
      'string.max': 'Search query cannot exceed 100 characters',
      'any.required': 'Search query is required'
    }),

  category: Joi.string()
    .uuid()
    .optional()
    .messages({
      'string.uuid': 'Invalid category ID format'
    }),

  city: Joi.string()
    .max(100)
    .optional()
    .messages({
      'string.max': 'City cannot exceed 100 characters'
    }),

  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.integer': 'Page must be an integer',
      'number.min': 'Page must be at least 1'
    }),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(50)
    .default(12)
    .messages({
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 50'
    })
});

const uuidParamSchema = Joi.object({
  id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.uuid': 'Invalid event ID format',
      'any.required': 'Event ID is required'
    })
});

const featuredEventsQuerySchema = Joi.object({
  limit: Joi.number()
    .integer()
    .min(1)
    .max(20)
    .default(6)
    .messages({
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 20'
    })
});

const rejectEventSchema = Joi.object({
  reason: Joi.string()
    .min(10)
    .max(1000)
    .required()
    .messages({
      'string.min': 'Rejection reason must be at least 10 characters',
      'string.max': 'Rejection reason cannot exceed 1000 characters',
      'any.required': 'Rejection reason is required'
    })
});

const myEventsQuerySchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.integer': 'Page must be an integer',
      'number.min': 'Page must be at least 1'
    }),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(50)
    .default(10)
    .messages({
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 50'
    }),

  status: Joi.string()
    .valid('draft', 'pending', 'approved', 'rejected', 'active', 'completed', 'cancelled', 'ALL')
    .optional()
    .messages({
      'any.only': 'Invalid status value'
    })
});

const slugParamSchema = Joi.object({
  slug: Joi.string()
    .min(3)
    .max(300)
    .pattern(/^[a-z0-9-]+$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid slug format',
      'any.required': 'Event slug is required'
    })
});

const pendingEventsQuerySchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
    .messages({
      'number.max': 'Limit cannot exceed 100'
    })
});

const addEventMemberSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  
  role: Joi.string()
    .valid('owner', 'manager', 'checkin_staff')  
    .required()
    .messages({
      'any.only': 'Role must be one of: owner, manager, checkin_staff',
      'any.required': 'Role is required'
    })
});

const updateMemberRoleSchema = Joi.object({
  role: Joi.string()
    .valid('owner', 'manager', 'checkin_staff')
    .required()
    .messages({
      'any.only': 'Role must be one of: owner, manager, checkin_staff',
      'any.required': 'Role is required'
    })
});

module.exports = {
  createEventSchema,
  createDraftEventSchema,
  updateEventSchema,
  eventQuerySchema,
  searchQuerySchema,
  uuidParamSchema,
  featuredEventsQuerySchema,
  rejectEventSchema,
  myEventsQuerySchema,
  slugParamSchema,
  pendingEventsQuerySchema,
  addEventMemberSchema,
  updateMemberRoleSchema
};