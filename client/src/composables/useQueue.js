import { ref, onUnmounted } from 'vue'
import { queueAPI } from '@/api'

export function useQueue(sessionId) {
  const queuePosition = ref(null)
  const estimatedWaitTime = ref(null)
  const isInQueue = ref(false)
  const canPurchase = ref(false)
  const error = ref(null)
  const pollInterval = ref(null)

  const joinQueue = async () => {
    error.value = null

    try {
      const response = await queueAPI.joinQueue(sessionId)
      const data = response.data.data

      isInQueue.value = true
      queuePosition.value = data.position
      estimatedWaitTime.value = data.estimated_wait_time

      startPolling()

      return { success: true, data }
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    }
  }

  const checkQueueStatus = async () => {
    try {
      const response = await queueAPI.getQueueStatus(sessionId)
      const data = response.data.data

      queuePosition.value = data.position
      estimatedWaitTime.value = data.estimated_wait_time
      canPurchase.value = data.can_purchase

      if (canPurchase.value) {
        stopPolling()
      }

      return { success: true, data }
    } catch (err) {
      error.value = err.message
      stopPolling()
      return { success: false, error: err.message }
    }
  }

  const leaveQueue = async () => {
    stopPolling()
    error.value = null

    try {
      await queueAPI.leaveQueue(sessionId)
      
      isInQueue.value = false
      queuePosition.value = null
      estimatedWaitTime.value = null
      canPurchase.value = false

      return { success: true }
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    }
  }

  const startPolling = (interval = 5000) => {
    if (pollInterval.value) {
      clearInterval(pollInterval.value)
    }

    pollInterval.value = setInterval(() => {
      checkQueueStatus()
    }, interval)
  }

  const stopPolling = () => {
    if (pollInterval.value) {
      clearInterval(pollInterval.value)
      pollInterval.value = null
    }
  }

  const formatWaitTime = (seconds) => {
    if (!seconds) return '0 seconds'

    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60

    if (minutes === 0) {
      return `${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`
    }

    if (remainingSeconds === 0) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`
    }

    return `${minutes}m ${remainingSeconds}s`
  }

  onUnmounted(() => {
    stopPolling()
    if (isInQueue.value) {
      leaveQueue()
    }
  })

  return {
    // State
    queuePosition,
    estimatedWaitTime,
    isInQueue,
    canPurchase,
    error,

    // Methods
    joinQueue,
    checkQueueStatus,
    leaveQueue,
    startPolling,
    stopPolling,
    formatWaitTime
  }
}