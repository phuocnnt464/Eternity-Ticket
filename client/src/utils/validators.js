import { VALIDATION_RULES, UPLOAD_LIMITS } from './constants'

// ==========================================
// BASIC VALIDATORS
// ==========================================

/**
 * Check if value is required (not empty)
 * @param {any} value - Value to check
 * @returns {boolean} Is valid
 */
export const required = (value) => {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') return Object.keys(value).length > 0
  return true
}

/**
 * Check if value is a valid email
 * @param {string} email - Email to validate
 * @returns {boolean} Is valid
 */
export const isEmail = (email) => {
  if (!email) return false
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.trim())
}

/**
 * Check if value is a valid phone number
 * @param {string} phone - Phone to validate
 * @returns {boolean} Is valid
 */
export const isPhone = (phone) => {
  if (!phone) return false
  const phoneRegex = /^[0-9]{10,15}$/
  const cleaned = phone.replace(/\D/g, '')
  return phoneRegex.test(cleaned)
}

/**
 * Check if value is a valid URL
 * @param {string} url - URL to validate
 * @returns {boolean} Is valid
 */
export const isUrl = (url) => {
  if (!url) return false
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Check if value is numeric
 * @param {any} value - Value to check
 * @returns {boolean} Is numeric
 */
export const isNumeric = (value) => {
  return !isNaN(parseFloat(value)) && isFinite(value)
}

/**
 * Check if value is an integer
 * @param {any} value - Value to check
 * @returns {boolean} Is integer
 */
export const isInteger = (value) => {
  return Number.isInteger(Number(value))
}

// ==========================================
// LENGTH VALIDATORS
// ==========================================

/**
 * Check if string length is within min/max
 * @param {string} value - Value to check
 * @param {number} min - Minimum length
 * @param {number} max - Maximum length
 * @returns {boolean} Is valid
 */
export const lengthBetween = (value, min, max) => {
  if (!value) return false
  const length = String(value).length
  return length >= min && length <= max
}

/**
 * Check if string meets minimum length
 * @param {string} value - Value to check
 * @param {number} min - Minimum length
 * @returns {boolean} Is valid
 */
export const minLength = (value, min) => {
  if (!value) return false
  return String(value).length >= min
}

/**
 * Check if string doesn't exceed maximum length
 * @param {string} value - Value to check
 * @param {number} max - Maximum length
 * @returns {boolean} Is valid
 */
export const maxLength = (value, max) => {
  if (!value) return true // Empty is valid for max length
  return String(value).length <= max
}

// ==========================================
// NUMBER VALIDATORS
// ==========================================

/**
 * Check if number is within min/max range
 * @param {number} value - Value to check
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {boolean} Is valid
 */
export const between = (value, min, max) => {
  const num = Number(value)
  return !isNaN(num) && num >= min && num <= max
}

/**
 * Check if number is greater than or equal to min
 * @param {number} value - Value to check
 * @param {number} min - Minimum value
 * @returns {boolean} Is valid
 */
export const minValue = (value, min) => {
  const num = Number(value)
  return !isNaN(num) && num >= min
}

/**
 * Check if number is less than or equal to max
 * @param {number} value - Value to check
 * @param {number} max - Maximum value
 * @returns {boolean} Is valid
 */
export const maxValue = (value, max) => {
  const num = Number(value)
  return !isNaN(num) && num <= max
}

// ==========================================
// PASSWORD VALIDATORS
// ==========================================

/**
 * Check if password meets minimum requirements
 * @param {string} password - Password to validate
 * @returns {boolean} Is valid
 */
export const isValidPassword = (password) => {
  if (!password) return false
  return password.length >= VALIDATION_RULES.PASSWORD_MIN_LENGTH
}

/**
 * Check if password is strong
 * @param {string} password - Password to validate
 * @returns {boolean} Is strong
 */
export const isStrongPassword = (password) => {
  if (!password) return false
  
  const hasUpperCase = /[A-Z]/.test(password)
  const hasLowerCase = /[a-z]/.test(password)
  const hasNumbers = /\d/.test(password)
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)
  const isLongEnough = password.length >= VALIDATION_RULES.PASSWORD_MIN_LENGTH
  
  return hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar && isLongEnough
}

