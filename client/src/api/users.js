import api from './axios'

export const usersAPI = {
  getUserById: (userId) => {
    return api.get(`/users/${userId}`)
  },

  updateProfile: (userId, data) => {
    return api.put(`/users/${userId}`, data)
  },

  uploadAvatar: (userId, file) => {
    const formData = new FormData()
    formData.append('avatar', file)
    return api.post(`/users/${userId}/avatar`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },

  deactivateAccount: (userId, password) => {
    return api.delete(`/users/${userId}`, { 
      data: { password }  
    })
  },

  getTicketHistory: (userId, params) => {
    return api.get(`/users/${userId}/tickets`, { params })
  },

  getOrderHistory: (userId, params) => {
    return api.get(`/users/${userId}/orders`, { params })
  },

   // GET /api/users/:userId/stats
  getUserStats: (userId) => {
    return api.get(`/users/${userId}/stats`)
  },
}