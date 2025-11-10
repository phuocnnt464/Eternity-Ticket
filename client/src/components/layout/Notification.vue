<script setup>
import { ref, watch } from 'vue'
import { useNotificationStore } from '@/stores/notification'
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
  XMarkIcon
} from '@heroicons/vue/24/outline'

const notificationStore = useNotificationStore()
const notifications = ref([])

// Watch for new notifications
watch(
  () => notificationStore.toasts,
  (newToasts) => {
    notifications.value = newToasts
  },
  { deep: true }
)

const getIcon = (type) => {
  const icons = {
    success: CheckCircleIcon,
    warning: ExclamationTriangleIcon,
    error: XCircleIcon,
    info: InformationCircleIcon
  }
  return icons[type] || InformationCircleIcon
}

const getColorClasses = (type) => {
  const colors = {
    success: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800'
  }
  return colors[type] || colors.info
}

const getIconColor = (type) => {
  const colors = {
    success: 'text-green-400',
    warning: 'text-yellow-400',
    error: 'text-red-400',
    info: 'text-blue-400'
  }
  return colors[type] || colors.info
}

const removeNotification = (id) => {
  notificationStore.removeToast(id)
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed top-4 right-4 z-[100] space-y-2 w-full max-w-sm pointer-events-none">
      <TransitionGroup name="notification">
        <div
          v-for="notification in notifications"
          :key="notification.id"
          :class="[
            'rounded-lg border p-4 shadow-lg pointer-events-auto',
            getColorClasses(notification.type)
          ]"
        >
          <div class="flex">
            <div class="flex-shrink-0">
              <component 
                :is="getIcon(notification.type)" 
                :class="['w-5 h-5', getIconColor(notification.type)]" 
              />
            </div>
            <div class="ml-3 flex-1">
              <h3 v-if="notification.title" class="text-sm font-medium">
                {{ notification.title }}
              </h3>
              <div class="text-sm mt-1">
                {{ notification.message }}
              </div>
            </div>
            <div class="ml-4 flex-shrink-0">
              <button
                @click="removeNotification(notification.id)"
                class="inline-flex rounded-md hover:bg-opacity-20 p-1.5"
              >
                <XMarkIcon class="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s ease;
}

.notification-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.notification-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}
</style>