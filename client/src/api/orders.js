import api from './axios'

export const ordersAPI = {
  // Create order
  createOrder: (data) => api.post('/orders', data),

  // Get my orders
  getMyOrders: (params) => api.get('/orders/my-orders', { params }),

  // Get order detail
  getOrderById: (id) => api.get(`/orders/${id}`),

  // Cancel order
  cancelOrder: (id) => api.post(`/orders/${id}/cancel`),

  // Payment
  createPayment: (orderId, data) => api.post(`/orders/${orderId}/payment`, data),
  verifyPayment: (orderId, params) => 
    api.get(`/orders/${orderId}/payment/verify`, { params }),

  // VNPay
  createVNPayPayment: (orderId, returnUrl) => 
    api.post(`/orders/${orderId}/vnpay`, { return_url: returnUrl }),
  verifyVNPayPayment: (params) => api.get('/orders/vnpay/callback', { params }),
}