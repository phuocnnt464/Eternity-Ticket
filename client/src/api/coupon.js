import api from './axios'

export const couponAPI = {
  // POST /api/coupons/validate (Public - during checkout)
  validateCoupon: (data) => {
    return api.post('/coupons/validate', data)
  },

  // POST /api/coupons (Organizer)
  createCoupon: (data) => {
    return api.post('/coupons', data)
  },

  // GET /api/coupons/event/:eventId (Organizer/Admin)
  getEventCoupons: (eventId) => {
    return api.get(`/coupons/event/${eventId}`)
  },

  // PUT /api/coupons/:id (Organizer/Admin)
  updateCoupon: (id, data) => {
    return api.put(`/coupons/${id}`, data)
  },

  // DELETE /api/coupons/:id (Organizer/Admin)
  deleteCoupon: (id) => {
    return api.delete(`/coupons/${id}`)
  },

  // GET /api/coupons/:id/stats (Organizer/Admin)
  getCouponStats: (id) => {
    return api.get(`/coupons/${id}/stats`)
  }
}