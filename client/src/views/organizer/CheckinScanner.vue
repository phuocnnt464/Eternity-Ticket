<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { checkinAPI } from '@/api/checkin.js'
import { eventsAPI } from '@/api/events.js'
import Card from '@/components/common/Card.vue'
import Button from '@/components/common/Button.vue'
import Input from '@/components/common/Input.vue'
import QRScanner from '@/components/common/QRScanner.vue'
import {
  ArrowLeftIcon,
  QrCodeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon
} from '@heroicons/vue/24/outline'

const route = useRoute()
const router = useRouter()

const eventId = ref(route.params.id)
const event = ref(null)
const loading = ref(true)

// Scanner state
const showScanner = ref(true)
const manualCode = ref('')
const scanning = ref(false)

// Result state
const lastResult = ref(null)
const resultType = ref(null) // 'success' | 'error' | 'duplicate'
const resultMessage = ref('')
const showResult = ref(false)

// Load event info
const loadEvent = async () => {
  loading.value = true
  try {
    const response = await eventsAPI.getEventById(eventId.value)
    event.value = response.data.data?.event || response.data.event
  } catch (error) {
    console.error('Failed to load event:', error)
    alert('Failed to load event')
    router.push('/organizer/events')
  } finally {
    loading.value = false
  }
}

// Handle QR scan
const handleScan = async (ticketCode) => {
  if (scanning.value || !ticketCode) return
  
  scanning.value = true
  showResult.value = false
  
  try {
    const response = await checkinAPI.checkIn(ticketCode)
    
    // Success
    lastResult.value = response.data.data || response.data
    resultType.value = 'success'
    resultMessage.value = 'Check-in successful!'
    showResult.value = true
    
    // Play success sound
    playFeedback('success')
    
    // Auto hide after 3 seconds
    setTimeout(() => {
      showResult.value = false
      lastResult.value = null
    }, 3000)
    
  } catch (error) {
    console.error('Check-in error:', error)
    
    const errorMsg = error.response?.data?.message || 'Check-in failed'
    
    // Check if duplicate
    if (errorMsg.includes('already checked in') || errorMsg.includes('đã check-in')) {
      resultType.value = 'duplicate'
      resultMessage.value = 'Already checked in!'
      lastResult.value = error.response?.data?.data
    } else {
      resultType.value = 'error'
      resultMessage.value = errorMsg
      lastResult.value = null
    }
    
    showResult.value = true
    playFeedback('error')
    
    // Auto hide after 5 seconds for errors
    setTimeout(() => {
      showResult.value = false
      lastResult.value = null
    }, 5000)
  } finally {
    scanning.value = false
    manualCode.value = ''
  }
}

// Handle manual input
const handleManualSubmit = () => {
  if (!manualCode.value.trim()) return
  handleScan(manualCode.value.trim())
}

// Play vibration feedback 
const playFeedback = (type) => {
  try {
    if ('vibrate' in navigator) {
      if (type === 'success') {
        navigator.vibrate(200) // Short vibration for success
      } else {
        navigator.vibrate([100, 50, 100]) // Pattern for error
      }
    }
  } catch (e) {
    // Ignore if not supported
  }
}

// Toggle scanner/manual mode
const toggleMode = () => {
  showScanner.value = !showScanner.value
}

