// src/middleware/validationMiddleware.js
const { createResponse, validateUUID } = require('../utils/helpers');
const Joi = require('joi');
const validator = require('validator');
const sanitizeHtml = require('sanitize-html');

/**
 * Validation middleware factory
 * @param {Object} schema - Joi validation schema
 * @param {String} source - Source of data to validate (body, params, query)
 * @returns {Function} Express middleware
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    let dataToValidate = req[source];
    
    // Handle multipart/form-data (file uploads with form fields)
    // Nếu request là multipart → req.body toàn string
    if (req.is('multipart/form-data') && source === 'body') {
      const parsedData = {};

      // Helper function
      const getJSONDepth = (obj, depth = 0) => {
        if (typeof obj !== 'object' || obj === null) return depth;
        if (Object.keys(obj).length === 0) return depth;
        return Math.max(...Object.values(obj).map(v => getJSONDepth(v, depth + 1)));
      };

      for (const key in dataToValidate) {
        try {
          // Try to parse JSON String (object/array)
          // Nếu là JSON string (object/array) → parse
          // parsed[key] = JSON.parse(dataToValidate[key]);

          const jsonValue = JSON.parse(dataToValidate[key]);
  
          // ✅ Validate size
          const stringified = JSON.stringify(jsonValue);
          if (stringified.length > 100000) { // 100KB limit
            throw new Error('JSON payload too large');
          }
          
          // ✅ Validate depth (optional)
          const depth = getJSONDepth(jsonValue);
          if (depth > 10) {
            throw new Error('JSON nested too deep');
          }

          parsedData[key] = jsonValue;
        } catch(error) {
          //Keep as string if not valid json
          // nếu không parse được thì giữ nguyên string
          // parsed[key] = dataToValidate[key];

          // if (error.message &&  (error.message.includes('JSON') || error.message.includes('payload'))) {
          //   throw error; // Re-throw validation errors
          // }
          parsedData[key] = dataToValidate[key];
        }
      }
      dataToValidate = parsedData;
    }

    // Validate data against schema
    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false, // Collect all errors, not just the first one
      allowUnknown: false, // Don't allow unknown fields
      stripUnknown: true, // Remove unknown fields from the result
      convert: true, //Type coercion
      presence: 'optional' // Fields are optional unless marked required in schema
    });

    if (error) {
      // Format errors for better readability
      const formattedErrors = error.details.reduce((acc, curr) => {
        const field = curr.path.join('.') || 'general';

        // Group multiple errors for the same field
        if (acc[field]) {
          acc[field] = Array.isArray(acc[field])
          ? [...acc[field], curr.message]
          : [acc[field], curr.message];
        } else {
          acc[field] = curr.message;
        }
        return acc;
      }, {});

      console.log(' Validation error:', formattedErrors);
      console.log('📦 Data received:', JSON.stringify(dataToValidate, null, 2));

      // Create error response
      const response = createResponse(
        false,
        'Validation failed. Please check your input and try again.',
        null,
        {
          errors: formattedErrors,
          errorCount: error.details.length
        }
      );

      return res.status(400).json(response);
    }

    // Replace the original data with validated and sanitized data
    req[source] = value;

    // Add validation flag
    req.validated = req.validated || {};
    req.validated[source] = true;

    next();
  };
};

/**
 * Validate multiple schemas for different sources
 * @param {Object} schemas - Object with schemas for body, params, query
 * @example
 * validateMultiple({
 *   body: bodySchema,
 *   params: paramsSchema,
 *   query: querySchema
 * })
 */
const validateMultiple = (schemas) => {
  return (req, res, next) => {
    const errors = {};
    let hasError = false;

    // Validate each source
    for (const [source, schema] of Object.entries(schemas)) {
      const { error, value } = schema.validate(req[source], {
        abortEarly: false,
        allowUnknown: false,
        stripUnknown: true
      });

      if (error) {
        hasError = true;
        errors[source] = error.details.reduce((acc, curr) => {
          acc[curr.path.join('.') || 'general'] = curr.message;
          return acc;
        }, {});
      } else {
        req[source] = value;
      }
    }

    if (hasError) {
      return res.status(400).json(
        createResponse(false, 'Validation failed', { errors })
      );
    }

    next();
  };
};

// =============================================
// CUSTOM VALIDATORS
// =============================================

