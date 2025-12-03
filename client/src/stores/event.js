import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useEventStore = defineStore('event', () => {
 
  const events = ref([])
  const currentEvent = ref(null)
  const categories = ref([])
  const featuredEvents = ref([])
  const myEvents = ref([])
  const loading = ref(false)
  const error = ref(null)
  
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
  
  const pagination = ref({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0
  })
  
  const filteredEvents = computed(() => {
    let result = [...events.value]
    
    if (filters.value.search) {
      const search = filters.value.search.toLowerCase()
      result = result.filter(event => 
        event.title?.toLowerCase().includes(search) ||
        event.description?.toLowerCase().includes(search)
      )
    }
    
    if (filters.value.category) {
      result = result.filter(event => 
        event.category_id === filters.value.category
      )
    }
    
    if (filters.value.status) {
      result = result.filter(event => 
        event.status === filters.value.status
      )
    }
    
    if (filters.value.privacy) {
      result = result.filter(event => 
        event.privacy_type === filters.value.privacy
      )
    }
    
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
  
  const setEvents = (eventList) => {
    events.value = eventList
  }

  const setCurrentEvent = (event) => {
    currentEvent.value = event
  }
  
  const setCategories = (categoryList) => {
    categories.value = categoryList
  }
  
  const setFeaturedEvents = (eventList) => {
    featuredEvents.value = eventList
  }
  
  const setMyEvents = (eventList) => {
    myEvents.value = eventList
  }
  
  const addEvent = (event) => {
    events.value.unshift(event)
    myEvents.value.unshift(event)
  }

  const updateEvent = (eventId, updatedData) => {
    const eventIndex = events.value.findIndex(e => e.id === eventId)
    if (eventIndex !== -1) {
      events.value[eventIndex] = { ...events.value[eventIndex], ...updatedData }
    }
    
    const myEventIndex = myEvents.value.findIndex(e => e.id === eventId)
    if (myEventIndex !== -1) {
      myEvents.value[myEventIndex] = { ...myEvents.value[myEventIndex], ...updatedData }
    }
    
    if (currentEvent.value?.id === eventId) {
      currentEvent.value = { ...currentEvent.value, ...updatedData }
    }
  }
  
  const removeEvent = (eventId) => {
    events.value = events.value.filter(e => e.id !== eventId)
    myEvents.value = myEvents.value.filter(e => e.id !== eventId)
    
    if (currentEvent.value?.id === eventId) {
      currentEvent.value = null
    }
  }
  
  const updateFilters = (newFilters) => {
    filters.value = { ...filters.value, ...newFilters }
    pagination.value.page = 1 // Reset to first page
  }

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

  const updatePagination = (paginationData) => {
    pagination.value = { ...pagination.value, ...paginationData }
  }
  
  const setPage = (page) => {
    pagination.value.page = page
  }
 
  const clearCurrentEvent = () => {
    currentEvent.value = null
  }
  
  const clear = () => {
    events.value = []
    currentEvent.value = null
    myEvents.value = []
    clearFilters()
  }
  
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