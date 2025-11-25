<script setup>
import { ref, computed, onMounted, onBeforeUnmount  } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useCartStore } from '@/stores/cart'
import { useAuthStore } from '@/stores/auth'
import { ordersAPI } from '@/api/orders.js'
import { eventsAPI } from '@/api/events.js'
import { queueAPI } from '@/api/queue.js'
import CheckoutForm from '@/components/features/CheckoutForm.vue'
import OrderSummary from '@/components/features/OrderSummary.vue'
import WaitingRoom from '@/components/features/WaitingRoom.vue'
import Button from '@/components/common/Button.vue'
import Spinner from '@/components/common/Spinner.vue'
import { ArrowLeftIcon, CheckCircleIcon, XCircleIcon, CreditCardIcon, ClockIcon } from '@heroicons/vue/24/outline'

const router = useRouter()
const route = useRoute()
const cartStore = useCartStore()
const authStore = useAuthStore()

const loading = ref(false)
const showWaitingRoom = ref(false)
const sessionId = ref(null)
const customerInfo = ref({})
const couponDiscount = ref(0)
const couponCode = ref('')

// ✅ Payment step states
const currentStep = ref(1) // 1 = Customer Info, 2 = Payment
const createdOrder = ref(null)
const paymentMethod = ref('cash')
const processingPayment = ref(false)
const paymentCountdown = ref(3)

// ✅ Order expiry countdown
const orderExpiryTime = ref(null)
const timeRemaining = ref(null)
const countdownInterval = ref(null)

const event = computed(() => cartStore.event)
const session = computed(() => cartStore.session)
const tickets = computed(() => cartStore.items)

const isCartValid = computed(() => {
  return event.value && session.value && cartStore.items.length > 0
})

const membershipDiscount = computed(() => {
  if (!authStore.isPremium) return 0
  
  const subtotal = tickets.value.reduce((sum, item) => sum + item.subtotal, 0)
  return subtotal * 0.1 // 10% discount for premium members
})

const formatPrice = (price) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(price)
}

const formatTimeRemaining = (seconds) => {
  if (!seconds || seconds <= 0) return '00:00'
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

// ✅ Start countdown timer
const startCountdown = (expiryTime) => {
  orderExpiryTime.value = expiryTime
  
  // Clear existing interval
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
      alert('Order has expired! Please create a new order.')
      router.push({ name: 'EventDetail', params: { slug: route.params.slug } })
    } else {
      timeRemaining.value = diff
    }
  }
  
  updateTimeRemaining()
  countdownInterval.value = setInterval(updateTimeRemaining, 1000)
}

const validateCoupon = async (code) => {
  try {
    const response = await eventsAPI.validateCoupon({
      event_id: event.value.event_id,
      coupon_code: code
    })
    
    couponCode.value = code
    couponDiscount.value = response.data.discount_amount
  } catch (error) {
    throw new Error(error.response?.data?.error?.message || 'Invalid coupon')
  }
}

const handleWaitingRoomReady = () => {
  showWaitingRoom.value = false
}

// const handleCheckout = async () => {
//   loading.value = true
//   try {
//     // Debug logs
//     console.log('🛒 Cart state:', {
//       event: event.value,
//       session: session.value,
//       items: tickets.value
//     })

//     console.log('🔍 Event ID:', event.value?.id)
//     console.log('🔍 Session ID:', session.value?.id)

//     // ✅ 1. Split full_name thành first_name và last_name
//     const nameParts = customerInfo.value.full_name.trim().split(' ')
//     const firstName = nameParts[0] || ''
//     const lastName = nameParts.slice(1).join(' ') || ''

//     // ✅ 2. Validate customer info
//     if (!firstName || !lastName) {
//       alert('Please enter both first name and last name')
//       loading.value = false
//       return
//     }

//     // ✅ 3. Create order with correct format
//     const orderData = {
//       event_id: event.value.id,           
//       session_id: session.value.id,       
//       tickets: tickets.value.map(t => ({
//         ticket_type_id: t.ticket_type_id,
//         quantity: t.quantity
//       })),
//       customer_info: {
//         first_name: firstName,          
//         last_name: lastName,              
//         email: customerInfo.value.email,
//         phone: customerInfo.value.phone
//       },
//       coupon_code: couponCode.value || undefined
//     }

