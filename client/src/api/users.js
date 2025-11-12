import api from './axios'

export const usersAPI = {
  // GET /api/users/:userId
  getUserById: (userId) => {
    return api.get(`/users/${userId}`)
  },

  // PUT /api/users/:userId
  updateProfile: (userId, data) => {
    return api.put(`/users/${userId}`, data)
  },

  // POST /api/users/:userId/avatar
  uploadAvatar: (userId, file) => {
    const formData = new FormData()
    formData.append('avatar', file)
    return api.post(`/users/${userId}/avatar`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },

  // DELETE /api/users/:userId (deactivate)
  deactivateAccount: (userId) => {
    return api.delete(`/users/${userId}`)
  },

  // GET /api/users/:userId/tickets
  getTicketHistory: (userId, params) => {
    return api.get(`/users/${userId}/tickets`, { params })
  },

  // GET /api/users/:userId/orders
  getOrderHistory: (userId, params) => {
    return api.get(`/users/${userId}/orders`, { params })
  },

  // GET /api/users/:userId/events (for organizer)
  getMyEvents: (userId, params) => {
    return api.get(`/users/${userId}/events`, { params })
  },

  // GET /api/users/:userId/activity
  getActivityLog: (userId, params) => {
    return api.get(`/users/${userId}/activity`, { params })
  },

   // GET /api/users/:userId/stats
  getUserStats: (userId) => {
    return api.get(`/users/${userId}/stats`)
  },
  
  // GET /api/events/image-requirements
  getImageRequirements: () => {
    return api.get('/events/image-requirements')
  }
}