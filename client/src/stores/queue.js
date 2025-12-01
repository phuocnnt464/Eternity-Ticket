import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { queueAPI } from '@/api'

export const useQueueStore = defineStore('queue', () => {
  const queuePosition = ref(null)
  const estimatedWaitTime = ref(null)
  
  function $reset() {
    queuePosition.value = null
    estimatedWaitTime.value = null
    // Reset tất cả state
  }
  // ==========================================
  const isInQueue = ref(false)
  const queueId = ref(null)
  const queueNumber = ref(null)
  const status = ref('waiting') // waiting, active, expired, completed
  const estimatedWait = ref(null)
  const expiresAt = ref(null)
  const eventId = ref(null)
  const sessionId = ref(null)
  const heartbeatInterval = ref(null)
  const lastHeartbeat = ref(null)
  
  // Queue config
  const queueTimeout = ref(15 * 60 * 1000) // 15 minutes in ms
  const heartbeatFrequency = ref(30 * 1000) // 30 seconds in ms

  // ==========================================
  // GETTERS
  // ==========================================
  const canPurchase = computed(() => status.value === 'active')
  const isWaiting = computed(() => status.value === 'waiting')
  
  const isExpired = computed(() => status.value === 'expired')
  
  const isCompleted = computed(() => status.value === 'completed')
  
  const timeRemaining = computed(() => {
    if (!expiresAt.value) return 0
    
    const now = new Date().getTime()
    const expires = new Date(expiresAt.value).getTime()
    const remaining = expires - now
    
    return Math.max(0, Math.floor(remaining / 1000)) // seconds
  })
  
  const timeRemainingFormatted = computed(() => {
    const seconds = timeRemaining.value
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  })
  
  const hasQueueData = computed(() => {
    return isInQueue.value && queueId.value && queueNumber.value
  })

  // ==========================================
  // ACTIONS
  // ==========================================
  
  /**
   * Join queue
   */
  const joinQueue = async (sessionId) => {
    try {
      const response = await queueAPI.joinQueue({ session_id: sessionId })
      const data = response.data.data || response.data

      isInQueue.value = true
      queueId.value = data.queue_id || data.id
      queueNumber.value = data.queue_position || data.queue_number
      status.value = data.can_purchase ?  'active' : 'waiting'
      estimatedWait.value = data.estimated_wait_minutes
      expiresAt.value = data.expires_at
      eventId.value = data.event_id
      sessionId.value = sessionId
      lastHeartbeat.value = new Date().toISOString()
    }
    catch (error) {
      throw error
    }
  }

  /**
   * Update queue status
   */
  
  const updateStatus = (newStatus) => {
    status.value = newStatus
     // Set expiry time when activated
    if (newStatus === 'active' && !expiresAt.value) {
      const expires = new Date()
      expires.setTime(expires.getTime() + queueTimeout.value)
      expiresAt.value = expires.toISOString()
    }
  }
  
  /**
   * Update queue position
   */
  const updatePosition = (data) => {
    queueNumber.value = data.queue_number
    estimatedWait.value = data.estimated_wait_minutes
    if (data.status) {
      status.value = data.status
    }
  }

  const sendHeartbeat = async (sessionId) => {
    try {
      await queueAPI.heartbeat({ session_id: sessionId })
      lastHeartbeat.value = new Date().toISOString()
    } catch (error) {
      console.error('Heartbeat failed:', error)
    }
  }

  /**
   * Start heartbeat
   */
  const startHeartbeat = (callback) => {
    if (heartbeatInterval.value) {
      clearInterval(heartbeatInterval.value)
    }
    
    heartbeatInterval.value = setInterval(() => {
      lastHeartbeat.value = new Date().toISOString()
      if (callback && typeof callback === 'function') {
        callback(queueId.value)
      }
    }, heartbeatFrequency.value)
  }
  
  /**
   * Stop heartbeat
   */
  const stopHeartbeat = () => {
    if (heartbeatInterval.value) {
      clearInterval(heartbeatInterval.value)
      heartbeatInterval.value = null
    }
  }
  
  // Leave queue
  const leaveQueue = async (sessionId) => {
    try {
      await queueAPI.leaveQueue(sessionId)
      exitQueue()
    } catch (error) {
      throw error
    }
  }

  /**
   * Exit queue
   */
  const exitQueue = () => {
    stopHeartbeat()

    isInQueue.value = false
    queueId.value = null
    queueNumber.value = null
    status.value = 'waiting'
    estimatedWait.value = null
    expiresAt.value = null
    eventId.value = null
    sessionId.value = null
    lastHeartbeat.value = null
  }

  /**
   * Complete queue (after successful purchase)
   */
  const completeQueue = () => {
    status.value = 'completed'
    stopHeartbeat()
    
    // Auto exit after 5 seconds
    setTimeout(() => {
      exitQueue()
    }, 5000)
  }
  
  /**
   * Expire queue
   */
  const expireQueue = () => {
    status.value = 'expired'
    stopHeartbeat()
  }

  const currentQueue = computed(() => ({
    status: status.value,
    position: queueNumber.value,
    active_until: expiresAt.value,
    estimated_wait: estimatedWait.value
  }))

  
  /**
   * Check if queue expired
   */
  const checkExpiration = () => {
    if (expiresAt.value && status.value === 'active') {
      const now = new Date().getTime()
      const expires = new Date(expiresAt.value).getTime()
      
      if (now >= expires) {
        expireQueue()
        return true
      }
    }
    return false
  }
  
  return {
    queuePosition,
    estimatedWaitTime,
    $reset,
     // State
    isInQueue,
    queueId,
    queueNumber,
    status,
    estimatedWait,
    expiresAt,
    eventId,
    sessionId,
    heartbeatInterval,
    lastHeartbeat,
    queueTimeout,
    heartbeatFrequency,
    currentQueue,
    
    // Getters
    canPurchase,
    isWaiting,
    isExpired,
    isCompleted,
    timeRemaining,
    timeRemainingFormatted,
    hasQueueData,
    
    // Actions
    joinQueue,
    updateStatus,
    updatePosition,
    sendHeartbeat,
    startHeartbeat,
    stopHeartbeat,
    exitQueue,
    completeQueue,
    expireQueue,
    checkExpiration,
    leaveQueue
  }
}, {
  persist: true
})