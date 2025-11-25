<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ordersAPI } from '@/api/orders.js'
import { queueAPI } from '@/api/queue.js'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'
import OrderSummary from '@/components/features/OrderSummary.vue'
import Button from '@/components/common/Button.vue'
import Input from '@/components/common/Input.vue'
import Spinner from '@/components/common/Spinner.vue'
import { ArrowLeftIcon } from '@heroicons/vue/24/outline'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const cartStore = useCartStore()

const loading = ref(false)
const currentStep = ref(1) // ✅ 1 = Customer Info, 2 = Payment
const customerInfo = ref({
  first_name: '',
  last_name: '',
  email: '',
  phone: ''
})
const couponCode = ref('')
const couponDiscount = ref(0)

// ✅ Order state
const createdOrder = ref(null)
const paymentMethod = ref('cash')
const processingPayment = ref(false)

// ✅ Timer state (15 phút từ queue active slot)
const slotExpiryTime = ref(null)
const timeRemaining = ref(null)
const countdownInterval = ref(null)

const event = computed(() => cartStore.event)
const session = computed(() => cartStore.session)
const tickets = computed(() => cartStore.items)

const isCartValid = computed(() => {
  return event.value && session.value && cartStore.items.length > 0
})

const formatTimeRemaining = (seconds) => {
  if (!seconds || seconds <= 0) return '00:00'
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

// ✅ Start countdown từ queue slot expiry
const startSlotCountdown = (expiryTime) => {
  console.log('⏰ Starting slot countdown for:', expiryTime)
  slotExpiryTime.value = expiryTime
  
  if (countdownInterval.value) {
    clearInterval(countdownInterval.value)
  }
  
  const updateTimeRemaining = () => {
    const now = new Date()
    const expiry = new Date(expiryTime)
    const diff = Math.floor((expiry - now) / 1000)
    
    if (diff <= 0) {
      timeRemaining.value = 0
      clearInterval(countdownInterval.value)
      alert('⏰ Your purchase time has expired! Please join the queue again.')
      
      createdOrder.value = null
      cartStore.clear()
      
      router.push({
        name: 'EventDetail',
        params: { slug: route.params.slug }
      })
    } else {
      timeRemaining.value = diff
    }
  }
  
  updateTimeRemaining()
  countdownInterval.value = setInterval(updateTimeRemaining, 1000)
}

// ✅ Check queue status và lấy expires_at
const checkQueueStatusAndStartTimer = async () => {
  try {
    const response = await queueAPI.getStatus(session.value.id)
    const data = response.data.data
    
    console.log('🔍 Queue status check:', data)
    
    if (data?.status === 'active' && data?.expires_at) {
      console.log('✅ Active slot found, expires at:', data.expires_at)
      startSlotCountdown(data.expires_at)
      return true
    } else if (data?.status === 'waiting') {
      console.log('⏳ Still in queue, position:', data.queue_position)
      alert('You are still in the waiting queue. Please wait for your turn.')
      router.push({
        name: 'EventDetail',
        params: { slug: route.params.slug }
      })
      return false
    } else {
      console.warn('⚠️ No active queue slot found')
      // Nếu không có waiting room, cho phép tiếp tục
      return true
    }
  } catch (error) {
    console.error('Failed to check queue status:', error)
    // Nếu lỗi, vẫn cho phép tiếp tục (fallback)
    return true
  }
}

// ✅ STEP 1: Submit customer info (KHÔNG tạo order)
const handleSubmitCustomerInfo = () => {
  // Validate
  if (!customerInfo.value.first_name || !customerInfo.value.last_name || 
      !customerInfo.value.email || !customerInfo.value.phone) {
    alert('Please fill in all required fields')
    return
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(customerInfo.value.email)) {
    alert('Please enter a valid email address')
    return
  }

  // ✅ Chỉ chuyển sang step 2, KHÔNG tạo order
  console.log('✅ Customer info valid, moving to payment step')
  currentStep.value = 2
}

// ✅ STEP 2: Create order và process payment
const handleCreateOrderAndPay = async () => {
  // ✅ Kiểm tra còn thời gian không
  if (slotExpiryTime.value && new Date() >= new Date(slotExpiryTime.value)) {
    alert('⏰ Your purchase time has expired! Please join the queue again.')
    router.push({
      name: 'EventDetail',
      params: { slug: route.params.slug }
    })
    return
  }

  loading.value = true
  try {
    // ✅ BÂY GIỜ MỚI TẠO ORDER (sau khi chọn payment method)
    const orderData = {
      event_id: event.value.id,
      session_id: session.value.id,
      tickets: tickets.value.map(t => ({
        ticket_type_id: t.ticket_type_id,
        quantity: t.quantity
      })),
      customer_info: {
        first_name: customerInfo.value.first_name,
        last_name: customerInfo.value.last_name,
        email: customerInfo.value.email,
        phone: customerInfo.value.phone
      },
      coupon_code: couponCode.value || null
    }

    console.log('📦 Creating order:', orderData)
    
    const result = await ordersAPI.createOrder(orderData)
    
    if (result.success) {
      createdOrder.value = result.data.order
      console.log('✅ Order created:', createdOrder.value.order_number)
      
      // ✅ Proceed to payment
      await processPayment()
    }
  } catch (error) {
    console.error('Order creation failed:', error)
    alert(error.response?.data?.message || 'Failed to create order. Please try again.')
  } finally {
    loading.value = false
  }
}

const processPayment = async () => {
  processingPayment.value = true
  
  try {
    if (paymentMethod.value === 'vnpay') {
      // Redirect to VNPay
      const response = await ordersAPI.getVNPayURL(createdOrder.value.id)
      window.location.href = response.data.payment_url
    } else {
      // Mock payment
      router.push({
        name: 'PaymentGateway',
        query: {
          orderId: createdOrder.value.id,
          orderNumber: createdOrder.value.order_number
        }
      })
    }
  } catch (error) {
    console.error('Payment failed:', error)
    alert('Failed to process payment. Please try again.')
    processingPayment.value = false
  }
}

onMounted(async () => {
  // Load user info
  if (authStore.user) {
    customerInfo.value = {
      first_name: authStore.user.first_name || '',
      last_name: authStore.user.last_name || '',
      email: authStore.user.email,
      phone: authStore.user.phone || ''
    }
  }

  // ✅ Check queue status và start timer
  await checkQueueStatusAndStartTimer()
})

onBeforeUnmount(() => {
  if (countdownInterval.value) {
    clearInterval(countdownInterval.value)
  }
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="container-custom">
      <!-- Back Button -->
      <button
        @click="router.back()"
        class="flex items-center text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeftIcon class="w-5 h-5 mr-2" />
        Back
      </button>

      <!-- ✅ COUNTDOWN TIMER - Hiển thị 15 phút từ queue slot -->
      <div v-if="timeRemaining !== null" class="mb-6">
        <div class="flex justify-center">
          <div class="bg-orange-100 border-2 border-orange-500 rounded-lg px-6 py-4">
            <div class="flex items-center space-x-3">
              <div class="text-orange-600">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p class="text-sm text-orange-700 font-medium">Complete your purchase in</p>
                <p class="text-3xl font-bold text-orange-600">
                  {{ formatTimeRemaining(timeRemaining) }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Left: Checkout Form -->
        <div class="lg:col-span-2">
          <div class="card">
            <h1 class="text-2xl font-bold mb-6">Checkout</h1>

            <!-- ✅ STEP 1: CUSTOMER INFO -->
            <div v-if="currentStep === 1">
              <h2 class="text-lg font-semibold mb-4">1. Customer Information</h2>
              
              <div class="space-y-4">
                <div class="grid grid-cols-2 gap-4">
                  <Input
                    v-model="customerInfo.first_name"
                    label="First Name"
                    placeholder="John"
                    required
                  />
                  <Input
                    v-model="customerInfo.last_name"
                    label="Last Name"
                    placeholder="Doe"
                    required
                  />
                </div>

                <Input
                  v-model="customerInfo.email"
                  type="email"
                  label="Email"
                  placeholder="john@example.com"
                  required
                />

                <Input
                  v-model="customerInfo.phone"
                  type="tel"
                  label="Phone Number"
                  placeholder="+84 123 456 789"
                  required
                />

                <Button
                  variant="primary"
                  size="lg"
                  full-width
                  @click="handleSubmitCustomerInfo"
                >
                  Continue to Payment
                </Button>
              </div>
            </div>

            <!-- ✅ STEP 2: PAYMENT -->
            <div v-else-if="currentStep === 2">
              <h2 class="text-lg font-semibold mb-4">2. Payment Method</h2>
              
              <div class="space-y-4">
                <!-- Payment method selection -->
                <div class="space-y-3">
                  <label class="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:border-primary-500"
                         :class="paymentMethod === 'vnpay' ? 'border-primary-600 bg-primary-50' : 'border-gray-200'">
                    <input
                      type="radio"
                      v-model="paymentMethod"
                      value="vnpay"
                      class="mr-3"
                    />
                    <span class="font-medium">VNPay</span>
                  </label>

                  <label class="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:border-primary-500"
                         :class="paymentMethod === 'cash' ? 'border-primary-600 bg-primary-50' : 'border-gray-200'">
                    <input
                      type="radio"
                      v-model="paymentMethod"
                      value="cash"
                      class="mr-3"
                    />
                    <span class="font-medium">Cash / Bank Transfer (Mock)</span>
                  </label>
                </div>

                <div class="flex space-x-3">
                  <Button
                    variant="secondary"
                    @click="currentStep = 1"
                  >
                    Back
                  </Button>
                  
                  <Button
                    variant="primary"
                    size="lg"
                    full-width
                    :disabled="loading || processingPayment"
                    @click="handleCreateOrderAndPay"
                  >
                    <Spinner v-if="loading || processingPayment" size="sm" class="mr-2" />
                    {{ loading ? 'Creating Order...' : processingPayment ? 'Processing...' : 'Confirm & Pay' }}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Order Summary -->
        <div class="lg:col-span-1">
          <OrderSummary
            :items="tickets"
            :show-details="true"
          />
        </div>
      </div>
    </div>
  </div>
</template>