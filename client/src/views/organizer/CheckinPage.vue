<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { eventsAPI } from '@/api/events.js'
import { checkinAPI } from '@/api/checkin.js'
import Card from '@/components/common/Card.vue'
import Button from '@/components/common/Button.vue'
import Input from '@/components/common/Input.vue'
import Badge from '@/components/common/Badge.vue'
import Spinner from '@/components/common/Spinner.vue'
import QRScanner from '@/components/common/QRScanner.vue'
import {
  ArrowLeftIcon,
  QrCodeIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserIcon
} from '@heroicons/vue/24/outline'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const eventId = ref(route.params.id)
const event = ref(null)
const scanMode = ref(true)
const manualCode = ref('')
const searchLoading = ref(false)
const checkingIn = ref(false)

const stats = ref({
  total_tickets: 0,
  checked_in: 0,
  remaining: 0
})

const recentCheckIns = ref([])
const ticketResult = ref(null)
const errorMessage = ref('')

const checkinPercentage = computed(() => {
  if (!stats.value.total_tickets) return 0
  return ((stats.value.checked_in / stats.value.total_tickets) * 100).toFixed(1)
})

const fetchEventData = async () => {
  loading.value = true
  try {
    const [eventRes, statsRes, checkinsRes] = await Promise.all([
      eventsAPI.getEventById(eventId.value),
      checkinAPI.getCheckInStats(eventId.value),
      checkinAPI.getRecentCheckins(eventId.value, { limit: 10 })
    ])
    
    // event.value = eventRes.data.data.event
    // stats.value = statsRes.data.data.stats
    // recentCheckIns.value = checkinsRes.data.data.checkIns || []

    // ✅ FIX: Handle different response structures with safe chaining
    event.value = eventRes.data?.event || eventRes.data?.data?.event || null
    
    // ✅ FIX: Stats with fallback
    stats.value = statsRes.data?.stats || statsRes.data?.data?.stats || {
      total_tickets: 0,
      checked_in: 0,
      remaining: 0
    }
    
    // ✅ FIX: Correct field name (checkins not checkIns)
    recentCheckIns.value = checkinsRes.data?.checkins || 
                           checkinsRes.data?.data?.checkins || 
                           []
    
    console.log('✅ Checkin page data loaded:', {
      eventTitle: event.value?.title,
      stats: stats.value,
      recentCount: recentCheckIns.value.length
    })
  } catch (error) {
    console.error('Failed to fetch event data:', error)

    event.value = null
    stats. value = { total_tickets: 0, checked_in: 0, remaining: 0 }
    recentCheckIns.value = []
  } finally {
    loading.value = false
  }
}

const handleQRScan = async (ticketCode) => {
  await handleCheckIn(ticketCode)
}

const handleManualCheckIn = async () => {
  if (!manualCode.value.trim()) {
    errorMessage.value = 'Please enter a ticket code'
    return
  }
  
  await handleCheckIn(manualCode.value.trim())
}

const handleCheckIn = async (ticketCode) => {
  errorMessage.value = ''
  ticketResult.value = null
  checkingIn.value = true

  try {
    const response = await checkinAPI.checkIn(ticketCode)
    
    ticketResult.value = response.data.ticket
    manualCode.value = ''
    
    // Refresh stats and recent check-ins
    await fetchEventData()
    
    // Auto-clear result after 5 seconds
    setTimeout(() => {
      ticketResult.value = null
    }, 5000)
  } catch (error) {
    errorMessage.value = error.response?.data?.error?.message || 'Invalid ticket or already checked in'
    ticketResult.value = null
  } finally {
    checkingIn.value = false
  }
}

const formatTime = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  })
}

