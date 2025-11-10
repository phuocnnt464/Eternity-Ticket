import api from './axios'

export const adminAPI = {
  // ==========================================
  // USER MANAGEMENT
  // ==========================================
  
  /**
   * Get all users
   */
  getUsers: (params) => {
    return api.get('/admin/users', { params })
  },

  /**
   * Get user by ID
   */
  getUserById: (id) => {
    return api.get(`/admin/users/${id}`)
  },

  /**
   * Update user
   */
  updateUser: (id, data) => {
    return api.put(`/admin/users/${id}`, data)
  },

  /**
   * Delete user
   */
  deleteUser: (id) => {
    return api.delete(`/admin/users/${id}`)
  },

  /**
   * Deactivate user
   */
  deactivateUser: (id, reason) => {
    return api.post(`/admin/users/${id}/deactivate`, { reason })
  },

  /**
   * Activate user
   */
  activateUser: (id) => {
    return api.post(`/admin/users/${id}/activate`)
  },

  /**
   * Change user role
   */
  changeUserRole: (id, role) => {
    return api.patch(`/admin/users/${id}/role`, { role })
  },

  // ==========================================
  // SUB-ADMIN MANAGEMENT
  // ==========================================
  
  /**
   * Get sub-admins
   */
  getSubAdmins: () => {
    return api.get('/admin/sub-admins')
  },

  /**
   * Create sub-admin
   */
  createSubAdmin: (data) => {
    return api.post('/admin/sub-admins', data)
  },

  /**
   * Update sub-admin
   */
  updateSubAdmin: (id, data) => {
    return api.put(`/admin/sub-admins/${id}`, data)
  },

  /**
   * Delete sub-admin
   */
  deleteSubAdmin: (id) => {
    return api.delete(`/admin/sub-admins/${id}`)
  },

  // ==========================================
  // EVENT APPROVAL
  // ==========================================
  
  /**
   * Get pending events
   */
  getPendingEvents: (params) => {
    return api.get('/admin/events/pending', { params })
  },

  /**
   * Approve event
   */
  approveEvent: (id, notes) => {
    return api.post(`/admin/events/${id}/approve`, { notes })
  },

  /**
   * Reject event
   */
  rejectEvent: (id, reason) => {
    return api.post(`/admin/events/${id}/reject`, { reason })
  },

  /**
   * Get event details (admin)
   */
  getEventDetails: (id) => {
    return api.get(`/admin/events/${id}`)
  },

  // ==========================================
  // REFUND MANAGEMENT
  // ==========================================
  
  /**
   * Get refund requests
   */
  getRefundRequests: (params) => {
    return api.get('/admin/refunds', { params })
  },

  /**
   * Approve refund
   */
  approveRefund: (id, data) => {
    return api.post(`/admin/refunds/${id}/approve`, data)
  },

  /**
   * Reject refund
   */
  rejectRefund: (id, reason) => {
    return api.post(`/admin/refunds/${id}/reject`, { reason })
  },

  /**
   * Process refund
   */
  processRefund: (id) => {
    return api.post(`/admin/refunds/${id}/process`)
  },

  // ==========================================
  // AUDIT LOGS
  // ==========================================
  
  /**
   * Get audit logs
   */
  getAuditLogs: (params) => {
    return api.get('/admin/audit-logs', { params })
  },

  /**
   * Get user activity logs
   */
  getUserActivityLogs: (userId, params) => {
    return api.get(`/admin/users/${userId}/activity-logs`, { params })
  },

  /**
   * Get event logs
   */
  getEventLogs: (eventId, params) => {
    return api.get(`/admin/events/${eventId}/logs`, { params })
  },

  // ==========================================
  // STATISTICS
  // ==========================================
  
  /**
   * Get dashboard statistics
   */
  getDashboardStats: () => {
    return api.get('/admin/statistics/dashboard')
  },

  /**
   * Get revenue statistics
   */
  getRevenueStats: (params) => {
    return api.get('/admin/statistics/revenue', { params })
  },

  /**
   * Get user statistics
   */
  getUserStats: () => {
    return api.get('/admin/statistics/users')
  },

  /**
   * Get event statistics
   */
  getEventStats: (params) => {
    return api.get('/admin/statistics/events', { params })
  },

  // ==========================================
  // SYSTEM SETTINGS
  // ==========================================
  
  /**
   * Get system settings
   */
  getSettings: () => {
    return api.get('/admin/settings')
  },

  /**
   * Update system settings
   */
  updateSettings: (data) => {
    return api.put('/admin/settings', data)
  },

  /**
   * Get system health
   */
  getSystemHealth: () => {
    return api.get('/admin/system/health')
  },

  /**
   * Clear cache
   */
  clearCache: (cacheType) => {
    return api.post('/admin/system/clear-cache', { cache_type: cacheType })
  }
}