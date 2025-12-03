import api from './axios'

export const refundAPI = {
  createRefundRequest: (data) => {
    return api.post('/refunds', data)
  },

  getMyRefundRequests: (params) => {
    return api.get('/refunds/my-requests', { params })
  },

  getRefundRequests: (params) => {
    return api.get('/refunds', { params })
  },

  getRefundById: (id) => {
    return api.get(`/refunds/${id}`)
  },

  approveRefund: (id, data) => {
    return api.put(`/refunds/${id}/approve`, data)
  },

  rejectRefund: (id, data) => {
    return api.put(`/refunds/${id}/reject`, data)
  },

  processRefund: (id, data) => {
    return api.put(`/refunds/${id}/process`, data)
  }
}