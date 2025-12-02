const Joi = require('joi');

const createOrderSchema = Joi.object({
  event_id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.uuid': 'Invalid event ID format',
      'any.required': 'Event ID is required'
    }),

  session_id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.uuid': 'Invalid session ID format',
      'any.required': 'Session ID is required'
    }),

  tickets: Joi.array()
    .items(
      Joi.object({
        ticket_type_id: Joi.string()
          .uuid()
          .required()
          .messages({
            'string.uuid': 'Invalid ticket type ID format',
            'any.required': 'Ticket type ID is required'
          }),

        quantity: Joi.number()
          .integer()
          .min(1)
          .max(50)
          .required()
          .messages({
            'number.integer': 'Quantity must be an integer',
            'number.min': 'Quantity must be at least 1',
            'number.max': 'Quantity cannot exceed 50',
            'any.required': 'Quantity is required'
          })
      })
    )
    .min(1)
    .max(10)
    .required()
    .messages({
      'array.min': 'At least one ticket type is required',
      'array.max': 'Cannot order more than 10 different ticket types',
      'any.required': 'Tickets array is required'
    }),

  customer_info: Joi.object({
    first_name: Joi.string()
      .min(2)
      .max(50)
      .required()
      .messages({
        'string.min': 'First name must be at least 2 characters',
        'string.max': 'First name cannot exceed 50 characters',
        'any.required': 'First name is required'
      }),

    last_name: Joi.string()
      .min(2)
      .max(50)
      .required()
      .messages({
        'string.min': 'Last name must be at least 2 characters',
        'string.max': 'Last name cannot exceed 50 characters',
        'any.required': 'Last name is required'
      }),

    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      }),

    phone: Joi.string()
      .pattern(/^[0-9+\-\s()]{10,15}$/)
      .required()
      .messages({
        'string.pattern.base': 'Please provide a valid phone number',
        'any.required': 'Phone number is required'
      }),

    address: Joi.string()
      .max(500)
      .optional()
      .allow('')
      .messages({
        'string.max': 'Address cannot exceed 500 characters'
      }),

    special_requests: Joi.string()
      .max(500)
      .optional()
      .allow('')
      .messages({
        'string.max': 'Special requests cannot exceed 500 characters'
      })
  })
  .required()
  .messages({
    'any.required': 'Customer information is required'
  }),

  coupon_code: Joi.string()
    .min(3)
    .max(50)
    .optional()
    .allow('', null)
    .messages({
      'string.min': 'Coupon code must be at least 3 characters',
      'string.max': 'Coupon code cannot exceed 50 characters'
    })
});

const processPaymentSchema = Joi.object({
  payment_method: Joi.string()
    .valid('vnpay', 'momo', 'banking', 'cash')
    .required()
    .messages({
      'any.only': 'Payment method must be one of: vnpay, momo, banking, cash',
      'any.required': 'Payment method is required'
    }),
 
  payment_data: Joi.object({
    // Validate dựa trên payment_method
    card_number: Joi.when('..payment_method', {
      is: 'banking',
      then: Joi.string().creditCard().required(),
      otherwise: Joi.forbidden()
    }),
    
    vnpay_token: Joi.when('..payment_method', {
      is: 'vnpay',
      then: Joi.string().required(),
      otherwise: Joi.forbidden()
    }),

    momo_token: Joi.when('..payment_method', {
      is: 'momo',
      then: Joi.string().required(),
      otherwise: Joi.forbidden()
    }), 
    cash_received_by: Joi.when('..payment_method', {
      is: 'cash',
      then: Joi.string().min(2).max(100).required(),
      otherwise: Joi.forbidden()
    })
  })
  .optional()
});

const orderQuerySchema = Joi.object({
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
    .valid('pending', 'processing', 'paid', 'failed', 'cancelled', 'refunded')
    .optional()
    .messages({
      'any.only': 'Status must be one of: pending, processing, paid, failed, cancelled, refunded'
    }),

  from_date: Joi.date()
    .optional()
    .messages({
      'date.base': 'From date must be a valid date'
    }),

  to_date: Joi.date()
    .min(Joi.ref('from_date'))
    .optional()
    .messages({
      'date.base': 'To date must be a valid date',
      'date.min': 'To date must be after from date'
    })
});

const orderParamSchema = Joi.object({
  orderId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.uuid': 'Invalid order ID format',
      'any.required': 'Order ID is required'
    })
});

module.exports = {
  createOrderSchema,
  processPaymentSchema,
  orderQuerySchema,
  orderParamSchema
};