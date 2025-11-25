import api from './axios'

export const ordersAPI = {
  // POST /api/orders
  createOrder: (data) => {
    return api.post('/orders', data)
  },

  // GET /api/orders (my orders)
  getUserOrders: (params) => {
    return api.get('/orders', { params })
  },

  // GET /api/events/:eventId/orders (for organizer)
  getEventOrders: (eventId, params) => {
    return api.get(`/events/${eventId}/orders`, { params })
  },

  // GET /api/orders/:orderId
  getOrder: (orderId) => {
    return api.get(`/orders/${orderId}`)
  },

  // POST /api/orders/:orderId/payment
  processPayment: (orderId, data) => {
    return api.post(`/orders/${orderId}/payment`, data)
  },

  // PUT /api/orders/:orderId/cancel
  cancelOrder: (orderId) => {
    return api.put(`/orders/${orderId}/cancel`)
  },

  // GET /api/orders/:orderId/tickets
  getOrderTickets: (orderId) => {
    return api.get(`/orders/${orderId}/tickets`)
  },

  // GET /api/orders/:orderId/download-pdf
  downloadTicketsPDF: (orderId) => {
    return api.get(`/orders/${orderId}/download-pdf`, {
      responseType: 'blob'
    })
  },

  // POST /api/orders/cleanup/expired (admin)
  cleanupExpiredOrders: () => {
    return api.post('/orders/cleanup/expired')
  },

  // POST /api/orders/:orderId/payment/vnpay
  getVNPayURL: async (orderId) => {
    const response = await api.post(`/orders/${orderId}/payment/vnpay`)
    return response.data
  },

  // Mock Payment (for development)
  mockPayment: async (orderId, success = true) => {
    const response = await api.post(`/orders/${orderId}/payment/mock`, { success })
    return response.data
  }
}