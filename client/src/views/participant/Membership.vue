<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { membershipAPI } from '@/api/membership.js'
import { toast } from 'vue3-toastify'
import Badge from '@/components/common/Badge.vue'
import Button from '@/components/common/Button.vue'
import Spinner from '@/components/common/Spinner.vue'
import Modal from '@/components/common/Modal.vue'
import {
  SparklesIcon,
  CheckCircleIcon,
  XMarkIcon,
  CreditCardIcon,
  CalendarIcon,
  BoltIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  XCircleIcon
} from '@heroicons/vue/24/outline'

const authStore = useAuthStore()
const router = useRouter()

const loading = ref(true)
const membershipData = ref(null)
const showUpgradeModal = ref(false)
const selectedPlan = ref(null)
const upgrading = ref(false)

const cancellingMembership = ref(false) 
const cancellingImmediately = ref(false) 

const currentStep = ref(1) // 1 = Confirm, 2 = Processing
const paymentMethod = ref('vnpay')
const processingPayment = ref(false)
const paymentCountdown = ref(3)
const paymentSuccess = ref(false)
const createdOrder = ref(null)

const membershipTiers = [
  {
    name: 'Basic',
    value: 'basic',
    price: 0,
    period: 'Forever Free',
    color: 'gray',
    icon: SparklesIcon,
    features: [
      { text: 'Browse all events', included: true },
      { text: 'Purchase tickets', included: true },
      { text: 'Email support', included: true },
      { text: 'Priority support', included: false },
      { text: 'Early access to tickets', included: false },
      { text: 'Exclusive discounts', included: false }
    ]
  },
  {
    name: 'Advanced',
    value: 'advanced',
    price: 149000,
    period: 'per month',
    color: 'blue',
    icon: BoltIcon,
    popular: false,
    features: [
      { text: 'All Basic features', included: true },
      { text: '5% discount on all tickets', included: true },
      { text: 'Event notifications', included: true },
      { text: 'Exclusive coupons', included: true },
      { text: 'Priority support', included: true },
      { text: 'Early access', included: false }
    ]
  },
  {
    name: 'Premium',
    value: 'premium',
    price: 299000,
    period: 'per month',
    color: 'yellow',
    icon: SparklesIcon,
    popular: true,
    features: [
      { text: 'All Advanced features', included: true },
      { text: '10% discount on all tickets', included: true },
      { text: 'Early access (5 hours before sale)', included: true, highlight: true },
      { text: 'Max 5 tickets per order', included: true },
      { text: 'Priority notifications', included: true },
      { text: 'Exclusive Premium coupons', included: true }
    ]
  }
]

const currentTier = computed(() => {
  if (membershipData.value?.tier) {
    return membershipData.value.tier
  }
  if (authStore.membershipTier) {
    return authStore.membershipTier
  }
  return 'basic'
})

const currentPlan = computed(() => {
  return membershipTiers.find(t => t.value === currentTier.value) || membershipTiers[0]
})

const membershipInfo = computed(() => {
  if (membershipData.value) {
    return membershipData.value
  }
  if (authStore.user?.membership) {
    return authStore.user.membership
  }
  return null
})

const canUpgrade = (tierValue) => {
  const tierOrder = ['basic', 'advanced', 'premium']
  const currentIndex = tierOrder.indexOf(currentTier.value)
  const targetIndex = tierOrder.indexOf(tierValue)
  return targetIndex > currentIndex
}

// ✅ FIX: Dùng getCurrentMembership thay vì getMembershipStatus
const fetchMembershipData = async () => {
  loading.value = true
  try {
    const response = await membershipAPI.getCurrentMembership() 

    membershipData.value = response.data
    
    console.log('✅ Fetched membership data:', membershipData.value)
  } catch (error) {
    console.error('❌ Failed to fetch membership data:', error)
    // Don't show error to user if they just don't have membership
    if (error.response?.status !== 404) {
      toast.error('Failed to load membership data', {
        position: 'top-right',
        autoClose: 3000
      })
    }
  } finally {
    loading.value = false
  }
}

const handleUpgrade = (tier) => {
  if (!canUpgrade(tier. value)) return
  
  selectedPlan.value = tier
  showUpgradeModal.value = true
  currentStep.value = 1
  paymentMethod.value = 'vnpay'
}

