<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { eventsAPI } from '@/api/events.js'
import EventCard from '@/components/features/EventCard.vue'
import Pagination from '@/components/common/Pagination.vue'
import Spinner from '@/components/common/Spinner.vue'
import Button from '@/components/common/Button.vue'
import Badge from '@/components/common/Badge.vue'
import {
  PlusCircleIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CalendarIcon
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
  perPage: 12
})

const statusOptions = [
  { value: 'all', label: 'All Events' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending_approval', label: 'Pending' },
  { value: 'approved', label: 'Active' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' }
]

const filteredEvents = computed(() => {
  let result = events.value

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(event =>
      event.title?.toLowerCase().includes(query)
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
    pagination.value.totalItems = response.data.pagination?.total || 0
    pagination.value.totalPages = Math.ceil(pagination.value.totalItems / pagination.value.perPage)
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

const handleEventClick = (event) => {
  router.push(`/organizer/events/${event.event_id}/edit`)
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
    <div class="card">
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
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <Spinner size="xl" />
    </div>

    <!-- Events Grid -->
    <div v-else-if="filteredEvents.length > 0">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="event in filteredEvents"
          :key="event.event_id"
          @click="handleEventClick(event)"
          class="cursor-pointer"
        >
          <EventCard :event="event" />
          
          <!-- Additional Organizer Actions -->
          <div class="mt-3 flex items-center space-x-2">
            <Button
              variant="secondary"
              size="sm"
              @click.stop="router.push(`/organizer/events/${event.event_id}/statistics`)"
            >
              Statistics
            </Button>
            <Button
              variant="secondary"
              size="sm"
              @click.stop="router.push(`/organizer/events/${event.event_id}/orders`)"
            >
              Orders
            </Button>
          </div>
        </div>
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
        <CalendarIcon class="w-10 h-10 text-gray-400" />
      </div>
      <h3 class="text-xl font-semibold text-gray-900 mb-2">No events found</h3>
      <p class="text-gray-600 mb-6">
        {{ searchQuery || selectedStatus !== 'all' 
          ? 'Try adjusting your filters' 
          : 'Start by creating your first event' 
        }}
      </p>
      <Button variant="primary" @click="router.push('/organizer/events/create')">
        <PlusCircleIcon class="w-5 h-5" />
        Create Your First Event
      </Button>
    </div>
  </div>
</template>