<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { authAPI } from '@/api/auth.js'
import Spinner from '@/components/common/Spinner.vue'
import Button from '@/components/common/Button.vue'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/vue/24/outline'

const router = useRouter()
const route = useRoute()

const loading = ref(true)
const success = ref(false)
const error = ref('')

onMounted(async () => {
  // const token = route.params.token
  const token = route.query.token
  
  if (!token) {
    error.value = 'Invalid verification link'
    loading.value = false
    return
  }
  
  try {
    await authAPI.verifyEmail(token)
    success.value = true
  } catch (err) {
    error.value = err.response?.data?.error?.message || 'Verification failed'
  } finally {
    loading.value = false
  }
})

const goToLogin = () => {
  router.push('/auth/login?verified=true')
}
</script>

<template>
  <div>
    <div class="text-center">
      <!-- Loading -->
      <div v-if="loading" class="py-8">
        <Spinner size="xl" class="mx-auto mb-4" />
        <p class="text-gray-600">Verifying your email...</p>
      </div>

      <!-- Success -->
      <div v-else-if="success" class="py-8">
        <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircleIcon class="w-10 h-10 text-green-600" />
        </div>
        <h2 class="text-2xl font-bold text-gray-900 mb-2">Email Verified!</h2>
        <p class="text-gray-600 mb-6">
          Your email has been successfully verified. You can now log in to your account.
        </p>
        <Button variant="primary" size="lg" @click="goToLogin">
          Go to Login
        </Button>
      </div>

      <!-- Error -->
      <div v-else class="py-8">
        <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <XCircleIcon class="w-10 h-10 text-red-600" />
        </div>
        <h2 class="text-2xl font-bold text-gray-900 mb-2">Verification Failed</h2>
        <p class="text-gray-600 mb-6">{{ error }}</p>
        <div class="space-x-3">
          <Button variant="secondary" @click="router.push('/auth/login')">
            Go to Login
          </Button>
          <Button variant="primary" @click="router.push('/')">
            Go to Home
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>