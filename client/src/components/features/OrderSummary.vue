<script setup>
import { computed } from 'vue'
import { TicketIcon, TagIcon } from '@heroicons/vue/24/outline'
import Badge from '@/components/common/Badge.vue'

const props = defineProps({
  items: {
    type: Array,
    default: () => []
  },
  discount: {
    type: Number,
    default: 0
  },
  membershipDiscount: {
    type: Number,
    default: 0
  },
  couponCode: {
    type: String,
    default: ''
  },
  showDetails: {
    type: Boolean,
    default: true
  }
})

const subtotal = computed(() => {
  return props.items.reduce((sum, item) => sum + item.subtotal, 0)
})

const totalDiscount = computed(() => {
  return props.discount + props.membershipDiscount
})

const vat = computed(() => {
  return (subtotal.value - totalDiscount.value) * 0.1 // 10% VAT
})

const total = computed(() => {
  return subtotal.value - totalDiscount.value + vat.value
})

const formatPrice = (price) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(price)
}
</script>

<template>
  <div class="card">
    <h3 class="text-lg font-semibold mb-4">Order Summary</h3>

    <!-- Items -->
    <div v-if="showDetails && items.length > 0" class="space-y-3 mb-4">
      <div 
        v-for="(item, index) in items"
        :key="index"
        class="flex items-start justify-between text-sm"
      >
        <div class="flex items-start space-x-2 flex-1">
          <TicketIcon class="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
          <div>
            <p class="font-medium">{{ item.name }}</p>
            <p class="text-gray-500">{{ formatPrice(item.price) }} × {{ item.quantity }}</p>
          </div>
        </div>
        <div class="font-medium">
          {{ formatPrice(item.subtotal) }}
        </div>
      </div>
    </div>

    <div class="divider"></div>

    <!-- Pricing Breakdown -->
    <div class="space-y-2 text-sm">
      <div class="flex justify-between">
        <span class="text-gray-600">Subtotal</span>
        <span class="font-medium">{{ formatPrice(subtotal) }}</span>
      </div>

      <div v-if="membershipDiscount > 0" class="flex justify-between text-green-600">
        <div class="flex items-center space-x-1">
          <span>Membership Discount</span>
          <Badge variant="success" size="md">Member</Badge>
        </div>
        <span class="font-medium">-{{ formatPrice(membershipDiscount) }}</span>
      </div>

      <div v-if="discount > 0" class="flex justify-between text-green-600">
        <div class="flex items-center space-x-1">
          <TagIcon class="w-4 h-4" />
          <span>Coupon</span>
          <Badge v-if="couponCode" variant="success" size="md">{{ couponCode }}</Badge>
        </div>
        <span class="font-medium">-{{ formatPrice(discount) }}</span>
      </div>

      <div class="flex justify-between">
        <span class="text-gray-600">VAT (10%)</span>
        <span class="font-medium">{{ formatPrice(vat) }}</span>
      </div>
    </div>

    <div class="divider"></div>

    <!-- Total -->
    <div class="flex justify-between items-center">
      <span class="text-lg font-semibold">Total</span>
      <span class="text-2xl font-bold text-primary-600">
        {{ formatPrice(total) }}
      </span>
    </div>

    <!-- Info -->
    <div class="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
      <p>✓ You have 15 minutes to complete the payment</p>
      <p class="mt-1">✓ Tickets will be sent to your email</p>
    </div>
  </div>
</template>