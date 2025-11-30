<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notification'
import { notificationsAPI } from '@/api/notifications'
import {
  Bars3Icon,
  XMarkIcon,
  BellIcon,
  UserCircleIcon,
  MagnifyingGlassIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
  TicketIcon
} from '@heroicons/vue/24/outline'

const router = useRouter()
const authStore = useAuthStore()
const notificationStore = useNotificationStore()

const mobileMenuOpen = ref(false)
const showUserMenu = ref(false)
const showNotifications = ref(false)
const searchQuery = ref('')
const loadingNotifications = ref(false)

const navigation = [
  { name: 'Events', href: '/events' },
  { name: 'About', href: '/about' },
  { name: 'Contact', href: '/contact' },
]

const handleSearch = () => {
  if (searchQuery.value. trim()) {
    router.push({ path: '/events', query: { search: searchQuery.value } })
    searchQuery.value = ''
  }
}

const getDashboardLink = computed(() => {
  if (authStore.isAdmin) return '/admin/dashboard'
  if (authStore.isOrganizer) return '/organizer/dashboard'
  if (authStore.isParticipant) return '/participant/profile'
  return '/'
})

// Get user avatar or initials
const userAvatar = computed(() => authStore.user?.avatar_url)
const userInitials = computed(() => {
  const firstName = authStore.user?.first_name || ''
  const lastName = authStore. user?.last_name || ''
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'U'
})

const handleImageError = (event) => {
  event.target.style.display = 'none'
  event.target.nextElementSibling.style.display = 'flex'
}

// ✅ Fetch notifications when dropdown opens
const handleNotificationClick = async () => {
  showNotifications.value = ! showNotifications.value
  
  // Fetch notifications if opening and not already loaded
  if (showNotifications.value && notificationStore.notifications.length === 0) {
    await fetchNotifications()
  }
}

// ✅ Fetch notifications from API
const fetchNotifications = async () => {
  loadingNotifications.value = true
  try {
    const response = await notificationsAPI.getNotifications({
      page: 1,
      limit: 10
    })
    
    if (response. success) {
      notificationStore.setNotifications(response.data?.notifications || [])
    }
  } catch (error) {
    console.error('Failed to fetch notifications:', error)
  } finally {
    loadingNotifications.value = false
  }
}

