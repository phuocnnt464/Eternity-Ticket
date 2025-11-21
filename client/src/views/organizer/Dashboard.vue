<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { eventsAPI } from '@/api/events.js'
import Card from '@/components/common/Card.vue'
import Button from '@/components/common/Button.vue'
import Spinner from '@/components/common/Spinner.vue'
import Badge from '@/components/common/Badge.vue'
import {
  CalendarIcon,
  TicketIcon,
  CurrencyDollarIcon,
  UsersIcon,
  PlusCircleIcon,
  ArrowTrendingUpIcon,
  ClockIcon
} from '@heroicons/vue/24/outline'

const router = useRouter()

const loading = ref(true)
const stats = ref({
  total_events: 0,
  active_events: 0,
  total_tickets_sold: 0,
  total_revenue: 0,
  pending_approval: 0
})

const recentEvents = ref([])
const recentOrders = ref([])

const statCards = computed(() => [
  {
    title: 'Total Events',
    value: stats.value.total_events,
    icon: CalendarIcon,
    color: 'blue',
    change: '+12%',
    trend: 'up'
  },
  {
    title: 'Tickets Sold',
    value: stats.value.total_tickets_sold,
    icon: TicketIcon,
    color: 'green',
    change: '+23%',
    trend: 'up'
  },
  {
    title: 'Total Revenue',
    value: formatPrice(stats.value.total_revenue),
    icon: CurrencyDollarIcon,
    color: 'purple',
    change: '+18%',
    trend: 'up'
  },
  {
    title: 'Active Events',
    value: stats.value.active_events,
    icon: UsersIcon,
    color: 'yellow',
    change: stats.value.active_events,
    trend: 'neutral'
  }
])

const fetchDashboardData = async () => {
  loading.value = true
  try {
    const [statsRes, eventsRes] = await Promise.all([
      eventsAPI.getOrganizerStats(),
      // eventsAPI.getOrganizerEvents({ limit: 5, sort: 'created_at_desc' })
      eventsAPI.getMyEvents({ limit: 5, sort: 'created_at_desc' }) 
    ])
    
    if (statsRes.success) {
      stats.value = statsRes.data.stats || statsRes.data
    }

    if (eventsRes.success) {
      recentEvents.value = eventsRes.data.events || eventsRes.data.data || []
    }
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error)
  } finally {
    loading.value = false
  }
}

const formatPrice = (price) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    notation: 'compact'
  }).format(price)
}

const getStatusBadge = (status) => {
  const badges = {
    approved: { variant: 'success', text: 'Approved' },
    pending_approval: { variant: 'warning', text: 'Pending' },
    rejected: { variant: 'danger', text: 'Rejected' },
    draft: { variant: 'info', text: 'Draft' }
  }
  return badges[status] || badges.draft
}

