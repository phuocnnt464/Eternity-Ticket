<script setup>
import { ref, computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notification'
import {
  Bars3Icon,
  XMarkIcon,
  BellIcon,
  UserCircleIcon,
  MagnifyingGlassIcon,
  ArrowRightOnRectangleIcon,
  UsersIcon
} from '@heroicons/vue/24/outline'

const router = useRouter()
const authStore = useAuthStore()
const notificationStore = useNotificationStore()

const mobileMenuOpen = ref(false)
const showUserMenu = ref(false)
const showNotifications = ref(false)
const searchQuery = ref('')

const navigation = [
  { name: 'Events', href: '/events' },
  { name: 'About', href: '/about' },
  { name: 'Contact', href: '/contact' },
]

const handleSearch = () => {
  if (searchQuery.value.trim()) {
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
</script>

<template>
  <header class="bg-white shadow-sm sticky top-0 z-50">
    <nav class="container-custom">
      <div class="flex justify-between items-center h-16">
        <!-- Logo -->
        <div class="flex items-center">
          <RouterLink to="/" class="flex items-center space-x-2">
            <div class="w-10 h-10 bg-gradient-to-br from-primary-600 to-accent-600 rounded-lg flex items-center justify-center">
              <span class="text-white font-bold text-xl">E</span>
            </div>
            <span class="text-xl font-bold text-gray-900 hidden sm:block">
              Eternity Ticket
            </span>
          </RouterLink>
        </div>

        <!-- Desktop Navigation -->
        <div class="hidden md:flex items-center space-x-8">
          <RouterLink
            v-for="item in navigation"
            :key="item.name"
            :to="item.href"
            class="text-gray-700 hover:text-primary-600 font-medium transition-colors"
          >
            {{ item.name }}
          </RouterLink>
        </div>

        <!-- Right Side -->
        <div class="flex items-center space-x-4">
          <!-- Search -->
          <div class="hidden md:block relative">
            <input
              v-model="searchQuery"
              @keyup.enter="handleSearch"
              type="text"
              placeholder="Search events..."
              class="input !py-2 pl-10 pr-4 w-64"
            />
            <MagnifyingGlassIcon class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          <!-- Notifications (Authenticated) -->
          <div v-if="authStore.isAuthenticated" class="relative">
            <button 
              @click="showNotifications = !showNotifications"
              class="btn-ghost btn-sm relative"
            >
              <BellIcon class="w-5 h-5" />
              <span 
                v-if="notificationStore.unreadCount > 0"
                class="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center"
              >
                {{ notificationStore.unreadCount }}
              </span>
            </button>

            <!-- Notification Dropdown -->
            <Transition name="fade">
              <div 
                v-if="showNotifications"
                v-click-away="() => showNotifications = false"
                class="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border z-50 max-h-96 overflow-y-auto"
              >
                <div class="p-4 border-b">
                  <h3 class="font-semibold">Notifications</h3>
                </div>
                <div v-if="notificationStore.notifications.length === 0" class="p-4 text-center text-gray-500">
                  No notifications
                </div>
                <div v-else>
                  <div
                    v-for="notification in notificationStore.notifications"
                    :key="notification.id"
                    class="p-4 border-b hover:bg-gray-50 cursor-pointer"
                    @click="notificationStore.markAsRead(notification.id)"
                  >
                    <p class="text-sm font-medium">{{ notification.title }}</p>
                    <p class="text-xs text-gray-600 mt-1">{{ notification.message }}</p>
                    <p class="text-xs text-gray-400 mt-1">{{ notification.created_at }}</p>
                  </div>
                </div>
                <div class="p-2 border-t">
                  <RouterLink to="/participant/notifications" class="block text-center text-sm text-primary-600 hover:text-primary-700">
                    View all
                  </RouterLink>
                </div>
              </div>
            </Transition>
          </div>

          <!-- User Menu (Authenticated) -->
          <div v-if="authStore.isAuthenticated" class="relative">
            <button 
              @click="showUserMenu = !showUserMenu"
              class= "flex items-center space-x-2 btn-ghost btn-sm"
            >
              <UserCircleIcon class="w-6 h-6" />
              <span class="hidden sm:block">{{ authStore.user?.first_name }}</span>
            </button>

            <!-- User Dropdown -->
            <Transition name="fade">
              <div 
                v-if="showUserMenu"
                v-click-away="() => showUserMenu = false"
                class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-50"
              >
                <div class="px-4 py-2 border-b">
                  <p class="text-sm font-medium text-gray-900">{{ authStore.fullName }}</p>
                  <p class="text-xs text-gray-500">{{ authStore.user?.email }}</p>
                </div>
                
                <RouterLink 
                  :to="getDashboardLink"
                  class="block px-4 py-2 text-sm hover:bg-gray-100"
                  @click="showUserMenu = false"
                >
                  Dashboard
                </RouterLink>
                
                <RouterLink 
                  v-if="authStore.isParticipant && authStore.isTeamMember"
                  to="/events/team-events"
                  class="block px-4 py-2 text-sm hover:bg-gray-100 text-blue-600 font-medium"
                  @click="showUserMenu = false"
                >
                  <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-2">
                      <UsersIcon class="w-4 h-4" />
                      <span>My Team Events</span>
                    </div>
                    <span 
                      v-if="authStore.teamEventsCount > 0"
                      class="px-2 py-0.5 text-xs font-bold bg-blue-600 text-white rounded-full"
                    >
                      {{ authStore.teamEventsCount }}
                    </span>
                  </div>
                </RouterLink>

                <RouterLink 
                  v-if="authStore.isParticipant"
                  to="/participant/membership"
                  class="block px-4 py-2 text-sm hover:bg-gray-100"
                  @click="showUserMenu = false"
                >
                  Membership
                </RouterLink>
                
                <button 
                  @click="authStore.logout()"
                  class="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-red-600"
                >
                  <div class="flex items-center space-x-2">
                    <ArrowRightOnRectangleIcon class="w-4 h-4" />
                    <span>Logout</span>
                  </div>
                </button>
              </div>
            </Transition>
          </div>

          <!-- Auth Buttons (Guest) -->
          <div v-else class="flex items-center space-x-2">
            <RouterLink to="/auth/login" class="btn btn-secondary btn-sm">
              Login
            </RouterLink>
            <RouterLink to="/auth/register" class="btn btn-primary btn-sm">
              Register
            </RouterLink>
          </div>

          <!-- Mobile Menu Button -->
          <button 
            @click="mobileMenuOpen = !mobileMenuOpen"
            class="md:hidden btn-ghost btn-sm"
          >
            <Bars3Icon v-if="!mobileMenuOpen" class="w-6 h-6" />
            <XMarkIcon v-else class="w-6 h-6" />
          </button>
        </div>
      </div>

      <!-- Mobile Menu -->
      <Transition name="slide">
        <div v-if="mobileMenuOpen" class="md:hidden border-t py-4 space-y-2">
          <!-- Search Mobile -->
          <div class="pb-4">
            <input
              v-model="searchQuery"
              @keyup.enter="handleSearch"
              type="text"
              placeholder="Search events..."
              class="input !py-2"
            />
          </div>

          <RouterLink
            v-for="item in navigation"
            :key="item.name"
            :to="item.href"
            @click="mobileMenuOpen = false"
            class="block py-2 text-gray-700 hover:text-primary-600"
          >
            {{ item.name }}
          </RouterLink>
        </div>
      </Transition>
    </nav>
  </header>
</template>