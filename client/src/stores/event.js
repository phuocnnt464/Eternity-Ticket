import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useEventStore = defineStore('event', () => {
  // ==========================================
  // STATE
  // ==========================================
  const events = ref([])
  const currentEvent = ref(null)
  const categories = ref([])
  const featuredEvents = ref([])
  const myEvents = ref([])
  const loading = ref(false)
  const error = ref(null)
  
  // Filters
  const filters = ref({
    search: '',
    category: null,
    status: null,
    privacy: null,
    dateFrom: null,
    dateTo: null,
    priceMin: null,
    priceMax: null,
    sortBy: 'created_at',
    sortOrder: 'desc'
  })
  
  // Pagination
  const pagination = ref({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0
  })
  
  // ==========================================
  // GETTERS
  // ==========================================
  const filteredEvents = computed(() => {
    let result = [...events.value]
    
    // Search filter
    if (filters.value.search) {
      const search = filters.value.search.toLowerCase()
      result = result.filter(event => 
        event.title?.toLowerCase().includes(search) ||
        event.description?.toLowerCase().includes(search)
      )
    }
    
    // Category filter
    if (filters.value.category) {
      result = result.filter(event => 
        event.category_id === filters.value.category
      )
    }
    
    // Status filter
    if (filters.value.status) {
      result = result.filter(event => 
        event.status === filters.value.status
      )
    }
    
    // Privacy filter
    if (filters.value.privacy) {
      result = result.filter(event => 
        event.privacy_type === filters.value.privacy
      )
    }
    
    // Date range filter
    if (filters.value.dateFrom) {
      result = result.filter(event => 
        new Date(event.start_time) >= new Date(filters.value.dateFrom)
      )
    }
    
    if (filters.value.dateTo) {
      result = result.filter(event => 
        new Date(event.end_time) <= new Date(filters.value.dateTo)
      )
    }
    
    return result
  })
  
  const hasEvents = computed(() => events.value.length > 0)
  
  const hasFeaturedEvents = computed(() => featuredEvents.value.length > 0)
  
  const hasMyEvents = computed(() => myEvents.value.length > 0)
  
  // ==========================================
  // ACTIONS
  // ==========================================
  
  /**
   * Set events
   */
  const setEvents = (eventList) => {
    events.value = eventList
  }
  
  /**
   * Set current event
   */
  const setCurrentEvent = (event) => {
    currentEvent.value = event
  }
  
  /**
   * Set categories
   */
  const setCategories = (categoryList) => {
    categories.value = categoryList
  }
  
  /**
   * Set featured events
   */
  const setFeaturedEvents = (eventList) => {
    featuredEvents.value = eventList
  }
  
  /**
   * Set my events
   */
  const setMyEvents = (eventList) => {
    myEvents.value = eventList
  }
  
  /**
   * Add event to list
   */
  const addEvent = (event) => {
    events.value.unshift(event)
    myEvents.value.unshift(event)
  }
  
  /**
   * Update event in list
   */
  const updateEvent = (eventId, updatedData) => {
    // Update in events list
    const eventIndex = events.value.findIndex(e => e.id === eventId)
    if (eventIndex !== -1) {
      events.value[eventIndex] = { ...events.value[eventIndex], ...updatedData }
    }
    
    // Update in my events list
    const myEventIndex = myEvents.value.findIndex(e => e.id === eventId)
    if (myEventIndex !== -1) {
      myEvents.value[myEventIndex] = { ...myEvents.value[myEventIndex], ...updatedData }
    }
    
    // Update current event
    if (currentEvent.value?.id === eventId) {
      currentEvent.value = { ...currentEvent.value, ...updatedData }
    }
  }
  
  /**
   * Remove event from list
   */
  const removeEvent = (eventId) => {
    events.value = events.value.filter(e => e.id !== eventId)
    myEvents.value = myEvents.value.filter(e => e.id !== eventId)
    
    if (currentEvent.value?.id === eventId) {
      currentEvent.value = null
    }
  }
  
  /**
   * Update filters
   */
  const updateFilters = (newFilters) => {
    filters.value = { ...filters.value, ...newFilters }
    pagination.value.page = 1 // Reset to first page
  }
  
  /**
   * Clear filters
   */
  const clearFilters = () => {
    filters.value = {
      search: '',
      category: null,
      status: null,
      privacy: null,
      dateFrom: null,
      dateTo: null,
      priceMin: null,
      priceMax: null,
      sortBy: 'created_at',
      sortOrder: 'desc'
    }
    pagination.value.page = 1
  }
  
  /**
   * Update pagination
   */
  const updatePagination = (paginationData) => {
    pagination.value = { ...pagination.value, ...paginationData }
  }
  
  /**
   * Set page
   */
  const setPage = (page) => {
    pagination.value.page = page
  }
  
  /**
   * Clear current event
   */
  const clearCurrentEvent = () => {
    currentEvent.value = null
  }
  
  /**
   * Clear all
   */
  const clear = () => {
    events.value = []
    currentEvent.value = null
    myEvents.value = []
    clearFilters()
  }
  
  // ==========================================
  // RETURN
  // ==========================================
  return {
    // State
    events,
    currentEvent,
    categories,
    featuredEvents,
    myEvents,
    loading,
    error,
    filters,
    pagination,
    
    // Getters
    filteredEvents,
    hasEvents,
    hasFeaturedEvents,
    hasMyEvents,
    
    // Actions
    setEvents,
    setCurrentEvent,
    setCategories,
    setFeaturedEvents,
    setMyEvents,
    addEvent,
    updateEvent,
    removeEvent,
    updateFilters,
    clearFilters,
    updatePagination,
    setPage,
    clearCurrentEvent,
    clear
  }
})