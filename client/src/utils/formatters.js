import { DEFAULTS, DATE_FORMATS } from './constants'

// ==========================================
// CURRENCY FORMATTERS
// ==========================================

/**
 * Format number to currency
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: VND)
 * @param {string} locale - Locale (default: vi-VN)
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currency = DEFAULTS.CURRENCY, locale = DEFAULTS.LOCALE) => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0 ₫'
  }
  
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency
    }).format(amount)
  } catch (error) {
    console.error('Currency format error:', error)
    return `${amount} ${currency}`
  }
}

/**
 * Format number to compact currency (1.2M, 500K, etc.)
 * @param {number} amount - Amount to format
 * @returns {string} Compact formatted currency
 */
export const formatCompactCurrency = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0 ₫'
  }
  
  try {
    return new Intl.NumberFormat(DEFAULTS.LOCALE, {
      style: 'currency',
      currency: DEFAULTS.CURRENCY,
      notation: 'compact',
      compactDisplay: 'short'
    }).format(amount)
  } catch (error) {
    console.error('Compact currency format error:', error)
    return formatCurrency(amount)
  }
}

/**
 * Format number with thousand separators
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
export const formatNumber = (num) => {
  if (num === null || num === undefined || isNaN(num)) {
    return '0'
  }
  
  return new Intl.NumberFormat(DEFAULTS.LOCALE).format(num)
}

// ==========================================
// DATE & TIME FORMATTERS
// ==========================================

/**
 * Format date to readable string
 * @param {string|Date} date - Date to format
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export const formatDate = (date, options = {}) => {
  if (!date) return ''
  
  const defaultOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return new Intl.DateTimeFormat(DEFAULTS.LOCALE, { ...defaultOptions, ...options }).format(dateObj)
  } catch (error) {
    console.error('Date format error:', error)
    return String(date)
  }
}

/**
 * Format date to short format (Jan 1, 2024)
 * @param {string|Date} date - Date to format
 * @returns {string} Short formatted date
 */
export const formatShortDate = (date) => {
  return formatDate(date, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

/**
 * Format date to time only
 * @param {string|Date} date - Date to format
 * @returns {string} Time string (HH:MM)
 */
export const formatTime = (date) => {
  if (!date) return ''
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return new Intl.DateTimeFormat(DEFAULTS.LOCALE, {
      hour: '2-digit',
      minute: '2-digit'
    }).format(dateObj)
  } catch (error) {
    console.error('Time format error:', error)
    return ''
  }
}

/**
 * Format date to datetime string
 * @param {string|Date} date - Date to format
 * @returns {string} Datetime string
 */
export const formatDateTime = (date) => {
  return formatDate(date, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Format date to relative time (2 hours ago, 3 days ago, etc.)
 * @param {string|Date} date - Date to format
 * @returns {string} Relative time string
 */
export const formatRelativeTime = (date) => {
  if (!date) return ''
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    const now = new Date()
    const diffInSeconds = Math.floor((now - dateObj) / 1000)
    
    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)}w ago`
    
    return formatShortDate(dateObj)
  } catch (error) {
    console.error('Relative time format error:', error)
    return ''
  }
}

// ==========================================
// TEXT FORMATTERS
// ==========================================

/**
 * Truncate text to specified length
 * @param {string} text - Text to truncate
 * @param {number} length - Max length
 * @param {string} suffix - Suffix to add (default: '...')
 * @returns {string} Truncated text
 */
export const truncateText = (text, length = 100, suffix = '...') => {
  if (!text) return ''
  if (text.length <= length) return text
  
  return text.substring(0, length).trim() + suffix
}

/**
 * Capitalize first letter
 * @param {string} text - Text to capitalize
 * @returns {string} Capitalized text
 */
export const capitalize = (text) => {
  if (!text) return ''
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
}

/**
 * Convert to title case
 * @param {string} text - Text to convert
 * @returns {string} Title cased text
 */
export const toTitleCase = (text) => {
  if (!text) return ''
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Create slug from text
 * @param {string} text - Text to slugify
 * @returns {string} Slug
 */
export const slugify = (text) => {
  if (!text) return ''
  
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
}

// ==========================================
// PHONE FORMATTERS
// ==========================================

/**
 * Format phone number
 * @param {string} phone - Phone number
 * @returns {string} Formatted phone
 */
export const formatPhone = (phone) => {
  if (!phone) return ''
  
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '')
  
  // Format Vietnamese phone number (0123 456 789)
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3')
  }
  
  return phone
}

// ==========================================
// FILE SIZE FORMATTER
// ==========================================

/**
 * Format file size to human readable
 * @param {number} bytes - File size in bytes
 * @param {number} decimals - Decimal places
 * @returns {string} Formatted file size
 */
export const formatFileSize = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

// ==========================================
// PERCENTAGE FORMATTER
// ==========================================

/**
 * Format number to percentage
 * @param {number} value - Value to format
 * @param {number} decimals - Decimal places
 * @returns {string} Formatted percentage
 */
export const formatPercentage = (value, decimals = 0) => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0%'
  }
  
  return `${value.toFixed(decimals)}%`
}

// ==========================================
// MASK FORMATTERS
// ==========================================

/**
 * Mask email address
 * @param {string} email - Email to mask
 * @returns {string} Masked email
 */
export const maskEmail = (email) => {
  if (!email) return ''
  
  const [name, domain] = email.split('@')
  if (!domain) return email
  
  const maskedName = name.length > 2
    ? name[0] + '*'.repeat(name.length - 2) + name[name.length - 1]
    : name[0] + '*'
  
  return `${maskedName}@${domain}`
}

/**
 * Mask phone number
 * @param {string} phone - Phone to mask
 * @returns {string} Masked phone
 */
export const maskPhone = (phone) => {
  if (!phone) return ''
  
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length < 4) return phone
  
  return cleaned.slice(0, -4).replace(/./g, '*') + cleaned.slice(-4)
}

// ==========================================
// EXPORTS
// ==========================================
export default {
  formatCurrency,
  formatCompactCurrency,
  formatNumber,
  formatDate,
  formatShortDate,
  formatTime,
  formatDateTime,
  formatRelativeTime,
  truncateText,
  capitalize,
  toTitleCase,
  slugify,
  formatPhone,
  formatFileSize,
  formatPercentage,
  maskEmail,
  maskPhone
}