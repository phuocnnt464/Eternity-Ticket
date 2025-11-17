<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { adminAPI } from '@/api/admin.js'
import Card from '@/components/common/Card.vue'
import Button from '@/components/common/Button.vue'
import Badge from '@/components/common/Badge.vue'
import Spinner from '@/components/common/Spinner.vue'
import {
  CalendarIcon,
  TicketIcon,
  UsersIcon,
  CurrencyDollarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon
} from '@heroicons/vue/24/outline'

const router = useRouter()

const loading = ref(true)
const stats = ref({
  total_events: 0,
  pending_events: 0,
  total_users: 0,
  total_revenue: 0,
  total_tickets_sold: 0,
  active_organizers: 0,
  pending_refunds: 0
})

const recentEvents = ref([])
const recentUsers = ref([])

const statCards = computed(() => [
  {
    title: 'Total Events',
    value: stats.value.total_events,
    icon: CalendarIcon,
    color: 'blue',
    change: '+15%',
    trend: 'up'
  },
  {
    title: 'Total Users',
    value: stats.value.total_users,
    icon: UsersIcon,
    color: 'green',
    change: '+23%',
    trend: 'up'
  },
  {
    title: 'Platform Revenue',
    value: formatPrice(stats.value.total_revenue),
    icon: CurrencyDollarIcon,
    color: 'purple',
    change: '+18%',
    trend: 'up'
  },
  {
    title: 'Tickets Sold',
    value: stats.value.total_tickets_sold,
    icon: TicketIcon,
    color: 'yellow',
    change: '+31%',
    trend: 'up'
  }
])

const alertCards = computed(() => [
  {
    title: 'Pending Approvals',
    value: stats.value.pending_events,
    color: 'yellow',
    icon: ClockIcon,
    action: () => router.push('/admin/events')
  },
  {
    title: 'Pending Refunds',
    value: stats.value.pending_refunds,
    color: 'red',
    icon: ExclamationTriangleIcon,
    action: () => router.push('/admin/refunds')
  }
])

const fetchDashboardData = async () => {
  loading.value = true
  try {
    // const [statsRes, eventsRes, usersRes] = await Promise.all([
    //   adminAPI.getSystemStats(),
    //   adminAPI.getRecentEvents({ limit: 5 }),
    //   adminAPI.getRecentUsers({ limit: 5 })
    // ])
    
    const response = await adminAPI.getDashboardStats() 

    // if (response.success) {
    //   stats.value = response.data.stats || {}
    //   recentEvents.value = response.data.recent_events || []
    //   recentUsers.value = response.data.recent_users || []
    // }

      const data = response.data || {}
    
    // Map server data to stats
    stats.value = {
      total_events: data.events?.total || 0,
      pending_events: data.events?.pending || 0,
      total_users: data.users?.active || 0,
      total_revenue: data.revenue?.total || 0,
      total_tickets_sold: data.tickets?.total || 0,
      active_organizers: data.users?.by_role?.organizer || 0,
      pending_refunds: data.refunds?.pending || 0
    }

    recentEvents.value = data.events?.recent || []
    recentUsers.value = data.users?.recent || []
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
    rejected: { variant: 'danger', text: 'Rejected' }
  }
  return badges[status] || badges.pending_approval
}

const getRoleBadge = (role) => {
  const badges = {
    admin: { variant: 'danger', text: 'Admin' },
    sub_admin: { variant: 'warning', text: 'Sub Admin' },
    organizer: { variant: 'primary', text: 'Organizer' },
    participant: { variant: 'info', text: 'Participant' }
  }
  return badges[role] || badges.participant
}

