import { ref } from 'vue'
import { ordersAPI } from '@/api'

/**
 * Orders composable
 */
export function useOrders() {
  const orders = ref([])
  const currentOrder = ref(null)
  const loading = ref(false)
  const error = ref(null)

  // Fetch user orders
  const fetchOrders = async (params = {}) => {
    loading.value = true
    error.value = null

    try {
      const response = await ordersAPI.getUserOrders(params)
      orders.value = response.data.data || []
      return { success: true, data: orders.value }
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      loading.value = false
    }
  }

  // Fetch order by ID
  const fetchOrderById = async (orderId) => {
    loading.value = true
    error.value = null

    try {
      const response = await ordersAPI.getOrderById(orderId)
      currentOrder.value = response.data.data
      return { success: true, data: currentOrder.value }
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      loading.value = false
    }
  }

  // Create order
  const createOrder = async (orderData) => {
    loading.value = true
    error.value = null

    try {
      const response = await ordersAPI.createOrder(orderData)
      currentOrder.value = response.data.data
      return { success: true, data: currentOrder.value }
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      loading.value = false
    }
  }

  // Cancel order
  const cancelOrder = async (orderId) => {
    loading.value = true
    error.value = null

    try {
      await ordersAPI.cancelOrder(orderId)
      
      // Update orders array
      const index = orders.value.findIndex(o => o.order_id === orderId)
      if (index !== -1) {
        orders.value[index].status = 'cancelled'
      }

      return { success: true }
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      loading.value = false
    }
  }

  // Process payment
  const processPayment = async (orderId, paymentData) => {
    loading.value = true
    error.value = null

    try {
      const response = await ordersAPI.processPayment(orderId, paymentData)
      return { success: true, data: response.data.data }
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      loading.value = false
    }
  }

  // Download tickets PDF
  const downloadTickets = async (orderId) => {
    loading.value = true
    error.value = null

    try {
      const response = await ordersAPI.downloadTicketsPDF(orderId)
      
      // Create blob and download
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `tickets-${orderId}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      return { success: true }
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      loading.value = false
    }
  }

  // Get order statistics
  const getOrderStats = async () => {
    try {
      const response = await ordersAPI.getOrderStatistics()
      return { success: true, data: response.data.data }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // Clear current order
  const clearCurrentOrder = () => {
    currentOrder.value = null
  }

  return {
    // State
    orders,
    currentOrder,
    loading,
    error,

    // Methods
    fetchOrders,
    fetchOrderById,
    createOrder,
    cancelOrder,
    processPayment,
    downloadTickets,
    getOrderStats,
    clearCurrentOrder
  }
}