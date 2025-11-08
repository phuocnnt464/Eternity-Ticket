import api from './axios'

export const authAPI = {
  // Register
  register: (data) => api.post('/auth/register', data),

  // Login
  login: (credentials) => api.post('/auth/login', credentials),

  // Logout
  logout: () => api.post('/auth/logout'),

  // Get profile
  getProfile: () => api.get('/auth/profile'),

  // Forgot password
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),

  // Reset password
  resetPassword: (data) => api.post('/auth/reset-password', data),

  // Verify email
  verifyEmail: (token) => api.post('/auth/verify-email', { token }),

  // Refresh token
  refreshToken: (refreshToken) => 
    api.post('/auth/refresh-token', { refresh_token: refreshToken }),

  // Change password
  changePassword: (data) => api.post('/auth/change-password', data),
}