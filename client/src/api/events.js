import api from './axios'

export const eventsAPI = {
  // Public
  getEvents: (params) => api.get('/events', { params }),
  getEventById: (id) => api.get(`/events/${id}`),
  getEventBySlug: (slug) => api.get(`/events/slug/${slug}`),
  getCategories: () => api.get('/events/categories'),
  getFeaturedEvents: (params) => api.get('/events/featured', { params }),
  searchEvents: (params) => api.get('/events/search', { params }),

  // Organizer
  createEvent: (data) => api.post('/events', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateEvent: (id, data) => api.put(`/events/${id}`, data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  submitForApproval: (id) => api.post(`/events/${id}/submit`),
  getMyEvents: (params) => api.get('/events/my/all-events', { params }),
  getEventStatistics: (id) => api.get(`/events/${id}/statistics`),
  deleteEvent: (id) => api.delete(`/events/${id}`),

  // Sessions & Tickets
  getSessions: (eventId) => api.get(`/event-sessions/${eventId}/sessions`),
  getTicketTypes: (sessionId) => api.get(`/event-sessions/${sessionId}/ticket-types`),

  // Team Management
  getTeamMembers: (eventId) => api.get(`/events/${eventId}/members`),
  addTeamMember: (eventId, data) => api.post(`/events/${eventId}/members`, data),
  removeTeamMember: (eventId, memberId) => 
    api.delete(`/events/${eventId}/members/${memberId}`),
  updateMemberRole: (eventId, memberId, data) => 
    api.patch(`/events/${eventId}/members/${memberId}`, data),

  // Invitation
  acceptInvitation: (token) => api.post(`/events/invitations/${token}/accept`),
}