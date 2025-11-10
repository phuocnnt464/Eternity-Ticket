<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useQueueStore } from '@/stores/queue'
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
  
  // Estimate 1 minute per person
  const minutes = queueStatus.value.position
  if (minutes < 1) return 'Less than a minute'
  if (minutes === 1) return '1 minute'
  return `${minutes} minutes`
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
  }, 30000) // Every 30 seconds
}

const startCountdown = () => {
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

onMounted(async () => {
  try {
    await queueStore.joinQueue(props.sessionId)
    startHeartbeat()
    
    if (isActive.value) {
      startCountdown()
      emit('ready')
    }
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