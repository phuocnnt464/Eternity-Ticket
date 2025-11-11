<script setup>
import { ref, onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notification'
import { notificationsAPI } from '@/api/notifications'
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
      const response = await notificationsAPI.getUnreadCount()
      if (response.success) {
        notificationStore.setUnreadCount(response.data?.unread_count || 0)
      }
    } catch (error) {
      console.error('Failed to fetch unread count:', error)
      // Set to 0 on error to prevent UI issues
      notificationStore.setUnreadCount(0)
    }
  }
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow-sm sticky top-0 z-50">
      <nav class="container-custom">
        <div class="flex justify-between items-center h-16">
          <!-- Logo -->
          <div class="flex items-center">
            <RouterLink to="/" class="flex items-center space-x-2">
              <div class="w-10 h-10 bg-gradient-to-br from-primary-600 to-accent-600 rounded-lg flex items-center justify-center">
                <span class="text-white font-bold text-xl">ET</span>
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
            <!-- Search Button -->
            <button class="btn-ghost btn-sm">
              <MagnifyingGlassIcon class="w-5 h-5" />
            </button>

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
            </div>

            <!-- User Menu (Authenticated) -->
            <div v-if="authStore.isAuthenticated" class="relative">
              <button 
                @click="showUserMenu = !showUserMenu"
                class="flex items-center space-x-2 btn-ghost btn-sm"
              >
                <UserCircleIcon class="w-6 h-6" />
                <span class="hidden sm:block">{{ authStore.user?.first_name }}</span>
              </button>

              <!-- Dropdown -->
              <Transition name="fade">
                <div 
                  v-if="showUserMenu"
                  @click.away="showUserMenu = false"
                  class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-50"
                >
                  <RouterLink 
                    v-if="authStore.isParticipant"
                    to="/participant/profile" 
                    class="block px-4 py-2 hover:bg-gray-100"
                  >
                    My Profile
                  </RouterLink>
                  <RouterLink 
                    v-if="authStore.isOrganizer"
                    to="/organizer/dashboard" 
                    class="block px-4 py-2 hover:bg-gray-100"
                  >
                    Dashboard
                  </RouterLink>
                  <RouterLink 
                    v-if="authStore.isAdmin"
                    to="/admin/dashboard" 
                    class="block px-4 py-2 hover:bg-gray-100"
                  >
                    Admin Panel
                  </RouterLink>
                  <button 
                    @click="authStore.logout()"
                    class="block w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600"
                  >
                    Logout
                  </button>
                </div>
              </Transition>
            </div>

            <!-- Auth Buttons (Guest) -->
            <div v-else class="flex items-center space-x-2">
              <RouterLink to="/auth/login" class="btn-ghost btn-sm">
                Login
              </RouterLink>
              <RouterLink to="/auth/register" class="btn-primary btn-sm">
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
          <div v-if="mobileMenuOpen" class="md:hidden border-t py-4">
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

    <!-- Main Content -->
    <main>
      <RouterView />
    </main>

    <!-- Footer -->
    <footer class="bg-gray-900 text-white mt-20">
      <div class="container-custom py-12">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
          <!-- Brand -->
          <div>
            <h3 class="text-xl font-bold mb-4">Eternity Ticket</h3>
            <p class="text-gray-400 text-sm">
              Your trusted platform for event tickets and experiences.
            </p>
          </div>

          <!-- Quick Links -->
          <div>
            <h4 class="font-semibold mb-4">Quick Links</h4>
            <ul class="space-y-2 text-sm">
              <li><RouterLink to="/events" class="text-gray-400 hover:text-white">Events</RouterLink></li>
              <li><RouterLink to="/about" class="text-gray-400 hover:text-white">About Us</RouterLink></li>
              <li><RouterLink to="/contact" class="text-gray-400 hover:text-white">Contact</RouterLink></li>
            </ul>
          </div>

          <!-- Support -->
          <div>
            <h4 class="font-semibold mb-4">Support</h4>
            <ul class="space-y-2 text-sm">
              <li><a href="#" class="text-gray-400 hover:text-white">Help Center</a></li>
              <li><a href="#" class="text-gray-400 hover:text-white">Terms of Service</a></li>
              <li><a href="#" class="text-gray-400 hover:text-white">Privacy Policy</a></li>
            </ul>
          </div>

          <!-- Newsletter -->
          <div>
            <h4 class="font-semibold mb-4">Newsletter</h4>
            <p class="text-gray-400 text-sm mb-4">
              Subscribe to get updates on new events.
            </p>
            <div class="flex">
              <input 
                type="email" 
                placeholder="Email" 
                class="input text-sm flex-1 rounded-r-none"
              />
              <button class="btn-primary btn-sm rounded-l-none">
                Subscribe
              </button>
            </div>
          </div>
        </div>

        <div class="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
          <p>&copy; 2025 Eternity Ticket. All rights reserved.</p>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* Transitions đã có trong App.vue global styles */
</style>