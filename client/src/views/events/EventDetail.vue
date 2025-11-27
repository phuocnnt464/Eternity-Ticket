<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { eventsAPI } from '@/api/events.js'
import { sessionsAPI } from '@/api/sessions.js'
import { queueAPI } from '@/api/queue.js'
import { adminAPI } from '@/api/admin.js'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'
import Badge from '@/components/common/Badge.vue'
import Button from '@/components/common/Button.vue'
import Spinner from '@/components/common/Spinner.vue'
import Card from '@/components/common/Card.vue'
import TicketSelector from '@/components/features/TicketSelector.vue'
import WaitingRoom from '@/components/features/WaitingRoom.vue' 
import {
  CalendarIcon,
  MapPinIcon,
  ClockIcon,
  UserGroupIcon,
  TicketIcon,
  ShareIcon,
  HeartIcon,
  StarIcon,
  ExclamationCircleIcon
} from '@heroicons/vue/24/outline'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const cartStore = useCartStore()

const event = ref(null)
const sessions = ref([])
const selectedSession = ref(null)
const ticketTypes = ref([])
const selectedTickets = ref([])
const loading = ref(true)
const loadingTickets = ref(false)

const showWaitingRoom = ref(false) 
const queuePosition = ref(null)
const joiningQueue = ref(false)

const earlyAccessInfo = ref(null)
const earlyAccessInterval = ref(null)
const earlyAccessHours = ref(5)  // Default to 5 hours

const eventDate = computed(() => {
  if (!event.value?.start_date) return ''
  const date = new Date(event.value.start_date)
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
})

