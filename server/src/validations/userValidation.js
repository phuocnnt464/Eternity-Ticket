// src/validations/userValidation.js
const Joi = require('joi');

// Update profile validation schema
const updateProfileSchema = Joi.object({
  first_name: Joi.string()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-ZÀ-ỹ\s]+$/)
    .messages({
      'string.min': 'First name must be at least 2 characters',
      'string.max': 'First name cannot exceed 50 characters',
      'string.pattern.base': 'First name can only contain letters and spaces'
    }),

  last_name: Joi.string()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-ZÀ-ỹ\s]+$/)
    .messages({
      'string.min': 'Last name must be at least 2 characters',
      'string.max': 'Last name cannot exceed 50 characters',
      'string.pattern.base': 'Last name can only contain letters and spaces'
    }),

  phone: Joi.string()
    .pattern(/^[0-9+\-\s()]{10,15}$/)
    .allow('')
    .messages({
      'string.pattern.base': 'Please provide a valid phone number (10-15 digits)'
    }),

  date_of_birth: Joi.date()
    .max('now')
    .messages({
      'date.max': 'Date of birth cannot be in the future'
    }),

  gender: Joi.string()
    .valid('male', 'female', 'other', 'prefer_not_to_say')
    .messages({
      'any.only': 'Gender must be one of: male, female, other, prefer_not_to_say'
    }),

  address: Joi.string()
    .max(500)
    .allow('')
    .messages({
      'string.max': 'Address cannot exceed 500 characters'
    }),

  city: Joi.string()
    .max(100)
    .pattern(/^[a-zA-ZÀ-ỹ\s\-',.]+$/)
    .allow('')
    .messages({
      'string.max': 'City cannot exceed 100 characters',
      'string.pattern.base': 'City can only contain letters, spaces, hyphens, apostrophes, commas, and periods'
    }),

  country: Joi.string()
    .max(100)
    .pattern(/^[a-zA-ZÀ-ỹ\s\-',.]+$/)
    .allow('')
    .messages({
      'string.max': 'Country cannot exceed 100 characters',
      'string.pattern.base': 'Country can only contain letters, spaces, hyphens, apostrophes, commas, and periods'
    }),

  avatar_url: Joi.string()
    .uri()
    .allow('')
    .messages({
      'string.uri': 'Avatar URL must be a valid URL'
    })
}).min(1).messages({
  'object.min': 'At least one field is required for update'
});

// Change password validation schema
const changePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'any.required': 'Current password is required'
    }),

  newPassword: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.min': 'New password must be at least 8 characters long',
      'string.max': 'New password cannot exceed 128 characters',
      'string.pattern.base': 'New password must contain at least one lowercase letter, one uppercase letter, and one number',
      'any.required': 'New password is required'
    }),

  confirmNewPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'Password confirmation does not match new password',
      'any.required': 'Password confirmation is required'
    })
});

// Deactivate account validation schema
const deactivateAccountSchema = Joi.object({
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required to deactivate account'
    }),

  confirmation: Joi.string()
    .valid('I understand that this action cannot be undone')
    .optional()
    .messages({
      'any.only': 'Please confirm you understand this action cannot be undone'
    })
});

// Ticket history query validation
const ticketHistoryQuerySchema = Joi.object({
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
    .max(100)
    .default(10)
    .messages({
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
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

// Avatar upload validation (for future file upload)
const avatarUploadSchema = Joi.object({
  avatar: Joi.object({
    fieldname: Joi.string().required(),
    originalname: Joi.string().required(),
    encoding: Joi.string().required(),
    mimetype: Joi.string()
      .valid('image/jpeg', 'image/png', 'image/gif', 'image/webp')
      .required()
      .messages({
        'any.only': 'Avatar must be a valid image file (JPEG, PNG, GIF, or WebP)'
      }),
    size: Joi.number()
      .max(5 * 1024 * 1024) // 5MB max
      .required()
      .messages({
        'number.max': 'Avatar file size cannot exceed 5MB'
      }),
    buffer: Joi.binary().required()
  }).required()
});

module.exports = {
  updateProfileSchema,
  changePasswordSchema,
  deactivateAccountSchema,
  ticketHistoryQuerySchema,
  avatarUploadSchema
};