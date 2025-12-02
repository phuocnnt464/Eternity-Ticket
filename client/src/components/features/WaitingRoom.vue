<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useQueueStore } from '@/stores/queue'
import { queueAPI } from '@/api/queue'
import { 
  ClockIcon, 
  UsersIcon,
  CheckCircleIcon,
  XCircleIcon 
} from '@heroicons/vue/24/outline'
import Spinner from '@/components/common/Spinner.vue'
import Button from '@/components/common/Button.vue'

const props = defineProps({
  sessionId: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['ready', 'expired', 'error'])

const queueStore = useQueueStore()
const heartbeatInterval = ref(null)
const countdownInterval = ref(null)
const remainingTime = ref(0)

const totalInQueue = ref(0)
const activeCount = ref(0)
const previousPosition = ref(null)
const queueMovement = ref(0)

const statisticsInterval = ref(null)

const statusPollInterval = ref(null)
const statisticsPollInterval = ref(null)

const statistics = ref({
  waiting_room: {
    max_capacity: 100,  
    concurrent_purchase_limit: 1,
    queue_timeout_minutes: 15
  },
  current: {
    waiting_count: 0,
    active_count: 0,
    available_slots: 0
  },
  statistics: {}
})

const queueStatus = computed(() => queueStore.currentQueue)

const isWaiting = computed(() => {
  return queueStatus.value?.status === 'waiting'
})

const isActive = computed(() => {
  return queueStatus.value?.status === 'active'
})

const isExpired = computed(() => {
  return queueStatus.value?.status === 'expired'
})

const peopleAhead = computed(() => {
  const myPosition = queueStatus.value?.position || 0
  const active = statistics.value?. current?.active_count || 0
  
  return active + Math.max(0, myPosition - 1)
})

const positionText = computed(() => {
  if (!queueStatus.value) return 'Connecting...'
  
  const position = queueStatus.value.position
  if (position === 0) {
    return "You're next!"
  }
  if (position === 1) {
    return '1 person ahead'
  }
  return `${position} people ahead`
})

const estimatedWait = computed(() => {
  if (!queueStatus.value || !queueStatus.value.position) return ''
  
  const timeoutMin = statistics.value?.waiting_room?.queue_timeout_minutes || 15
  const concurrentLimit = statistics.value?.waiting_room?.concurrent_purchase_limit || 1
  const ahead = peopleAhead.value
  
  // Estimate 1 minute per person
  const minutes = Math.ceil((ahead / concurrentLimit) * timeoutMin)
  if (minutes < 1) return 'Less than a minute'
  if (minutes === 1) return '1 minute'
  return `${minutes} minutes`
})

const progressPercent = computed(() => {
  const maxCap = statistics.value?.waiting_room?.max_capacity || 100
  const waiting = statistics.value?.current?.waiting_count || 0
  const active = statistics.value?.current?.active_count || 0
  const total = waiting + active
  
  const percent = Math.round((total / maxCap) * 100)
  return Math.min(100, Math.max(0, percent))
})

const estimatedWaitMinutes = computed(() => {
  const timeoutMin = statistics.value?.waiting_room?.queue_timeout_minutes || 15
  const concurrentLimit = statistics.value?.waiting_room?.concurrent_purchase_limit || 1
  const ahead = peopleAhead.value
  
  return Math.ceil((ahead / concurrentLimit) * timeoutMin)
})

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const startHeartbeat = () => {
  heartbeatInterval.value = setInterval(async () => {
    try {
      await queueStore.sendHeartbeat(props.sessionId)
    } catch (error) {
      console.error('Heartbeat error:', error)
    }
  }, 30000) 
}

const startCountdown = () => {
  if (countdownInterval.value) {
    clearInterval(countdownInterval.value)
  }

  if (queueStatus.value?.active_until) {
    const activeUntil = new Date(queueStatus.value.active_until)
    
    countdownInterval.value = setInterval(() => {
      const now = new Date()
      const diff = Math.floor((activeUntil - now) / 1000)
      
      if (diff <= 0) {
        remainingTime.value = 0
        clearInterval(countdownInterval.value)
        emit('expired')
      } else {
        remainingTime.value = diff
      }
    }, 1000)
  }
}

const handleLeave = async () => {
  try {
    await queueStore.leaveQueue(props.sessionId)
    emit('error', 'You left the queue')
  } catch (error) {
    emit('error', error.message)
  }
}

const handleProceed = () => {
  emit('ready')
}

const pollStatus = async () => {
  try {
    const response = await queueAPI.getStatus(props.sessionId)
    const data = response.data. data || response.data
    
    console.log('🔄 Poll status:', data.status, 'Position:', data.queue_position)
    
    
    if (data.expires_at) {
      const oldExpires = queueStore.expiresAt
      queueStore.expiresAt = data.expires_at
      
      if (oldExpires !== data.expires_at) {
        console.log('✅ Updated expires_at:', {
          old: oldExpires,
          new: data.expires_at
        })
      }
    }

    // Update store
    if (data.status) {
      queueStore.updateStatus(data.status)
    }
    
    if (data.queue_position !== undefined || data.queue_number) {
      queueStore.updatePosition({
        queue_number: data.queue_number || data.queue_position,
        estimated_wait_minutes: data.estimated_wait_minutes,
        status: data.status
      })
    }
    
    // ✅ CHECK: Nếu status = 'active' và hiện đang waiting → Emit ready! 
    if ((data.status === 'active' || data.can_purchase) && isWaiting.value) {
      console.log('✅✅✅ STATUS CHANGED TO ACTIVE!  Emitting ready.. .', {
        expires_at: data.expires_at,
        can_purchase: data.can_purchase
      })

      // Start countdown
      if (data.expires_at) {
        const expiresAt = new Date(data.expires_at)
        const now = new Date()

        if (now >= expiresAt) {
          console.error('❌ Activated but already expired!')
          emit('expired')
          return
        }
        
        countdownInterval.value = setInterval(() => {
          const now = new Date()
          const diff = Math.floor((expiresAt - now) / 1000)
          
          if (diff <= 0) {
            remainingTime.value = 0
            clearInterval(countdownInterval.value)
            emit('expired')
          } else {
            remainingTime.value = diff
          }
        }, 1000)
      }
      
      emit('ready')
    }
    
  } catch (error) {
    console.error('Poll status error:', error)
  }
}

const pollStatistics = async () => {
  try {
    const response = await queueAPI.getStatistics(props.sessionId)
    const data = response.data.data || response.data
    
    totalInQueue.value = data.current?.waiting_count || 0
    activeCount.value = data.current?.active_count || 0
    
    // Track movement
    const current = queueStatus.value?.position
    if (previousPosition.value && current < previousPosition.value) {
      queueMovement.value = previousPosition.value - current
      setTimeout(() => { queueMovement.value = 0 }, 5000)
    }
    previousPosition.value = current
  } catch (error) {
    console.error('Poll stats error:', error)
  }
}

onMounted(async () => {
  try {
    // await queueStore.joinQueue(props.sessionId)
    // const response = await queueAPI.joinQueue({ session_id: props.sessionId })
    const response = await queueAPI.getStatus(props.sessionId)
    const data = response.data.data || response.data

    console.log('🔍 WaitingRoom mounted, status:', data)
    // Update store với data từ API
    // queueStore.joinQueue(data)

    if (data.expires_at) {
      queueStore.expiresAt = data.expires_at
      console.log('✅ Set expires_at from server:', data.expires_at)
    }

    if (data.status) {
      queueStore.updateStatus(data.status)
    }
    if (data.queue_position !== undefined || data.queue_number) {
      queueStore.updatePosition({
        queue_number: data.queue_number || data.queue_position,
        estimated_wait_minutes: data.estimated_wait_minutes,
        status: data.status
      })
    }
    if (data.expires_at) {
      queueStore.expiresAt = data.expires_at
    }

    startHeartbeat()
    
    if (data.status === 'active' || data.can_purchase) {
      console. log('✅ User already active')

      if (data.expires_at) {
        const expiresAt = new Date(data.expires_at)
        const now = new Date()
        
        if (now >= expiresAt) {
          console. error('❌ Already expired on mount!')
          emit('error', 'Your purchase time has expired.  Please join the queue again.')
          return
        }
      }

      startCountdown()
      emit('ready')
    } else {
      console.log(`⏳ User waiting, position: ${data.queue_position}`)
    }

    await pollStatistics()

    pollStatus()  // Call immediately
    statusPollInterval.value = setInterval(pollStatus, 2000)
    
    statisticsPollInterval.value = setInterval(pollStatistics, 3000)
  } catch (error) {
    emit('error', error.message)
  }
})

onBeforeUnmount(() => {
  if (heartbeatInterval.value) {
    clearInterval(heartbeatInterval.value)
  }
  if (countdownInterval.value) {
    clearInterval(countdownInterval.value)
  }
  if (statusPollInterval. value) {
    clearInterval(statusPollInterval.value)
  }
  if (statisticsPollInterval.value) {  
    clearInterval(statisticsPollInterval.value)
  }

  const currentStatus = queueStore.status || queueStatus.value?. status
  
  if (currentStatus === 'waiting') {
    try {
      queueAPI.leaveQueue(props.sessionId)
      console.log('✅ Left queue on unmount (was waiting)')
    } catch (error) {
      console.error('Failed to leave queue:', error)
    }
  } else {
    console.log(`ℹ️ Not leaving queue - status: ${currentStatus}`)
  }
})
</script>

<template>
  <div class="max-w-2xl mx-auto">
    <!-- Waiting Status -->
    <div v-if="isWaiting" class="card text-center">
      <div class="mb-6">
        <Spinner size="xl" class="mx-auto mb-4" />
        <h2 class="text-2xl font-bold mb-2">You're in the waiting room</h2>
        <p class="text-gray-600">
          Please wait while we prepare your ticket purchase
        </p>
      </div>

      <div class="grid grid-cols-2 gap-4 mb-6">
        <div class="bg-gray-50 rounded-lg p-4">
          <div class="flex items-center justify-center mb-2">
            <UsersIcon class="w-6 h-6 text-gray-400" />
          </div>
          <p class="text-2xl font-bold text-primary-600">
            {{ queueStatus?.position || '-' }}
          </p>
          <p class="text-sm text-gray-600">Position in queue</p>
        </div>

        <div class="bg-gray-50 rounded-lg p-4">
          <div class="flex items-center justify-center mb-2">
            <ClockIcon class="w-6 h-6 text-gray-400" />
          </div>
          <p class="text-2xl font-bold text-primary-600">
            {{ estimatedWait }}
          </p>
          <p class="text-sm text-gray-600">Estimated wait</p>
        </div>
      </div>

      <!-- Queue Progress Tracker -->
      <div class="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <h3 class="text-lg font-semibold mb-4 flex items-center">
          <ClockIcon class="w-5 h-5 mr-2 text-primary-600" />
          Queue Progress
        </h3>
        
        <!-- Progress Bar -->
        <div class="mb-4">
          <div class="flex justify-between text-sm mb-2">
            <span class="font-medium">Position in queue: {{ queueStatus?.position || '-' }}</span>
            <span class="text-primary-600 font-semibold">{{ progressPercent }}%</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-4">
            <div 
              class="h-full rounded-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
              :style="{ width: progressPercent + '%' }"
            ></div>
          </div>
        </div>
        
        <!-- Stats Grid -->
        <div class="grid grid-cols-3 gap-4 text-center">
          <div class="bg-blue-50 rounded-lg p-3">
            <p class="text-2xl font-bold text-blue-700">{{ totalInQueue}}</p>
            <p class="text-xs text-blue-600">Waiting</p>
          </div>
          <div class="bg-orange-50 rounded-lg p-3">
            <p class="text-2xl font-bold text-orange-700">{{ estimatedWaitMinutes }}m</p>
            <p class="text-xs text-orange-600">Est. Wait</p>
          </div>
          <div class="bg-green-50 rounded-lg p-3">
            <p class="text-2xl font-bold text-green-700">{{ activeCount }}</p>
            <p class="text-xs text-green-600">Active</p>
          </div>
        </div>
        
        <!-- Movement Indicator -->
        <div v-if="queueMovement > 0" class="mt-4 bg-green-50 border border-green-200 rounded p-2 text-center">
          <p class="text-sm text-green-800">
            Moved up {{ queueMovement }} position{{ queueMovement > 1 ? 's' : '' }}! 
          </p>
        </div>

        <div class="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p class="text-xs text-gray-600 mb-2 font-medium">Queue Details:</p>
          <div class="grid grid-cols-2 gap-2 text-xs">
            <div class="flex justify-between">
              <span class="text-gray-600">Your position:</span>
              <span class="font-bold">#{{ queueStatus?.position || '-' }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">People ahead:</span>
              <span class="font-bold">{{ peopleAhead }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Total waiting:</span>
              <span class="font-bold">{{ totalInQueue }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Active now:</span>
              <span class="font-bold">{{ activeCount }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Max capacity:</span>
              <span class="font-bold">{{ statistics.waiting_room?.max_capacity || '-' }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Concurrent limit:</span>
              <span class="font-bold">{{ statistics.waiting_room?.concurrent_purchase_limit || '-' }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <p class="text-sm text-blue-800">
          <strong>{{ positionText }}</strong>
        </p>
        <p class="text-xs text-blue-600 mt-1">
          Do not close or refresh this page
        </p>
      </div>

      <Button variant="secondary" @click="handleLeave">
        Leave Queue
      </Button>
    </div>

    <!-- Active Status - Can Purchase -->
    <div v-else-if="isActive" class="card text-center">
      <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCircleIcon class="w-10 h-10 text-green-600" />
      </div>

      <h2 class="text-2xl font-bold mb-2">It's your turn!</h2>
      <p class="text-gray-600 mb-6">
        You can now select and purchase your tickets
      </p>

      <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <p class="text-yellow-800 font-medium mb-2">
          Time remaining: {{ formatTime(remainingTime) }}
        </p>
        <p class="text-sm text-yellow-700">
          Complete your purchase within 15 minutes or your slot will expire
        </p>
      </div>

      <Button variant="primary" size="lg" @click="handleProceed" full-width>
        Select Tickets
      </Button>
    </div>

    <!-- Expired Status -->
    <div v-else-if="isExpired" class="card text-center">
      <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <XCircleIcon class="w-10 h-10 text-red-600" />
      </div>

      <h2 class="text-2xl font-bold mb-2">Session Expired</h2>
      <p class="text-gray-600 mb-6">
        Your purchase window has expired. Please join the queue again.
      </p>

      <Button variant="primary" @click="$router.go(0)">
        Rejoin Queue
      </Button>
    </div>

    <!-- Loading -->
    <div v-else class="card text-center">
      <Spinner size="xl" class="mx-auto mb-4" />
      <p class="text-gray-600">Connecting to queue...</p>
    </div>
  </div>
</template>