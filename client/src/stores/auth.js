import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authAPI } from '@/api/auth'
import { usersAPI } from '../api/users'
import { eventsAPI } from '@/api/events'
import { useRouter } from 'vue-router' 
import { useCartStore } from './cart' 
import { useQueueStore } from './queue' 
import { useNotificationStore } from './notification' 
import router from '@/router' 

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref(null)
  const accessToken = ref(localStorage.getItem('access_token'))
  const refreshToken = ref(localStorage.getItem('refresh_token'))
  const loading = ref(false)
  const error = ref(null)
  const isTeamMember = ref(false)
  const teamEventsCount = ref(0)
  
  // Getters
  const isAuthenticated = computed(() => !!accessToken.value && !!user.value)
  const userRole = computed(() => user.value?.role || null)
  const isParticipant = computed(() => userRole.value === 'participant')
  const isOrganizer = computed(() => userRole.value === 'organizer')
  const isAdmin = computed(() => ['admin', 'sub_admin'].includes(userRole.value))
  const isMainAdmin = computed(() => userRole.value === 'admin')
  const isSubAdmin = computed(() => userRole.value === 'sub_admin')
  const membershipTier = computed(() => {
    if (!user.value?.membership) return 'basic'
    return user.value.membership.tier || 'basic'
  })
  
  const isPremium = computed(() => membershipTier.value === 'premium')
  const isAdvanced = computed(() => membershipTier.value === 'advanced')
  const isBasic = computed(() => membershipTier.value === 'basic')
  
  const membershipDiscount = computed(() => {
    switch (membershipTier.value) {
      case 'premium':
        return 0.10 
      case 'advanced':
        return 0.05 
      default:
        return 0 
    }
  })
  const isEmailVerified = computed(() => user.value?.is_email_verified || false)
  const fullName = computed(() => {
    if (!user.value) return ''
    return `${user.value.first_name || ''} ${user.value.last_name || ''}`.trim()
  })
  
  const setAuth = (userData, tokens, membership) => {
    user.value = {
      ...userData,
      membership: membership || { tier: 'basic', is_active: false }
    }
    accessToken.value = tokens.access_token
    refreshToken.value = tokens.refresh_token
    
    localStorage.setItem('access_token', tokens.access_token)
    localStorage.setItem('refresh_token', tokens.refresh_token)
  }
  
  const setAccessToken = (token) => {
    accessToken.value = token
    localStorage.setItem('access_token', token)
  }

  const updateUser = (userData) => {
    user.value = { ...user.value, ...userData }
  }

  const login = async (credentials) => {
    loading.value = true
    error.value = null
    
    try {
      const response = await authAPI.login(credentials)
      const { user: userData, tokens, membership } = response.data
      
      setAuth(userData, tokens, membership)
      if (user.value?.role === 'participant') {
        await checkTeamMembership()
      }
      return userData
    } catch (err) {
      error.value = err.response?.data?.error?.message || 'Login failed'
      throw err
    } finally {
      loading.value = false
    }
  }
  
  const register = async (data) => {
    loading.value = true
    error.value = null
    
    try {
      const response = await authAPI.register(data)
      return response.data.user
    } catch (err) {
      error.value = err.response?.data?.error?.message || 'Registration failed'
      throw err
    } finally {
      loading.value = false
    }
  }
  
  const logout = async () => {
    const tokenToRevoke = refreshToken.value

    try {
      if (tokenToRevoke) {
        await authAPI.logout({ refresh_token: tokenToRevoke })
      }
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      user.value = null
      accessToken.value = null
      refreshToken.value = null
      isTeamMember.value = false
      teamEventsCount.value = 0

      const keysToRemove = [
        'access_token',
        'refresh_token', 
        'user',
        'auth' 
      ]
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key)
        sessionStorage.removeItem(key)
      })
      
      if (typeof window !== 'undefined') {
        const keys = Object.keys(localStorage)
        keys.forEach(key => {
          if (key.startsWith('pinia-')|| key.includes('store')) {
            localStorage.removeItem(key)
          }
        })
      }
   
      const cartStore = useCartStore()
      const queueStore = useQueueStore()
      const notificationStore = useNotificationStore()
      
      cartStore.$reset()
      queueStore.$reset()
      notificationStore.$reset()
      
      document.cookie.split(";").forEach(c => {
        document.cookie = c.trim().split("=")[0] + 
          "=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;"
      })
      
      loading.value = false

      router.push('/')
    }
  }

  const fetchProfile = async () => {
    loading.value = true
    error.value = null
    
    try {
      const response = await authAPI.getProfile()

      const { user: userData, membership } = response.data
    
      user.value = {
        ...userData,
        membership: membership || { tier: 'basic', is_active: false }
      }
      return user.value
    } catch (err) {
      error.value = 'Failed to fetch profile'
      if (err.response?.status === 401) {
        await logout()
      }
      throw err
    } finally {
      loading.value = false
    }
  }
  
  const updateProfile = async (data) => {
    loading.value = true
    error.value = null
    
    try {
      const response = await usersAPI.updateProfile(user.value.id, data) 
      user.value = response.data.user
      return user.value
    } catch (err) {
      error.value = err.response?.data?.error?.message || 'Update failed'
      throw err
    } finally {
      loading.value = false
    }
  }
  
  const changePassword = async (data) => {
    loading.value = true
    error.value = null
    
    try {
      await authAPI.changePassword(data)
    } catch (err) {
      error.value = err.response?.data?.error?.message || 'Change password failed'
      throw err
    } finally {
      loading.value = false
    }
  }
  
  const forgotPassword = async (email) => {
    loading.value = true
    error.value = null
    
    try {
      await authAPI.forgotPassword(email)
    } catch (err) {
      error.value = err.response?.data?.error?.message || 'Request failed'
      throw err
    } finally {
      loading.value = false
    }
  }
  
  const resetPassword = async (data) => {
    loading.value = true
    error.value = null
    
    try {
      await authAPI.resetPassword(data)
    } catch (err) {
      error.value = err.response?.data?.error?.message || 'Reset failed'
      throw err
    } finally {
      loading.value = false
    }
  }
  
  const verifyEmail = async (token) => {
    loading.value = true
    error.value = null
    
    try {
      const response = await authAPI.verifyEmail(token)
      if (user.value) {
        user.value.is_email_verified = true
      }
      return response
    } catch (err) {
      error.value = err.response?.data?.error?.message || 'Verification failed'
      throw err
    } finally {
      loading.value = false
    }
  }

  const clearError = () => {
    error.value = null
  }

  const checkTeamMembership = async () => {
    if (user.value?.role !== 'participant') {
      isTeamMember.value = false
      teamEventsCount.value = 0
      return
    }

    try {
      const response = await eventsAPI.getMyTeamEvents()
      const events = response.data.data?. events || response.data.events || []
      isTeamMember.value = events.length > 0
      teamEventsCount.value = events.length
      console.log('Team membership check:', isTeamMember.value, events.length, 'events')
    } catch (error) {
      console.error('Failed to check team membership:', error)
      isTeamMember.value = false
      teamEventsCount. value = 0
    }
  }
  
  return {
    // State
    user,
    accessToken,
    refreshToken,
    loading,
    error,
    isTeamMember,
    teamEventsCount,
    
    // Getters
    isAuthenticated,
    userRole,
    isParticipant,
    isOrganizer,
    isAdmin,
    isMainAdmin,
    isSubAdmin,
    membershipTier,
    isPremium,
    isAdvanced,
    isBasic,
    membershipDiscount,
    isEmailVerified,
    fullName,
    
    // Actions
    setAuth,
    setAccessToken,
    updateUser,
    login,
    register,
    logout,
    fetchProfile,
    updateProfile,
    changePassword,
    forgotPassword,
    resetPassword,
    verifyEmail,
    clearError,
    checkTeamMembership
  }
}, {
  persist: {
    paths: ['user'],
  },
})