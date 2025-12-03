<!-- client/src/views/organizer/CheckinPage.vue -->
<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useEventPermissions } from '@/composables/useEventPermissions.js'
import { eventsAPI } from '@/api/events.js'
import { checkinAPI } from '@/api/checkin.js'
import Card from '@/components/common/Card.vue'
import Button from '@/components/common/Button.vue'
import Input from '@/components/common/Input.vue'
import Badge from '@/components/common/Badge.vue'
import Spinner from '@/components/common/Spinner.vue'
import Modal from '@/components/common/Modal.vue'
import QRScanner from '@/components/common/QRScanner.vue'
import {
  ArrowLeftIcon,
  QrCodeIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserIcon,
  ArrowUturnLeftIcon,  
  ClockIcon,
  TicketIcon
} from '@heroicons/vue/24/outline'
import { toast } from 'vue3-toastify'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const eventId = ref(route.params.id)
const event = ref(null)
const scanMode = ref(true)
const manualCode = ref('')
const searchLoading = ref(false)
const checkingIn = ref(false)
const undoingCheckin = ref(false)

const { 
  eventRole, 
  canUndoCheckin, 
  fetchEventRole 
} = useEventPermissions(eventId)


const showTicketDetailModal = ref(false)
const selectedTicket = ref(null)

const stats = ref({
  total_tickets: 0,
  checked_in_tickets: 0,
  pending_checkin: 0
})

const recentCheckIns = ref([])
const ticketResult = ref(null)
const errorMessage = ref('')

const checkinPercentage = computed(() => {
  if (! stats.value.total_tickets) return 0
  return ((stats.value.checked_in_tickets / stats.value.total_tickets) * 100).toFixed(1)
})

const fetchEventData = async () => {
  loading.value = true
  try {
    const [eventRes, statsRes, checkinsRes] = await Promise.all([
      eventsAPI.getEventById(eventId.value),
      checkinAPI.getCheckInStats(eventId.value),
      checkinAPI.getRecentCheckins(eventId.value, { limit: 20 })  
    ])
    
    event.value = eventRes.data.event
    stats.value = statsRes.data.stats
    recentCheckIns.value = checkinsRes.data.checkins || []
    
    console.log('Checkin page data loaded:', {
      eventTitle: event.value?. title,
      stats: stats.value,
      recentCount: recentCheckIns.value.length,
      userRole: eventRole.value,
      canUndo: canUndoCheckin.value
    })
  } catch (error) {
    console.error('Failed to fetch event data:', error)
    event.value = null
    stats.value = { total_tickets: 0, checked_in_tickets: 0, pending_checkin: 0 }
    recentCheckIns.value = []
  } finally {
    loading.value = false
  }
}

const handleQRScan = async (ticketCode) => {
  await handleCheckIn(ticketCode)
}

const handleManualCheckIn = async () => {
  if (! manualCode.value.trim()) {
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
    
    toast.success('Check-in successful! ', {
      position: 'top-right',
      autoClose: 3000
    })
    
    // Refresh stats and recent check-ins
    await fetchEventData()
    
    // Auto-clear result after 5 seconds
    setTimeout(() => {
      ticketResult.value = null
    }, 5000)
  } catch (error) {
    errorMessage.value = error.response?.data?.error?.message || 'Invalid ticket or already checked in'
    ticketResult.value = null
    
    toast.error(errorMessage.value, {
      position: 'top-right',
      autoClose: 5000
    })
  } finally {
    checkingIn.value = false
  }
}


const viewTicketDetails = (checkin) => {
  selectedTicket.value = checkin
  showTicketDetailModal.value = true
}

