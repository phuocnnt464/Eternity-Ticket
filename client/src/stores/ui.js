import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUIStore = defineStore('ui', () => {
  const loading = ref(false)
  const loadingMessage = ref('')
  const sidebarOpen = ref(false)
  const mobileMenuOpen = ref(false)
  const modalOpen = ref(false)
  const currentModal = ref(null)
  const modalData = ref(null)
  
  const toasts = ref([])
  
  const theme = ref('light')
  const prefersDarkMode = ref(
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  )
  
  const layoutMode = ref('default') 

  const isLoading = computed(() => loading.value)
  
  const isSidebarOpen = computed(() => sidebarOpen.value)
  
  const isMobileMenuOpen = computed(() => mobileMenuOpen.value)
  
  const isModalOpen = computed(() => modalOpen.value)
  
  const isDarkMode = computed(() => theme.value === 'dark')
  
  const hasToasts = computed(() => toasts.value.length > 0)
  
  const setLoading = (state, message = '') => {
    loading.value = state
    loadingMessage.value = message
  }
  
  const showLoading = (message = 'Loading...') => {
    setLoading(true, message)
  }

  const hideLoading = () => {
    setLoading(false, '')
  }
  
  const toggleSidebar = () => {
    sidebarOpen.value = !sidebarOpen.value
  }
  
  const openSidebar = () => {
    sidebarOpen.value = true
  }
  
  const closeSidebar = () => {
    sidebarOpen.value = false
  }
  
  const toggleMobileMenu = () => {
    mobileMenuOpen.value = !mobileMenuOpen.value
  }
  
  const openMobileMenu = () => {
    mobileMenuOpen.value = true
  }

  const closeMobileMenu = () => {
    mobileMenuOpen.value = false
  }

  const openModal = (modalName, data = null) => {
    currentModal.value = modalName
    modalData.value = data
    modalOpen.value = true
  }
  
  const closeModal = () => {
    modalOpen.value = false
    currentModal.value = null
    modalData.value = null
  }
  
  const addToast = (toast) => {
    const id = Date.now() + Math.random()
    toasts.value.push({
      id,
      type: toast.type || 'info',
      title: toast.title || '',
      message: toast.message,
      duration: toast.duration || 3000,
      ...toast
    })
    
    if (toast.duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, toast.duration)
    }
    
    return id
  }
  
  const removeToast = (id) => {
    toasts.value = toasts.value.filter(toast => toast.id !== id)
  }
  
  const showSuccess = (message, title = 'Success') => {
    return addToast({
      type: 'success',
      title,
      message,
      duration: 3000
    })
  }
  
  const showError = (message, title = 'Error') => {
    return addToast({
      type: 'error',
      title,
      message,
      duration: 5000
    })
  }
  
  const showWarning = (message, title = 'Warning') => {
    return addToast({
      type: 'warning',
      title,
      message,
      duration: 4000
    })
  }
  
  const showInfo = (message, title = 'Info') => {
    return addToast({
      type: 'info',
      title,
      message,
      duration: 3000
    })
  }

  const clearToasts = () => {
    toasts.value = []
  }
  
  const setTheme = (newTheme) => {
    theme.value = newTheme
    
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }
  
  const toggleTheme = () => {
    setTheme(theme.value === 'dark' ? 'light' : 'dark')
  }
  
  const setLayoutMode = (mode) => {
    layoutMode.value = mode
  }

  const reset = () => {
    loading.value = false
    loadingMessage.value = ''
    sidebarOpen.value = false
    mobileMenuOpen.value = false
    closeModal()
    clearToasts()
  }
  
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