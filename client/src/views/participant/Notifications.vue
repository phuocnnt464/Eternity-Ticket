<script setup>
import { ref, computed, onMounted } from 'vue'
import { useNotificationStore } from '@/stores/notification'
import Badge from '@/components/common/Badge.vue'
import Button from '@/components/common/Button.vue'
import Pagination from '@/components/common/Pagination.vue'
import Spinner from '@/components/common/Spinner.vue'
import {
  BellIcon,
  CheckIcon,
  TrashIcon,
  FunnelIcon,
  EnvelopeOpenIcon
} from '@heroicons/vue/24/outline'

const notificationStore = useNotificationStore()

const loading = ref(true)
const selectedFilter = ref('all')
const selectedIds = ref([])

const pagination = ref({
  currentPage: 1,
  totalPages: 1,
  perPage: 15
})

const filterOptions = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'read', label: 'Read' }
]

const notificationTypes = {
  order: { color: 'blue', label: 'Order' },
  ticket: { color: 'green', label: 'Ticket' },
  event: { color: 'purple', label: 'Event' },
  system: { color: 'gray', label: 'System' },
  promotion: { color: 'yellow', label: 'Promotion' }
}

const filteredNotifications = computed(() => {
  let result = notificationStore.notifications

  if (selectedFilter.value === 'unread') {
    result = result.filter(n => !n.is_read)
  } else if (selectedFilter.value === 'read') {
    result = result.filter(n => n.is_read)
  }

  return result
})

const paginatedNotifications = computed(() => {
  const start = (pagination.value.currentPage - 1) * pagination.value.perPage
  const end = start + pagination.value.perPage
  return filteredNotifications.value.slice(start, end)
})

const allSelected = computed({
  get: () => {
    return paginatedNotifications.value.length > 0 &&
           selectedIds.value.length === paginatedNotifications.value.length
  },
  set: (value) => {
    if (value) {
      selectedIds.value = paginatedNotifications.value.map(n => n.notification_id)
    } else {
      selectedIds.value = []
    }
  }
})

const hasSelection = computed(() => selectedIds.value.length > 0)

const fetchNotifications = async () => {
  loading.value = true
  try {
    await notificationStore.fetchNotifications()
    
    pagination.value.totalPages = Math.ceil(
      filteredNotifications.value.length / pagination.value.perPage
    )
  } catch (error) {
    console.error('Failed to fetch notifications:', error)
  } finally {
    loading.value = false
  }
}

const handleMarkAsRead = async (notificationId) => {
  try {
    await notificationStore.markAsRead(notificationId)
  } catch (error) {
    console.error('Failed to mark as read:', error)
  }
}

const handleMarkSelectedAsRead = async () => {
  if (!hasSelection.value) return
  
  try {
    await Promise.all(
      selectedIds.value.map(id => notificationStore.markAsRead(id))
    )
    selectedIds.value = []
  } catch (error) {
    console.error('Failed to mark notifications as read:', error)
  }
}

const handleMarkAllAsRead = async () => {
  try {
    await notificationStore.markAllAsRead()
    selectedIds.value = []
  } catch (error) {
    console.error('Failed to mark all as read:', error)
  }
}

const handleDelete = async (notificationId) => {
  if (!confirm('Are you sure you want to delete this notification?')) return
  
  try {
    await notificationStore.deleteNotification(notificationId)
    selectedIds.value = selectedIds.value.filter(id => id !== notificationId)
  } catch (error) {
    console.error('Failed to delete notification:', error)
  }
}

const handleDeleteSelected = async () => {
  if (!hasSelection.value) return
  if (!confirm(`Delete ${selectedIds.value.length} notification(s)?`)) return
  
  try {
    await Promise.all(
      selectedIds.value.map(id => notificationStore.deleteNotification(id))
    )
    selectedIds.value = []
  } catch (error) {
    console.error('Failed to delete notifications:', error)
  }
}

const toggleSelection = (notificationId) => {
  const index = selectedIds.value.indexOf(notificationId)
  if (index > -1) {
    selectedIds.value.splice(index, 1)
  } else {
    selectedIds.value.push(notificationId)
  }
}

const formatTimeAgo = (date) => {
  const now = new Date()
  const then = new Date(date)
  const seconds = Math.floor((now - then) / 1000)
  
  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return then.toLocaleDateString()
}

