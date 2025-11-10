<script setup>
import { ref } from 'vue'
import { authAPI } from '@/api'
import Input from '@/components/common/Input.vue'
import Button from '@/components/common/Button.vue'
import { EnvelopeIcon, ArrowLeftIcon } from '@heroicons/vue/24/outline'

const email = ref('')
const error = ref('')
const loading = ref(false)
const success = ref(false)

const validate = () => {
  error.value = ''
  
  if (!email.value) {
    error.value = 'Email is required'
    return false
  }
  
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    error.value = 'Invalid email format'
    return false
  }
  
  return true
}

const handleSubmit = async () => {
  if (!validate()) return
  
  loading.value = true
  try {
    await authAPI.forgotPassword(email.value)
    success.value = true
  } catch (err) {
    error.value = err.response?.data?.error?.message || 'Failed to send reset email'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <div class="text-center mb-6">
      <h2 class="text-2xl font-bold text-gray-900">Forgot Password?</h2>
      <p class="text-gray-600 mt-2">Enter your email to reset your password</p>
    </div>

    <div v-if="success" class="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
      <div class="flex items-start space-x-3">
        <svg class="w-5 h-5 text-green-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
        </svg>
        <div class="flex-1">
          <p class="text-sm font-medium text-green-800">Reset link sent!</p>
          <p class="text-sm text-green-700 mt-1">
            We've sent a password reset link to <strong>{{ email }}</strong>. 
            Please check your email and follow the instructions.
          </p>
        </div>
      </div>
    </div>

    <form v-else @submit.prevent="handleSubmit" class="space-y-4">
      <Input
        v-model="email"
        type="email"
        label="Email Address"
        placeholder="your.email@example.com"
        :error="error"
        :icon="EnvelopeIcon"
        required
      />

      <Button
        type="submit"
        variant="primary"
        :loading="loading"
        full-width
        size="lg"
      >
        Send Reset Link
      </Button>
    </form>

    <div class="mt-6 text-center">
      <RouterLink 
        to="/auth/login" 
        class="inline-flex items-center text-sm text-primary-600 hover:text-primary-700"
      >
        <ArrowLeftIcon class="w-4 h-4 mr-1" />
        Back to Login
      </RouterLink>
    </div>
  </div>
</template>