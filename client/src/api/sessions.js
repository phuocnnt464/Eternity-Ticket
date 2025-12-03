import api from './axios'

export const sessionsAPI = {
  createSession: (eventId, data) => {
    return api.post(`/event-sessions/${eventId}/sessions`, data)
  },

  getEventSessions: (eventId) => {
    return api.get(`/event-sessions/${eventId}/sessions`)
  },

  updateSession: (sessionId, data) => {
    return api.put(`/event-sessions/session/${sessionId}`, data)
  },

  deleteSession: (sessionId) => {
    return api.delete(`/event-sessions/session/${sessionId}`)
  },

  createTicketType: (sessionId, data) => {
    return api.post(`/event-sessions/session/${sessionId}/tickets`, data)
  },

  getSessionTicketTypes: (sessionId) => {
    return api.get(`/event-sessions/session/${sessionId}/tickets`)
  },

  updateTicketType: (ticketTypeId, data) => {
    return api.put(`/event-sessions/ticket/${ticketTypeId}`, data)
  },

  deleteTicketType: (ticketTypeId) => {
    return api.delete(`/event-sessions/ticket/${ticketTypeId}`)
  },

  checkTicketAvailability: (ticketTypeId) => {
    return api.get(`/event-sessions/ticket/${ticketTypeId}/availability`)
  },

  getEventWithTickets: (eventId) => {
    return api.get(`/event-sessions/${eventId}/tickets`)
  }
}