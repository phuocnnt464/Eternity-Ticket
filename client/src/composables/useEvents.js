import { ref, computed } from 'vue'
import { eventsAPI } from '@/api'

/**
 * Events composable for event operations
 */
export function useEvents() {
  const events = ref([])
  const currentEvent = ref(null)
  const loading = ref(false)
  const error = ref(null)

  // Fetch all events
  const fetchEvents = async (params = {}) => {
    loading.value = true
    error.value = null

    try {
      const response = await eventsAPI.getPublicEvents(params)
      events.value = response.data.data || []
      return { success: true, data: events.value }
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      loading.value = false
    }
  }

  // Fetch event by ID
  const fetchEventById = async (eventId) => {
    loading.value = true
    error.value = null

    try {
      const response = await eventsAPI.getEventById(eventId)
      currentEvent.value = response.data.data
      return { success: true, data: currentEvent.value }
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      loading.value = false
    }
  }

  // Fetch event by slug
  const fetchEventBySlug = async (slug) => {
    loading.value = true
    error.value = null

    try {
      const response = await eventsAPI.getEventBySlug(slug)
      currentEvent.value = response.data.data
      return { success: true, data: currentEvent.value }
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      loading.value = false
    }
  }

  // Create event
  const createEvent = async (eventData) => {
    loading.value = true
    error.value = null

    try {
      const response = await eventsAPI.createEvent(eventData)
      return { success: true, data: response.data.data }
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      loading.value = false
    }
  }

  // Update event
  const updateEvent = async (eventId, eventData) => {
    loading.value = true
    error.value = null

    try {
      const response = await eventsAPI.updateEvent(eventId, eventData)
      return { success: true, data: response.data.data }
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      loading.value = false
    }
  }

  // Delete event
  const deleteEvent = async (eventId) => {
    loading.value = true
    error.value = null

    try {
      await eventsAPI.deleteEvent(eventId)
      // Remove from events array
      events.value = events.value.filter(e => e.event_id !== eventId)
      return { success: true }
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      loading.value = false
    }
  }

  // Search events
  const searchEvents = async (searchQuery) => {
    return await fetchEvents({ search: searchQuery })
  }

  // Filter events by category
  const filterByCategory = async (categoryId) => {
    return await fetchEvents({ category_id: categoryId })
  }

  // Get featured events
  const getFeaturedEvents = async (limit = 6) => {
    return await fetchEvents({ featured: true, limit })
  }

  // Clear current event
  const clearCurrentEvent = () => {
    currentEvent.value = null
  }

  return {
    // State
    events,
    currentEvent,
    loading,
    error,

    // Methods
    fetchEvents,
    fetchEventById,
    fetchEventBySlug,
    createEvent,
    updateEvent,
    deleteEvent,
    searchEvents,
    filterByCategory,
    getFeaturedEvents,
    clearCurrentEvent
  }
}