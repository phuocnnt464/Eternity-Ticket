import api from './axios'

export const queueAPI = {
  // ==========================================
  // QUEUE MANAGEMENT
  // ==========================================
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

  /**
   * Get waiting room info
   */
  getWaitingRoomInfo: (eventId, sessionId) => {
    return api.get(`/queue/waiting-room/${eventId}/${sessionId}`)
  },

  /**
   * Check early access eligibility
   */
  checkEarlyAccess: (eventId, sessionId) => {
    return api.get(`/queue/early-access/${eventId}/${sessionId}`)
  }
}