const eventTime = computed(() => {
  if (!event.value?.start_date || !event.value?.end_date) return ''
  const start = new Date(event.value.start_date)
  const end = new Date(event.value.end_date)
  return `${start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
})

const fetchSystemSettings = async () => {
  try {
    const response = await adminAPI.getSettings()
    const settings = response. data. settings || []
    
    const earlyAccessSetting = settings.find(s => s.setting_key === 'premium_early_access_hours')
    if (earlyAccessSetting) {
      earlyAccessHours.value = parseInt(earlyAccessSetting.setting_value) || 5
      console.log('Early access hours from settings:', earlyAccessHours.value)
    }
  } catch (error) {
    console. error('Failed to fetch settings:', error)
    earlyAccessHours.value = 5  // Fallback
  }
}

const checkEarlyAccess = () => {
  console.log('🔍 Checking early access...')

  if (!ticketTypes.value || ticketTypes.value.length === 0) {
    earlyAccessInfo.value = null
    return
  }

  const now = new Date()
  const userTier = authStore.membershipTier || 'basic'
  
  console.log(`Early access setting: ${earlyAccessHours.value} hours`)
  console.log('User tier:', userTier)

  // Check each ticket type
  for (const ticket of ticketTypes.value) {
    const saleStart = new Date(ticket.sale_start_time)
    
    // ✅ Use system setting
    const earlyAccessStart = new Date(
      saleStart. getTime() - (earlyAccessHours.value * 60 * 60 * 1000)
    )

    console.log('Sale start:', saleStart)
    console.log('Early access start:', earlyAccessStart)
      
    // Check if we're in early access period
    if (now >= earlyAccessStart && now < saleStart) {
      const minutesRemaining = Math.ceil((saleStart - now) / 60000)
      
      console.log('✅ EARLY ACCESS ACTIVE!')
      console.log('Minutes remaining:', minutesRemaining)

      earlyAccessInfo.value = {
        isActive: true,
        isPremium: userTier === 'premium',
        ticketName: ticket.name,
        publicSaleStart: saleStart,
        minutesRemaining: minutesRemaining,
        earlyAccessHours: earlyAccessHours.value
      }
        
      return
    }
  }
  
  // No early access period
  earlyAccessInfo.value = null
}

const canPurchase = computed(() => {
  // return event.value?.status === 'approved' && selectedTickets.value.length > 0
  if (!event.value || event.value.status !== 'approved') return false
  if (selectedTickets.value.length === 0) return false
  
  // ✅ Check early access blocking
  if (earlyAccessInfo.value?. isActive && ! earlyAccessInfo.value?.isPremium) {
    return false  // Block non-premium during early access
  }
  
  return true
})

const buyButtonText = computed(() => {
  if (joiningQueue.value) return 'Joining Queue...'
  
  if (earlyAccessInfo.value?.isActive) {
    if (earlyAccessInfo.value. isPremium) {
      return 'Premium Early Access - Buy Now'
    } else {
      return `Available in ${earlyAccessInfo.value.minutesRemaining} min`
    }
  }
  
  return 'Buy Tickets'
})

const fetchEventDetails = async () => {
  loading.value = true
  try {
    const slug = route.params.slug
    const response = await eventsAPI.getEventBySlug(slug)
    event.value = response.data.event
    
    // Fetch sessions
    await fetchSessions()
  } catch (error) {
    console.error('Failed to fetch event:', error)
    router.push('/events')
  } finally {
    loading.value = false
  }
}

const fetchSessions = async () => {
  try {
    const response = await sessionsAPI.getEventSessions(event.value.id)
    sessions.value = response.data.sessions || []
    
    // Auto-select first session if only one
    if (sessions.value.length === 1) {
      selectSession(sessions.value[0])
    }
  } catch (error) {
    console.error('Failed to fetch sessions:', error)
  }
}

const selectSession = async (session) => {
  selectedSession.value = session
  selectedTickets.value = []
  
  loadingTickets.value = true
  try {
    const response = await sessionsAPI.getSessionTicketTypes(session.id)
    ticketTypes.value = response.data.ticket_types || []

    // console.log('🎫 Ticket types received:', ticketTypes.value)
    // console.log('🔍 First ticket structure:', ticketTypes.value[0])
    checkEarlyAccess()
  } catch (error) {
    console.error('Failed to fetch ticket types:', error)
  } finally {
    loadingTickets.value = false
  }
}

const handlePurchase = async () => {
  if (earlyAccessInfo.value?.isActive && ! earlyAccessInfo.value?.isPremium) {
    alert(`This ticket is in Premium early access period.\nPublic sale starts in ${earlyAccessInfo.value. minutesRemaining} minutes.\n\nUpgrade to Premium to buy now! `)
    router.push('/participant/membership')
    return
  }

  if (!authStore.isAuthenticated) {
    router.push({
      name: 'Login',
      query: { redirect: route.fullPath }
    })
    return
  }

   if (!selectedTickets.value || selectedTickets.value.length === 0) {
    alert('Please select at least one ticket')
    return
  }

  joiningQueue.value = true

  // Add to cart
  try {
    // Validate selected tickets
    // if (!selectedTickets.value || selectedTickets.value.length === 0) {
    //   alert('Please select at least one ticket')
    //   return
    // }

    // ✅ 1. Clear cart items TRƯỚC (không xóa event/session nếu chưa có)
    if (cartStore.items.length > 0) {
      cartStore.items = []  // Chỉ xóa items, không dùng clear()
    }

    // 1. Set event and session
    cartStore.setEventAndSession(event.value, selectedSession.value)
    
    // 3. Add selected tickets to cart
    selectedTickets.value.forEach(ticket => {
      // Find original ticket type to get constraints
      const ticketType = ticketTypes.value.find(
        t => t.id === ticket.ticket_type_id
      )
      
      if (!ticketType) {
        console.error(`Ticket type not found: ${ticket.ticket_type_id}`)
        return
      }
      
      cartStore.addItem({
        ticket_type_id: ticket.ticket_type_id,
        name: ticket.ticket_type_name,
        price: ticket.unit_price,
        quantity: ticket.quantity,
        max_quantity_per_order: ticketType.max_quantity_per_order || 10,
        min_quantity_per_order: ticketType.min_quantity_per_order || 1,
        event_id: event.value.id,
        session_id: selectedSession.value.id
      })
    })

    console.log('✅ Cart prepared:', cartStore.items)

    // ✅ 2. JOIN QUEUE
    const response = await queueAPI.joinQueue({
      session_id: selectedSession.value.id
    })
    
    const data = response.data
    console.log('🔍 Queue response:', data)

    // console.log('✅ Cart after adding:', {
    //   event: cartStore.event,
    //   session: cartStore.session,
    //   items: cartStore.items
    // })

    if (!data.waiting_room_enabled) {
      // Không có waiting room → Vào checkout ngay
      console.log('✅ No waiting room, proceed to checkout')
      router.push({
        name: 'EventCheckout',
        params: { slug: route.params.slug }
      })
      return
    }

    if (data.can_purchase) {
      // ✅ Có active slot ngay → Vào checkout
      console.log('✅ Active slot available, proceed to checkout')
      router.push({
        name: 'EventCheckout',
        params: { slug: route.params.slug }
      })
    } else {
      // ✅ Phải chờ trong queue
      console.log(`⏳ In queue at position ${data.queue_position}`)
      showWaitingRoom.value = true
      queuePosition.value = data.queue_position
    }

    // Go to checkout
    // router.push({
    //   name: 'EventCheckout',
    //   params: { slug: route.params.slug }
    // })
  } catch (error) {
    console.error('Failed to join queue:', error)
    alert(error.response?.data?.message || 'Failed to join waiting room. Please try again.')
  } finally {
    joiningQueue.value = false
  }
}


// ✅ Callback khi waiting room ready
const handleWaitingRoomReady = () => {
  console.log('✅ Your turn! Proceeding to checkout...')
  showWaitingRoom.value = false
  
  router.push({
    name: 'EventCheckout',
    params: { slug: route.params.slug }
  })
}

// ✅ Callback khi waiting room error/expired
const handleWaitingRoomError = (message) => {
  console.error('Waiting room error:', message)
  showWaitingRoom.value = false
  alert(message || 'Your session has expired. Please try again.')
}

const handleShare = async () => {
  const url = window.location.href
  
  if (navigator.share) {
    try {
      await navigator.share({
        title: event.value.title,
        text: event.value.description,
        url: url
      })
    } catch (err) {
      console.log('Share cancelled')
    }
  } else {
    // Fallback: copy to clipboard
    navigator.clipboard.writeText(url)
    alert('Link copied to clipboard!')
  }
}

const formatPrice = (price) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(price)
}

onMounted(async () => {
  fetchEventDetails()

   // ✅ Fetch system settings first
  await fetchSystemSettings()

   // ✅ Start interval to check early access
  earlyAccessInterval. value = setInterval(() => {
    if (ticketTypes.value.length > 0) {
      checkEarlyAccess()
    }
  }, 60000)
})

// onBeforeUnmount(() => {
//   if (earlyAccessInterval.value) {
//     clearInterval(earlyAccessInterval.value)
//   }
// })
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- WAITING ROOM MODAL -->
    <WaitingRoom
      v-if="showWaitingRoom"
      :session-id="selectedSession?.id"
      @ready="handleWaitingRoomReady"
      @error="handleWaitingRoomError"
      @expired="handleWaitingRoomError"
    />

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center items-center py-20">
      <Spinner size="xl" />
    </div>

    <!-- Event Details -->
    <div v-else-if="event">
      <!-- Cover Image -->
      <section class="relative h-96 bg-gray-200">
        <img
          v-if="event.cover_image"
          :src="event.cover_image"
          :alt="event.title"
          class="w-full h-full object-cover"
        />
        <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        
        <!-- ✅ ADD: Early Access Badge (Top Right) -->
        <div v-if="earlyAccessInfo?.isActive" class="absolute top-4 right-4 z-10">
          <Badge v-if="earlyAccessInfo.isPremium" variant="warning" size="lg" class="animate-pulse">
            <StarIcon class="w-5 h-5 inline mr-1" />
            Premium Early Access Active! 
          </Badge>
        </div>

        <!-- Event Title Overlay -->
        <div class="absolute bottom-0 left-0 right-0 p-8 text-white">
          <div class="container-custom">
            <Badge v-if="event.category_name" variant="primary" class="mb-2">
              {{ event.category_name }}
            </Badge>
            <h1 class="text-4xl md:text-5xl font-bold mb-2">{{ event.title }}</h1>
            <p class="text-lg text-gray-200">by {{ event.organizer_name }}</p>
          </div>
        </div>
      </section>

      <!-- Content -->
      <section class="py-8">
        <div class="container-custom">
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <!-- Main Content -->
            <div class="lg:col-span-2 space-y-6">
              <!-- Event Info -->
              <div class="card">
                <h2 class="text-2xl font-bold mb-4">Event Details</h2>
                
                <div class="space-y-4">
                  <div class="flex items-start space-x-3">
                    <CalendarIcon class="w-6 h-6 text-gray-400 flex-shrink-0 mt-1" />
                    <div>
                      <p class="font-medium">{{ eventDate }}</p>
                      <p class="text-sm text-gray-600">{{ eventTime }}</p>
                    </div>
                  </div>

                  <div class="flex items-start space-x-3">
                    <MapPinIcon class="w-6 h-6 text-gray-400 flex-shrink-0 mt-1" />
                    <div>
                      <p class="font-medium">{{ event.venue_name }}</p>
                      <p class="text-sm text-gray-600">{{ event.venue_address }}</p>
                    </div>
                  </div>

                  <div v-if="event.total_tickets_sold" class="flex items-start space-x-3">
                    <UserGroupIcon class="w-6 h-6 text-gray-400 flex-shrink-0 mt-1" />
                    <div>
                      <p class="font-medium">{{ event.total_tickets_sold }} attendees</p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Description -->
              <div class="card">
                <h2 class="text-2xl font-bold mb-4">About This Event</h2>
                <div class="prose max-w-none">
                  <p class="text-gray-700 whitespace-pre-line">{{ event.description }}</p>
                </div>
              </div>

              <!-- Venue Map -->
              <div v-if="event.venue_map" class="card">
                <h2 class="text-2xl font-bold mb-4">Venue</h2>
                <img :src="event.venue_map" alt="Venue Map" class="w-full rounded-lg" />
              </div>

              <!-- Sessions -->
              <div v-if="sessions.length > 1" class="card">
                <h2 class="text-2xl font-bold mb-4">Select Session</h2>
                <div class="space-y-3">
                  <button
                    v-for="session in sessions"
                    :key="session.session_id"
                    @click="selectSession(session)"
                    :class="[
                      'w-full text-left p-4 rounded-lg border-2 transition-all',
                      selectedSession?.session_id === session.session_id
                        ? 'border-primary-600 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    ]"
                  >
                    <div class="flex items-center justify-between">
                      <div>
                        <p class="font-semibold">{{ session.name }}</p>
                        <p class="text-sm text-gray-600">
                          {{ new Date(session.start_time).toLocaleString() }}
                        </p>
                      </div>
                      <Badge variant="info">
                        {{ session.available_tickets }} left
                      </Badge>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <!-- Sidebar - Ticket Selection -->
            <div class="lg:col-span-1">
              <div class="sticky top-24 space-y-4">
                <Card 
                  v-if="earlyAccessInfo?.isActive && !earlyAccessInfo?.isPremium"
                  class="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-400 animate-pulse"
                >
                  <div class="flex items-start space-x-3">
                    <div class="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <ExclamationCircleIcon class="w-6 h-6 text-yellow-600" />
                    </div>
                    <div class="flex-1">
                      <h3 class="font-semibold text-yellow-900 mb-1">⭐ Premium Early Access Period</h3>
                      <p class="text-sm text-yellow-800 mb-3">
                        Premium members are buying now! <br>
                        Public sale starts in <strong>{{ earlyAccessInfo.minutesRemaining }} minutes</strong>
                      </p>
                      <Button 
                        variant="warning" 
                        size="sm"
                        @click="router.push('/participant/membership')"
                      >
                        Upgrade to Premium
                      </Button>
                    </div>
                  </div>
                </Card>

                <div class="card">
                  <h2 class="text-xl font-bold mb-4">Get Tickets</h2>

                  <!-- No Session Selected -->
                  <div v-if="sessions.length > 1 && !selectedSession" class="text-center py-8">
                    <TicketIcon class="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p class="text-gray-600">Please select a session first</p>
                  </div>

                  <!-- Loading Tickets -->
                  <div v-else-if="loadingTickets" class="flex justify-center py-8">
                    <Spinner />
                  </div>

                  <!-- Ticket Selector -->
                  <div v-else-if="ticketTypes.length > 0">
                    <div v-if="earlyAccessInfo?.isActive && earlyAccessInfo?. isPremium" class="mb-4 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-300 rounded-lg">
                      <div class="flex items-center space-x-2 text-sm">
                        <StarIcon class="w-5 h-5 text-yellow-600" />
                        <span class="font-semibold text-yellow-900">
                          Premium Early Access Active!
                        </span>
                      </div>
                      <p class="text-xs text-yellow-800 mt-1">
                        You're shopping {{ earlyAccessInfo.minutesRemaining }} minutes before public sale
                      </p>
                    </div>

                    <TicketSelector
                      v-model="selectedTickets"
                      :ticket-types="ticketTypes"
                      :max-per-order="10"
                    />

                    <div class="mt-6 space-y-3">
                      <Button
                        variant="primary"
                        size="lg"
                        full-width
                        :disabled="!canPurchase || joiningQueue"
                        @click="handlePurchase"
                      >
                        <Spinner v-if="joiningQueue" size="sm" class="mr-2" />
                        <TicketIcon v-else class="w-5 h-5" />
                        {{ joiningQueue ? 'Joining Queue...' : 'Buy Tickets' }}
                      </Button>

                      <p v-if="! canPurchase && selectedTickets.length > 0" class="text-sm text-center text-orange-600">
                        {{ earlyAccessInfo?. isActive && ! earlyAccessInfo?.isPremium 
                           ? '⏰ Upgrade to Premium to buy now' 
                           : 'Please select tickets' }}
                      </p>

                      <div class="flex space-x-2">
                        <Button
                          variant="secondary"
                          full-width
                          @click="handleShare"
                        >
                          <ShareIcon class="w-5 h-5" />
                          Share
                        </Button>
                        <Button
                          variant="secondary"
                          @click="() => {}"
                        >
                          <HeartIcon class="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <!-- No Tickets -->
                  <div v-else class="text-center py-8">
                    <TicketIcon class="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p class="text-gray-600">No tickets available</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>