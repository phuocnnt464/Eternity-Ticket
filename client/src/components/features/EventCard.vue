<!-- client/src/components/features/EventCard.vue -->
<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import Badge from '@/components/common/Badge.vue'
import Button from '@/components/common/Button.vue'
import { 
  MapPinIcon,
  CalendarIcon,
  TicketIcon,
  UserIcon
} from '@heroicons/vue/24/outline'

const props = defineProps({
  event: {
    type: Object,
    required: true
  }
})

const router = useRouter()

// Format price
const formattedPrice = computed(() => {
  if (!props.event. min_price) return 'Free'
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(props.event.min_price)
})

// Format date
const formattedDate = computed(() => {
  if (!props.event. earliest_session) return 'TBA'
  return new Date(props.event.earliest_session).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
})

// Image URL with fallback
const imageUrl = computed(() => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
  
  if (props.event.thumbnail_image) {
    if (props.event.thumbnail_image.startsWith('http')) {
      return props.event.thumbnail_image
    }
    return `${baseUrl}${props.event.thumbnail_image}`
  }
  
  if (props.event.cover_image) {
    if (props. event.cover_image.startsWith('http')) {
      return props.event.cover_image
    }
    return `${baseUrl}${props.event.cover_image}`
  }
  
  return '/placeholder-event.jpg'
})

const handleClick = () => {
  router. push(`/events/${props.event.slug || props.event.id}`)
}
</script>

<template>
  <div 
    class="card cursor-pointer hover:shadow-lg transition-shadow duration-200 overflow-hidden"
    @click="handleClick"
  >
    <!-- Event Image -->
    <div class="relative h-48 bg-gray-200 overflow-hidden">
      <img
        :src="imageUrl"
        :alt="event.title"
        class="w-full h-full object-cover"
        @error="$event.target.src = '/placeholder-event. jpg'"
      />
      
      <!-- Category Badge -->
      <div v-if="event.category_name" class="absolute top-3 left-3">
        <Badge variant="primary">{{ event.category_name }}</Badge>
      </div>
      
      <!-- Available Tickets Badge -->
      <div v-if="event.available_tickets > 0" class="absolute top-3 right-3">
        <Badge variant="success">{{ event.available_tickets }} tickets left</Badge>
      </div>
      <div v-else class="absolute top-3 right-3">
        <Badge variant="danger">Sold Out</Badge>
      </div>
    </div>

    <!-- Event Details -->
    <div class="p-4">
      <!-- Title -->
      <h3 class="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 hover:text-primary-600 transition-colors">
        {{ event.title }}
      </h3>

      <!-- Short Description -->
      <p v-if="event.short_description" class="text-sm text-gray-600 mb-3 line-clamp-2">
        {{ event.short_description }}
      </p>

      <!-- Event Info -->
      <div class="space-y-2 mb-3">
        <!-- Date -->
        <div class="flex items-center text-sm text-gray-600">
          <CalendarIcon class="w-4 h-4 mr-2 flex-shrink-0" />
          <span>{{ formattedDate }}</span>
        </div>

        <!-- Location -->
        <div v-if="event.venue_name" class="flex items-center text-sm text-gray-600">
          <MapPinIcon class="w-4 h-4 mr-2 flex-shrink-0" />
          <span class="truncate">{{ event.venue_name }}, {{ event.venue_city }}</span>
        </div>

        <!-- Organizer -->
        <div v-if="event. organizer_name" class="flex items-center text-sm text-gray-600">
          <UserIcon class="w-4 h-4 mr-2 flex-shrink-0" />
          <span class="truncate">{{ event.organizer_name }}</span>
        </div>
      </div>

      <!-- Price & CTA -->
      <div class="flex items-center justify-between pt-3 border-t border-gray-200">
        <div>
          <p class="text-xs text-gray-500">Starting from</p>
          <p class="text-lg font-bold text-primary-600">{{ formattedPrice }}</p>
        </div>
        
        <Button 
          variant="primary" 
          size="sm"
          @click. stop="handleClick"
        >
          <TicketIcon class="w-4 h-4 mr-1" />
          Book Now
        </Button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>