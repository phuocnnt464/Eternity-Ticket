import api from './axios'

export const refundAPI = {
  // POST /api/refunds (Participant)
  createRefundRequest: (data) => {
    return api.post('/refunds', data)
  },

  // GET /api/refunds/my-requests (Participant)
  getMyRefundRequests: (params) => {
    return api.get('/refunds/my-requests', { params })
  },

  // GET /api/refunds (Admin)
  getRefundRequests: (params) => {
    return api.get('/refunds', { params })
  },

  // GET /api/refunds/:id
  getRefundById: (id) => {
    return api.get(`/refunds/${id}`)
  },

  // PUT /api/refunds/:id/approve (Admin)
  approveRefund: (id, data) => {
    return api.put(`/refunds/${id}/approve`, data)
  },

  // PUT /api/refunds/:id/reject (Admin)
  rejectRefund: (id, data) => {
    return api.put(`/refunds/${id}/reject`, data)
  },

  // PUT /api/refunds/:id/process (Admin)
  processRefund: (id, data) => {
    return api.put(`/refunds/${id}/process`, data)
  }
}