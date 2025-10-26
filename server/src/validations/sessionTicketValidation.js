// src/validations/sessionTicketValidation.js
const Joi = require('joi');

// Create session validation schema
const createSessionSchema = Joi.object({
  title: Joi.string()
    .min(2)
    .max(200)
    .required()
    .messages({
      'string.min': 'Session title must be at least 2 characters',
      'string.max': 'Session title cannot exceed 200 characters',
      'any.required': 'Session title is required'
    }),

  description: Joi.string()
    .max(1000)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Description cannot exceed 1000 characters'
    }),

  start_time: Joi.date()
    .iso()
    .min('now')
    .required()
    .messages({
      'date.iso': 'Start time must be a valid ISO date',
      'date.min': 'Start time cannot be in the past',
      'any.required': 'Start time is required'
    }),

  end_time: Joi.date()
    .iso()
    .greater(Joi.ref('start_time'))
    .required()
    .messages({
      'date.iso': 'End time must be a valid ISO date',
      'date.greater': 'End time must be after start time',
      'any.required': 'End time is required'
    }),

  min_tickets_per_order: Joi.number()
    .integer()
    .min(1)
    .max(50)
    .default(1)
    .messages({
      'number.integer': 'Minimum tickets per order must be an integer',
      'number.min': 'Minimum tickets per order must be at least 1',
      'number.max': 'Minimum tickets per order cannot exceed 50'
    }),

  max_tickets_per_order: Joi.number()
    .integer()
    .min(Joi.ref('min_tickets_per_order'))
    .max(100)
    .default(10)
    .messages({
      'number.integer': 'Maximum tickets per order must be an integer',
      'number.min': 'Maximum tickets per order must be greater than or equal to minimum',
      'number.max': 'Maximum tickets per order cannot exceed 100'
    }),

  sort_order: Joi.number()
    .integer()
    .min(0)
    .default(0)
    .messages({
      'number.integer': 'Sort order must be an integer',
      'number.min': 'Sort order cannot be negative'
    })
});

// Update session validation schema
const updateSessionSchema = Joi.object({
  title: Joi.string()
    .min(2)
    .max(200)
    .messages({
      'string.min': 'Session title must be at least 2 characters',
      'string.max': 'Session title cannot exceed 200 characters'
    }),

  description: Joi.string()
    .max(1000)
    .allow('')
    .messages({
      'string.max': 'Description cannot exceed 1000 characters'
    }),

  start_time: Joi.date()
    .iso()
    .min('now')
    .messages({
      'date.iso': 'Start time must be a valid ISO date',
      'date.min': 'Start time cannot be in the past'
    }),

  end_time: Joi.date()
    .iso()
    .greater(Joi.ref('start_time'))
    .messages({
      'date.iso': 'End time must be a valid ISO date',
      'date.greater': 'End time must be after start time'
    }),

  min_tickets_per_order: Joi.number()
    .integer()
    .min(1)
    .max(50)
    .messages({
      'number.integer': 'Minimum tickets per order must be an integer',
      'number.min': 'Minimum tickets per order must be at least 1',
      'number.max': 'Minimum tickets per order cannot exceed 50'
    }),

  max_tickets_per_order: Joi.number()
    .integer()
    .min(Joi.ref('min_tickets_per_order'))
    .max(100)
    .messages({
      'number.integer': 'Maximum tickets per order must be an integer',
      'number.min': 'Maximum tickets per order must be greater than or equal to minimum',
      'number.max': 'Maximum tickets per order cannot exceed 100'
    }),

  sort_order: Joi.number()
    .integer()
    .min(0)
    .messages({
      'number.integer': 'Sort order must be an integer',
      'number.min': 'Sort order cannot be negative'
    })

}).min(1).messages({
  'object.min': 'At least one field is required for update'
});

