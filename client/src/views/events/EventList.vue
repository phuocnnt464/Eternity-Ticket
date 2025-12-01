<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { eventsAPI } from '@/api/events.js'
import EventCard from '@/components/features/EventCard.vue'
import EventFilter from '@/components/features/EventFilter.vue'
import Pagination from '@/components/common/Pagination.vue'
import Spinner from '@/components/common/Spinner.vue'
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/vue/24/outline'

// ...  rest of script giữ nguyên như trước
const route = useRoute()
const router = useRouter()

const events = ref([])
const categories = ref([])
const loading = ref(true)
const error = ref(null)
const searchQuery = ref(route.query.search || '')

const pagination = ref({
  currentPage: parseInt(route.query.page) || 1,
  totalPages: 1,
  totalItems: 0,
  perPage: 12
})

const defaultFilters = {
  search: '',
  category: '',
  city: '',
  dateFrom: '',
  dateTo: '',
  minPrice: '',
  maxPrice: '',
  status: 'approved',
  sort: 'date_asc'
}

const filters = ref({
  search: route.query.search || '',
  category: route.query.category || '',
  city: route.query.city || '',
  dateFrom: route.query.dateFrom || '',
  dateTo: route. query.dateTo || '',
  minPrice: route.query.minPrice || '',
  maxPrice: route.query.maxPrice || '',
  status: 'approved',
  sort: route.query.sort || 'date_asc'
})

const fetchEvents = async () => {
  loading.value = true
  error. value = null

  try {
    const params = {
      page: pagination. value.currentPage,
      limit: pagination.value.perPage,
      status: 'approved'
    }

    if (filters.value.search && filters.value.search. trim()) {
      params.search = filters.value.search. trim()
    }
    
    if (filters.value.category && filters.value.category.trim()) {
      params.category = filters.value.category.trim()
    }

    if (filters.value.city && filters.value.city.trim()) {
      params.city = filters.value.city.trim()
    }

    const response = await eventsAPI.getPublicEvents(params)
    const responseData = response.data.data || response.data
    let eventsList = responseData.events || responseData || []
    
    console.log('📊 Events from API:', eventsList[0])
    
    // CLIENT-SIDE FILTERING
    if (filters.value.dateFrom) {
      eventsList = eventsList.filter(e => {
        const eventDate = new Date(e.start_date)
        const filterDate = new Date(filters.value.dateFrom)
        return eventDate >= filterDate
      })
    }
    
    if (filters.value.dateTo) {
      eventsList = eventsList. filter(e => {
        const eventDate = new Date(e. start_date)
        const filterDate = new Date(filters.value.dateTo)
        return eventDate <= filterDate
      })
    }
    
    if (filters.value.minPrice) {
      eventsList = eventsList. filter(e => {
        const minPrice = e.min_price || 0
        return minPrice >= parseFloat(filters.value.minPrice)
      })
    }
    
    if (filters.value.maxPrice) {
      eventsList = eventsList.filter(e => {
        const minPrice = e.min_price || 0
        return minPrice <= parseFloat(filters.value.maxPrice)
      })
    }
    
    // Sort
    if (filters.value.sort) {
      switch (filters.value.sort) {
        case 'date_asc':
          eventsList.sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
          break
        case 'date_desc':
          eventsList.sort((a, b) => new Date(b.start_date) - new Date(a. start_date))
          break
        case 'price_asc':
          eventsList.sort((a, b) => (a.min_price || 0) - (b.min_price || 0))
          break
        case 'price_desc':
          eventsList.sort((a, b) => (b.min_price || 0) - (a.min_price || 0))
          break
        case 'popular':
          eventsList. sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
          break
      }
    }
    
    events.value = eventsList
    pagination.value.totalItems = response.data.pagination?. total || eventsList.length
    pagination.value.totalPages = Math.ceil(pagination.value.totalItems / pagination.value.perPage)
  } catch (err) {
    console.error('Failed to fetch events:', err)
    error.value = err.response?.data?.error?. message || 'Failed to load events'
  } finally {
    loading.value = false
  }
}

const fetchCategories = async () => {
  try {
    const response = await eventsAPI.getCategories()
    let cats = response.data.categories || []
    cats = cats.sort((a, b) => {
      if (a.name. toLowerCase() === 'others') return 1
      if (b.name.toLowerCase() === 'others') return -1
      return a.name.localeCompare(b.name)
    })
    categories.value = cats
  } catch (error) {
    console.error('Failed to fetch categories:', error)
  }
}

