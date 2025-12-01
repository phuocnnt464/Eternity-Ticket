<script setup>
// ...  existing script (giữ nguyên toàn bộ)
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { eventsAPI } from '@/api/events.js'
import { sessionsAPI } from '@/api/sessions.js'
import { queueAPI } from '@/api/queue.js'
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
  ExclamationCircleIcon,
  BuildingOfficeIcon,
  PhoneIcon,
  EnvelopeIcon,
  FireIcon
} from '@heroicons/vue/24/outline'

// ...  rest of existing script
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
const earlyAccessHours = ref(5)

const eventDate = computed(() => {
  if (!event.value?. start_date) return ''
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
  const start = new Date(event.value. start_date)
  const end = new Date(event.value. end_date)
  return `${start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
})

const fetchSystemSettings = async () => {
  try {
    const response = await eventsAPI.getPublicSettings()
    const settings = response.data.settings || []
    
    const earlyAccessSetting = settings.find(s => s.setting_key === 'premium_early_access_hours')
    if (earlyAccessSetting) {
      earlyAccessHours.value = parseInt(earlyAccessSetting.setting_value) || 5
    }
  } catch (error) {
    console.error('Failed to fetch settings:', error)
    earlyAccessHours.value = 5
  }
}

const checkEarlyAccess = () => {
  if (!ticketTypes.value || ticketTypes.value.length === 0) {
    earlyAccessInfo.value = null
    return
  }

  const now = new Date()
  const userTier = authStore.membershipTier || 'basic'

  earlyAccessInfo.value = null

  for (const ticket of ticketTypes.value) {
    const saleStart = new Date(ticket.sale_start_time)
    const earlyAccessStart = new Date(
      saleStart.getTime() - (earlyAccessHours.value * 60 * 60 * 1000)
    )
      
    if (now >= earlyAccessStart && now < saleStart) {
      const minutesRemaining = Math.ceil((saleStart - now) / 60000)

      ticket.isEarlyAccess = true
      ticket.earlyAccessInfo = {
        isPremium: userTier === 'premium',
        publicSaleStart: saleStart,
        minutesRemaining: minutesRemaining
      }

      if (!earlyAccessInfo.value) {
        earlyAccessInfo.value = {
          isActive: true,
          isPremium: userTier === 'premium',
          ticketName: ticket.name,
          publicSaleStart: saleStart,
          minutesRemaining: minutesRemaining,
          earlyAccessHours: earlyAccessHours. value
        }
      } 
    } else {
        ticket.isEarlyAccess = false
    }
  }
  // earlyAccessInfo.value = null
}

const canPurchase = computed(() => {
  if (!event.value || event.value.status !== 'approved') return false
  if (selectedTickets.value.length === 0) return false
  
  const userTier = authStore.membershipTier || 'basic'

  for (const selected of selectedTickets.value) {
    const ticketType = ticketTypes.value.find(t => t.id === selected.ticket_type_id)
    if (ticketType?.isEarlyAccess && userTier !== 'premium') {
      return false
    }
  }
  
  return true
})

const buyButtonText = computed(() => {
  if (joiningQueue.value) return 'Joining Queue.. .'

  const userTier = authStore.membershipTier || 'basic'

  const hasEarlyAccessTicket = selectedTickets.value.some(selected => {
    const ticketType = ticketTypes.value.find(t => t.id === selected.ticket_type_id)
    return ticketType?.isEarlyAccess
  })
  
  if (hasEarlyAccessTicket) {
    if (userTier === 'premium') {
      return 'Early Access - Buy Now'
    } else {
      // ✅ Tìm ticket early access được chọn
      const earlyTicket = selectedTickets.value.find(selected => {
        const ticketType = ticketTypes.value.find(t => t.id === selected.ticket_type_id)
        return ticketType?.isEarlyAccess
      })
      
      if (earlyTicket) {
        const ticketType = ticketTypes.value.find(t => t.id === earlyTicket.ticket_type_id)
        return `Available in ${ticketType?.earlyAccessInfo?.minutesRemaining || 0} min`
      }
    }
  }
  
  return 'Buy Tickets'
})

const fetchEventDetails = async () => {
  loading.value = true
  try {
    const slug = route.params.slug
    const response = await eventsAPI. getEventBySlug(slug)
    event.value = response.data.event
    
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
    sessions.value = response.data. sessions || []
    
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
    checkEarlyAccess()
  } catch (error) {
    console.error('Failed to fetch ticket types:', error)
  } finally {
    loadingTickets. value = false
  }
}

const handlePurchase = async () => {
  if (earlyAccessInfo.value?.isActive && !earlyAccessInfo.value?.isPremium) {
    alert(`This ticket is in Premium early access period.\nPublic sale starts in ${earlyAccessInfo.value.minutesRemaining} minutes.\n\nUpgrade to Premium to buy now! `)
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

  if (! selectedTickets.value || selectedTickets.value.length === 0) {
    alert('Please select at least one ticket')
    return
  }

  joiningQueue.value = true

  try {
    if (cartStore.items.length > 0) {
      cartStore.items = []
    }

    cartStore.setEventAndSession(event.value, selectedSession.value)
    
    selectedTickets.value. forEach(ticket => {
      const ticketType = ticketTypes.value.find(
        t => t.id === ticket.ticket_type_id
      )
      
      if (! ticketType) {
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

    const response = await queueAPI.joinQueue({
      session_id: selectedSession.value. id
    })
    
    const data = response.data

    if (!data.waiting_room_enabled) {
      router.push({
        name: 'EventCheckout',
        params: { slug: route.params.slug }
      })
      return
    }

    // if (data.can_purchase) {
    //   router.push({
    //     name: 'EventCheckout',
    //     params: { slug: route.params.slug }
    //   })
    // } else {
    //   showWaitingRoom.value = true
    //   queuePosition.value = data.queue_position
    // }

    showWaitingRoom.value = true
    queuePosition.value = data.queue_position
    
  } catch (error) {
    console.error('Failed to join queue:', error)
    alert(error.response?.data?.message || 'Failed to join waiting room.  Please try again.')
  } finally {
    joiningQueue.value = false
  }
}

const handleWaitingRoomReady = () => {
  showWaitingRoom.value = false
  router.push({
    name: 'EventCheckout',
    params: { slug: route.params. slug }
  })
}

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
  await fetchSystemSettings()
  
  earlyAccessInterval.value = setInterval(() => {
    if (ticketTypes.value.length > 0) {
      checkEarlyAccess()
    }
  }, 60000)
})

onBeforeUnmount(() => {
  if (earlyAccessInterval.value) {
    clearInterval(earlyAccessInterval. value)
  }
})
</script>

<template>
  <div class="min-h-screen bg-white">
    <!-- WAITING ROOM MODAL -->
    <WaitingRoom
      v-if="showWaitingRoom"
      :session-id="selectedSession?.id"
      @ready="handleWaitingRoomReady"
      @error="handleWaitingRoomError"
      @expired="handleWaitingRoomError"
    />

    <!-- Loading -->
    <div v-if="loading" class="flex flex-col justify-center items-center py-20">
      <Spinner size="xl" />
      <p class="text-gray-500 mt-4">Loading event details...</p>
    </div>

    <!-- Event Details -->
    <div v-else-if="event">
      <!-- Hero Section - Fixed Opacity -->
      <section class="relative h-[500px] bg-gradient-to-br from-dark-900 via-primary-900 to-black overflow-hidden">
        <!-- Background Image with LIGHTER Overlay -->
        <div class="absolute inset-0">
          <img
            v-if="event.cover_image"
            :src="event.cover_image"
            :alt="event.title"
            class="w-full h-full object-cover opacity-70"
          />
          <!-- ✅ LIGHTER gradient - from 30% to transparent -->
          <div class="absolute inset-0 bg-gradient-to-t from-black/50 via-black/30 to-transparent"></div>
        </div>

        <!-- Decorative Elements - REDUCED opacity -->
        <div class="absolute top-0 right-0 w-96 h-96 bg-primary-500 rounded-full blur-3xl opacity-10"></div>
        <div class="absolute bottom-0 left-0 w-96 h-96 bg-accent-500 rounded-full blur-3xl opacity-10"></div>
        
        <!-- Early Access Badge (Top Right) -->
        <div v-if="earlyAccessInfo?.isActive" class="absolute top-6 right-6 z-20">
          <div v-if="earlyAccessInfo. isPremium" class="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-6 py-3 rounded-full shadow-2xl flex items-center space-x-2 animate-pulse">
            <StarIcon class="w-6 h-6" />
            <span class="font-bold">Premium Early Access Active!</span>
          </div>
        </div>

        <!-- Content -->
        <div class="absolute inset-0 flex items-end">
          <div class="container-custom pb-12 relative z-10 w-full">
            <div class="max-w-4xl">
              <!-- ✅ IMPROVED Category Badge - More Visible -->
              <div v-if="event.category_name" class="mb-4">
                <div class="inline-flex items-center bg-primary-600 text-white px-5 py-2 rounded-full shadow-lg border-2 border-white/30 backdrop-blur-sm">
                  <span class="font-bold text-sm uppercase tracking-wider">{{ event.category_name }}</span>
                </div>
              </div>

              <!-- Title with Text Shadow -->
              <h1 class="text-5xl md:text-6xl font-bold mb-4 text-white leading-tight" style="text-shadow: 2px 4px 8px rgba(0,0,0,0.5)">
                {{ event.title }}
              </h1>

              <!-- Meta Info with better contrast -->
              <div class="flex flex-wrap items-center gap-6 text-white mb-4">
                <div class="flex items-center space-x-2 bg-black/20 backdrop-blur-sm px-3 py-1 rounded-lg">
                  <CalendarIcon class="w-5 h-5" />
                  <span class="font-semibold">{{ eventDate }}</span>
                </div>
                <div class="flex items-center space-x-2 bg-black/20 backdrop-blur-sm px-3 py-1 rounded-lg">
                  <MapPinIcon class="w-5 h-5" />
                  <span class="font-semibold">{{ event.venue_city }}</span>
                </div>
              </div>

              <!-- Organizer -->
              <div class="flex items-center space-x-3 bg-black/5 backdrop-blur-sm rounded-xl px-4 py-3 inline-flex">
                <img 
                  v-if="event.logo_image" 
                  :src="event.logo_image" 
                  :alt="event.organizer_name"
                  class="w-12 h-12 rounded-full border-2 border-white/50 shadow-lg"
                />
                <div v-else class="w-12 h-12 rounded-full bg-primary-600 flex items-center justify-center border-2 border-white/50 shadow-lg">
                  <UserGroupIcon class="w-6 h-6 text-white" />
                </div>
                <div>
                  <p class="text-xs text-gray-300 font-medium">Organized by</p>
                  <p class="text-lg font-bold text-white">{{ event.organizer_name }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Main Content -->
      <section class="py-12 bg-gray-50">
        <div class="container-custom">
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <!-- Left Column - Main Content -->
            <div class="lg:col-span-2 space-y-6">
              <!-- Quick Info Cards -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Date & Time Card -->
                <div class="bg-white rounded-xl p-5 shadow-md border-2 border-primary-100 hover:border-primary-300 transition-all">
                  <div class="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center mb-3">
                    <CalendarIcon class="w-7 h-7 text-white" />
                  </div>
                  <p class="text-xs text-gray-500 uppercase font-bold mb-2 tracking-wider">Date & Time</p>
                  <p class="font-bold text-gray-900 text-lg">{{ eventDate }}</p>
                  <p class="text-sm text-gray-600 mt-1">{{ eventTime }}</p>
                </div>

                <!-- Location Card -->
                <div class="bg-white rounded-xl p-5 shadow-md border-2 border-accent-100 hover:border-accent-300 transition-all">
                  <div class="w-12 h-12 bg-gradient-to-br from-accent-500 to-accent-600 rounded-xl flex items-center justify-center mb-3">
                    <MapPinIcon class="w-7 h-7 text-white" />
                  </div>
                  <p class="text-xs text-gray-500 uppercase font-bold mb-2 tracking-wider">Location</p>
                  <p class="font-bold text-gray-900 text-lg">{{ event.venue_name }}</p>
                  <p class="text-sm text-gray-600 mt-1">{{ event.venue_city }}</p>
                </div>
              </div>

              <!-- Description -->
              <div class="bg-white rounded-2xl p-8 shadow-md border border-gray-200">
                <h2 class="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                  <div class="w-1. 5 h-10 bg-gradient-to-b from-primary-600 to-accent-600 rounded-full mr-4"></div>
                  About This Event
                </h2>
                <div class="prose max-w-none">
                  <p class="text-gray-700 text-lg leading-relaxed whitespace-pre-line">
                    {{ event.description }}
                  </p>
                </div>
              </div>

              <!-- Venue Map -->
              <div v-if="event.venue_map_image" class="bg-white rounded-2xl p-8 shadow-md border border-gray-200">
                <h2 class="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                  <div class="w-1.5 h-10 bg-gradient-to-b from-primary-600 to-accent-600 rounded-full mr-4"></div>
                  <MapPinIcon class="w-7 h-7 mr-2 text-primary-600" />
                  Venue & Location
                </h2>
                
                <div class="space-y-4">
                  <div class="rounded-xl overflow-hidden border-2 border-gray-200 shadow-lg">
                    <img 
                      :src="event. venue_map_image" 
                      :alt="`${event.venue_name} map`" 
                      class="w-full h-auto object-contain bg-gray-50"
                    />
                  </div>

                  <div class="bg-gradient-to-r from-primary-50 to-accent-50 rounded-xl p-5 border border-primary-200">
                    <p class="font-bold text-gray-900 text-lg mb-1">{{ event.venue_name }}</p>
                    <p class="text-gray-700">{{ event.venue_address }}</p>
                    <p class="text-gray-600">{{ event.venue_city }}</p>
                  </div>
                </div>
              </div>

              <!-- Organizer Info -->
              <div v-if="event.organizer_description || event.organizer_contact_email" 
                   class="bg-gradient-to-br from-primary-50 to-accent-50 rounded-2xl p-8 shadow-md border-2 border-primary-200">
                <h2 class="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                  <div class="w-1.5 h-10 bg-gradient-to-b from-primary-600 to-accent-600 rounded-full mr-4"></div>
                  <UserGroupIcon class="w-7 h-7 mr-2 text-accent-600" />
                  About the Organizer
                </h2>
                
                <div class="flex flex-col md:flex-row items-start gap-6">
                  <div v-if="event.logo_image" class="flex-shrink-0">
                    <img 
                      :src="event.logo_image" 
                      :alt="event.organizer_name"
                      class="w-24 h-24 rounded-2xl object-cover border-4 border-white shadow-xl"
                    />
                  </div>
                  
                  <div class="flex-1">
                    <h3 class="text-2xl font-bold text-gray-900 mb-3">
                      {{ event.organizer_name }}
                    </h3>
                    
                    <p v-if="event.organizer_description" class="text-gray-700 mb-4 leading-relaxed whitespace-pre-line">
                      {{ event.organizer_description }}
                    </p>
                    
                    <div class="flex flex-wrap gap-3">
                      <a v-if="event.organizer_contact_email" 
                         :href="`mailto:${event.organizer_contact_email}`" 
                         class="inline-flex items-center space-x-2 bg-white px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors shadow-md border border-gray-200 font-medium">
                        <EnvelopeIcon class="w-5 h-5 text-primary-600" />
                        <span class="text-sm text-gray-700">{{ event.organizer_contact_email }}</span>
                      </a>
                      
                      <a v-if="event.organizer_contact_phone" 
                         :href="`tel:${event.organizer_contact_phone}`" 
                         class="inline-flex items-center space-x-2 bg-white px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors shadow-md border border-gray-200 font-medium">
                        <PhoneIcon class="w-5 h-5 text-primary-600" />
                        <span class="text-sm text-gray-700">{{ event.organizer_contact_phone }}</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Terms & Conditions -->
              <div v-if="event.terms_and_conditions" 
                   class="bg-white rounded-2xl p-8 shadow-md border-2 border-orange-200">
                <h2 class="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                  <div class="w-1.5 h-10 bg-gradient-to-b from-orange-600 to-red-600 rounded-full mr-4"></div>
                  <ExclamationCircleIcon class="w-7 h-7 mr-2 text-orange-600" />
                  Terms & Conditions
                </h2>
                
                <div class="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl p-5 mb-6 border-2 border-orange-300 shadow-sm">
                  <p class="text-sm text-orange-900 font-bold flex items-start">
                    <ExclamationCircleIcon class="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                    <span><strong>Important:</strong> By purchasing tickets, you agree to these terms and conditions.</span>
                  </p>
                </div>

                <div class="prose max-w-none">
                  <p class="text-gray-700 leading-relaxed whitespace-pre-line">
                    {{ event.terms_and_conditions }}
                  </p>
                </div>
              </div>

              <!-- Sessions (if multiple) -->
              <div v-if="sessions.length > 1" class="bg-white rounded-2xl p-8 shadow-md border border-gray-200">
                <h2 class="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                  <div class="w-1.5 h-10 bg-gradient-to-b from-primary-600 to-accent-600 rounded-full mr-4"></div>
                  <ClockIcon class="w-7 h-7 mr-2 text-success-600" />
                  Select Session
                </h2>
                
                <div class="grid grid-cols-1 gap-4">
                  <button
                    v-for="session in sessions"
                    :key="session.session_id"
                    @click="selectSession(session)"
                    :class="[
                      'group text-left p-6 rounded-xl border-2 transition-all transform hover:scale-[1.02]',
                      selectedSession?. session_id === session.session_id
                        ? 'border-primary-600 bg-gradient-to-r from-primary-50 to-accent-50 shadow-xl'
                        : 'border-gray-200 hover:border-primary-300 bg-white hover:shadow-lg'
                    ]"
                  >
                    <div class="flex items-center justify-between">
                      <div>
                        <p class="font-bold text-lg text-gray-900 mb-1">{{ session.title }}</p>
                        <p class="text-sm text-gray-600 flex items-center">
                          <ClockIcon class="w-4 h-4 mr-1" />
                          {{ new Date(session.start_time).toLocaleString() }}
                        </p>
                      </div>
                      <div class="text-right">
                        <Badge 
                          :variant="session.available_quantity > 50 ? 'success' : 'warning'" 
                          size="lg"
                          class="font-bold"
                        >
                          {{ session.available_quantity }} left
                        </Badge>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <!-- Right Column - Ticket Sidebar -->
            <div class="lg:col-span-1">
              <div class="sticky top-24 space-y-4">
                <!-- Early Access Warning -->
                <div 
                  v-if="earlyAccessInfo?.isActive && !earlyAccessInfo?.isPremium"
                  class="bg-gradient-to-br from-yellow-500 to-orange-600 text-white rounded-2xl p-6 shadow-2xl"
                >
                  <div class="flex items-start space-x-3">
                    <div class="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center flex-shrink-0">
                      <StarIcon class="w-7 h-7" />
                    </div>
                    <div class="flex-1">
                      <h3 class="font-bold text-xl mb-2">Premium Early Access</h3>
                      <p class="text-white/90 text-sm mb-4">
                        Premium members are buying now! <br>
                        Public sale in <strong class="text-2xl">{{ earlyAccessInfo.minutesRemaining }}</strong> minutes
                      </p>
                      <Button 
                        variant="secondary" 
                        size="md"
                        full-width
                        class="bg-white text-orange-600 hover:bg-gray-100 font-bold"
                        @click="router.push('/participant/membership')"
                      >
                        <StarIcon class="inline w-5 h-5 mr-1 mb-1" />
                        Upgrade to Premium
                      </Button>
                    </div>
                  </div>
                </div>

                <!-- Ticket Card -->
                <div class="bg-white rounded-2xl shadow-xl border-2 border-gray-200 overflow-hidden">
                  <!-- Header -->
                  <div class="bg-gradient-to-r from-primary-600 to-accent-600 p-6 text-white">
                    <h2 class="text-2xl font-bold flex items-center">
                      <TicketIcon class="w-7 h-7 mr-2" />
                      Get Tickets
                    </h2>
                  </div>

                  <!-- Content -->
                  <div class="p-6">
                    <!-- No Session Selected -->
                    <div v-if="sessions.length > 1 && ! selectedSession" class="text-center py-12">
                      <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <TicketIcon class="w-10 h-10 text-gray-400" />
                      </div>
                      <p class="text-gray-600 font-medium">Please select a session first</p>
                    </div>

                    <!-- Loading Tickets -->
                    <div v-else-if="loadingTickets" class="flex flex-col justify-center items-center py-12">
                      <Spinner size="lg" />
                      <p class="text-gray-500 mt-3">Loading tickets...</p>
                    </div>

                    <!-- Ticket Selector -->
                    <div v-else-if="ticketTypes.length > 0" class="space-y-4">
                      <!-- Premium Badge -->
                      <div v-if="earlyAccessInfo?. isActive && earlyAccessInfo?. isPremium" 
                           class="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-xl p-4">
                        <div class="flex items-center space-x-2 mb-1">
                          <StarIcon class="inline w-5 h-5 text-yellow-600 mb-1" />
                          <span class="font-bold text-yellow-900">Premium Early Access! </span>
                        </div>
                        <p class="text-xs text-yellow-800">
                          You have {{ earlyAccessInfo.minutesRemaining }} minutes advantage
                        </p>
                      </div>

                      <TicketSelector
                        v-model="selectedTickets"
                        :ticket-types="ticketTypes"
                        :max-per-order="10"
                      />

                      <div class="space-y-3 pt-4">
                        <Button
                          variant="primary"
                          size="lg"
                          full-width
                          :disabled="!canPurchase || joiningQueue"
                          @click="handlePurchase"
                          class="font-bold text-lg shadow-lg"
                        >
                          <Spinner v-if="joiningQueue" size="sm" class="mr-2" />
                          <TicketIcon v-else class="inline-flex w-6 h-6 mr-2 mb-1" />
                          {{ buyButtonText }}
                        </Button>

                        <p v-if="! canPurchase && selectedTickets.length > 0" 
                           class="text-sm text-center text-orange-600 font-medium mt-2">
                          {{ earlyAccessInfo?.isActive && ! earlyAccessInfo?.isPremium 
                             ? '⏰ Upgrade to Premium to buy now' 
                             : 'Please select tickets' }}
                        </p>

                        <!-- Share Buttons -->
                        <div class="grid grid-cols-2 gap-2 pt-2">
                          <Button
                            variant="secondary"
                            @click="handleShare"
                            class="flex items-center justify-center"
                          >
                            <ShareIcon class="inline-flex w-5 h-5 mr-2" />
                            Share
                          </Button>
                          <Button
                            variant="secondary"
                            @click="() => {}"
                            class="flex items-center justify-center"
                          >
                            <HeartIcon class="inline-flex w-5 h-5 mr-2" />
                            Save
                          </Button>
                        </div>
                      </div>
                    </div>

                    <!-- No Tickets -->
                    <div v-else class="text-center py-12">
                      <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <TicketIcon class="w-10 h-10 text-gray-400" />
                      </div>
                      <p class="text-gray-600 font-medium mb-2">No tickets available</p>
                      <p class="text-sm text-gray-500">Check back later for updates</p>
                    </div>
                  </div>
                </div>

                <!-- Event Safety Notice -->
                <div class="bg-blue-50 rounded-xl p-5 border border-blue-200">
                  <h3 class="font-bold text-blue-900 mb-2 flex items-center">
                    <ExclamationCircleIcon class="w-5 h-5 mr-2" />
                    Event Safety
                  </h3>
                  <p class="text-sm text-blue-800">
                    Your safety is our priority. Please follow all venue guidelines and event policies.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>