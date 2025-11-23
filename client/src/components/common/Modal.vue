<script setup>
import { watch } from 'vue'
import { XMarkIcon } from '@heroicons/vue/24/outline'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: ''
  },
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['sm', 'md', 'lg', 'xl', 'full'].includes(value)
  },
  closeOnOverlay: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update:modelValue', 'close'])

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-full mx-4'
}

const close = () => {
  emit('update:modelValue', false)
  emit('close')
}

const handleOverlayClick = () => {
  if (props.closeOnOverlay) {
    close()
  }
}

watch(() => props.modelValue, (isOpen) => {
  document.body.style.overflow = isOpen ? 'hidden' : ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" 
        @click="handleOverlayClick"
      >
        <Transition name="slide">
          <div
            v-if="modelValue"
            :class="['bg-white rounded-xl shadow-xl w-full', sizeClasses[size]]"
            @click.stop
          >
            <div v-if="title || $slots.header" class="flex items-center justify-between p-6 border-b">
              <div v-if="$slots.header" class="flex-1">
                <slot name="header" />
              </div>
              <h3 v-else class="text-lg font-semibold text-gray-900">
                {{ title }}
              </h3>
              <button
                @click="close"
                class="text-gray-400 hover:text-gray-600 ml-4"
              >
                <XMarkIcon class="w-6 h-6" />
              </button>
            </div>

            <div class="p-6">
              <slot />
            </div>

            <div v-if="$slots.footer" class="flex items-center justify-end space-x-3 p-6 border-t bg-gray-50 rounded-b-xl">
              <slot name="footer" />
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>