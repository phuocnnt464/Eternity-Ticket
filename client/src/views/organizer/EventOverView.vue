<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { eventsAPI } from '@/api/events.js'
import Card from '@/components/common/Card.vue'
import Button from '@/components/common/Button.vue'
import Badge from '@/components/common/Badge.vue'
import Spinner from '@/components/common/Spinner.vue'
import {
  ArrowLeftIcon,
  ChartBarIcon,
  ShoppingCartIcon,
  TicketIcon,
  UserGroupIcon,
  TagIcon,
  Cog6ToothIcon,
  QrCodeIcon,
  CalendarIcon
} from '@heroicons/vue/24/outline'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const eventId = ref(route.params.id)
const event = ref(null)

const menuItems = [
  {
    title: 'Statistics',
    description: 'View event statistics, revenue, and ticket sales',
    icon: ChartBarIcon,
    color: 'purple',
    route: `/organizer/events/${eventId.value}/statistics`
  },
  {
    title: 'Orders',
    description: 'Manage orders and view customer information',
    icon: ShoppingCartIcon,
    color: 'blue',
    route: `/organizer/events/${eventId.value}/orders`
  },
  {
    title: 'Tickets',
    description: 'Manage ticket types and availability',
    icon: TicketIcon,
    color: 'green',
    route: `/organizer/events/${eventId.value}/sessions`
  },
  {
    title: 'Check-in',
    description: 'Check-in attendees with QR code scanner',
    icon: QrCodeIcon,
    color: 'yellow',
    route: `/organizer/events/${eventId.value}/checkin`
  },
  {
    title: 'Team',
    description: 'Manage team members and permissions',
    icon: UserGroupIcon,
    color: 'indigo',
    route: `/organizer/events/${eventId.value}/team`
  },
  {
    title: 'Coupons',
    description: 'Create and manage discount codes',
    icon: TagIcon,
    color: 'pink',
    route: `/organizer/events/${eventId.value}/coupons`
  },
  {
    title: 'Settings',
    description: 'Edit event information and settings',
    icon: Cog6ToothIcon,
    color: 'gray',
    route: `/organizer/events/${eventId.value}/edit`
  }
]

const getStatusBadge = (status) => {
  const badges = {
    draft: { variant: 'secondary', text: 'Draft' },
    pending: { variant: 'warning', text: 'Pending' },
    approved: { variant: 'success', text: 'Approved' },
    rejected: { variant: 'danger', text: 'Rejected' },
    cancelled: { variant: 'danger', text: 'Cancelled' }
  }
  return badges[status] || badges.draft
}

const fetchEventDetails = async () => {
  loading.value = true
  try {
    const response = await eventsAPI.getEventById(eventId.value)
    event.value = response.data.event || response.data.data
  } catch (error) {
    console.error('Failed to fetch event:', error)
    alert('Failed to load event')
    router.push('/organizer/events')
  } finally {
    loading.value = false
  }
}

const navigateTo = (route) => {
  router.push(route)
}

onMounted(() => {
  fetchEventDetails()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <button
        @click="router.push('/organizer/events')"
        class="flex items-center text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeftIcon class="w-5 h-5 mr-2" />
        Back to Events
      </button>
      
      <div v-if="loading" class="flex justify-center py-12">
        <Spinner size="xl" />
      </div>

      <div v-else class="flex items-start justify-between">
        <div class="flex-1">
          <div class="flex items-center space-x-3 mb-2">
            <h1 class="text-2xl font-bold text-gray-900">{{ event?.title }}</h1>
            <Badge :variant="getStatusBadge(event?.status).variant">
              {{ getStatusBadge(event?.status).text }}
            </Badge>
          </div>
          <div class="flex items-center space-x-4 text-sm text-gray-600">
            <div class="flex items-center">
              <CalendarIcon class="w-4 h-4 mr-1" />
              {{ event?.start_date ? new Date(event.start_date).toLocaleDateString() : 'N/A' }}
            </div>
            <div v-if="event?.venue_name">
              {{ event.venue_name }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Management Menu Grid -->
    <div v-if="!loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card
        v-for="item in menuItems"
        :key="item.title"
        class="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
        @click="navigateTo(item.route)"
      >
        <div class="flex items-start space-x-4">
          <div :class="[
            'flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center',
            `bg-${item.color}-100`
          ]">
            <component :is="item.icon" :class="`w-6 h-6 text-${item.color}-600`" />
          </div>
          <div class="flex-1">
            <h3 class="font-semibold text-gray-900 mb-1">{{ item.title }}</h3>
            <p class="text-sm text-gray-600">{{ item.description }}</p>
          </div>
        </div>
      </Card>
    </div>
  </div>
</template>