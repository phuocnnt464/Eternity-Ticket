<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'  
import { eventsAPI } from '@/api/events.js'
import { 
  MinusIcon, 
  PlusIcon,
  InformationCircleIcon,
  StarIcon  
} from '@heroicons/vue/24/outline'
import Badge from '@/components/common/Badge.vue'

const authStore = useAuthStore()  
const earlyAccessHours = ref(5)
const premiumEarlyAccessLimit = ref(5) 

const props = defineProps({
  ticketTypes: {
    type: Array,
    required: true
  },
  minPerOrder: {
    type: Number,
    default: 1
  },
  maxPerOrder: {
    type: Number,
    default: 10
  },
  modelValue: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue'])

const selections = ref({})

// Initialize selections
props.ticketTypes. forEach(ticket => {
  selections.value[ticket.id] = 0
})

// Watch for external changes
watch(() => props. modelValue, (newValue) => {
  if (newValue) {
    newValue.forEach(item => {
      selections.value[item.ticket_type_id] = item.quantity
    })
  }
}, { immediate: true })

const totalQuantity = computed(() => {
  return Object.values(selections.value).reduce((sum, qty) => sum + qty, 0)
})

const canAddMore = computed(() => {
  return totalQuantity. value < props.maxPerOrder
})

const fetchSystemSettings = async () => {
  try {
    const response = await eventsAPI.getPublicSettings()
    const settings = response.data.settings || []
    
    const earlyAccessSetting = settings.find(s => s.setting_key === 'premium_early_access_hours')
    if (earlyAccessSetting) {
      earlyAccessHours.value = parseInt(earlyAccessSetting.setting_value) || 5
      console.log('TicketSelector: Early access hours =', earlyAccessHours.value)
    }

    const premiumLimitSetting = settings.find(s => s.setting_key === 'premium_early_access_max_tickets')
    if (premiumLimitSetting) {
      premiumEarlyAccessLimit.value = parseInt(premiumLimitSetting.setting_value) || 5
      console.log('Premium early access limit: ', premiumEarlyAccessLimit.value)
    }
  } catch (error) {
    console.error('Failed to fetch settings:', error)
  }
}

// ✅ ENHANCED: Check early access
const isInEarlyAccessPeriod = (ticket) => {
  const now = new Date()
  const saleStart = new Date(ticket.sale_start_time)
  const earlyAccessStart = new Date(
    saleStart.getTime() - (earlyAccessHours.value * 60 * 60 * 1000)
  )
  
  return now >= earlyAccessStart && now < saleStart
}

// ✅ ENHANCED: Check if user can access during early access
const canAccessEarlyTicket = (ticket) => {
  const userTier = authStore.membershipTier || 'basic'
  
  // If in early access period, only premium can access
  if (isInEarlyAccessPeriod(ticket)) {
    return userTier === 'premium'
  }
  
  // Not in early access, everyone can access
  return true
}

// ✅ ENHANCED: Availability check with early access
const isAvailable = (ticket) => {
  const now = new Date()
  const saleStart = new Date(ticket.sale_start_time)
  const saleEnd = new Date(ticket.sale_end_time)
  
  // ✅ Check early access first
  if (isInEarlyAccessPeriod(ticket)) {
    // During early access, only premium members
    if (! canAccessEarlyTicket(ticket)) {
      return false  // Block non-premium during early access
    }
  } else {
    // After early access, check normal sale time
    if (now < saleStart) return false
  }
  
  if (now > saleEnd) return false
  if (ticket.available_quantity <= 0) return false
  
  return true
}

// ✅ ENHANCED: Sale status with early access
const getSaleStatus = (ticket) => {
  const now = new Date()
  const saleStart = new Date(ticket.sale_start_time)
  const saleEnd = new Date(ticket.sale_end_time)
  const userTier = authStore.membershipTier || 'basic'
  
  // ✅ Early access period
  if (isInEarlyAccessPeriod(ticket)) {
    if (userTier === 'premium') {
      const minutesRemaining = Math.ceil((saleStart - now) / 60000)
      return {
        variant: 'warning',
        text: `Premium Early Access (${minutesRemaining}m left)`,
        isPremiumAccess: true
      }
    } else {
      const minutesRemaining = Math.ceil((saleStart - now) / 60000)
      return {
        variant: 'secondary',
        text: `Premium Only (${minutesRemaining}m)`,
        isPremiumAccess: false
      }
    }
  }
  
  if (now < saleStart) {
    return { 
      variant: 'warning', 
      text: `Opens ${saleStart.toLocaleDateString()}` 
    }
  }
  
  if (now > saleEnd) {
    return { 
      variant: 'danger', 
      text: 'Sale Ended' 
    }
  }
  
  if (ticket.available_quantity <= 0) {
    return { 
      variant: 'danger', 
      text: 'Sold Out' 
    }
  }
  
  if (ticket.available_quantity < 10) {
    return { 
      variant: 'warning', 
      text: `Only ${ticket. available_quantity} left` 
    }
  }
  
  return { 
    variant: 'success', 
    text: 'Available' 
  }
}

const updateQuantity = (ticketId, delta) => {
  const current = selections.value[ticketId] || 0
  const ticket = props.ticketTypes.find(t => t.id === ticketId)
  
  let newQty = current + delta
  
  // Validate constraints
  if (newQty < 0) newQty = 0
  if (newQty > ticket. max_quantity_per_order) newQty = ticket.max_quantity_per_order
  if (newQty > ticket.available_quantity) newQty = ticket.available_quantity
  
  // Check total max
  const otherTotal = Object.entries(selections.value)
    .filter(([id]) => id !== ticketId)
    .reduce((sum, [, qty]) => sum + qty, 0)
  
  if (otherTotal + newQty > props.maxPerOrder) {
    newQty = props.maxPerOrder - otherTotal
  }
  
  selections.value[ticketId] = newQty
  emitSelections()
}

const emitSelections = () => {
  const selected = Object.entries(selections.value)
    .filter(([, qty]) => qty > 0)
    .map(([ticketId, quantity]) => {
      const ticket = props. ticketTypes.find(t => t.id === ticketId)

      if (!ticket) {
        console.error(`Ticket not found for ID: ${ticketId}`)
        return null
      }

      return {
        ticket_type_id: ticketId,
        ticket_type_name: ticket.name,
        quantity,
        unit_price: ticket. price,
        subtotal: ticket.price * quantity
      }
    }).filter(item => item !== null)
  
  emit('update:modelValue', selected)
}

const formatPrice = (price) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(price)
}

const totalSelectedTickets = computed(() => {
  return Object.values(selections.value).reduce((sum, qty) => sum + qty, 0)
})

// ✅ UPDATE: Use dynamic limit from server
const premiumLimitWarning = computed(() => {
  const hasEarlyAccessTicket = props.ticketTypes.some(ticket => 
    isInEarlyAccessPeriod(ticket) && selections.value[ticket.id] > 0
  )
  
  if (! hasEarlyAccessTicket) return null
  
  const userTier = authStore.membershipTier || 'basic'
  if (userTier !== 'premium') return null
  
  const total = totalSelectedTickets.value
  const maxAllowed = premiumEarlyAccessLimit.value  // ✅ Use ref value
  
  if (total > maxAllowed) {
    return {
      exceeded: true,
      maxAllowed: maxAllowed,
      selected: total,
      publicLimit: props.maxPerOrder
    }
  }
  
  if (total > 0) {
    return {
      exceeded: false,
      maxAllowed: maxAllowed,
      selected: total,
      publicLimit: props.maxPerOrder
    }
  }
  
  return null
})

onMounted(async () => {
  await fetchSystemSettings()
})
</script>

<template>
  <div class="space-y-4">
    <!-- Header Info -->
    <div class="flex items-start space-x-2 bg-blue-50 border border-blue-200 rounded-lg p-4">
      <InformationCircleIcon class="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
      <div class="text-sm text-blue-800">
        <p>Select tickets (Min: {{ minPerOrder }}, Max: {{ maxPerOrder }})</p>
        <p class="mt-1">Current total: <strong>{{ totalQuantity }}</strong> tickets</p>
      </div>
    </div>

    <!-- Ticket Types -->
    <div class="space-y-3">
      <div
        v-for="ticket in ticketTypes"
        :key="ticket. id"
        :class="[
          'card',
          ! isAvailable(ticket) && 'opacity-60'
        ]"
      >
        <div class="flex items-start justify-between mb-3">
          <div class="flex-1">
            <div class="flex items-center space-x-2 mb-1">
              <h4 class="font-semibold text-lg">{{ ticket.name }}</h4>
              
              <!-- ✅ ENHANCED: Show premium badge -->
              <Badge 
                v-if="getSaleStatus(ticket).isPremiumAccess === true"
                variant="warning"
              >
                <StarIcon class="w-4 h-4 inline mr-1" />
                {{ getSaleStatus(ticket).text }}
              </Badge>
              <Badge 
                v-else
                :variant="getSaleStatus(ticket). variant"
              >
                {{ getSaleStatus(ticket).text }}
              </Badge>
            </div>
            
            <p v-if="ticket.description" class="text-sm text-gray-600 mb-2">
              {{ ticket.description }}
            </p>
            
            <!-- Early access info -->
            <div v-if="isInEarlyAccessPeriod(ticket) && ! canAccessEarlyTicket(ticket)" class="text-xs text-orange-600 mb-2 flex items-center">
              <StarIcon class="w-4 h-4 mr-2" />
              Early access for Premium members only
            </div>
            
            <div class="flex items-center space-x-4 text-sm text-gray-600">
              <span>Min: {{ ticket.min_quantity_per_order }}</span>
              <span>Max: {{ ticket. max_quantity_per_order }}</span>
              <span>Available: {{ ticket.available_quantity }}</span>
            </div>
          </div>
          
          <div class="text-right ml-4">
            <div class="text-xl font-bold text-primary-600">
              {{ formatPrice(ticket.price) }}
            </div>
          </div>
        </div>

        <!-- Quantity Selector -->
        <div class="flex items-center justify-between pt-3 border-t">
          <div class="flex items-center space-x-3">
            <button
              @click="updateQuantity(ticket.id, -1)"
              :disabled="!isAvailable(ticket) || selections[ticket.id] === 0"
              class="btn-secondary btn-sm w-10 h-10 !p-0"
            >
              <MinusIcon class="w-5 h-5" />
            </button>
            
            <span class="font-semibold text-lg w-12 text-center">
              {{ selections[ticket.id] || 0 }}
            </span>
            
            <button
              @click="updateQuantity(ticket.id, 1)"
              :disabled="!isAvailable(ticket) || !canAddMore"
              class="btn-primary btn-sm w-10 h-10 !p-0"
            >
              <PlusIcon class="w-5 h-5" />
            </button>
          </div>

          <div v-if="selections[ticket.id] > 0" class="text-right">
            <p class="text-sm text-gray-600">Subtotal</p>
            <p class="font-semibold text-primary-600">
              {{ formatPrice(ticket.price * selections[ticket.id]) }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <div 
      v-if="premiumLimitWarning"
      :class="[
        'p-4 rounded-lg border-2 transition-all',
        premiumLimitWarning.exceeded 
          ? 'bg-red-50 border-red-300' 
          : 'bg-blue-50 border-blue-300'
      ]"
    >
      <!-- Exceeded -->
      <div v-if="premiumLimitWarning.exceeded" class="flex items-start gap-3">
        <svg class="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h. 01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3. 34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div class="flex-1">
          <h4 class="font-bold text-red-900 mb-2">
            ⏰ Premium Early Access Limit Exceeded
          </h4>
          <p class="text-sm text-red-800 mb-3">
            During Premium early access, you can purchase up to 
            <strong class="text-lg">{{ premiumLimitWarning.maxAllowed }} tickets</strong> 
            per order to ensure fair access for all Premium members.
          </p>
          
          <div class="bg-white rounded-lg p-3 mb-3 border border-red-200">
            <p class="text-red-900 font-medium text-center">
              ❌ You selected: <span class="text-2xl font-bold">{{ premiumLimitWarning.selected }}</span> tickets
            </p>
          </div>

          <div class="bg-green-50 rounded-lg p-3 border border-green-300">
            <p class="font-semibold text-green-900 mb-2 flex items-center gap-1">
              <StarIcon class="w-4 h-4" />
              💡 Good news:
            </p>
            <ul class="text-xs text-green-800 space-y-1 ml-5 list-disc">
              <li>You can make <strong>multiple purchases</strong> during early access</li>
              <li>After public sale: up to <strong>{{ premiumLimitWarning.publicLimit }} tickets per order</strong></li>
              <li>You keep your <strong>10% Premium discount</strong>!</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Within limit -->
      <div v-else class="flex items-start gap-3">
        <InformationCircleIcon class="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div class="text-sm text-blue-800">
          <p class="font-medium mb-1">🌟 Premium Early Access Active</p>
          <p class="text-xs">
            Selected: <strong>{{ premiumLimitWarning. selected }}</strong> / {{ premiumLimitWarning. maxAllowed }} tickets
            <span class="text-gray-600 ml-2">(Public sale: {{ premiumLimitWarning.publicLimit }} max)</span>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>