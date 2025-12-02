import api from './axios'

export const queueAPI = {
  // POST /api/queue/join
  joinQueue: (data) => {
    return api.post('/queue/join', data)
  },

  // GET /api/queue/status/:sessionId
  getStatus: (sessionId) => {
    return api.get(`/queue/status/${sessionId}`, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    })
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
    return api.get(`/queue/statistics/${sessionId}`, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })
  }
}