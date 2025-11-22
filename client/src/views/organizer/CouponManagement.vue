<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { eventsAPI } from '@/api/events.js'
import { couponAPI } from '@/api/coupon.js'
import Card from '@/components/common/Card.vue'
import Button from '@/components/common/Button.vue'
import Input from '@/components/common/Input.vue'
import Badge from '@/components/common/Badge.vue'
import Modal from '@/components/common/Modal.vue'
import Spinner from '@/components/common/Spinner.vue'
import {
  ArrowLeftIcon,
  PlusIcon,
  TrashIcon,
  TagIcon,
  CalendarIcon
} from '@heroicons/vue/24/outline'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const eventId = ref(route.params.id)
const event = ref(null)
const coupons = ref([])
const showCreateModal = ref(false)
const saving = ref(false)

const couponForm = ref({
  code: '',
  title: '',
  type: 'percentage',
  discount_value: 0,
  usage_limit: null,
  valid_from: '',
  valid_until: '',
  description: ''
})

const errors = ref({})

const discountTypes = [
  { value: 'percentage', label: 'Percentage (%)', symbol: '%' },
  { value: 'fixed_amount', label: 'Fixed Amount (VND)', symbol: 'VND' }
]

const getStatusBadge = (coupon) => {
  const now = new Date()
  const validFrom = new Date(coupon.valid_from)
  const validUntil = new Date(coupon.valid_until)
  
  if (now < validFrom) {
    return { variant: 'warning', text: 'Scheduled' }
  }
  
  if (now > validUntil) {
    return { variant: 'danger', text: 'Expired' }
  }
  
  if (coupon.usage_limit && coupon.times_used >= coupon.usage_limit) {
    return { variant: 'danger', text: 'Limit Reached' }
  }
  
  return { variant: 'success', text: 'Active' }
}

const fetchCoupons = async () => {
  loading.value = true
  try {
    const [eventRes, couponsRes] = await Promise.all([
      eventsAPI.getEventById(eventId.value),
      couponAPI.getEventCoupons(eventId.value)
    ])
    
    event.value = eventRes.data.event
    coupons.value = couponsRes.data.coupons || []
  } catch (error) {
    console.error('Failed to fetch coupons:', error)
  } finally {
    loading.value = false
  }
}

const validateForm = () => {
  errors.value = {}
  
  if (!couponForm.value.code) {
    errors.value.code = 'Coupon code is required'
  } else if (couponForm.value.code.length < 3) {
    errors.value.code = 'Code must be at least 3 characters'
  }

  if (!couponForm.value.title) {
    errors.value.title = 'Title is required'
  } else if (couponForm.value.title.length > 200) {
    errors.value.title = 'Title cannot exceed 200 characters'
  }
  
  if (!couponForm.value.discount_value || couponForm.value.discount_value <= 0) {
    errors.value.discount_value = 'Discount value must be greater than 0'
  }
  
  if (couponForm.value.type === 'percentage' && couponForm.value.discount_value > 100) {
    errors.value.discount_value = 'Percentage cannot exceed 100%'
  }
  
  if (!couponForm.value.valid_from) {
    errors.value.valid_from = 'Start date is required'
  }
  
  if (!couponForm.value.valid_until) {
    errors.value.valid_until = 'End date is required'
  }
  
  if (new Date(couponForm.value.valid_until) <= new Date(couponForm.value.valid_from)) {
    errors.value.valid_until = 'End date must be after start date'
  }
  
  return Object.keys(errors.value).length === 0
}

const handleCreate = async () => {
  if (!validateForm()) return
  
  saving.value = true
  try {
    const data = {
      event_id: eventId.value, 
      code: couponForm.value.code.toUpperCase(),
      title: couponForm.value.title,    
      type: couponForm.value.type,
      discount_value: parseFloat(couponForm.value.discount_value),
      usage_limit: couponForm.value.usage_limit ? parseInt(couponForm.value.usage_limit) : null,
      valid_from: couponForm.value.valid_from,
      valid_until: couponForm.value.valid_until,
      description: couponForm.value.description
    }

    // await eventsAPI.createCoupon(eventId.value, couponForm.value)
    await couponAPI.createCoupon(data)  

    alert('Coupon created successfully!')
    showCreateModal.value = false
    couponForm.value = {
      code: '',
      title: '',
      type: 'percentage',
      discount_value: 0,
      usage_limit: null,
      valid_from: '',
      valid_until: '',
      description: ''
    }
    await fetchCoupons()
  } catch (error) {
    errors.value.general = error.response?.data?.error?.message || 'Failed to create coupon'
  } finally {
    saving.value = false
  }
}

const handleDelete = async (couponId, code) => {
  if (!confirm(`Delete coupon "${code}"?`)) return
  
  try {
    // await eventsAPI.deleteCoupon(eventId.value, couponId)
    await couponAPI.deleteCoupon(couponId)
    alert('Coupon deleted')
    await fetchCoupons()
  } catch (error) {
    alert(error.response?.data?.error?.message || 'Failed to delete coupon')
  }
}

const generateCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  couponForm.value.code = code
}

const formatDiscount = (coupon) => {
  if (coupon.discount_type === 'percentage') {
    return `${coupon.discount_value}%`
  }
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(coupon.discount_value)
}

