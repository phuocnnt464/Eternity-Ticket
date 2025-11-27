import api from './axios'

export const eventsAPI = {
  // ==========================================
  // PUBLIC ROUTES
  // ==========================================
  
  // GET /api/events/categories
  getCategories: () => {
    return api.get('/events/categories')
  },

  /**
   * Get public system settings
   * @returns {Promise}
   */
  getPublicSettings() {
    return api.get('/events/public-settings');
  },

  // GET /api/events/featured
  getFeaturedEvents: (params) => {
    return api.get('/events/featured', { params })
  },

  // GET /api/events/search
  searchEvents: (params) => {
    return api.get('/events/search', { params })
  },

  // GET /api/events/slug/:slug
  getEventBySlug: (slug) => {
    return api.get(`/events/slug/${slug}`)
  },

  // GET /api/events/:id
  getEventById: (id) => {
    return api.get(`/events/${id}`)
  },

  // GET /api/events (public events)
  getPublicEvents: (params) => {
    return api.get('/events', { params })
  },

  // ==========================================
  // ORGANIZER ROUTES (authenticated)
  // ==========================================
  
  // POST /api/events
  createEvent: (data) => {
    if (data instanceof FormData) {
      return api.post('/events', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    }
    
    // Nếu không, tạo FormData mới (backward compatibility)
    const formData = new FormData()
    
    Object.keys(data).forEach(key => {
      const value = data[key]
      
      
      // Skip null/undefined
      if (value === null || value === undefined) {
        return
      }
      
      // Append files
      if (value instanceof File) {
        formData.append(key, value)
      }
      // Append other values (strings, numbers, booleans)
      else if (typeof value !== 'object') {
        formData.append(key, value)
      }
    })
    
    return api.post('/events', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },

  // GET /api/events/my/all-events
  getMyEvents: (params) => {
    return api.get('/events/my/all-events', { params })
  },

  // GET /api/events/my/stats
  getOrganizerStats: () => {
    return api.get('/events/my/stats', {
       headers: { 'Cache-Control': 'no-cache' }
    })
  },
  
  // GET /api/events/my/all-events (alias)
  getOrganizerEvents: (params) => {
    return api.get('/events/my/all-events', { params })
  },

  // GET /api/events/image-requirements
  getImageRequirements: () => {
    return api.get('/events/image-requirements')
  },

  // PUT /api/events/:id
  updateEvent: (id, data) => {
    if (data instanceof FormData) {
      return api.put(`/events/${id}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    }
  
    const formData = new FormData()
    
    Object.keys(data).forEach(key => {
      if (data[key] !== null && data[key] !== undefined) {
        if (data[key] instanceof File) {
          formData.append(key, data[key])
        } else if (typeof data[key] !== 'object') {
          formData.append(key, data[key])
        }
      }
    })
    
    return api.put(`/events/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },

  // POST /api/events/:id/submit
  submitForApproval: (id) => {
    return api.post(`/events/${id}/submit`)
  },

  // GET /api/events/:id/statistics
  getEventStatistics: (id) => {
    return api.get(`/events/${id}/statistics`)
  },

  // DELETE /api/events/:id
  deleteEvent: (id) => {
    return api.delete(`/events/${id}`)
  },

  // POST /api/events/:id/cancel
  cancelEvent: (id) => {
    return api.post(`/events/${id}/cancel`)
  },

  // GET /api/events/:id/orders
  getEventOrders: (id, params) => {
    return api.get(`/events/${id}/orders`, { params })
  },

  // GET /api/events/:id/attendees
  getAttendees: (id, params) => {
    return api.get(`/events/${id}/attendees`, { params })
  },

  // ==========================================
  // TEAM MANAGEMENT
  // ==========================================
  
  // GET /api/events/:eventId/members
  getTeamMembers: (eventId) => {
    return api.get(`/events/${eventId}/members`)
  },
  // GET /api/events/teams
  getMyTeamEvents: () => {
    return api.get('/events/team-events')
  },

  // POST /api/events/:eventId/members
  addTeamMember: (eventId, data) => {
    return api.post(`/events/${eventId}/members`, data)
  },

  // PATCH /api/events/:eventId/members/:userId
  updateMemberRole: (eventId, userId, data) => {
    return api.patch(`/events/${eventId}/members/${userId}`, data)
  },

  // DELETE /api/events/:eventId/members/:userId
  removeTeamMember: (eventId, userId) => {
    return api.delete(`/events/${eventId}/members/${userId}`)
  },

  // POST /api/events/invitations/:token/accept
  acceptInvitation: (token) => {
    return api.post(`/events/invitations/${token}/accept`)
  },

  // ==========================================
  // COUPONS
  // ==========================================
  
  // // GET /api/events/:eventId/coupons
  // getCoupons: (eventId) => {
  //   return api.get(`/events/${eventId}/coupons`)
  // },

  // // POST /api/events/:eventId/coupons
  // createCoupon: (eventId, data) => {
  //   return api.post(`/events/${eventId}/coupons`, data)
  // },

  // // PUT /api/events/coupons/:couponId
  // updateCoupon: (couponId, data) => {
  //   return api.put(`/events/coupons/${couponId}`, data)
  // },

  // // DELETE /api/events/coupons/:couponId
  // deleteCoupon: (couponId) => {
  //   return api.delete(`/events/coupons/${couponId}`)
  // },

  // // POST /api/events/coupons/validate
  // validateCoupon: (data) => {
  //   return api.post('/events/coupons/validate', data)
  // }
}