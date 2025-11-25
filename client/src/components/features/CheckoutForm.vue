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
  first_name: props.modelValue.first_name || '',
  last_name: props.modelValue.last_name || '',
  email: props.modelValue.email || '',
  phone: props.modelValue.phone || '',
  coupon_code: props.modelValue.coupon_code || ''
})

const errors = ref({})
const couponApplied = ref(false)
const couponValidating = ref(false)

const validateForm = () => {
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
  }
  
  return Object.keys(errors.value).length === 0
}

const validateCoupon = async () => {
  if (!form.value.coupon_code) {
    errors.value.coupon_code = 'Please enter a coupon code'
    return
  }
  
  couponValidating.value = true
  errors.value.coupon_code = ''
  
  try {
    await emit('validate-coupon', form.value.coupon_code)
    couponApplied.value = true
  } catch (error) {
    errors.value.coupon_code = error.message
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
      <!-- First Name & Last Name -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          v-model="form.first_name"
          label="First Name"
          placeholder="John"
          :error="errors.first_name"
          required
          @blur="updateValue"
        />
        
        <Input
          v-model="form.last_name"
          label="Last Name"
          placeholder="Doe"
          :error="errors.last_name"
          required
          @blur="updateValue"
        />
      </div>

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
        placeholder="+84 xxx xxx xxx"
        :error="errors.phone"
        required
        @blur="updateValue"
      />

      <!-- Coupon Code -->
      <div v-if="allowCoupon">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Discount Coupon (Optional)
        </label>
        
        <div class="flex gap-2">
          <div class="flex-1">
            <Input
              v-model="form.coupon_code"
              placeholder="Enter coupon code"
              :error="errors.coupon_code"
              :disabled="couponApplied"
            >
              <template #prefix>
                <TagIcon class="w-5 h-5 text-gray-400" />
              </template>
            </Input>
          </div>
          
          <Button
            v-if="!couponApplied"
            type="button"
            variant="secondary"
            :loading="couponValidating"
            @click="validateCoupon"
          >
            Apply
          </Button>
          
          <Button
            v-else
            type="button"
            variant="danger"
            @click="removeCoupon"
          >
            <XMarkIcon class="w-5 h-5" />
          </Button>
        </div>
        
        <p v-if="couponApplied" class="text-sm text-green-600 mt-1">
          ✓ Coupon applied successfully
        </p>
      </div>

      <!-- Actions Slot -->
      <slot name="actions" :submit="handleSubmit" :loading="loading" />
    </form>
  </div>
</template>