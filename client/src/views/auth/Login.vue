<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import Input from '@/components/common/Input.vue'
import Button from '@/components/common/Button.vue'
import { EnvelopeIcon, LockClosedIcon } from '@heroicons/vue/24/outline'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const form = ref({
  email: '',
  password: ''
})

const errors = ref({})
const loading = ref(false)

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
    errors.value.general = error.message || 'Login failed'
  } finally {
    loading.value = false
  }
}
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