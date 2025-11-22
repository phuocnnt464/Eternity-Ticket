<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { membershipAPI } from '@/api/membership.js'
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
  BoltIcon
} from '@heroicons/vue/24/outline'

const authStore = useAuthStore()

const loading = ref(true)
const membershipData = ref(null)
const showUpgradeModal = ref(false)
const selectedPlan = ref(null)
const upgrading = ref(false)

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
    name: 'Premium',
    value: 'premium',
    price: 99000,
    period: 'per month',
    color: 'yellow',
    icon: BoltIcon,
    popular: true,
    features: [
      { text: 'All Basic features', included: true },
      { text: 'Priority support', included: true },
      { text: '10% discount on all tickets', included: true },
      { text: 'Early access to tickets', included: true },
      { text: 'Exclusive member events', included: true },
      { text: 'VIP lounge access', included: false }
    ]
  },
  {
    name: 'Advanced',
    value: 'advanced',
    price: 299000,
    period: 'per month',
    color: 'purple',
    icon: SparklesIcon,
    features: [
      { text: 'All Premium features', included: true },
      { text: 'Dedicated account manager', included: true },
      { text: '20% discount on all tickets', included: true },
      { text: 'VIP lounge access', included: true },
      { text: 'Meet & greet opportunities', included: true },
      { text: 'Exclusive merchandise', included: true }
    ]
  }
]

const currentTier = computed(() => {
  return authStore.user?.membership_tier || 'basic'
})

const currentPlan = computed(() => {
  return membershipTiers.find(t => t.value === currentTier.value)
})

const canUpgrade = (tierValue) => {
  const tierOrder = ['basic', 'premium', 'vip']
  const currentIndex = tierOrder.indexOf(currentTier.value)
  const targetIndex = tierOrder.indexOf(tierValue)
  return targetIndex > currentIndex
}

const fetchMembershipData = async () => {
  loading.value = true
  try {
    const response = await membershipAPI.getMembershipStatus()
    membershipData.value = response.data.data
  } catch (error) {
    console.error('Failed to fetch membership data:', error)
  } finally {
    loading.value = false
  }
}

const handleUpgrade = (tier) => {
  if (!canUpgrade(tier.value)) return
  
  selectedPlan.value = tier
  showUpgradeModal.value = true
}

const confirmUpgrade = async () => {
  if (!selectedPlan.value) return
  
  upgrading.value = true
  try {
    const response = await membershipAPI.upgrade({
      tier: selectedPlan.value.value
    })
    
    // Redirect to payment
    window.location.href = response.data.data.payment_url
  } catch (error) {
    alert(error.response?.data?.error?.message || 'Failed to upgrade membership')
    upgrading.value = false
  }
}

const handleCancelMembership = async () => {
  if (!confirm('Are you sure you want to cancel your membership? You will lose all premium benefits.')) {
    return
  }
  
  try {
    await membershipAPI.cancel()
    await authStore.loadUser()
    await fetchMembershipData()
    alert('Membership cancelled successfully')
  } catch (error) {
    alert(error.response?.data?.error?.message || 'Failed to cancel membership')
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
              <h2 class="text-2xl font-bold text-gray-900">{{ currentPlan?.name }}</h2>
              <Badge
                :variant="currentTier === 'vip' ? 'success' : currentTier === 'premium' ? 'warning' : 'info'"
                size="lg"
              >
                {{ currentPlan?.name }}
              </Badge>
            </div>
            
            <div v-if="membershipData?.expires_at" class="mt-3 flex items-center space-x-2 text-sm text-gray-600">
              <CalendarIcon class="w-4 h-4" />
              <span>Expires: {{ new Date(membershipData.expires_at).toLocaleDateString() }}</span>
            </div>
          </div>

          <div v-if="currentTier !== 'basic'" class="text-right">
            <p class="text-sm text-gray-600 mb-2">Monthly Payment</p>
            <p class="text-2xl font-bold text-primary-600">{{ formatPrice(currentPlan?.price) }}</p>
          </div>
        </div>

        <div v-if="currentTier !== 'basic'" class="mt-4 pt-4 border-t border-primary-100">
          <Button variant="danger" size="sm" @click="handleCancelMembership">
            Cancel Membership
          </Button>
        </div>
      </div>

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
      title="Confirm Upgrade"
      size="md"
    >
      <div v-if="selectedPlan">
        <p class="mb-4">You are about to upgrade to:</p>
        
        <div class="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-4">
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-xl font-bold">{{ selectedPlan.name }}</h3>
            <Badge variant="primary">{{ selectedPlan.name }}</Badge>
          </div>
          <p class="text-2xl font-bold text-primary-600">
            {{ formatPrice(selectedPlan.price) }}
            <span class="text-sm font-normal text-gray-600">/ {{ selectedPlan.period }}</span>
          </p>
        </div>

        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p class="text-sm text-blue-800">
            <strong>Note:</strong> You will be redirected to the payment page. 
            Your membership benefits will be activated immediately after successful payment.
          </p>
        </div>
      </div>

      <template #footer>
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
            <CreditCardIcon class="w-5 h-5" />
            Proceed to Payment
          </Button>
        </div>
      </template>
    </Modal>
  </div>
</template>