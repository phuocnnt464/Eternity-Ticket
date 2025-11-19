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
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  ShoppingBagIcon,
  UserIcon,
  CalendarIcon,
  CreditCardIcon,
  TicketIcon,
  ArrowDownTrayIcon
} from '@heroicons/vue/24/outline'
import { toast } from 'vue3-toastify'

const loading = ref(true)
const orders = ref([])
const searchQuery = ref('')
const selectedStatus = ref('all')
const selectedEvent = ref('all')
const showDetailModal = ref(false)
const selectedOrder = ref(null)
const orderDetails = ref(null)
const loadingDetails = ref(false)

const pagination = ref({
  currentPage: 1,
  totalPages: 1,
  totalItems: 0,
  perPage: 20
})

const statusOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'refunded', label: 'Refunded' }
]

const getStatusBadge = (status) => {
  const badges = {
    pending: { variant: 'warning', text: 'Pending' },
    paid: { variant: 'success', text: 'Paid' },
    failed: { variant: 'danger', text: 'Failed' },
    cancelled: { variant: 'secondary', text: 'Cancelled' },
    refunded: { variant: 'info', text: 'Refunded' }
  }
  return badges[status] || { variant: 'secondary', text: status }
}

const filteredOrders = computed(() => {
  let result = orders.value

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(order =>
      order.order_number?.toLowerCase().includes(query) ||
      order.customer_name?.toLowerCase().includes(query) ||
      order.customer_email?.toLowerCase().includes(query) ||
      order.event_title?.toLowerCase().includes(query)
    )
  }

  if (selectedStatus.value !== 'all') {
    result = result.filter(order => order.status === selectedStatus.value)
  }

  return result
})

const totalRevenue = computed(() => {
  return orders.value
    .filter(o => o.status === 'paid')
    .reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0)
})

const fetchOrders = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.value.currentPage,
      limit: pagination.value.perPage
    }
    
    if (selectedStatus.value !== 'all') {
      params.status = selectedStatus.value
    }
    
    const response = await adminAPI.getAllOrders(params)
    
    orders.value = response.data?.orders || []
    
    const paginationData = response.data?.pagination || {}
    pagination.value.totalItems = paginationData.total_count || 0
    pagination.value.totalPages = paginationData.total_pages || Math.ceil(paginationData.total_count / pagination.value.perPage) || 1
    pagination.value.currentPage = paginationData.current_page || 1
    
    console.log('✅ Loaded orders:', orders.value.length)
  } catch (error) {
    console.error('❌ Failed to fetch orders:', error)
    toast.error('Failed to load orders', {
      position: 'top-right',
      autoClose: 3000
    })
  } finally {
    loading.value = false
  }
}

const handleViewDetails = async (order) => {
  selectedOrder.value = order
  showDetailModal.value = true
  loadingDetails.value = true
  
  try {
    const response = await adminAPI.getOrderDetails(order.id)
    orderDetails.value = response.data?.order || null
    console.log('✅ Order details loaded:', orderDetails.value)
  } catch (error) {
    console.error('❌ Failed to fetch order details:', error)
    toast.error('Failed to load order details', {
      position: 'top-right',
      autoClose: 3000
    })
  } finally {
    loadingDetails.value = false
  }
}

