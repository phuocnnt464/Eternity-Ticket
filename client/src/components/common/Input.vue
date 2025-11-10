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
  }
})

const emit = defineEmits(['update:modelValue'])

const showPassword = ref(false)

const inputType = computed(() => {
  if (props.type === 'password') {
    return showPassword.value ? 'text' : 'password'
  }
  return props.type
})

const inputClass = computed(() => {
  const classes = [props.type === 'textarea' ? 'textarea' : 'input']
  
  if (props.error) {
    classes.push('input-error')
  }
  
  if (props.type === 'password') {
    classes.push('pr-10')
  }
  
  return classes.join(' ')
})

const handleInput = (event) => {
  emit('update:modelValue', event.target.value)
}
</script>

<template>
  <div class="w-full">
    <label v-if="label" :class="['label', { 'label-required': required }]">
      {{ label }}
    </label>

    <div class="relative">
      <!-- Textarea -->
      <textarea
        v-if="type === 'textarea'"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :maxlength="maxlength"
        :class="inputClass"
        @input="handleInput"
      ></textarea>

      <!-- Input -->
      <input
        v-else
        :type="inputType"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :maxlength="maxlength"
        :class="inputClass"
        @input="handleInput"
      />

      <!-- Password Toggle -->
      <button
        v-if="type === 'password'"
        type="button"
        @click="showPassword = !showPassword"
        class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
      >
        <EyeIcon v-if="!showPassword" class="w-5 h-5" />
        <EyeSlashIcon v-else class="w-5 h-5" />
      </button>

      <!-- Error Icon -->
      <ExclamationCircleIcon
        v-if="error"
        class="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500"
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