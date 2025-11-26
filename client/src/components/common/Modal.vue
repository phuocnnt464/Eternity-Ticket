<!-- client/src/components/common/Modal.vue -->

<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
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
    default: 'md', // sm, md, lg, xl, full
    validator: (value) => ['sm', 'md', 'lg', 'xl', 'full'].includes(value)
  },
  persistent: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'close'])

const sizeClasses = computed(() => {
  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-7xl'
  }
  return sizes[props.size] || sizes.md
})

const close = () => {
  if (! props.persistent) {
    emit('update:modelValue', false)
    emit('close')
  }
}

// ✅ Prevent body scroll when modal open
onMounted(() => {
  if (props.modelValue) {
    document.body.style.overflow = 'hidden'
  }
})

onUnmounted(() => {
  document.body. style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition ease-out duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition ease-in duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 overflow-y-auto"
        @click. self="close"
      >
        <!-- ✅ Backdrop -->
        <div class="fixed inset-0 bg-black/50 transition-opacity" @click="close" />

        <!-- ✅ Modal Container - Centered with padding -->
        <div class="flex min-h-full items-center justify-center p-4 sm:p-6 lg:p-8">
          <Transition
            enter-active-class="transition ease-out duration-300"
            enter-from-class="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            enter-to-class="opacity-100 translate-y-0 sm:scale-100"
            leave-active-class="transition ease-in duration-200"
            leave-from-class="opacity-100 translate-y-0 sm:scale-100"
            leave-to-class="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          >
            <div
              v-if="modelValue"
              :class="[
                'relative w-full bg-white rounded-lg shadow-xl',
                'flex flex-col',
                'max-h-[90vh]', // ✅ Max height 90% of viewport
                sizeClasses
              ]"
              @click.stop
            >
              <!-- ✅ Header - Fixed at top -->
              <div class="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200 flex-shrink-0">
                <h3 class="text-lg sm:text-xl font-semibold text-gray-900 pr-8">
                  {{ title }}
                </h3>
                <button
                  v-if="! persistent"
                  @click="close"
                  class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition p-1 rounded-full hover:bg-gray-100"
                >
                  <XMarkIcon class="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>

              <!-- ✅ Content - Scrollable -->
              <div class="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6">
                <slot />
              </div>

              <!-- ✅ Footer - Fixed at bottom -->
              <div
                v-if="$slots.footer"
                class="flex-shrink-0 px-4 sm:px-6 py-4 border-t border-gray-200 bg-gray-50"
              >
                <slot name="footer" />
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ✅ Ensure scrollbar styling */
.overflow-y-auto::-webkit-scrollbar {
  width: 8px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 4px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #555;
}
</style>