// ✅ FIX: Thêm tier vào request
const confirmUpgrade = async () => {
  if (!selectedPlan.value) return
  
  upgrading.value = true
  try {
    console.log('📤 Creating membership order for tier:', selectedPlan.value)
    
    // Step 1: Create membership order
    const orderResponse = await membershipAPI.createOrder({
      tier: selectedPlan.value.value, 
      billing_period: 'monthly',
      return_url: window.location.origin + '/membership/payment/result'
    })
    
    console.log('✅ Membership order created:', orderResponse.data)
    
    const orderData = orderResponse.data
    
    // If free tier (no payment required)
    if (!orderData.payment_required) {
      toast.success('Membership activated successfully!', {
        position: 'top-right',
        autoClose: 3000
      })
      await authStore.fetchProfile()
      await fetchMembershipData()
      showUpgradeModal.value = false
      upgrading.value = false
      return
    }

     createdOrder.value = orderData. order
    
    // Move to step 2: Processing payment
    upgrading.value = false
    currentStep.value = 2
    processMockPayment()
    
  } catch (error) {
    console.error('❌ Order creation error:', error)
    console.error('❌ Error details:', error.response?.data)
    
    const errorMsg = error.response?.data?.error?.message || 'Failed to create membership order'
    toast.error(errorMsg, {
      position: 'top-right',
      autoClose: 5000
    })
    
    upgrading.value = false
  }
}

// ✅ STEP 2: Process mock payment (GIỐNG EVENT CHECKOUT)
const processMockPayment = async () => {
  processingPayment.value = true
  paymentCountdown.value = 3

  // Countdown 3 giây
  const countdownTimer = setInterval(() => {
    paymentCountdown.value--
    
    if (paymentCountdown. value <= 0) {
      clearInterval(countdownTimer)
      completeMockPayment()
    }
  }, 1000)
}

