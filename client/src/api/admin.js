import api from './axios'

export const adminAPI = {
  // GET /api/admin/dashboard/stats
  getDashboardStats: () => {
    return api.get('/admin/dashboard/stats')
  },

  // GET /api/admin/users/search
  searchUsers: (params) => {
    return api.get('/admin/users/search', { params })
  },

  // GET /api/admin/users
  getAllUsers: (params) => {
    return api.get('/admin/users', { params })
  },

  // PATCH /api/admin/users/:userId/role
  updateUserRole: (userId, data) => {
    return api.patch(`/admin/users/${userId}/role`, data)
  },

  // POST /api/admin/users/:userId/reactivate
  reactivateAccount: (userId) => {
    return api.post(`/admin/users/${userId}/reactivate`)
  },

  // POST /api/admin/users/:userId/deactivate
  deactivateAccount: (userId) => {
    return api.post(`/admin/users/${userId}/deactivate`)
  },

  // GET /api/admin/events/pending
  getPendingEvents: (params) => {
    return api.get('/admin/events/pending', { params })
  },

  // POST /api/admin/events/:id/approve
  approveEvent: (id) => {
    return api.post(`/admin/events/${id}/approve`)
  },

  // POST /api/admin/events/:id/reject
  rejectEvent: (id, data) => {
    return api.post(`/admin/events/${id}/reject`, data)
  },

  // POST /api/admin/events/:eventId/cancel
  cancelEvent: (eventId) => {
    return api.post(`/admin/events/${eventId}/cancel`)
  },

  // GET /api/admin/events
  getAllEvents: (params) => {
    return api.get('/admin/events', { params })
  },

  // GET /api/admin/sub-admins
  getSubAdmins: () => {
    return api.get('/admin/sub-admins')
  },

  // POST /api/admin/sub-admins
  createSubAdmin: (data) => {
    return api.post('/admin/sub-admins', data)
  },

  // PUT /api/admin/sub-admins/:id
  // updateSubAdmin: (id, data) => {
  //   return api.put(`/admin/sub-admins/${id}`, data)
  // },

  // DELETE /api/admin/sub-admins/:id
  deactivateSubAdmin: (id) => {
    return api.delete(`/admin/sub-admins/${id}`)
  },

  // GET /api/admin/audit-logs
  getAuditLogs: (params) => {
    return api.get('/admin/audit-logs', { params })
  },

  // GET /api/admin/audit-logs/export
  exportAuditLogs: (params) => {
    return api.get('/admin/audit-logs/export', { 
      params,
      responseType: 'blob'  // Important for CSV download
    })
  },

  // GET /api/admin/activity-logs/export
  exportActivityLogs: (params) => {
    return api.get('/admin/activity-logs/export', { 
      params,
      responseType: 'blob'
    })
  },

  // GET /api/admin/audit-logs/:targetType/:targetId
  getAuditLogsByTarget: (targetType, targetId) => {
    return api.get(`/admin/audit-logs/${targetType}/${targetId}`)
  },

  // GET /api/admin/activity-logs
  getActivityLogs: (params) => {
    return api.get('/admin/activity-logs', { params })
  },

  // GET /api/admin/settings
  getSettings: () => {
    return api.get('/admin/settings')
  },

  // PUT /api/admin/settings/bulk
  updateSettingsBulk: (settings) => {
    return api.put('/admin/settings/bulk', { settings })
  },

  // PUT /api/admin/settings
  updateSettings: (key, data) => {
    return api.put(`/admin/settings/${key}`, data)
  },

  // GET /api/admin/orders
  getAllOrders: (params) => {
    return api.get('/admin/orders', { params })
  },
  
  // GET /api/admin/orders/:orderId
  getOrderDetails: (orderId) => {
    return api.get(`/admin/orders/${orderId}`)
  },
  
  // GET /api/admin/refunds/pending
  getPendingRefunds: (params) => {
    return api.get('/admin/refunds/pending', { params })
  },
  completePastEvents: () => {
    return api.post('/admin/events/complete-past')
  }
}