const handleUndoCheckin = async (ticketCode) => {
  if (!canUndoCheckin.value) {
    toast.error('You do not have permission to undo check-in', {
      position: 'top-right',
      autoClose: 3000
    })
    return
  }

  if (!confirm('Are you sure you want to undo this check-in?')) return
  
  undoingCheckin.value = true
  try {
    await checkinAPI.undoCheckIn(ticketCode)
    
    toast.success('Check-in undone successfully!', {
      position: 'top-right',
      autoClose: 3000
    })
    
    // Close modal and refresh data
    showTicketDetailModal.value = false
    selectedTicket.value = null
    await fetchEventData()
  } catch (error) {
    console.error('Failed to undo check-in:', error)
    toast.error(error.response?.data?.error?. message || 'Failed to undo check-in', {
      position: 'top-right',
      autoClose: 5000
    })
  } finally {
    undoingCheckin.value = false
  }
}

const formatTime = (dateString) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleTimeString('vi-VN', { 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit'
  })
}

const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleString('vi-VN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(async () => {
  await fetchEventRole()
  await fetchEventData()
})
</script>

<template>
  <div class="space-y-6">
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
      
         <p v-if="eventRole" class="text-sm text-gray-500 mt-1">
          Your role: 
          <span class="font-semibold text-gray-700">
            {{ eventRole === 'checkin_staff' ? 'Check-in Staff' : eventRole. charAt(0).toUpperCase() + eventRole.slice(1) }}
          </span>
        </p>
      </div>

      <Button 
        variant="primary" 
        size="lg"
        @click="router.push(`/organizer/events/${eventId}/checkin/scanner`)"
      >
        <QrCodeIcon class="w-5 h-5" />
        Open Scanner
      </Button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <Spinner size="xl" />
    </div>

    <div v-else>
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
            <p class="text-4xl font-bold text-green-600">{{ stats.checked_in_tickets }}</p>
          </div>
        </Card>
        
        <Card>
          <div class="text-center">
            <p class="text-gray-600 text-sm mb-2">Remaining</p>
            <p class="text-4xl font-bold text-orange-600">{{ stats.pending_checkin }}</p>
          </div>
        </Card>
      </div>

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
        <Card>
          <h3 class="text-lg font-semibold mb-4">{{ scanMode ? 'Scan QR Code' : 'Manual Entry' }}</h3>

          <div class="flex items-center space-x-2 mb-4">
            <Button
              :variant="scanMode ? 'primary' : 'secondary'"
              @click="scanMode = true"
              size="sm"
            >
              <QrCodeIcon class="w-4 h-4" />
              Scan QR
            </Button>
            <Button
              :variant="! scanMode ? 'primary' : 'secondary'"
              @click="scanMode = false"
              size="sm"
            >
              <MagnifyingGlassIcon class="w-4 h-4" />
              Manual
            </Button>
          </div>

          <div v-if="scanMode">
            <QRScanner
              @scan="handleQRScan"
              @error="(msg) => errorMessage = msg"
            />
          </div>

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

          <div v-if="errorMessage" class="mt-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            <div class="flex items-center space-x-2">
              <XCircleIcon class="w-5 h-5 flex-shrink-0" />
              <p class="text-sm">{{ errorMessage }}</p>
            </div>
          </div>

          <div v-if="ticketResult" class="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
            <div class="flex items-center space-x-3 mb-3">
              <CheckCircleIcon class="w-8 h-8 text-green-600" />
              <div>
                <h4 class="font-semibold text-green-900">Check-in Successful!</h4>
                <p class="text-sm text-green-700">{{ ticketResult.holder_name }}</p>
              </div>
            </div>
            
            <div class="text-sm space-y-1 text-green-800">
              <p><strong>Ticket:</strong> {{ ticketResult.ticket_type_name }}</p>
              <p><strong>Code:</strong> {{ ticketResult.ticket_code }}</p>
              <p><strong>Time:</strong> {{ new Date().toLocaleTimeString() }}</p>
            </div>
          </div>
        </Card>

        <Card>
          <h3 class="text-lg font-semibold mb-4">Recent Check-ins</h3>
          
          <div v-if="recentCheckIns.length > 0" class="space-y-3 max-h-96 overflow-y-auto">
            <div
              v-for="(checkin, index) in recentCheckIns"
              :key="index"
              class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              @click="viewTicketDetails(checkin)"
            >
              <div class="flex items-center space-x-3 flex-1">
                <div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircleIcon class="w-5 h-5 text-green-600" />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="font-medium text-sm text-gray-900 truncate">
                    {{ checkin.holder_name || 'Unknown' }}
                  </p>
                  <p class="text-xs text-gray-500 font-mono">
                    {{ checkin.ticket_code }}
                  </p>
                  <p class="text-xs text-gray-600 truncate">
                    {{ checkin.ticket_type_name || 'N/A' }}
                  </p>
                  <p v-if="checkin.checked_in_by_name" class="text-xs text-gray-500 truncate mt-0.5">
                    by {{ checkin.checked_in_by_name }}
                  </p>
                </div>
              </div>
              <div class="text-right flex-shrink-0 ml-3">
                <p class="text-xs text-gray-600 whitespace-nowrap">
                  {{ formatTime(checkin.checked_in_at) }}
                </p>
                <p v-if="checkin.check_in_location" class="text-xs text-gray-500 mt-0.5">
                  {{ checkin.check_in_location }}
                </p>
              </div>
            </div>
          </div>
          
          <div v-else class="text-center py-8 text-gray-500">
            <UserIcon class="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p class="font-medium">No check-ins yet</p>
            <p class="text-sm mt-1">Start scanning tickets to see recent check-ins here</p>
          </div>
        </Card>
      </div>
    </div>

    <Modal
      v-model="showTicketDetailModal"
      title="Check-in Details"
      size="lg"
      @close="() => { showTicketDetailModal = false; selectedTicket = null }"
    >
      <div v-if="selectedTicket" class="space-y-4">
        <div class="bg-green-50 border border-green-200 rounded-lg p-4">
          <div class="flex items-center space-x-3">
            <CheckCircleIcon class="w-8 h-8 text-green-600" />
            <div>
              <h4 class="font-semibold text-green-900">Checked In</h4>
              <p class="text-sm text-green-700">{{ formatDateTime(selectedTicket.checked_in_at) }}</p>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="col-span-2 p-4 bg-gray-50 rounded-lg">
            <p class="text-sm text-gray-600 mb-1">Ticket Code</p>
            <p class="font-mono font-semibold text-gray-900">{{ selectedTicket.ticket_code }}</p>
          </div>

          <div>
            <p class="text-sm text-gray-600 mb-1">Holder Name</p>
            <p class="font-medium text-gray-900">{{ selectedTicket.holder_name }}</p>
          </div>

          <div>
            <p class="text-sm text-gray-600 mb-1">Email</p>
            <p class="text-sm text-gray-900 truncate">{{ selectedTicket.holder_email }}</p>
          </div>

          <div>
            <p class="text-sm text-gray-600 mb-1">Ticket Type</p>
            <p class="font-medium text-gray-900">{{ selectedTicket.ticket_type_name }}</p>
          </div>

          <div v-if="selectedTicket.session_title">
            <p class="text-sm text-gray-600 mb-1">Session</p>
            <p class="text-sm text-gray-900">{{ selectedTicket.session_title }}</p>
          </div>

          <div v-if="selectedTicket.checked_in_by_name">
            <p class="text-sm text-gray-600 mb-1">Checked In By</p>
            <p class="text-sm text-gray-900">{{ selectedTicket.checked_in_by_name }}</p>
          </div>

          <div v-if="selectedTicket.check_in_location">
            <p class="text-sm text-gray-600 mb-1">Location</p>
            <p class="text-sm text-gray-900">{{ selectedTicket.check_in_location }}</p>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex items-center justify-between w-full">
          <Button
            v-if="canUndoCheckin"
            variant="danger"
            @click="handleUndoCheckin(selectedTicket.ticket_code)"
            :loading="undoingCheckin"
          >
            <ArrowUturnLeftIcon class="w-4 h-4" />
            Undo Check-in
          </Button>

          <div v-else class="text-sm text-gray-500 italic">
            Only Owner and Manager can undo check-ins
          </div>

          <Button variant="secondary" @click="showTicketDetailModal = false">
            Close
          </Button>
        </div>
      </template>
    </Modal>
  </div>
</template>