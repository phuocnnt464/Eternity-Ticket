<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import Input from '@/components/common/Input.vue'
import Button from '@/components/common/Button.vue'
import { EnvelopeIcon, LockClosedIcon } from '@heroicons/vue/24/outline'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

import { toast } from 'vue3-toastify'  
import 'vue3-toastify/dist/index.css'

const form = ref({
  email: '',
  password: ''
})

const errors = ref({})
const loading = ref(false)


const accountLocked = ref(false)
const lockTimeRemaining = ref(null)

const validate = () => {
  errors.value = {}
  
  if (!form.value.email) {
    errors.value.email = 'Email is required'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email)) {
    errors.value.email = 'Invalid email format'
  }
  
  if (!form.value.password) {
    errors.value.password = 'Password is required'
  }
  
  return Object.keys(errors.value).length === 0
}

const handleSubmit = async () => {
  if (!validate()) return
  
  loading.value = true
  try {
    await authStore.login(form.value)
    
    const redirect = route.query.redirect || '/'
    router.push(redirect)
  } catch (error) {
    const status = error.response?.status
    const data = error.response?.data?.data
    
    if (status === 423) {
      // Account locked
      accountLocked.value = true
      lockTimeRemaining.value = data?.minutes_remaining
    }
    
    errors.value.general = error.response?.data?.error?.message || 'Login failed'
    // errors.value.general = error.message || 'Login failed'
  } finally {
    loading.value = false
  }
}

// onMounted(() => {
//   // Check if redirected after deactivation
//   if (route.query.deactivated === 'true') {
//     // Show info message
//     const message = route.query.message || 'Your account has been deactivated'
    
//     // Use alert or toast
//     toast.info(message, {
//       position: 'top-right',
//       autoClose: 8000
//     })

//     router.replace({
//       path: route.path,
//       query: {}  // Clear all query params
//     })
//   }
// })
</script>

<template>
  <div>
    <div class="text-center mb-6">
      <h2 class="text-2xl font-bold text-gray-900">Welcome Back</h2>
      <p class="text-gray-600 mt-2">Sign in to your account</p>
    </div>

    <div v-if="errors.general" class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4">
      {{ errors.general }}
    </div>

    <div v-if="accountLocked" class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
      <div class="flex items-center">
        <LockClosedIcon class="w-5 h-5 text-yellow-600 mr-3" />
        <div>
          <p class="font-medium text-yellow-900">Account Temporarily Locked</p>
          <p class="text-sm text-yellow-700 mt-1">
            {{ errors.general }}
          </p>
          <p v-if="lockTimeRemaining" class="text-xs text-yellow-600 mt-2">
            Time remaining: {{ lockTimeRemaining }} minutes
          </p>
        </div>
      </div>
    </div>

    <form @submit.prevent="handleSubmit" class="space-y-4">
      <Input
        v-model="form.email"
        type="email"
        label="Email"
        placeholder="your.email@example.com"
        :error="errors.email"
        :icon="EnvelopeIcon"
        required
      />

      <Input
        v-model="form.password"
        type="password"
        label="Password"
        placeholder="Enter your password"
        :error="errors.password"
        :icon="LockClosedIcon"
        required
      />

      <div class="flex items-center justify-between text-sm">
        <label class="flex items-center space-x-2 cursor-pointer">
          <input type="checkbox" class="rounded">
          <span>Remember me</span>
        </label>
        <RouterLink to="/auth/forgot-password" class="text-primary-600 hover:text-primary-700">
          Forgot password?
        </RouterLink>
      </div>

      <Button
        type="submit"
        variant="primary"
        :loading="loading"
        full-width
        size="lg"
      >
        Sign In
      </Button>
    </form>

    <div class="mt-6 text-center text-sm">
      <span class="text-gray-600">Don't have an account?</span>
      <RouterLink to="/auth/register" class="text-primary-600 hover:text-primary-700 font-medium ml-1">
        Sign up
      </RouterLink>
    </div>
  </div>
</template>