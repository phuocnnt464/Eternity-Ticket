const { createResponse, validateUUID } = require('../utils/helpers');
const Joi = require('joi');
const validator = require('validator');
const sanitizeHtml = require('sanitize-html');

const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    let dataToValidate = req[source];
    
    if (req.is('multipart/form-data') && source === 'body') {
      const parsedData = {};

      const getJSONDepth = (obj, depth = 0) => {
        if (typeof obj !== 'object' || obj === null) return depth;
        if (Object.keys(obj).length === 0) return depth;
        return Math.max(...Object.values(obj).map(v => getJSONDepth(v, depth + 1)));
      };

      for (const key in dataToValidate) {
        try {
          const jsonValue = JSON.parse(dataToValidate[key]);
  
          const stringified = JSON.stringify(jsonValue);
          if (stringified.length > 100000) { // 100KB limit
            throw new Error('JSON payload too large');
          }
          
          const depth = getJSONDepth(jsonValue);
          if (depth > 10) {
            throw new Error('JSON nested too deep');
          }

          parsedData[key] = jsonValue;
        } catch(error) {
          parsedData[key] = dataToValidate[key];
        }
      }
      dataToValidate = parsedData;
    }

    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false, 
      allowUnknown: false, 
      stripUnknown: true, 
      convert: true, 
      presence: 'optional' 
    });

    if (error) {
      const formattedErrors = error.details.reduce((acc, curr) => {
        const field = curr.path.join('.') || 'general';

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
      // console.log(' Data received:', JSON.stringify(dataToValidate, null, 2));

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

    req[source] = value;

    req.validated = req.validated || {};
    req.validated[source] = true;

    next();
  };
};

const validateMultiple = (schemas) => {
  return (req, res, next) => {
    const errors = {};
    let hasError = false;

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

const validatePagination = (options = {}) => {
  const {
    defaultPage = 1,
    defaultLimit = 10,
    maxLimit = 100
  } = options;

  return (req, res, next) => {
    let page = parseInt(req.query.page) || defaultPage;
    let limit = parseInt(req.query.limit) || defaultLimit;

    if (page < 1) {
      page = defaultPage;
    }

    if (limit < 1) {
      limit = defaultLimit;
    }

    if (limit > maxLimit) {
      return res.status(400).json(
        createResponse(false, `Limit cannot exceed ${maxLimit}`)
      );
    }

    req.pagination = {
      page,
      limit,
      offset: (page - 1) * limit
    };

    next();
  };
};

const validateSort = (allowedFields = [], defaultSort = 'created_at:desc') => {
  return (req, res, next) => {
    const sortQuery = req.query.sort || defaultSort;
    const [field, order = 'asc'] = sortQuery.split(':');

    if (allowedFields.length > 0 && !allowedFields.includes(field)) {
      return res.status(400).json(
        createResponse(
          false, 
          `Invalid sort field. Allowed fields: ${allowedFields.join(', ')}`
        )
      );
    }

    if (!['asc', 'desc'].includes(order.toLowerCase())) {
      return res.status(400).json(
        createResponse(false, 'Sort order must be "asc" or "desc"')
      );
    }

    req.sort = {
      field,
      order: order.toLowerCase()
    };

    next();
  };
};

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

    if (start_date && end_date && req.query.start_date > req.query.end_date) {
      return res.status(400).json(
        createResponse(false, 'start_date must be before end_date')
      );
    }

    next();
  };
};

const validateFileUpload = (options = {}) => {
  const {
    allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'],
    maxSize = 2 * 1024 * 1024, 
    required = false,
    fieldName = 'file'
  } = options;

  return (req, res, next) => {
    const file = req.file || (req.files && req.files[fieldName]);

    if (required && !file) {
      return res.status(400).json(
        createResponse(false, `File upload is required for field: ${fieldName}`)
      );
    }

    if (!file) {
      return next();
    }

    const files = Array.isArray(file) ? file : [file];

    for (const uploadedFile of files) {
      if (!allowedTypes.includes(uploadedFile.mimetype)) {
        return res.status(400).json(
          createResponse(
            false,
            `File type "${uploadedFile.mimetype}" is not allowed. Allowed types: ${allowedTypes.join(', ')}`
          )
        );
      }

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

const validateMultipleFiles = (fieldConfigs = {}) => {
  return (req, res, next) => {
    if (!req.files) {
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
          if (config.allowedTypes && !config.allowedTypes.includes(file.mimetype)) {
            return res.status(400).json(
              createResponse(
                false,
                `Invalid file type for ${fieldName}. Allowed: ${config.allowedTypes.join(', ')}`
              )
            );
          }

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

const sanitizeInput = (fields = []) => {
  return (req, res, next) => {
    const sanitizeString = (str) => {
      if (typeof str !== 'string') return str;

      let cleaned = validator.escape(str);
      
      cleaned = validator.trim(cleaned);
      cleaned = validator.stripLow(cleaned); 
      
      cleaned = cleaned
        .replace(/javascript:/gi, '')
        .replace(/data:/gi, '')
        .replace(/vbscript:/gi, '')
        .replace(/file:/gi, '')
        .replace(/on\w+\s*=/gi, ''); // Event handlers
      
      if (cleaned.length > 10000) {
        cleaned = cleaned.substring(0, 10000);
      }
      
      return cleaned;
    };

    const sanitizeObject = (obj) => {
      const sanitized = {};
      
      for (const [key, value] of Object.entries(obj)) {
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          continue; 
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

    if (req.query) {
      req.query = sanitizeObject(req.query);
    }
    
    if (req.params) {
      req.params = sanitizeObject(req.params);
    }

    next();
  };
};

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