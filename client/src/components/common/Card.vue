<script setup>
import { computed } from 'vue'

const props = defineProps({
  hover: {
    type: Boolean,
    default: false
  },
  noPadding: {
    type: Boolean,
    default: false
  }
})

const cardClass = computed(() => {
  const classes = ['card']
  
  if (props.hover) {
    classes.push('card-hover')
  }
  
  if (props.noPadding) {
    classes.push('!p-0')
  }
  
  return classes.join(' ')
})
</script>

<template>
  <div :class="cardClass">
    <div v-if="$slots.header" class="mb-4">
      <slot name="header" />
    </div>

    <slot />

    <div v-if="$slots.footer" class="mt-4 pt-4 border-t">
      <slot name="footer" />
    </div>
  </div>
</template>