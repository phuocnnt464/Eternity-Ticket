import { STORAGE_KEYS, UPLOAD_LIMITS } from './constants'

export const saveToStorage = (key, value) => {
  try {
    const serialized = JSON.stringify(value)
    localStorage.setItem(key, serialized)
  } catch (error) {
    console.error('Error saving to localStorage:', error)
  }
}

export const getFromStorage = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : defaultValue
  } catch (error) {
    console.error('Error reading from localStorage:', error)
    return defaultValue
  }
}

export const removeFromStorage = (key) => {
  try {
    localStorage.removeItem(key)
  } catch (error) {
    console.error('Error removing from localStorage:', error)
  }
}

export const clearStorage = () => {
  try {
    localStorage.clear()
  } catch (error) {
    console.error('Error clearing localStorage:', error)
  }
}

export const buildQueryString = (params) => {
  const query = Object.entries(params)
    .filter(([_, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return value.map(v => `${encodeURIComponent(key)}[]=${encodeURIComponent(v)}`).join('&')
      }
      return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
    })
    .join('&')
  
  return query ? `?${query}` : ''
}

export const parseQueryString = (queryString) => {
  if (!queryString) return {}
  
  const params = new URLSearchParams(queryString)
  const result = {}
  
  for (const [key, value] of params) {
    result[key] = value
  }
  
  return result
}

export const getUrlParams = () => {
  return parseQueryString(window.location.search)
}

export const updateUrlParams = (params) => {
  const currentParams = getUrlParams()
  const newParams = { ...currentParams, ...params }
  const queryString = buildQueryString(newParams)
  
  const newUrl = `${window.location.pathname}${queryString}`
  window.history.pushState({}, '', newUrl)
}

export const isValidFileType = (file, allowedTypes = UPLOAD_LIMITS.ALLOWED_IMAGE_TYPES) => {
  if (!file) return false
  return allowedTypes.includes(file.type)
}

export const isValidFileSize = (file, maxSize = UPLOAD_LIMITS.IMAGE_MAX_SIZE) => {
  if (!file) return false
  return file.size <= maxSize
}

export const readFileAsBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export const downloadFile = (url, filename) => {
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export const blobToFile = (blob, filename) => {
  return new File([blob], filename, { type: blob.type })
}

export const removeDuplicates = (arr, key = null) => {
  if (!Array.isArray(arr)) return []
  
  if (key) {
    return arr.filter((item, index, self) =>
      index === self.findIndex(t => t[key] === item[key])
    )
  }
  
  return [...new Set(arr)]
}

export const groupBy = (arr, key) => {
  if (!Array.isArray(arr)) return {}
  
  return arr.reduce((result, item) => {
    const group = item[key]
    if (!result[group]) {
      result[group] = []
    }
    result[group].push(item)
    return result
  }, {})
}

export const sortBy = (arr, key, order = 'asc') => {
  if (!Array.isArray(arr)) return []
  
  return [...arr].sort((a, b) => {
    const aVal = a[key]
    const bVal = b[key]
    
    if (aVal < bVal) return order === 'asc' ? -1 : 1
    if (aVal > bVal) return order === 'asc' ? 1 : -1
    return 0
  })
}

export const chunk = (arr, size) => {
  if (!Array.isArray(arr)) return []
  
  const chunks = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

export const deepClone = (obj) => {
  try {
    return JSON.parse(JSON.stringify(obj))
  } catch (error) {
    console.error('Deep clone error:', error)
    return obj
  }
}

export const isEmpty = (obj) => {
  if (obj === null || obj === undefined) return true
  if (Array.isArray(obj)) return obj.length === 0
  if (typeof obj === 'object') return Object.keys(obj).length === 0
  if (typeof obj === 'string') return obj.trim().length === 0
  return false
}

export const pick = (obj, keys) => {
  if (!obj || typeof obj !== 'object') return {}
  
  return keys.reduce((result, key) => {
    if (obj.hasOwnProperty(key)) {
      result[key] = obj[key]
    }
    return result
  }, {})
}

export const omit = (obj, keys) => {
  if (!obj || typeof obj !== 'object') return {}
  
  return Object.keys(obj).reduce((result, key) => {
    if (!keys.includes(key)) {
      result[key] = obj[key]
    }
    return result
  }, {})
}

export const debounce = (func, wait = 300) => {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

export const throttle = (func, limit = 300) => {
  let inThrottle
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

export const generateRandomString = (length = 10) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}


export const getRandomItem = (arr) => {
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}

export const copyToClipboard = async (text) => {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text)
      return true
    } else {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      return true
    }
  } catch (error) {
    console.error('Copy to clipboard error:', error)
    return false
  }
}

export const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null
}

export const getContrastColor = (hex) => {
  const rgb = hexToRgb(hex)
  if (!rgb) return 'black'
  
  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000
  return brightness > 128 ? 'black' : 'white'
}

export const scrollToTop = (smooth = true) => {
  window.scrollTo({
    top: 0,
    behavior: smooth ? 'smooth' : 'auto'
  })
}

export const scrollToElement = (element, options = {}) => {
  const el = typeof element === 'string' ? document.querySelector(element) : element
  if (!el) return
  
  el.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
    ...options
  })
}

export default {
  saveToStorage,
  getFromStorage,
  removeFromStorage,
  clearStorage,
  buildQueryString,
  parseQueryString,
  getUrlParams,
  updateUrlParams,
  isValidFileType,
  isValidFileSize,
  readFileAsBase64,
  downloadFile,
  blobToFile,
  removeDuplicates,
  groupBy,
  sortBy,
  chunk,
  deepClone,
  isEmpty,
  pick,
  omit,
  debounce,
  throttle,
  generateRandomString,
  generateUUID,
  getRandomItem,
  copyToClipboard,
  sleep,
  hexToRgb,
  getContrastColor,
  scrollToTop,
  scrollToElement
}