onMounted(() => {
  loadEvent()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-white shadow-sm sticky top-0 z-10">
      <div class="max-w-4xl mx-auto px-4 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <button
              @click="router.push(`/organizer/events/${eventId}/checkin`)"
              class="p-2 hover:bg-gray-100 rounded-full transition"
            >
              <ArrowLeftIcon class="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 class="text-lg font-bold text-gray-900">Check-in Scanner</h1>
              <p v-if="event" class="text-sm text-gray-600">{{ event.title }}</p>
            </div>
          </div>
          
          <Button 
            variant="secondary" 
            size="sm"
            @click="toggleMode"
          >
            {{ showScanner ? 'Manual Input' : 'QR Scanner' }}
          </Button>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-4xl mx-auto px-4 py-6 space-y-4">
      <!-- Result Display -->
      <Transition
        enter-active-class="transition ease-out duration-300"
        enter-from-class="transform opacity-0 scale-95"
        enter-to-class="transform opacity-100 scale-100"
        leave-active-class="transition ease-in duration-200"
        leave-from-class="transform opacity-100 scale-100"
        leave-to-class="transform opacity-0 scale-95"
      >
        <Card 
          v-if="showResult" 
          :class="[
            'border-2',
            resultType === 'success' ? 'border-green-500 bg-green-50' :
            resultType === 'duplicate' ? 'border-orange-500 bg-orange-50' :
            'border-red-500 bg-red-50'
          ]"
        >
          <div class="flex items-start space-x-4">
            <div :class="[
              'w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0',
              resultType === 'success' ? 'bg-green-500' :
              resultType === 'duplicate' ? 'bg-orange-500' :
              'bg-red-500'
            ]">
              <CheckCircleIcon v-if="resultType === 'success'" class="w-7 h-7 text-white" />
              <ClockIcon v-else-if="resultType === 'duplicate'" class="w-7 h-7 text-white" />
              <XCircleIcon v-else class="w-7 h-7 text-white" />
            </div>
            
            <div class="flex-1">
              <h3 :class="[
                'text-xl font-bold mb-1',
                resultType === 'success' ? 'text-green-900' :
                resultType === 'duplicate' ? 'text-orange-900' :
                'text-red-900'
              ]">
                {{ resultMessage }}
              </h3>
              
              <div v-if="lastResult" class="space-y-1 text-sm">
                <p><strong>Ticket:</strong> {{ lastResult.ticket_code }}</p>
                <p v-if="lastResult.attendee_name">
                  <strong>Name:</strong> {{ lastResult.attendee_name }}
                </p>
                <p v-if="lastResult.ticket_type_name">
                  <strong>Type:</strong> {{ lastResult.ticket_type_name }}
                </p>
                <p v-if="lastResult.checked_in_at">
                  <strong>Time:</strong> {{ new Date(lastResult.checked_in_at).toLocaleString() }}
                </p>
                <p v-if="lastResult.checked_in_by">
                  <strong>By:</strong> {{ lastResult.checked_in_by }}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </Transition>

      <!-- QR Scanner Mode -->
      <Card v-if="showScanner">
        <div class="text-center space-y-4">
          <div class="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto">
            <QrCodeIcon class="w-8 h-8 text-primary-600" />
          </div>
          
          <div>
            <h2 class="text-xl font-semibold mb-2">Scan QR Code</h2>
            <p class="text-gray-600 text-sm">
              Point camera at ticket QR code
            </p>
          </div>

          <!-- QR Scanner Component -->
          <div class="relative">
            <QRScanner 
              @scan="handleScan"
              :disabled="scanning"
              class="rounded-lg overflow-hidden"
            />
            
            <div v-if="scanning" class="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
              <div class="text-white text-center">
                <div class="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mx-auto mb-2"></div>
                <p>Processing...</p>
              </div>
            </div>
          </div>

          <p class="text-xs text-gray-500">
            Camera not working? Try manual input mode
          </p>
        </div>
      </Card>

      <!-- Manual Input Mode -->
      <Card v-else>
        <div class="text-center space-y-4">
          <div class="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto">
            <QrCodeIcon class="w-8 h-8 text-primary-600" />
          </div>
          
          <div>
            <h2 class="text-xl font-semibold mb-2">Enter Ticket Code</h2>
            <p class="text-gray-600 text-sm">
              Type or paste the ticket code manually
            </p>
          </div>

          <form @submit.prevent="handleManualSubmit" class="space-y-4 max-w-md mx-auto">
            <Input
              v-model="manualCode"
              placeholder="Enter ticket code"
              class="text-center text-lg font-mono"
              :disabled="scanning"
              :autofocus="!showScanner" 
            />
            
            <Button
              type="submit"
              variant="primary"
              size="lg"
              :loading="scanning"
              :disabled="!manualCode.trim()"
              full-width
            >
              Check In
            </Button>
          </form>

          <p class="text-xs text-gray-500">
            Press Enter to submit
          </p>
        </div>
      </Card>

      <!-- Quick Stats -->
      <div class="grid grid-cols-3 gap-4">
        <Card class="text-center">
          <div class="text-2xl font-bold text-green-600">
            {{ resultType === 'success' ? '✓' : '-' }}
          </div>
          <div class="text-xs text-gray-600 mt-1">Success</div>
        </Card>
        
        <Card class="text-center">
          <div class="text-2xl font-bold text-orange-600">
            {{ resultType === 'duplicate' ? '!' : '-' }}
          </div>
          <div class="text-xs text-gray-600 mt-1">Duplicate</div>
        </Card>
        
        <Card class="text-center">
          <div class="text-2xl font-bold text-red-600">
            {{ resultType === 'error' ? '✗' : '-' }}
          </div>
          <div class="text-xs text-gray-600 mt-1">Failed</div>
        </Card>
      </div>

      <!-- Instructions -->
      <Card class="bg-blue-50 border-blue-200">
        <div class="text-sm text-blue-900 space-y-2">
          <p class="font-semibold">Quick Tips:</p>
          <ul class="list-disc list-inside space-y-1 text-blue-800">
            <li>Hold phone steady when scanning</li>
            <li>Ensure good lighting conditions</li>
            <li>Each ticket can only be checked in once</li>
            <li>Use manual input if camera fails</li>
          </ul>
        </div>
      </Card>
    </div>
  </div>
</template>

<style scoped>
/* Smooth transitions */
.transition {
  transition: all 0.3s ease;
}
</style>