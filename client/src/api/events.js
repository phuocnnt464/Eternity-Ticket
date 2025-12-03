import api from './axios'

export const eventsAPI = {
  getCategories: () => {
    return api.get('/events/categories')
  },

  getPublicSettings() {
    return api.get('/events/public-settings');
  },

  getFeaturedEvents: (params) => {
    return api.get('/events/featured', { params })
  },

  searchEvents: (params) => {
    return api.get('/events/search', { params })
  },

  getEventBySlug: (slug) => {
    return api.get(`/events/slug/${slug}`)
  },

  getEventById: (id) => {
    return api.get(`/events/${id}`)
  },

  getPublicEvents: (params) => {
    return api.get('/events', { params })
  },

  createEvent: (data) => {
    if (data instanceof FormData) {
      return api.post('/events', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    }
    
    const formData = new FormData()
    
    Object.keys(data).forEach(key => {
      const value = data[key]
            
      if (value === null || value === undefined) {
        return
      }
      
      if (value instanceof File) {
        formData.append(key, value)
      }
      else if (typeof value !== 'object') {
        formData.append(key, value)
      }
    })
    
    return api.post('/events', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },

  getMyEvents: (params) => {
    return api.get('/events/my/all-events', { params })
  },

  getOrganizerStats: () => {
    return api.get('/events/my/stats', {
       headers: { 'Cache-Control': 'no-cache' }
    })
  },
  
  getOrganizerEvents: (params) => {
    return api.get('/events/my/all-events', { params })
  },

  getImageRequirements: () => {
    return api.get('/events/image-requirements')
  },

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

  submitForApproval: (id) => {
    return api.post(`/events/${id}/submit`)
  },

  getEventStatistics: (id) => {
    return api.get(`/events/${id}/statistics`)
  },

  deleteEvent: (id) => {
    return api.delete(`/events/${id}`)
  },

  cancelEvent: (id) => {
    return api.post(`/events/${id}/cancel`)
  },

  getEventOrders: (id, params) => {
    return api.get(`/events/${id}/orders`, { params })
  },

    getAttendees: (id, params) => {
    return api.get(`/events/${id}/attendees`, { params })
  },

  getTeamMembers: (eventId) => {
    return api.get(`/events/${eventId}/members`)
  },
  getMyTeamEvents: () => {
    return api.get('/events/team-events')
  },

  addTeamMember: (eventId, data) => {
    return api.post(`/events/${eventId}/members`, data)
  },

  updateMemberRole: (eventId, userId, data) => {
    return api.patch(`/events/${eventId}/members/${userId}`, data)
  },

  removeTeamMember: (eventId, userId) => {
    return api.delete(`/events/${eventId}/members/${userId}`)
  },

  acceptInvitation: (token) => {
    return api.post(`/events/invitations/${token}/accept`)
  }
}