<script setup>
// ...   existing script (giữ nguyên toàn bộ)
import { ref, computed, watch, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'  
import { eventsAPI } from '@/api/events.js'
import { 
  MinusIcon, 
  PlusIcon,
  InformationCircleIcon,
  StarIcon,
  TicketIcon,
  SparklesIcon
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

props.ticketTypes.forEach(ticket => {
  selections.value[ticket.id] = 0
})

watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    newValue.forEach(item => {
      selections.value[item.ticket_type_id] = item. quantity
    })
  }
}, { immediate: true })

const totalQuantity = computed(() => {
  return Object.values(selections.value). reduce((sum, qty) => sum + qty, 0)
})

const totalPrice = computed(() => {
  return Object.entries(selections.value). reduce((sum, [ticketId, qty]) => {
    const ticket = props.ticketTypes.find(t => t.id === ticketId)
    return sum + (ticket?.price || 0) * qty
  }, 0)
})

const canAddMore = computed(() => {
  return totalQuantity.value < props.maxPerOrder
})

const fetchSystemSettings = async () => {
  try {
    const response = await eventsAPI.getPublicSettings()
    const settings = response.data.settings || []
    
    const earlyAccessSetting = settings.find(s => s.setting_key === 'premium_early_access_hours')
    if (earlyAccessSetting) {
      earlyAccessHours. value = parseInt(earlyAccessSetting.setting_value) || 5
    }

    const premiumLimitSetting = settings.find(s => s.setting_key === 'premium_early_access_max_tickets')
    if (premiumLimitSetting) {
      premiumEarlyAccessLimit.value = parseInt(premiumLimitSetting.setting_value) || 5
    }
  } catch (error) {
    console.error('Failed to fetch settings:', error)
  }
}

const isInEarlyAccessPeriod = (ticket) => {
  const now = new Date()
  const saleStart = new Date(ticket. sale_start_time)
  const earlyAccessStart = new Date(
    saleStart.getTime() - (earlyAccessHours.value * 60 * 60 * 1000)
  )
  
  return now >= earlyAccessStart && now < saleStart
}

const canAccessEarlyTicket = (ticket) => {
  const userTier = authStore.membershipTier || 'basic'
  
  if (isInEarlyAccessPeriod(ticket)) {
    return userTier === 'premium'
  }
  
  return true
}

const isAvailable = (ticket) => {
  const now = new Date()
  const saleStart = new Date(ticket.sale_start_time)
  const saleEnd = new Date(ticket. sale_end_time)
  
  if (isInEarlyAccessPeriod(ticket)) {
    if (! canAccessEarlyTicket(ticket)) {
      return false
    }
  } else {
    if (now < saleStart) return false
  }
  
  if (now > saleEnd) return false
  if (ticket. available_quantity <= 0) return false
  
  return true
}