// ✅ Mark notification as read
const handleNotificationRead = async (notification) => {
  if (! notification.is_read) {
    try {
      await notificationsAPI.markAsRead(notification.id)
      notificationStore.markAsRead(notification.id)
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }
  showNotifications.value = false
}

// ✅ Fetch unread count on mount
onMounted(async () => {
  if (authStore.isAuthenticated) {
    try {
      const response = await notificationsAPI.getUnreadCount()
      if (response.success) {
        notificationStore.setUnreadCount(response.data?.unread_count || 0)
      }
    } catch (error) {
      console.error('Failed to fetch unread count:', error)
      notificationStore.setUnreadCount(0)
    }
  }
})
</script>

<template>
  <header class="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
    <nav class="container-custom">
      <div class="flex justify-between items-center h-16">
        <!-- Logo -->
        <div class="flex items-center">
          <RouterLink to="/" class="flex items-center space-x-3 group">
            <img 
              src="/logo_b.svg" 
              alt="Eternity Tickets" 
              class="h-10 w-10 object-contain group-hover:scale-110 transition-transform"
            />
            <span class="text-xl font-bold text-gray-900 hidden sm:block">
              Eternity Tickets
              
            </span>
          </RouterLink>
        </div>

        <!-- Desktop Navigation -->
        <div class="hidden md:flex items-center space-x-1">
          <RouterLink
            v-for="item in navigation"
            :key="item.name"
            :to="item.href"
            class="px-4 py-2 rounded-lg text-gray-700 hover:text-primary-600 hover:bg-primary-50 font-medium transition-all"
          >
            {{ item.name }}
          </RouterLink>
        </div>

        <!-- Right Side -->
        <div class="flex items-center space-x-2">
          <!-- Search -->
          <div class="hidden lg:block relative">
            <input
              v-model="searchQuery"
              @keyup.enter="handleSearch"
              type="text"
              placeholder="Search events..."
              class="input ! py-2 pl-10 pr-4 w-64 border-gray-300 focus:border-primary-500"
            />
            <MagnifyingGlassIcon class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          <!-- Notifications (Authenticated) -->
          <div v-if="authStore.isAuthenticated" class="relative">
            <button 
              @click="handleNotificationClick"
              class="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <BellIcon class="w-6 h-6 text-gray-700" />
              <span 
                v-if="notificationStore.unreadCount > 0"
                class="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold"
              >
                {{ notificationStore.unreadCount }}
              </span>
            </button>

            <!-- Notification Dropdown -->
            <Transition name="fade">
              <div 
                v-if="showNotifications"
                v-click-away="() => showNotifications = false"
                class="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-96 overflow-hidden"
              >
                <div class="p-4 border-b border-gray-200 bg-gray-50">
                  <h3 class="font-semibold text-gray-900">Notifications</h3>
                </div>
                
                <!-- Loading State -->
                <div v-if="loadingNotifications" class="p-8 text-center">
                  <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                  <p class="text-sm text-gray-500 mt-2">Loading... </p>
                </div>

                <!-- Notifications List -->
                <div v-else class="overflow-y-auto max-h-80">
                  <div v-if="notificationStore.notifications.length === 0" class="p-8 text-center text-gray-500">
                    <BellIcon class="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p>No notifications</p>
                  </div>
                  <div v-else>
                    <div
                      v-for="notification in notificationStore.notifications"
                      :key="notification.id"
                      :class="[
                        'p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors',
                        ! notification.is_read && 'bg-primary-50'
                      ]"
                      @click="handleNotificationRead(notification)"
                    >
                      <div class="flex items-start">
                        <div class="flex-1">
                          <p class="text-sm font-medium text-gray-900">{{ notification.title }}</p>
                          <p class="text-xs text-gray-600 mt-1">{{ notification.message }}</p>
                          <p class="text-xs text-gray-400 mt-1">{{ notification.created_at }}</p>
                        </div>
                        <div v-if="! notification.is_read" class="w-2 h-2 bg-primary-600 rounded-full flex-shrink-0 mt-1 ml-2"></div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div class="p-3 border-t border-gray-200 bg-gray-50">
                  <RouterLink 
                    to="/participant/notifications" 
                    class="block text-center text-sm text-primary-600 hover:text-primary-700 font-medium"
                    @click="showNotifications = false"
                  >
                    View all notifications
                  </RouterLink>
                </div>
              </div>
            </Transition>
          </div>

          <!-- User Menu (Authenticated) -->
          <div v-if="authStore.isAuthenticated" class="relative">
            <button 
              @click="showUserMenu = !showUserMenu"
              class="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <!-- User Avatar/Initials -->
              <div class="relative w-8 h-8 rounded-full overflow-hidden bg-primary-100 flex items-center justify-center">
                <!-- Avatar Image -->
                <img 
                  v-if="userAvatar"
                  :src="userAvatar" 
                  :alt="authStore.fullName"
                  class="w-full h-full object-cover"
                  @error="handleImageError"
                />
                <!-- Fallback Initials -->
                <span 
                  class="text-primary-600 font-semibold text-sm"
                  :style="userAvatar ? 'display: none' : 'display: flex'"
                >
                  {{ userInitials }}
                </span>
              </div>
              <span class="hidden lg:block font-medium text-gray-900">{{ authStore.user?. first_name }}</span>
            </button>

            <!-- User Dropdown -->
            <Transition name="fade">
              <div 
                v-if="showUserMenu"
                v-click-away="() => showUserMenu = false"
                class="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-50"
              >
                <!-- User Info Header -->
                <div class="px-4 py-3 border-b border-gray-200">
                  <div class="flex items-center space-x-3">
                    <!-- Avatar in dropdown -->
                    <div class="relative w-10 h-10 rounded-full overflow-hidden bg-primary-100 flex items-center justify-center flex-shrink-0">
                      <img 
                        v-if="userAvatar"
                        :src="userAvatar" 
                        :alt="authStore.fullName"
                        class="w-full h-full object-cover"
                        @error="(e) => e.target.style.display = 'none'"
                      />
                      <span 
                        class="text-primary-600 font-semibold"
                        :style="userAvatar ? 'display: none' : 'display: flex'"
                      >
                        {{ userInitials }}
                      </span>
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-semibold text-gray-900 truncate">{{ authStore.fullName }}</p>
                      <p class="text-xs text-gray-500 truncate">{{ authStore.user?.email }}</p>
                    </div>
                  </div>
                </div>
                
                <RouterLink 
                  :to="getDashboardLink"
                  class="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  @click="showUserMenu = false"
                >
                  <Cog6ToothIcon class="w-4 h-4" />
                  <span>Dashboard</span>
                </RouterLink>
                
                <RouterLink 
                  v-if="authStore.isParticipant"
                  to="/participant/tickets"
                  class="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  @click="showUserMenu = false"
                >
                  <TicketIcon class="w-4 h-4" />
                  <span>My Tickets</span>
                </RouterLink>

                <RouterLink 
                  v-if="authStore.isParticipant"
                  to="/participant/membership"
                  class="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  @click="showUserMenu = false"
                >
                  <UserCircleIcon class="w-4 h-4" />
                  <span>Membership</span>
                </RouterLink>
                
                <div class="border-t border-gray-200 mt-2 pt-2">
                  <button 
                    @click="authStore.logout()"
                    class="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <ArrowRightOnRectangleIcon class="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </Transition>
          </div>

          <!-- Auth Buttons (Guest) -->
          <div v-else class="flex items-center space-x-2">
            <RouterLink to="/auth/login" class="btn btn-ghost btn-sm">
              Login
            </RouterLink>
            <RouterLink to="/auth/register" class="btn btn-primary btn-sm">
              Sign Up
            </RouterLink>
          </div>

          <!-- Mobile Menu Button -->
          <button 
            @click="mobileMenuOpen = !mobileMenuOpen"
            class="md:hidden p-2 rounded-lg hover:bg-gray-100"
          >
            <Bars3Icon v-if="! mobileMenuOpen" class="w-6 h-6" />
            <XMarkIcon v-else class="w-6 h-6" />
          </button>
        </div>
      </div>

      <!-- Mobile Menu -->
      <Transition name="slide">
        <div v-if="mobileMenuOpen" class="md:hidden border-t border-gray-200 py-4 space-y-1">
          <!-- Search Mobile -->
          <div class="px-2 pb-3">
            <div class="relative">
              <input
                v-model="searchQuery"
                @keyup.enter="handleSearch"
                type="text"
                placeholder="Search events..."
                class="input !py-2 pl-10 w-full"
              />
              <MagnifyingGlassIcon class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <RouterLink
            v-for="item in navigation"
            :key="item.name"
            :to="item.href"
            @click="mobileMenuOpen = false"
            class="block px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 font-medium"
          >
            {{ item.name }}
          </RouterLink>
        </div>
      </Transition>
    </nav>
  </header>
</template>