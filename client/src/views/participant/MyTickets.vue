<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { usersAPI } from '@/api/users.js'
import TicketCard from '@/components/features/TicketCard.vue'
import Pagination from '@/components/common/Pagination.vue'
import Spinner from '@/components/common/Spinner.vue'
import Modal from '@/components/common/Modal.vue'
import QRCode from '@/components/common/QRCode.vue'
import Button from '@/components/common/Button.vue'
import { 
  FunnelIcon,
  TicketIcon,
  MagnifyingGlassIcon 
} from '@heroicons/vue/24/outline'

const authStore = useAuthStore()

const tickets = ref([])
const loading = ref(true)
const searchQuery = ref('')
const selectedStatus = ref('all')
const showQRModal = ref(false)
const selectedTicket = ref(null)

const pagination = ref({
  currentPage: 1,
  totalPages: 1,
  totalItems: 0,
  perPage: 12
})

const statusOptions = [
  { value: 'all', label: 'All Tickets' },
  { value: 'valid', label: 'Valid' },
  { value: 'checked_in', label: 'Checked In' },
  { value: 'expired', label: 'Expired' }
]

const filteredTickets = computed(() => {
  let result = tickets.value

  // Filter by search
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(ticket =>
      ticket.event_title?.toLowerCase().includes(query) ||
      ticket.ticket_code?.toLowerCase().includes(query)
    )
  }

  // Filter by status
  if (selectedStatus.value !== 'all') {
    result = result.filter(ticket => {
      const now = new Date()
      const eventDate = new Date(ticket.event_start_date)
      
      switch (selectedStatus.value) {
        case 'valid':
          return ticket.checkin_status !== 'checked_in' && eventDate > now
        case 'checked_in':
          return ticket.checkin_status === 'checked_in'
        case 'expired':
          return eventDate < now && ticket.checkin_status !== 'checked_in'
        default:
          return true
      }
    })
  }

  return result
})

const fetchTickets = async () => {
  loading.value = true
  try {
    const userId = authStore.user.id
    const response = await usersAPI.getTicketHistory(userId, {
      page: pagination.value.currentPage,
      limit: pagination.value.perPage
    })
    
    tickets.value = response.data.tickets || []
    pagination.value.totalItems = response.data.pagination?.total || 0
    pagination.value.totalPages = Math.ceil(pagination.value.totalItems / pagination.value.perPage)
  } catch (error) {
    console.error('Failed to fetch tickets:', error)
    tickets.value = []
  } finally {
    loading.value = false
  }
}

const handleViewQR = (ticket) => {
  selectedTicket.value = ticket
  showQRModal.value = true
}

const handleDownload = async (ticket) => {
  try {
    const response = await ordersAPI.downloadTicketsPDF(ticket.order_id)
    
    const blob = new Blob([response.data], { type: 'application/pdf' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `ticket-${ticket.ticket_code}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (error) {
    alert('Failed to download ticket')
  }
}

const handlePageChange = (page) => {
  pagination.value.currentPage = page
  fetchTickets()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => {
  fetchTickets()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-2xl font-bold text-gray-900">My Tickets</h1>
      <p class="text-gray-600 mt-1">View and manage your event tickets</p>
    </div>

    <!-- Filters -->
    <div class="card">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
        <!-- Search -->
        <div class="flex-1 max-w-md">
          <div class="relative">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search tickets..."
              class="input pl-10"
            />
            <MagnifyingGlassIcon class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        <!-- Status Filter -->
        <div class="flex items-center space-x-2">
          <FunnelIcon class="w-5 h-5 text-gray-400" />
          <select v-model="selectedStatus" class="select">
            <option
              v-for="option in statusOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <Spinner size="xl" />
    </div>

    <!-- Tickets Grid -->
    <div v-else-if="filteredTickets.length > 0">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <TicketCard
          v-for="ticket in filteredTickets"
          :key="ticket.ticket_id"
          :ticket="ticket"
          @view-qr="handleViewQR"
          @download="handleDownload"
        />
      </div>

      <!-- Pagination -->
      <div v-if="pagination.totalPages > 1" class="flex justify-center mt-8">
        <Pagination
          v-model:current-page="pagination.currentPage"
          :total-pages="pagination.totalPages"
          @update:current-page="handlePageChange"
        />
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="card text-center py-12">
      <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <TicketIcon class="w-10 h-10 text-gray-400" />
      </div>
      <h3 class="text-xl font-semibold text-gray-900 mb-2">No tickets found</h3>
      <p class="text-gray-600 mb-6">
        {{ searchQuery || selectedStatus !== 'all' 
          ? 'Try adjusting your filters' 
          : 'You haven\'t purchased any tickets yet' 
        }}
      </p>
      <RouterLink to="/events" class="btn-primary">
        Browse Events
      </RouterLink>
    </div>

    <!-- QR Code Modal -->
    <Modal
      v-model="showQRModal"
      title="Ticket QR Code"
      size="sm"
    >
      <div v-if="selectedTicket" class="text-center">
        <QRCode
          :value="selectedTicket.ticket_code"
          :size="300"
          class="mx-auto mb-4"
        />
        
        <div class="bg-gray-50 rounded-lg p-4 mb-4">
          <p class="text-sm text-gray-600 mb-1">Ticket Code</p>
          <p class="font-mono font-semibold text-lg">{{ selectedTicket.ticket_code }}</p>
        </div>

        <div class="text-left space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-600">Event:</span>
            <span class="font-medium">{{ selectedTicket.event_title }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Type:</span>
            <span class="font-medium">{{ selectedTicket.ticket_type_name }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Date:</span>
            <span class="font-medium">
              {{ new Date(selectedTicket.event_start_date).toLocaleDateString() }}
            </span>
          </div>
        </div>
      </div>

      <template #footer>
        <Button variant="secondary" @click="showQRModal = false" full-width>
          Close
        </Button>
      </template>
    </Modal>
  </div>
</template>