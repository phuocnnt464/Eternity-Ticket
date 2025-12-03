import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useOrderStore = defineStore('order', () => {
  const orders = ref([])
  const currentOrder = ref(null)
  const loading = ref(false)
  const error = ref(null)
  
  const pagination = ref({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })
  
  const filters = ref({
    status: null,
    dateFrom: null,
    dateTo: null,
    eventId: null
  })
  
  const hasOrders = computed(() => orders.value.length > 0)
  
  const pendingOrders = computed(() => {
    return orders.value.filter(o => o.status === 'pending')
  })
  
  const paidOrders = computed(() => {
    return orders.value.filter(o => o.status === 'paid')
  })
  
  const cancelledOrders = computed(() => {
    return orders.value.filter(o => o.status === 'cancelled')
  })
  
  const filteredOrders = computed(() => {
    let result = [...orders.value]
    
    if (filters.value.status) {
      result = result.filter(o => o.status === filters.value.status)
    }
    
    if (filters.value.eventId) {
      result = result.filter(o => o.event_id === filters.value.eventId)
    }
    
    if (filters.value.dateFrom) {
      result = result.filter(o => 
        new Date(o.created_at) >= new Date(filters.value.dateFrom)
      )
    }
    
    if (filters.value.dateTo) {
      result = result.filter(o => 
        new Date(o.created_at) <= new Date(filters.value.dateTo)
      )
    }
    
    return result
  })
  
  const totalSpent = computed(() => {
    return paidOrders.value.reduce((sum, order) => {
      return sum + parseFloat(order.total_amount || 0)
    }, 0)
  })
  
  const setOrders = (orderList) => {
    orders.value = orderList
  }

  const setCurrentOrder = (order) => {
    currentOrder.value = order
  }

  const addOrder = (order) => {
    orders.value.unshift(order)
  }

  const updateOrder = (orderId, data) => {
    const index = orders.value.findIndex(o => o.id === orderId)
    if (index !== -1) {
      orders.value[index] = { ...orders.value[index], ...data }
    }
    
    if (currentOrder.value?.id === orderId) {
      currentOrder.value = { ...currentOrder.value, ...data }
    }
  }

  const removeOrder = (orderId) => {
    orders.value = orders.value.filter(o => o.id !== orderId)
    
    if (currentOrder.value?.id === orderId) {
      currentOrder.value = null
    }
  }

  const updateFilters = (newFilters) => {
    filters.value = { ...filters.value, ...newFilters }
    pagination.value.page = 1
  }
  
  const clearFilters = () => {
    filters.value = {
      status: null,
      dateFrom: null,
      dateTo: null,
      eventId: null
    }
  }
  
  const updatePagination = (paginationData) => {
    pagination.value = { ...pagination.value, ...paginationData }
  }
  
  const setPage = (page) => {
    pagination.value.page = page
  }
  
  const clearCurrentOrder = () => {
    currentOrder.value = null
  }
  
  const clear = () => {
    orders.value = []
    currentOrder.value = null
    clearFilters()
    pagination.value.page = 1
  }
  
  return {
    // State
    orders,
    currentOrder,
    loading,
    error,
    pagination,
    filters,
    
    // Getters
    hasOrders,
    pendingOrders,
    paidOrders,
    cancelledOrders,
    filteredOrders,
    totalSpent,
    
    // Actions
    setOrders,
    setCurrentOrder,
    addOrder,
    updateOrder,
    removeOrder,
    updateFilters,
    clearFilters,
    updatePagination,
    setPage,
    clearCurrentOrder,
    clear
  }
})