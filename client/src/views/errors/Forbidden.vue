<script setup>
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import Button from '@/components/common/Button.vue'
import { HomeIcon, ArrowLeftIcon, ShieldExclamationIcon } from '@heroicons/vue/24/outline'

const router = useRouter()
const authStore = useAuthStore()
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center px-4">
    <div class="text-center">
      <div class="mb-8">
        <div class="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldExclamationIcon class="w-16 h-16 text-red-600" />
        </div>
        <h1 class="text-6xl font-bold text-red-600 mb-2">403</h1>
      </div>

      <h2 class="text-3xl font-bold text-gray-900 mb-4">Access Denied</h2>
      <p class="text-gray-600 mb-8 max-w-md mx-auto">
        You don't have permission to access this page. 
        This area is restricted to authorized users only.
      </p>

      <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8 max-w-md mx-auto">
        <p class="text-sm text-yellow-800">
          <strong>Note:</strong> If you believe this is an error, please contact support.
        </p>
      </div>

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

      <div v-if="!authStore.isAuthenticated" class="mt-8">
        <p class="text-sm text-gray-600 mb-4">Not logged in?</p>
        <Button variant="outline" @click="router.push('/auth/login')">
          Login to Access
        </Button>
      </div>
    </div>
  </div>
</template>