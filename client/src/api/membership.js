import api from './axios'

export const membershipAPI = {
  getPricing: () => {
    return api.get('/membership/pricing')
  },

  getCurrentMembership: () => {
    return api.get('/membership/current')
  },

  createOrder: (data) => {
    return api.post('/membership/orders', data)
  },

  getOrderDetails: (orderNumber) => {
    return api.get(`/membership/orders/${orderNumber}`)
  },

  getHistory: () => {
    return api.get('/membership/history')
  },

  cancelMembership: (options = {}) => {  
    return api.post('/membership/cancel', options)  
  },

  adminGetAllMemberships: (params) => {
    return api.get('/membership/admin/all', { params })
  },

  adminUpdatePricing: (tier, data) => {
    return api.put(`/membership/admin/pricing/${tier}`, data)
  },

  processPayment: (orderNumber, data) => {
    return api.post(`/membership/orders/${orderNumber}/payment`, data)
  },
  
  mockPayment: async (orderNumber, success = true) => {
    const response = await api.post(`/membership/orders/${orderNumber}/payment/mock`, { success })
    return response.data
  }
}