<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { eventsAPI } from '@/api/events.js'
import Card from '@/components/common/Card.vue'
import Button from '@/components/common/Button.vue'
import Spinner from '@/components/common/Spinner.vue'
import {
  CheckCircleIcon,
  XCircleIcon,
  EnvelopeIcon
} from '@heroicons/vue/24/outline'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const loading = ref(true)
const accepting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const checkAuthAndAccept = async () => {
  loading.value = true
  
  // Nếu chưa login, redirect về login
  if (!authStore.isAuthenticated) {
    router.push({
      name: 'Login',
      query: { 
        redirect: route.fullPath,
        message: 'Please login to accept the invitation'
      }
    })
    return
  }
  
  loading.value = false
}

const handleAccept = async () => {
  accepting.value = true
  errorMessage.value = ''
  
  try {
    const token = route.params.token
    const response = await eventsAPI.acceptInvitation(token)
    
    successMessage.value = response.data.message || 'Successfully joined the team!'
    
    // Redirect to organizer events after 2 seconds
    setTimeout(() => {
      router.push({ name: 'MyEvents' })
    }, 2000)
  } catch (error) {
    console.error('Failed to accept invitation:', error)
    errorMessage.value = error.response?.data?.message || 
                         error.response?.data?.error?.message ||
                         'Failed to accept invitation. The link may be invalid or expired.'
  } finally {
    accepting.value = false
  }
}

onMounted(() => {
  checkAuthAndAccept()
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-primary-50 to-accent-50 flex items-center justify-center p-4">
    <Card class="max-w-md w-full">
      <!-- Loading -->
      <div v-if="loading" class="text-center py-8">
        <Spinner size="xl" />
        <p class="text-gray-600 mt-4">Loading invitation...</p>
      </div>

      <!-- Success -->
      <div v-else-if="successMessage" class="text-center py-8">
        <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircleIcon class="w-10 h-10 text-green-600" />
        </div>
        <h2 class="text-2xl font-bold text-gray-900 mb-2">Success!</h2>
        <p class="text-gray-600 mb-4">{{ successMessage }}</p>
        <p class="text-sm text-gray-500">Redirecting to your events...</p>
      </div>

      <!-- Error -->
      <div v-else-if="errorMessage" class="text-center py-8">
        <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <XCircleIcon class="w-10 h-10 text-red-600" />
        </div>
        <h2 class="text-2xl font-bold text-gray-900 mb-2">Invalid Invitation</h2>
        <p class="text-gray-600 mb-6">{{ errorMessage }}</p>
        <div class="space-y-2">
          <Button variant="primary" @click="router.push({ name: 'Login' })" full-width>
            Go to Login
          </Button>
          <Button variant="secondary" @click="router.push({ name: 'Home' })" full-width>
            Go to Home
          </Button>
        </div>
      </div>

      <!-- Accept Invitation -->
      <div v-else class="text-center py-8">
        <div class="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <EnvelopeIcon class="w-10 h-10 text-primary-600" />
        </div>
        <h2 class="text-2xl font-bold text-gray-900 mb-2">Event Team Invitation</h2>
        <p class="text-gray-600 mb-2">You have been invited to join an event team</p>
        <p class="text-sm text-gray-500 mb-6">
          Logged in as: <strong>{{ authStore.user?.email }}</strong>
        </p>

        <div class="space-y-3">
          <Button 
            variant="primary" 
            @click="handleAccept" 
            :loading="accepting"
            full-width
            size="lg"
          >
            Accept Invitation
          </Button>
          <Button 
            variant="secondary" 
            @click="router.push({ name: 'Home' })" 
            full-width
          >
            Decline
          </Button>
        </div>

        <p class="text-xs text-gray-500 mt-6">
          By accepting, you agree to join the event team and collaborate with other members.
        </p>
      </div>
    </Card>
  </div>
</template>