import api from './axios'

export const authAPI = {
  // POST /api/auth/register
  register: (data) => {
    return api.post('/auth/register', data)
  },

  // POST /api/auth/login
  login: (credentials) => {
    return api.post('/auth/login', credentials)
  },

  // POST /api/auth/verify-email
  verifyEmail: (token) => {
    return api.post('/auth/verify-email', { token })
  },

  // POST /api/auth/refresh-token
  refreshToken: (refreshToken) => {
    return api.post('/auth/refresh-token', { 
      refresh_token: refreshToken 
    })
  },

  // POST /api/auth/forgot-password
  forgotPassword: (email) => {
    return api.post('/auth/forgot-password', { email })
  },

  // POST /api/auth/reset-password
  resetPassword: (data) => {
    return api.post('/auth/reset-password', data)
  },

  // POST /api/auth/change-password (authenticated)
  changePassword: (data) => {
    return api.post('/auth/change-password', data)
  },

  // POST /api/auth/logout (authenticated)
  logout: () => {
    return api.post('/auth/logout')
  },

  // POST /api/auth/resend-verification (authenticated)
  resendVerification: () => {
    return api.post('/auth/resend-verification')
  }
}