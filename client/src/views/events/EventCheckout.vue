<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ordersAPI } from '@/api/orders.js'
import { queueAPI } from '@/api/queue.js'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'
import { useQueueStore } from '@/stores/queue'
import OrderSummary from '@/components/features/OrderSummary.vue'
import Button from '@/components/common/Button.vue'
import Input from '@/components/common/Input.vue'
import Spinner from '@/components/common/Spinner.vue'
import { ArrowLeftIcon, CheckCircleIcon } from '@heroicons/vue/24/outline'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const cartStore = useCartStore()
const queueStore = useQueueStore()

const loading = ref(false)
const currentStep = ref(1) 
const customerInfo = ref({
  first_name: '',
  last_name: '',
  email: '',
  phone: ''
})
const couponCode = ref('')
const couponDiscount = ref(0)
const couponApplied = ref(false)
const validatingCoupon = ref(false)
const couponError = ref('')
 
const createdOrder = ref(null)
const paymentMethod = ref('vnpay') 
const processingPayment = ref(false)
const paymentCountdown = ref(3) 
const paymentSuccess = ref(false)

const slotExpiryTime = ref(null)
const timeRemaining = ref(null)
const countdownInterval = ref(null)

const existingOrder = ref(null)
const checkingExistingOrder = ref(false)

const event = computed(() => cartStore.event)
const session = computed(() => cartStore.session)
const tickets = computed(() => cartStore.items)

const fromWaitingRoom = ref(false)

const isCartValid = computed(() => {
  return event.value && session.value && cartStore.items.length > 0
})

const checkExistingOrder = async () => {
  checkingExistingOrder.value = true
  try {
    const response = await ordersAPI.getUserOrders({
      session_id: session.value.id,
      status: 'pending'
    })

    const orders = response.data.orders || []
    
    const pendingOrder = orders.find(o => 
      o.session_id === session.value.id && 
      o.status === 'pending' &&
      new Date(o.reserved_until) > new Date()
    )

    if (pendingOrder) {
      console.log('Found existing pending order:', pendingOrder.order_number)
      existingOrder.value = pendingOrder
      
      const confirmed = confirm(
        `You already have a pending order (${pendingOrder.order_number}) for this session.\n\n` +
        `Would you like to continue with this order instead of creating a new one?`
      )
      
      if (confirmed) {
        createdOrder.value = pendingOrder
        
        startSlotCountdown(pendingOrder.reserved_until)
        
        if (pendingOrder.customer_info) {
          customerInfo.value = {
            first_name: pendingOrder.customer_info.first_name || '',
            last_name: pendingOrder.customer_info.last_name || '',
            email: pendingOrder.customer_info.email || '',
            phone: pendingOrder.customer_info.phone || ''
          }
        }
        
        currentStep.value = 2
        
        return true
      } else {
        const cancelConfirm = confirm(
          'To create a new order, you must cancel the existing one first.\n\n' +
          'Do you want to cancel the existing order now?'
        )
        
        if (cancelConfirm) {
          await cancelExistingOrder(pendingOrder.id)
          return false
        } else {
          // User cancelled → Go back
          router.push({
            name: 'EventDetail',
            params: { slug: route.params.slug }
          })
          return true
        }
      }
    }
    
    return false
  } catch (error) {
    console.error('Failed to check existing order:', error)
    return false
  } finally {
    checkingExistingOrder.value = false
  }
}

const cancelExistingOrder = async (orderId) => {
  try {
    await ordersAPI.cancelOrder(orderId)
    console.log('Cancelled existing order')
    existingOrder.value = null
    return true
  } catch (error) {
    console.error('Failed to cancel order:', error)
    alert('Failed to cancel existing order. Please try again.')
    return false
  }
}


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
      
      if (!paymentSuccess.value) {
        alert('Your purchase time has expired! Please join the queue again.')
        
        createdOrder.value = null
        cartStore.clear()
        
        router.push({
          name: 'EventDetail',
          params: { slug: route.params.slug }
        })
      }
    } else {
      timeRemaining.value = diff
    }
  }
  
  updateTimeRemaining()
  countdownInterval.value = setInterval(updateTimeRemaining, 1000)
}