//     console.log('📦 Order data to send:', orderData)

//     const response = await ordersAPI.createOrder(orderData)


//     const orderResult = response.data

//     if (!orderResult || !orderResult.order) {
//       throw new Error('Invalid order response from server')
//     }

//     const orderId = orderResult.order.id
//     const orderNumber = orderResult.order.order_number

//     console.log('✅ Order created:', {
//       id: orderId,
//       number: orderNumber,
//       tickets_count: orderResult.tickets_count
//     })

//      // ✅ USE MOCK PAYMENT instead of VNPay
//     try {
//       console.log('🎭 Processing mock payment...')
      
//       const paymentResponse = await ordersAPI.mockPayment(orderId, true) // true = success
//       console.log('✅ Payment response:', paymentResponse)
      
//       if (paymentResponse.success) {
//         // Clear cart before redirect
//         cartStore.clear()

//         // Redirect to payment result page
//         const redirectUrl = paymentResponse.data.redirect_url
//         window.location.href = redirectUrl
//       } else {
//         throw new Error(paymentResponse.message || 'Payment failed')
//       }

//     } catch (paymentError) {
//       console.error('❌ Payment error:', paymentError)
      
//       const errorMsg = paymentError.response?.data?.error?.message || paymentError.message
      
//       alert(`Payment failed: ${errorMsg}\n\nPlease try again or contact support.`)
      
//       router.push({
//         name: 'MyOrders',
//         // params: { orderId: orderId }
//       })
      
//       cartStore.clear()
//     }
//   } catch (error) {
//     console.error('❌ Order creation error:', error)
    
//     const errorMessage = error.response?.data?.error?.message 
//       || error.response?.data?.message 
//       || error.message 
//       || 'Order creation failed'
//     alert(errorMessage)
//     // alert(error.response?.data?.error?.message || 'Order creation failed')
//   } finally {
//     loading.value = false
//   }
// }

const handleCheckout = async () => {
  loading.value = true
  try {
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
      coupon_code: couponCode.value || undefined
    }

    const response = await ordersAPI.createOrder(orderData)
    const orderResult = response.data

    // const orderId = orderResult.order.id
    // const orderNumber = orderResult.order.order_number
    // const totalAmount = orderResult.order.total_amount

    createdOrder.value = {
      id: orderResult.order.id,
      order_number: orderResult.order.order_number,
      total_amount: orderResult.order.total_amount,
      reserved_until: orderResult.reserved_until
    }

    console.log('✅ Order created:', createdOrder.value)

    // ✅ Start countdown timer
    startCountdown(createdOrder.value.reserved_until)
    
    // console.log('✅ Order created:', { id: orderId, number: orderNumber })

    // ✅ Clear cart and redirect to Payment Gateway
    // cartStore.clear()
    
    // ✅ Move to payment step
    currentStep.value = 2

  } catch (error) {
    console.error('❌ Order creation error:', error)
    alert(error.response?.data?.error?.message || 'Order creation failed')
  } finally {
    loading.value = false
  }
}

// const processOrder = async () => {
//   loading.value = true

//   try {
//     const orderData = {
//       session_id: session.value.session_id,
//       tickets: tickets.value.map(t => ({
//         ticket_type_id: t.ticket_type_id,
//         quantity: t.quantity
//       })),
//       customer_info: customerInfo.value,
//       coupon_code: couponCode.value || undefined
//     }

//     const response = await ordersAPI.createOrder(orderData)
//     const order = response.data.order

//     // Redirect to payment
//     router.push({
//       name: 'MyOrders',
//       params: { orderId: order.order_id }
//     })

//     // Clear cart
//     cartStore.clearCart()
//   } catch (error) {
//     alert(error.response?.data?.error?.message || 'Order creation failed')
//   } finally {
//     loading.value = false
//   }
// }

