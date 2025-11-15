import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useNotificationStore = defineStore('notification', () => {
  // ==========================================
  // STATE
  // ==========================================
  const notifications = ref([])
  const unreadCount = ref(0)

  function $reset() {
    notifications.value = []
    unreadCount.value = 0
    // Reset tất cả state
  }
  const loading = ref(false)
  const error = ref(null)
  
  // Pagination
  const pagination = ref({
    page: 1,
    limit: 20,
    total: 0,
    hasMore: false
  })
  
  // Filters
  const filters = ref({
    type: null, // system, event_reminder, payment, membership, promotion
    isRead: null
  })
  
  // ==========================================
  // GETTERS
  // ==========================================
  const hasUnread = computed(() => unreadCount.value > 0)
  
  const hasNotifications = computed(() => notifications.value.length > 0)
  
  const unreadNotifications = computed(() => {
    return notifications.value.filter(n => !n.is_read)
  })
  
  const readNotifications = computed(() => {
    return notifications.value.filter(n => n.is_read)
  })
  
  const filteredNotifications = computed(() => {
    let result = [...notifications.value]
    
    if (filters.value.type) {
      result = result.filter(n => n.type === filters.value.type)
    }
    
    if (filters.value.isRead !== null) {
      result = result.filter(n => n.is_read === filters.value.isRead)
    }
    
    return result
  })
  
  const hasMorePages = computed(() => pagination.value.hasMore)
  
  // ==========================================
  // ACTIONS
  // ==========================================
  
  /**
   * Set notifications
   */
  const setNotifications = (notificationList, append = false) => {
    if (append) {
      notifications.value = [...notifications.value, ...notificationList]
    } else {
      notifications.value = notificationList
    }
  }
  
  /**
   * Add notification
   */
  const addNotification = (notification) => {
    notifications.value.unshift(notification)
    if (!notification.is_read) {
      unreadCount.value++
    }
  }
  
  /**
   * Update notification
   */
  const updateNotification = (notificationId, data) => {
    const index = notifications.value.findIndex(n => n.id === notificationId)
    if (index !== -1) {
      const wasUnread = !notifications.value[index].is_read
      notifications.value[index] = { ...notifications.value[index], ...data }
      
      // Update unread count
      if (wasUnread && data.is_read) {
        unreadCount.value = Math.max(0, unreadCount.value - 1)
      }
    }
  }
  
  /**
   * Remove notification
   */
  const removeNotification = (notificationId) => {
    const notification = notifications.value.find(n => n.id === notificationId)
    if (notification && !notification.is_read) {
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    }
    notifications.value = notifications.value.filter(n => n.id !== notificationId)
  }
  
  /**
   * Mark as read
   */
  const markAsRead = (notificationId) => {
    updateNotification(notificationId, { is_read: true, read_at: new Date().toISOString() })
  }
  
  /**
   * Mark all as read
   */
  const markAllAsRead = () => {
    notifications.value.forEach(notification => {
      if (!notification.is_read) {
        notification.is_read = true
        notification.read_at = new Date().toISOString()
      }
    })
    unreadCount.value = 0
  }
  
  /**
   * Set unread count
   */
  const setUnreadCount = (count) => {
    unreadCount.value = count
  }
  
  /**
   * Update filters
   */
  const updateFilters = (newFilters) => {
    filters.value = { ...filters.value, ...newFilters }
  }
  
  /**
   * Clear filters
   */
  const clearFilters = () => {
    filters.value = {
      type: null,
      isRead: null
    }
  }
  
  /**
   * Update pagination
   */
  const updatePagination = (paginationData) => {
    pagination.value = { ...pagination.value, ...paginationData }
  }
  
  /**
   * Load more notifications
   */
  const loadMore = () => {
    if (hasMorePages.value) {
      pagination.value.page++
      return true
    }
    return false
  }
  
  /**
   * Clear all notifications
   */
  const clear = () => {
    notifications.value = []
    unreadCount.value = 0
    pagination.value = {
      page: 1,
      limit: 20,
      total: 0,
      hasMore: false
    }
    clearFilters()
  }
  
  // ==========================================
  // RETURN
  // ==========================================
  return {
    // State
    notifications,
    unreadCount,
    $reset,
    
    loading,
    error,
    pagination,
    filters,
    
    // Getters
    hasUnread,
    hasNotifications,
    unreadNotifications,
    readNotifications,
    filteredNotifications,
    hasMorePages,
    
    // Actions
    setNotifications,
    addNotification,
    updateNotification,
    removeNotification,
    markAsRead,
    markAllAsRead,
    setUnreadCount,
    updateFilters,
    clearFilters,
    updatePagination,
    loadMore,
    clear
  }
}, {
  persist: {
    paths: ['unreadCount']
  }
})