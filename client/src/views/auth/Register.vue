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
  PhoneIcon,
  UserGroupIcon,
  SparklesIcon,
  ShieldCheckIcon
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
  if (route.query.role === 'organizer') {
    form.value.role = 'organizer'
  }
})

const validate = () => {
  errors.value = {}
  
  if (!form. value.first_name) errors.value.first_name = 'First name is required'
  if (!form.value.last_name) errors.value.last_name = 'Last name is required'
  
  if (!form.value.email) {
    errors.value. email = 'Email is required'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email)) {
    errors. value.email = 'Invalid email format'
  }
  
  if (!form.value.phone) {
    errors.value. phone = 'Phone number is required'
  } else if (!/^[0-9]{10,11}$/.test(form.value.phone)) {
    errors. value.phone = 'Invalid phone number'
  }
  
  if (!form.value.password) {
    errors.value.password = 'Password is required'
  } else if (form.value. password.length < 8) {
    errors.value.password = 'Password must be at least 8 characters'
  }
  
  if (form.value.password !== form. value.password_confirmation) {
    errors.value.password_confirmation = 'Passwords do not match'
  }
  
  return Object.keys(errors.value).length === 0
}

const handleSubmit = async () => {
  if (!validate()) return
  
  loading.value = true
  try {
    await authStore.register(form.value)
    router.push('/auth/login? registered=true')
  } catch (error) {
    errors.value.general = error.message || 'Registration failed'
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

    <!-- Decorative blobs -->
    <div class="absolute top-20 right-20 w-96 h-96 bg-accent-500 rounded-full blur-3xl opacity-20"></div>
    <div class="absolute bottom-20 left-20 w-96 h-96 bg-success-500 rounded-full blur-3xl opacity-20"></div>

    <div class="max-w-2xl w-full relative z-10">
      <!-- Header -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-500 to-accent-600 rounded-2xl mb-4">
          <img src="/logo_w.svg" alt="Logo" class="w-10 h-10" />
        </div>
        <h2 class="text-3xl font-bold text-white mb-2">Create Your Account</h2>
        <p class="text-gray-300">
          Join as a {{ form.role === 'organizer' ? 'Event Organizer' : 'Participant' }}
        </p>
      </div>

      <!-- Form Card -->
      <div class="bg-white rounded-2xl shadow-2xl p-8">
        <div v-if="errors.general" class="bg-red-50 border-2 border-red-500 text-red-800 px-4 py-3 rounded-xl mb-6">
          <p class="font-medium">{{ errors.general }}</p>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-6">
          <!-- Role Selection -->
          <div>
            <label class="label mb-3">I want to</label>
            <div class="grid grid-cols-2 gap-4">
              <label
                :class="[
                  'border-2 rounded-xl p-4 cursor-pointer transition-all group hover:shadow-lg',
                  form.role === 'participant' 
                    ? 'border-primary-600 bg-gradient-to-br from-primary-50 to-primary-100 shadow-md' 
                    : 'border-gray-300 hover:border-primary-300 bg-white'
                ]"
              >
                <input type="radio" v-model="form.role" value="participant" class="hidden" />
                <div class="flex flex-col items-center text-center">
                  <div :class="[
                    'w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-all',
                    form. role === 'participant' ?  'bg-primary-600' : 'bg-gray-200 group-hover:bg-primary-100'
                  ]">
                    <UserGroupIcon :class="[
                      'w-6 h-6',
                      form.role === 'participant' ? 'text-white' : 'text-gray-600 group-hover:text-primary-600'
                    ]" />
                  </div>
                  <span class="font-semibold">Attend Events</span>
                  <span class="text-xs text-gray-600 mt-1">Book tickets & enjoy</span>
                </div>
              </label>

              <label
                :class="[
                  'border-2 rounded-xl p-4 cursor-pointer transition-all group hover:shadow-lg',
                  form. role === 'organizer' 
                    ? 'border-accent-600 bg-gradient-to-br from-accent-50 to-accent-100 shadow-md' 
                    : 'border-gray-300 hover:border-accent-300 bg-white'
                ]"
              >
                <input type="radio" v-model="form. role" value="organizer" class="hidden" />
                <div class="flex flex-col items-center text-center">
                  <div :class="[
                    'w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-all',
                    form.role === 'organizer' ? 'bg-accent-600' : 'bg-gray-200 group-hover:bg-accent-100'
                  ]">
                    <SparklesIcon :class="[
                      'w-6 h-6',
                      form. role === 'organizer' ?  'text-white' : 'text-gray-600 group-hover:text-accent-600'
                    ]" />
                  </div>
                  <span class="font-semibold">Create Events</span>
                  <span class="text-xs text-gray-600 mt-1">Organize & manage</span>
                </div>
              </label>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <Input
              v-model="form. first_name"
              label="First Name"
              placeholder="John"
              :error="errors. first_name"
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
            v-model="form. email"
            type="email"
            label="Email Address"
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

          <div class="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg">
            By signing up, you agree to our
            <a href="#" class="text-primary-600 font-medium hover:underline">Terms of Service</a>
            and
            <a href="#" class="text-primary-600 font-medium hover:underline">Privacy Policy</a>
          </div>

          <Button
            type="submit"
            variant="primary"
            :loading="loading"
            full-width
            size="lg"
            class="shadow-lg"
          >
            <ShieldCheckIcon class="w-5 h-5 mr-2" />
            Create Account
          </Button>
        </form>

        <div class="mt-6 text-center">
          <span class="text-gray-600">Already have an account? </span>
          <RouterLink to="/auth/login" class="text-primary-600 hover:text-primary-700 font-semibold ml-1">
            Sign in
          </RouterLink>
        </div>
      </div>

      <!-- Trust Badge -->
      <div class="mt-6 text-center">
        <p class="text-sm text-gray-400 flex items-center justify-center">
          <ShieldCheckIcon class="w-4 h-4 mr-1" />
          Your data is protected with 256-bit encryption
        </p>
      </div>
    </div>
  </div>
</template>