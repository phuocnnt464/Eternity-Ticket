<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ordersAPI } from '@/api/orders.js'
import Card from '@/components/common/Card.vue'
import Button from '@/components/common/Button.vue'
import Spinner from '@/components/common/Spinner.vue'
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon 
} from '@heroicons/vue/24/outline'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const paymentStatus = ref(null)
const orderNumber = ref(null)
const message = ref('')
const orderData = ref(null)

onMounted(async () => {
  // Get query params from VNPay
  const status = route.query.status
  const order = route.query.order
  const errorMessage = route.query.message
  const errorCode = route.query.code

  orderNumber.value = order

  if (status === 'success') {
    paymentStatus.value = 'success'
    message.value = 'Payment completed successfully!'
    
    // Fetch order details
    if (order) {
      try {
        const response = await ordersAPI.getUserOrders({ 
          page: 1, 
          limit: 10 
        })
        const foundOrder = response.data.orders.find(o => o.order_number === order)
        if (foundOrder) {
          orderData.value = foundOrder
        }
      } catch (error) {
        console.error('Failed to fetch order:', error)
      }
    }
  } else if (status === 'failed') {
    paymentStatus.value = 'failed'
    if (errorMessage) {
      message.value = `Payment failed: ${errorMessage.replace(/_/g, ' ')}`
    } else if (errorCode) {
      message.value = `Payment failed with code: ${errorCode}`
    } else {
      message.value = 'Payment failed. Please try again.'
    }
  } else if (status === 'error') {
    paymentStatus.value = 'error'
    message.value = 'An error occurred during payment processing.'
  } else {
    paymentStatus.value = 'pending'
    message.value = 'Payment is being processed...'
  }

  loading.value = false
})

const goToOrders = () => {
  router.push({ name: 'MyOrders' })
}

const goHome = () => {
  router.push({ name: 'Home' })
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 py-12">
    <div class="container-custom max-w-2xl">
      <Card v-if="loading">
        <div class="text-center py-12">
          <Spinner size="xl" />
          <p class="text-gray-600 mt-4">Processing payment result...</p>
        </div>
      </Card>

      <!-- Success -->
      <Card v-else-if="paymentStatus === 'success'" class="text-center">
        <div class="flex flex-col items-center py-8">
          <div class="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
            <CheckCircleIcon class="w-12 h-12 text-green-600" />
          </div>
          
          <h1 class="text-3xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
          <p class="text-gray-600 mb-8">{{ message }}</p>

          <div v-if="orderNumber" class="bg-gray-50 rounded-lg p-6 mb-8 w-full max-w-md">
            <div class="space-y-3">
              <div class="flex justify-between">
                <span class="text-sm text-gray-600">Order Number:</span>
                <span class="text-sm font-semibold text-gray-900">{{ orderNumber }}</span>
              </div>
              <div v-if="orderData" class="flex justify-between">
                <span class="text-sm text-gray-600">Total Amount:</span>
                <span class="text-sm font-semibold text-gray-900">
                  {{ (orderData.total_amount).toLocaleString('vi-VN') }} VNĐ
                </span>
              </div>
              <div v-if="orderData" class="flex justify-between">
                <span class="text-sm text-gray-600">Payment Method:</span>
                <span class="text-sm font-semibold text-gray-900">VNPay</span>
              </div>
            </div>
          </div>

          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 w-full max-w-md">
            <p class="text-sm text-blue-800">
              <strong>✅ Your tickets have been confirmed!</strong><br>
              Check your email for the order confirmation and ticket details.
            </p>
          </div>

          <div class="flex space-x-4">
            <Button variant="secondary" @click="goHome">
              Back to Home
            </Button>
            <Button variant="primary" @click="goToOrders">
              View My Orders
            </Button>
          </div>
        </div>
      </Card>

      <!-- Failed -->
      <Card v-else-if="paymentStatus === 'failed'" class="text-center">
        <div class="flex flex-col items-center py-8">
          <div class="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-6">
            <XCircleIcon class="w-12 h-12 text-red-600" />
          </div>
          
          <h1 class="text-3xl font-bold text-gray-900 mb-2">Payment Failed</h1>
          <p class="text-gray-600 mb-8">{{ message }}</p>

          <div v-if="orderNumber" class="bg-gray-50 rounded-lg p-6 mb-6 w-full max-w-md">
            <div class="space-y-3">
              <div class="flex justify-between">
                <span class="text-sm text-gray-600">Order Number:</span>
                <span class="text-sm font-semibold text-gray-900">{{ orderNumber }}</span>
              </div>
            </div>
          </div>

          <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 w-full max-w-md">
            <p class="text-sm text-yellow-800">
              <strong>⚠️ Your order is still reserved for 15 minutes.</strong><br>
              You can try payment again from "My Orders" page.
            </p>
          </div>

          <div class="flex space-x-4">
            <Button variant="secondary" @click="goHome">
              Back to Home
            </Button>
            <Button variant="primary" @click="goToOrders">
              Try Again
            </Button>
          </div>
        </div>
      </Card>

      <!-- Error -->
      <Card v-else class="text-center">
        <div class="flex flex-col items-center py-8">
          <div class="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-6">
            <ClockIcon class="w-12 h-12 text-gray-600" />
          </div>
          
          <h1 class="text-3xl font-bold text-gray-900 mb-2">Processing...</h1>
          <p class="text-gray-600 mb-8">{{ message }}</p>

          <Button variant="primary" @click="goToOrders">
            View My Orders
          </Button>
        </div>
      </Card>
    </div>
  </div>
</template>