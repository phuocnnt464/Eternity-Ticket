import api from './axios'

export const membershipAPI = {
  // GET /api/membership/pricing
  getPricing: () => {
    return api.get('/membership/pricing')
  },

  // GET /api/membership/current
  getCurrentMembership: () => {
    return api.get('/membership/current')
  },

  // POST /api/membership/orders
  createOrder: (data) => {
    return api.post('/membership/orders', data)
  },

  // GET /api/membership/orders/:orderNumber
  getOrderDetails: (orderNumber) => {
    return api.get(`/membership/orders/${orderNumber}`)
  },

  // GET /api/membership/history
  getHistory: () => {
    return api.get('/membership/history')
  },

  // POST /api/membership/cancel
  cancelMembership: () => {
    return api.post('/membership/cancel')
  },

  // GET /api/membership/payment/vnpay-return
  vnpayReturn: (params) => {
    return api.get('/membership/payment/vnpay-return', { params })
  },

  // ADMIN ROUTES
  // GET /api/membership/admin/all
  adminGetAllMemberships: (params) => {
    return api.get('/membership/admin/all', { params })
  },

  // PUT /api/membership/admin/pricing/:tier
  adminUpdatePricing: (tier, data) => {
    return api.put(`/membership/admin/pricing/${tier}`, data)
  }
}