// ✅ STEP 3: Complete mock payment (CALL processPayment API)
const completeMockPayment = async () => {
  try {
    // Giả lập transaction ID
    const transactionId = `TXN-MEM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    // ✅ Call processPayment API (GIỐNG ORDER)
    const response = await membershipAPI.processPayment(createdOrder.value.order_number, {
      payment_method: paymentMethod.value,
      payment_data: {
        mock: true,
        success: true,
        transaction_id: transactionId,
        payment_time: new Date().toISOString()
      }
    })

    console.log('✅ Payment response:', response)

    if (response.success || response.data?. success) {
      paymentSuccess.value = true
      processingPayment.value = false
      
      toast.success('Payment successful! Membership activated.')

      // Wait 2 seconds then redirect
      setTimeout(async () => {
        showUpgradeModal.value = false
        
        // Refresh profile
        await authStore.fetchProfile()
        await fetchMembershipData()
        
        // Redirect to result page
        router.push({
          path: '/events/membership/payment/result',
          query: {
            status: 'success',
            order: createdOrder.value.order_number,
            txn: transactionId
          }
        })
      }, 2000)
    } else {
      throw new Error('Payment failed')
    }
  } catch (error) {
    console.error('❌ Payment error:', error)
    processingPayment.value = false
    toast.error('Payment failed.  Please try again.')
    
    // Quay lại step 1
    currentStep.value = 1
  }
}

const handleCancelPayment = () => {
  if (confirm('Are you sure you want to cancel this payment?')) {
    processingPayment.value = false
    currentStep.value = 1
    showUpgradeModal.value = false
  }
}

const handleCancelMembership = async () => {
  if (!confirm('Are you sure you want to cancel your membership?  You will lose all premium benefits.')) {
    return
  }

  cancellingMembership.value = true 
  
  try {
    const response = await membershipAPI.cancelMembership()
    console.log('✅ Cancel response:', response)

    await authStore.fetchProfile()
    await fetchMembershipData()
    
    toast.success('Membership cancelled successfully', {
      position: 'top-right',
      autoClose: 3000
    })
  } catch (error) {
    console.error('❌ Cancel membership error:', error)

    console.error('❌ Error response:', error.response?.data)
    console.error('❌ Error status:', error.response?.status)
  
    
    // const errorMsg = error.response?.data?.error?.message || 'Failed to cancel membership'
    let errorMsg = 'Failed to cancel membership'
    
    if (error.response?.status === 404) {
      errorMsg = 'No active membership found to cancel'
    } else if (error.response?.data?.error?.message) {
      errorMsg = error.response.data.error.message
    } else if (error.message) {
      errorMsg = error.message
    }

    toast.error(errorMsg, {
      position: 'top-right',
      autoClose: 5000
    })
  } finally {
    cancellingMembership.value = false
  }
}

const handleCancelImmediately = async () => {
  if (! confirm(
    'Cancel your membership immediately?\n\n' +
    '⚠️ You will lose all benefits right now.\n' +
    `⚠️ No refund for remaining ${Math.ceil((new Date(membershipData. value?. end_date) - new Date()) / (1000 * 60 * 60 * 24))} days.\n\n` +
    'This action cannot be undone.'
  )) {
    return
  }

  cancellingImmediately.value = true
  
  try {
    console.log('🔄 Cancelling membership immediately...')
    
    const response = await membershipAPI.cancelMembership({
      cancel_immediately: true
    })
    
    console.log('✅ Immediate cancel response:', response)

    await authStore.fetchProfile()
    await fetchMembershipData()
    
    toast.success('Membership cancelled immediately', {
      position: 'top-right',
      autoClose: 3000
    })
    
  } catch (error) {
    console.error('❌ Immediate cancel error:', error)
    
    let errorMsg = 'Failed to cancel membership'
    
    if (error. response?.status === 404) {
      errorMsg = 'No active membership found'
    } else if (error.response?.data?. error?.message) {
      errorMsg = error.response.data. error.message
    }

    toast.error(errorMsg, {
      position: 'top-right',
      autoClose: 5000
    })
  } finally {
    cancellingImmediately.value = false
  }
}

const formatPrice = (price) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(price)
}

onMounted(() => {
  fetchMembershipData()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Membership</h1>
      <p class="text-gray-600 mt-1">Upgrade your membership for exclusive benefits</p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <Spinner size="xl" />
    </div>

    <div v-else>
      <!-- Current Membership Status -->
      <div class="card bg-gradient-to-br from-primary-50 to-accent-50">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600 mb-2">Current Plan</p>
            <div class="flex items-center space-x-3">
              <h2 class="text-2xl font-bold text-gray-900">{{ currentPlan?. name }}</h2>
              <Badge :variant="currentTier === 'premium' ? 'primary' : currentTier === 'advanced' ? 'info' : 'default'">
                {{ currentPlan?.name }}
              </Badge>
              
              <Badge v-if="membershipData?.cancelled_at" variant="warning">
                Cancelled
              </Badge>
            </div>
            
            <div v-if="membershipData?.start_date" class="mt-3 space-y-1 text-sm text-gray-600">
              <div class="flex items-center space-x-2">
                <CalendarIcon class="w-4 h-4" />
                <span>Started: {{ new Date(membershipData.start_date).toLocaleDateString() }}</span>
              </div>
              <div v-if="membershipData?.end_date" class="flex items-center space-x-2">
                <CalendarIcon class="w-4 h-4" />
                <span>Expires: {{ new Date(membershipData. end_date).toLocaleDateString() }}</span>
              </div>
              
              <!-- ✅ FIX: Use Heroicon component instead of SVG path -->
              <div v-if="membershipData?.cancelled_at" class="flex items-start space-x-2 text-orange-600 font-medium pt-2">
                <ExclamationTriangleIcon class="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Cancelled on {{ new Date(membershipData.cancelled_at).toLocaleDateString() }}</span>
              </div>
            </div>
          </div>

          <div v-if="currentTier !== 'basic'" class="text-right">
            <p class="text-sm text-gray-600 mb-2">Monthly Payment</p>
            <p class="text-2xl font-bold text-primary-600">{{ formatPrice(currentPlan?.price) }}</p>
          </div>
        </div>

        <!-- Cancel button section -->
        <div v-if="currentTier !== 'basic' && ! membershipData?.cancelled_at" class="mt-4 pt-4 border-t border-primary-100">
          <p class="text-sm text-gray-600 mb-2">
            Cancel auto-renewal.  You'll keep access until {{ membershipData?. end_date ?  new Date(membershipData.end_date).toLocaleDateString() : 'end of period' }}
          </p>
          <Button 
            variant="danger" 
            size="sm" 
            :loading="cancellingMembership"
            :disabled="cancellingMembership" 
            @click="handleCancelMembership"
          >
            {{ cancellingMembership ? 'Cancelling...' : 'Cancel Auto-Renewal' }}
          </Button>
        </div>

        
        <!-- ✅ UPDATE: Show message + option to cancel immediately if already cancelled -->
        <div v-else-if="membershipData?.cancelled_at && membershipData?.is_active" class="mt-4 pt-4 border-t space-y-3">
          <!-- Warning message -->
          <div class="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div class="flex items-start space-x-3">
              <ExclamationTriangleIcon class="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div class="flex-1">
                <p class="text-sm font-medium text-orange-900">Auto-Renewal Cancelled</p>
                <p class="text-sm text-orange-700 mt-1">
                  Your membership will remain active until {{ new Date(membershipData.end_date).toLocaleDateString() }}.
                  It will not renew automatically.
                </p>
                <p class="text-xs text-orange-600 mt-2">
                  Cancelled on {{ new Date(membershipData. cancelled_at).toLocaleDateString() }}
                </p>
              </div>
            </div>
          </div>

          <!-- ✅ ADD: Option to cancel immediately -->
          <div class="bg-red-50 border border-red-200 rounded-lg p-4">
            <div class="flex items-start space-x-3">
              <XCircleIcon class="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div class="flex-1">
                <p class="text-sm font-medium text-red-900">Want to cancel immediately?</p>
                <p class="text-sm text-red-700 mt-1">
                  If you need to stop access right now, you can cancel immediately.  
                  <strong>You will lose all benefits</strong> and there will be <strong>no refund</strong> for the remaining 
                  {{ Math.ceil((new Date(membershipData.end_date) - new Date()) / (1000 * 60 * 60 * 24)) }} days.
                </p>
                <Button 
                  variant="danger" 
                  size="sm" 
                  class="mt-3"
                  :loading="cancellingImmediately"
                  :disabled="cancellingImmediately"
                  @click="handleCancelImmediately"
                >
                  {{ cancellingImmediately ? 'Cancelling...' : 'Cancel Immediately' }}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <!-- ✅ Show if membership already deactivated -->
        <div v-else-if="membershipData?.cancelled_at && !membershipData?.is_active" class="mt-4 pt-4 border-t bg-gray-50 rounded-lg p-4">
          <div class="flex items-start space-x-3">
            <XCircleIcon class="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
            <div>
              <p class="text-sm font-medium text-gray-900">Membership Cancelled</p>
              <p class="text-sm text-gray-700 mt-1">
                Your membership was cancelled on {{ new Date(membershipData. cancelled_at).toLocaleDateString() }}.
                All benefits have been removed.
              </p>
            </div>
          </div>
        </div>
      </div> 

        <!-- ✅ FIX: Use Heroicon in warning box too -->
        <!-- <div v-else-if="membershipData?.cancelled_at" class="mt-4 pt-4 border-t bg-orange-50 rounded-lg p-4">
          <div class="flex items-start space-x-3">
            <ExclamationCircleIcon class="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div>
              <p class="text-sm font-medium text-orange-900">Auto-Renewal Cancelled</p>
              <p class="text-sm text-orange-700 mt-1">
                Your membership will remain active until {{ new Date(membershipData.end_date).toLocaleDateString() }}.
                It will not renew automatically.
              </p>
            </div>
          </div>
        </div>
      </div> -->

      <!-- Membership Benefits (Current Plan) -->
      <div v-if="currentTier !== 'basic'" class="card">
        <h3 class="text-lg font-semibold mb-4">Your Benefits</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div
            v-for="(feature, index) in currentPlan?.features"
            :key="index"
            class="flex items-center space-x-2"
          >
            <CheckCircleIcon class="w-5 h-5 text-green-600 flex-shrink-0" />
            <span class="text-sm">{{ feature.text }}</span>
          </div>
        </div>
      </div>

      <!-- Membership Plans -->
      <div>
        <h2 class="text-xl font-bold mb-6">Choose Your Plan</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div
            v-for="tier in membershipTiers"
            :key="tier.value"
            :class="[
              'card relative transition-all',
              tier.popular && 'ring-2 ring-primary-600',
              currentTier === tier.value && 'bg-gradient-to-br from-primary-50 to-accent-50'
            ]"
          >
            <!-- Popular Badge -->
            <div v-if="tier.popular" class="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge variant="primary">Most Popular</Badge>
            </div>

            <!-- Current Plan Badge -->
            <div v-if="currentTier === tier.value" class="absolute -top-3 right-4">
              <Badge variant="success">Current Plan</Badge>
            </div>

            <!-- Icon -->
            <div :class="[
              'w-12 h-12 rounded-full flex items-center justify-center mb-4',
              tier.color === 'yellow' ? 'bg-yellow-100' :
              tier.color === 'purple' ? 'bg-purple-100' : 'bg-gray-100'
            ]">
              <component
                :is="tier.icon"
                :class="[
                  'w-6 h-6',
                  tier.color === 'yellow' ? 'text-yellow-600' :
                  tier.color === 'purple' ? 'text-purple-600' : 'text-gray-600'
                ]"
              />
            </div>

            <!-- Plan Name -->
            <h3 class="text-2xl font-bold mb-2">{{ tier.name }}</h3>

            <!-- Price -->
            <div class="mb-6">
              <div class="flex items-baseline">
                <span class="text-4xl font-bold">{{ tier.price === 0 ? 'Free' : formatPrice(tier.price) }}</span>
              </div>
              <p class="text-sm text-gray-600">{{ tier.period }}</p>
            </div>

            <!-- Features -->
            <ul class="space-y-3 mb-6">
              <li
                v-for="(feature, index) in tier.features"
                :key="index"
                class="flex items-start space-x-2"
              >
                <CheckCircleIcon
                  v-if="feature.included"
                  class="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5"
                />
                <XMarkIcon
                  v-else
                  class="w-5 h-5 text-gray-300 flex-shrink-0 mt-0.5"
                />
                <span
                  :class="[
                    'text-sm',
                    feature.included ? 'text-gray-700' : 'text-gray-400'
                  ]"
                >
                  {{ feature.text }}
                </span>
              </li>
            </ul>

            <!-- CTA Button -->
            <Button
              v-if="currentTier === tier.value"
              variant="secondary"
              full-width
              disabled
            >
              Current Plan
            </Button>
            <Button
              v-else-if="canUpgrade(tier.value)"
              variant="primary"
              full-width
              @click="handleUpgrade(tier)"
            >
              Upgrade to {{ tier.name }}
            </Button>
            <Button
              v-else
              variant="ghost"
              full-width
              disabled
            >
              Not Available
            </Button>
          </div>
        </div>
      </div>

      <!-- FAQ -->
      <div class="card">
        <h3 class="text-lg font-semibold mb-4">Frequently Asked Questions</h3>
        <div class="space-y-4">
          <div>
            <h4 class="font-medium mb-1">Can I cancel my membership anytime?</h4>
            <p class="text-sm text-gray-600">
              Yes, you can cancel your membership at any time. You'll continue to have access until the end of your billing period.
            </p>
          </div>
          <div>
            <h4 class="font-medium mb-1">How do discounts work?</h4>
            <p class="text-sm text-gray-600">
              Membership discounts are automatically applied at checkout when you purchase tickets.
            </p>
          </div>
          <div>
            <h4 class="font-medium mb-1">Can I upgrade or downgrade my plan?</h4>
            <p class="text-sm text-gray-600">
              You can upgrade your plan at any time. Changes will take effect immediately and you'll be charged the prorated amount.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Upgrade Confirmation Modal -->
    <Modal
      v-model="showUpgradeModal"
      :title="currentStep === 1 ? 'Upgrade Membership' : 'Processing Payment'"
      size="md"
    >
      <!-- STEP 1: CONFIRM -->
      <div v-if="currentStep === 1" class="space-y-4">
        <div v-if="selectedPlan" class="bg-gray-50 rounded-lg p-4">
          <div class="flex items-center justify-between mb-3">
            <div>
              <h3 class="font-semibold text-lg">{{ selectedPlan.name }}</h3>
              <p class="text-sm text-gray-600 capitalize">{{ selectedPlan.period }}</p>
            </div>
            <p class="text-2xl font-bold text-primary-600">
              {{ formatPrice(selectedPlan.price) }}
            </p>
          </div>

          <div class="space-y-2">
            <p class="text-sm font-medium text-gray-700">Benefits:</p>
            <ul class="space-y-1">
              <li
                v-for="(feature, idx) in selectedPlan.features.filter(f => f.included)"
                :key="idx"
                class="flex items-start text-sm text-gray-600"
              >
                <CheckCircleIcon class="w-4 h-4 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                <span>{{ feature.text }}</span>
              </li>
            </ul>
          </div>
        </div>

        <!-- Payment Method Selection -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Payment Method
          </label>
          <div class="space-y-2">
            <label class="flex items-center p-3 border-2 rounded-lg cursor-pointer"
                   :class="paymentMethod === 'vnpay' ? 'border-primary-600 bg-primary-50' : 'border-gray-200'">
              <input
                type="radio"
                v-model="paymentMethod"
                value="vnpay"
                class="mr-3"
              />
              <div>
                <span class="font-medium">VNPay</span>
                <span class="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">Mock</span>
              </div>
            </label>

            <label class="flex items-center p-3 border-2 rounded-lg cursor-pointer"
                   :class="paymentMethod === 'banking' ? 'border-primary-600 bg-primary-50' : 'border-gray-200'">
              <input
                type="radio"
                v-model="paymentMethod"
                value="banking"
                class="mr-3"
              />
              <div>
                <span class="font-medium">Bank Transfer</span>
                <span class="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">Mock</span>
              </div>
            </label>

             <label class="flex items-center p-3 border-2 rounded-lg cursor-pointer"
                   :class="paymentMethod === 'momo' ? 'border-primary-600 bg-primary-50' : 'border-gray-200'">
              <input
                type="radio"
                v-model="paymentMethod"
                value="momo"
                class="mr-3"
              />
              <div>
                <span class="font-medium">Momo</span>
                <span class="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">Mock</span>
              </div>
            </label>
          </div>
        </div>

        <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p class="text-sm text-blue-800">
            <strong>Note:</strong> This is a simulated payment.  Your membership will be activated immediately after confirmation.
          </p>
        </div>
      </div>

      <!-- STEP 2: PROCESSING PAYMENT -->
      <div v-else-if="currentStep === 2" class="py-8">
        <!-- Processing -->
        <div v-if="processingPayment && ! paymentSuccess" class="text-center">
          <div class="flex justify-center mb-6">
            <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600"></div>
          </div>
          
          <h3 class="text-xl font-bold text-gray-900 mb-2">
            Processing Payment... 
          </h3>
          <p class="text-gray-600 mb-4">
            Please wait {{ paymentCountdown }} seconds
          </p>
          
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-sm mx-auto">
            <p class="text-sm text-blue-800">
              🔒 Your payment is being processed securely
            </p>
          </div>

          <Button
            variant="secondary"
            class="mt-6"
            @click="handleCancelPayment"
          >
            Cancel Payment
          </Button>
        </div>

        <!-- Success -->
        <div v-else-if="paymentSuccess" class="text-center">
          <div class="flex justify-center mb-6">
            <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircleIcon class="w-10 h-10 text-green-600" />
            </div>
          </div>
          
          <h3 class="text-xl font-bold text-gray-900 mb-2">
            Payment Successful!
          </h3>
          <p class="text-gray-600 mb-4">
            Your membership has been activated
          </p>
          
          <div class="bg-green-50 border border-green-200 rounded-lg p-4 max-w-sm mx-auto">
            <p class="text-sm text-green-800 font-medium">
              Order #{{ createdOrder.order_number }}
            </p>
          </div>

          <p class="text-sm text-gray-500 mt-4">
            Redirecting... 
          </p>
        </div>
      </div>

      <template #footer v-if="currentStep === 1">
        <div class="flex space-x-3">
          <Button
            variant="secondary"
            @click="showUpgradeModal = false"
            full-width
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            :loading="upgrading"
            @click="confirmUpgrade"
            full-width
          >
            <CreditCardIcon class="w-5 h-5 mr-2" />
            Confirm & Pay
          </Button>
        </div>
      </template>
    </Modal>
  </div>
</template>