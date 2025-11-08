import api from './axios'

export const queueAPI = {
  // Join queue
  joinQueue: (data) => api.post('/queue/join', data),

  // Get queue status
  getQueueStatus: (eventId, sessionId) => 
    api.get(`/queue/status/${eventId}/${sessionId}`),

  // Get my position
  getMyPosition: (queueId) => api.get(`/queue/position/${queueId}`),

  // Heartbeat (keep alive)
  sendHeartbeat: (queueId) => api.post(`/queue/heartbeat/${queueId}`),

  // Exit queue
  exitQueue: (queueId) => api.post(`/queue/exit/${queueId}`),

  // Check can purchase
  canPurchase: (queueId) => api.get(`/queue/can-purchase/${queueId}`),
}