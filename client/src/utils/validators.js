import { VALIDATION_RULES, UPLOAD_LIMITS } from './constants'
export const required = (value) => {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') return Object.keys(value).length > 0
  return true
}

export const isEmail = (email) => {
  if (!email) return false
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.trim())
}

export const isPhone = (phone) => {
  if (!phone) return false
  const phoneRegex = /^[0-9]{10,15}$/
  const cleaned = phone.replace(/\D/g, '')
  return phoneRegex.test(cleaned)
}

export const isUrl = (url) => {
  if (!url) return false
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

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

export const lengthBetween = (value, min, max) => {
  if (!value) return false
  const length = String(value).length
  return length >= min && length <= max
}

export const minLength = (value, min) => {
  if (!value) return false
  return String(value).length >= min
}

export const maxLength = (value, max) => {
  if (!value) return true // Empty is valid for max length
  return String(value).length <= max
}

export const between = (value, min, max) => {
  const num = Number(value)
  return !isNaN(num) && num >= min && num <= max
}

export const minValue = (value, min) => {
  const num = Number(value)
  return !isNaN(num) && num >= min
}

export const maxValue = (value, max) => {
  const num = Number(value)
  return !isNaN(num) && num <= max
}

export const isValidPassword = (password) => {
  if (!password) return false
  return password.length >= VALIDATION_RULES.PASSWORD_MIN_LENGTH
}

export const isStrongPassword = (password) => {
  if (!password) return false
  
  const hasUpperCase = /[A-Z]/.test(password)
  const hasLowerCase = /[a-z]/.test(password)
  const hasNumbers = /\d/.test(password)
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)
  const isLongEnough = password.length >= VALIDATION_RULES.PASSWORD_MIN_LENGTH
  
  return hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar && isLongEnough
}

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

export const passwordsMatch = (password, confirmation) => {
  return password === confirmation && password.length > 0
}

export const isValidDate = (date) => {
  if (!date) return false
  const dateObj = date instanceof Date ? date : new Date(date)
  return dateObj instanceof Date && !isNaN(dateObj)
}

export const isFutureDate = (date) => {
  if (!isValidDate(date)) return false
  const dateObj = date instanceof Date ? date : new Date(date)
  return dateObj > new Date()
}

export const isPastDate = (date) => {
  if (!isValidDate(date)) return false
  const dateObj = date instanceof Date ? date : new Date(date)
  return dateObj < new Date()
}

export const isDateBefore = (date1, date2) => {
  if (!isValidDate(date1) || !isValidDate(date2)) return false
  const d1 = date1 instanceof Date ? date1 : new Date(date1)
  const d2 = date2 instanceof Date ? date2 : new Date(date2)
  return d1 < d2
}

export const isDateAfter = (date1, date2) => {
  if (!isValidDate(date1) || !isValidDate(date2)) return false
  const d1 = date1 instanceof Date ? date1 : new Date(date1)
  const d2 = date2 instanceof Date ? date2 : new Date(date2)
  return d1 > d2
}

export const isValidFileType = (file, allowedTypes = UPLOAD_LIMITS.ALLOWED_IMAGE_TYPES) => {
  if (!file) return false
  return allowedTypes.includes(file.type)
}

export const isValidFileSize = (file, maxSize = UPLOAD_LIMITS.IMAGE_MAX_SIZE) => {
  if (!file) return false
  return file.size <= maxSize
}

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

export const isAlphanumeric = (value) => {
  if (!value) return false
  return /^[a-zA-Z0-9]+$/.test(value)
}

export const isAlpha = (value) => {
  if (!value) return false
  return /^[a-zA-Z]+$/.test(value)
}

export const matchesPattern = (value, pattern) => {
  if (!value) return false
  return pattern.test(value)
}

export const isIn = (value, allowedValues) => {
  return allowedValues.includes(value)
}

export const isUnique = (value, array, key = null) => {
  if (!Array.isArray(array)) return true
  
  if (key) {
    return !array.some(item => item[key] === value)
  }
  
  return !array.includes(value)
}

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