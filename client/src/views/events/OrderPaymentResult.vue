<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/vue/24/outline'
import Button from '@/components/common/Button.vue'

const route = useRoute()
const router = useRouter()

const status = ref(route.query.status || 'unknown')
const orderNumber = ref(route.query.order || 'N/A')
const transactionId = ref(route.query.txn || 'N/A')
const message = ref(route.query.message || '')

const isSuccess = ref(status.value === 'success')

onMounted(() => {
  console.log('Payment Result:', {
    status: status.value,
    order: orderNumber.value,
    txn: transactionId.value
  })
})

const goToOrders = () => {
  router.push({ name: 'MyOrders' })
}

const goToHome = () => {
  router.push({ name: 'Home' })
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
    <div class="max-w-md w-full">
      <div class="card text-center">
        <!-- Success -->
        <div v-if="isSuccess" class="space-y-4">
          <div class="flex justify-center">
            <CheckCircleIcon class="w-20 h-20 text-green-500" />
          </div>
          
          <h2 class="text-2xl font-bold text-gray-900">
            Payment Successful!
          </h2>
          
          <p class="text-gray-600">
            Your payment has been processed successfully.
          </p>
          
          <div class="bg-green-50 p-4 rounded-lg text-left">
            <p class="text-sm text-gray-700">
              <span class="font-semibold">Order Number:</span> {{ orderNumber }}
            </p>
            <p class="text-sm text-gray-700 mt-2" v-if="transactionId !== 'N/A'">
              <span class="font-semibold">Transaction ID:</span> {{ transactionId }}
            </p>
          </div>
          
          <p class="text-sm text-gray-600">
            Your tickets have been sent to your email.
          </p>
          
          <div class="flex gap-3">
            <Button variant="primary" full-width @click="goToOrders">
              View My Orders
            </Button>
            <Button variant="secondary" full-width @click="goToHome">
              Back to Home
            </Button>
          </div>
        </div>

        <!-- Failure -->
        <div v-else class="space-y-4">
          <div class="flex justify-center">
            <XCircleIcon class="w-20 h-20 text-red-500" />
          </div>
          
          <h2 class="text-2xl font-bold text-gray-900">
            Payment Failed
          </h2>
          
          <p class="text-gray-600">
            {{ message || 'Your payment could not be processed.' }}
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
            <Button variant="primary" full-width @click="goToOrders">
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