/**
 * Validate UUID parameter
 * @param {String} paramName - Parameter name to validate
 */
const validateUUIDParam = (paramName = 'id') => {
  return (req, res, next) => {
    const paramValue = req.params[paramName];

    if (!paramValue) {
      return res.status(400).json(
        createResponse(false, `${paramName} parameter is required`)
      );
    }

    if (!validateUUID(paramValue)) {
      return res.status(400).json(
        createResponse(false, `Invalid ${paramName} format. Expected UUID.`)
      );
    }

    next();
  };
};

/**
 * Validate multiple UUID parameters
 * @param {Array} paramNames - Array of parameter names
 */
const validateUUIDParams = (...paramNames) => {
  return (req, res, next) => {
    const invalidParams = [];

    for (const paramName of paramNames) {
      const paramValue = req.params[paramName];
      
      if (!paramValue) {
        invalidParams.push(`${paramName} is required`);
      } else if (!validateUUID(paramValue)) {
        invalidParams.push(`${paramName} must be a valid UUID`);
      }
    }

    if (invalidParams.length > 0) {
      return res.status(400).json(
        createResponse(false, 'Invalid parameters', { errors: invalidParams })
      );
    }

    next();
  };
};

/**
 * Validate pagination query parameters
 * @param {Object} options - Pagination options
 */
const validatePagination = (options = {}) => {
  const {
    defaultPage = 1,
    defaultLimit = 10,
    maxLimit = 100
  } = options;

  return (req, res, next) => {
    let page = parseInt(req.query.page) || defaultPage;
    let limit = parseInt(req.query.limit) || defaultLimit;

    // Validate page
    if (page < 1) {
      page = defaultPage;
    }

    // Validate limit
    if (limit < 1) {
      limit = defaultLimit;
    }

    if (limit > maxLimit) {
      return res.status(400).json(
        createResponse(false, `Limit cannot exceed ${maxLimit}`)
      );
    }

    // Add validated pagination to request
    req.pagination = {
      page,
      limit,
      offset: (page - 1) * limit
    };

    next();
  };
};

/**
 * Validate sort query parameter
 * @param {Array} allowedFields - Allowed fields for sorting
 * @param {String} defaultSort - Default sort field and order
 */
const validateSort = (allowedFields = [], defaultSort = 'created_at:desc') => {
  return (req, res, next) => {
    const sortQuery = req.query.sort || defaultSort;
    const [field, order = 'asc'] = sortQuery.split(':');

    // Validate field
    if (allowedFields.length > 0 && !allowedFields.includes(field)) {
      return res.status(400).json(
        createResponse(
          false, 
          `Invalid sort field. Allowed fields: ${allowedFields.join(', ')}`
        )
      );
    }

    // Validate order
    if (!['asc', 'desc'].includes(order.toLowerCase())) {
      return res.status(400).json(
        createResponse(false, 'Sort order must be "asc" or "desc"')
      );
    }

    // Add to request
    req.sort = {
      field,
      order: order.toLowerCase()
    };

    next();
  };
};

/**
 * Validate date range query parameters
 */
const validateDateRange = () => {
  return (req, res, next) => {
    const { start_date, end_date } = req.query;

    if (start_date) {
      const startDate = new Date(start_date);
      if (isNaN(startDate.getTime())) {
        return res.status(400).json(
          createResponse(false, 'Invalid start_date format. Use ISO 8601 format.')
        );
      }
      req.query.start_date = startDate;
    }

    if (end_date) {
      const endDate = new Date(end_date);
      if (isNaN(endDate.getTime())) {
        return res.status(400).json(
          createResponse(false, 'Invalid end_date format. Use ISO 8601 format.')
        );
      }
      req.query.end_date = endDate;
    }

    // Validate range
    if (start_date && end_date && req.query.start_date > req.query.end_date) {
      return res.status(400).json(
        createResponse(false, 'start_date must be before end_date')
      );
    }

    next();
  };
};

/**
 * Validate file upload
 * @param {Object} options - Upload options
 */
