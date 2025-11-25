<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useCartStore } from '@/stores/cart'
import { useAuthStore } from '@/stores/auth'
import { ordersAPI } from '@/api/orders.js'
import { eventsAPI } from '@/api/events.js'
import CheckoutForm from '@/components/features/CheckoutForm.vue'
import OrderSummary from '@/components/features/OrderSummary.vue'
import WaitingRoom from '@/components/features/WaitingRoom.vue'
import Button from '@/components/common/Button.vue'
import Spinner from '@/components/common/Spinner.vue'
import { ArrowLeftIcon } from '@heroicons/vue/24/outline'

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
        first_name: firstName,          
        last_name: lastName,              
        email: customerInfo.value.email,
        phone: customerInfo.value.phone
      },
      coupon_code: couponCode.value || undefined
    }

    const response = await ordersAPI.createOrder(orderData)
    const orderResult = response.data

    const orderId = orderResult.order.id
    const orderNumber = orderResult.order.order_number
    const totalAmount = orderResult.order.total_amount

    console.log('✅ Order created:', { id: orderId, number: orderNumber })

    // ✅ Clear cart and redirect to Payment Gateway
    cartStore.clear()
    
    router.push({
      name: 'PaymentGateway',
      query: {
        orderId: orderId,          
        order: orderNumber,         
        amount: totalAmount,
        type: 'order'
      }
    })

  } catch (error) {
    console.error('❌ Order creation error:', error)
    alert(error.response?.data?.error?.message || 'Order creation failed')
  } finally {
    loading.value = false
  }
}

const processOrder = async () => {
  loading.value = true

  try {
    const orderData = {
      session_id: session.value.session_id,
      tickets: tickets.value.map(t => ({
        ticket_type_id: t.ticket_type_id,
        quantity: t.quantity
      })),
      customer_info: customerInfo.value,
      coupon_code: couponCode.value || undefined
    }

    const response = await ordersAPI.createOrder(orderData)
    const order = response.data.order

    // Redirect to payment
    router.push({
      name: 'MyOrders',
      params: { orderId: order.order_id }
    })

    // Clear cart
    cartStore.clearCart()
  } catch (error) {
    alert(error.response?.data?.error?.message || 'Order creation failed')
  } finally {
    loading.value = false
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
  
  if (session.value?.enable_waiting_room) {
    console.log('⏳ Entering waiting room...')
    showWaitingRoom.value = true
    sessionId.value = session.value.id
  }

  // Pre-fill customer info from auth
  if (authStore.user) {
    customerInfo.value = {
      full_name: authStore.fullName,
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

      <!-- Waiting Room -->
      <div v-if="showWaitingRoom">
        <WaitingRoom
          :session-id="sessionId"
          @ready="handleWaitingRoomReady"
          @error="(msg) => { alert(msg); router.back(); }"
        />
      </div>

      <!-- Checkout Form -->
      <div v-else-if="isCartValid" class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Left Column - Customer Info -->
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
                <p v-if="session" class="text-primary-600 text-sm mt-2">
                  Session: {{ session.name }}
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

        <!-- Right Column - Order Summary -->
        <div class="lg:col-span-1">
          <OrderSummary
            :items="tickets"
            :discount="couponDiscount"
            :membership-discount="membershipDiscount"
            :coupon-code="couponCode"
          />
        </div>
      </div>

      <!-- Invalid Cart -->
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