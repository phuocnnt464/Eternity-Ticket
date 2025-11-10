<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { eventsAPI } from '@/api/events.js'
import { ordersAPI } from '@/api/orders.js'
import Card from '@/components/common/Card.vue'
import Badge from '@/components/common/Badge.vue'
import Button from '@/components/common/Button.vue'
import Pagination from '@/components/common/Pagination.vue'
import Spinner from '@/components/common/Spinner.vue'
import {
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon
} from '@heroicons/vue/24/outline'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const eventId = ref(route.params.id)
const event = ref(null)
const orders = ref([])
const searchQuery = ref('')
const selectedStatus = ref('all')

const pagination = ref({
  currentPage: 1,
  totalPages: 1,
  totalItems: 0,
  perPage: 20
})

const statusOptions = [
  { value: 'all', label: 'All Orders' },
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' }
]

const getStatusBadge = (status) => {
  const badges = {
    pending: { variant: 'warning', text: 'Pending', icon: ClockIcon },
    completed: { variant: 'success', text: 'Completed', icon: CheckCircleIcon },
    cancelled: { variant: 'danger', text: 'Cancelled', icon: XCircleIcon }
  }
  return badges[status] || badges.pending
}

const filteredOrders = computed(() => {
  let result = orders.value

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(order =>
      order.order_number?.toLowerCase().includes(query) ||
      order.customer_name?.toLowerCase().includes(query) ||
      order.customer_email?.toLowerCase().includes(query)
    )
  }

  if (selectedStatus.value !== 'all') {
    result = result.filter(order => order.status === selectedStatus.value)
  }

  return result
})

const fetchOrders = async () => {
  loading.value = true
  try {
    const [eventRes, ordersRes] = await Promise.all([
      eventsAPI.getEventById(eventId.value),
      ordersAPI.getEventOrders(eventId.value, {
        page: pagination.value.currentPage,
        limit: pagination.value.perPage
      })
    ])
    
    event.value = eventRes.data.data
    orders.value = ordersRes.data.data || []
    pagination.value.totalItems = ordersRes.data.pagination?.total || 0
    pagination.value.totalPages = Math.ceil(pagination.value.totalItems / pagination.value.perPage)
  } catch (error) {
    console.error('Failed to fetch orders:', error)
  } finally {
    loading.value = false
  }
}

const formatPrice = (price) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(price)
}

const handlePageChange = (page) => {
  pagination.value.currentPage = page
  fetchOrders()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const exportOrders = () => {
  alert('Export orders feature - TODO')
}

onMounted(() => {
  fetchOrders()
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
        <h1 class="text-2xl font-bold text-gray-900">Order Management</h1>
        <p v-if="event" class="text-gray-600 mt-1">{{ event.title }}</p>
      </div>
      <Button variant="secondary" @click="exportOrders">
        <ArrowDownTrayIcon class="w-5 h-5" />
        Export
      </Button>
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
              placeholder="Search by order number, customer..."
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

    <!-- Orders Table -->
    <Card v-else-if="filteredOrders.length > 0" no-padding>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 border-b">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Order #
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Customer
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tickets
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr
              v-for="order in filteredOrders"
              :key="order.order_id"
              class="hover:bg-gray-50"
            >
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="font-medium text-gray-900">#{{ order.order_number }}</span>
              </td>
              <td class="px-6 py-4">
                <div class="text-sm">
                  <p class="font-medium text-gray-900">{{ order.customer_name }}</p>
                  <p class="text-gray-500">{{ order.customer_email }}</p>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="text-sm text-gray-900">{{ order.total_quantity }} ticket(s)</span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="text-sm font-medium text-gray-900">
                  {{ formatPrice(order.total_amount) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <Badge :variant="getStatusBadge(order.status).variant">
                  <component :is="getStatusBadge(order.status).icon" class="w-4 h-4" />
                  {{ getStatusBadge(order.status).text }}
                </Badge>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ new Date(order.created_at).toLocaleDateString() }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm">
                <Button
                  variant="ghost"
                  size="sm"
                  @click="() => alert(`View order details: ${order.order_id}`)"
                >
                  View
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
      <p class="text-gray-500">No orders found</p>
    </Card>
  </div>
</template>