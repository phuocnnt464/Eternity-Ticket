import api from './axios'

export const eventsAPI = {
  // ==========================================
  // PUBLIC EVENTS
  // ==========================================

  // Get all events
  getEvents: (params) => api.get('/events', { params }),

  // Get event by ID
  getEventById: (id) => api.get(`/events/${id}`),

  // Get event by Slug
  getEventBySlug: (slug) => api.get(`/events/slug/${slug}`),

  // Search events
  searchEvents: (params) => api.get('/events/search', { params }),

  // Get featured events
  getFeaturedEvents: (params) => api.get('/events/featured', { params }),

  // Get event categories
  getCategories: () => api.get('/events/categories'),

  // ==========================================
  // ORGANIZER - EVENT MANAGEMENT
  // ==========================================

  // Event CRUD
  createEvent: (data) => api.post('/events', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getMyEvents: (params) => api.get('/events/my/all-events', { params }),
  updateEvent: (id, data) => api.put(`/events/${id}`, data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteEvent: (id) => api.delete(`/events/${id}`),

  submitForApproval: (id) => api.post(`/events/${id}/submit`),

  // Upload event images
  uploadImages: (id, images) => {
    const formData = new FormData()
    
    if (images.cover) formData.append('cover_image', images.cover)
    if (images.thumbnail) formData.append('thumbnail_image', images.thumbnail)
    if (images.logo) formData.append('logo', images.logo)
    if (images.venue) formData.append('venue_map', images.venue)
    
    return api.post(`/events/${id}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },

  // ==========================================
  // SESSION & TICKET MANAGEMENT
  // ==========================================
  
  // Session (CRUD)
  createSession: (eventId, data) => {
    return api.post(`/event-sessions/${eventId}/sessions`, data)
  },
  getSessions: (eventId) => api.get(`/event-sessions/${eventId}/sessions`),
  updateSession: (sessionId, data) => {
    return api.put(`/event-sessions/session/${sessionId}`, data)
  },
  deleteSession: (sessionId) => {
    return api.delete(`/event-sessions/session/${sessionId}`)
  },

  // Ticket Type (CRUD)
  createTicketType: (sessionId, data) => {
    return api.post(`/event-sessions/session/${sessionId}/tickets`, data)
  },
  getTicketTypes: (sessionId) => api.get(`/event-sessions/session/${sessionId}/tickets`),
  updateTicketType: (ticketTypeId, data) => {
    return api.put(`/event-sessions/ticket/${ticketTypeId}`, data)
  },
  deleteTicketType: (ticketTypeId) => {
    return api.delete(`/event-sessions/ticket/${ticketTypeId}`)
  },

  // ==========================================
  // EVENT STATISTICS
  // ==========================================

  getEventStatistics: (id) => api.get(`/events/${id}/statistics`),
  /**
   * Get sales report
   */
  getSalesReport: (id, params) => {
    return api.get(`/events/${id}/sales-report`, { params })
  },

  /**
   * Get attendees list
   */
  getAttendees: (id, params) => {
    return api.get(`/events/${id}/attendees`, { params })
  },

  /**
   * Get check-in statistics
   */
  getCheckinStats: (id) => {
    return api.get(`/events/${id}/checkin-stats`)
  },

  // ==========================================
  // TEAM MANAGEMENT
  // ==========================================
  getTeamMembers: (eventId) => api.get(`/events/${eventId}/members`),
  addTeamMember: (eventId, data) => api.post(`/events/${eventId}/members`, data),
  removeTeamMember: (eventId, memberId) => 
    api.delete(`/events/${eventId}/members/${memberId}`),
  updateMemberRole: (eventId, memberId, data) => 
    api.patch(`/events/${eventId}/members/${memberId}`, data),

  // Invitation
  acceptInvitation: (token) => api.post(`/events/invitations/${token}/accept`),

  // ==========================================
  // COUPONS
  // ==========================================
  
  /**
   * Get event coupons
   */
  getCoupons: (eventId) => {
    return api.get(`/events/${eventId}/coupons`)
  },

  /**
   * Create coupon
   */
  createCoupon: (eventId, data) => {
    return api.post(`/events/${eventId}/coupons`, data)
  },

  /**
   * Update coupon
   */
  updateCoupon: (couponId, data) => {
    return api.put(`/coupons/${couponId}`, data)
  },

  /**
   * Delete coupon
   */
  deleteCoupon: (couponId) => {
    return api.delete(`/coupons/${couponId}`)
  },

  /**
   * Validate coupon
   */
  validateCoupon: (code, eventId, sessionId) => {
    return api.post('/coupons/validate', {
      code,
      event_id: eventId,
      session_id: sessionId
    })
  }
}