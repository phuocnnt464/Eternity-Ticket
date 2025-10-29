// src/utils/helpers.js
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'EternityTicketsSecretKey@464';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'EternityTicketsRefreshSecretKey@464';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// Validate JWT secrets on startup
if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  console.error('❌ CRITICAL: JWT_SECRET or JWT_REFRESH_SECRET is not set in environment variables!');
  process.exit(1);
}

/**
 * Generate JWT access token
 * @param {Object} payload - Token payload
 * @returns {String} JWT token
 */
const generateAccessToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'eternity-tickets',
    audience: 'eternity-user',
    subject: payload.id
  });
};

/**
 * Generate JWT refresh token
 * @param {Object} payload - Token payload
 * @returns {String} JWT refresh token
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { 
    expiresIn: JWT_REFRESH_EXPIRES_IN,
    issuer: 'eternity-tickets',
    audience: 'eternity-user',
    subject: payload.id
  });
};

/**
 * Verify JWT token
 * @param {String} token - JWT token
 * @param {String} secret - Secret key (optional)
 * @returns {Object} Decoded token
 */
const verifyToken = (token, secret = JWT_SECRET) => {
  try { 
    return jwt.verify(token, secret, {
      issuer: 'eternity-tickets',
      audience: 'eternity-user'
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Decode JWT token without verification (for debugging)
 * @param {String} token - JWT token
 * @returns {Object} Decoded token
 */
const decodeToken = (token) => {
  return jwt.decode(token);
};

/**
 * Generate random token for email verification, password reset, etc.
 * @param {Number} length - Token length (default: 32)
 * @returns {String} Random token
 */
const generateRandomToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Hash sensitive data
 * @param {String} data - Data to hash
 * @returns {String} Hashed data
 */
const hashData = (data) => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

/**
 * Generate secure random string
 * @param {Number} length - String length
 * @returns {String} Random alphanumeric string
 */
const generateSecureRandomString = (length = 10) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomBytes = crypto.randomBytes(length);
  
  for (let i = 0; i < length; i++) {
    result += chars[randomBytes[i] % chars.length];
  }
  
  return result;
};


/**
 * Validate email format
 * @param {String} email - Email to validate
 * @returns {Boolean} Is valid email
 */
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 * @param {String} password - Password to validate
 * @returns {Object} Validation result
 */
const validatePassword = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  const errors = [];
  
  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }
  if (!hasUpperCase) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!hasLowerCase) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!hasNumbers) {
    errors.push('Password must contain at least one number');
  }
  if (!hasSpecialChar) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength: calculatePasswordStrength(password)
  };
};

/**
 * Calculate password strength
 * @param {String} password - Password to analyze
 * @returns {String} Strength level
 */
const calculatePasswordStrength = (password) => {
  let score = 0;
  
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  
  if (score <= 3) return 'weak';
  if (score <= 5) return 'medium';
  return 'strong';
};

/**
 * Validate phone number (international format)
 * @param {String} phone - Phone number
 * @returns {Boolean} Is valid phone
 */
const validatePhone = (phone) => {
  const phoneRegex = /^[\d\s+()-]{10,20}$/;
  return phoneRegex.test(phone);
};

/**
 * Validate UUID
 * @param {String} uuid - UUID to validate
 * @returns {Boolean} Is valid UUID
 */
const validateUUID = (uuid) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};


/**
 * Sanitize user input
 * @param {String} input - Input to sanitize
 * @returns {String} Sanitized input
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .replace(/script/gi, ''); // Remove script tags
};

/**
 * Format currency (VND)
 * @param {Number} amount - Amount to format
 * @returns {String} Formatted currency
 */
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits:0
  }).format(amount);
};

/**
 * Generate slug from text
 * @param {String} text - Text to convert
 * @returns {String} URL-friendly slug
 */
const generateSlug = (text) => {
  if (!text) return '';

  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[áàảãạăắằẳẵặâấầẩẫậ]/g, 'a')
    .replace(/[éèẻẽẹêếềểễệ]/g, 'e')
    .replace(/[íìỉĩị]/g, 'i')
    .replace(/[óòỏõọôốồổỗộơớờởỡợ]/g, 'o')
    .replace(/[úùủũụưứừửữự]/g, 'u')
    .replace(/[ýỳỷỹỵ]/g, 'y')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

/**
 * Format date/time
 * @param {Date|String} date - Date to format
 * @param {String} locale - Locale (default: 'vi-VN')
 * @returns {String} Formatted date
 */ 
const formatDate = (date, locale = 'vi-VN') => {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date));
};

/**
 * Truncate text with ellipsis
 * @param {String} text - Text to truncate
 * @param {Number} maxLength - Maximum length
 * @returns {String} Truncated text
 */
const truncateText = (text, maxLength = 100) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};

/**
 * Generate order number
 * @returns {String} Unique order number
 */
// const generateOrderNumber = () => {
//   const timestamp = Date.now().toString();
//   const randomNum = Math.random().toString(36).substr(2, 5).toUpperCase();
//   return `ET${timestamp.slice(-6)}${randomNum}`;
// };

/**
 * Generate unique order number
 * Format: ORD-YYYYMMDD-XXXXXXXX
 * @returns {String} Unique order number
 */
const generateOrderNumber = () => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  // const randomStr = generateSecureRandomString(8).toUpperCase();
  const uuid = uuidv4().split('-')[0];
  return `ORD-${dateStr}-${uuid.toUpperCase()}`;
};

/**
 * Generate unique ticket code
 * Format: TKT-YYYYMMDD-XXXXXXXX
 * @returns {String} Unique ticket code
 */
