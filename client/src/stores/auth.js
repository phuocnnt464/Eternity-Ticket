import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authAPI } from '@/api/auth'

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref(null)
  const accessToken = ref(localStorage.getItem('access_token'))
  const refreshToken = ref(localStorage.getItem('refresh_token'))
  
  // Getters
  const isAuthenticated = computed(() => !!accessToken.value)
  const isParticipant = computed(() => user.value?.role === 'participant')
  const isOrganizer = computed(() => user.value?.role === 'organizer')
  const isAdmin = computed(() => ['admin', 'sub_admin'].includes(user.value?.role))
  const membershipTier = computed(() => user.value?.membership?.tier || 'basic')
  const isPremium = computed(() => membershipTier.value === 'premium')
  const isAdvanced = computed(() => membershipTier.value === 'advanced')
  
  // Actions
  const setAuth = (userData, tokens) => {
    user.value = userData
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
  
  const logout = () => {
    user.value = null
    accessToken.value = null
    refreshToken.value = null
    
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
  }
  
  const fetchProfile = async () => {
    try {
      const response = await authAPI.getProfile()
      user.value = response.data.user
      return user.value
    } catch (error) {
      console.error('Fetch profile error:', error)
      logout()
      throw error
    }
  }
  
  return {
    // State
    user,
    accessToken,
    refreshToken,
    
    // Getters
    isAuthenticated,
    isParticipant,
    isOrganizer,
    isAdmin,
    membershipTier,
    isPremium,
    isAdvanced,
    
    // Actions
    setAuth,
    setAccessToken,
    updateUser,
    logout,
    fetchProfile,
  }
}, {
  persist: {
    paths: ['user'],
  },
})