/**
 * Get password strength level
 * @param {string} password - Password to check
 * @returns {object} Strength info
 */
export const getPasswordStrength = (password) => {
  if (!password) {
    return { level: 0, text: 'Very Weak', color: 'red' }
  }
  
  let strength = 0
  
  if (password.length >= 8) strength++
  if (password.length >= 12) strength++
  if (/[a-z]/.test(password)) strength++
  if (/[A-Z]/.test(password)) strength++
  if (/\d/.test(password)) strength++
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++
  
  const levels = [
    { level: 0, text: 'Very Weak', color: 'red' },
    { level: 1, text: 'Weak', color: 'orange' },
    { level: 2, text: 'Fair', color: 'yellow' },
    { level: 3, text: 'Good', color: 'blue' },
    { level: 4, text: 'Strong', color: 'green' },
    { level: 5, text: 'Very Strong', color: 'green' }
  ]
  
  return levels[Math.min(strength, 5)]
}

/**
 * Check if passwords match
 * @param {string} password - Password
 * @param {string} confirmation - Confirmation password
 * @returns {boolean} Do match
 */
export const passwordsMatch = (password, confirmation) => {
  return password === confirmation && password.length > 0
}

// ==========================================
// DATE VALIDATORS
// ==========================================

/**
 * Check if date is valid
 * @param {string|Date} date - Date to validate
 * @returns {boolean} Is valid
 */
export const isValidDate = (date) => {
  if (!date) return false
  const dateObj = date instanceof Date ? date : new Date(date)
  return dateObj instanceof Date && !isNaN(dateObj)
}

/**
 * Check if date is in the future
 * @param {string|Date} date - Date to check
 * @returns {boolean} Is future date
 */
export const isFutureDate = (date) => {
  if (!isValidDate(date)) return false
  const dateObj = date instanceof Date ? date : new Date(date)
  return dateObj > new Date()
}

/**
 * Check if date is in the past
 * @param {string|Date} date - Date to check
 * @returns {boolean} Is past date
 */
export const isPastDate = (date) => {
  if (!isValidDate(date)) return false
  const dateObj = date instanceof Date ? date : new Date(date)
  return dateObj < new Date()
}

/**
 * Check if date is before another date
 * @param {string|Date} date1 - First date
 * @param {string|Date} date2 - Second date
 * @returns {boolean} Is before
 */
export const isDateBefore = (date1, date2) => {
  if (!isValidDate(date1) || !isValidDate(date2)) return false
  const d1 = date1 instanceof Date ? date1 : new Date(date1)
  const d2 = date2 instanceof Date ? date2 : new Date(date2)
  return d1 < d2
}

/**
 * Check if date is after another date
 * @param {string|Date} date1 - First date
 * @param {string|Date} date2 - Second date
 * @returns {boolean} Is after
 */
export const isDateAfter = (date1, date2) => {
  if (!isValidDate(date1) || !isValidDate(date2)) return false
  const d1 = date1 instanceof Date ? date1 : new Date(date1)
  const d2 = date2 instanceof Date ? date2 : new Date(date2)
  return d1 > d2
}

// ==========================================
// FILE VALIDATORS
// ==========================================

/**
 * Validate file type
 * @param {File} file - File to validate
 * @param {array} allowedTypes - Allowed MIME types
 * @returns {boolean} Is valid
 */
export const isValidFileType = (file, allowedTypes = UPLOAD_LIMITS.ALLOWED_IMAGE_TYPES) => {
  if (!file) return false
  return allowedTypes.includes(file.type)
}

/**
 * Validate file size
 * @param {File} file - File to validate
 * @param {number} maxSize - Max size in bytes
 * @returns {boolean} Is valid
 */
export const isValidFileSize = (file, maxSize = UPLOAD_LIMITS.IMAGE_MAX_SIZE) => {
  if (!file) return false
  return file.size <= maxSize
}

/**
 * Validate image dimensions
 * @param {File} file - Image file
 * @param {object} dimensions - {minWidth, maxWidth, minHeight, maxHeight}
 * @returns {Promise<boolean>} Is valid
 */