const handlePageChange = (page) => {
  pagination.value.currentPage = page
  selectedIds.value = []
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => {
  fetchNotifications()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Notifications</h1>
        <p class="text-gray-600 mt-1">
          Stay updated with your events and orders
          <Badge v-if="notificationStore.unreadCount > 0" variant="danger" class="ml-2">
            {{ notificationStore.unreadCount }} unread
          </Badge>
        </p>
      </div>

      <Button
        v-if="notificationStore.unreadCount > 0"
        variant="secondary"
        @click="handleMarkAllAsRead"
      >
        <CheckIcon class="w-4 h-4" />
        Mark All as Read
      </Button>
    </div>

    <!-- Filters & Actions -->
    <div class="card">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0">
        <!-- Filters -->
        <div class="flex items-center space-x-2">
          <FunnelIcon class="w-5 h-5 text-gray-400" />
          <div class="flex space-x-2">
            <button
              v-for="option in filterOptions"
              :key="option.value"
              @click="selectedFilter = option.value; pagination.currentPage = 1"
              :class="[
                'px-4 py-2 rounded-lg font-medium transition-colors',
                selectedFilter === option.value
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              ]"
            >
              {{ option.label }}
            </button>
          </div>
        </div>

        <!-- Bulk Actions -->
        <div v-if="hasSelection" class="flex items-center space-x-2">
          <span class="text-sm text-gray-600">{{ selectedIds.length }} selected</span>
          <Button
            variant="secondary"
            size="sm"
            @click="handleMarkSelectedAsRead"
          >
            <CheckIcon class="w-4 h-4" />
            Mark as Read
          </Button>
          <Button
            variant="danger"
            size="sm"
            @click="handleDeleteSelected"
          >
            <TrashIcon class="w-4 h-4" />
            Delete
          </Button>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <Spinner size="xl" />
    </div>

    <!-- Notifications List -->
    <div v-else-if="paginatedNotifications.length > 0" class="space-y-3">
      <!-- Select All -->
      <div class="card !p-3 bg-gray-50">
        <label class="flex items-center space-x-2 cursor-pointer">
          <input
            v-model="allSelected"
            type="checkbox"
            class="w-4 h-4 rounded"
          />
          <span class="text-sm font-medium text-gray-700">Select All</span>
        </label>
      </div>

      <!-- Notification Items -->
      <div
        v-for="notification in paginatedNotifications"
        :key="notification.notification_id"
        :class="[
          'card cursor-pointer transition-all',
          !notification.is_read && 'bg-primary-50 border-primary-200'
        ]"
        @click="handleMarkAsRead(notification.notification_id)"
      >
        <div class="flex items-start space-x-4">
          <!-- Checkbox -->
          <input
            type="checkbox"
            :checked="selectedIds.includes(notification.notification_id)"
            @click.stop="toggleSelection(notification.notification_id)"
            class="mt-1 w-4 h-4 rounded"
          />

          <!-- Icon -->
          <div :class="[
            'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
            notification.is_read ? 'bg-gray-100' : 'bg-primary-100'
          ]">
            <BellIcon :class="[
              'w-5 h-5',
              notification.is_read ? 'text-gray-600' : 'text-primary-600'
            ]" />
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between mb-1">
              <div class="flex items-center space-x-2">
                <h3 :class="[
                  'font-semibold',
                  notification.is_read ? 'text-gray-700' : 'text-gray-900'
                ]">
                  {{ notification.title }}
                </h3>
                <Badge
                  v-if="notificationTypes[notification.type]"
                  :variant="notificationTypes[notification.type].color === 'blue' ? 'info' : 
                           notificationTypes[notification.type].color === 'green' ? 'success' :
                           notificationTypes[notification.type].color === 'yellow' ? 'warning' : 'primary'"
                  size="sm"
                >
                  {{ notificationTypes[notification.type].label }}
                </Badge>
              </div>
              
              <span class="text-xs text-gray-500 whitespace-nowrap ml-2">
                {{ formatTimeAgo(notification.created_at) }}
              </span>
            </div>

            <p :class="[
              'text-sm mb-2',
              notification.is_read ? 'text-gray-600' : 'text-gray-700'
            ]">
              {{ notification.message }}
            </p>

            <div class="flex items-center space-x-4 text-xs">
              <button
                v-if="!notification.is_read"
                @click.stop="handleMarkAsRead(notification.notification_id)"
                class="text-primary-600 hover:text-primary-700 flex items-center space-x-1"
              >
                <EnvelopeOpenIcon class="w-3 h-3" />
                <span>Mark as read</span>
              </button>
              
              <button
                @click.stop="handleDelete(notification.notification_id)"
                class="text-red-600 hover:text-red-700 flex items-center space-x-1"
              >
                <TrashIcon class="w-3 h-3" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="pagination.totalPages > 1" class="flex justify-center mt-6">
        <Pagination
          v-model:current-page="pagination.currentPage"
          :total-pages="pagination.totalPages"
          @update:current-page="handlePageChange"
        />
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="card text-center py-12">
      <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <BellIcon class="w-10 h-10 text-gray-400" />
      </div>
      <h3 class="text-xl font-semibold text-gray-900 mb-2">No notifications</h3>
      <p class="text-gray-600">
        {{ selectedFilter === 'unread' 
          ? 'You have no unread notifications' 
          : selectedFilter === 'read'
          ? 'You have no read notifications'
          : 'You don\'t have any notifications yet' 
        }}
      </p>
    </div>
  </div>
</template>