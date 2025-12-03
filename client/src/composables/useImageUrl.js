// client/src/composables/useImageUrl.js
export function useImageUrl() {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

  const getImageUrl = (path) => {
    if (!path) return null
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path 
    }
    const cleanPath = path.startsWith('/') ? path : `/${path}`
    return `${API_URL}${cleanPath}`
  }

  return {
    getImageUrl
  }
}