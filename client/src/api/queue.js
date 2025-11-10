import api from './axios'

export const queueAPI = {
  // POST /api/queue/join
  joinQueue: (data) => {
    return api.post('/queue/join', data)
  },

  // GET /api/queue/status/:sessionId
  getStatus: (sessionId) => {
    return api.get(`/queue/status/${sessionId}`)
  },

  // POST /api/queue/heartbeat
  heartbeat: (data) => {
    return api.post('/queue/heartbeat', data)
  },

  // DELETE /api/queue/leave/:sessionId
  leaveQueue: (sessionId) => {
    return api.delete(`/queue/leave/${sessionId}`)
  },

  // GET /api/queue/statistics/:sessionId
  getStatistics: (sessionId) => {
    return api.get(`/queue/statistics/${sessionId}`)
  }
}