onMounted(() => {
  fetchCoupons()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <button
          @click="router.push('/organizer/events')"
          class="flex items-center text-gray-600 hover:text-gray-900 mb-2"
        >
          <ArrowLeftIcon class="w-5 h-5 mr-2" />
          Back to Events
        </button>
        <h1 class="text-2xl font-bold text-gray-900">Coupon Management</h1>
        <p v-if="event" class="text-gray-600 mt-1">{{ event.title }}</p>
      </div>
      <Button variant="primary" @click="showCreateModal = true">
        <PlusIcon class="w-5 h-5" />
        Create Coupon
      </Button>
    </div>

    <!-- Info Card -->
    <Card class="bg-blue-50 border-blue-200">
      <div class="flex items-start space-x-3">
        <TagIcon class="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
        <div>
          <h3 class="font-semibold text-blue-900 mb-1">Discount Coupons</h3>
          <p class="text-sm text-blue-800">
            Create discount codes to encourage ticket purchases. Coupons can be percentage-based or fixed amounts.
          </p>
        </div>
      </div>
    </Card>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <Spinner size="xl" />
    </div>

    <!-- Coupons Grid -->
    <div v-else-if="coupons.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card
        v-for="coupon in coupons"
        :key="coupon.coupon_id"
        hover
      >
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center space-x-2">
            <TagIcon class="w-5 h-5 text-primary-600" />
            <h3 class="font-bold text-lg font-mono">{{ coupon.code }}</h3>
          </div>
          <Badge :variant="getStatusBadge(coupon).variant">
            {{ getStatusBadge(coupon).text }}
          </Badge>
        </div>

        <p v-if="coupon.description" class="text-sm text-gray-600 mb-3">
          {{ coupon.description }}
        </p>

        <div class="space-y-2 mb-4">
          <div class="flex items-center justify-between text-sm">
            <span class="text-gray-600">Discount:</span>
            <span class="font-semibold text-primary-600">{{ formatDiscount(coupon) }}</span>
          </div>

          <div class="flex items-center justify-between text-sm">
            <span class="text-gray-600">Usage:</span>
            <span class="font-medium">
              {{ coupon.times_used || 0 }}
              <span v-if="coupon.usage_limit">/ {{ coupon.usage_limit }}</span>
              <span v-else>/ Unlimited</span>
            </span>
          </div>

          <div class="text-xs text-gray-600 space-y-1">
            <div class="flex items-center space-x-1">
              <CalendarIcon class="w-3 h-3" />
              <span>From: {{ new Date(coupon.valid_from).toLocaleDateString() }}</span>
            </div>
            <div class="flex items-center space-x-1">
              <CalendarIcon class="w-3 h-3" />
              <span>Until: {{ new Date(coupon.valid_until).toLocaleDateString() }}</span>
            </div>
          </div>
        </div>

        <Button
          variant="danger"
          size="sm"
          @click="handleDelete(coupon.coupon_id, coupon.code)"
          full-width
        >
          <TrashIcon class="w-4 h-4" />
          Delete
        </Button>
      </Card>
    </div>

    <!-- Empty State -->
    <Card v-else class="text-center py-12">
      <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <TagIcon class="w-10 h-10 text-gray-400" />
      </div>
      <h3 class="text-xl font-semibold text-gray-900 mb-2">No coupons created</h3>
      <p class="text-gray-600 mb-6">
        Create discount coupons to promote your event
      </p>
      <Button variant="primary" @click="showCreateModal = true">
        <PlusIcon class="w-5 h-5" />
        Create Your First Coupon
      </Button>
    </Card>

    <!-- Create Coupon Modal -->
    <Modal
      v-model="showCreateModal"
      title="Create Discount Coupon"
      size="lg"
    >
      <div v-if="errors.general" class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4 text-sm">
        {{ errors.general }}
      </div>

      <form @submit.prevent="handleCreate" class="space-y-4">
        <div>
          <label class="label label-required">Coupon Code</label>
          <div class="flex space-x-2">
            <Input
              v-model="couponForm.code"
              placeholder="e.g. SUMMER2024"
              :error="errors.code"
              class="flex-1 uppercase"
            />
            <Button
              type="button"
              variant="secondary"
              @click="generateCode"
            >
              Generate
            </Button>
          </div>
          <p class="text-xs text-gray-500 mt-1">
            Use uppercase letters and numbers only
          </p>
        </div>

        <Input
          v-model="couponForm.title"
          label="Title"
          placeholder="e.g. Summer Sale 2024"
          :error="errors.title"
          help-text="Display name for this coupon"
          required
        />

        <div>
          <label class="label">Description (Optional)</label>
          <textarea
            v-model="couponForm.description"
            rows="2"
            placeholder="e.g. Summer sale discount"
            class="textarea"
          ></textarea>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="label label-required">Discount Type</label>
            <select v-model="couponForm.type" class="select">
              <option
                v-for="type in discountTypes"
                :key="type.value"
                :value="type.value"
              >
                {{ type.label }}
              </option>
            </select>
          </div>

          <Input
            v-model.number="couponForm.discount_value"
            type="number"
            label="Discount Value"
            :placeholder="couponForm.type === 'percentage' ? 'e.g. 10' : 'e.g. 50000'"
            :error="errors.discount_value"
            required
          />
        </div>

        <Input
          v-model.number="couponForm.usage_limit"
          type="number"
          label="Max Uses (Optional)"
          placeholder="Leave empty for unlimited"
          help-text="How many times this coupon can be used"
        />

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            v-model="couponForm.valid_from"
            type="datetime-local"
            label="Valid From"
            :error="errors.valid_from"
            :icon="CalendarIcon"
            required
          />

          <Input
            v-model="couponForm.valid_until"
            type="datetime-local"
            label="Valid Until"
            :error="errors.valid_until"
            :icon="CalendarIcon"
            required
          />
        </div>
      </form>

      <template #footer>
        <div class="flex space-x-3">
          <Button
            variant="secondary"
            @click="showCreateModal = false"
            full-width
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            :loading="saving"
            @click="handleCreate"
            full-width
          >
            Create Coupon
          </Button>
        </div>
      </template>
    </Modal>
  </div>
</template>