onMounted(() => {
  fetchDashboardData()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
      <p class="text-gray-600 mt-1">System overview and management</p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <Spinner size="xl" />
    </div>

    <div v-else class="space-y-6">
      <!-- Alert Cards -->
      <div v-if="stats.pending_events > 0 || stats.pending_refunds > 0" class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card
          v-for="alert in alertCards.filter(a => a.value > 0)"
          :key="alert.title"
          :class="[
            'cursor-pointer transition-all hover:shadow-lg',
            alert.color === 'yellow' ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'
          ]"
          @click="alert.action"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <div :class="[
                'w-12 h-12 rounded-full flex items-center justify-center',
                alert.color === 'yellow' ? 'bg-yellow-100' : 'bg-red-100'
              ]">
                <component
                  :is="alert.icon"
                  :class="[
                    'w-6 h-6',
                    alert.color === 'yellow' ? 'text-yellow-600' : 'text-red-600'
                  ]"
                />
              </div>
              <div>
                <p :class="[
                  'text-sm',
                  alert.color === 'yellow' ? 'text-yellow-600' : 'text-red-600'
                ]">
                  {{ alert.title }}
                </p>
                <p :class="[
                  'text-2xl font-bold',
                  alert.color === 'yellow' ? 'text-yellow-900' : 'text-red-900'
                ]">
                  {{ alert.value }}
                </p>
              </div>
            </div>
            <Button
              :variant="alert.color === 'yellow' ? 'secondary' : 'danger'"
              size="sm"
            >
              Review
            </Button>
          </div>
        </Card>
      </div>

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
            <div class="flex items-center space-x-1 text-green-600 text-sm">
              <ArrowTrendingUpIcon class="w-4 h-4" />
              <span>{{ stat.change }}</span>
            </div>
          </div>
          <p class="text-gray-600 text-sm mb-1">{{ stat.title }}</p>
          <p class="text-2xl font-bold text-gray-900">{{ stat.value }}</p>
        </Card>
      </div>

      <!-- Recent Activity -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <!-- Recent Events -->
        <Card>
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold">Recent Events</h2>
            <Button variant="ghost" size="sm" @click="router.push('/admin/events')">
              View All →
            </Button>
          </div>

          <div v-if="recentEvents.length > 0" class="space-y-3">
            <div
              v-for="event in recentEvents"
              :key="event.event_id"
              class="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div class="flex-1 min-w-0">
                <h3 class="font-medium text-gray-900 truncate">{{ event.title }}</h3>
                <p class="text-sm text-gray-600">
                  by {{ event.organizer_name }}
                </p>
              </div>

              <Badge :variant="getStatusBadge(event.status).variant">
                {{ getStatusBadge(event.status).text }}
              </Badge>
            </div>
          </div>

          <div v-else class="text-center py-8 text-gray-500">
            No recent events
          </div>
        </Card>

        <!-- Recent Users -->
        <Card>
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold">Recent Users</h2>
            <Button variant="ghost" size="sm" @click="router.push('/admin/users')">
              View All →
            </Button>
          </div>

          <div v-if="recentUsers.length > 0" class="space-y-3">
            <div
              v-for="user in recentUsers"
              :key="user.user_id"
              class="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div class="flex items-center space-x-3">
                <div class="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                  <span class="text-primary-600 font-semibold">
                    {{ user.first_name?.charAt(0) || 'U' }}
                  </span>
                </div>
                <div class="flex-1 min-w-0">
                  <h3 class="font-medium text-gray-900">
                    {{ user.first_name }} {{ user.last_name }}
                  </h3>
                  <p class="text-sm text-gray-600">{{ user.email }}</p>
                </div>
              </div>

              <Badge :variant="getRoleBadge(user.role).variant">
                {{ getRoleBadge(user.role).text }}
              </Badge>
            </div>
          </div>

          <div v-else class="text-center py-8 text-gray-500">
            No recent users
          </div>
        </Card>
      </div>

      <!-- Quick Actions -->
      <Card>
        <h2 class="text-lg font-semibold mb-4">Quick Actions</h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            @click="router.push('/admin/events')"
            class="p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all group"
          >
            <CalendarIcon class="w-8 h-8 text-gray-400 group-hover:text-primary-600 mx-auto mb-2" />
            <p class="text-sm font-medium text-gray-700 group-hover:text-primary-700">
              Event Approval
            </p>
          </button>

          <button
            @click="router.push('/admin/users')"
            class="p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all group"
          >
            <UsersIcon class="w-8 h-8 text-gray-400 group-hover:text-primary-600 mx-auto mb-2" />
            <p class="text-sm font-medium text-gray-700 group-hover:text-primary-700">
              User Management
            </p>
          </button>

          <button
            @click="router.push('/admin/refunds')"
            class="p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all group"
          >
            <CurrencyDollarIcon class="w-8 h-8 text-gray-400 group-hover:text-primary-600 mx-auto mb-2" />
            <p class="text-sm font-medium text-gray-700 group-hover:text-primary-700">
              Refund Requests
            </p>
          </button>

          <button
            @click="router.push('/admin/audit-logs')"
            class="p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all group"
          >
            <ChartBarIcon class="w-8 h-8 text-gray-400 group-hover:text-primary-600 mx-auto mb-2" />
            <p class="text-sm font-medium text-gray-700 group-hover:text-primary-700">
              Audit Logs
            </p>
          </button>
        </div>
      </Card>
    </div>
  </div>
</template>