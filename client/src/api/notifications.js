import api from './axios'

export const notificationsAPI = {
  // GET /api/notifications
  getNotifications: (params) => {
    return api.get('/notifications', { params })
  },

  // GET /api/notifications/unread-count
  getUnreadCount: () => {
    return api.get('/notifications/unread-count')
  },

  // PUT /api/notifications/:notificationId/read
  markAsRead: (notificationId) => {
    return api.put(`/notifications/${notificationId}/read`)
  },

  // PUT /api/notifications/read-all
  markAllAsRead: () => {
    return api.put('/notifications/read-all')
  },

  // DELETE /api/notifications/:notificationId
  deleteNotification: (notificationId) => {
    return api.delete(`/notifications/${notificationId}`)
  }
}