onMounted(() => {
  fetchDashboardData()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p class="text-gray-600 mt-1">Welcome back! Here's your overview</p>
      </div>
      <Button variant="primary" @click="router.push('/organizer/events/create')">
        <PlusCircleIcon class="w-5 h-5" />
        Create Event
      </Button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <Spinner size="xl" />
    </div>

    <div v-else class="space-y-6">
      <!-- Stats Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card
          v-for="stat in statCards"
          :key="stat.title"
          class="hover:shadow-lg transition-shadow"
        >
          <div class="flex items-center justify-between mb-4">
            <div :class="[
              'w-12 h-12 rounded-lg flex items-center justify-center',
              stat.color === 'blue' ? 'bg-blue-100' :
              stat.color === 'green' ? 'bg-green-100' :
              stat.color === 'purple' ? 'bg-purple-100' : 'bg-yellow-100'
            ]">
              <component
                :is="stat.icon"
                :class="[
                  'w-6 h-6',
                  stat.color === 'blue' ? 'text-blue-600' :
                  stat.color === 'green' ? 'text-green-600' :
                  stat.color === 'purple' ? 'text-purple-600' : 'text-yellow-600'
                ]"
              />
            </div>
            <div v-if="stat.trend === 'up'" class="flex items-center space-x-1 text-green-600 text-sm">
              <ArrowTrendingUpIcon class="w-4 h-4" />
              <span>{{ stat.change }}</span>
            </div>
          </div>
          <p class="text-gray-600 text-sm mb-1">{{ stat.title }}</p>
          <p class="text-2xl font-bold text-gray-900">{{ stat.value }}</p>
        </Card>
      </div>

      <!-- Pending Approval Alert -->
      <div v-if="stats.pending_approval > 0" class="card bg-yellow-50 border-yellow-200">
        <div class="flex items-start space-x-3">
          <ClockIcon class="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
          <div class="flex-1">
            <h3 class="font-semibold text-yellow-900 mb-1">Events Pending Approval</h3>
            <p class="text-sm text-yellow-800 mb-3">
              You have <strong>{{ stats.pending_approval }}</strong> event(s) waiting for admin approval.
            </p>
            <Button variant="secondary" size="sm" @click="router.push('/organizer/events')">
              View Events
            </Button>
          </div>
        </div>
      </div>

      <!-- Recent Events & Quick Actions -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Recent Events -->
        <div class="lg:col-span-2">
          <Card>
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-semibold">Recent Events</h2>
              <Button variant="ghost" size="sm" @click="router.push('/organizer/events')">
                View All →
              </Button>
            </div>

            <div v-if="recentEvents.length > 0" class="space-y-3">
              <div
                v-for="event in recentEvents"
                :key="event.event_id"
                class="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                @click="router.push(`/organizer/events/${event.id}/edit`)"
              >
                <div class="flex items-center space-x-3 flex-1">
                  <img
                    v-if="event.thumbnail_image"
                    :src="event.thumbnail_image"
                    :alt="event.title"
                    class="w-12 h-12 object-cover rounded-lg"
                  />
                  <div class="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center" v-else>
                    <CalendarIcon class="w-6 h-6 text-gray-400" />
                  </div>
                  
                  <div class="flex-1 min-w-0">
                    <h3 class="font-medium text-gray-900 truncate">{{ event.title }}</h3>
                    <p class="text-sm text-gray-600">
                      {{ new Date(event.start_date).toLocaleDateString() }}
                    </p>
                  </div>
                </div>

                <div class="flex items-center space-x-3">
                  <div class="text-right mr-3">
                    <p class="text-sm text-gray-600">{{ event.total_tickets_sold || 0 }} sold</p>
                  </div>
                  <Badge :variant="getStatusBadge(event.status).variant">
                    {{ getStatusBadge(event.status).text }}
                  </Badge>
                </div>
              </div>
            </div>

            <div v-else class="text-center py-8 text-gray-500">
              No events yet. Create your first event!
            </div>
          </Card>
        </div>

        <!-- Quick Actions -->
        <div class="lg:col-span-1">
          <Card>
            <h2 class="text-lg font-semibold mb-4">Quick Actions</h2>
            <div class="space-y-2">
              <button
                @click="router.push('/organizer/events/create')"
                class="w-full text-left px-4 py-3 rounded-lg border-2 border-dashed border-gray-300 hover:border-primary-500 hover:bg-primary-50 transition-all group"
              >
                <div class="flex items-center space-x-3">
                  <PlusCircleIcon class="w-5 h-5 text-gray-400 group-hover:text-primary-600" />
                  <span class="font-medium text-gray-700 group-hover:text-primary-700">Create New Event</span>
                </div>
              </button>

              <button
                @click="router.push('/organizer/events')"
                class="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div class="flex items-center space-x-3">
                  <CalendarIcon class="w-5 h-5 text-gray-600" />
                  <span class="font-medium text-gray-700">Manage Events</span>
                </div>
              </button>

              <button
                class="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div class="flex items-center space-x-3">
                  <TicketIcon class="w-5 h-5 text-gray-600" />
                  <span class="font-medium text-gray-700">View Tickets</span>
                </div>
              </button>

              <button
                class="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div class="flex items-center space-x-3">
                  <CurrencyDollarIcon class="w-5 h-5 text-gray-600" />
                  <span class="font-medium text-gray-700">Revenue Report</span>
                </div>
              </button>
            </div>
          </Card>

          <!-- Help Card -->
          <Card class="mt-6 bg-gradient-to-br from-primary-50 to-accent-50">
            <h3 class="font-semibold mb-2">Need Help?</h3>
            <p class="text-sm text-gray-600 mb-4">
              Check out our guide on how to create successful events
            </p>
            <Button variant="secondary" size="sm" full-width>
              View Guide
            </Button>
          </Card>
        </div>
      </div>
    </div>
  </div>
</template>