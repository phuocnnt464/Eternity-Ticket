import api from './axios'

export const couponAPI = {
  validateCoupon: (data) => {
    return api.post('/coupons/validate', data)
  },

  createCoupon: (data) => {
    return api.post('/coupons', data)
  },

  getEventCoupons: (eventId) => {
    return api.get(`/coupons/event/${eventId}`)
  },

  updateCoupon: (id, data) => {
    return api.put(`/coupons/${id}`, data)
  },

  deleteCoupon: (id) => {
    return api.delete(`/coupons/${id}`)
  },

  getCouponStats: (id) => {
    return api.get(`/coupons/${id}/stats`)
  }
}