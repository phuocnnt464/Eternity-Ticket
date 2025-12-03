<script setup>
import { computed, ref } from 'vue'
import { EyeIcon, EyeSlashIcon, ExclamationCircleIcon } from '@heroicons/vue/24/outline'

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: ''
  },
  type: {
    type: String,
    default: 'text'
  },
  label: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: ''
  },
  error: {
    type: String,
    default: ''
  },
  helpText: {
    type: String,
    default: ''
  },
  required: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  maxlength: {
    type: Number,
    default: null
  },
  icon: {
    type: [Object, Function],
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'blur'])

const showPassword = ref(false)

const inputType = computed(() => {
  if (props.type === 'password') {
    return showPassword.value ? 'text' : 'password'
  }
  return props.type
})

const hasNativeIcon = computed(() => {
  return ['datetime-local', 'date', 'time'].includes(props.type)
})

const inputClass = computed(() => {
  const classes = [props.type === 'textarea' ? 'textarea' : 'input']
  
  if (props.error) {
    classes.push('input-error')
  }
  
  if (props.type === 'password') {
    classes.push('pr-10')
  }

  if (props.icon) {
    classes.push('pl-10')
  }

  if (props.loading) {
    classes.push('pr-10')
  }

  if (hasNativeIcon.value && props.error && !props.loading) {
    classes.push('pr-5') 
  }
  
  return classes.join(' ')
})

const handleInput = (event) => {
  emit('update:modelValue', event.target.value)
}

const handleBlur = (event) => {
  emit('blur', event)
}
</script>

<template>
  <div class="w-full">
    <label v-if="label" :class="['label', { 'label-required': required }]">
      {{ label }}
    </label>

    <div class="relative">
      <!-- Icon (nếu có) -->
      <component
        v-if="icon"
        :is="icon"
        class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
      />

      <!-- Textarea -->
      <textarea
        v-if="type === 'textarea'"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled || loading"
        :maxlength="maxlength"
        :class="inputClass"
        @input="handleInput"
        @blur="handleBlur"
      ></textarea>

      <!-- Input -->
      <input
        v-else
        :type="inputType"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled || loading"
        :maxlength="maxlength"
        :class="inputClass"
        @input="handleInput"
        @blur="handleBlur"
      />

      <!-- Loading Spinner -->
      <div v-if="loading" class="absolute right-3 top-1/2 -translate-y-1/2">
        <svg class="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>

      <!-- Password Toggle -->
      <button
        v-if="type === 'password' && !loading"
        type="button"
        @click="showPassword = !showPassword"
        class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
      >
        <EyeIcon v-if="!showPassword" class="w-5 h-5" />
        <EyeSlashIcon v-else class="w-5 h-5" />
      </button>

      <!-- Error Icon -->
      <ExclamationCircleIcon
        v-if="error && !loading"
        :class="[
          'absolute top-1/2 -translate-y-1/2 w-5 h-5 text-red-500 z-10',
          hasNativeIcon ?  'right-10' : 'right-3'
        ]"
      />
    </div>

    <div v-if="maxlength" class="text-xs text-gray-500 text-right mt-1">
      {{ modelValue?.length || 0 }} / {{ maxlength }}
    </div>

    <p v-if="error" class="error-text">
      {{ error }}
    </p>

    <p v-else-if="helpText" class="helper-text">
      {{ helpText }}
    </p>
  </div>
</template>