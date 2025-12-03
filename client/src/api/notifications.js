import api from './axios'

export const notificationsAPI = {
  getNotifications: (params) => {
    return api.get('/notifications', { params })
  },

  getUnreadCount: () => {
    return api.get('/notifications/unread-count')
  },

  markAsRead: (notificationId) => {
    return api.put(`/notifications/${notificationId}/read`)
  },

  markAllAsRead: () => {
    return api.put('/notifications/read-all')
  },

  deleteNotification: (notificationId) => {
    return api.delete(`/notifications/${notificationId}`)
  }
}