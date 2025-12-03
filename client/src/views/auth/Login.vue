<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import Input from '@/components/common/Input.vue'
import Button from '@/components/common/Button.vue'
import { EnvelopeIcon, LockClosedIcon, ShieldCheckIcon, ArrowLeftIcon } from '@heroicons/vue/24/outline'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

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
    errors. value.email = 'Invalid email format'
  }
  
  if (!form.value. password) {
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
      accountLocked. value = true
      lockTimeRemaining.value = data?. minutes_remaining
    }
    
    errors.value. general = error.response?.data?.error?.message || 'Login failed'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-dark-900 via-primary-900 to-black flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <div class="absolute inset-0 opacity-10">
      <div class="absolute inset-0" style="background-image: radial-gradient(circle at 2px 2px, white 1px, transparent 0); background-size: 40px 40px;"></div>
    </div>


    <div class="absolute top-20 right-20 w-96 h-96 bg-primary-500 rounded-full blur-3xl opacity-20"></div>
    <div class="absolute bottom-20 left-20 w-96 h-96 bg-accent-500 rounded-full blur-3xl opacity-20"></div>

    <div class="max-w-md w-full relative z-10">
      <div class="mb-6">
        <RouterLink 
          to="/" 
          class="inline-flex items-center space-x-2 text-white/80 hover:text-white transition-colors group"
        >
          <ArrowLeftIcon class="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span class="font-medium">Back to Home</span>
        </RouterLink>
      </div>

      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-60 h-16 bg-gradient-to-br from-primary-500 to-accent-600 rounded-2xl mb-4">
          <img src="/logo_w.svg" alt="Logo" class="w-10 h-10 mr-2" />
          <span class="text-white text-2xl font-bold">Eternity Tickets</span>
        </div>
        <h2 class="text-3xl font-bold text-white mb-2">Welcome Back</h2>
        <p class="text-gray-300">Sign in to your Eternity Tickets account</p>
      </div>

      <div class="bg-white rounded-2xl shadow-2xl p-8">
        <div v-if="errors.general" class="bg-red-50 border-2 border-red-500 text-red-800 px-4 py-3 rounded-xl mb-6">
          <p class="font-medium">{{ errors.general }}</p>
        </div>

        <div v-if="accountLocked" class="bg-yellow-50 border-2 border-yellow-500 rounded-xl p-4 mb-6">
          <div class="flex items-start">
            <LockClosedIcon class="w-5 h-5 text-yellow-600 mr-3 mt-0. 5 flex-shrink-0" />
            <div>
              <p class="font-semibold text-yellow-900">Account Temporarily Locked</p>
              <p class="text-sm text-yellow-700 mt-1">{{ errors.general }}</p>
              <p v-if="lockTimeRemaining" class="text-xs text-yellow-600 mt-2">
                Time remaining: {{ lockTimeRemaining }} minutes
              </p>
            </div>
          </div>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-6">
          <Input
            v-model="form.email"
            type="email"
            label="Email Address"
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
            <label class="flex items-center space-x-2 cursor-pointer group">
              <input type="checkbox" class="rounded border-gray-300 text-primary-600 focus:ring-primary-500">
              <span class="text-gray-700 group-hover:text-gray-900">Remember me</span>
            </label>
            <RouterLink to="/auth/forgot-password" class="text-primary-600 hover:text-primary-700 font-medium">
              Forgot password?
            </RouterLink>
          </div>

          <Button
            type="submit"
            variant="primary"
            :loading="loading"
            full-width
            size="lg"
            class=" shadow-lg"
          >
            <ShieldCheckIcon class="inline-flex w-5 h-5 mr-2" />
            Sign In
          </Button>
        </form>

        <div class="mt-6 text-center">
          <span class="text-gray-600">Don't have an account?</span>
          <RouterLink to="/auth/register" class="text-primary-600 hover:text-primary-700 font-semibold ml-1">
            Sign up for free
          </RouterLink>
        </div>
      </div>

      <!-- <div class="mt-6 text-center">
        <p class="text-sm text-gray-400 flex items-center justify-center">
          <ShieldCheckIcon class="w-4 h-4 mr-1" />
          Protected by 256-bit encryption
        </p>
      </div> -->
    </div>
  </div>
</template>