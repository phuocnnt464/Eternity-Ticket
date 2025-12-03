import { useAuthStore } from '@/stores/auth'

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

export const requireGuest = (to, from, next) => {
  const authStore = useAuthStore()
  
  if (authStore.isAuthenticated) {
    next({ name: 'Home' })
  } else {
    next()
  }
}

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

export const requireParticipant = requireRole('participant')

export const requireOrganizer = requireRole('organizer')


export const requireAdmin = requireRole(['admin', 'sub_admin'])

export const requireMainAdmin = requireRole('admin')

export const requireVerifiedEmail = (to, from, next) => {
  const authStore = useAuthStore()
  
  if (!authStore.user?.is_email_verified) {
    next({ name: 'VerifyEmail' })
  } else {
    next()
  }
}

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

export const preventQueueConflict = (to, from, next) => {
  next()
}

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