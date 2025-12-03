import api from './axios'

export const queueAPI = {
  joinQueue: (data) => {
    return api.post('/queue/join', data)
  },

  getStatus: (sessionId) => {
    return api.get(`/queue/status/${sessionId}`, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    })
  },

  heartbeat: (data) => {
    return api.post('/queue/heartbeat', data)
  },

  leaveQueue: (sessionId) => {
    return api.delete(`/queue/leave/${sessionId}`)
  },

  getStatistics: (sessionId) => {
    return api.get(`/queue/statistics/${sessionId}`, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })
  }
}