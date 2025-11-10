<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useCartStore } from '@/stores/cart'
import { useAuthStore } from '@/stores/auth'
import { ordersAPI, eventsAPI } from '@/api'
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
const tickets = computed(() => cartStore.tickets)

const isCartValid = computed(() => {
  return event.value && session.value && tickets.value.length > 0
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
    couponDiscount.value = response.data.data.discount_amount
  } catch (error) {
    throw new Error(error.response?.data?.error?.message || 'Invalid coupon')
  }
}

const handleWaitingRoomReady = () => {
  showWaitingRoom.value = false
}

const handleCheckout = async (formData) => {
  customerInfo.value = formData
  loading.value = true

  try {
    // Check if queue is required for this session
    const requiresQueue = session.value.queue_enabled

    if (requiresQueue) {
      // Show waiting room
      showWaitingRoom.value = true
      sessionId.value = session.value.session_id
      loading.value = false
    } else {
      // Direct checkout
      await processOrder()
    }
  } catch (error) {
    console.error('Checkout failed:', error)
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
    const order = response.data.data

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