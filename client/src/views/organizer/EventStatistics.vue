<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { eventsAPI } from '@/api'
import Card from '@/components/common/Card.vue'
import Spinner from '@/components/common/Spinner.vue'
import Button from '@/components/common/Button.vue'
import {
  ArrowLeftIcon,
  ChartBarIcon,
  TicketIcon,
  CurrencyDollarIcon,
  UsersIcon,
  ArrowTrendingUpIcon,
  CalendarIcon
} from '@heroicons/vue/24/outline'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const eventId = ref(route.params.id)
const event = ref(null)
const statistics = ref({
  total_tickets: 0,
  tickets_sold: 0,
  tickets_available: 0,
  total_revenue: 0,
  total_orders: 0,
  average_order_value: 0,
  sales_by_ticket_type: [],
  sales_trend: []
})

const salesPercentage = computed(() => {
  if (!statistics.value.total_tickets) return 0
  return ((statistics.value.tickets_sold / statistics.value.total_tickets) * 100).toFixed(1)
})

const statCards = computed(() => [
  {
    title: 'Total Revenue',
    value: formatPrice(statistics.value.total_revenue),
    icon: CurrencyDollarIcon,
    color: 'purple',
    description: `${statistics.value.total_orders} orders`
  },
  {
    title: 'Tickets Sold',
    value: `${statistics.value.tickets_sold} / ${statistics.value.total_tickets}`,
    icon: TicketIcon,
    color: 'green',
    description: `${salesPercentage.value}% sold`
  },
  {
    title: 'Available Tickets',
    value: statistics.value.tickets_available,
    icon: UsersIcon,
    color: 'blue',
    description: 'Still available'
  },
  {
    title: 'Avg Order Value',
    value: formatPrice(statistics.value.average_order_value),
    icon: ChartBarIcon,
    color: 'yellow',
    description: 'Per transaction'
  }
])

const fetchStatistics = async () => {
  loading.value = true
  try {
    const [eventRes, statsRes] = await Promise.all([
      eventsAPI.getEventById(eventId.value),
      eventsAPI.getEventStatistics(eventId.value)
    ])
    
    event.value = eventRes.data.data
    statistics.value = statsRes.data.data
  } catch (error) {
    console.error('Failed to fetch statistics:', error)
    alert('Failed to load statistics')
    router.push('/organizer/events')
  } finally {
    loading.value = false
  }
}

const formatPrice = (price) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(price)
}

const exportReport = () => {
  alert('Export report feature - TODO')
}

onMounted(() => {
  fetchStatistics()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <button
          @click="router.push('/organizer/events')"
          class="flex items-center text-gray-600 hover:text-gray-900 mb-2"
        >
          <ArrowLeftIcon class="w-5 h-5 mr-2" />
          Back to Events
        </button>
        <h1 class="text-2xl font-bold text-gray-900">Event Statistics</h1>
        <p v-if="event" class="text-gray-600 mt-1">{{ event.title }}</p>
      </div>
      <Button variant="secondary" @click="exportReport">
        Export Report
      </Button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <Spinner size="xl" />
    </div>

    <div v-else>
      <!-- Event Info Card -->
      <Card v-if="event" class="bg-gradient-to-br from-primary-50 to-accent-50">
        <div class="flex items-center space-x-4">
          <img
            v-if="event.thumbnail_image"
            :src="event.thumbnail_image"
            :alt="event.title"
            class="w-20 h-20 object-cover rounded-lg"
          />
          <div class="flex-1">
            <h2 class="text-xl font-bold mb-1">{{ event.title }}</h2>
            <div class="flex items-center space-x-4 text-sm text-gray-600">
              <div class="flex items-center space-x-1">
                <CalendarIcon class="w-4 h-4" />
                <span>{{ new Date(event.start_date).toLocaleDateString() }}</span>
              </div>
              <span>•</span>
              <span>{{ event.venue_name }}</span>
            </div>
          </div>
        </div>
      </Card>

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
          </div>
          <p class="text-gray-600 text-sm mb-1">{{ stat.title }}</p>
          <p class="text-2xl font-bold text-gray-900 mb-1">{{ stat.value }}</p>
          <p class="text-xs text-gray-500">{{ stat.description }}</p>
        </Card>
      </div>

      <!-- Sales Progress -->
      <Card>
        <h3 class="text-lg font-semibold mb-4">Sales Progress</h3>
        <div class="space-y-3">
          <div class="flex items-center justify-between text-sm">
            <span class="text-gray-600">Tickets Sold</span>
            <span class="font-medium">{{ statistics.tickets_sold }} / {{ statistics.total_tickets }}</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-4">
            <div
              :style="{ width: `${salesPercentage}%` }"
              class="bg-gradient-to-r from-primary-600 to-accent-600 h-4 rounded-full transition-all duration-500"
            ></div>
          </div>
          <p class="text-sm text-gray-600">{{ salesPercentage }}% of total tickets sold</p>
        </div>
      </Card>

      <!-- Sales by Ticket Type -->
      <Card>
        <h3 class="text-lg font-semibold mb-4">Sales by Ticket Type</h3>
        <div v-if="statistics.sales_by_ticket_type?.length > 0" class="space-y-4">
          <div
            v-for="item in statistics.sales_by_ticket_type"
            :key="item.ticket_type_id"
            class="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
          >
            <div>
              <h4 class="font-medium mb-1">{{ item.ticket_type_name }}</h4>
              <p class="text-sm text-gray-600">
                {{ item.sold }} / {{ item.total }} sold ({{ ((item.sold / item.total) * 100).toFixed(0) }}%)
              </p>
            </div>
            <div class="text-right">
              <p class="text-lg font-bold text-primary-600">{{ formatPrice(item.revenue) }}</p>
              <p class="text-sm text-gray-600">Revenue</p>
            </div>
          </div>
        </div>
        <div v-else class="text-center py-8 text-gray-500">
          No sales data available
        </div>
      </Card>

      <!-- Quick Actions -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Button
          variant="secondary"
          @click="router.push(`/organizer/events/${eventId}/orders`)"
          full-width
        >
          View All Orders
        </Button>
        <Button
          variant="secondary"
          @click="router.push(`/organizer/events/${eventId}/checkin`)"
          full-width
        >
          Check-in
        </Button>
        <Button
          variant="secondary"
          @click="router.push(`/organizer/events/${eventId}/edit`)"
          full-width
        >
          Edit Event
        </Button>
      </div>
    </div>
  </div>
</template>