// Create ticket type validation schema
const createTicketTypeSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'Ticket type name must be at least 2 characters',
      'string.max': 'Ticket type name cannot exceed 100 characters',
      'any.required': 'Ticket type name is required'
    }),

  description: Joi.string()
    .max(500)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Description cannot exceed 500 characters'
    }),

  price: Joi.number()
    .min(0)
    .max(100000000)
    .required()
    .messages({
      'number.min': 'Price cannot be negative',
      'number.max': 'Price cannot exceed 100,000,000',
      'any.required': 'Price is required'
    }),

  total_quantity: Joi.number()
    .integer()
    .min(1)
    .max(100000)
    .required()
    .messages({
      'number.integer': 'Total quantity must be an integer',
      'number.min': 'Total quantity must be at least 1',
      'number.max': 'Total quantity cannot exceed 100,000',
      'any.required': 'Total quantity is required'
    }),

  min_quantity_per_order: Joi.number()
    .integer()
    .min(1)
    .max(50)
    .default(1)
    .messages({
      'number.integer': 'Minimum quantity per order must be an integer',
      'number.min': 'Minimum quantity per order must be at least 1',
      'number.max': 'Minimum quantity per order cannot exceed 50'
    }),

  max_quantity_per_order: Joi.number()
    .integer()
    .min(Joi.ref('min_quantity_per_order'))
    .max(100)
    .default(10)
    .messages({
      'number.integer': 'Maximum quantity per order must be an integer',
      'number.min': 'Maximum quantity per order must be greater than or equal to minimum',
      'number.max': 'Maximum quantity per order cannot exceed 100'
    }),

  sale_start_time: Joi.date()
    .iso()
    .required()
    .messages({
      'date.iso': 'Sale start time must be a valid ISO date',
      'any.required': 'Sale start time is required'
    }),

  sale_end_time: Joi.date()
    .iso()
    .greater(Joi.ref('sale_start_time'))
    .required()
    .messages({
      'date.iso': 'Sale end time must be a valid ISO date',
      'date.greater': 'Sale end time must be after sale start time',
      'any.required': 'Sale end time is required'
    }),

  premium_early_access_minutes: Joi.number()
    .integer()
    .min(0)
    .max(1440)
    .default(0)
    .messages({
      'number.integer': 'Premium early access must be an integer',
      'number.min': 'Premium early access cannot be negative',
      'number.max': 'Premium early access cannot exceed 1440 minutes (24 hours)'
    }),

  sort_order: Joi.number()
    .integer()
    .min(0)
    .default(0)
    .messages({
      'number.integer': 'Sort order must be an integer',
      'number.min': 'Sort order cannot be negative'
    })
});

// Update ticket type validation schema
const updateTicketTypeSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .messages({
      'string.min': 'Ticket type name must be at least 2 characters',
      'string.max': 'Ticket type name cannot exceed 100 characters'
    }),

  description: Joi.string()
    .max(500)
    .allow('')
    .messages({
      'string.max': 'Description cannot exceed 500 characters'
    }),

  price: Joi.number()
    .min(0)
    .max(100000000)
    .messages({
      'number.min': 'Price cannot be negative',
      'number.max': 'Price cannot exceed 100,000,000'
    }),

  total_quantity: Joi.number()
    .integer()
    .min(1)
    .max(100000)
    .messages({
      'number.integer': 'Total quantity must be an integer',
      'number.min': 'Total quantity must be at least 1',
      'number.max': 'Total quantity cannot exceed 100,000'
    }),

  min_quantity_per_order: Joi.number()
    .integer()
    .min(1)
    .max(50)
    .messages({
      'number.integer': 'Minimum quantity per order must be an integer',
      'number.min': 'Minimum quantity per order must be at least 1',
      'number.max': 'Minimum quantity per order cannot exceed 50'
    }),

  max_quantity_per_order: Joi.number()
    .integer()
    .min(Joi.ref('min_quantity_per_order'))
    .max(100)
    .messages({
      'number.integer': 'Maximum quantity per order must be an integer',
      'number.min': 'Maximum quantity per order must be greater than or equal to minimum',
      'number.max': 'Maximum quantity per order cannot exceed 100'
    }),

  sale_start_time: Joi.date()
    .iso()
    .messages({
      'date.iso': 'Sale start time must be a valid ISO date'
    }),

  sale_end_time: Joi.date()
    .iso()
    .greater(Joi.ref('sale_start_time'))
    .messages({
      'date.iso': 'Sale end time must be a valid ISO date',
      'date.greater': 'Sale end time must be after sale start time'
    }),

  premium_early_access_minutes: Joi.number()
    .integer()
    .min(0)
    .max(1440)
    .messages({
      'number.integer': 'Premium early access must be an integer',
      'number.min': 'Premium early access cannot be negative',
      'number.max': 'Premium early access cannot exceed 1440 minutes (24 hours)'
    }),

  sort_order: Joi.number()
    .integer()
    .min(0)
    .messages({
      'number.integer': 'Sort order must be an integer',
      'number.min': 'Sort order cannot be negative'
    })

}).min(1).messages({
  'object.min': 'At least one field is required for update'
});

// UUID parameter validation
const uuidParamSchema = Joi.object({
  eventId: Joi.string()
    .uuid()
    .optional()
    .messages({
      'string.uuid': 'Invalid event ID format'
    }),

  sessionId: Joi.string()
    .uuid()
    .optional()
    .messages({
      'string.uuid': 'Invalid session ID format'
    }),

  ticketTypeId: Joi.string()
    .uuid()
    .optional()
    .messages({
      'string.uuid': 'Invalid ticket type ID format'
    })
});

module.exports = {
  createSessionSchema,
  updateSessionSchema,
  createTicketTypeSchema,
  updateTicketTypeSchema,
  uuidParamSchema
};