onMounted(() => {
  fetchEventData()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <button
          @click="router.push('/organizer/events')"
          class="flex items-center text-gray-600 hover:text-gray-900 mb-2"
        >
          <ArrowLeftIcon class="w-5 h-5 mr-2" />
          Back to Events
        </button>
        <h1 class="text-2xl font-bold text-gray-900">Check-in Management</h1>
        <p v-if="event" class="text-gray-600 mt-1">{{ event.title }}</p>
      </div>

      <Button 
        variant="primary" 
        size="lg"
        @click="router.push(`/organizer/events/${eventId}/checkin/scanner`)"
      >
        <QrCodeIcon class="w-5 h-5" />
        Open Scanner
      </Button>

      <!-- Mode Toggle -->
      <div class="flex items-center space-x-2">
        <Button
          :variant="scanMode ? 'primary' : 'secondary'"
          @click="scanMode = true"
        >
          <QrCodeIcon class="w-5 h-5" />
          Scan QR
        </Button>
        <Button
          :variant="!scanMode ? 'primary' : 'secondary'"
          @click="scanMode = false"
        >
          <MagnifyingGlassIcon class="w-5 h-5" />
          Manual Entry
        </Button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <Spinner size="xl" />
    </div>

    <div v-else>
      <!-- Stats -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div class="text-center">
            <p class="text-gray-600 text-sm mb-2">Total Tickets</p>
            <p class="text-4xl font-bold text-gray-900">{{ stats.total_tickets }}</p>
          </div>
        </Card>
        
        <Card>
          <div class="text-center">
            <p class="text-gray-600 text-sm mb-2">Checked In</p>
            <p class="text-4xl font-bold text-green-600">{{ stats.checked_in }}</p>
          </div>
        </Card>
        
        <Card>
          <div class="text-center">
            <p class="text-gray-600 text-sm mb-2">Remaining</p>
            <p class="text-4xl font-bold text-orange-600">{{ stats.remaining }}</p>
          </div>
        </Card>
      </div>

      <!-- Progress -->
      <Card>
        <h3 class="font-semibold mb-3">Check-in Progress</h3>
        <div class="w-full bg-gray-200 rounded-full h-4 mb-2">
          <div
            :style="{ width: `${checkinPercentage}%` }"
            class="bg-gradient-to-r from-green-600 to-green-500 h-4 rounded-full transition-all duration-500"
          ></div>
        </div>
        <p class="text-sm text-gray-600 text-center">{{ checkinPercentage }}% checked in</p>
      </Card>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Check-in Section -->
        <Card>
          <h3 class="text-lg font-semibold mb-4">{{ scanMode ? 'Scan QR Code' : 'Manual Entry' }}</h3>

          <!-- QR Scanner Mode -->
          <div v-if="scanMode">
            <QRScanner
              @scan="handleQRScan"
              @error="(msg) => errorMessage = msg"
            />
          </div>

          <!-- Manual Entry Mode -->
          <div v-else>
            <form @submit.prevent="handleManualCheckIn" class="space-y-4">
              <Input
                v-model="manualCode"
                label="Ticket Code"
                placeholder="Enter ticket code"
                :icon="QrCodeIcon"
                required
                autofocus
              />
              
              <Button
                type="submit"
                variant="primary"
                :loading="checkingIn"
                full-width
                size="lg"
              >
                Check In
              </Button>
            </form>
          </div>

          <!-- Error Message -->
          <div v-if="errorMessage" class="mt-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            <div class="flex items-center space-x-2">
              <XCircleIcon class="w-5 h-5 flex-shrink-0" />
              <p class="text-sm">{{ errorMessage }}</p>
            </div>
          </div>

          <!-- Success Result -->
          <div v-if="ticketResult" class="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
            <div class="flex items-center space-x-3 mb-3">
              <CheckCircleIcon class="w-8 h-8 text-green-600" />
              <div>
                <h4 class="font-semibold text-green-900">Check-in Successful!</h4>
                <p class="text-sm text-green-700">{{ ticketResult.customer_name }}</p>
              </div>
            </div>
            
            <div class="text-sm space-y-1 text-green-800">
              <p><strong>Ticket:</strong> {{ ticketResult.ticket_type_name }}</p>
              <p><strong>Code:</strong> {{ ticketResult.ticket_code }}</p>
              <p><strong>Time:</strong> {{ new Date().toLocaleTimeString() }}</p>
            </div>
          </div>
        </Card>

        <!-- Recent Check-ins -->
        <Card>
          <h3 class="text-lg font-semibold mb-4">Recent Check-ins</h3>
          
          <div v-if="recentCheckIns.length > 0" class="space-y-3 max-h-96 overflow-y-auto">
            <div
              v-for="checkin in recentCheckIns"
              :key="checkin.checkin_id"
              class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div class="flex items-center space-x-3">
                <div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <UserIcon class="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p class="font-medium text-sm">{{ checkin.customer_name }}</p>
                  <p class="text-xs text-gray-600">{{ checkin.ticket_type_name }}</p>
                </div>
              </div>
              <div class="text-right">
                <p class="text-xs text-gray-600">{{ formatTime(checkin.checked_in_at) }}</p>
              </div>
            </div>
          </div>
          
          <div v-else class="text-center py-8 text-gray-500">
            No check-ins yet
          </div>
        </Card>
      </div>
    </div>
  </div>
</template>