<script setup>
import { ref, onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notification'
import { notificationsAPI } from '@/api/notifications'
import AppHeader from '@/components/layout/AppHeader.vue'  
import AppFooter from '@/components/layout/AppFooter.vue'
import { 
  Bars3Icon, 
  XMarkIcon,
  BellIcon,
  UserCircleIcon,
  MagnifyingGlassIcon
} from '@heroicons/vue/24/outline'

const authStore = useAuthStore()
const notificationStore = useNotificationStore()

const mobileMenuOpen = ref(false)
const showUserMenu = ref(false)
const showNotifications = ref(false)

const navigation = [
  { name: 'Events', href: '/events' },
  { name: 'About', href: '/about' },
  { name: 'Contact', href: '/contact' },
]

onMounted(async () => {
  if (authStore.isAuthenticated) {
    try {
      const countResponse = await notificationsAPI.getUnreadCount()
      if (countResponse.success) {
        notificationStore.setUnreadCount(countResponse.data?.unread_count || 0)
      }
      const notificationsResponse = await notificationsAPI.getNotifications({
        page: 1,
        limit: 10
      })
      
      if (notificationsResponse. success) {
        notificationStore.setNotifications(notificationsResponse.data?. notifications || [])
      }
    } catch (error) {
      console. error('Failed to fetch notifications:', error)
      notificationStore.setUnreadCount(0)
      notificationStore.setNotifications([])
    }
  }
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <AppHeader />

    <!-- Main Content -->
    <main>
      <RouterView />
    </main>

    <!-- Footer -->
    <AppFooter />
  </div>
</template>

<style scoped>
/* Transitions đã có trong App.vue global styles */
</style>