const Joi = require('joi');

/**
 * Validation schema for creating refund request
 */
const createRefundRequestSchema = Joi.object({
  orderId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.uuid': 'Invalid order ID format',
      'any.required': 'Order ID is required'
    }),
  
  reason: Joi.string()
    .valid('event_cancelled', 'event_changed', 'cannot_attend', 'duplicate_payment', 'other')
    .required()
    .messages({
      'any.only': 'Invalid refund reason. Must be one of: event_cancelled, event_changed, cannot_attend, duplicate_payment, other',
      'any.required': 'Refund reason is required'
    }),
  
  description: Joi.string()
    .max(1000)
    .allow('')
    .optional()
    .messages({
      'string.max': 'Description cannot exceed 1000 characters'
    })
});

/**
 * Validation schema for approving refund
 */
const approveRefundSchema = Joi.object({
  reviewNotes: Joi.string()
    .max(1000)
    .allow('')
    .optional()
    .messages({
      'string.max': 'Review notes cannot exceed 1000 characters'
    })
});

/**
 * Validation schema for rejecting refund
 */
const rejectRefundSchema = Joi.object({
  rejectionReason: Joi.string()
    .min(10)
    .max(1000)
    .required()
    .messages({
      'string.min': 'Rejection reason must be at least 10 characters',
      'string.max': 'Rejection reason cannot exceed 1000 characters',
      'any.required': 'Rejection reason is required'
    })
});

/**
 * Validation schema for processing refund
 */
const processRefundSchema = Joi.object({
  transactionId: Joi.string()
    .min(5)
    .max(100)
    .required()
    .messages({
      'string.min': 'Transaction ID must be at least 5 characters',
      'string.max': 'Transaction ID cannot exceed 100 characters',
      'any.required': 'Transaction ID is required'
    })
});

/**
 * Query validation for getting refunds
 */
const getRefundsQuerySchema = Joi.object({
  status: Joi.string()
    .valid('pending', 'approved', 'rejected', 'completed')
    .optional(),
  
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .optional(),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
    .optional()
});

module.exports = {
  createRefundRequestSchema,
  approveRefundSchema,
  rejectRefundSchema,
  processRefundSchema,
  getRefundsQuerySchema
};