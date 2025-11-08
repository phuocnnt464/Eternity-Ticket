import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useQueueStore = defineStore('queue', () => {
  const isInQueue = ref(false)
  const queueId = ref(null)
  const queueNumber = ref(null)
  const status = ref('waiting')
  const estimatedWait = ref(null)
  const expiresAt = ref(null)
  const heartbeatInterval = ref(null)
  
  const canPurchase = computed(() => status.value === 'active')
  
  const joinQueue = (data) => {
    isInQueue.value = true
    queueId.value = data.queue_id
    queueNumber.value = data.queue_number
    status.value = data.status
    estimatedWait.value = data.estimated_wait_minutes
    expiresAt.value = data.expires_at
  }
  
  const updateStatus = (newStatus) => {
    status.value = newStatus
  }
  
  const updatePosition = (data) => {
    queueNumber.value = data.queue_number
    estimatedWait.value = data.estimated_wait_minutes
  }
  
  const exitQueue = () => {
    isInQueue.value = false
    queueId.value = null
    queueNumber.value = null
    status.value = 'waiting'
    estimatedWait.value = null
    expiresAt.value = null
    
    if (heartbeatInterval.value) {
      clearInterval(heartbeatInterval.value)
      heartbeatInterval.value = null
    }
  }
  
  const setHeartbeatInterval = (interval) => {
    heartbeatInterval.value = interval
  }
  
  return {
    isInQueue,
    queueId,
    queueNumber,
    status,
    estimatedWait,
    expiresAt,
    canPurchase,
    joinQueue,
    updateStatus,
    updatePosition,
    exitQueue,
    setHeartbeatInterval,
  }
})