const checkQueueStatusAndStartTimer = async () => {
  try {
    const response = await queueAPI.getStatus(session.value.id)
    const apiResponse = response.data
    
    const data = apiResponse.data
    // console.log('Queue status check:', data)
    
    if (data?.status === 'active' && data?.expires_at) {
      console.log('Active slot found, expires at:', data.expires_at)
      startSlotCountdown(data.expires_at)
      return true
    } 
    
    if (data?.status === 'waiting') {
      console.log('⏳ Still in queue, position:', data.queue_position)
      alert('You are still in the waiting queue. Please wait for your turn.')
      router.push({
        name: 'EventDetail',
        params: { slug: route.params.slug }
      })
      return false
    } 

    if (!data?.in_queue && !data?.waiting_room_enabled) {
      console.log('No waiting room for this session, creating 15-minute timer')
      const expiryTime = new Date(Date.now() + 15 * 60 * 1000)
      startSlotCountdown(expiryTime)
      return true
    }
    
    if (!data?.in_queue && data?.waiting_room_enabled) {
      console.warn('Waiting room enabled but user not in queue')
      alert('Please join the waiting room first.')
      router.push({
        name: 'EventDetail',
        params: { slug: route.params.slug }
      })
      return false
    }
  } catch (error) {
    console.error('Failed to check queue status:', error)
    // Fallback: Tạo timer 15 phút
    const expiryTime = new Date(Date.now() + 15 * 60 * 1000)
    startSlotCountdown(expiryTime)
    return true
  }
}

const handleValidateCoupon = async () => {
  if (!couponCode.value || couponCode.value.trim() === '') {
    return
  }

  validatingCoupon.value = true
  couponError.value = ''

  try {
    const subtotal = tickets.value.reduce((sum, item) => sum + (item.price * item.quantity), 0)

    const response = await ordersAPI.validateCoupon({
      code: couponCode.value.trim(),
      event_id: event.value.id,
      order_amount: subtotal
    })

    const data = response.data.data

    if (data && data.discount_amount) {
      couponDiscount.value = data.discount_amount
      couponApplied.value = true
      console.log('Coupon applied:', couponCode.value, 'Discount:', couponDiscount.value)
    }
  } catch (error) {
    console.error('Coupon validation error:', error)
    couponError.value = error.response?.data?.message || 'Invalid coupon code'
  } finally {
    validatingCoupon.value = false
  }
}

const handleRemoveCoupon = () => {
  couponCode.value = ''
  couponDiscount.value = 0
  couponApplied.value = false
  couponError.value = ''
}

const handleSubmitCustomerInfo = () => {
  if (!customerInfo.value.first_name || !customerInfo.value.last_name || 
      !customerInfo.value.email || !customerInfo.value.phone) {
    alert('Please fill in all required fields')
    return
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(customerInfo.value.email)) {
    alert('Please enter a valid email address')
    return
  }

  // console.log('Customer info valid, moving to payment step')
  currentStep.value = 2
}

const handleCreateOrderAndPay = async () => {
  if (slotExpiryTime.value && new Date() >= new Date(slotExpiryTime.value)) {
    alert('Your purchase time has expired! Please join the queue again.')
    router.push({
      name: 'EventDetail',
      params: { slug: route.params.slug }
    })
    return
  }

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
      coupon_code: couponCode.value || null
    }

    // console.log('Creating order:', orderData)
    
    const result = await ordersAPI.createOrder(orderData)
    
    if (result.success) {
      createdOrder.value = result.data.order
      // console.log('Order created:', createdOrder.value.order_number)
      
      loading.value = false
      
      currentStep.value = 3
      processMockPayment()
    }
  } catch (error) {
    console.error('Order creation failed:', error)
    alert(error.response?.data?.message || 'Failed to create order. Please try again.')
    loading.value = false
  }
}

