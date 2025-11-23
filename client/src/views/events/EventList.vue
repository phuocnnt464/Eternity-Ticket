<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { eventsAPI } from '@/api/events.js'
import EventCard from '@/components/features/EventCard.vue'
import EventFilter from '@/components/features/EventFilter.vue'
import Pagination from '@/components/common/Pagination.vue'
import Spinner from '@/components/common/Spinner.vue'
import { MagnifyingGlassIcon } from '@heroicons/vue/24/outline'

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
  dateTo: route.query.dateTo || '',
  minPrice: route.query.minPrice || '',
  maxPrice: route.query.maxPrice || '',
  status: 'approved',
  sort: route.query.sort || 'date_asc'
})

const fetchEvents = async () => {
  loading.value = true
  error.value = null

  try {
    const params = {
      page: pagination.value.currentPage,
      limit: pagination.value.perPage,
      status: 'approved'
    }

    // Chỉ thêm params nếu có giá trị và không rỗng
    if (filters.value.search && filters.value.search.trim()) {
      params.search = filters.value.search.trim()
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
    
    // CLIENT-SIDE FILTERING cho các filter chưa được backend hỗ trợ
    
    // Filter theo date range
    if (filters.value.dateFrom) {
      eventsList = eventsList.filter(e => {
        const eventDate = new Date(e.start_date)
        const filterDate = new Date(filters.value.dateFrom)
        return eventDate >= filterDate
      })
    }
    
    if (filters.value.dateTo) {
      eventsList = eventsList.filter(e => {
        const eventDate = new Date(e.start_date)
        const filterDate = new Date(filters.value.dateTo)
        return eventDate <= filterDate
      })
    }
    
    // Filter theo price range
    if (filters.value.minPrice) {
      eventsList = eventsList.filter(e => {
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
          eventsList.sort((a, b) => new Date(b.start_date) - new Date(a.start_date))
          break
        case 'price_asc':
          eventsList.sort((a, b) => (a.min_price || 0) - (b.min_price || 0))
          break
        case 'price_desc':
          eventsList.sort((a, b) => (b.min_price || 0) - (a.min_price || 0))
          break
        case 'popular':
          eventsList.sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
          break
      }
    }
    
    events.value = eventsList
    pagination.value.totalItems = response.data.pagination?.total || eventsList.length
    pagination.value.totalPages = Math.ceil(pagination.value.totalItems / pagination.value.perPage)
  } catch (error) {
    console.error('Failed to fetch events:', error)
    error.value = err.response?.data?.error?.message || 'Failed to load events'
  } finally {
    loading.value = false
  }
}

const fetchCategories = async () => {
  try {
    const response = await eventsAPI.getCategories()
    let cats = response.data.categories || []

    cats = cats.sort((a, b) => {
      if (a.name.toLowerCase() === 'others') return 1
      if (b.name.toLowerCase() === 'others') return -1
      return a.name.localeCompare(b.name)
    })

    categories.value = cats
  } catch (error) {
    console.error('Failed to fetch categories:', error)
  }
}

const handleSearch = () => {
  filters.value.search = searchQuery.value 
  filters.value = { ...filters.value }
  pagination.value.currentPage = 1
  updateQueryParams()
  fetchEvents()
}

const handleFilterApply = (newFilters) => {
  filters.value = newFilters
  // Đồng bộ ngược lại ô search nếu filter thay đổi search
  if (newFilters.search !== undefined) {
    searchQuery.value = newFilters.search
  }
  
  pagination.value.currentPage = 1
  updateQueryParams()
  fetchEvents()
}
// const handleFilterApply = (newFilters) => {
//   console.log('🔍 [EventList] Received filters from EventFilter:', newFilters)
//   filters.value = newFilters
//   console.log('🔍 [EventList] Updated filters.value:', filters.value)
//   pagination.value.currentPage = 1
//   updateQueryParams()
//   fetchEvents()
// }

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
    category: filters.value.category || undefined,
    dateFrom: filters.value.dateFrom || undefined,
    dateTo: filters.value.dateTo || undefined,
    minPrice: filters.value.minPrice || undefined,
    maxPrice: filters.value.maxPrice || undefined,
    sort: filters.value.sort
  }

  // Remove undefined values
  Object.keys(query).forEach(key => query[key] === undefined && delete query[key])

  router.replace({ query })
}

const handleClearAll = () => {
  // Xóa ô tìm kiếm
  searchQuery.value = ''
  
  // Reset filters về mặc định
  // Việc gán lại object mới này sẽ kích hoạt cái `watch` bên trong EventFilter
  // giúp EventFilter tự động xóa trắng các ô input.
  filters.value = { ...defaultFilters }
  
  // Reset trang về 1
  pagination.value.currentPage = 1
  
  // Cập nhật URL và gọi API
  updateQueryParams()
  fetchEvents()
}

onMounted(async () => {
  await fetchCategories()
  await fetchEvents()
})

watch(() => route.query.search, (newSearch) => {
  if (newSearch !== searchQuery.value) {
    searchQuery.value = newSearch || ''
    fetchEvents()
  }
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <section class="bg-white border-b py-8">
      <div class="container-custom">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">Browse Events</h1>
        <p class="text-gray-600">Discover amazing events happening near you</p>
      </div>
    </section>

    <!-- Search & Filter Bar -->
    <section class="bg-white border-b py-4 sticky top-16 z-10">
      <div class="container-custom">
        <div class="flex items-center space-x-4">
          <!-- Search -->
          <div class="flex-1 max-w-md">
            <div class="relative">
              <input
                v-model="searchQuery"
                @keyup.enter="handleSearch"
                type="text"
                placeholder="Search events..."
                class="input pl-10"
              />
              <MagnifyingGlassIcon class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <!-- Filter -->
          <EventFilter
            v-model="filters"
            :categories="categories"
            @apply="handleFilterApply"
          />
        </div>
      </div>
    </section>

    <!-- Results -->
    <section class="py-8">
      <div class="container-custom">
        <!-- Results Info -->
        <div class="flex items-center justify-between mb-6">
          <div class="text-sm text-gray-600">
            <span v-if="!loading">
              Showing <strong>{{ events.length }}</strong> of <strong>{{ pagination.totalItems }}</strong> events
            </span>
          </div>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="flex justify-center py-20">
          <Spinner size="xl" />
        </div>

        <!-- Events Grid -->
        <div v-else-if="events.length > 0">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
            <EventCard
              v-for="event in events"
              :key="event.event_id"
              :event="event"
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
        <div v-else class="text-center py-20">
          <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MagnifyingGlassIcon class="w-10 h-10 text-gray-400" />
          </div>
          <h3 class="text-xl font-semibold text-gray-900 mb-2">No events found</h3>
          <p class="text-gray-600 mb-6">Try adjusting your search or filters</p>
          <!-- <button @click="() => { searchQuery = ''; filters = { status: 'approved', sort: 'date_asc' }; handleSearch(); }" class="btn-secondary"> -->
          <button 
            @click="handleClearAll" 
            class="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
          >  
            Clear Filters
          </button>
        </div>
      </div>
    </section>
  </div>
</template>