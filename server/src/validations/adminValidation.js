const Joi = require('joi');

/**
 * Update user role validation
 */
const updateUserRoleSchema = Joi.object({
  role: Joi.string()
    .valid('participant', 'organizer', 'admin', 'sub_admin')
    .required()
    .messages({
      'any.only': 'Invalid role. Must be one of: participant, organizer, admin, sub_admin',
      'any.required': 'Role is required'
    })
});

/**
 * Reject refund validation
 */
const rejectRefundSchema = Joi.object({
  reason: Joi.string()
    .min(10)
    .max(500)
    .required()
    .trim()
    .messages({
      'string.min': 'Rejection reason must be at least 10 characters',
      'string.max': 'Rejection reason cannot exceed 500 characters',
      'string.empty': 'Rejection reason is required',
      'any.required': 'Rejection reason is required'
    })
});

/**
 * Update system setting validation
 */
const updateSettingSchema = Joi.object({
  value: Joi.alternatives()
    .try(
      Joi.string().max(1000),
      Joi.number(),
      Joi.boolean()
    )
    .required()
    .messages({
      'any.required': 'Setting value is required'
    })
});

/**
 * Search users validation
 */
const searchUsersSchema = Joi.object({
  q: Joi.string()
    .min(2)
    .max(100)
    .required()
    .trim()
    .messages({
      'string.min': 'Search query must be at least 2 characters',
      'string.max': 'Search query cannot exceed 100 characters',
      'any.required': 'Search query is required'
    }),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(50)
    .default(10)
    .messages({
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 50'
    })
});

module.exports = {
  updateUserRoleSchema,
  rejectRefundSchema,
  updateSettingSchema,
  searchUsersSchema
};