const handleExport = () => {
  try {
    if (filteredOrders.value.length === 0) {
      toast.error('No orders to export', {
        position: 'top-right',
        autoClose: 2000
      })
      return
    }
    
    // CSV headers
    const headers = ['Order Number', 'Customer', 'Email', 'Event', 'Tickets', 'Amount', 'Status', 'Created At']
    const csvRows = [headers.join(',')]
    
    // Data rows
    filteredOrders.value.forEach(order => {
      const row = [
        `"${order.order_number || 'N/A'}"`,
        `"${order.customer_name || 'N/A'}"`,
        `"${order.customer_email || 'N/A'}"`,
        `"${(order.event_title || 'N/A').replace(/"/g, '""')}"`,
        `"${order.ticket_count || 0}"`,
        `"${formatCurrency(order.total_amount)}"`,
        `"${order.status || 'N/A'}"`,
        `"${formatDate(order.created_at)}"`
      ]
      csvRows.push(row.join(','))
    })
    
    // Create CSV
    const csvContent = csvRows.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    
    // Download
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `orders-${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
    
    toast.success(`Exported ${filteredOrders.value.length} orders successfully!`, {
      position: 'top-right',
      autoClose: 2000
    })
  } catch (error) {
    console.error('❌ Export error:', error)
    toast.error('Failed to export orders', {
      position: 'top-right',
      autoClose: 3000
    })
  }
}

const handlePageChange = (page) => {
  pagination.value.currentPage = page
  fetchOrders()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount || 0)
}

const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
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
        <h1 class="text-2xl font-bold text-gray-900">Order Management</h1>
        <p class="text-gray-600 mt-1">Monitor and manage all orders in the system</p>
      </div>
      <Button variant="secondary" @click="handleExport">
        <ArrowDownTrayIcon class="w-5 h-5" />
        Export Orders
      </Button>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
      <Card>
        <div class="text-center">
          <p class="text-gray-600 text-sm mb-2">Total Orders</p>
          <p class="text-3xl font-bold text-gray-900">{{ pagination.totalItems }}</p>
        </div>
      </Card>
      <Card>
        <div class="text-center">
          <p class="text-gray-600 text-sm mb-2">Paid Orders</p>
          <p class="text-3xl font-bold text-green-600">
            {{ orders.filter(o => o.status === 'paid').length }}
          </p>
        </div>
      </Card>
      <Card>
        <div class="text-center">
          <p class="text-gray-600 text-sm mb-2">Pending Orders</p>
          <p class="text-3xl font-bold text-yellow-600">
            {{ orders.filter(o => o.status === 'pending').length }}
          </p>
        </div>
      </Card>
      <Card>
        <div class="text-center">
          <p class="text-gray-600 text-sm mb-2">Total Revenue</p>
          <p class="text-2xl font-bold text-purple-600">
            {{ formatCurrency(totalRevenue) }}
          </p>
        </div>
      </Card>
    </div>

    <!-- Filters -->
    <Card>
      <div class="space-y-4">
        <!-- Search -->
        <div class="relative">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search by order number, customer, or event..."
            class="input pl-10"
          />
          <MagnifyingGlassIcon class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>

        <!-- Filters Row -->
        <div class="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
          <div class="flex items-center space-x-2">
            <FunnelIcon class="w-5 h-5 text-gray-400" />
            <select v-model="selectedStatus" class="select" @change="fetchOrders">
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
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order #</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tickets</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr
              v-for="order in filteredOrders"
              :key="order.id"
              class="hover:bg-gray-50"
            >
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center space-x-2">
                  <ShoppingBagIcon class="w-4 h-4 text-gray-400" />
                  <span class="text-sm font-mono font-medium text-gray-900">
                    {{ order.order_number }}
                  </span>
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center space-x-2">
                  <UserIcon class="w-4 h-4 text-gray-400" />
                  <div class="text-sm">
                    <p class="font-medium text-gray-900">{{ order.customer_name }}</p>
                    <p class="text-gray-500">{{ order.customer_email }}</p>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <span class="text-sm text-gray-900 line-clamp-2">
                  {{ order.event_title }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-center">
                <div class="flex items-center justify-center space-x-1">
                  <TicketIcon class="w-4 h-4 text-gray-400" />
                  <span class="text-sm font-medium text-gray-900">
                    {{ order.ticket_count || 0 }}
                  </span>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="text-sm font-semibold text-gray-900">
                  {{ formatCurrency(order.total_amount) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <Badge :variant="getStatusBadge(order.status).variant">
                  {{ getStatusBadge(order.status).text }}
                </Badge>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ formatDate(order.created_at) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <Button
                  variant="ghost"
                  size="sm"
                  @click="handleViewDetails(order)"
                >
                  <EyeIcon class="w-4 h-4" />
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
      <ShoppingBagIcon class="w-16 h-16 text-gray-400 mx-auto mb-4" />
      <h3 class="text-xl font-semibold text-gray-900 mb-2">No orders found</h3>
      <p class="text-gray-600">
        {{ searchQuery || selectedStatus !== 'all'
          ? 'Try adjusting your filters'
          : 'Orders will appear here once customers make purchases'
        }}
      </p>
    </Card>

    <!-- Order Detail Modal -->
    <Modal
      v-model="showDetailModal"
      title="Order Details"
      size="lg"
    >
      <div v-if="loadingDetails" class="flex justify-center py-8">
        <Spinner size="lg" />
      </div>

      <div v-else-if="orderDetails" class="space-y-6">
        <!-- Order Info -->
        <div class="border-b pb-4">
          <div class="flex items-center justify-between mb-4">
            <div>
              <p class="text-sm text-gray-600">Order Number</p>
              <p class="text-lg font-mono font-bold text-gray-900">
                {{ orderDetails.order_number }}
              </p>
            </div>
            <Badge :variant="getStatusBadge(orderDetails.status).variant" class="text-base px-4 py-2">
              {{ getStatusBadge(orderDetails.status).text }}
            </Badge>
          </div>
        </div>

        <!-- Customer Info -->
        <div>
          <h4 class="font-semibold text-gray-900 mb-3 flex items-center space-x-2">
            <UserIcon class="w-5 h-5" />
            <span>Customer Information</span>
          </h4>
          <div class="bg-gray-50 rounded-lg p-4 space-y-2">
            <div class="flex justify-between">
              <span class="text-sm text-gray-600">Name:</span>
              <span class="text-sm font-medium text-gray-900">{{ orderDetails.customer_name }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm text-gray-600">Email:</span>
              <span class="text-sm font-medium text-gray-900">{{ orderDetails.customer_email }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm text-gray-600">Phone:</span>
              <span class="text-sm font-medium text-gray-900">{{ orderDetails.phone || 'N/A' }}</span>
            </div>
          </div>
        </div>

        <!-- Event Info -->
        <div>
          <h4 class="font-semibold text-gray-900 mb-3 flex items-center space-x-2">
            <CalendarIcon class="w-5 h-5" />
            <span>Event Information</span>
          </h4>
          <div class="bg-gray-50 rounded-lg p-4 space-y-2">
            <div class="flex justify-between">
              <span class="text-sm text-gray-600">Event:</span>
              <span class="text-sm font-medium text-gray-900">{{ orderDetails.event_title }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm text-gray-600">Date:</span>
              <span class="text-sm font-medium text-gray-900">{{ formatDate(orderDetails.event_date) }}</span>
            </div>
          </div>
        </div>

        <!-- Tickets -->
        <div v-if="orderDetails.items && orderDetails.items.length > 0">
          <h4 class="font-semibold text-gray-900 mb-3 flex items-center space-x-2">
            <TicketIcon class="w-5 h-5" />
            <span>Ticket Details</span>
          </h4>
          <div class="space-y-2">
            <div
              v-for="item in orderDetails.items"
              :key="item.id"
              class="bg-gray-50 rounded-lg p-4 flex justify-between items-center"
            >
              <div>
                <p class="font-medium text-gray-900">{{ item.ticket_type_name }}</p>
                <p class="text-sm text-gray-600">Quantity: {{ item.quantity }}</p>
              </div>
              <p class="font-semibold text-gray-900">
                {{ formatCurrency(item.price * item.quantity) }}
              </p>
            </div>
          </div>
        </div>

        <!-- Payment Info -->
        <div>
          <h4 class="font-semibold text-gray-900 mb-3 flex items-center space-x-2">
            <CreditCardIcon class="w-5 h-5" />
            <span>Payment Information</span>
          </h4>
          <div class="bg-gray-50 rounded-lg p-4 space-y-2">
            <div class="flex justify-between">
              <span class="text-sm text-gray-600">Subtotal:</span>
              <span class="text-sm font-medium text-gray-900">{{ formatCurrency(orderDetails.subtotal) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm text-gray-600">Fee:</span>
              <span class="text-sm font-medium text-gray-900">{{ formatCurrency(orderDetails.fee || 0) }}</span>
            </div>
            <div class="flex justify-between pt-2 border-t">
              <span class="font-semibold text-gray-900">Total:</span>
              <span class="font-bold text-lg text-primary-600">{{ formatCurrency(orderDetails.total_amount) }}</span>
            </div>
            <div class="flex justify-between pt-2">
              <span class="text-sm text-gray-600">Payment Method:</span>
              <span class="text-sm font-medium text-gray-900">{{ orderDetails.payment_method || 'N/A' }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm text-gray-600">Transaction ID:</span>
              <span class="text-sm font-mono text-gray-900">{{ orderDetails.transaction_id || 'N/A' }}</span>
            </div>
          </div>
        </div>

        <!-- Timestamps -->
        <div class="bg-gray-50 rounded-lg p-4 space-y-2">
          <div class="flex justify-between">
            <span class="text-sm text-gray-600">Created At:</span>
            <span class="text-sm font-medium text-gray-900">{{ formatDate(orderDetails.created_at) }}</span>
          </div>
          <div v-if="orderDetails.paid_at" class="flex justify-between">
            <span class="text-sm text-gray-600">Paid At:</span>
            <span class="text-sm font-medium text-green-600">{{ formatDate(orderDetails.paid_at) }}</span>
          </div>
          <div v-if="orderDetails.updated_at" class="flex justify-between">
            <span class="text-sm text-gray-600">Updated At:</span>
            <span class="text-sm font-medium text-gray-900">{{ formatDate(orderDetails.updated_at) }}</span>
          </div>
        </div>
      </div>

      <div v-else class="text-center py-8 text-gray-500">
        Failed to load order details
      </div>

      <template #footer>
        <div class="flex justify-end">
          <Button variant="secondary" @click="showDetailModal = false">
            Close
          </Button>
        </div>
      </template>
    </Modal>
  </div>
</template>