import api from './axios'

export const ordersAPI = {
  createOrder: (data) => {
    return api.post('/orders', data)
  },

  getUserOrders: (params) => {
    return api.get('/orders', { params })
  },

  getEventOrders: (eventId, params) => {
    return api.get(`/events/${eventId}/orders`, { params })
  },

  getOrder: (orderId) => {
    return api.get(`/orders/${orderId}`)
  },

  processPayment: (orderId, data) => {
    return api.post(`/orders/${orderId}/payment`, data)
  },

  cancelOrder: (orderId) => {
    return api.put(`/orders/${orderId}/cancel`)
  },

  getOrderTickets: (orderId) => {
    return api.get(`/orders/${orderId}/tickets`)
  },

  downloadTicketsPDF: (orderId) => {
    return api.get(`/orders/${orderId}/download-pdf`, {
      responseType: 'blob'
    })
  },

  cleanupExpiredOrders: () => {
    return api.post('/orders/cleanup/expired')
  },

  mockPayment: async (orderId, success = true) => {
    const response = await api.post(`/orders/${orderId}/payment/mock`, { success })
    return response.data
  }
}