const generateTicketCode = () => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const randomStr = generateSecureRandomString(8).toUpperCase();
  return `TKT-${dateStr}-${randomStr}`;
};

/**
 * Generate QR code data for ticket
 * @param {String} ticketCode - Ticket code
 * @param {String} eventId - Event ID
 * @param {String} userId - User ID
 * @returns {String} QR code data (encrypted)
 */
const generateQRData = (ticketCode, eventId, userId) => {
  const data = JSON.stringify({
    ticket: ticketCode,
    event: eventId,
    user: userId,
    timestamp: Date.now()
  });
  
  // Encrypt or encode the data
  return Buffer.from(data).toString('base64');
};

/**
 * Decode QR code data
 * @param {String} qrData - Encoded QR data
 * @returns {Object} Decoded data
 */
const decodeQRData = (qrData) => {
  try {
    const decoded = Buffer.from(qrData, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch (error) {
    throw new Error('Invalid QR code data');
  }
};

/**
 * Paginate results
 * @param {Number} page - Current page
 * @param {Number} limit - Items per page
 * @returns {Object} Pagination info
 */
// const paginate = (page = 1, limit = 10) => {
//   const offset = (page - 1) * limit;
//   return {
//     limit: parseInt(limit),
//     offset: parseInt(offset),
//     page: parseInt(page)
//   };
// };

// =============================================
// PAGINATION & RESPONSE
// =============================================

/**
 * Calculate pagination metadata
 * @param {Number} page - Current page
 * @param {Number} limit - Items per page
 * @param {Number} total - Total items
 * @returns {Object} Pagination metadata
 */
const paginate = (page = 1, limit = 10, total = 0) => {
  const currentPage = Math.max(1, parseInt(page));
  const itemsPerPage = Math.max(1, Math.min(100, parseInt(limit))); // Max 100 items
  const totalPages = Math.ceil(total / itemsPerPage);
  const offset = (currentPage - 1) * itemsPerPage;

  return {
    page: currentPage,
    limit: itemsPerPage,
    total: parseInt(total),
    pages: totalPages,
    offset: offset,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1
  };
};

/**
 * Create standardized API response
 * @param {Boolean} success - Success status
 * @param {String} message - Response message
 * @param {Any} data - Response data
 * @param {Object} meta - Additional metadata
 * @returns {Object} Standardized response
 */
// const createResponse = (success = true, message = '', data = null, meta = {}) => {
//   const response = {
//     success,
//     message,
//     timestamp: new Date().toISOString()
//   };

//   if (data !== null) {
//     response.data = data;
//   }

//   if (Object.keys(meta).length > 0) {
//     response.meta = meta;
//   }

//   return response;
// };


/**
 * Create standardized API response
 * @param {Boolean} success - Success status
 * @param {String} message - Response message
 * @param {Any} data - Response data (optional)
 * @param {Object} meta - Additional metadata (optional)
 * @returns {Object} Standardized response
 */
const createResponse = (success = true, message = '', data = null, meta = null) => {
  const response = {
    success,
    timestamp: new Date().toISOString()
  };

  if (message) {
    response.message = message;
  }

  if (success && data !== null) {
    response.data = data;
  }

  if (!success && data !== null) {
    response.error = typeof data === 'string' ? { message: data } : data;
  }

  if (meta && Object.keys(meta).length > 0) {
    response.meta = meta;
  }

  return response;
};

/**
 * Create error response
 * @param {String} message - Error message
 * @param {String} code - Error code (optional)
 * @param {Object} details - Error details (optional)
 * @returns {Object} Error response
 */
const createErrorResponse = (message, code = null, details = null) => {
  const error = { message };
  
  if (code) error.code = code;
  if (details) error.details = details;

  return createResponse(false, null, error);
};

// =============================================
// DATE & TIME UTILITIES
// =============================================

/**
 * Check if date is in the past
 * @param {Date|String} date - Date to check
 * @returns {Boolean} Is past date
 */
const isPastDate = (date) => {
  return new Date(date) < new Date();
};

/**
 * Check if date is in the future
 * @param {Date|String} date - Date to check
 * @returns {Boolean} Is future date
 */
const isFutureDate = (date) => {
  return new Date(date) > new Date();
};

/**
 * Add minutes to date
 * @param {Date} date - Base date
 * @param {Number} minutes - Minutes to add
 * @returns {Date} New date
 */
const addMinutes = (date, minutes) => {
  return new Date(date.getTime() + minutes * 60000);
};

/**
 * Calculate time difference in minutes
 * @param {Date} date1 - Start date
 * @param {Date} date2 - End date
 * @returns {Number} Difference in minutes
 */
const getMinutesDifference = (date1, date2) => {
  return Math.floor((new Date(date2) - new Date(date1)) / 60000);
};

module.exports = {
  //jwt
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  decodeToken,

  // Crypto & Tokens
  generateRandomToken,
  hashData,
  generateSecureRandomString,

  //validation
  validateEmail,
  validatePassword,
  calculatePasswordStrength,
  validatePhone,
  validateUUID,

  // Sanitization & Formatting
  sanitizeInput,
  formatCurrency,
  generateSlug,
  formatDate,
  truncateText,
  
  // Order & Tickets
  generateOrderNumber,
  generateTicketCode,
  generateQRData,
  decodeQRData,

  // Pagination & Response
  paginate,
  createResponse,
  createErrorResponse,

  // Date & Time
  isPastDate,
  isFutureDate,
  addMinutes,
  getMinutesDifference
};