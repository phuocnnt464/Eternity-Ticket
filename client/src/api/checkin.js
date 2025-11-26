import api from './axios'

export const checkinAPI = {
  // GET /api/checkin/verify/:ticketCode
  verifyTicket: (ticketCode) => {
    return api.get(`/checkin/verify/${ticketCode}`)
  },

  // POST /api/checkin/:ticketCode
  checkIn: (ticketCode, location = null) => {
    return api.post(`/checkin/${ticketCode}`, { location })
  },
  
  // POST /api/checkin/:ticketCode/undo
  undoCheckIn: (ticketCode) => {
    return api.delete(`/checkin/${ticketCode}/undo`)
  },

  // GET /api/checkin/event/:eventId/stats
  getCheckInStats: (eventId) => {
    return api.get(`/checkin/event/${eventId}/stats`)
  },

  // GET /api/checkin/event/:eventId/history
  // getCheckInHistory: (eventId, params) => {
  //   return api.get(`/checkin/event/${eventId}/history`, { params })
  // },

   // GET /api/checkin/event/:eventId/search
  searchTickets: (eventId, params) => {
    return api.get(`/checkin/event/${eventId}/search`, { params })
  },
  
  // GET /api/checkin/event/:eventId/recent (rename from getCheckInHistory)
  getRecentCheckins: (eventId, params) => {
    return api.get(`/checkin/event/${eventId}/recent`, { params })
  }
}