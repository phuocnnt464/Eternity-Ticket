<script setup>
import { computed } from 'vue'
import { 
  TicketIcon, 
  CalendarIcon, 
  MapPinIcon,
  QrCodeIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon  
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
  if (!props.ticket.start_time) return ''
  const date = new Date(props.ticket.start_time)
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
  const ticket = props.ticket
  const now = new Date()
  const eventDate = new Date(ticket.start_time)
  
  if (ticket.status === 'cancelled') {
    return {
      variant: 'danger',
      text: 'Cancelled',
      icon: XCircleIcon
    }
  }
  
  if (ticket.status === 'refunded') {
    return {
      variant: 'secondary',
      text: 'Refunded',
      icon: XCircleIcon
    }
  }
  
  if (ticket.order_status !== 'paid') {
    return {
      variant: 'warning',
      text: 'Order Pending',
      icon: ClockIcon
    }
  }
  
  if (ticket.is_checked_in) {
    return {
      variant: 'success',
      text: 'Checked In',
      icon: CheckCircleIcon
    }
  }
  
  return {
    variant: 'primary',
    text: 'Valid',
    icon: TicketIcon
  }
})

const canUseTicket = computed(() => {
  return props.ticket.order_status === 'paid' && 
         props.ticket.status !== 'cancelled' &&
         props.ticket.status !== 'refunded'
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
          <p class="text-sm text-gray-500">{{ ticket.ticket_type }}</p>
        </div>
      </div>
      
      <Badge :variant="statusConfig.variant">
        <component :is="statusConfig.icon" class="w-4 h-4" />
        {{ statusConfig.text }}
      </Badge>
    </div>

    <div class="space-y-2 mb-4">
      <div class="flex items-center text-sm text-gray-600 space-x-2">
        <CalendarIcon class="w-4 h-4" />
        <span>{{ eventDate }}</span>
      </div>

      <div v-if="ticket.session_title" class="flex items-center text-sm text-gray-600 space-x-2">
        <MapPinIcon class="w-4 h-4 flex-shrink-0" />
        <span class="line-clamp-1">{{ ticket.session_title }}</span>
      </div>

      <div class="flex items-center text-sm text-gray-600 space-x-2">
        <QrCodeIcon class="w-4 h-4" />
        <span class="font-mono text-xs">{{ ticket.ticket_code }}</span>
      </div>
      
      <div class="flex items-center text-sm text-gray-600 space-x-2">
        <span class="text-xs">Order: {{ ticket.order_number }}</span>
      </div>
    </div>

    <div 
      v-if="ticket.status === 'cancelled'"
      class="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4 text-sm"
    >
      <p class="text-orange-800">
        <strong>This ticket has been cancelled</strong>
      </p>
      <p v-if="ticket.order_status === 'cancelled'" class="text-orange-700 text-xs mt-1">
        Reason: Order was cancelled or expired
      </p>
    </div>

    <div 
      v-if="ticket.is_checked_in && ticket.checked_in_at"
      class="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-sm"
    >
      <p class="text-green-800">
        <strong>✓ Checked in:</strong> {{ new Date(ticket.checked_in_at).toLocaleString() }}
      </p>
      <p v-if="ticket.checked_in_by" class="text-green-700 text-xs mt-1">
        By: {{ ticket.checked_in_by }}
      </p>
    </div>

    <div class="flex items-center space-x-2 pt-4 border-t">
      <Button 
        v-if="canUseTicket"
        variant="secondary" 
        size="sm"
        @click="emit('view-qr', ticket)"
        full-width
      >
        <QrCodeIcon class="inline w-4 h-4 mb-1" />
        View QR
      </Button>
      
      <Button 
        v-if="canUseTicket"
        variant="primary" 
        size="sm"
        @click="emit('download', ticket)"
        full-width
      >
        Download PDF
      </Button>
      
      <div 
        v-if="!canUseTicket"
        class="w-full text-center text-sm text-gray-500 py-2"
      >
        {{ ticket.status === 'cancelled' ? 'Ticket is no longer valid' : 'Order not completed' }}
      </div>
    </div>
  </div>
</template>