const validateFileUpload = (options = {}) => {
  const {
    allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'],
    maxSize = 2 * 1024 * 1024, // 2MB
    required = false,
    fieldName = 'file'
  } = options;

  return (req, res, next) => {
    const file = req.file || (req.files && req.files[fieldName]);

    // Check if file is required
    if (required && !file) {
      return res.status(400).json(
        createResponse(false, `File upload is required for field: ${fieldName}`)
      );
    }

    // If no file and not required, continue
    if (!file) {
      return next();
    }

    // Handle multiple files
    const files = Array.isArray(file) ? file : [file];

    for (const uploadedFile of files) {
      // Check file type
      if (!allowedTypes.includes(uploadedFile.mimetype)) {
        return res.status(400).json(
          createResponse(
            false,
            `File type "${uploadedFile.mimetype}" is not allowed. Allowed types: ${allowedTypes.join(', ')}`
          )
        );
      }

      // Check file size
      if (uploadedFile.size > maxSize) {
        const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
        const fileSizeMB = (uploadedFile.size / (1024 * 1024)).toFixed(2);
        
        return res.status(400).json(
          createResponse(
            false,
            `File size (${fileSizeMB}MB) exceeds maximum allowed size (${maxSizeMB}MB)`
          )
        );
      }
    }

    next();
  };
};

/**
 * Validate multiple file uploads
 * @param {Object} fieldConfigs - Configuration for each field
 * @example
 * validateMultipleFiles({
 *   cover: { allowedTypes: ['image/jpeg'], maxSize: 5MB },
 *   thumbnail: { required: true }
 * })
 */
const validateMultipleFiles = (fieldConfigs = {}) => {
  return (req, res, next) => {
    if (!req.files) {
      // Check if any field is required
      const requiredFields = Object.entries(fieldConfigs)
        .filter(([_, config]) => config.required)
        .map(([field]) => field);

      if (requiredFields.length > 0) {
        return res.status(400).json(
          createResponse(false, `Required files missing: ${requiredFields.join(', ')}`)
        );
      }

      return next();
    }

    // Validate each uploaded field
    for (const [fieldName, config] of Object.entries(fieldConfigs)) {
      const files = req.files[fieldName];

      if (config.required && !files) {
        return res.status(400).json(
          createResponse(false, `File required for field: ${fieldName}`)
        );
      }

      if (files) {
        const fileArray = Array.isArray(files) ? files : [files];
        
        for (const file of fileArray) {
          // Check type
          if (config.allowedTypes && !config.allowedTypes.includes(file.mimetype)) {
            return res.status(400).json(
              createResponse(
                false,
                `Invalid file type for ${fieldName}. Allowed: ${config.allowedTypes.join(', ')}`
              )
            );
          }

          // Check size
          if (config.maxSize && file.size > config.maxSize) {
            return res.status(400).json(
              createResponse(
                false,
                `File size for ${fieldName} exceeds limit: ${config.maxSize / (1024 * 1024)}MB`
              )
            );
          }
        }
      }
    }

    next();
  };
};

/**
 * Sanitize HTML input to prevent XSS
 * @param {Array} fields - Fields to sanitize (empty = all)
 */
