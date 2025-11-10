import api from './axios'

export const sessionsAPI = {
  // ==========================================
  // SESSION MANAGEMENT
  // ==========================================
  
  // POST /api/event-sessions/:eventId/sessions
  createSession: (eventId, data) => {
    return api.post(`/event-sessions/${eventId}/sessions`, data)
  },

  // GET /api/event-sessions/:eventId/sessions
  getEventSessions: (eventId) => {
    return api.get(`/event-sessions/${eventId}/sessions`)
  },

  // PUT /api/event-sessions/session/:sessionId
  updateSession: (sessionId, data) => {
    return api.put(`/event-sessions/session/${sessionId}`, data)
  },

  // DELETE /api/event-sessions/session/:sessionId
  deleteSession: (sessionId) => {
    return api.delete(`/event-sessions/session/${sessionId}`)
  },

  // ==========================================
  // TICKET TYPES
  // ==========================================
  
  // POST /api/event-sessions/session/:sessionId/tickets
  createTicketType: (sessionId, data) => {
    return api.post(`/event-sessions/session/${sessionId}/tickets`, data)
  },

  // GET /api/event-sessions/session/:sessionId/tickets
  getSessionTicketTypes: (sessionId) => {
    return api.get(`/event-sessions/session/${sessionId}/tickets`)
  },

  // PUT /api/event-sessions/ticket/:ticketTypeId
  updateTicketType: (ticketTypeId, data) => {
    return api.put(`/event-sessions/ticket/${ticketTypeId}`, data)
  },

  // DELETE /api/event-sessions/ticket/:ticketTypeId
  deleteTicketType: (ticketTypeId) => {
    return api.delete(`/event-sessions/ticket/${ticketTypeId}`)
  },

  // GET /api/event-sessions/ticket/:ticketTypeId/availability
  checkTicketAvailability: (ticketTypeId) => {
    return api.get(`/event-sessions/ticket/${ticketTypeId}/availability`)
  }
}