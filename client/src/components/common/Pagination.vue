<script setup>
import { computed } from 'vue'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/vue/24/outline'

const props = defineProps({
  currentPage: {
    type: Number,
    required: true
  },
  totalPages: {
    type: Number,
    required: true
  },
  maxVisible: {
    type: Number,
    default: 5
  }
})

const emit = defineEmits(['update:currentPage'])

const pages = computed(() => {
  const total = props.totalPages
  const current = props.currentPage
  const max = props.maxVisible
  
  if (total <= max) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  
  const half = Math.floor(max / 2)
  let start = Math.max(1, current - half)
  let end = Math.min(total, start + max - 1)
  
  if (end - start < max - 1) {
    start = Math.max(1, end - max + 1)
  }
  
  const result = []
  
  if (start > 1) {
    result.push(1)
    if (start > 2) result.push('...')
  }
  
  for (let i = start; i <= end; i++) {
    result.push(i)
  }
  
  if (end < total) {
    if (end < total - 1) result.push('...')
    result.push(total)
  }
  
  return result
})

const changePage = (page) => {
  if (page >= 1 && page <= props.totalPages && page !== props.currentPage) {
    emit('update:currentPage', page)
  }
}
</script>

<template>
  <nav class="flex items-center justify-center gap-2">
    <button
      @click="changePage(currentPage - 1)"
      :disabled="currentPage === 1"
      class="btn-secondary btn-sm"
    >
      <ChevronLeftIcon class="w-4 h-4" />
    </button>

    <button
      v-for="(page, index) in pages"
      :key="index"
      @click="page !== '...' && changePage(page)"
      :disabled="page === '...'"
      :class="[
        'btn-sm min-w-[2.5rem]',
        page === currentPage ? 'btn-primary' : 'btn-secondary',
        page === '...' && 'cursor-default'
      ]"
    >
      {{ page }}
    </button>

    <button
      @click="changePage(currentPage + 1)"
      :disabled="currentPage === totalPages"
      class="btn-secondary btn-sm"
    >
      <ChevronRightIcon class="w-4 h-4" />
    </button>
  </nav>
</template>