const handleSearch = () => {
  filters.value.search = searchQuery. value
  pagination.value.currentPage = 1
  updateQueryParams()
  fetchEvents()
}

const handleFilterApply = (newFilters) => {
  filters.value = newFilters
  if (newFilters.search !== undefined) {
    searchQuery.value = newFilters.search
  }
  pagination.value.currentPage = 1
  updateQueryParams()
  fetchEvents()
}

const handlePageChange = (page) => {
  pagination.value.currentPage = page
  updateQueryParams()
  fetchEvents()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const updateQueryParams = () => {
  const query = {
    page: pagination.value.currentPage,
    search: searchQuery.value || undefined,
    category: filters. value.category || undefined,
    dateFrom: filters.value.dateFrom || undefined,
    dateTo: filters.value.dateTo || undefined,
    minPrice: filters. value.minPrice || undefined,
    maxPrice: filters.value. maxPrice || undefined,
    sort: filters.value.sort
  }
  Object.keys(query).forEach(key => query[key] === undefined && delete query[key])
  router.replace({ query })
}

const handleClearAll = () => {
  searchQuery.value = ''
  filters. value = { ...defaultFilters }
  pagination.value.currentPage = 1
  updateQueryParams()
  fetchEvents()
}

const hasActiveFilters = computed(() => {
  return filters.value.category || filters.value.city || 
         filters.value.dateFrom || filters.value.dateTo ||
         filters.value.minPrice || filters.value.maxPrice ||
         searchQuery.value
})

onMounted(async () => {
  await fetchCategories()
  await fetchEvents()
})

watch(() => route.query. search, (newSearch) => {
  if (newSearch !== searchQuery.value) {
    searchQuery.value = newSearch || ''
    fetchEvents()
  }
})


</script>

<template>
  <div class="min-h-screen bg-white">
    <!-- Compact Hero Section -->
    <section class="relative bg-gradient-to-br from-dark-900 via-primary-900 to-black text-white py-10 overflow-visible">
      <!-- Background Pattern -->
      <div class="absolute inset-0 opacity-10">
        <div class="absolute inset-0" style="background-image: radial-gradient(circle at 2px 2px, white 1px, transparent 0); background-size: 40px 40px;"></div>
      </div>

      <!-- Decorative blobs -->
      <div class="absolute top-0 right-0 w-72 h-72 bg-primary-500 rounded-full blur-3xl opacity-20"></div>
      <div class="absolute bottom-0 left-0 w-72 h-72 bg-accent-500 rounded-full blur-3xl opacity-20"></div>

      <div class="container-custom relative z-10">
        <!-- Title -->
        <div class="mb-6">
          <h1 class="text-3xl md:text-4xl font-bold mb-2">
            Discover Events
          </h1>
          <p class="text-gray-300">
            <span v-if="! loading">{{ pagination.totalItems }}+ amazing events available</span>
          </p>
        </div>

        <!-- Search + Filter Row -->
        <div class="flex flex-col md:flex-row gap-3 mb-4">
          <!-- Search Bar -->
          <div class="flex-1 flex gap-2">
            <div class="flex-1 relative">
              <input
                v-model="searchQuery"
                @keyup.enter="handleSearch"
                type="text"
                placeholder="Search events by name, location, organizer..."
                class="w-full h-12 px-4 pl-11 text-gray-900 bg-white rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <MagnifyingGlassIcon class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <!-- Search Button -->
            <button 
              @click="handleSearch"
              class="h-12 bg-primary-600 hover:bg-primary-700 text-white px-6 rounded-xl font-semibold transition-colors shadow-lg whitespace-nowrap"
            >
              Search
            </button>
          </div>

          <!-- Filter Button -->
          <EventFilter
            v-model="filters"
            :categories="categories"
            @apply="handleFilterApply"
          />
        </div>

        <p v-if="searchQuery && searchQuery.length < 2" class="text-sm text-amber-600 mb-4">
          ⚠️ Please enter at least 2 characters to search
        </p>

        <!-- Active Filters Pills - MOVED OUTSIDE SEARCH ROW -->
        <div v-if="hasActiveFilters" class="flex flex-wrap gap-2">
          <span v-if="searchQuery" class="inline-flex items-center bg-white/20 backdrop-blur-sm text-white px-3 py-1. 5 rounded-full text-sm font-medium">
            Search: "{{ searchQuery }}"
          </span>
          <span v-if="filters.category" class="inline-flex items-center bg-white/20 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-sm font-medium">
            Category: {{ categories.find(c => c.id == filters.category)?.name }}
          </span>
          <span v-if="filters.city" class="inline-flex items-center bg-white/20 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-sm font-medium">
            City: {{ filters.city }}
          </span>
          <span v-if="filters.dateFrom || filters.dateTo" class="inline-flex items-center bg-white/20 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-sm font-medium">
            Date: {{ filters.dateFrom || 'Start' }} - {{ filters.dateTo || 'End' }}
          </span>
          <span v-if="filters.minPrice || filters.maxPrice" class="inline-flex items-center bg-white/20 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-sm font-medium">
            Price: {{ filters.minPrice || '0' }} - {{ filters.maxPrice || '∞' }} VND
          </span>
          <button
            @click="handleClearAll"
            class="inline-flex items-center bg-red-500/80 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-sm font-medium hover:bg-red-600 transition-colors"
          >
            <XMarkIcon class="w-4 h-4 mr-1 mb-1" />
            Clear All
          </button>
        </div>
      </div>
    </section>

    <!-- Results Section -->
    <section class="py-8 bg-gray-50">
      <div class="container-custom">
        <!-- Results Header with Sort -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 bg-white p-4 rounded-xl shadow-sm">
          <div>
            <h2 class="text-xl font-bold text-gray-900">
              <span v-if="!loading">{{ events.length }}</span>
              <span v-if="pagination.totalItems > events.length"> of {{ pagination.totalItems }}</span>
              Event<span v-if="pagination.totalItems !== 1">s</span> Found
            </h2>
          </div>
          
          <!-- Sort Dropdown -->
          <div class="flex items-center gap-2">
            <span class="text-sm text-gray-600 font-medium">Sort:</span>
            <select
              v-model="filters.sort"
              @change="handleFilterApply(filters)"
              class="select ! py-2 text-sm border-gray-300"
            >
              <option value="date_asc">Date: Earliest First</option>
              <option value="date_desc">Date: Latest First</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="popular">Most Popular</option>
            </select>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="flex flex-col items-center justify-center py-20">
          <Spinner size="xl" />
          <p class="text-gray-500 mt-4 text-lg">Finding amazing events...</p>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="text-center py-20 bg-white rounded-2xl shadow-lg">
          <div class="w-24 h-24 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <XMarkIcon class="w-12 h-12 text-white" />
          </div>
          <h3 class="text-2xl font-bold text-gray-900 mb-2">Oops! Something went wrong</h3>
          <p class="text-gray-600 mb-8 max-w-md mx-auto">{{ error }}</p>
          <button @click="fetchEvents" class="btn btn-primary btn-lg shadow-xl">
            Try Again
          </button>
        </div>

        <!-- Events Grid -->
        <div v-else-if="events.length > 0">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
            <EventCard
              v-for="event in events"
              :key="event.event_id"
              :event="event"
            />
          </div>

          <!-- Pagination -->
          <div v-if="pagination.totalPages > 1" class="flex justify-center">
            <Pagination
              v-model:current-page="pagination.currentPage"
              :total-pages="pagination.totalPages"
              @update:current-page="handlePageChange"
            />
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="text-center py-20 bg-white rounded-2xl shadow-lg">
          <div class="relative inline-block mb-8">
            <div class="w-32 h-32 bg-gradient-to-br from-primary-100 to-accent-100 rounded-full flex items-center justify-center mx-auto">
              <MagnifyingGlassIcon class="w-16 h-16 text-primary-600" />
            </div>
            <div class="absolute -top-2 -right-2 w-12 h-12 bg-accent-500 rounded-full flex items-center justify-center shadow-lg">
              <span class="text-white text-2xl font-bold">0</span>
            </div>
          </div>
          <h3 class="text-3xl font-bold text-gray-900 mb-3">No Events Found</h3>
          <p class="text-lg text-gray-600 mb-8 max-w-md mx-auto">
            We couldn't find any events matching your criteria.  Try adjusting your search or filters.
          </p>
          <button 
            @click="handleClearAll" 
            class="inline-flex items-center bg-gradient-to-r from-primary-600 to-accent-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:shadow-2xl transform hover:scale-105 transition-all"
          >  
            <XMarkIcon class="w-6 h-6 mr-2" />
            Clear All Filters
          </button>
        </div>
      </div>
    </section>
  </div>
</template>