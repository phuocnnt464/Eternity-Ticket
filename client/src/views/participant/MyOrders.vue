<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { ordersAPI } from '@/api/orders.js'
import Badge from '@/components/common/Badge.vue'
import Button from '@/components/common/Button.vue'
import Pagination from '@/components/common/Pagination.vue'
import Spinner from '@/components/common/Spinner.vue'
import {
  ShoppingBagIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowDownTrayIcon
} from '@heroicons/vue/24/outline'

const authStore = useAuthStore()

const orders = ref([])
const loading = ref(true)
const selectedStatus = ref('all')

const pagination = ref({
  currentPage: 1,
  totalPages: 1,
  totalItems: 0,
  perPage: 10
})

const statusOptions = [
  { value: 'all', label: 'All Orders' },
  { value: 'pending', label: 'Pending Payment' },
  { value: 'paid', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'failed', label: 'Failed' }
]

const getStatusBadge = (status) => {
  const badges = {
    pending: { variant: 'warning', text: 'Pending', icon: ClockIcon },
    paid: { variant: 'success', text: 'Completed', icon: CheckCircleIcon },
    cancelled: { variant: 'danger', text: 'Cancelled', icon: XCircleIcon },
    failed: { variant: 'danger', text: 'Failed', icon: XCircleIcon }
  }
  return badges[status] || badges.pending
}

const filteredOrders = computed(() => {
  if (selectedStatus.value === 'all') {
    return orders.value
  }
  return orders.value.filter(order => order.status === selectedStatus.value)
})

const fetchOrders = async () => {
  loading.value = true
  try {
    const response = await ordersAPI.getUserOrders({
      page: pagination.value.currentPage,
      limit: pagination.value.perPage
    })
    
    orders.value = response.data.orders || []
    pagination.value.totalItems = response.data.pagination?.total || 0
    pagination.value.totalPages = Math.ceil(pagination.value.totalItems / pagination.value.perPage)
  } catch (error) {
    console.error('Failed to fetch orders:', error)
    orders.value = []
  } finally {
    loading.value = false
  }
}

const handleViewDetails = (order) => {
  // Navigate to order details (can be a modal or separate page)
  alert(`View order details: ${order.order_number}`)
}

const handleDownloadTickets = async (orderId) => {
  try {
    const response = await ordersAPI.downloadTicketsPDF(orderId)
    // Handle blob download
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `eternity-tickets-${orderId}.pdf`)
    document.body.appendChild(link)
    link.click()
    link.remove()
  } catch (error) {
    alert('Failed to download tickets')
  }
}

const handleCancelOrder = async (orderId) => {
  if (!confirm('Are you sure you want to cancel this order?')) return
  
  try {
    await ordersAPI.cancelOrder(orderId)
    await fetchOrders()
    alert('Order cancelled successfully')
  } catch (error) {
    alert(error.response?.data?.error?.message || 'Failed to cancel order')
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

onMounted(() => {
  fetchOrders()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-2xl font-bold text-gray-900">My Orders</h1>
      <p class="text-gray-600 mt-1">View your order history and status</p>
    </div>

    <!-- Filters -->
    <div class="card">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <button
            v-for="option in statusOptions"
            :key="option.value"
            @click="selectedStatus = option.value"
            :class="[
              'px-4 py-2 rounded-lg font-medium transition-colors',
              selectedStatus === option.value
                ? 'bg-primary-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            ]"
          >
            {{ option.label }}
          </button>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <Spinner size="xl" />
    </div>

    <!-- Orders List -->
    <div v-else-if="filteredOrders.length > 0" class="space-y-4">
      <div
        v-for="order in filteredOrders"
        :key="order.order_id"
        class="card hover:shadow-lg transition-shadow"
      >
        <div class="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <!-- Order Info -->
          <div class="flex-1">
            <div class="flex items-center space-x-3 mb-2">
              <h3 class="text-lg font-semibold">Order #{{ order.order_number }}</h3>
              <Badge :variant="getStatusBadge(order.status).variant">
                <component :is="getStatusBadge(order.status).icon" class="w-4 h-4" />
                {{ getStatusBadge(order.status).text }}
              </Badge>
            </div>

            <div class="space-y-1 text-sm text-gray-600">
              <p><strong>Event:</strong> {{ order.event_title }}</p>
              <p><strong>Date:</strong> {{ new Date(order.created_at).toLocaleString() }}</p>
              <p><strong>Tickets:</strong> {{ order.total_quantity }} ticket(s)</p>
              <p><strong>Total:</strong> <span class="text-primary-600 font-semibold">{{ formatPrice(order.total_amount) }}</span></p>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex flex-col space-y-2">
            <Button
              variant="secondary"
              size="sm"
              @click="handleViewDetails(order)"
            >
              View Details
            </Button>

            <Button
              v-if="order.status === 'paid'"
              variant="primary"
              size="sm"
              @click="handleDownloadTickets(order.id)"
            >
              <ArrowDownTrayIcon class="w-4 h-4" />
              Download Tickets
            </Button>

            <Button
              v-if="order.status === 'pending'"
              variant="danger"
              size="sm"
              @click="handleCancelOrder(order.id)"
            >
              Cancel Order
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
        <ShoppingBagIcon class="w-10 h-10 text-gray-400" />
      </div>
      <h3 class="text-xl font-semibold text-gray-900 mb-2">No orders found</h3>
      <p class="text-gray-600 mb-6">
        {{ selectedStatus !== 'all' 
          ? 'No orders with this status' 
          : 'You haven\'t made any purchases yet' 
        }}
      </p>
      <RouterLink to="/events" class="btn-primary">
        Browse Events
      </RouterLink>
    </div>
  </div>
</template>