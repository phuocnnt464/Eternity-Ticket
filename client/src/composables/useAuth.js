import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

/**
 * Auth composable for authentication
 */
export function useAuth() {
  const authStore = useAuthStore()
  const router = useRouter()

  // Computed
  const user = computed(() => authStore.user)
  const isAuthenticated = computed(() => authStore.isAuthenticated)
  const isLoading = computed(() => authStore.loading)
  const token = computed(() => authStore.token)

  // Role checks
  const isAdmin = computed(() => authStore.isAdmin)
  const isSubAdmin = computed(() => authStore.isSubAdmin)
  const isOrganizer = computed(() => authStore.isOrganizer)
  const isParticipant = computed(() => authStore.isParticipant)

  // Membership
  const isPremium = computed(() => authStore.isPremium)
  const isAdvanced = computed(() => authStore.isAdvanced)  
  const isBasic = computed(() => authStore.isBasic)

  // Full name
  const fullName = computed(() => authStore.fullName)

  // Methods
  const login = async (credentials) => {
    try {
      await authStore.login(credentials)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  const register = async (userData) => {
    try {
      await authStore.register(userData)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  const logout = async () => {
    await authStore.logout()
    router.push('/auth/login')
  }

  const checkAuth = async () => {
    await authStore.checkAuth()
  }

  return {
    // State
    user,
    isAuthenticated,
    isLoading,
    token,
    fullName,

    // Role checks
    isAdmin,
    isSubAdmin,
    isOrganizer,
    isParticipant,
    isPremium,
    isAdvanced,
    isBasic,

    // Methods
    login,
    register,
    logout,
    checkAuth
  }
}