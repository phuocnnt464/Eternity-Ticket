import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './auth'

export const useCartStore = defineStore('cart', () => {
  const items = ref([])

  function $reset() {
    items.value = []
  }

  const event = ref(null)
  const session = ref(null)
  const couponCode = ref('')
  const couponDiscount = ref(0)
  const appliedCoupon = ref(null)
  
  const itemCount = computed(() => {
    return items.value.reduce((sum, item) => sum + item.quantity, 0)
  })
  
  const subtotal = computed(() => {
    return items.value.reduce((sum, item) => {
      return sum + (item.price * item.quantity)
    }, 0)
  })

  const membershipDiscount = computed(() => {
    const authStore = useAuthStore()
    return subtotal.value * authStore.membershipDiscount
  })
  
  const totalDiscount = computed(() => {
    return membershipDiscount.value + couponDiscount.value
  })
  
  const vat = computed(() => {
    const subtotalAfterDiscount = subtotal.value - totalDiscount.value
    return subtotalAfterDiscount * 0.1 // 10% VAT
  })
  
  const total = computed(() => {
    return subtotal.value - totalDiscount.value + vat.value
  })
  
  const isEmpty = computed(() => items.value.length === 0)
  
  const hasSession = computed(() => !!session.value)
  
  const hasEvent = computed(() => !!event.value)

  const setEventAndSession = (eventData, sessionData) => {
    event.value = eventData
    session.value = sessionData
    
    if (items.value.length > 0) {
      const currentEventId = items.value[0]?.event_id
      const currentSessionId = items.value[0]?.session_id
      
      if (currentEventId !== eventData.id || currentSessionId !== sessionData.id) {
        items.value = []
      }
    }
  }

  const addItem = (ticket) => {
    const existingItem = items.value.find(
      item => item.ticket_type_id === ticket.ticket_type_id
    )
    
    if (existingItem) {
      const newQuantity = existingItem.quantity + ticket.quantity
      
      if (newQuantity > ticket.max_quantity_per_order) {
        throw new Error(`Maximum ${ticket.max_quantity_per_order} tickets per order`)
      }
      
      existingItem.quantity = newQuantity
      existingItem.subtotal = existingItem.price * newQuantity
    } else {
      items.value.push({
        ticket_type_id: ticket.ticket_type_id,
        name: ticket.name,
        price: ticket.price,
        quantity: ticket.quantity,
        subtotal: ticket.price * ticket.quantity, 
        max_quantity_per_order: ticket.max_quantity_per_order,
        min_quantity_per_order: ticket.min_quantity_per_order,
        event_id: ticket.event_id,
        session_id: ticket.session_id,
      })
    }
  }

  const removeItem = (ticketTypeId) => {
    items.value = items.value.filter(
      item => item.ticket_type_id !== ticketTypeId
    )
  }
  
  const updateQuantity = (ticketTypeId, quantity) => {
    const item = items.value.find(
      item => item.ticket_type_id === ticketTypeId
    )
    
    if (item) {
      if (quantity < item.min_quantity_per_order) {
        throw new Error(`Minimum ${item.min_quantity_per_order} tickets required`)
      }
      
      if (quantity > item.max_quantity_per_order) {
        throw new Error(`Maximum ${item.max_quantity_per_order} tickets per order`)
      }

      item.quantity = quantity
      item.subtotal = item.price * quantity 
    }
  }

  const applyCoupon = (coupon, discount) => {
    appliedCoupon.value = coupon
    couponCode.value = coupon.code
    couponDiscount.value = discount
  }
  
  const removeCoupon = () => {
    appliedCoupon.value = null
    couponCode.value = ''
    couponDiscount.value = 0
  }
  
  const clear = () => {
    items.value = []
    event.value = null
    session.value = null
    couponCode.value = ''
    couponDiscount.value = 0
    appliedCoupon.value = null
  }

  const validate = () => {
    if (isEmpty.value) {
      throw new Error('Cart is empty')
    }
    
    if (!hasEvent.value || !hasSession.value) {
      throw new Error('Event or session not selected')
    }
    
    const totalTickets = itemCount.value
    const sessionMinTickets = session.value.min_tickets_per_order || 1
    const sessionMaxTickets = session.value.max_tickets_per_order || 10
    
    if (totalTickets < sessionMinTickets) {
      throw new Error(`Minimum ${sessionMinTickets} tickets required per order`)
    }
    
    if (totalTickets > sessionMaxTickets) {
      throw new Error(`Maximum ${sessionMaxTickets} tickets per order`)
    }
    
    return true
  }
  
  const getOrderData = () => {
    return {
      event_id: event.value.id,
      session_id: session.value.id,
      items: items.value.map(item => ({
        ticket_type_id: item.ticket_type_id,
        quantity: item.quantity,
        unit_price: item.price
      })),
      coupon_code: couponCode.value || null,
      subtotal: subtotal.value,
      membership_discount: membershipDiscount.value,
      coupon_discount: couponDiscount.value,
      vat_amount: vat.value,
      total_amount: total.value
    }
  }
  
  return {
    items,
    $reset,
    
    event,
    session,
    couponCode,
    couponDiscount,
    appliedCoupon,
    
    // Getters
    itemCount,
    subtotal,
    membershipDiscount,
    totalDiscount,
    vat,
    total,
    isEmpty,
    hasSession,
    hasEvent,
    
    // Actions
    setEventAndSession,
    addItem,
    removeItem,
    updateQuantity,
    applyCoupon,
    removeCoupon,
    clear,
    validate,
    getOrderData
  }
}, {
  persist: true
})