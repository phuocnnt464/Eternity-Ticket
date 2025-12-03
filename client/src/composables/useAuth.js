import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

export function useAuth() {
  const authStore = useAuthStore()
  const router = useRouter()

  const user = computed(() => authStore.user)
  const isAuthenticated = computed(() => authStore.isAuthenticated)
  const isLoading = computed(() => authStore.loading)
  const token = computed(() => authStore.token)

  const isAdmin = computed(() => authStore.isAdmin)
  const isSubAdmin = computed(() => authStore.isSubAdmin)
  const isOrganizer = computed(() => authStore.isOrganizer)
  const isParticipant = computed(() => authStore.isParticipant)

  const isPremium = computed(() => authStore.isPremium)
  const isAdvanced = computed(() => authStore.isAdvanced)  
  const isBasic = computed(() => authStore.isBasic)

  const fullName = computed(() => authStore.fullName)

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
  }
}