import api from './axios'

export const authAPI = {
  // ==========================================
  // AUTHENTICATION
  // ==========================================

  // Register
  register: (data) => api.post('/auth/register', data),

  // Login
  login: (credentials) => api.post('/auth/login', credentials),

  // Logout
  logout: () => api.post('/auth/logout'),

  // Refresh access token
  refreshToken: (refreshToken) => {
    return api.post('/auth/refresh-token', { 
      refresh_token: refreshToken 
    })
  },

  // ==========================================
  // PROFILE
  // ==========================================

  // Get profile
  getProfile: () => api.get('/auth/profile'),

   // Update profile
  updateProfile: (data) => {
    return api.put('/auth/profile', data)
  },

  // Change password
  changePassword: (data) => {
    return api.post('/auth/change-password', data)
  },

  // ==========================================
  // PASSWORD RESET
  // ==========================================
  
  // Forgot password
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),

  // Reset password
  resetPassword: (data) => api.post('/auth/reset-password', data),

  // Verify email
  verifyEmail: (token) => api.post('/auth/verify-email', { token }),

  // Resend verification email
  resendVerification: () => {
    return api.post('/auth/resend-verification')
  },
  
  // ==========================================
  // ACCOUNT MANAGEMENT
  // ==========================================
  
  /**
   * Deactivate account
   */
  deactivateAccount: () => {
    return api.post('/auth/deactivate')
  },

  /**
   * Delete account permanently
   */
  deleteAccount: (password) => {
    return api.delete('/auth/account', { 
      data: { password } 
    })
  }
}