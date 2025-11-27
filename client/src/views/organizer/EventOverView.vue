<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { eventsAPI } from '@/api/events.js'
import { useEventPermissions } from '@/composables/useEventPermissions'
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
  CalendarIcon,
  DocumentTextIcon
} from '@heroicons/vue/24/outline'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const eventId = computed(() => route.params.id) 
const event = ref(null)

const { 
  eventRole, 
  isOwner,
  loading: loadingRole,
  canManageTeam, 
  canViewOrders,
  canCheckIn,
  canEditEvent,
  canViewStatistics,
  canManageSessions,
  canManageCoupons,
  fetchEventRole 
} = useEventPermissions(eventId)

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
    event.value = response.data.event || response.data.data?. event
    console.log('✅ Event loaded:', event.value)
  } catch (error) {
    console.error('❌ Failed to fetch event:', error)
    if (error.response?.status === 404) {
      alert('Event not found')
      router.push('/organizer/events')
    } else if (error.response?.status === 403) {
      alert('You do not have access to this event')
      router. push('/organizer/teams')
    }
  } finally {
    loading.value = false
  }
}

// ✅ SỬA: menuItems dựa trên role (computed)
const menuItems = computed(() => {
  const items = []

  console.log('🔑 Building menu for role:', eventRole.value)

  // Statistics - CHỈ OWNER
  if (canViewStatistics.value) {
    items.push({
      title: 'Statistics',
      description: 'View event statistics, revenue, and ticket sales',
      icon: ChartBarIcon,
      color: 'purple',
      route: `/organizer/events/${eventId. value}/statistics`,
      roles: ['owner']
    })
  }

  // Orders - OWNER & MANAGER (Manager chỉ xem)
  if (canViewOrders.value) {
    items.push({
      title: 'Orders',
      description: eventRole.value === 'manager' 
        ? 'View orders and customer information' 
        : 'Manage orders and view customer information',
      icon: ShoppingCartIcon,
      color: 'blue',
      route: `/organizer/events/${eventId.value}/orders`,
      roles: ['owner', 'manager']
    })
  }

  // Check-in - TẤT CẢ ROLES
  if (canCheckIn.value) {
    items. push({
      title: 'Check-in',
      description: 'Check-in attendees with QR code scanner',
      icon: QrCodeIcon,
      color: 'yellow',
      route: `/organizer/events/${eventId.value}/checkin`,
      roles: ['owner', 'manager', 'checkin_staff']
    })
  }

  // Team - OWNER & MANAGER
  if (canManageTeam.value) {
    items.push({
      title: 'Team',
      description: eventRole.value === 'manager'
        ? 'Add check-in staff members'
        : 'Manage team members and permissions',
      icon: UserGroupIcon,
      color: 'indigo',
      route: `/organizer/events/${eventId.value}/team`,
      roles: ['owner', 'manager']
    })
  }

  // Tickets/Sessions - CHỈ OWNER
  if (canManageSessions.value) {
    items.push({
      title: 'Tickets',
      description: 'Manage ticket types and availability',
      icon: TicketIcon,
      color: 'green',
      route: `/organizer/events/${eventId.value}/sessions`,
      roles: ['owner']
    })
  }

  // Coupons - CHỈ OWNER
  if (canManageCoupons.value) {
    items.push({
      title: 'Coupons',
      description: 'Create and manage discount codes',
      icon: TagIcon,
      color: 'pink',
      route: `/organizer/events/${eventId.value}/coupons`,
      roles: ['owner']
    })
  }

  // Settings/Edit - CHỈ OWNER
  if (canEditEvent.value) {
    items.push({
      title: 'Settings',
      description: 'Edit event information and settings',
      icon: Cog6ToothIcon,
      color: 'gray',
      route: `/organizer/events/${eventId.value}/edit`,
      roles: ['owner']
    })
  }

  console.log('📋 Menu items for role:', eventRole.value, '→', items. length, 'items')
  return items
})

const navigateTo = (route) => {
  router.push(route)
}

const getRoleBadgeClass = (role) => {
  const classes = {
    'owner': 'bg-purple-100 text-purple-700',
    'manager': 'bg-blue-100 text-blue-700',
    'checkin_staff': 'bg-green-100 text-green-700'
  }
  return classes[role] || 'bg-gray-100 text-gray-700'
}

const getRoleDisplayName = (role) => {
  const names = {
    'owner': 'Owner',
    'manager': 'Manager',
    'checkin_staff': 'Check-in Staff'
  }
  return names[role] || role
}

onMounted(async () => {
  await fetchEventRole()
  await fetchEventDetails()
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

            <span 
              v-if="eventRole"
              :class="[
                'px-3 py-1. 5 text-xs font-semibold rounded-full',
                getRoleBadgeClass(eventRole)
              ]"
            >
              Your Role: {{ getRoleDisplayName(eventRole) }}
            </span>
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

    <div v-if="!loading && !loadingRole && !eventRole" class="text-center py-12">
      <p class="text-gray-500">You do not have access to manage this event</p>
    </div>

    <!-- Management Menu Grid -->
    <div v-else-if="! loading && !loadingRole" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

     <!-- Info Card for Manager -->
    <Card v-if="eventRole === 'manager'" class="bg-blue-50 border-blue-200">
      <div class="flex items-start gap-3">
        <DocumentTextIcon class="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
        <div class="text-sm text-blue-900">
          <p class="font-semibold mb-2">Manager Permissions:</p>
          <ul class="list-disc list-inside space-y-1 text-blue-800">
            <li>View all orders and payment information</li>
            <li>View check-in statistics and details</li>
            <li>Add check-in staff members to the team</li>
            <li>Perform check-in for attendees</li>
            <li>Undo check-ins if needed</li>
          </ul>
          <p class="mt-2 text-xs text-blue-700">
            Note: Only the event owner can edit event details, manage sessions/tickets, and create coupons.
          </p>
        </div>
      </div>
    </Card>

    <!-- Info Card for Check-in Staff -->
    <Card v-if="eventRole === 'checkin_staff'" class="bg-green-50 border-green-200">
      <div class="flex items-start gap-3">
        <QrCodeIcon class="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
        <div class="text-sm text-green-900">
          <p class="font-semibold mb-2">Check-in Staff Role:</p>
          <p class="text-green-800">
            As a check-in staff member, you have access to the check-in system to verify and check-in attendees at the event entrance.
          </p>
        </div>
      </div>
    </Card>
  </div>
</template>