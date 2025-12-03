import api from './axios'

export const authAPI = {
  register: (data) => {
    return api.post('/auth/register', data)
  },

  login: (credentials) => {
    return api.post('/auth/login', credentials)
  },

  verifyEmail: (token) => {
    return api.post('/auth/verify-email', { token })
  },

  refreshToken: (refreshToken) => {
    return api.post('/auth/refresh-token', { 
      refresh_token: refreshToken 
    })
  },

  forgotPassword: (email) => {
    return api.post('/auth/forgot-password', { email })
  },

  resetPassword: (data) => {
    return api.post('/auth/reset-password', data)
  },

  changePassword: (data) => {
    return api.post('/auth/change-password', data)
  },

  logout: (data) => {
    return api.post('/auth/logout', data) 
  },

  resendVerification: () => {
    return api.post('/auth/resend-verification')
  },

  getProfile: () => {
    return api.get('/auth/profile')
  },
  
  checkEmailExists: (email) => {
    return api.get(`/auth/check-email/${email}`)
  }
}