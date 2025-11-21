<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { eventsAPI } from '@/api/events.js'
import Card from '@/components/common/Card.vue'
import Pagination from '@/components/common/Pagination.vue'
import Spinner from '@/components/common/Spinner.vue'
import Button from '@/components/common/Button.vue'
import Badge from '@/components/common/Badge.vue'
import {
  PlusCircleIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PencilSquareIcon,
  EyeIcon,
  CalendarIcon,
  MapPinIcon,
  TicketIcon
} from '@heroicons/vue/24/outline'

const router = useRouter()

const events = ref([])
const loading = ref(true)
const searchQuery = ref('')
const selectedStatus = ref('all')

const pagination = ref({
  currentPage: 1,
  totalPages: 1,
  totalItems: 0,
  perPage: 20 // Tăng lên 20 cho table
})

const statusOptions = [
  { value: 'all', label: 'All Events' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' }
]

const getStatusBadge = (status) => {
  const badges = {
    draft: { variant: 'secondary', text: 'Draft' },
    pending: { variant: 'warning', text: 'Pending' },
    approved: { variant: 'success', text: 'Approved' },
    rejected: { variant: 'danger', text: 'Rejected' },
    cancelled: { variant: 'danger', text: 'Cancelled' }
  }
  return badges[status] || badges.draft
}

const filteredEvents = computed(() => {
  let result = events.value

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(event =>
      event.title?.toLowerCase().includes(query) ||
      event.venue_name?.toLowerCase().includes(query)
    )
  }

  if (selectedStatus.value !== 'all') {
    result = result.filter(event => event.status === selectedStatus.value)
  }

  return result
})

const fetchEvents = async () => {
  loading.value = true
  try {
    const response = await eventsAPI.getOrganizerEvents({
      page: pagination.value.currentPage,
      limit: pagination.value.perPage
    })
    
    events.value = response.data.events || []
    
    const paginationData = response.data.pagination || {}
    pagination.value.totalItems = paginationData.total_count || 0
    pagination.value.totalPages = paginationData.total_pages || Math.ceil(pagination.value.totalItems / pagination.value.perPage)
  } catch (error) {
    console.error('Failed to fetch events:', error)
    events.value = []
  } finally {
    loading.value = false
  }
}

const handlePageChange = (page) => {
  pagination.value.currentPage = page
  fetchEvents()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// Navigate to edit page
const handleEdit = (eventId) => {
  router.push(`/organizer/events/${eventId}/edit`)
}

// Navigate to management overview (statistics)
const handleViewManagement = (eventId) => {
  router.push(`/organizer/events/${eventId}/overview`)
}

const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

const formatPrice = (price) => {
  if (!price) return 'Free'
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    notation: 'compact'
  }).format(price)
}

onMounted(() => {
  fetchEvents()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">My Events</h1>
        <p class="text-gray-600 mt-1">Manage your events and track performance</p>
      </div>
      <Button variant="primary" @click="router.push('/organizer/events/create')">
        <PlusCircleIcon class="w-5 h-5" />
        Create Event
      </Button>
    </div>

    <!-- Search & Filters -->
    <Card>
      <div class="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
        <!-- Search -->
        <div class="flex-1 max-w-md">
          <div class="relative">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search by event name or venue..."
              class="input pl-10"
            />
            <MagnifyingGlassIcon class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        <!-- Status Filter -->
        <div class="flex items-center space-x-2">
          <FunnelIcon class="w-5 h-5 text-gray-400" />
          <select v-model="selectedStatus" class="select" @change="fetchEvents">
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
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Event
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Venue
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tickets Sold
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Revenue
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr
              v-for="event in filteredEvents"
              :key="event.id"
              class="hover:bg-gray-50 transition-colors"
            >
              <!-- Event Info -->
              <td class="px-6 py-4">
                <div class="flex items-center space-x-3">
                  <div class="flex-shrink-0 w-12 h-12">
                    <img
                      v-if="event.thumbnail_image || event.logo_image"
                      :src="event.thumbnail_image || event.logo_image"
                      :alt="event.title"
                      class="w-12 h-12 object-cover rounded"
                    />
                    <div v-else class="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                      <CalendarIcon class="w-6 h-6 text-gray-400" />
                    </div>
                  </div>
                  <div class="max-w-xs">
                    <p class="font-medium text-gray-900 truncate">{{ event.title }}</p>
                    <p v-if="event.category_name" class="text-sm text-gray-500">{{ event.category_name }}</p>
                  </div>
                </div>
              </td>

              <!-- Date -->
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center text-sm text-gray-900">
                  <CalendarIcon class="w-4 h-4 text-gray-400 mr-2" />
                  {{ formatDate(event.start_date) }}
                </div>
              </td>

              <!-- Venue -->
              <td class="px-6 py-4">
                <div class="flex items-start text-sm text-gray-900 max-w-xs">
                  <MapPinIcon class="w-4 h-4 text-gray-400 mr-2 flex-shrink-0 mt-0.5" />
                  <span class="line-clamp-2">{{ event.venue_name || 'N/A' }}</span>
                </div>
              </td>

              <!-- Status -->
              <td class="px-6 py-4 whitespace-nowrap">
                <Badge :variant="getStatusBadge(event.status).variant">
                  {{ getStatusBadge(event.status).text }}
                </Badge>
              </td>

              <!-- Tickets Sold -->
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center text-sm">
                  <TicketIcon class="w-4 h-4 text-gray-400 mr-2" />
                  <span class="font-medium text-gray-900">
                    {{ event.sold_tickets || 0 }}
                  </span>
                  <span class="text-gray-500 ml-1">
                    / {{ event.total_tickets || 0 }}
                  </span>
                </div>
              </td>

              <!-- Revenue -->
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">
                  {{ formatPrice(event.revenue) }}
                </div>
              </td>

              <!-- Actions -->
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center space-x-2">
                  <!-- Edit Button -->
                  <button
                    @click="handleEdit(event.id)"
                    class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit Event"
                  >
                    <PencilSquareIcon class="w-5 h-5" />
                  </button>

                  <!-- View Management Button -->
                  <button
                    @click="handleViewManagement(event.id)"
                    class="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="View Management"
                  >
                    <EyeIcon class="w-5 h-5" />
                  </button>
                </div>
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
      <div class="flex flex-col items-center">
        <CalendarIcon class="w-16 h-16 text-gray-400 mb-4" />
        <h3 class="text-lg font-semibold text-gray-900 mb-2">
          {{ searchQuery ? 'No events found' : 'No events yet' }}
        </h3>
        <p class="text-gray-600 mb-6">
          {{ searchQuery 
            ? `No events match "${searchQuery}". Try a different search.` 
            : 'Create your first event to get started!' 
          }}
        </p>
        <Button 
          v-if="!searchQuery" 
          variant="primary" 
          @click="router.push('/organizer/events/create')"
        >
          <PlusCircleIcon class="w-5 h-5" />
          Create Event
        </Button>
      </div>
    </Card>
  </div>
</template>