<script setup>
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const props = defineProps({
  navigation: {
    type: Array,
    required: true
  },
  isOpen: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

const route = useRoute()
const authStore = useAuthStore()

const isActive = (href) => {
  if (href === '/') {
    return route.path === href
  }
  return route.path.startsWith(href)
}
</script>

<template>
  <aside 
    :class="[
      'fixed md:sticky top-0 left-0 h-screen bg-white shadow-lg z-30 transition-transform duration-300',
      'w-64 flex flex-col',
      isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
    ]"
  >
    <!-- Logo (Desktop) -->
    <div class="hidden md:flex items-center space-x-3 p-6 border-b">
      <div class="w-10 h-10 bg-gradient-to-br from-primary-600 to-accent-600 rounded-lg flex items-center justify-center">
        <span class="text-white font-bold text-xl">ET</span>
      </div>
      <span class="text-xl font-bold">
        <slot name="brand">Eternity</slot>
      </span>
    </div>

    <!-- User Info Slot -->
    <div v-if="$slots.user" class="p-6 border-b">
      <slot name="user" />
    </div>

    <!-- Navigation -->
    <nav class="flex-1 overflow-y-auto p-4">
      <RouterLink
        v-for="item in navigation"
        :key="item.name"
        :to="item.href"
        @click="emit('close')"
        :class="[
          'flex items-center space-x-3 px-4 py-3 rounded-lg mb-1 transition-colors',
          isActive(item.href)
            ? 'bg-primary-50 text-primary-600 font-medium'
            : 'text-gray-700 hover:bg-gray-50'
        ]"
      >
        <component v-if="item.icon" :is="item.icon" class="w-5 h-5" />
        <span>{{ item.name }}</span>
        <span v-if="item.badge" class="ml-auto badge badge-primary">
          {{ item.badge }}
        </span>
      </RouterLink>
    </nav>

    <!-- Footer Slot -->
    <div v-if="$slots.footer" class="p-4 border-t">
      <slot name="footer" />
    </div>
  </aside>
</template>