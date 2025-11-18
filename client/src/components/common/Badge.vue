<script setup>
import { computed } from 'vue'

const props = defineProps({
  variant: {
    type: String,
    default: 'primary',
    validator: (value) => ['primary', 'secondary', 'accent', 'success', 'warning', 'danger', 'info'].includes(value)
  },
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['md', 'lg'].includes(value)
  },
  dot: {
    type: Boolean,
    default: false
  }
})

const badgeClass = computed(() => {
  const classes = ['badge', `badge-${props.variant}`]
  
  if (props.size === 'lg') {
    classes.push('badge-lg')
  }
  
  return classes.join(' ')
})
</script>

<template>
  <span :class="badgeClass">
    <span v-if="dot" class="w-2 h-2 rounded-full bg-current mr-1"></span>
    <slot />
  </span>
</template>