import { ref } from 'vue'

/**
 * Toast notification composable
 */
export function useToast() {
  const toasts = ref([])
  let nextId = 0

  // Add toast
  const addToast = (message, type = 'info', duration = 3000) => {
    const id = nextId++
    const toast = {
      id,
      message,
      type,
      duration,
      createdAt: Date.now()
    }

    toasts.value.push(toast)

    // Auto remove after duration
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }

    return id
  }

  // Remove toast
  const removeToast = (id) => {
    const index = toasts.value.findIndex(t => t.id === id)
    if (index !== -1) {
      toasts.value.splice(index, 1)
    }
  }

  // Clear all toasts
  const clearToasts = () => {
    toasts.value = []
  }

  // Shorthand methods
  const success = (message, duration = 3000) => {
    return addToast(message, 'success', duration)
  }

  const error = (message, duration = 5000) => {
    return addToast(message, 'error', duration)
  }

  const warning = (message, duration = 4000) => {
    return addToast(message, 'warning', duration)
  }

  const info = (message, duration = 3000) => {
    return addToast(message, 'info', duration)
  }

  const loading = (message = 'Loading...') => {
    return addToast(message, 'loading', 0) // Don't auto-dismiss loading toasts
  }

  // Update toast (useful for loading -> success/error)
  const updateToast = (id, updates) => {
    const index = toasts.value.findIndex(t => t.id === id)
    if (index !== -1) {
      toasts.value[index] = {
        ...toasts.value[index],
        ...updates
      }

      // Set timeout if duration changed
      if (updates.duration && updates.duration > 0) {
        setTimeout(() => {
          removeToast(id)
        }, updates.duration)
      }
    }
  }

  // Promise wrapper for async operations
  const promise = async (promiseFn, messages = {}) => {
    const {
      loading: loadingMsg = 'Loading...',
      success: successMsg = 'Success!',
      error: errorMsg = 'Error occurred'
    } = messages

    const toastId = loading(loadingMsg)

    try {
      const result = await promiseFn()
      updateToast(toastId, {
        message: successMsg,
        type: 'success',
        duration: 3000
      })
      return { success: true, data: result }
    } catch (err) {
      updateToast(toastId, {
        message: typeof errorMsg === 'function' ? errorMsg(err) : errorMsg,
        type: 'error',
        duration: 5000
      })
      return { success: false, error: err }
    }
  }

  return {
    // State
    toasts,

    // Methods
    addToast,
    removeToast,
    clearToasts,
    updateToast,

    // Shorthand methods
    success,
    error,
    warning,
    info,
    loading,

    // Utilities
    promise
  }
}

// Global toast instance (singleton)
let globalToastInstance = null

export function useGlobalToast() {
  if (!globalToastInstance) {
    globalToastInstance = useToast()
  }
  return globalToastInstance
}