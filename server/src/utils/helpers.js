const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN;

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  console.error('JWT_SECRET or JWT_REFRESH_SECRET is not set in environment variables!');
  process.exit(1);
}

const generateAccessToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'eternity-tickets',
    audience: 'eternity-user',
    subject: payload.id
  });
};

const generateRefreshToken = (payload) => {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { 
    expiresIn: JWT_REFRESH_EXPIRES_IN,
    issuer: 'eternity-tickets',
    audience: 'eternity-user',
    subject: payload.id
  });
};

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

const decodeToken = (token) => {
  return jwt.decode(token);
};

const generateRandomToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};


const hashData = (data) => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

const generateSecureRandomString = (length = 10) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomBytes = crypto.randomBytes(length);
  
  for (let i = 0; i < length; i++) {
    result += chars[randomBytes[i] % chars.length];
  }
  
  return result;
};

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

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

const validatePhone = (phone) => {
  const phoneRegex = /^[\d\s+()-]{10,20}$/;
  return phoneRegex.test(phone);
};

const validateUUID = (uuid) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};


const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .replace(/script/gi, ''); // Remove script tags
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits:0
  }).format(amount);
};

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


const formatDate = (date, locale = 'vi-VN') => {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date));
};


const truncateText = (text, maxLength = 100) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};


const generateOrderNumber = () => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const uuid = uuidv4().split('-')[0];
  return `ORD-${dateStr}-${uuid.toUpperCase()}`;
};

const generateTicketCode = () => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const randomStr = generateSecureRandomString(8).toUpperCase();
  return `TKT-${dateStr}-${randomStr}`;
};

const generateQRData = (ticketCode, eventId, userId) => {
  const data = JSON.stringify({
    ticket: ticketCode,
    event: eventId,
    user: userId,
    timestamp: Date.now()
  });

  return Buffer.from(data).toString('base64');
};

const decodeQRData = (qrData) => {
  try {
    const decoded = Buffer.from(qrData, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch (error) {
    throw new Error('Invalid QR code data');
  }
};

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

const createErrorResponse = (message, code = null, details = null) => {
  const error = { message };
  
  if (code) error.code = code;
  if (details) error.details = details;

  return createResponse(false, null, error);
};

const isPastDate = (date) => {
  return new Date(date) < new Date();
};

const isFutureDate = (date) => {
  return new Date(date) > new Date();
};

const addMinutes = (date, minutes) => {
  return new Date(date.getTime() + minutes * 60000);
};

const getMinutesDifference = (date1, date2) => {
  return Math.floor((new Date(date2) - new Date(date1)) / 60000);
};

async function autoCompleteEvents() {
  try {
    console.log('🔄 Auto-completing past events...');
    
    const query = `
      UPDATE events
      SET status = 'completed', updated_at = NOW()
      WHERE status = 'approved'
        AND end_date < NOW()
      RETURNING id, title, end_date
    `;
    
    const result = await pool.query(query);
    
    if (result.rows.length > 0) {
      console.log(`✅ Auto-completed ${result.rows.length} events:`);
      result.rows.forEach(event => {
        console.log(`   - ${event.title} (ID: ${event.id}) ended at ${event.end_date}`);
      });
    } else {
      console.log('ℹ️  No events to complete');
    }
    
    return result.rows;
  } catch (error) {
    console.error('❌ Auto-complete events error:', error);
    throw error;
  }
}

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
  autoCompleteEvents,
  
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