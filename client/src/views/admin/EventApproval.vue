<script setup>
import { ref, computed, onMounted } from 'vue'
import { adminAPI } from '@/api/admin.js'
import Card from '@/components/common/Card.vue'
import Button from '@/components/common/Button.vue'
import Badge from '@/components/common/Badge.vue'
import Pagination from '@/components/common/Pagination.vue'
import Spinner from '@/components/common/Spinner.vue'
import Modal from '@/components/common/Modal.vue'
import {
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  NoSymbolIcon
} from '@heroicons/vue/24/outline'

const loading = ref(true)
const events = ref([])
const searchQuery = ref('')
const selectedStatus = ref('all')
const showDetailModal = ref(false)
const selectedEvent = ref(null)
const processingAction = ref(false)
const rejectionReason = ref('')
const showCancelModal = ref(false) 
const cancellationReason = ref('')

const pagination = ref({
  currentPage: 1,
  totalPages: 1,
  totalItems: 0,
  perPage: 20
})

const statusOptions = [
  { value: 'all', label: 'All Events' },
  { value: 'pending', label: 'Pending Approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'cancelled', label: 'Cancelled' }
]

const filteredEvents = computed(() => {
  let result = events.value

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(event =>
      event.title?.toLowerCase().includes(query) ||
      event.organizer_name?.toLowerCase().includes(query)
    )
  }

  if (selectedStatus.value !== 'all') {
    result = result.filter(event => event.status === selectedStatus.value)
  }

  return result
})

const getStatusBadge = (status) => {
  const badges = {
    approved: { variant: 'success', text: 'Approved', icon: CheckCircleIcon },
    pending: { variant: 'warning', text: 'Pending', icon: ClockIcon },
    rejected: { variant: 'danger', text: 'Rejected', icon: XCircleIcon },
    draft: { variant: 'secondary', text: 'Draft', icon: NoSymbolIcon },
    active: { variant: 'success', text: 'Active', icon: CheckCircleIcon },
    completed: { variant: 'secondary', text: 'Completed', icon: CheckCircleIcon },
    cancelled: { variant: 'danger', text: 'Cancelled', icon: XCircleIcon }
  }
  return badges[status] || { 
    variant: 'secondary', 
    text: status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown', 
    icon: NoSymbolIcon 
  }
}

const fetchEvents = async () => {
  loading.value = true
  try {
    const response = await adminAPI.getAllEvents({
      page: pagination.value.currentPage,
      limit: pagination.value.perPage,
      status: selectedStatus.value !== 'all' ? selectedStatus.value : undefined
    })
    
    events.value = response.data.events || []

    const paginationData = response.data.pagination || {}
    pagination.value.totalItems = paginationData.total_count || 0
    pagination.value.totalPages = paginationData.total_pages || 0
  } catch (error) {
    console.error('Failed to fetch events:', error)
  } finally {
    loading.value = false
  }
}

const handleViewDetails = (event) => {
  selectedEvent.value = event
  showDetailModal.value = true
}

const handleApprove = async (eventId) => {
  if (!confirm('Approve this event?')) return

  processingAction.value = true
  try {
    await adminAPI.approveEvent(eventId)
    alert('Event approved successfully!')
    showDetailModal.value = false
    await fetchEvents()
  } catch (error) {
    alert(error.response?.data?.error?.message || 'Failed to approve event')
  } finally {
    processingAction.value = false
  }
}

const handleReject = async (eventId) => {
  if (!rejectionReason.value.trim()) {
    alert('Please provide a rejection reason')
    return
  }

  if (!confirm('Reject this event?')) return

  processingAction.value = true
  try {
    await adminAPI.rejectEvent(eventId, {
      reason: rejectionReason.value
    })
    alert('Event rejected')
    rejectionReason.value = ''
    showDetailModal.value = false
    await fetchEvents()
  } catch (error) {
    alert(error.response?.data?.error?.message || 'Failed to reject event')
  } finally {
    processingAction.value = false
  }
}

