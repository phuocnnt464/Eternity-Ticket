import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authAPI } from '@/api/auth'

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref(null)
  const accessToken = ref(localStorage.getItem('access_token'))
  const refreshToken = ref(localStorage.getItem('refresh_token'))
  const loading = ref(false)
  const error = ref(null)
  
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
        return 0.10 // 10%
      case 'advanced':
        return 0.05 // 5%
      default:
        return 0 // 0%
    }
  })
  const isEmailVerified = computed(() => user.value?.is_email_verified || false)
  const fullName = computed(() => {
    if (!user.value) return ''
    return `${user.value.first_name || ''} ${user.value.last_name || ''}`.trim()
  })
  
  // Actions
  /**
   * Set auth data (user + tokens)
   */
  const setAuth = (userData, tokens) => {
    user.value = userData
    accessToken.value = tokens.access_token
    refreshToken.value = tokens.refresh_token
    
    localStorage.setItem('access_token', tokens.access_token)
    localStorage.setItem('refresh_token', tokens.refresh_token)
  }
  
  /**
   * Set access token only (after refresh)
   */
  const setAccessToken = (token) => {
    accessToken.value = token
    localStorage.setItem('access_token', token)
  }
  
  /**
   * Update user data
   */
  const updateUser = (userData) => {
    user.value = { ...user.value, ...userData }
  }

  /**
   * Login
   */
  const login = async (credentials) => {
    loading.value = true
    error.value = null
    
    try {
      const response = await authAPI.login(credentials)
      const { user: userData, tokens } = response.data
      
      setAuth(userData, tokens)
      return userData
    } catch (err) {
      error.value = err.response?.data?.error?.message || 'Login failed'
      throw err
    } finally {
      loading.value = false
    }
  }
  
  /**
   * Register
   */
  const register = async (data) => {
    loading.value = true
    error.value = null
    
    try {
      const response = await authAPI.register(data)
      const { user: userData, tokens } = response.data
      
      setAuth(userData, tokens)
      return userData
    } catch (err) {
      error.value = err.response?.data?.error?.message || 'Registration failed'
      throw err
    } finally {
      loading.value = false
    }
  }
  
  /**
   * Logout
   */
  const logout = async () => {
    try {
      await authAPI.logout()
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      // Clear all data
      user.value = null
      accessToken.value = null
      refreshToken.value = null
      
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
    }
  }
  
  /**
   * Fetch user profile
   */
  const fetchProfile = async () => {
    loading.value = true
    error.value = null
    
    try {
      const response = await authAPI.getProfile()
      user.value = response.data.user
      return user.value
    } catch (err) {
      error.value = 'Failed to fetch profile'
      // If unauthorized, logout
      if (err.response?.status === 401) {
        await logout()
      }
      throw err
    } finally {
      loading.value = false
    }
  }
  
  /**
   * Update profile
   */
  const updateProfile = async (data) => {
    loading.value = true
    error.value = null
    
    try {
      const response = await authAPI.updateProfile(data)
      user.value = response.data.user
      return user.value
    } catch (err) {
      error.value = err.response?.data?.error?.message || 'Update failed'
      throw err
    } finally {
      loading.value = false
    }
  }
  
  /**
   * Change password
   */
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
  
  /**
   * Forgot password
   */
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
  
  /**
   * Reset password
   */
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
  
  /**
   * Verify email
   */
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
  
  /**
   * Clear error
   */
  const clearError = () => {
    error.value = null
  }
  
  return {
    // State
    user,
    accessToken,
    refreshToken,
    loading,
    error,
    
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
    clearError
  }
}, {
  persist: {
    paths: ['user'],
  },
})