<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/vue/24/outline'
import Button from '@/components/common/Button.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const status = ref(route.query.status || 'unknown')
const orderNumber = ref(route.query.order || 'N/A')
const transactionId = ref(route.query.txn || 'N/A')
const message = ref(route.query.message || '')

const isSuccess = ref(status.value === 'success')

onMounted(async () => {
  console.log('Membership Payment Result:', {
    status: status.value,
    order: orderNumber.value,
    txn: transactionId.value
  })
  
  try {
    await authStore.fetchProfile()
    console.log('Profile refreshed, membership tier:', authStore.membershipTier)
  } catch (error) {
    console.error('Failed to refresh profile:', error)
  }
})

const goToMembership = () => {
  router.push({ name: 'Membership' })
}

const goToHome = () => {
  router.push({ name: 'Home' })
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
    <div class="max-w-md w-full">
      <div class="card text-center">
        <div v-if="isSuccess" class="space-y-4">
          <div class="flex justify-center">
            <CheckCircleIcon class="w-20 h-20 text-green-500" />
          </div>
          
          <h2 class="text-2xl font-bold text-gray-900">
            Membership Activated! 🎉
          </h2>
          
          <p class="text-gray-600">
            Your membership has been successfully activated.
          </p>
          
          <div class="bg-green-50 p-4 rounded-lg text-left">
            <p class="text-sm text-gray-700">
              <span class="font-semibold">Order Number:</span> {{ orderNumber }}
            </p>
            <p class="text-sm text-gray-700 mt-2" v-if="transactionId !== 'N/A'">
              <span class="font-semibold">Transaction ID:</span> {{ transactionId }}
            </p>
            <p class="text-sm text-gray-700 mt-2">
              <span class="font-semibold">Membership Tier:</span> {{ authStore.user?.membership_tier || 'N/A' }}
            </p>
          </div>
          
          <p class="text-sm text-gray-600">
            You can now enjoy all your membership benefits!
          </p>
          
          <div class="flex gap-3">
            <Button variant="primary" full-width @click="goToMembership">
              View Membership
            </Button>
            <Button variant="secondary" full-width @click="goToHome">
              Back to Home
            </Button>
          </div>
        </div>

        <div v-else class="space-y-4">
          <div class="flex justify-center">
            <XCircleIcon class="w-20 h-20 text-red-500" />
          </div>
          
          <h2 class="text-2xl font-bold text-gray-900">
            Payment Failed
          </h2>
          
          <p class="text-gray-600">
            {{ message || 'Your membership payment could not be processed.' }}
          </p>
          
          <div class="bg-red-50 p-4 rounded-lg text-left">
            <p class="text-sm text-gray-700">
              <span class="font-semibold">Order Number:</span> {{ orderNumber }}
            </p>
            <p class="text-sm text-gray-700 mt-2">
              <span class="font-semibold">Status:</span> Failed
            </p>
          </div>
          
          <div class="flex gap-3">
            <Button variant="primary" full-width @click="goToMembership">
              Try Again
            </Button>
            <Button variant="secondary" full-width @click="goToHome">
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>