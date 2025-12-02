const Joi = require('joi');

const registerSchema = Joi.object({
  email: Joi.string()
    .email({ minDomainSegments: 2, tlds: {allow: false} })
    .required()
    .max(255)
    .trim()
    .lowercase()
    .messages({
      'string.email': 'Please provide a valid email address',
      'string.empty': 'Email is required',
      'any.required': 'Email is required',
      'string.max': 'Email cannot exceed 255 characters'
    }),

  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password cannot exceed 128 characters',
      'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, and one number',
      'string.empty': 'Password is required',
      'any.required': 'Password is required'
    }),

  first_name: Joi.string()
    .min(2)
    .max(100)
    .pattern(/^[a-zA-ZÀ-ỹ\s'-]+$/)
    .required()
    .trim()
    .messages({
      'string.min': 'First name must be at least 2 characters',
      'string.max': 'First name cannot exceed 50 characters',
      'string.pattern.base': 'First name can only contain letters and spaces',
      'string.empty': 'First name is required',
      'any.required': 'First name is required'
    }),

  last_name: Joi.string()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-ZÀ-ỹ\s'-]+$/)
    .required()
    .trim()
    .messages({
      'string.min': 'Last name must be at least 2 characters',
      'string.max': 'Last name cannot exceed 50 characters',
      'string.pattern.base': 'Last name can only contain letters and spaces',
      'string.empty': 'Last name is required',
      'any.required': 'Last name is required'
    }),

  role: Joi.string()
    .valid('participant', 'organizer')
    .default('participant')
    .messages({
      'any.only': 'Role must be either participant or organizer'
    }),

  phone: Joi.string()
    .pattern(/^[\d\s+()-]{10,15}$/)
    .trim()
    .optional()
    .allow('', null)
    .messages({
      'string.pattern.base': 'Please provide a valid phone number (10-15 digits)'
    })
});

const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .trim()
    .lowercase()
    .messages({
      'string.email': 'Please provide a valid email address',
      'string.empty': 'Email is required',
      'any.required': 'Email is required'
    }),

  password: Joi.string()
    .required()
    .messages({
      'string.empty': 'Password is required',
      'any.required': 'Password is required'
    })
});

const verifyEmailSchema = Joi.object({
  token: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.uuid': 'Invalid verification token format',
      'string.empty': 'Verification token is required',
      'any.required': 'Verification token is required'
    })
});

const refreshTokenSchema = Joi.object({
  refresh_token: Joi.string()
    .required()
    .messages({
      'string.empty': 'Refresh token is required',
      'any.required': 'Refresh token is required'
  })
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .trim()
    .lowercase()
    .messages({
      'string.email': 'Please provide a valid email address',
      'string.empty': 'Email is required',
      'any.required': 'Email is required'
    })
});

const resetPasswordSchema = Joi.object({
  token: Joi.string()
    .required()
    .messages({
      'string.empty': 'Reset token is required',
      'any.required': 'Reset token is required'
    }),

  new_password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password cannot exceed 128 characters',
      'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, and one number',
      'string.empty': 'New password is required',
      'any.required': 'New password is required'
    }),

  confirm_password: Joi.string()
    .valid(Joi.ref('new_password'))
    .required()
    .messages({
      'any.only': 'Password confirmation does not match',
      'string.empty': 'Password confirmation is required',
      'any.required': 'Password confirmation is required'
    })
});

const changePasswordSchema = Joi.object({
  current_password: Joi.string()
    .required()
    .messages({
      'string.empty': 'Current password is required',
      'any.required': 'Current password is required'
    }),

  new_password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .invalid(Joi.ref('current_password'))
    .messages({
      'string.min': 'New password must be at least 8 characters long',
      'string.max': 'New password cannot exceed 128 characters',
      'string.pattern.base': 'New password must contain at least one lowercase letter, one uppercase letter, and one number',
      'string.empty': 'New password is required',
      'any.required': 'New password is required',
      'any.invalid': 'New password must be different from current password'
    }),

  confirm_password: Joi.string()
    .valid(Joi.ref('new_password'))
    .required()
    .messages({
      'any.only': 'New password confirmation does not match',
      'string.empty': 'Password confirmation is required',
      'any.required': 'Password confirmation is required'
    })
});

const updateProfileSchema = Joi.object({
  first_name: Joi.string()
    .min(2)
    .max(100)
    .pattern(/^[a-zA-ZÀ-ỹ\s'-]+$/)
    .optional()
    .trim()
    .messages({
      'string.min': 'First name must be at least 2 characters',
      'string.max': 'First name cannot exceed 100 characters',
      'string.pattern.base': 'First name can only contain letters, spaces, hyphens, and apostrophes'
    }),

  last_name: Joi.string()
    .min(2)
    .max(100)
    .pattern(/^[a-zA-ZÀ-ỹ\s'-]+$/)
    .optional()
    .trim()
    .messages({
      'string.min': 'Last name must be at least 2 characters',
      'string.max': 'Last name cannot exceed 100 characters',
      'string.pattern.base': 'Last name can only contain letters, spaces, hyphens, and apostrophes'
    }),

  phone: Joi.string()
    .pattern(/^[\d\s+()-]{10,20}$/)
    .optional()
    .allow('', null)
    .trim()
    .messages({
      'string.pattern.base': 'Please provide a valid phone number'
    }),

  date_of_birth: Joi.date()
    .max('now')
    .optional()
    .allow('', null)
    .messages({
      'date.max': 'Date of birth cannot be in the future'
    }),

  gender: Joi.string()
    .valid('male', 'female', 'other', 'prefer_not_to_say')
    .optional()
    .allow('', null)
    .messages({
      'any.only': 'Gender must be one of: male, female, other, prefer_not_to_say'
    }),

  address: Joi.string()
    .max(500)
    .optional()
    .allow('', null)
    .trim()
    .messages({
      'string.max': 'Address cannot exceed 500 characters'
    }),

  city: Joi.string()
    .max(100)
    .optional()
    .allow('', null)
    .trim()
    .messages({
      'string.max': 'City cannot exceed 100 characters'
    }),

  country: Joi.string()
    .max(100)
    .optional()
    .allow('', null)
    .trim()
    .messages({
      'string.max': 'Country cannot exceed 100 characters'
    })
});

module.exports = {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema
};