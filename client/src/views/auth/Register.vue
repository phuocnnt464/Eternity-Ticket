<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import Input from '@/components/common/Input.vue'
import Button from '@/components/common/Button.vue'
import { 
  UserIcon, 
  EnvelopeIcon, 
  LockClosedIcon,
  PhoneIcon 
} from '@heroicons/vue/24/outline'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const form = ref({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  password: '',
  password_confirmation: '',
  role: 'participant'
})

const errors = ref({})
const loading = ref(false)

onMounted(() => {
  // Check if role is specified in query
  if (route.query.role === 'organizer') {
    form.value.role = 'organizer'
  }
})

const validate = () => {
  errors.value = {}
  
  if (!form.value.first_name) {
    errors.value.first_name = 'First name is required'
  }
  
  if (!form.value.last_name) {
    errors.value.last_name = 'Last name is required'
  }
  
  if (!form.value.email) {
    errors.value.email = 'Email is required'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email)) {
    errors.value.email = 'Invalid email format'
  }
  
  if (!form.value.phone) {
    errors.value.phone = 'Phone number is required'
  } else if (!/^[0-9]{10,11}$/.test(form.value.phone)) {
    errors.value.phone = 'Invalid phone number'
  }
  
  if (!form.value.password) {
    errors.value.password = 'Password is required'
  } else if (form.value.password.length < 8) {
    errors.value.password = 'Password must be at least 8 characters'
  }
  
  if (form.value.password !== form.value.password_confirmation) {
    errors.value.password_confirmation = 'Passwords do not match'
  }
  
  return Object.keys(errors.value).length === 0
}

const handleSubmit = async () => {
  if (!validate()) return
  
  loading.value = true
  try {
    await authStore.register(form.value)
    router.push('/auth/login?registered=true')
  } catch (error) {
    errors.value.general = error.message || 'Registration failed'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <div class="text-center mb-6">
      <h2 class="text-2xl font-bold text-gray-900">Create Account</h2>
      <p class="text-gray-600 mt-2">
        Sign up as a {{ form.role === 'organizer' ? 'Event Organizer' : 'Participant' }}
      </p>
    </div>

    <div v-if="errors.general" class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4 text-sm">
      {{ errors.general }}
    </div>

    <form @submit.prevent="handleSubmit" class="space-y-4">
      <!-- Role Selection -->
      <div>
        <label class="label">Register as</label>
        <div class="grid grid-cols-2 gap-3">
          <label
            :class="[
              'border-2 rounded-lg p-3 text-center cursor-pointer transition-all',
              form.role === 'participant' 
                ? 'border-primary-600 bg-primary-50' 
                : 'border-gray-300 hover:border-gray-400'
            ]"
          >
            <input type="radio" v-model="form.role" value="participant" class="hidden" />
            <span class="font-medium">Participant</span>
          </label>
          <label
            :class="[
              'border-2 rounded-lg p-3 text-center cursor-pointer transition-all',
              form.role === 'organizer' 
                ? 'border-primary-600 bg-primary-50' 
                : 'border-gray-300 hover:border-gray-400'
            ]"
          >
            <input type="radio" v-model="form.role" value="organizer" class="hidden" />
            <span class="font-medium">Organizer</span>
          </label>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <Input
          v-model="form.first_name"
          label="First Name"
          placeholder="John"
          :error="errors.first_name"
          :icon="UserIcon"
          required
        />

        <Input
          v-model="form.last_name"
          label="Last Name"
          placeholder="Doe"
          :error="errors.last_name"
          required
        />
      </div>

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
        v-model="form.phone"
        type="tel"
        label="Phone Number"
        placeholder="0123456789"
        :error="errors.phone"
        :icon="PhoneIcon"
        required
      />

      <Input
        v-model="form.password"
        type="password"
        label="Password"
        placeholder="At least 8 characters"
        :error="errors.password"
        :icon="LockClosedIcon"
        help-text="Must be at least 8 characters"
        required
      />

      <Input
        v-model="form.password_confirmation"
        type="password"
        label="Confirm Password"
        placeholder="Re-enter password"
        :error="errors.password_confirmation"
        required
      />

      <div class="text-xs text-gray-600">
        By signing up, you agree to our
        <a href="#" class="text-primary-600">Terms of Service</a>
        and
        <a href="#" class="text-primary-600">Privacy Policy</a>
      </div>

      <Button
        type="submit"
        variant="primary"
        :loading="loading"
        full-width
        size="lg"
      >
        Create Account
      </Button>
    </form>

    <div class="mt-6 text-center text-sm">
      <span class="text-gray-600">Already have an account?</span>
      <RouterLink to="/auth/login" class="text-primary-600 hover:text-primary-700 font-medium ml-1">
        Sign in
      </RouterLink>
    </div>
  </div>
</template>