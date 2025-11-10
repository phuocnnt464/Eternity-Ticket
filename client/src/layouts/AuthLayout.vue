<script setup>
import { RouterView } from 'vue-router'
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <!-- Logo -->
      <RouterLink to="/" class="flex justify-center mb-8">
        <div class="flex items-center space-x-3">
          <div class="w-12 h-12 bg-gradient-to-br from-primary-600 to-accent-600 rounded-xl flex items-center justify-center">
            <span class="text-white font-bold text-2xl">ET</span>
          </div>
          <span class="text-2xl font-bold text-gray-900">
            Eternity Ticket
          </span>
        </div>
      </RouterLink>

      <!-- Auth Form Card -->
      <div class="card">
        <RouterView />
      </div>

      <!-- Back to Home -->
      <div class="text-center mt-6">
        <RouterLink to="/" class="text-sm text-gray-600 hover:text-primary-600">
          ← Back to Home
        </RouterLink>
      </div>
    </div>
  </div>
</template>