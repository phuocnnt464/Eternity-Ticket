import axios from 'axios'
import { useAuthStore } from '@/stores/auth'
import router from '@/router'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore()
    const token = authStore.accessToken
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// ✅ FIX: Response interceptor với proper error handling
let isRefreshing = false
let refreshSubscribers = []

const subscribeTokenRefresh = (cb) => {
  refreshSubscribers.push(cb)
}

const onRefreshed = (token) => {
  refreshSubscribers.forEach((cb) => cb(token))
  refreshSubscribers = []
}

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response.data
  },
  async (error) => {
    const originalRequest = error.config
    const authStore = useAuthStore()

    // Token expired - try refresh
    if (error.response?.status === 401 && !originalRequest._retry &&
      !originalRequest.url.includes('/auth/refresh-token') &&
      !originalRequest.url.includes('/auth/login')
    ) {

      // ✅ CHECK: Có refresh token không?
      const refreshToken = authStore.refreshToken
      
      if (!refreshToken) {
        // ❌ Không có refresh token → Logout ngay
        console.warn('⚠️ No refresh token available. Logging out...')
        authStore.logout()
        router.push('/auth/login')
        return Promise.reject(error)
      }

      originalRequest._retry = true

      // ✅ Nếu đang refresh, queue request
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            resolve(api(originalRequest))
          })
        })
      }

      isRefreshing = true

      try {
        const response = await axios.post(
          `${import.meta.env.VITE_API_URL}/auth/refresh-token`,
          { refresh_token: refreshToken }
        )

        const { access_token } = response.data.data
        if (!access_token) {
          throw new Error('No access token received')
        }
        authStore.setAccessToken(access_token)

        originalRequest.headers.Authorization = `Bearer ${access_token}`
        return api(originalRequest)
      } catch (refreshError) {
        console.error('❌ Token refresh failed:', refreshError)

        // ✅ Clear queue
        refreshSubscribers = []
        isRefreshing = false

        authStore.logout()

        router.push('/auth/login')
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

export default api