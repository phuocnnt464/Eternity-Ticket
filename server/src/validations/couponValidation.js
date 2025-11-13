// server/src/validations/couponValidation.js
const Joi = require('joi');

// Schema cho tạo/cập nhật coupon
const createCouponSchema = Joi.object({
  code: Joi.string()
    .trim()
    .min(3)
    .max(50)
    .uppercase()
    .pattern(/^[A-Z0-9_-]+$/)
    .required()
    .messages({
      'string.min': 'Coupon code must be at least 3 characters',
      'string.max': 'Coupon code cannot exceed 50 characters',
      'string.pattern.base': 'Code must contain only uppercase letters, numbers, underscores, and hyphens',
      'any.required': 'Coupon code is required'
    }),

  title: Joi.string()
    .trim()
    .max(200)
    .required()
    .messages({
      'string.max': 'Title cannot exceed 200 characters',
      'any.required': 'Title is required'
    }),

  description: Joi.string()
    .trim()
    .max(1000)
    .optional()
    .allow('', null)
    .messages({
      'string.max': 'Description cannot exceed 1000 characters'
    }),

  event_id: Joi.string()
    .uuid()
    .optional()
    .allow(null)
    .messages({
      'string.guid': 'Invalid event ID format'
    }),

  type: Joi.string()
    .valid('percentage', 'fixed_amount')
    .required()
    .messages({
      'any.only': 'Discount type must be either percentage or fixed_amount',
      'any.required': 'Discount type is required'
    }),

  discount_value: Joi.number()
    .positive()
    .required()
    .when('type', {
      is: 'percentage',
      then: Joi.number().min(0).max(100).messages({
        'number.max': 'Percentage discount cannot exceed 100%'
      })
    })
    .messages({
      'number.positive': 'Discount value must be positive',
      'any.required': 'Discount value is required'
    }),

  max_discount_amount: Joi.number()
    .positive()
    .optional()
    .allow(null)
    .messages({
      'number.positive': 'Max discount amount must be positive'
    }),

  min_order_amount: Joi.number()
    .min(0)
    .optional()
    .default(0)
    .messages({
      'number.min': 'Min order amount cannot be negative'
    }),

  usage_limit: Joi.number()
    .integer()
    .positive()
    .optional()
    .allow(null)
    .messages({
      'number.integer': 'Usage limit must be a whole number',
      'number.positive': 'Usage limit must be at least 1'
    }),

  usage_limit_per_user: Joi.number()
    .integer()
    .positive()
    .optional()
    .default(1)
    .messages({
      'number.integer': 'Per-user limit must be a whole number',
      'number.positive': 'Per-user limit must be at least 1'
    }),

  valid_from: Joi.date()
    .iso()
    .required()
    .messages({
      'date.format': 'Start date must be in ISO format',
      'any.required': 'Start date is required'
    }),

  valid_until: Joi.date()
    .iso()
    .greater(Joi.ref('valid_from'))
    .required()
    .messages({
      'date.format': 'End date must be in ISO format',
      'date.greater': 'End date must be after start date',
      'any.required': 'End date is required'
    }),

  membership_tiers: Joi.array()
    .items(Joi.string().valid('basic', 'advanced', 'premium'))
    .optional()
    .default([])
    .messages({
      'array.base': 'Membership tiers must be an array',
      'any.only': 'Invalid membership tier'
    })
});

// Schema cho validate coupon khi checkout
const validateCouponSchema = Joi.object({
  code: Joi.string()
    .trim()
    .required()
    .messages({
      'any.required': 'Coupon code is required'
    }),

  eventId: Joi.string()
    .uuid()
    .optional()
    .allow(null)
    .messages({
      'string.guid': 'Invalid event ID format'
    }),

  orderAmount: Joi.number()
    .positive()
    .required()
    .messages({
      'number.positive': 'Order amount must be positive',
      'any.required': 'Order amount is required'
    })
});

// Schema cho params
const couponParamSchema = Joi.object({
  id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Invalid coupon ID format',
      'any.required': 'Coupon ID is required'
    })
});

module.exports = {
  createCouponSchema,
  validateCouponSchema,
  couponParamSchema
};