const sanitizeInput = (fields = []) => {
  return (req, res, next) => {
    const sanitizeString = (str) => {
      if (typeof str !== 'string') return str;

      // ✅ Step 1: Escape HTML entities
      let cleaned = validator.escape(str);
      
      // ✅ Step 2: Normalize whitespace
      cleaned = validator.trim(cleaned);
      cleaned = validator.stripLow(cleaned); // Remove control chars
      
      // return str
      //   .trim()
      //   .replace(/[<>]/g, '')              // Remove HTML tags
      //   .replace(/javascript:/gi, '')      // Remove javascript: protocol
      //   .replace(/on\w+=/gi, '')           // Remove event handlers
      //   .replace(/script/gi, '')           // Remove script keyword
      //   .replace(/eval\(/gi, '');          // Remove eval

      // ✅ Step 3: Remove dangerous patterns (after escape)
      cleaned = cleaned
        .replace(/javascript:/gi, '')
        .replace(/data:/gi, '')
        .replace(/vbscript:/gi, '')
        .replace(/file:/gi, '')
        .replace(/on\w+\s*=/gi, ''); // Event handlers
      
      // ✅ Step 4: Limit length to prevent DOS
      if (cleaned.length > 10000) {
        cleaned = cleaned.substring(0, 10000);
      }
      
      return cleaned;
    };

    const sanitizeObject = (obj) => {
      const sanitized = {};
      
      for (const [key, value] of Object.entries(obj)) {
        // ✅ Sanitize keys too (prevent prototype pollution)
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          continue; // Skip dangerous keys
        }
        
        const cleanKey = validator.escape(key);

        if (typeof value === 'string') {
          sanitized[cleanKey] = sanitizeString(value);
        } else if (Array.isArray(value)) {
          sanitized[cleanKey] = value.map(item => 
            typeof item === 'string' ? sanitizeString(item) : 
            typeof item === 'object' && item !== null ? sanitizeObject(item) :
            item
          );
        } else if (value && typeof value === 'object') {
          sanitized[cleanKey] = sanitizeObject(value);
        } else {
          sanitized[cleanKey] = value;
        }
      }
      
      return sanitized;
    };

    // Sanitize specified fields or all fields
    if (req.body) {
      if (fields.length > 0) {
        fields.forEach(field => {
          if (req.body[field] !== undefined) {
            if (typeof req.body[field] === 'string') {
              req.body[field] = sanitizeString(req.body[field]);
            } else if (Array.isArray(req.body[field])) {
              req.body[field] = req.body[field].map(item =>
                typeof item === 'string' ? sanitizeString(item) : item
              );
            }
          }
        });
      } else {
        req.body = sanitizeObject(req.body);
      }
    }

    // ✅ Sanitize query params too
    if (req.query) {
      req.query = sanitizeObject(req.query);
    }
    
    // ✅ Sanitize path params
    if (req.params) {
      req.params = sanitizeObject(req.params);
    }

    next();
  };
};

// const sanitizeHTML = (input) => {
//   if (typeof input !== 'string') return input;
  
//   const sanitizeHtml = require('sanitize-html');
  
//   return sanitizeHtml(input, {
//     allowedTags: [], // No HTML allowed
//     allowedAttributes: {},
//     disallowedTagsMode: 'recursiveEscape'
//   });
// };

/**
 * ✅ STRICT HTML SANITIZATION (for rich text fields)
 */
const sanitizeHTML = (allowedTags = []) => {
  return (req, res, next) => {
    const sanitizeField = (field) => {
      if (typeof field !== 'string') return field;
      
      return sanitizeHtml(field, {
        allowedTags: allowedTags.length > 0 ? allowedTags : [],
        allowedAttributes: {},
        disallowedTagsMode: 'recursiveEscape',
        enforceHtmlBoundary: true
      });
    };

    if (req.body) {
      for (const [key, value] of Object.entries(req.body)) {
        if (typeof value === 'string') {
          req.body[key] = sanitizeField(value);
        }
      }
    }

    next();
  };
};

/**
 * Check for required fields in request body
 * @param {Array} requiredFields - Array of required field names
 */
const requireFields = (...requiredFields) => {
  return (req, res, next) => {
    const missingFields = [];

    for (const field of requiredFields) {
      if (!req.body || req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      return res.status(400).json(
        createResponse(
          false,
          `Missing required fields: ${missingFields.join(', ')}`
        )
      );
    }

    next();
  };
};

/**
 * Validate membership order creation
 */
const validateMembershipOrder = (req, res, next) => {
  const schema = Joi.object({
    tier: Joi.string()
      .valid('basic', 'advanced', 'premium')
      .required()
      .messages({
        'any.only': 'Tier must be one of: basic, advanced, premium',
        'any.required': 'Tier is required'
      }),
    
    billing_period: Joi.string()
      .valid('monthly', 'quarterly', 'yearly')
      .required()
      .messages({
        'any.only': 'Billing period must be one of: monthly, quarterly, yearly',
        'any.required': 'Billing period is required'
      }),
    
    coupon_code: Joi.string()
      .max(50)
      .optional()
      .allow('', null),
    
    return_url: Joi.string()
      .uri()
      .optional()
      .allow('', null)
  });

  const { error } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        details: errors
      }
    });
  }

  next();
};

module.exports = {
  // Core validation
  validate,
  // ...customValidations
  validateMultiple,
  
  // UUID validation
  validateUUIDParam,
  validateUUIDParams,
  
  // Query validation
  validatePagination,
  validateSort,
  validateDateRange,
  
  // File validation
  validateFileUpload,
  validateMultipleFiles,
  
  // Security
  sanitizeInput,
  requireFields,
  sanitizeHTML,

  // Custom validators
  validateMembershipOrder,

};