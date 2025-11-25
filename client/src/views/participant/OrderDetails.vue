<!-- client/src/views/participant/OrderDetail.vue -->

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ordersAPI } from '@/api/orders.js'
import Button from '@/components/common/Button.vue'
import Badge from '@/components/common/Badge.vue'
import Spinner from '@/components/common/Spinner.vue'
import {
  ArrowLeftIcon,
  ShoppingBagIcon,
  CalendarIcon,
  MapPinIcon,
  TicketIcon,
  CreditCardIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  ArrowDownTrayIcon
} from '@heroicons/vue/24/outline'

const route = useRoute()
const router = useRouter()

const order = ref(null)
const loading = ref(true)
const error = ref(null)

const getStatusBadge = (status) => {
  const badges = {
    pending: { variant: 'warning', text: 'Pending Payment', icon: ClockIcon },
    paid: { variant: 'success', text: 'Paid', icon: CheckCircleIcon },
    failed: { variant: 'danger', text: 'Payment Failed', icon: XCircleIcon },
    cancelled: { variant: 'secondary', text: 'Cancelled', icon: XCircleIcon },
    expired: { variant: 'danger', text: 'Expired', icon: XCircleIcon }
  }
  return badges[status] || badges.pending
}

const fetchOrderDetails = async () => {
  loading.value = true
  error.value = null
  
  try {
    const response = await ordersAPI.getOrder(route.params.orderId)
    order.value = response.data.order
    console.log('✅ Order details loaded:', order.value)
  } catch (err) {
    console.error('❌ Failed to load order:', err)
    error.value = err.response?.data?.message || 'Failed to load order details'
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

const formatDate = (date) => {
  return new Date(date).toLocaleString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const handleDownloadTickets = async () => {
  try {
    const response = await ordersAPI.downloadTicketsPDF(order.value.id)
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `tickets-${order.value.order_number}.pdf`)
    document.body.appendChild(link)
    link.click()
    link.remove()
  } catch (error) {
    alert('Failed to download tickets')
  }
}

const handleCancelOrder = async () => {
  if (!confirm('Are you sure you want to cancel this order?')) return
  
  try {
    await ordersAPI.cancelOrder(order.value.id)
    alert('Order cancelled successfully')
    router.push({ name: 'MyOrders' })
  } catch (error) {
    alert(error.response?.data?.message || 'Failed to cancel order')
  }
}

onMounted(() => {
  fetchOrderDetails()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Back Button -->
    <button
      @click="router.push({ name: 'MyOrders' })"
      class="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
    >
      <ArrowLeftIcon class="w-5 h-5 mr-2" />
      Back to My Orders
    </button>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <Spinner size="xl" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="card text-center py-12">
      <XCircleIcon class="w-16 h-16 text-red-500 mx-auto mb-4" />
      <h3 class="text-xl font-semibold text-gray-900 mb-2">Failed to Load Order</h3>
      <p class="text-gray-600 mb-6">{{ error }}</p>
      <Button variant="primary" @click="router.push({ name: 'MyOrders' })">
        Back to Orders
      </Button>
    </div>

    <!-- Order Details -->
    <div v-else-if="order" class="space-y-6">
      <!-- Header -->
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h1 class="text-2xl font-bold text-gray-900 mb-2">
              Order #{{ order.order_number }}
            </h1>
            <Badge :variant="getStatusBadge(order.status).variant">
              <component :is="getStatusBadge(order.status).icon" class="w-4 h-4" />
              {{ getStatusBadge(order.status).text }}
            </Badge>
          </div>
          
          <div class="flex space-x-3">
            <Button
              v-if="order.status === 'paid'"
              variant="primary"
              @click="handleDownloadTickets"
            >
              <ArrowDownTrayIcon class="w-5 h-5 mr-2" />
              Download Tickets
            </Button>
            
            <Button
              v-if="order.status === 'pending'"
              variant="danger"
              @click="handleCancelOrder"
            >
              Cancel Order
            </Button>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span class="text-gray-600">Order Date:</span>
            <span class="ml-2 font-medium text-gray-900">{{ formatDate(order.created_at) }}</span>
          </div>
          <div v-if="order.paid_at">
            <span class="text-gray-600">Paid At:</span>
            <span class="ml-2 font-medium text-gray-900">{{ formatDate(order.paid_at) }}</span>
          </div>
          <div v-if="order.payment_method">
            <span class="text-gray-600">Payment Method:</span>
            <span class="ml-2 font-medium text-gray-900 uppercase">{{ order.payment_method }}</span>
          </div>
          <div v-if="order.payment_transaction_id">
            <span class="text-gray-600">Transaction ID:</span>
            <span class="ml-2 font-mono text-xs text-gray-900">{{ order.payment_transaction_id }}</span>
          </div>
        </div>
      </div>

      <!-- Event Info -->
      <div class="card">
        <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <CalendarIcon class="w-5 h-5 mr-2" />
          Event Information
        </h2>
        <div class="space-y-3">
          <div>
            <p class="text-sm text-gray-600">Event</p>
            <p class="font-medium text-gray-900">{{ order.event_title }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600">Session</p>
            <p class="font-medium text-gray-900">{{ order.session_title }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600">Date & Time</p>
            <p class="font-medium text-gray-900">{{ formatDate(order.session_start_time) }}</p>
          </div>
          <div v-if="order.venue_name">
            <p class="text-sm text-gray-600 flex items-center">
              <MapPinIcon class="w-4 h-4 mr-1" />
              Venue
            </p>
            <p class="font-medium text-gray-900">{{ order.venue_name }}</p>
          </div>
        </div>
      </div>

      <!-- Ticket Details -->
      <div class="card">
        <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <TicketIcon class="w-5 h-5 mr-2" />
          Ticket Details
        </h2>
        <div class="space-y-3">
          <div
            v-for="item in order.items"
            :key="item.id"
            class="flex justify-between items-center p-4 bg-gray-50 rounded-lg"
          >
            <div>
              <p class="font-medium text-gray-900">{{ item.ticket_type_name }}</p>
              <p class="text-sm text-gray-600">Quantity: {{ item.quantity }} × {{ formatPrice(item.unit_price) }}</p>
            </div>
            <p class="font-semibold text-gray-900">{{ formatPrice(item.total_price) }}</p>
          </div>
        </div>
      </div>

      <!-- Customer Info -->
      <div class="card">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Customer Information</h2>
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p class="text-gray-600">Name</p>
            <p class="font-medium text-gray-900">
              {{ order.customer_info?.first_name }} {{ order.customer_info?.last_name }}
            </p>
          </div>
          <div>
            <p class="text-gray-600">Email</p>
            <p class="font-medium text-gray-900">{{ order.customer_info?.email }}</p>
          </div>
          <div>
            <p class="text-gray-600">Phone</p>
            <p class="font-medium text-gray-900">{{ order.customer_info?.phone }}</p>
          </div>
        </div>
      </div>

      <!-- Payment Summary -->
      <div class="card">
        <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <CreditCardIcon class="w-5 h-5 mr-2" />
          Payment Summary
        </h2>
        <div class="space-y-2">
          <div class="flex justify-between text-sm">
            <span class="text-gray-600">Subtotal</span>
            <span class="text-gray-900">{{ formatPrice(order.subtotal) }}</span>
          </div>
          <div v-if="order.membership_discount > 0" class="flex justify-between text-sm text-green-600">
            <span>Membership Discount</span>
            <span>-{{ formatPrice(order.membership_discount) }}</span>
          </div>
          <div v-if="order.coupon_discount > 0" class="flex justify-between text-sm text-green-600">
            <span>Coupon Discount ({{ order.coupon_code }})</span>
            <span>-{{ formatPrice(order.coupon_discount) }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-600">VAT (10%)</span>
            <span class="text-gray-900">{{ formatPrice(order.vat_amount) }}</span>
          </div>
          <div class="border-t pt-2 flex justify-between text-lg font-bold">
            <span class="text-gray-900">Total</span>
            <span class="text-primary-600">{{ formatPrice(order.total_amount) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>