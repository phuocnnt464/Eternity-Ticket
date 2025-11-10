import api from './axios'

export const ordersAPI = {
  // ==========================================
  // ORDER MANAGEMENT
  // ==========================================
  
  // Create order
  createOrder: (data) => api.post('/orders', data),

  // Get my orders
  getMyOrders: (params) => api.get('/orders/my-orders', { params }),

  // Get order detail
  getOrderById: (id) => api.get(`/orders/${id}`),

   /**
   * Cancel order
   */
  cancelOrder: (id, reason) => {
    return api.post(`/orders/${id}/cancel`, { reason })
  },

  /**
   * Get order summary
   */
  getOrderSummary: (id) => {
    return api.get(`/orders/${id}/summary`)
  },

  // ==========================================
  // PAYMENT
  // ==========================================
  
  createPayment: (orderId, data) => api.post(`/orders/${orderId}/payment`, data),
  verifyPayment: (orderId, params) => 
    api.get(`/orders/${orderId}/payment/verify`, { params }),
  
  // ==========================================
  // VN PAY INTEGRATION
  // ==========================================
  
  // Create VNPay payment URL
  createVNPayPayment: (orderId, returnUrl) => {
    return api.post(`/orders/${orderId}/vnpay`, { 
      return_url: returnUrl 
    })
  },

  // Verify VNPay payment callback
  verifyVNPayPayment: (params) => api.get('/orders/vnpay/callback', { params }),

  // VNPay IPN (Instant Payment Notification)
  handleVNPayIPN: (params) => {
    return api.post('/orders/vnpay/ipn', params)
  },

  // ==========================================
  // TICKETS
  // ==========================================
  
  /**
   * Get order tickets
   */
  getOrderTickets: (orderId) => {
    return api.get(`/orders/${orderId}/tickets`)
  },

  /**
   * Download ticket PDF
   */
  downloadTicketPDF: (ticketId) => {
    return api.get(`/tickets/${ticketId}/download-pdf`, {
      responseType: 'blob'
    })
  },

  /**
   * Download all tickets PDF
   */
  downloadAllTicketsPDF: (orderId) => {
    return api.get(`/orders/${orderId}/tickets/download-pdf`, {
      responseType: 'blob'
    })
  },

  /**
   * Resend ticket email
   */
  resendTicketEmail: (orderId) => {
    return api.post(`/orders/${orderId}/tickets/resend`)
  },

  // ==========================================
  // ORGANIZER - ORDER MANAGEMENT
  // ==========================================
  
  /**
   * Get event orders (organizer)
   */
  getEventOrders: (eventId, params) => {
    return api.get(`/events/${eventId}/orders`, { params })
  },

  /**
   * Export orders to CSV
   */
  exportOrders: (eventId, params) => {
    return api.get(`/events/${eventId}/orders/export`, { 
      params,
      responseType: 'blob'
    })
  },

  /**
   * Get order details (organizer)
   */
  getOrderDetails: (orderId) => {
    return api.get(`/orders/${orderId}/details`)
  },

  /**
   * Refund order (organizer/admin)
   */
  refundOrder: (orderId, data) => {
    return api.post(`/orders/${orderId}/refund`, data)
  }
}