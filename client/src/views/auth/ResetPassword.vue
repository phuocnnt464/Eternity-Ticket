<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { authAPI } from '@/api/auth.js'
import Input from '@/components/common/Input.vue'
import Button from '@/components/common/Button.vue'
import { LockClosedIcon } from '@heroicons/vue/24/outline'

const router = useRouter()
const route = useRoute()

const form = ref({
  token: '',
  new_password: '',
  confirm_password: ''
})

const errors = ref({})
const loading = ref(false)
const tokenValid = ref(true)

onMounted(() => {
  form.value.token = route.params.token
  
  if (!form.value.token) {
    tokenValid.value = false
  }
})

const validate = () => {
  errors.value = {}
  
  if (!form.value.new_password) {
    errors.value.new_password = 'Password is required'
  } else if (form.value.new_password.length < 8) {
    errors.value.new_password = 'Password must be at least 8 characters'
  }
  
  if (form.value.new_password !== form.value.confirm_password) {
    errors.value.confirm_password = 'Passwords do not match'
  }
  
  return Object.keys(errors.value).length === 0
}

const handleSubmit = async () => {
  if (!validate()) return
  
  loading.value = true
  try {
    await authAPI.resetPassword(form.value)
    router.push('/auth/login?reset=success')
  } catch (error) {
    errors.value.general = error.response?.data?.error?.message || 'Failed to reset password'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <div class="text-center mb-6">
      <h2 class="text-2xl font-bold text-gray-900">Reset Password</h2>
      <p class="text-gray-600 mt-2">Enter your new password</p>
    </div>

    <div v-if="!tokenValid" class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4">
      <p class="font-medium">Invalid reset link</p>
      <p class="text-sm mt-1">This password reset link is invalid or has expired.</p>
      <RouterLink to="/auth/forgot-password" class="text-sm font-medium underline mt-2 inline-block">
        Request a new link
      </RouterLink>
    </div>

    <div v-else>
      <div v-if="errors.general" class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4 text-sm">
        {{ errors.general }}
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <Input
          v-model="form.new_password"
          type="password"
          label="New Password"
          placeholder="At least 8 characters"
          :error="errors.new_password"
          :icon="LockClosedIcon"
          help-text="Must be at least 8 characters"
          required
        />

        <Input
          v-model="form.confirm_password"
          type="password"
          label="Confirm New Password"
          placeholder="Re-enter password"
          :error="errors.confirm_password"
          required
        />

        <Button
          type="submit"
          variant="primary"
          :loading="loading"
          full-width
          size="lg"
        >
          Reset Password
        </Button>
      </form>
    </div>
  </div>
</template>