// ✅ STEP 2: Process Payment
const handlePayment = async (success = true) => {
  processingPayment.value = true
  paymentCountdown.value = 3

  const timer = setInterval(async () => {
    paymentCountdown.value--
    if (paymentCountdown.value === 0) {
      clearInterval(timer)

      try {
        const transactionId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

        const response = await ordersAPI.processPayment(createdOrder.value.id, {
          payment_method: paymentMethod.value,
          payment_data: {
            mock: true,
            success: success,
            transaction_id: transactionId,
            payment_time: new Date().toISOString()
          }
        })

        if (response.success) {
          console.log('✅ Payment successful')
          
          // Clear cart
          cartStore.clear()

          // Redirect to success page
          router.push({
            path: '/participant/payment/result',
            query: {
              status: 'success',
              order: createdOrder.value.order_number,
              txn: transactionId
            }
          })
        } else {
          throw new Error('Payment failed')
        }
      } catch (error) {
        console.error('❌ Payment error:', error)
        alert('Payment failed. Please try again.')
        processingPayment.value = false
      }
    }
  }, 1000)
}

const handleBackToInfo = () => {
  currentStep.value = 1
}

const checkWaitingRoom = async () => {
  try {
    // Check if session has waiting room enabled
    const response = await queueAPI.getStatus(session.value.id)
    
    if (response.data?.waiting_room_enabled) {
      console.log('⏳ Waiting room enabled, showing waiting room...')
      showWaitingRoom.value = true
      sessionId.value = session.value.id
    } else {
      console.log('✅ No waiting room required')
      showWaitingRoom.value = false
    }
  } catch (error) {
    console.log('ℹ️ No waiting room config found, proceeding to checkout')
    showWaitingRoom.value = false
  }
}

onMounted(() => {
  if (!isCartValid.value) {
    router.push({
      name: 'EventDetail',
      params: { slug: route.params.slug }
    })
  }

  console.log('🎪 Session config:', session.value)

  await checkWaitingRoom()
  
  // if (session.value?.enable_waiting_room) {
  //   console.log('⏳ Entering waiting room...')
  //   showWaitingRoom.value = true
  //   sessionId.value = session.value.id
  // }

  // Pre-fill customer info from auth
  if (authStore.user) {
    customerInfo.value = {
      first_name: authStore.user.first_name || '',
      last_name: authStore.user.last_name || '',
      email: authStore.user.email,
      phone: authStore.user.phone || ''
    }
  }
})

