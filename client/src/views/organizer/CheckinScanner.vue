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

// ✅ NEW: Verification state (2-step process)
const verificationStep = ref('scan') // 'scan' | 'verify' | 'result'
const ticketToVerify = ref(null)
const verifying = ref(false)

// Result state
const lastResult = ref(null)
const resultType = ref(null)
const resultMessage = ref('')
const showResult = ref(false)

const loadEvent = async () => {
  loading.value = true
  try {
    const response = await eventsAPI.getEventById(eventId.value)
    event.value = response.data?. data?. event || response.data?. event
  } catch (error) {
    console.error('Failed to load event:', error)
    router.push('/organizer/events')
  } finally {
    loading.value = false
  }
}

// ✅ STEP 1: Verify ticket (not check-in yet)
const handleScan = async (ticketCode) => {
  if (scanning.value || !ticketCode) return
  
  scanning. value = true
  
  try {
    // ✅ Call VERIFY endpoint (not check-in)
    const response = await checkinAPI.verifyTicket(ticketCode)
    
    ticketToVerify.value = response.data?. data?.ticket || response.data?.ticket
    verificationStep.value = 'verify' // ✅ Show verification page
    
  } catch (error) {
    console.error('Verify error:', error)
    
    resultType.value = 'error'
    resultMessage.value = error.response?.data?.message || 'Ticket verification failed'
    lastResult.value = null
    verificationStep.value = 'result'
    
    playFeedback('error')
    
    // Auto reset after 5 seconds
    setTimeout(() => {
      resetScanner()
    }, 5000)
  } finally {
    scanning.value = false
    manualCode.value = ''
  }
}

// ✅ STEP 2: Confirm check-in
const confirmCheckin = async () => {
  if (!ticketToVerify. value) return
  
  verifying.value = true
  
  try {
    const response = await checkinAPI.checkIn(ticketToVerify. value. ticket_code)
    
    // Success
    lastResult.value = response.data?. data?. ticket || response.data?.ticket
    resultType.value = 'success'
    resultMessage.value = 'Check-in successful!'
    verificationStep.value = 'result'
    
    playFeedback('success')
    
    // Auto reset after 3 seconds
    setTimeout(() => {
      resetScanner()
    }, 3000)
    
  } catch (error) {
    console.error('Check-in error:', error)
    
    const errorMsg = error.response?.data?.message || 'Check-in failed'
    
    if (errorMsg.includes('already checked in')) {
      resultType.value = 'duplicate'
      resultMessage.value = 'Already checked in!'
      lastResult.value = error.response?.data?.data
    } else {
      resultType. value = 'error'
      resultMessage.value = errorMsg
      lastResult.value = null
    }
    
    verificationStep.value = 'result'
    playFeedback('error')
    
    setTimeout(() => {
      resetScanner()
    }, 5000)
  } finally {
    verifying.value = false
  }
}

// ✅ Cancel verification
const cancelVerification = () => {
  resetScanner()
}

// ✅ Reset to scan mode
const resetScanner = () => {
  verificationStep.value = 'scan'
  ticketToVerify.value = null
  lastResult.value = null
  resultType.value = null
  resultMessage.value = ''
  manualCode.value = ''
}

const handleManualSubmit = () => {
  if (!manualCode. value.trim()) return
  handleScan(manualCode.value. trim())
}

const playFeedback = (type) => {
  try {
    if ('vibrate' in navigator) {
      if (type === 'success') {
        navigator.vibrate(200)
      } else {
        navigator.vibrate([100, 50, 100])
      }
    }
  } catch (e) {
    // Ignore
  }
}

const toggleMode = () => {
  showScanner.value = !showScanner.value
}

