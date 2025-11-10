<script setup>
import { ref, computed } from 'vue'
import { TagIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import Input from '@/components/common/Input.vue'
import Button from '@/components/common/Button.vue'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({})
  },
  loading: {
    type: Boolean,
    default: false
  },
  allowCoupon: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update:modelValue', 'validate-coupon', 'submit'])

const form = ref({
  full_name: props.modelValue.full_name || '',
  email: props.modelValue.email || '',
  phone: props.modelValue.phone || '',
  coupon_code: props.modelValue.coupon_code || ''
})

const errors = ref({})
const couponApplied = ref(false)
const couponValidating = ref(false)

const validateForm = () => {
  errors.value = {}
  
  if (!form.value.full_name) {
    errors.value.full_name = 'Full name is required'
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
  
  return Object.keys(errors.value).length === 0
}

const validateCoupon = async () => {
  if (!form.value.coupon_code.trim()) return
  
  couponValidating.value = true
  try {
    await emit('validate-coupon', form.value.coupon_code)
    couponApplied.value = true
  } catch (error) {
    errors.value.coupon_code = error.message || 'Invalid coupon code'
    couponApplied.value = false
  } finally {
    couponValidating.value = false
  }
}

const removeCoupon = () => {
  form.value.coupon_code = ''
  couponApplied.value = false
  errors.value.coupon_code = ''
  emit('update:modelValue', form.value)
}

const handleSubmit = () => {
  if (validateForm()) {
    emit('update:modelValue', form.value)
    emit('submit', form.value)
  }
}

const updateValue = () => {
  emit('update:modelValue', form.value)
}
</script>

<template>
  <div class="card">
    <h3 class="text-lg font-semibold mb-4">Customer Information</h3>

    <form @submit.prevent="handleSubmit" class="space-y-4">
      <!-- Full Name -->
      <Input
        v-model="form.full_name"
        label="Full Name"
        placeholder="Enter your full name"
        :error="errors.full_name"
        required
        @blur="updateValue"
      />

      <!-- Email -->
      <Input
        v-model="form.email"
        type="email"
        label="Email"
        placeholder="your.email@example.com"
        :error="errors.email"
        help-text="Tickets will be sent to this email"
        required
        @blur="updateValue"
      />

      <!-- Phone -->
      <Input
        v-model="form.phone"
        type="tel"
        label="Phone Number"
        placeholder="0123456789"
        :error="errors.phone"
        required
        @blur="updateValue"
      />

      <!-- Coupon Code -->
      <div v-if="allowCoupon">
        <label class="label">Coupon Code (Optional)</label>
        
        <div v-if="!couponApplied" class="flex space-x-2">
          <div class="flex-1">
            <Input
              v-model="form.coupon_code"
              placeholder="Enter coupon code"
              :error="errors.coupon_code"
              @blur="updateValue"
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            :loading="couponValidating"
            :disabled="!form.coupon_code.trim()"
            @click="validateCoupon"
          >
            Apply
          </Button>
        </div>

        <div v-else class="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3">
          <div class="flex items-center space-x-2 text-green-800">
            <TagIcon class="w-5 h-5" />
            <span class="font-medium">{{ form.coupon_code }}</span>
            <span class="text-sm">applied</span>
          </div>
          <button
            type="button"
            @click="removeCoupon"
            class="text-green-600 hover:text-green-800"
          >
            <XMarkIcon class="w-5 h-5" />
          </button>
        </div>
      </div>

      <!-- Submit -->
      <slot name="actions" :submit="handleSubmit" :loading="loading">
        <Button
          type="submit"
          variant="primary"
          :loading="loading"
          full-width
          size="lg"
        >
          Proceed to Payment
        </Button>
      </slot>
    </form>
  </div>
</template>