const processMockPayment = async () => {
  processingPayment.value = true
  paymentCountdown.value = 3

  const countdownTimer = setInterval(() => {
    paymentCountdown.value--
    
    if (paymentCountdown.value <= 0) {
      clearInterval(countdownTimer)
      completeMockPayment()
    }
  }, 1000)
}

const completeMockPayment = async () => {
  try {
    const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const response = await ordersAPI.processPayment(createdOrder.value.id, {
      payment_method: paymentMethod.value,
      payment_data: {
        mock: true,
        success: true,
        transaction_id: transactionId,
        payment_time: new Date().toISOString()
      }
    })

    // console.log('Payment response:', response)

    if (response.success || response.data.success) {
      paymentSuccess.value = true
      processingPayment.value = false
      
      if (countdownInterval.value) {
        clearInterval(countdownInterval.value)
      }

      setTimeout(() => {
        cartStore.clear()
        
        router.push({
          name: 'OrderPaymentResult',
          query: {
            status: 'success',
            order: createdOrder.value.order_number,
            txn: transactionId
          }
        })
      }, 2000)
    } else {
      throw new Error('Payment failed')
    }
  } catch (error) {
    console.error('Payment error:', error)
    processingPayment.value = false
    alert('Payment failed. Please try again or contact support.')
    
    currentStep.value = 2
  }
}

const handleCancelPayment = () => {
  if (confirm('Are you sure you want to cancel this payment?')) {
    processingPayment.value = false
    currentStep.value = 2
  }
}

onMounted(async () => {
  try {

    const wasExpired = queueStore.checkAndClearExpired()
    if (wasExpired) {
      console.log('Cleared expired queue store')
    }

    if (authStore.user) {
      customerInfo.value = {
        first_name: authStore.user.first_name || '',
        last_name: authStore.user.last_name || '',
        email: authStore.user.email,
        phone: authStore.user.phone || ''
      }
    }

    if (!session.value || !session.value.id) {
      console.error('No session found!')
      alert('Session not found. Please select tickets first.')
      router.push({
        name: 'EventDetail',
        params: { slug: route.params.slug }
      })
      return
    }

    console.log('Session ID:', session.value.id)

    if (queueStore.status === 'active' && queueStore.expiresAt) {
      const expiresAt = new Date(queueStore.expiresAt)
      const now = new Date()
      
      console.log('Queue store check:', {
        status: queueStore.status,
        expires_at: queueStore. expiresAt,
        is_expired: now >= expiresAt,
        time_remaining: Math.floor((expiresAt - now) / 1000) + 's'
      })
      
      if (now >= expiresAt) {
        console.error('Queue store has EXPIRED expires_at!')
        alert('Your purchase time has expired!  Please join the queue again.')
        queueStore.$reset()
        router.push({
          name: 'EventDetail',
          params: { slug: route.params.slug }
        })
        return
      }
      
      console.log('Using queue store - already active, expires:', queueStore.expiresAt)
      startSlotCountdown(queueStore.expiresAt)
      console.log('EventCheckout mounted successfully (from waiting room)')
      return
    }

    let hasExistingOrder = false
    try {
      hasExistingOrder = await checkExistingOrder()
      console.log('Has existing order:', hasExistingOrder)
    } catch (orderCheckError) {
      console.error('Check existing order failed:', orderCheckError)
    }
    
    if (!hasExistingOrder) {
      // console.log('Calling checkQueueStatusAndStartTimer.. .')
      const canProceed = await checkQueueStatusAndStartTimer()
      console.log('Can proceed:', canProceed)
      
      if (!canProceed) {
        console.warn('Queue check failed, redirecting.. .')
        return
      }
    }
    
    // console.log('EventCheckout mounted successfully')

  } catch (error) {
    console.error('EventCheckout onMounted error:', error)
    alert('Failed to initialize checkout. Please try again.')
    router.push({
      name: 'EventDetail',
      params: { slug: route.params. slug }
    })
  }
})

