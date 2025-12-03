<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import {
  CalendarIcon,
  MapPinIcon,
  TicketIcon,
  ClockIcon
} from '@heroicons/vue/24/outline'
import Badge from '@/components/common/Badge.vue'

const props = defineProps({
  event: {
    type: Object,
    required: true
  },
  hover: {
    type: Boolean,
    default: true
  }
})

const eventImage = computed(() => {
  return props.event.thumbnail_image || props.event.cover_image || '/placeholder-event.jpg'
})

const startDate = computed(() => {
  if (!props.event.start_date) return ''
  const date = new Date(props.event.start_date)
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  })
})

const startTime = computed(() => {
  if (!props.event.start_date) return ''
  const date = new Date(props.event.start_date)
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
})

const minPrice = computed(() => {
  if (!props.event.min_price) return 'Free'
  return `From ${formatPrice(props.event.min_price)}`
})

const formatPrice = (price) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(price)
}

const statusBadge = computed(() => {
  const status = props.event.status
  const availableTickets = props.event.available_tickets || 0
  if (status === 'pending') return { text: 'Pending Approval', variant: 'warning' }
  if (status === 'rejected') return { text: 'Rejected', variant: 'danger' }
  if (status === 'cancelled') return { text: 'Cancelled', variant: 'danger' }
  
  if (status === 'approved' || status === 'active') {
    if (availableTickets > 0) {
      return { text: 'Available', variant: 'success' }
    } else {
      return { text: 'Sold Out', variant: 'danger' } 
    }
  }
})
</script>

<template>
  <RouterLink 
    :to="`/events/${event.slug}`"
    :class="[
      'card block overflow-hidden group',
      hover && 'card-hover'
    ]"
  >
    <div class="relative overflow-hidden rounded-t-lg -m-6 mb-4">
      <img 
        :src="eventImage" 
        :alt="event.title"
        class="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-110"
      />
      
      <div class="absolute top-3 right-3">
        <Badge :variant="statusBadge.variant">
          {{ statusBadge.text }}
        </Badge>
      </div>

      <div v-if="event.category_name" class="absolute bottom-3 left-3">
        <Badge variant="primary">
          {{ event.category_name }}
        </Badge>
      </div>
    </div>

    <div class="space-y-3">
      <h3 class="font-semibold text-lg text-gray-900 line-clamp-2 group-hover:text-primary-600 transition-colors">
        {{ event.title }}
      </h3>

      <p v-if="event.organizer_name" class="text-sm text-gray-600">
        by {{ event.organizer_name }}
      </p>

      <div class="flex items-center text-sm text-gray-600 space-x-4">
        <div class="flex items-center space-x-1">
          <CalendarIcon class="w-4 h-4" />
          <span>{{ startDate }}</span>
        </div>
        <div class="flex items-center space-x-1">
          <ClockIcon class="w-4 h-4" />
          <span>{{ startTime }}</span>
        </div>
      </div>

      <div v-if="event.venue_name" class="flex items-center text-sm text-gray-600 space-x-1">
        <MapPinIcon class="w-4 h-4 flex-shrink-0" />
        <span class="line-clamp-1">{{ event.venue_name }}</span>
      </div>
      <div class="flex items-center justify-between pt-3 border-t">
        <div class="flex items-center text-sm text-gray-600 space-x-1">
          <TicketIcon class="w-4 h-4" />
          <span v-if="event.available_tickets > 0">
            {{ event.available_tickets }} left  
          </span>
          <span v-else-if="event.total_tickets_sold">
            {{ event.total_tickets_sold || 0 }} sold  
          </span>
          <span v-else>
            Sold Out  
          </span>
        </div>
        <div class="font-semibold text-primary-600">
          {{ minPrice }}
        </div>
      </div>
    </div>
  </RouterLink>
</template>