<script setup>
import { RouterView, useRoute } from 'vue-router'
import { computed } from 'vue'

const route = useRoute()

// Pages that use full-screen layout (no wrapper)
const fullScreenPages = ['/auth/login', '/auth/register']
const isFullScreen = computed(() => fullScreenPages.includes(route.path))
</script>

<template>
  <!-- Full screen for Login/Register -->
  <div v-if="isFullScreen">
    <RouterView />
  </div>

  <!-- Centered card layout for other auth pages (Forgot Password, etc) -->
  <div v-else class="min-h-screen bg-gradient-to-br from-dark-900 via-primary-900 to-black flex items-center justify-center p-4">
    <div class="fixed inset-0 opacity-10">
      <div class="absolute inset-0" style="background-image: radial-gradient(circle at 2px 2px, white 1px, transparent 0); background-size: 40px 40px;"></div>
    </div>

    <!-- Decorative blobs -->
    <div class="fixed top-0 right-0 w-96 h-96 bg-primary-500 rounded-full blur-3xl opacity-20"></div>
    <div class="fixed bottom-0 left-0 w-96 h-96 bg-accent-500 rounded-full blur-3xl opacity-20"></div>

    <div class="w-full max-w-md relative z-10">
      <!-- Logo -->
      <div class="text-center mb-8">
        <RouterLink to="/" class="inline-flex items-center space-x-3 group">
          <div class="w-14 h-14 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20 group-hover:scale-110 transition-transform">
            <img src="/logo_w.svg" alt="Logo" class="w-8 h-8" />
          </div>
          <span class="text-2xl font-bold text-white">
            Eternity Tickets
          </span>
        </RouterLink>
      </div>

      <!-- Auth Form Card -->
      <div class="bg-white rounded-3xl shadow-2xl p-8">
        <RouterView />
      </div>

      <!-- Back to Home -->
      <div class="text-center mt-6">
        <RouterLink to="/" class="text-sm text-white/80 hover:text-white transition-colors inline-flex items-center space-x-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
          </svg>
          <span>Back to Home</span>
        </RouterLink>
      </div>
    </div>
  </div>
</template>