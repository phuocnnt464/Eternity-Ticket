<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useCartStore } from '@/stores/cart'
import { useAuthStore } from '@/stores/auth'
import { ordersAPI } from '@/api/orders.js'
import { eventsAPI } from '@/api/events.js'
import { queueAPI } from '@/api'
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
const currentStep = ref(1)
const createdOrder = ref(null)
const paymentMethod = ref('cash')
const processingPayment = ref(false)
const paymentCountdown = ref(3)

// ✅ Purchase slot countdown (15 phút từ khi active trong queue)
const slotExpiryTime = ref(null)
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
  return subtotal * 0.1
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
      
      // Clear everything
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
    const data = response.data
    
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
      console.log('❌ No active slot, need to join queue')
      return false
    }
  } catch (error) {
    console.error('❌ Failed to check queue status:', error)
    return false
  }
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

const handleWaitingRoomReady = async () => {
  console.log('✅ Waiting room ready, checking active slot')
  showWaitingRoom.value = false
  
  // Check queue status và start timer
  await checkQueueStatusAndStartTimer()
}

// ✅ TẠO ORDER (giữ nguyên logic)
const handleCheckout = async () => {
  // Kiểm tra còn thời gian không
  if (!slotExpiryTime.value || new Date() >= new Date(slotExpiryTime.value)) {
    alert('⏰ Your purchase time has expired! Please join the queue again.')
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
      coupon_code: couponCode.value || undefined
    }

    console.log('📦 Creating order:', orderData)

    const response = await ordersAPI.createOrder(orderData)
    const orderResult = response.data.order

    createdOrder.value = {
      id: orderResult.id,
      order_number: orderResult.order_number,
      total_amount: orderResult.total_amount
    }

    console.log('✅ Order created:', createdOrder.value)
    
    // Move to payment step
    currentStep.value = 2

  } catch (error) {
    console.error('❌ Order creation error:', error)
    const errorMsg = error.response?.data?.error?.message || 
                     error.response?.data?.message || 
                     'Order creation failed'
    alert(errorMsg)
  } finally {
    loading.value = false
  }
}

// ✅ STEP 2: Process Payment (giữ nguyên)
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
          
          // Clear countdown
          if (countdownInterval.value) {
            clearInterval(countdownInterval.value)
          }
          
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
  if (confirm('Go back to customer information?')) {
    currentStep.value = 1
  }
}

// ✅ Check waiting room
const checkWaitingRoom = async () => {
  try {
    const response = await queueAPI.getStatus(session.value.id)
    
    console.log('🔍 Queue response:', response)
    
    if (response.data?.waiting_room_enabled) {
      console.log('⏳ Waiting room enabled')
      showWaitingRoom.value = true
      sessionId.value = session.value.id
      return true
    } else {
      console.log('✅ No waiting room required')
      return false
    }
  } catch (error) {
    console.log('ℹ️ No waiting room config found:', error.message)
    return false
  }
}

onMounted(async () => {
  if (!isCartValid.value) {
    router.push({
      name: 'EventDetail',
      params: { slug: route.params.slug }
    })
    return
  }

  console.log('🎪 Session config:', session.value)
  
  // ✅ Check waiting room first
  const hasWaitingRoom = await checkWaitingRoom()
  
  if (!hasWaitingRoom) {
    // Pre-fill customer info
    if (authStore.user) {
      customerInfo.value = {
        first_name: authStore.user.first_name || '',
        last_name: authStore.user.last_name || '',
        email: authStore.user.email,
        phone: authStore.user.phone || ''
      }
    }
    
    // ✅ Check active slot và start timer
    const hasActiveSlot = await checkQueueStatusAndStartTimer()
    
    if (!hasActiveSlot) {
      alert('You need to join the waiting room first.')
      router.push({
        name: 'EventDetail',
        params: { slug: route.params.slug }
      })
    }
  }
})

onBeforeUnmount(() => {
  if (countdownInterval.value) {
    clearInterval(countdownInterval.value)
  }
})

watch(showWaitingRoom, (isShowing) => {
  if (!isShowing && authStore.user) {
    customerInfo.value = {
      first_name: authStore.user.first_name || '',
      last_name: authStore.user.last_name || '',
      email: authStore.user.email,
      phone: authStore.user.phone || ''
    }
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

      <!-- ✅ COUNTDOWN TIMER - Hiển thị 15 phút từ queue slot -->
      <div v-if="timeRemaining !== null && !showWaitingRoom" class="mb-6">
        <div class="flex justify-center">
          <div :class="[
            'flex items-center gap-3 px-6 py-3 rounded-lg shadow-lg text-lg font-bold transition-all',
            timeRemaining < 120 ? 'bg-red-100 text-red-700 animate-pulse ring-2 ring-red-300' : 
            timeRemaining < 300 ? 'bg-yellow-100 text-yellow-700 ring-2 ring-yellow-300' : 
            'bg-blue-100 text-blue-700 ring-2 ring-blue-300'
          ]">
            <ClockIcon class="w-6 h-6" />
            <div class="flex flex-col">
              <span class="text-xs font-normal opacity-75">
                Complete purchase within
              </span>
              <span class="text-2xl font-bold">{{ formatTimeRemaining(timeRemaining) }}</span>
            </div>
          </div>
        </div>
        
        <div v-if="timeRemaining < 180" class="mt-2 text-center">
          <p class="text-sm text-red-600 font-semibold animate-pulse">
            ⚠️ Hurry! Your slot will expire soon!
          </p>
        </div>
      </div>

      <!-- Progress Steps, Waiting Room, Form, Payment... (giữ nguyên) -->
      
    </div>
  </div>
</template>