onBeforeUnmount(() => {
  if (countdownInterval.value) {
    clearInterval(countdownInterval.value)
  }

  if (!paymentSuccess.value && session.value?. id) {
    try {
      queueAPI.leaveQueue(session.value.id)
      console.log('Left queue on checkout unmount')
    } catch (error) {
      console.error('Failed to leave queue:', error)
    }
  }
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="container-custom">
      <button
        v-if="currentStep < 3"
        @click="router.back()"
        class="flex items-center text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeftIcon class="w-5 h-5 mr-2" />
        Back
      </button>

      <div v-if="timeRemaining !== null && !paymentSuccess" class="mb-6">
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
        <div class="lg:col-span-2">
          <div class="card">
            <div v-if="currentStep === 1">
              <h1 class="text-2xl font-bold mb-6">Checkout</h1>
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
                  help-text="Tickets will be sent to this email"
                  required
                />

                <Input
                  v-model="customerInfo.phone"
                  type="tel"
                  label="Phone Number"
                  placeholder="+84 123 456 789"
                  required
                />

                <div class="mt-6 pt-6 border-t">
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Discount Coupon <span class="text-gray-500">(Optional)</span>
                  </label>
                  
                  <div class="flex gap-2">
                    <div class="flex-1">
                      <Input
                        v-model="couponCode"
                        placeholder="Enter coupon code"
                        :disabled="couponApplied"
                      >
                        <template #prefix>
                          <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                        </template>
                      </Input>
                    </div>
                    
                    <Button
                      v-if="!couponApplied"
                      type="button"
                      variant="secondary"
                      :loading="validatingCoupon"
                      :disabled="!couponCode || couponCode.trim() === ''"
                      @click="handleValidateCoupon"
                    >
                      Apply
                    </Button>
                    
                    <Button
                      v-else
                      type="button"
                      variant="danger"
                      @click="handleRemoveCoupon"
                    >
                      Remove
                    </Button>
                  </div>
                  
                  <p v-if="couponApplied" class="text-sm text-green-600 mt-2 flex items-center">
                    <CheckCircleIcon class="w-4 h-4 mr-1" />
                    Coupon applied! You saved {{ formatPrice(couponDiscount) }}
                  </p>
                  
                  <p v-if="couponError" class="text-sm text-red-600 mt-2">
                    {{ couponError }}
                  </p>
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  full-width
                  @click="handleSubmitCustomerInfo"
                  class="mt-6"
                >
                  Continue to Payment
                </Button>
              </div>
            </div>

            <div v-else-if="currentStep === 2">
              <h1 class="text-2xl font-bold mb-6">Checkout</h1>
              <h2 class="text-lg font-semibold mb-4">2. Payment Method</h2>
              
              <div class="space-y-4">
                <div class="space-y-3">
                  <label class="flex items-start p-4 border-2 rounded-lg cursor-pointer hover:border-primary-500 transition"
                         :class="paymentMethod === 'vnpay' ? 'border-primary-600 bg-primary-50' : 'border-gray-200'">
                    <input
                      type="radio"
                      v-model="paymentMethod"
                      value="vnpay"
                      class="mt-1 mr-3"
                    />
                    <div class="flex-1">
                      <div class="flex items-center">
                        <span class="font-medium text-gray-900">VNPay</span>
                        <span class="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">Mock</span>
                      </div>
                      <p class="text-sm text-gray-600 mt-1">Pay via VNPay payment gateway (Simulated)</p>
                    </div>
                  </label>

                  <label class="flex items-start p-4 border-2 rounded-lg cursor-pointer hover:border-primary-500 transition"
                        :class="paymentMethod === 'momo' ? 'border-primary-600 bg-primary-50' : 'border-gray-200'">
                    <input
                      type="radio"
                      v-model="paymentMethod"
                      value="momo"
                      class="mt-1 mr-3"
                    />
                    <div class="flex-1">
                      <div class="flex items-center">
                        <span class="font-medium text-gray-900">MoMo</span>
                        <span class="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">Mock</span>
                      </div>
                      <p class="text-sm text-gray-600 mt-1">Pay via MoMo e-wallet (Simulated)</p>
                    </div>
                  </label>

                  <label class="flex items-start p-4 border-2 rounded-lg cursor-pointer hover:border-primary-500 transition"
                         :class="paymentMethod === 'banking' ? 'border-primary-600 bg-primary-50' : 'border-gray-200'">
                    <input
                      type="radio"
                      v-model="paymentMethod"
                      value="banking"
                      class="mt-1 mr-3"
                    />
                    <div class="flex-1">
                      <div class="flex items-center">
                        <span class="font-medium text-gray-900">Bank Transfer</span>
                        <span class="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">Mock</span>
                      </div>
                      <p class="text-sm text-gray-600 mt-1">Pay via bank transfer (Simulated)</p>
                    </div>
                  </label>

                  <label class="flex items-start p-4 border-2 rounded-lg cursor-pointer hover:border-primary-500 transition"
                        :class="paymentMethod === 'cash' ? 'border-primary-600 bg-primary-50' : 'border-gray-200'">
                    <input
                      type="radio"
                      v-model="paymentMethod"
                      value="cash"
                      class="mt-1 mr-3"
                    />
                    <div class="flex-1">
                      <div class="flex items-center">
                        <span class="font-medium text-gray-900">Cash</span>
                        <span class="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">Mock</span>
                      </div>
                      <p class="text-sm text-gray-600 mt-1">Pay in cash at venue (Simulated)</p>
                    </div>
                  </label>
                </div>

                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p class="text-sm text-blue-800">
                    <span class="font-medium">Note:</span> This is a simulated payment for testing purposes. No real money will be charged.
                  </p>
                </div>

                <div class="flex space-x-3 mt-6">
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
                    :disabled="loading"
                    @click="handleCreateOrderAndPay"
                  >
                    <Spinner v-if="loading" size="sm" class="mr-2" />
                    {{ loading ? 'Creating Order...' : 'Confirm & Pay' }}
                  </Button>
                </div>
              </div>
            </div>

            <div v-else-if="currentStep === 3">
              <div class="text-center py-12">
                <div v-if="processingPayment && !paymentSuccess">
                  <div class="flex justify-center mb-6">
                    <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600"></div>
                  </div>
                  
                  <h2 class="text-2xl font-bold text-gray-900 mb-2">
                    Processing Payment...
                  </h2>
                  <p class="text-gray-600 mb-4">
                    Please wait {{ paymentCountdown }} seconds
                  </p>
                  
                  <div class="max-w-md mx-auto bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p class="text-sm text-blue-800">
                      Your payment is being processed securely via {{ paymentMethod === 'vnpay' ? 'VNPay' : 'Bank Transfer' }}
                    </p>
                  </div>

                  <Button
                    variant="secondary"
                    class="mt-6"
                    @click="handleCancelPayment"
                  >
                    Cancel Payment
                  </Button>
                </div>

                <!-- Success -->
                <div v-else-if="paymentSuccess">
                  <div class="flex justify-center mb-6">
                    <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircleIcon class="w-10 h-10 text-green-600" />
                    </div>
                  </div>
                  
                  <h2 class="text-2xl font-bold text-gray-900 mb-2">
                    Payment Successful!
                  </h2>
                  <p class="text-gray-600 mb-4">
                    Your order has been confirmed
                  </p>
                  
                  <div class="max-w-md mx-auto bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <p class="text-sm text-green-800 font-medium">
                      Order #{{ createdOrder.order_number }}
                    </p>
                    <p class="text-sm text-green-700 mt-1">
                      Tickets will be sent to {{ customerInfo.email }}
                    </p>
                  </div>

                  <p class="text-sm text-gray-500">
                    Redirecting to confirmation page...
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="lg:col-span-1">
          <OrderSummary
            :items="tickets"
            :show-details="true"
            :membership-discount="cartStore.membershipDiscount"
            :discount="couponDiscount"
            :coupon-code="couponApplied ? couponCode : ''"
          />
        </div>
      </div>
    </div>
  </div>
</template>