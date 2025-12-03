import api from './axios'

export const adminAPI = {
  getDashboardStats: () => {
    return api.get('/admin/dashboard/stats')
  },

  searchUsers: (params) => {
    return api.get('/admin/users/search', { params })
  },

  getAllUsers: (params) => {
    return api.get('/admin/users', { params })
  },

  updateUserRole: (userId, data) => {
    return api.patch(`/admin/users/${userId}/role`, data)
  },

  reactivateAccount: (userId) => {
    return api.post(`/admin/users/${userId}/reactivate`)
  },

  deactivateAccount: (userId) => {
    return api.post(`/admin/users/${userId}/deactivate`)
  },

  getPendingEvents: (params) => {
    return api.get('/admin/events/pending', { params })
  },

  approveEvent: (id) => {
    return api.post(`/admin/events/${id}/approve`)
  },

  rejectEvent: (id, data) => {
    return api.post(`/admin/events/${id}/reject`, data)
  },

  cancelEvent: (eventId) => {
    return api.post(`/admin/events/${eventId}/cancel`)
  },

  getAllEvents: (params) => {
    return api.get('/admin/events', { params })
  },

  getSubAdmins: () => {
    return api.get('/admin/sub-admins')
  },

  createSubAdmin: (data) => {
    return api.post('/admin/sub-admins', data)
  },

  deactivateSubAdmin: (id) => {
    return api.delete(`/admin/sub-admins/${id}`)
  },

  getAuditLogs: (params) => {
    return api.get('/admin/audit-logs', { params })
  },

  exportAuditLogs: (params) => {
    return api.get('/admin/audit-logs/export', { 
      params,
      responseType: 'blob' 
    })
  },

  exportActivityLogs: (params) => {
    return api.get('/admin/activity-logs/export', { 
      params,
      responseType: 'blob'
    })
  },

  getAuditLogsByTarget: (targetType, targetId) => {
    return api.get(`/admin/audit-logs/${targetType}/${targetId}`)
  },

  getActivityLogs: (params) => {
    return api.get('/admin/activity-logs', { params })
  },

  getSettings: () => {
    return api.get('/admin/settings')
  },

  updateSettingsBulk: (settings) => {
    return api.put('/admin/settings/bulk', { settings })
  },

  updateSettings: (key, data) => {
    return api.put(`/admin/settings/${key}`, data)
  },

  getAllOrders: (params) => {
    return api.get('/admin/orders', { params })
  },
  
  getOrderDetails: (orderId) => {
    return api.get(`/admin/orders/${orderId}`)
  },
  
  getPendingRefunds: (params) => {
    return api.get('/admin/refunds/pending', { params })
  },
  
  completePastEvents: () => {
    return api.post('/admin/events/complete-past')
  }
}