const handleOpenCancel = (event) => {
  selectedEvent.value = event
  cancellationReason.value = ''
  showCancelModal.value = true
}

const handleCancelEvent = async (eventId) => {
  if (!cancellationReason.value.trim()) {
    alert('Please provide a cancellation reason')
    return
  }

  if (!confirm('Cancel this event? All paid orders will be refunded automatically.')) {
    return
  }

  processingAction.value = true
  try {
    await adminAPI.cancelEvent(eventId, {
      cancellation_reason: cancellationReason.value
    })
    alert('Event cancelled successfully! Refund requests have been created.')
    showCancelModal.value = false
    showDetailModal.value = false
    await fetchEvents()
  } catch (error) {
    alert(error.response?.data?.error?.message || 'Failed to cancel event')
  } finally {
    processingAction.value = false
  }
}

const handlePageChange = (page) => {
  pagination.value.currentPage = page
  fetchEvents()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => {
  fetchEvents()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Event Approval</h1>
      <p class="text-gray-600 mt-1">Review and approve event submissions</p>
    </div>

    <!-- Search & Filter -->
    <Card>
      <div class="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
        <!-- Search -->
        <div class="flex-1 max-w-md">
          <div class="relative">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search events..."
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
    </Card>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <Spinner size="xl" />
    </div>

    <!-- Events Table -->
    <Card v-else-if="filteredEvents.length > 0" no-padding>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 border-b">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Organizer</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Venue</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitted</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr
              v-for="event in filteredEvents"
              :key="event.id"
              class="hover:bg-gray-50"
            >
              <td class="px-6 py-4">
                <div class="flex items-center space-x-3">
                  <img
                    v-if="event.logo_image"
                    :src="event.logo_image"
                    :alt="event.title"
                    class="w-12 h-12 object-cover rounded"
                  />
                  <div class="w-12 h-12 bg-gray-200 rounded flex items-center justify-center" v-else>
                    <span class="text-gray-400 text-xs">No img</span>
                  </div>
                  <div>
                    <p class="font-medium text-gray-900">{{ event.title }}</p>
                    <p class="text-sm text-gray-500">{{ event.category_name }}</p>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="text-sm text-gray-900">{{ event.organizer_name }}</span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="text-sm text-gray-900">
                  {{ new Date(event.start_date).toLocaleDateString() }}
                </span>
              </td>
              <td class="px-6 py-4">
                <span class="text-sm text-gray-900">{{ event.venue_name }}</span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <Badge :variant="getStatusBadge(event.status).variant">
                  <component :is="getStatusBadge(event.status).icon" class="w-4 h-4" />
                  {{ getStatusBadge(event.status).text }}
                </Badge>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ new Date(event.created_at).toLocaleDateString() }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <Button
                  variant="ghost"
                  size="sm"
                  @click="handleViewDetails(event)"
                >
                  <EyeIcon class="w-4 h-4" />
                  Review
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="pagination.totalPages > 1" class="p-6 border-t">
        <Pagination
          v-model:current-page="pagination.currentPage"
          :total-pages="pagination.totalPages"
          @update:current-page="handlePageChange"
        />
      </div>
    </Card>

    <!-- Empty State -->
    <Card v-else class="text-center py-12">
      <p class="text-gray-500">No events found</p>
    </Card>

    <!-- Detail Modal -->
    <Modal
      v-model="showDetailModal"
      title="Event Review"
      size="xl"
    >
      <div v-if="selectedEvent" class="space-y-4">
        <!-- Event Image -->
        <img
          v-if="selectedEvent.cover_image"
          :src="selectedEvent.cover_image"
          :alt="selectedEvent.title"
          class="w-full h-64 object-cover rounded-lg"
        />

        <!-- Event Info -->
        <div>
          <h3 class="text-xl font-bold mb-2">{{ selectedEvent.title }}</h3>
          <p class="text-gray-600 whitespace-pre-line">{{ selectedEvent.description }}</p>
        </div>

        <!-- Details Grid -->
        <div class="grid grid-cols-2 gap-4 py-4 border-t border-b">
          <div>
            <p class="text-sm text-gray-600">Organizer</p>
            <p class="font-medium">{{ selectedEvent.organizer_name }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600">Category</p>
            <p class="font-medium">{{ selectedEvent.category_name }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600">Start Date</p>
            <p class="font-medium">{{ new Date(selectedEvent.start_date).toLocaleString() }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600">End Date</p>
            <p class="font-medium">{{ new Date(selectedEvent.end_date).toLocaleString() }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600">Venue</p>
            <p class="font-medium">{{ selectedEvent.venue_name }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600">Capacity</p>
            <p class="font-medium">{{ selectedEvent.venue_capacity || 'N/A' }}</p>
          </div>
        </div>

        <!-- Rejection Reason (if pending) -->
        <div v-if="selectedEvent.status === 'pending'">
          <label class="label">Rejection Reason (if rejecting)</label>
          <textarea
            v-model="rejectionReason"
            rows="3"
            placeholder="Provide reason for rejection..."
            class="textarea"
          ></textarea>
        </div>
      </div>

      <template #footer>
        <div v-if="selectedEvent?.status === 'pending'" class="flex space-x-3">
          <Button
            variant="danger"
            :loading="processingAction"
            @click="handleReject(selectedEvent.id)"
            full-width
          >
            <XCircleIcon class="w-5 h-5" />
            Reject
          </Button>
          <Button
            variant="success"
            :loading="processingAction"
            @click="handleApprove(selectedEvent.id)"
            full-width
          >
            <CheckCircleIcon class="w-5 h-5" />
            Approve
          </Button>
        </div>

        <div v-else-if="selectedEvent?.status === 'approved'" class="flex space-x-3">
          <Button
            variant="secondary"
            @click="showDetailModal = false"
            full-width
          >
            Close
          </Button>
          <Button
            variant="danger"
            :loading="processingAction"
            @click="handleOpenCancel(selectedEvent)"
            full-width
          >
            <NoSymbolIcon class="w-5 h-5" />
            Cancel Event
          </Button>
        </div>

        <Button
          v-else
          variant="secondary"
          @click="showDetailModal = false"
          full-width
        >
          Close
        </Button>
      </template>
    </Modal>

    <!-- Cancel Event Modal -->
    <Modal
      v-model="showCancelModal"
      title="Cancel Event"
      size="md"
    >
      <div v-if="selectedEvent" class="space-y-4">
        <div class="bg-red-50 border border-red-200 rounded-lg p-4">
          <p class="text-red-800 font-medium mb-2">⚠️ Warning</p>
          <p class="text-sm text-red-700">
            Cancelling this event will:
          </p>
          <ul class="list-disc list-inside text-sm text-red-700 mt-2 space-y-1">
            <li>Mark the event as cancelled</li>
            <li>Create automatic refund requests for all paid orders</li>
            <li>Send notifications to all ticket holders</li>
            <li>This action cannot be undone</li>
          </ul>
        </div>

        <div>
          <p class="font-medium text-gray-900 mb-2">
            Event: {{ selectedEvent.title }}
          </p>
          <p class="text-sm text-gray-600">
            Organizer: {{ selectedEvent.organizer_name }}
          </p>
        </div>

        <div>
          <label class="label">Cancellation Reason *</label>
          <textarea
            v-model="cancellationReason"
            rows="4"
            placeholder="Explain why this event is being cancelled..."
            class="textarea"
            required
          ></textarea>
          <p class="text-xs text-gray-500 mt-1">
            This reason will be sent to the organizer and ticket holders.
          </p>
        </div>
      </div>

      <template #footer>
        <div class="flex space-x-3">
          <Button
            variant="secondary"
            @click="showCancelModal = false"
            full-width
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            :loading="processingAction"
            @click="handleCancelEvent(selectedEvent.id)"
            full-width
          >
            Confirm Cancellation
          </Button>
        </div>
      </template>
    </Modal>
  </div>
</template>