const getSaleStatus = (ticket) => {
  const now = new Date()
  const saleStart = new Date(ticket.sale_start_time)
  const saleEnd = new Date(ticket.sale_end_time)
  const userTier = authStore.membershipTier || 'basic'
  
  if (isInEarlyAccessPeriod(ticket)) {
    if (userTier === 'premium') {
      const minutesRemaining = Math.ceil((saleStart - now) / 60000)
      return {
        variant: 'warning',
        text: `Early Access (${minutesRemaining}m left)`,
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
  
  if (newQty < 0) newQty = 0
  if (newQty > ticket. max_quantity_per_order) newQty = ticket.max_quantity_per_order
  if (newQty > ticket.available_quantity) newQty = ticket.available_quantity
  
  const otherTotal = Object.entries(selections.value)
    . filter(([id]) => id !== ticketId)
    .reduce((sum, [, qty]) => sum + qty, 0)
  
  if (otherTotal + newQty > props.maxPerOrder) {
    newQty = props. maxPerOrder - otherTotal
  }
  
  selections. value[ticketId] = newQty
  emitSelections()
}

const emitSelections = () => {
  const selected = Object.entries(selections.value)
    .filter(([, qty]) => qty > 0)
    .map(([ticketId, quantity]) => {
      const ticket = props.ticketTypes.find(t => t.id === ticketId)

      if (! ticket) {
        console.error(`Ticket not found for ID: ${ticketId}`)
        return null
      }

      return {
        ticket_type_id: ticketId,
        ticket_type_name: ticket.name,
        quantity,
        unit_price: ticket.price,
        subtotal: ticket.price * quantity
      }
    }). filter(item => item !== null)
  
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

const canAddMoreTicket = (ticketId) => {
  const ticket = props.ticketTypes.find(t => t.id === ticketId)
  if (! ticket) return false
  
  const current = selections.value[ticketId] || 0
  
  if (current >= ticket.available_quantity) return false
  if (current >= ticket.max_quantity_per_order) return false
  
  const totalOther = Object.entries(selections. value)
    .filter(([id]) => id !== ticketId)
    .reduce((sum, [, qty]) => sum + qty, 0)
  
  const hasEarlyAccessTicket = props.ticketTypes.some(t => 
    isInEarlyAccessPeriod(t) && selections.value[t.id] > 0
  )
  
  if (hasEarlyAccessTicket && authStore.membershipTier === 'premium') {
    const maxAllowed = premiumEarlyAccessLimit.value
    if (totalOther + current + 1 > maxAllowed) {
      return false
    }
  }
  
  if (totalOther + current + 1 > props.maxPerOrder) {
    return false
  }
  
  return true
}

const premiumLimitInfo = computed(() => {
  const hasEarlyAccessTicket = props.ticketTypes.some(ticket => 
    isInEarlyAccessPeriod(ticket) && selections.value[ticket.id] > 0
  )
  
  if (!hasEarlyAccessTicket) return null
  
  const userTier = authStore.membershipTier || 'basic'
  if (userTier !== 'premium') return null
  
  const total = totalSelectedTickets.value
  const maxAllowed = premiumEarlyAccessLimit.value
  
  if (total >= maxAllowed) {
    return {
      maxAllowed: maxAllowed,
      selected: total,
      publicLimit: props.maxPerOrder
    }
  }
})

onMounted(async () => {
  await fetchSystemSettings()
})
</script>

<template>
  <div class="space-y-4">
    <!-- ✅ Summary Card - Top -->
    <div class="bg-gradient-to-r from-primary-50 to-accent-50 border-2 border-primary-200 rounded-xl p-5">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center space-x-2">
          <div class="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
            <TicketIcon class="w-6 h-6 text-white" />
          </div>
          <div>
            <p class="text-sm text-gray-600">Selected Tickets</p>
            <p class="text-2xl font-bold text-gray-900">{{ totalQuantity }}</p>
          </div>
        </div>
        
        <div class="text-right">
          <p class="text-sm text-gray-600">Total Amount</p>
          <p class="text-2xl font-bold text-primary-600">
            {{ formatPrice(totalPrice) }}
          </p>
        </div>
      </div>
      
      <div class="flex items-center justify-between text-xs text-gray-600 pt-3 border-t border-primary-200">
        <span>Min: {{ minPerOrder }} tickets</span>
        <span>Max: {{ maxPerOrder }} tickets</span>
      </div>
    </div>

    <!-- ✅ Premium Limit Warning -->
    <div 
      v-if="premiumLimitInfo"
      class="bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl p-5 shadow-lg"
    >
      <div class="flex items-start gap-3">
        <div class="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
          <StarIcon class="inline w-6 h-6 mb-1" />
        </div>
        <div>
          <p class="font-bold text-lg mb-1">
            Premium Early Access Limit Reached
          </p>
          <p class="text-sm text-white/90">
            You've selected {{ premiumLimitInfo.selected }}/{{ premiumLimitInfo.maxAllowed }} tickets.  
            After public sale starts, you can buy up to {{ premiumLimitInfo.publicLimit }} tickets. 
          </p>
        </div>
      </div>
    </div>

    <!-- ✅ Ticket Types - Redesigned -->
    <div class="space-y-3">
      <div
        v-for="ticket in ticketTypes"
        :key="ticket.id"
        :class="[
          'relative bg-white rounded-xl border-2 transition-all overflow-hidden',
          isAvailable(ticket) 
            ? 'border-gray-200 hover:border-primary-300 hover:shadow-lg' 
            : 'border-gray-100 bg-gray-50',
          selections[ticket.id] > 0 && 'border-primary-400 shadow-md'
        ]"
      >
        <!-- ✅ Selected Indicator -->
        <div 
          v-if="selections[ticket.id] > 0" 
          class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-600 to-accent-600"
        ></div>

        <div class="p-5">
          <!-- Header -->
          <div class="flex items-start justify-between mb-4">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-2">
                <h4 class="font-bold text-xl text-gray-900">{{ ticket.name }}</h4>
                
                <!-- Status Badge -->
                <Badge 
                  v-if="getSaleStatus(ticket).isPremiumAccess === true"
                  variant="warning"
                  class="animate-pulse"
                >
                  <StarIcon class="inline-flex w-4 h-4 mr-1 mb-1" />
                  {{ getSaleStatus(ticket).text }}
                </Badge>
                <Badge 
                  v-else
                  :variant="getSaleStatus(ticket).variant"
                >
                  {{ getSaleStatus(ticket).text }}
                </Badge>
              </div>
              
              <!-- Description -->
              <p v-if="ticket.description" class="text-sm text-gray-600 mb-3">
                {{ ticket.description }}
              </p>
              
              <!-- Early Access Warning -->
              <div 
                v-if="isInEarlyAccessPeriod(ticket) && !canAccessEarlyTicket(ticket)" 
                class="inline-flex items-center bg-orange-100 text-orange-800 px-3 py-1 rounded-lg text-xs font-medium mb-3"
              >
                <StarIcon class="inline w-4 h-4 mr-1 mb-1" />
                Premium only
              </div>
              
              <!-- Constraints -->
              <div class="flex flex-wrap gap-3 text-xs">
                <span class="inline-flex items-center bg-gray-100 text-gray-700 px-3 py-1 rounded-full font-medium">
                  Min: {{ ticket.min_quantity_per_order }}
                </span>
                <span class="inline-flex items-center bg-gray-100 text-gray-700 px-3 py-1 rounded-full font-medium">
                  Max: {{ ticket.max_quantity_per_order }}
                </span>
                <span 
                  :class="[
                    'inline-flex items-center px-3 py-1 rounded-full font-medium',
                    ticket.available_quantity < 10 
                      ? 'bg-orange-100 text-orange-700' 
                      : 'bg-success-100 text-success-700'
                  ]"
                >
                  {{ ticket.available_quantity }} available
                </span>
              </div>
            </div>
            
            <!-- Price -->
            <div class="text-right ml-4">
              <p class="text-sm text-gray-500 mb-1">Price</p>
              <div class="text-2xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
                {{ formatPrice(ticket.price) }}
              </div>
            </div>
          </div>

          <!-- ✅ Quantity Selector - Enhanced -->
          <div 
            :class="[
              'flex items-center justify-between pt-4 border-t-2',
              selections[ticket.id] > 0 ?  'border-primary-200' : 'border-gray-200'
            ]"
          >
            <div class="flex items-center space-x-3">
              <!-- Minus Button -->
              <button
                @click="updateQuantity(ticket.id, -1)"
                :disabled="!isAvailable(ticket) || selections[ticket.id] === 0"
                :class="[
                  'w-10 h-10 rounded-xl font-bold transition-all flex items-center justify-center',
                  (!isAvailable(ticket) || selections[ticket.id] === 0)
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300 active:scale-95'
                ]"
              >
                <MinusIcon class="w-4 h-4" />
              </button>
              
              <!-- Quantity Display -->
              <div class="w-14 h-10 flex items-center justify-center bg-gray-100 rounded-xl">
                <span class="text-xl font-bold text-gray-900">
                  {{ selections[ticket.id] || 0 }}
                </span>
              </div>
              
              <!-- Plus Button -->
              <button
                @click="updateQuantity(ticket.id, 1)"
                :disabled="!isAvailable(ticket) || !canAddMoreTicket(ticket.id)"
                :class="[
                  'w-10 h-10 rounded-xl font-bold transition-all flex items-center justify-center',
                  (!isAvailable(ticket) || !canAddMoreTicket(ticket.id))
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-primary-600 to-accent-600 text-white hover:shadow-lg active:scale-95'
                ]"
              >
                <PlusIcon class="w-4 h-4" />
              </button>
            </div>

            <!-- Subtotal -->
            <div v-if="selections[ticket.id] > 0" class="text-right">
              <p class="text-xs text-gray-500 mb-1">Subtotal</p>
              <p class="text-lg font-bold text-primary-600">
                {{ formatPrice(ticket.price * selections[ticket.id]) }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ✅ Empty State -->
    <div v-if="ticketTypes.length === 0" class="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
      <TicketIcon class="w-16 h-16 text-gray-400 mx-auto mb-3" />
      <p class="text-gray-600 font-medium">No tickets available</p>
    </div>
  </div>
</template>