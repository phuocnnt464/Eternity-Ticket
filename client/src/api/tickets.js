import api from './axios'

export const ticketsAPI = {
  // ==========================================
  // TICKET MANAGEMENT
  // ==========================================
  
  /**
   * Get my tickets
   */
  getMyTickets: (params) => {
    return api.get('/tickets/my-tickets', { params })
  },

  /**
   * Get ticket by ID
   */
  getTicketById: (id) => {
    return api.get(`/tickets/${id}`)
  },

  /**
   * Get ticket by code
   */
  getTicketByCode: (code) => {
    return api.get(`/tickets/code/${code}`)
  },

  /**
   * Download ticket PDF
   */
  downloadPDF: (id) => {
    return api.get(`/tickets/${id}/pdf`, {
      responseType: 'blob'
    })
  },

  /**
   * Get QR code
   */
  getQRCode: (id) => {
    return api.get(`/tickets/${id}/qrcode`)
  },

  /**
   * Verify ticket
   */
  verifyTicket: (code) => {
    return api.post('/tickets/verify', { code })
  },

  // ==========================================
  // CHECK-IN
  // ==========================================
  
  /**
   * Check-in ticket
   */
  checkIn: (code) => {
    return api.post('/tickets/checkin', { code })
  },

  /**
   * Check-in by QR
   */
  checkInByQR: (qrData) => {
    return api.post('/tickets/checkin/qr', { qr_data: qrData })
  },

  /**
   * Get check-in status
   */
  getCheckInStatus: (id) => {
    return api.get(`/tickets/${id}/checkin-status`)
  },

  /**
   * Get check-in history
   */
  getCheckInHistory: (eventId) => {
    return api.get(`/events/${eventId}/checkin-history`)
  },

  // ==========================================
  // TICKET TRANSFER
  // ==========================================
  
  /**
   * Transfer ticket
   */
  transferTicket: (id, data) => {
    return api.post(`/tickets/${id}/transfer`, data)
  },

  /**
   * Accept ticket transfer
   */
  acceptTransfer: (transferId) => {
    return api.post(`/tickets/transfer/${transferId}/accept`)
  },

  /**
   * Reject ticket transfer
   */
  rejectTransfer: (transferId) => {
    return api.post(`/tickets/transfer/${transferId}/reject`)
  }
}