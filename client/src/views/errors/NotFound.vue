<script setup>
import { useRouter } from 'vue-router'
import Button from '@/components/common/Button.vue'
import { HomeIcon, ArrowLeftIcon } from '@heroicons/vue/24/outline'

const router = useRouter()
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center px-4">
    <div class="text-center">
      <div class="mb-8">
        <h1 class="text-9xl font-bold text-primary-600">404</h1>
        <div class="text-6xl mb-4">🎫</div>
      </div>

      <h2 class="text-3xl font-bold text-gray-900 mb-4">Page Not Found</h2>
      <p class="text-gray-600 mb-8 max-w-md mx-auto">
        Oops! The page you're looking for doesn't exist. 
        It might have been moved or deleted.
      </p>

      <div class="flex items-center justify-center space-x-4">
        <Button variant="secondary" @click="router.back()">
          <ArrowLeftIcon class="w-5 h-5" />
          Go Back
        </Button>
        <Button variant="primary" @click="router.push('/')">
          <HomeIcon class="w-5 h-5" />
          Go Home
        </Button>
      </div>

      <div class="mt-12">
        <p class="text-sm text-gray-500 mb-4">Looking for something?</p>
        <div class="flex items-center justify-center space-x-6 text-sm">
          <RouterLink to="/events" class="text-primary-600 hover:text-primary-700">
            Browse Events
          </RouterLink>
          <RouterLink to="/about" class="text-primary-600 hover:text-primary-700">
            About Us
          </RouterLink>
          <RouterLink to="/contact" class="text-primary-600 hover:text-primary-700">
            Contact Support
          </RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>