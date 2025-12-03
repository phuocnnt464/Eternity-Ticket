import api from './axios'

export const checkinAPI = {
  verifyTicket: (ticketCode) => {
    return api.get(`/checkin/verify/${ticketCode}`)
  },

  checkIn: (ticketCode, location = null) => {
    return api.post(`/checkin/${ticketCode}`, { location })
  },
  
  undoCheckIn: (ticketCode) => {
    return api.delete(`/checkin/${ticketCode}/undo`)
  },

  getCheckInStats: (eventId) => {
    return api.get(`/checkin/event/${eventId}/stats`)
  },

  searchTickets: (eventId, params) => {
    return api.get(`/checkin/event/${eventId}/search`, { params })
  },
  
  getRecentCheckins: (eventId, params) => {
    return api.get(`/checkin/event/${eventId}/recent`, { params })
  }
}