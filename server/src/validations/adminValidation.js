const Joi = require('joi');

const createSubAdminSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Invalid email format',
      'any.required': 'Email is required'
    }),
  
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])[A-Za-z\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+$/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters',
      'string.pattern.base': 'Password must contain uppercase, lowercase, number and special character',
      'any.required': 'Password is required'
    }),
  
  first_name: Joi.string()
    .min(1)
    .max(50)
    .required()
    .messages({
      'any.required': 'First name is required',
      'string.max': 'First name cannot exceed 50 characters'
    }),
  
  last_name: Joi.string()
    .min(1)
    .max(50)
    .required()
    .messages({
      'any.required': 'Last name is required',
      'string.max': 'Last name cannot exceed 50 characters'
    }),
  
  phone: Joi.string()
    .pattern(/^[0-9]{10,15}$/)
    .optional()
    .allow('', null)
    .messages({
      'string.pattern.base': 'Phone number must be 10-15 digits'
    })
});

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
  createSubAdminSchema,
  updateUserRoleSchema,
  rejectRefundSchema,
  updateSettingSchema,
  searchUsersSchema
};