import { useAuthStore } from '@/stores/auth'

/**
 * Check if user is authenticated
 */
export const requireAuth = (to, from, next) => {
  const authStore = useAuthStore()
  
  if (!authStore.isAuthenticated) {
    next({
      name: 'Login',
      query: { redirect: to.fullPath }
    })
  } else {
    next()
  }
}

/**
 * Check if user is guest (not authenticated)
 */
export const requireGuest = (to, from, next) => {
  const authStore = useAuthStore()
  
  if (authStore.isAuthenticated) {
    next({ name: 'Home' })
  } else {
    next()
  }
}

/**
 * Check if user has required role
 */
export const requireRole = (roles) => {
  return (to, from, next) => {
    const authStore = useAuthStore()
    
    if (!authStore.isAuthenticated) {
      return next({
        name: 'Login',
        query: { redirect: to.fullPath }
      })
    }
    
    const userRole = authStore.user?.role
    const allowedRoles = Array.isArray(roles) ? roles : [roles]
    
    if (!allowedRoles.includes(userRole)) {
      return next({ name: 'Forbidden' })
    }
    
    next()
  }
}

/**
 * Check if user is participant
 */
export const requireParticipant = requireRole('participant')

/**
 * Check if user is organizer
 */
export const requireOrganizer = requireRole('organizer')

/**
 * Check if user is admin or sub-admin
 */
export const requireAdmin = requireRole(['admin', 'sub_admin'])

/**
 * Check if user is main admin only
 */
export const requireMainAdmin = requireRole('admin')

/**
 * Check if email is verified
 */
export const requireVerifiedEmail = (to, from, next) => {
  const authStore = useAuthStore()
  
  if (!authStore.user?.is_email_verified) {
    // Show toast or redirect to verification page
    next({ name: 'VerifyEmail' })
  } else {
    next()
  }
}

/**
 * Check membership tier
 */
export const requireMembership = (tier) => {
  return (to, from, next) => {
    const authStore = useAuthStore()
    
    const allowedTiers = {
      'basic': ['basic', 'advanced', 'premium'],
      'advanced': ['advanced', 'premium'],
      'premium': ['premium']
    }
    
    const userTier = authStore.membershipTier
    
    if (!allowedTiers[tier]?.includes(userTier)) {
      // Redirect to upgrade page
      return next({ name: 'Membership' })
    }
    
    next()
  }
}

/**
 * Prevent access if already in queue
 */
export const preventQueueConflict = (to, from, next) => {
  // Check if user is already in a queue
  // You can implement this based on your queue store
  next()
}

/**
 * Log page view
 */
export const logPageView = (to, from, next) => {
  // Analytics tracking
  if (typeof gtag !== 'undefined') {
    gtag('config', 'GA_MEASUREMENT_ID', {
      page_path: to.path
    })
  }
  next()
}

export default {
  requireAuth,
  requireGuest,
  requireRole,
  requireParticipant,
  requireOrganizer,
  requireAdmin,
  requireMainAdmin,
  requireVerifiedEmail,
  requireMembership,
  preventQueueConflict,
  logPageView
}