const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleString('vi-VN')
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
            v-if="verificationStep === 'scan'"
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
      
      <!-- ✅ STEP 1: SCAN MODE -->
      <div v-if="verificationStep === 'scan'">
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

            <div class="relative">
              <QRScanner 
                @scan="handleScan"
                :disabled="scanning"
                class="rounded-lg overflow-hidden"
              />
              
              <div v-if="scanning" class="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                <div class="text-white text-center">
                  <div class="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mx-auto mb-2"></div>
                  <p>Verifying ticket...</p>
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
                Verify Ticket
              </Button>
            </form>
          </div>
        </Card>

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

      <!-- ✅ STEP 2: VERIFICATION PAGE (NEW!) -->
      <div v-else-if="verificationStep === 'verify' && ticketToVerify">
        <Card class="border-2 border-blue-500">
          <div class="text-center space-y-6">
            <div class="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircleIcon class="w-12 h-12 text-blue-600" />
            </div>
            
            <div>
              <h2 class="text-2xl font-bold text-gray-900 mb-2">Verify Ticket</h2>
              <p class="text-gray-600">Please confirm the ticket details before check-in</p>
            </div>

            <!-- Ticket Details -->
            <div class="bg-gray-50 rounded-lg p-6 text-left space-y-3">
              <div class="flex justify-between">
                <span class="text-gray-600">Ticket Code:</span>
                <span class="font-mono font-bold text-gray-900">{{ ticketToVerify.ticket_code }}</span>
              </div>
              
              <div class="flex justify-between">
                <span class="text-gray-600">Holder Name:</span>
                <span class="font-semibold text-gray-900">{{ ticketToVerify.holder_name || 'N/A' }}</span>
              </div>
              
              <div class="flex justify-between">
                <span class="text-gray-600">Email:</span>
                <span class="text-gray-900">{{ ticketToVerify.holder_email || 'N/A' }}</span>
              </div>
              
              <div class="flex justify-between">
                <span class="text-gray-600">Ticket Type:</span>
                <span class="font-semibold text-gray-900">{{ ticketToVerify.ticket_type_name }}</span>
              </div>
              
              <div v-if="ticketToVerify.session_title" class="flex justify-between">
                <span class="text-gray-600">Session:</span>
                <span class="text-gray-900">{{ ticketToVerify.session_title }}</span>
              </div>
              
              <div v-if="ticketToVerify.session_start_time" class="flex justify-between">
                <span class="text-gray-600">Session Time:</span>
                <span class="text-gray-900">{{ formatDate(ticketToVerify.session_start_time) }}</span>
              </div>
              
              <div class="flex justify-between pt-3 border-t">
                <span class="text-gray-600">Order Status:</span>
                <span :class="[
                  'font-semibold',
                  ticketToVerify.order_status === 'paid' ? 'text-green-600' : 'text-orange-600'
                ]">
                  {{ ticketToVerify.order_status?. toUpperCase() }}
                </span>
              </div>
              
              <div class="flex justify-between">
                <span class="text-gray-600">Check-in Status:</span>
                <span :class="[
                  'font-semibold',
                  ticketToVerify.is_checked_in ? 'text-orange-600' : 'text-green-600'
                ]">
                  {{ ticketToVerify.is_checked_in ?  'Already Checked In' : 'Not Checked In' }}
                </span>
              </div>
              
              <div v-if="ticketToVerify.is_checked_in && ticketToVerify.checked_in_at" class="flex justify-between">
                <span class="text-gray-600">Checked In At:</span>
                <span class="text-gray-900">{{ formatDate(ticketToVerify.checked_in_at) }}</span>
              </div>
            </div>

            <!-- Validation Issues -->
            <div v-if="ticketToVerify.validation_issues?. length > 0" class="bg-red-50 border border-red-200 rounded-lg p-4">
              <p class="font-semibold text-red-900 mb-2">⚠️ Validation Issues:</p>
              <ul class="list-disc list-inside text-sm text-red-800 space-y-1">
                <li v-for="issue in ticketToVerify.validation_issues" :key="issue">
                  {{ issue }}
                </li>
              </ul>
            </div>

            <!-- Action Buttons -->
            <div class="flex space-x-3">
              <Button
                variant="secondary"
                size="lg"
                @click="cancelVerification"
                full-width
              >
                Cancel
              </Button>
              
              <Button
                variant="primary"
                size="lg"
                @click="confirmCheckin"
                :loading="verifying"
                :disabled="ticketToVerify.is_checked_in || ticketToVerify.order_status !== 'paid'"
                full-width
              >
                ✓ Confirm Check-in
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <!-- ✅ STEP 3: RESULT -->
      <div v-else-if="verificationStep === 'result'">
        <Card 
          :class="[
            'border-2',
            resultType === 'success' ? 'border-green-500 bg-green-50' :
            resultType === 'duplicate' ?  'border-orange-500 bg-orange-50' :
            'border-red-500 bg-red-50'
          ]"
        >
          <div class="text-center space-y-4">
            <div :class="[
              'w-20 h-20 rounded-full flex items-center justify-center mx-auto',
              resultType === 'success' ? 'bg-green-500' :
              resultType === 'duplicate' ? 'bg-orange-500' :
              'bg-red-500'
            ]">
              <CheckCircleIcon v-if="resultType === 'success'" class="w-12 h-12 text-white" />
              <ClockIcon v-else-if="resultType === 'duplicate'" class="w-12 h-12 text-white" />
              <XCircleIcon v-else class="w-12 h-12 text-white" />
            </div>
            
            <h3 :class="[
              'text-2xl font-bold',
              resultType === 'success' ?  'text-green-900' :
              resultType === 'duplicate' ? 'text-orange-900' :
              'text-red-900'
            ]">
              {{ resultMessage }}
            </h3>
            
            <div v-if="lastResult" class="bg-white rounded-lg p-4 text-left space-y-2">
              <p><strong>Ticket:</strong> {{ lastResult.ticket_code }}</p>
              <p v-if="lastResult.holder_name">
                <strong>Name:</strong> {{ lastResult.holder_name }}
              </p>
              <p v-if="lastResult.ticket_type_name">
                <strong>Type:</strong> {{ lastResult.ticket_type_name }}
              </p>
              <p v-if="lastResult. checked_in_at">
                <strong>Time:</strong> {{ formatDate(lastResult.checked_in_at) }}
              </p>
            </div>

            <Button
              variant="primary"
              size="lg"
              @click="resetScanner"
              full-width
            >
              Scan Next Ticket
            </Button>
          </div>
        </Card>
      </div>

    </div>
  </div>
</template>

<style scoped>
.transition {
  transition: all 0.3s ease;
}
</style>