onBeforeUnmount(() => {
  // Clear countdown on component unmount
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
        Back to Event
      </button>

      <!-- Progress Steps -->
      <div v-if="!showWaitingRoom && isCartValid" class="mb-8">
        <div class="flex items-center justify-center space-x-4">
          <div class="flex items-center">
            <div :class="[
              'w-10 h-10 rounded-full flex items-center justify-center font-semibold',
              currentStep >= 1 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'
            ]">
              1
            </div>
            <span class="ml-2 text-sm font-medium">Customer Info</span>
          </div>
          
          <div class="w-16 h-1 bg-gray-200">
            <div :class="[
              'h-full transition-all',
              currentStep >= 2 ? 'bg-primary-600' : 'bg-gray-200'
            ]" />
          </div>
          
          <div class="flex items-center">
            <div :class="[
              'w-10 h-10 rounded-full flex items-center justify-center font-semibold',
              currentStep >= 2 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'
            ]">
              2
            </div>
            <span class="ml-2 text-sm font-medium">Payment</span>
          </div>
        </div>

        <!-- ✅ Countdown Timer -->
        <div v-if="currentStep === 2 && timeRemaining !== null" class="mt-4 flex justify-center">
          <div :class="[
            'flex items-center gap-2 px-4 py-2 rounded-lg',
            timeRemaining < 120 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
          ]">
            <ClockIcon class="w-5 h-5" />
            <span class="font-semibold">
              Time remaining: {{ formatTimeRemaining(timeRemaining) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Waiting Room -->
      <div v-if="showWaitingRoom">
        <WaitingRoom
          :session-id="sessionId"
          @ready="handleWaitingRoomReady"
          @error="(msg) => { alert(msg); router.back(); }"
        />
      </div>

      <!-- STEP 1: Customer Info -->
      <div v-else-if="isCartValid && currentStep === 1" class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div class="lg:col-span-2">
          <!-- Event Info -->
          <div class="card mb-6">
            <div class="flex items-start space-x-4">
              <img
                v-if="event.thumbnail_image"
                :src="event.thumbnail_image"
                :alt="event.title"
                class="w-24 h-24 object-cover rounded-lg"
              />
              <div class="flex-1">
                <h2 class="text-xl font-bold mb-1">{{ event.title }}</h2>
                <p class="text-gray-600 text-sm mb-2">{{ event.venue_name }}</p>
                <p class="text-gray-600 text-sm">
                  {{ new Date(event.start_date).toLocaleString() }}
                </p>
              </div>
            </div>
          </div>

          <!-- Checkout Form -->
          <CheckoutForm
            v-model="customerInfo"
            :loading="loading"
            @validate-coupon="validateCoupon"
            @submit="handleCheckout"
          >
            <template #actions="{ submit, loading: formLoading }">
              <Button
                type="button"
                variant="primary"
                size="lg"
                full-width
                :loading="formLoading"
                @click="submit"
              >
                Continue to Payment
              </Button>
            </template>
          </CheckoutForm>
        </div>

        <div class="lg:col-span-1">
          <OrderSummary
            :items="tickets"
            :discount="couponDiscount"
            :membership-discount="membershipDiscount"
            :coupon-code="couponCode"
          />
        </div>
      </div>

      <!-- STEP 2: Payment -->
      <div v-else-if="isCartValid && currentStep === 2" class="max-w-2xl mx-auto">
        <!-- Processing -->
        <div v-if="processingPayment" class="card text-center space-y-6">
          <div class="flex justify-center">
            <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600"></div>
          </div>
          
          <div>
            <h2 class="text-2xl font-bold text-gray-900 mb-2">
              Processing Payment...
            </h2>
            <p class="text-gray-600">
              Please wait {{ paymentCountdown }} seconds
            </p>
          </div>
          
          <div class="bg-blue-50 p-4 rounded-lg">
            <p class="text-sm text-blue-800">
              🎭 <strong>Mock Payment Gateway</strong><br>
              This is a simulated payment for testing purposes
            </p>
          </div>
        </div>

        <!-- Payment Form -->
        <div v-else class="card space-y-6">
          <div class="text-center border-b pb-4">
            <h2 class="text-2xl font-bold text-gray-900 mb-2">
              Complete Your Payment
            </h2>
            <p class="text-sm text-gray-600">
              Testing Mode - Choose payment outcome
            </p>
          </div>

          <!-- Order Summary -->
          <div class="bg-gray-50 p-4 rounded-lg space-y-2">
            <div class="flex justify-between">
              <span class="text-gray-600">Order Number:</span>
              <span class="font-semibold">{{ createdOrder.order_number }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Amount:</span>
              <span class="font-bold text-lg text-primary-600">
                {{ formatPrice(createdOrder.total_amount) }}
              </span>
            </div>
          </div>

          <!-- Payment Method -->
          <div class="space-y-3">
            <label class="block text-sm font-medium text-gray-700">
              Select Payment Method
            </label>
            
            <div class="space-y-2">
              <label class="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input type="radio" v-model="paymentMethod" value="cash" class="mr-3">
                <span>💵 Cash</span>
              </label>
              
              <label class="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input type="radio" v-model="paymentMethod" value="credit_card" class="mr-3">
                <CreditCardIcon class="w-6 h-6 mr-2 text-gray-600 inline" />
                <span>Credit Card</span>
              </label>
              
              <label class="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input type="radio" v-model="paymentMethod" value="bank_transfer" class="mr-3">
                <span>🏦 Bank Transfer</span>
              </label>
            </div>
          </div>

          <!-- Test Buttons -->
          <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p class="text-sm font-semibold text-yellow-800 mb-3">
              🧪 Test Payment Outcome:
            </p>
            
            <div class="space-y-2">
              <Button variant="primary" full-width @click="handlePayment(true)">
                ✅ Simulate Successful Payment
              </Button>
              
              <Button variant="danger" full-width @click="handlePayment(false)">
                ❌ Simulate Failed Payment
              </Button>
            </div>
          </div>

          <div class="text-center">
            <button 
              @click="handleBackToInfo"
              class="text-sm text-gray-600 hover:text-gray-900"
            >
              ← Back to customer information
            </button>
          </div>
        </div>
      </div>

      <!-- Empty Cart -->
      <div v-else class="text-center py-12">
        <Spinner v-if="loading" size="xl" />
        <div v-else>
          <p class="text-gray-600 mb-4">Your cart is empty</p>
          <Button variant="primary" @click="router.push('/events')">
            Browse Events
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>