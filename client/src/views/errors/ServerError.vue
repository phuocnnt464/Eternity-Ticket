<script setup>
import { useRouter } from 'vue-router'
import Button from '@/components/common/Button.vue'
import { HomeIcon, ArrowPathIcon } from '@heroicons/vue/24/outline'

const router = useRouter()

const handleRetry = () => {
  window.location.reload()
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center px-4">
    <div class="text-center">
      <div class="mb-8">
        <div class="text-9xl mb-4">🔧</div>
        <h1 class="text-6xl font-bold text-gray-900 mb-2">500</h1>
      </div>

      <h2 class="text-3xl font-bold text-gray-900 mb-4">Server Error</h2>
      <p class="text-gray-600 mb-8 max-w-md mx-auto">
        Oops! Something went wrong on our end. 
        Our team has been notified and is working on fixing the issue.
      </p>

      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8 max-w-md mx-auto">
        <p class="text-sm text-blue-800">
          <strong>What you can do:</strong>
        </p>
        <ul class="text-sm text-blue-700 mt-2 space-y-1 text-left">
          <li>• Try refreshing the page</li>
          <li>• Wait a few minutes and try again</li>
          <li>• Contact support if the problem persists</li>
        </ul>
      </div>

      <div class="flex items-center justify-center space-x-4">
        <Button variant="secondary" @click="handleRetry">
          <ArrowPathIcon class="w-5 h-5" />
          Retry
        </Button>
        <Button variant="primary" @click="router.push('/')">
          <HomeIcon class="w-5 h-5" />
          Go Home
        </Button>
      </div>

      <div class="mt-12">
        <p class="text-sm text-gray-500 mb-2">Need immediate assistance?</p>
        <RouterLink to="/contact" class="text-primary-600 hover:text-primary-700 text-sm font-medium">
          Contact Support →
        </RouterLink>
      </div>
    </div>
  </div>
</template>