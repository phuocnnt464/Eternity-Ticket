<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ordersAPI } from '@/api/orders'
import { membershipAPI } from '@/api/membership'
import Button from '@/components/common/Button.vue'
import { CheckCircleIcon, XCircleIcon, CreditCardIcon } from '@heroicons/vue/24/outline'

const props = defineProps({
  orderId: String,        // For orders
  orderNumber: String,    // For orders and membership
  amount: Number,
  orderType: {
    type: String,
    default: 'order' // 'order' or 'membership'
  }
})

const router = useRouter()
const processing = ref(false)
const countdown = ref(3)
const showSuccess = ref(false)
const showFailed = ref(false)
const paymentMethod = ref('cash') // ✅ Dùng enum có sẵn

const formatPrice = (price) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(price)
}

const handlePayment = async (success = true) => {
  processing.value = true
  
  // Countdown animation
  const timer = setInterval(async () => {
    countdown.value--
    if (countdown.value === 0) {
      clearInterval(timer)
      
      try {
        const transactionId = `MOCK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        
        // ✅ Call real payment API với mock flag
        if (props.orderType === 'membership') {
          const response = await membershipAPI.processPayment(props.orderNumber, {
            payment_method: paymentMethod.value,
            payment_data: {
              mock: true,
              success: success,
              transaction_id: transactionId,
              payment_time: new Date().toISOString()
            }
          })
          
          if (response.success) {
            showSuccess.value = true
            setTimeout(() => {
              router.push({
                path: '/membership/payment/result',
                query: {
                  status: 'success',
                  order: props.orderNumber,
                  txn: transactionId
                }
              })
            }, 2000)
          } else {
            throw new Error('Payment failed')
          }
        } else {
          const response = await ordersAPI.processPayment(props.orderId, {
            payment_method: paymentMethod.value,
            payment_data: {
              mock: true,
              success: success,
              transaction_id: transactionId,
              payment_time: new Date().toISOString()
            }
          })
          
          if (response.success) {
            showSuccess.value = true
            setTimeout(() => {
              router.push({
                path: '/payment/result',
                query: {
                  status: 'success',
                  order: props.orderNumber,
                  txn: transactionId
                }
              })
            }, 2000)
          } else {
            throw new Error('Payment failed')
          }
        }
      } catch (error) {
        console.error('Payment error:', error)
        showFailed.value = true
      } finally {
        processing.value = false
      }
    }
  }, 1000)
}

const handleRetry = () => {
  showFailed.value = false
  countdown.value = 3
}

const handleCancel = () => {
  router.go(-1)
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div class="max-w-md w-full">
      <!-- Processing -->
      <div v-if="processing" class="card text-center space-y-6">
        <div class="flex justify-center">
          <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600"></div>
        </div>
        
        <div>
          <h2 class="text-2xl font-bold text-gray-900 mb-2">
            Processing Payment...
          </h2>
          <p class="text-gray-600">
            Please wait {{ countdown }} seconds
          </p>
        </div>
        
        <div class="bg-blue-50 p-4 rounded-lg">
          <p class="text-sm text-blue-800">
            🎭 <strong>Mock Payment Gateway</strong><br>
            This is a simulated payment for testing purposes
          </p>
        </div>
      </div>

      <!-- Success -->
      <div v-else-if="showSuccess" class="card text-center space-y-6">
        <div class="flex justify-center">
          <CheckCircleIcon class="w-20 h-20 text-green-500" />
        </div>
        
        <div>
          <h2 class="text-2xl font-bold text-gray-900 mb-2">
            Payment Successful! 🎉
          </h2>
          <p class="text-gray-600">
            Redirecting to confirmation page...
          </p>
        </div>
      </div>

      <!-- Failed -->
      <div v-else-if="showFailed" class="card text-center space-y-6">
        <div class="flex justify-center">
          <XCircleIcon class="w-20 h-20 text-red-500" />
        </div>
        
        <div>
          <h2 class="text-2xl font-bold text-gray-900 mb-2">
            Payment Failed
          </h2>
          <p class="text-gray-600">
            Your payment could not be processed
          </p>
        </div>
        
        <div class="flex gap-3">
          <Button variant="primary" full-width @click="handleRetry">
            Try Again
          </Button>
          <Button variant="secondary" full-width @click="handleCancel">
            Cancel
          </Button>
        </div>
      </div>

      <!-- Payment Form -->
      <div v-else class="card space-y-6">
        <div class="text-center border-b pb-4">
          <h2 class="text-2xl font-bold text-gray-900 mb-2">
            Mock Payment Gateway
          </h2>
          <p class="text-sm text-gray-600">
            Testing Mode - Choose payment outcome
          </p>
        </div>

        <!-- Order Info -->
        <div class="bg-gray-50 p-4 rounded-lg space-y-2">
          <div class="flex justify-between">
            <span class="text-gray-600">Order Number:</span>
            <span class="font-semibold">{{ orderNumber }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Amount:</span>
            <span class="font-bold text-lg text-primary-600">{{ formatPrice(amount) }}</span>
          </div>
        </div>

        <!-- Payment Method Selection -->
        <div class="space-y-3">
          <label class="block text-sm font-medium text-gray-700">
            Select Payment Method
          </label>
          
          <div class="space-y-2">
            <label class="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input 
                type="radio" 
                v-model="paymentMethod" 
                value="cash" 
                class="mr-3"
              >
              <span>💵 Cash</span>
            </label>
            
            <label class="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input 
                type="radio" 
                v-model="paymentMethod" 
                value="credit_card" 
                class="mr-3"
              >
              <CreditCardIcon class="w-6 h-6 mr-2 text-gray-600 inline" />
              <span>Credit Card</span>
            </label>
            
            <label class="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input 
                type="radio" 
                v-model="paymentMethod" 
                value="bank_transfer" 
                class="mr-3"
              >
              <span>🏦 Bank Transfer</span>
            </label>
          </div>
        </div>

        <!-- Test Buttons -->
        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p class="text-sm font-semibold text-yellow-800 mb-3">
            🧪 Test Payment Outcome:
          </p>
          
          <div class="space-y-2">
            <Button 
              variant="primary" 
              full-width 
              @click="handlePayment(true)"
            >
              ✅ Simulate Successful Payment
            </Button>
            
            <Button 
              variant="danger" 
              full-width 
              @click="handlePayment(false)"
            >
              ❌ Simulate Failed Payment
            </Button>
          </div>
        </div>

        <div class="text-center">
          <button 
            @click="handleCancel"
            class="text-sm text-gray-600 hover:text-gray-900"
          >
            Cancel and go back
          </button>
        </div>
      </div>
    </div>
  </div>
</template>