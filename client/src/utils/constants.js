// ==========================================
// ROLE CONSTANTS
// ==========================================
export const USER_ROLES = {
  ADMIN: 'admin',
  SUB_ADMIN: 'sub_admin',
  ORGANIZER: 'organizer',
  PARTICIPANT: 'participant'
}

// ==========================================
// EVENT STATUS
// ==========================================
export const EVENT_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',  // ✅ THAY ĐỔI: từ 'pending_approval' → 'pending'
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
  ACTIVE: 'active',
  COMPLETED: 'completed'
}

// ==========================================
// ORDER STATUS
// ==========================================
export const ORDER_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired'
}

// ==========================================
// TICKET STATUS
// ==========================================
export const TICKET_STATUS = {
  VALID: 'valid',
  CHECKED_IN: 'checked_in',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled'
}

// ==========================================
// MEMBERSHIP TIERS
// ==========================================
export const MEMBERSHIP_TIERS = {
  BASIC: 'basic',
  PREMIUM: 'premium',
  VIP: 'vip'
}

export const MEMBERSHIP_BENEFITS = {
  basic: {
    name: 'Basic',
    price: 0,
    discount: 0,
    features: [
      'Browse all events',
      'Purchase tickets',
      'Email support'
    ]
  },
  premium: {
    name: 'Premium',
    price: 99000,
    discount: 10,
    features: [
      'All Basic features',
      'Priority support',
      '10% discount on all tickets',
      'Early access to tickets',
      'Exclusive member events'
    ]
  },
  vip: {
    name: 'VIP',
    price: 299000,
    discount: 20,
    features: [
      'All Premium features',
      'Dedicated account manager',
      '20% discount on all tickets',
      'VIP lounge access',
      'Meet & greet opportunities',
      'Exclusive merchandise'
    ]
  }
}

// ==========================================
// REFUND STATUS
// ==========================================
export const REFUND_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  COMPLETED: 'completed'
}

// ==========================================
// NOTIFICATION TYPES
// ==========================================
export const NOTIFICATION_TYPES = {
  ORDER: 'order',
  TICKET: 'ticket',
  EVENT: 'event',
  SYSTEM: 'system',
  PROMOTION: 'promotion'
}

// ==========================================
// PAYMENT METHODS
// ==========================================
export const PAYMENT_METHODS = {
  CREDIT_CARD: 'credit_card',
  DEBIT_CARD: 'debit_card',
  BANK_TRANSFER: 'bank_transfer',
  E_WALLET: 'e_wallet',
  CASH: 'cash'
}

// ==========================================
// DATE FORMATS
// ==========================================
export const DATE_FORMATS = {
  FULL: 'YYYY-MM-DD HH:mm:ss',
  DATE_ONLY: 'YYYY-MM-DD',
  TIME_ONLY: 'HH:mm:ss',
  DATETIME_LOCAL: 'YYYY-MM-DDTHH:mm',
  DISPLAY: 'MMM DD, YYYY',
  DISPLAY_FULL: 'MMMM DD, YYYY HH:mm'
}

// ==========================================
// PAGINATION
// ==========================================
export const PAGINATION_DEFAULTS = {
  PER_PAGE: 12,
  MAX_PER_PAGE: 100,
  MIN_PER_PAGE: 5
}

// ==========================================
// FILE UPLOAD LIMITS
// ==========================================
export const UPLOAD_LIMITS = {
  IMAGE_MAX_SIZE: 5 * 1024 * 1024, // 5MB
  DOCUMENT_MAX_SIZE: 10 * 1024 * 1024, // 10MB
  AVATAR_MAX_SIZE: 2 * 1024 * 1024, // 2MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
}

// ==========================================
// VALIDATION RULES
// ==========================================
export const VALIDATION_RULES = {
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 50,
  PHONE_MIN_LENGTH: 10,
  PHONE_MAX_LENGTH: 15,
  EMAIL_MAX_LENGTH: 255,
  TEXT_MAX_LENGTH: 1000,
  DESCRIPTION_MAX_LENGTH: 5000
}

// ==========================================
// API ENDPOINTS BASE
// ==========================================
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

// ==========================================
// STORAGE KEYS
// ==========================================
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
  THEME: 'theme',
  LANGUAGE: 'language',
  CART: 'cart_data'
}

// ==========================================
// ROUTE NAMES
// ==========================================
export const ROUTE_NAMES = {
  HOME: 'Home',
  LOGIN: 'Login',
  REGISTER: 'Register',
  EVENTS: 'EventList',
  EVENT_DETAIL: 'EventDetail',
  EVENT_CHECKOUT: 'EventCheckout',
  
  // Participant
  PARTICIPANT_PROFILE: 'ParticipantProfile',
  MY_TICKETS: 'MyTickets',
  MY_ORDERS: 'MyOrders',
  MEMBERSHIP: 'Membership',
  
  // Organizer
  ORGANIZER_DASHBOARD: 'OrganizerDashboard',
  MY_EVENTS: 'MyEvents',
  CREATE_EVENT: 'CreateEvent',
  EDIT_EVENT: 'EditEvent',
  
  // Admin
  ADMIN_DASHBOARD: 'AdminDashboard',
  EVENT_APPROVAL: 'EventApproval',
  USER_MANAGEMENT: 'UserManagement',
  
  // Errors
  NOT_FOUND: 'NotFound',
  FORBIDDEN: 'Forbidden',
  SERVER_ERROR: 'ServerError'
}

// ==========================================
// TOAST DURATIONS
// ==========================================
export const TOAST_DURATION = {
  SUCCESS: 3000,
  ERROR: 5000,
  WARNING: 4000,
  INFO: 3000
}

// ==========================================
// CHART COLORS
// ==========================================
export const CHART_COLORS = {
  PRIMARY: '#3b82f6',
  SUCCESS: '#10b981',
  WARNING: '#f59e0b',
  DANGER: '#ef4444',
  INFO: '#06b6d4',
  PURPLE: '#8b5cf6',
  PINK: '#ec4899'
}

// ==========================================
// SOCIAL LINKS
// ==========================================
export const SOCIAL_LINKS = {
  FACEBOOK: 'https://facebook.com/eternityticket',
  TWITTER: 'https://twitter.com/eternityticket',
  INSTAGRAM: 'https://instagram.com/eternityticket',
  LINKEDIN: 'https://linkedin.com/company/eternityticket'
}

// ==========================================
// DEFAULT VALUES
// ==========================================
export const DEFAULTS = {
  CURRENCY: 'VND',
  LOCALE: 'vi-VN',
  TIMEZONE: 'Asia/Ho_Chi_Minh',
  COUNTRY: 'VN'
}