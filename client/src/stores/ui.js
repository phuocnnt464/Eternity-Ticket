import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUIStore = defineStore('ui', () => {
  // ==========================================
  // STATE
  // ==========================================
  const loading = ref(false)
  const loadingMessage = ref('')
  const sidebarOpen = ref(false)
  const mobileMenuOpen = ref(false)
  const modalOpen = ref(false)
  const currentModal = ref(null)
  const modalData = ref(null)
  
  // Toast
  const toasts = ref([])
  
  // Theme
  const theme = ref('light') // light, dark
  const prefersDarkMode = ref(
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  )
  
  // Layout
  const layoutMode = ref('default') // default, compact, wide
  
  // ==========================================
  // GETTERS
  // ==========================================
  const isLoading = computed(() => loading.value)
  
  const isSidebarOpen = computed(() => sidebarOpen.value)
  
  const isMobileMenuOpen = computed(() => mobileMenuOpen.value)
  
  const isModalOpen = computed(() => modalOpen.value)
  
  const isDarkMode = computed(() => theme.value === 'dark')
  
  const hasToasts = computed(() => toasts.value.length > 0)
  
  // ==========================================
  // ACTIONS
  // ==========================================
  
  /**
   * Set loading state
   */
  const setLoading = (state, message = '') => {
    loading.value = state
    loadingMessage.value = message
  }
  
  /**
   * Show loading
   */
  const showLoading = (message = 'Loading...') => {
    setLoading(true, message)
  }
  
  /**
   * Hide loading
   */
  const hideLoading = () => {
    setLoading(false, '')
  }
  
  /**
   * Toggle sidebar
   */
  const toggleSidebar = () => {
    sidebarOpen.value = !sidebarOpen.value
  }
  
  /**
   * Open sidebar
   */
  const openSidebar = () => {
    sidebarOpen.value = true
  }
  
  /**
   * Close sidebar
   */
  const closeSidebar = () => {
    sidebarOpen.value = false
  }
  
  /**
   * Toggle mobile menu
   */
  const toggleMobileMenu = () => {
    mobileMenuOpen.value = !mobileMenuOpen.value
  }
  
  /**
   * Open mobile menu
   */
  const openMobileMenu = () => {
    mobileMenuOpen.value = true
  }
  
  /**
   * Close mobile menu
   */
  const closeMobileMenu = () => {
    mobileMenuOpen.value = false
  }
  
  /**
   * Open modal
   */
  const openModal = (modalName, data = null) => {
    currentModal.value = modalName
    modalData.value = data
    modalOpen.value = true
  }
  
  /**
   * Close modal
   */
  const closeModal = () => {
    modalOpen.value = false
    currentModal.value = null
    modalData.value = null
  }
  
  /**
   * Add toast
   */
  const addToast = (toast) => {
    const id = Date.now() + Math.random()
    toasts.value.push({
      id,
      type: toast.type || 'info', // success, error, warning, info
      title: toast.title || '',
      message: toast.message,
      duration: toast.duration || 3000,
      ...toast
    })
    
    // Auto remove after duration
    if (toast.duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, toast.duration)
    }
    
    return id
  }
  
  /**
   * Remove toast
   */
  const removeToast = (id) => {
    toasts.value = toasts.value.filter(toast => toast.id !== id)
  }
  
  /**
   * Show success toast
   */
  const showSuccess = (message, title = 'Success') => {
    return addToast({
      type: 'success',
      title,
      message,
      duration: 3000
    })
  }
  
  /**
   * Show error toast
   */
  const showError = (message, title = 'Error') => {
    return addToast({
      type: 'error',
      title,
      message,
      duration: 5000
    })
  }
  
  /**
   * Show warning toast
   */
  const showWarning = (message, title = 'Warning') => {
    return addToast({
      type: 'warning',
      title,
      message,
      duration: 4000
    })
  }
  
  /**
   * Show info toast
   */
  const showInfo = (message, title = 'Info') => {
    return addToast({
      type: 'info',
      title,
      message,
      duration: 3000
    })
  }
  
  /**
   * Clear all toasts
   */
  const clearToasts = () => {
    toasts.value = []
  }
  
  /**
   * Set theme
   */
  const setTheme = (newTheme) => {
    theme.value = newTheme
    
    // Update document class
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }
  
  /**
   * Toggle theme
   */
  const toggleTheme = () => {
    setTheme(theme.value === 'dark' ? 'light' : 'dark')
  }
  
  /**
   * Set layout mode
   */
  const setLayoutMode = (mode) => {
    layoutMode.value = mode
  }
  
  /**
   * Reset UI state
   */
  const reset = () => {
    loading.value = false
    loadingMessage.value = ''
    sidebarOpen.value = false
    mobileMenuOpen.value = false
    closeModal()
    clearToasts()
  }
  
  // ==========================================
  // RETURN
  // ==========================================
  return {
    // State
    loading,
    loadingMessage,
    sidebarOpen,
    mobileMenuOpen,
    modalOpen,
    currentModal,
    modalData,
    toasts,
    theme,
    prefersDarkMode,
    layoutMode,
    
    // Getters
    isLoading,
    isSidebarOpen,
    isMobileMenuOpen,
    isModalOpen,
    isDarkMode,
    hasToasts,
    
    // Actions
    setLoading,
    showLoading,
    hideLoading,
    toggleSidebar,
    openSidebar,
    closeSidebar,
    toggleMobileMenu,
    openMobileMenu,
    closeMobileMenu,
    openModal,
    closeModal,
    addToast,
    removeToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    clearToasts,
    setTheme,
    toggleTheme,
    setLayoutMode,
    reset
  }
}, {
  persist: {
    paths: ['theme', 'layoutMode']
  }
})