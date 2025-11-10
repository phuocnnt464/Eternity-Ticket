<script setup>
import { computed } from 'vue'
import { 
  TicketIcon, 
  CalendarIcon, 
  MapPinIcon,
  QrCodeIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/vue/24/outline'
import Badge from '@/components/common/Badge.vue'
import Button from '@/components/common/Button.vue'

const props = defineProps({
  ticket: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['view-qr', 'download'])

const eventDate = computed(() => {
  if (!props.ticket.event_start_date) return ''
  const date = new Date(props.ticket.event_start_date)
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
})

const statusConfig = computed(() => {
  const status = props.ticket.checkin_status
  
  if (status === 'checked_in') {
    return {
      variant: 'success',
      text: 'Checked In',
      icon: CheckCircleIcon
    }
  }
  
  const now = new Date()
  const eventDate = new Date(props.ticket.event_start_date)
  
  if (eventDate < now) {
    return {
      variant: 'danger',
      text: 'Expired',
      icon: ClockIcon
    }
  }
  
  return {
    variant: 'info',
    text: 'Valid',
    icon: TicketIcon
  }
})
</script>

<template>
  <div class="card hover:shadow-lg transition-shadow">
    <div class="flex items-start justify-between mb-4">
      <div class="flex items-center space-x-3">
        <div class="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
          <TicketIcon class="w-6 h-6 text-primary-600" />
        </div>
        <div>
          <h3 class="font-semibold text-lg">{{ ticket.event_title }}</h3>
          <p class="text-sm text-gray-500">{{ ticket.ticket_type_name }}</p>
        </div>
      </div>
      
      <Badge :variant="statusConfig.variant">
        <component :is="statusConfig.icon" class="w-4 h-4" />
        {{ statusConfig.text }}
      </Badge>
    </div>

    <!-- Event Details -->
    <div class="space-y-2 mb-4">
      <div class="flex items-center text-sm text-gray-600 space-x-2">
        <CalendarIcon class="w-4 h-4" />
        <span>{{ eventDate }}</span>
      </div>

      <div v-if="ticket.venue_name" class="flex items-center text-sm text-gray-600 space-x-2">
        <MapPinIcon class="w-4 h-4 flex-shrink-0" />
        <span class="line-clamp-1">{{ ticket.venue_name }}</span>
      </div>

      <div class="flex items-center text-sm text-gray-600 space-x-2">
        <QrCodeIcon class="w-4 h-4" />
        <span class="font-mono">{{ ticket.ticket_code }}</span>
      </div>
    </div>

    <!-- Check-in Info -->
    <div 
      v-if="ticket.checkin_status === 'checked_in' && ticket.checked_in_at"
      class="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-sm"
    >
      <p class="text-green-800">
        <strong>Checked in:</strong> {{ new Date(ticket.checked_in_at).toLocaleString() }}
      </p>
      <p v-if="ticket.checked_in_by" class="text-green-700 text-xs mt-1">
        By: {{ ticket.checked_in_by }}
      </p>
    </div>

    <!-- Actions -->
    <div class="flex items-center space-x-2 pt-4 border-t">
      <Button 
        variant="secondary" 
        size="sm"
        @click="emit('view-qr', ticket)"
        full-width
      >
        <QrCodeIcon class="w-4 h-4" />
        View QR
      </Button>
      
      <Button 
        variant="primary" 
        size="sm"
        @click="emit('download', ticket)"
        full-width
      >
        Download PDF
      </Button>
    </div>
  </div>
</template>