export const isValidImageDimensions = (file, dimensions = {}) => {
  return new Promise((resolve) => {
    if (!file || !file.type.startsWith('image/')) {
      resolve(false)
      return
    }
    
    const img = new Image()
    const url = URL.createObjectURL(file)
    
    img.onload = () => {
      URL.revokeObjectURL(url)
      
      const { minWidth, maxWidth, minHeight, maxHeight } = dimensions
      let valid = true
      
      if (minWidth && img.width < minWidth) valid = false
      if (maxWidth && img.width > maxWidth) valid = false
      if (minHeight && img.height < minHeight) valid = false
      if (maxHeight && img.height > maxHeight) valid = false
      
      resolve(valid)
    }
    
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(false)
    }
    
    img.src = url
  })
}

// ==========================================
// CUSTOM VALIDATORS
// ==========================================

/**
 * Check if string contains only alphanumeric characters
 * @param {string} value - Value to check
 * @returns {boolean} Is alphanumeric
 */
export const isAlphanumeric = (value) => {
  if (!value) return false
  return /^[a-zA-Z0-9]+$/.test(value)
}

/**
 * Check if string contains only letters
 * @param {string} value - Value to check
 * @returns {boolean} Is alpha only
 */
export const isAlpha = (value) => {
  if (!value) return false
  return /^[a-zA-Z]+$/.test(value)
}

/**
 * Check if value matches regex pattern
 * @param {string} value - Value to check
 * @param {RegExp} pattern - Regex pattern
 * @returns {boolean} Matches pattern
 */
export const matchesPattern = (value, pattern) => {
  if (!value) return false
  return pattern.test(value)
}

/**
 * Check if value is in allowed list
 * @param {any} value - Value to check
 * @param {array} allowedValues - Allowed values
 * @returns {boolean} Is allowed
 */
export const isIn = (value, allowedValues) => {
  return allowedValues.includes(value)
}

/**
 * Check if value is unique in array
 * @param {any} value - Value to check
 * @param {array} array - Array to check against
 * @param {string} key - Key for object arrays
 * @returns {boolean} Is unique
 */
export const isUnique = (value, array, key = null) => {
  if (!Array.isArray(array)) return true
  
  if (key) {
    return !array.some(item => item[key] === value)
  }
  
  return !array.includes(value)
}

// ==========================================
// VALIDATION ERROR MESSAGES
// ==========================================

/**
 * Get validation error message
 * @param {string} rule - Validation rule name
 * @param {string} field - Field name
 * @param {any} params - Rule parameters
 * @returns {string} Error message
 */
export const getErrorMessage = (rule, field, params = {}) => {
  const messages = {
    required: `${field} is required`,
    email: `${field} must be a valid email`,
    phone: `${field} must be a valid phone number`,
    url: `${field} must be a valid URL`,
    numeric: `${field} must be a number`,
    integer: `${field} must be an integer`,
    minLength: `${field} must be at least ${params.min} characters`,
    maxLength: `${field} must not exceed ${params.max} characters`,
    minValue: `${field} must be at least ${params.min}`,
    maxValue: `${field} must not exceed ${params.max}`,
    between: `${field} must be between ${params.min} and ${params.max}`,
    password: `${field} must be at least ${VALIDATION_RULES.PASSWORD_MIN_LENGTH} characters`,
    passwordMatch: 'Passwords do not match',
    fileType: `${field} must be a valid file type`,
    fileSize: `${field} size must not exceed ${params.maxSize}`,
    futureDate: `${field} must be a future date`,
    pastDate: `${field} must be a past date`
  }
  
  return messages[rule] || `${field} is invalid`
}

// ==========================================
// EXPORTS
// ==========================================
export default {
  required,
  isEmail,
  isPhone,
  isUrl,
  isNumeric,
  isInteger,
  lengthBetween,
  minLength,
  maxLength,
  between,
  minValue,
  maxValue,
  isValidPassword,
  isStrongPassword,
  getPasswordStrength,
  passwordsMatch,
  isValidDate,
  isFutureDate,
  isPastDate,
  isDateBefore,
  isDateAfter,
  isValidFileType,
  isValidFileSize,
  isValidImageDimensions,
  isAlphanumeric,
  isAlpha,
  matchesPattern,
  isIn,
  isUnique,
  getErrorMessage
}