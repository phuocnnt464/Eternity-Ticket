import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useCartStore = defineStore('cart', () => {
  const items = ref([])
  const event = ref(null)
  const session = ref(null)
  const couponCode = ref('')
  
  const itemCount = computed(() => {
    return items.value.reduce((sum, item) => sum + item.quantity, 0)
  })
  
  const subtotal = computed(() => {
    return items.value.reduce((sum, item) => {
      return sum + (item.price * item.quantity)
    }, 0)
  })
  
  const addItem = (ticket) => {
    const existingItem = items.value.find(
      item => item.ticket_type_id === ticket.ticket_type_id
    )
    
    if (existingItem) {
      existingItem.quantity += ticket.quantity
    } else {
      items.value.push(ticket)
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
      item.quantity = quantity
    }
  }
  
  const setEventAndSession = (eventData, sessionData) => {
    event.value = eventData
    session.value = sessionData
  }
  
  const clear = () => {
    items.value = []
    event.value = null
    session.value = null
    couponCode.value = ''
  }
  
  return {
    items,
    event,
    session,
    couponCode,
    itemCount,
    subtotal,
    addItem,
    removeItem,
    updateQuantity,
    setEventAndSession,
    clear,
  }
})