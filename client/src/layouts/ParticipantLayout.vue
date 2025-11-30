<script setup>
import { ref, computed } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import {
  UserCircleIcon,
  TicketIcon,
  ShoppingBagIcon,
  CreditCardIcon,
  BellIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  SparklesIcon,
  BoltIcon,
  StarIcon
} from '@heroicons/vue/24/outline'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const sidebarOpen = ref(false)

const navigation = [
  { 
    name: 'Profile', 
    href: '/participant/profile', 
    icon: UserCircleIcon,
    color: 'text-primary-600',
    bgColor: 'bg-primary-50',
    hoverBg: 'hover:bg-primary-50'
  },
  { 
    name: 'My Tickets', 
    href: '/participant/tickets', 
    icon: TicketIcon,
    color: 'text-accent-600',
    bgColor: 'bg-accent-50',
    hoverBg: 'hover:bg-accent-50'
  },
  { 
    name: 'Orders', 
    href: '/participant/orders', 
    icon: ShoppingBagIcon,
    color: 'text-success-600',
    bgColor: 'bg-success-50',
    hoverBg: 'hover:bg-success-50'
  },
  { 
    name: 'Membership', 
    href: '/participant/membership', 
    icon: CreditCardIcon,
    color: 'text-warning-600',
    bgColor: 'bg-warning-50',
    hoverBg: 'hover:bg-warning-50'
  },
  { 
    name: 'Notifications', 
    href: '/participant/notifications', 
    icon: BellIcon,
    color: 'text-info-600',
    bgColor: 'bg-info-50',
    hoverBg: 'hover:bg-info-50'
  },
]

const isActive = (href) => route.path === href

const handleLogout = async () => {
  await authStore.logout()
  router.push('/')
}

const userAvatar = computed(() => {
  return authStore.user?.avatar || authStore.user?.profile_picture || null
})


const membershipBadge = computed(() => {
  if (authStore.membershipTier === 'premium') {
    return {
      text: 'Premium',
      icon: BoltIcon,
      class: 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white'
    }
  } else if (authStore.membershipTier !== 'basic') {
    return {
      text: authStore.membershipTier.toUpperCase(),
      icon: StarIcon,
      class: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
    }
  }
  return null
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- ✅ Mobile Header - White with Shadow -->
    <div class="md:hidden bg-white shadow-md fixed top-0 left-0 right-0 z-50 border-b border-gray-200">
      <div class="flex items-center justify-between px-4 py-3">
        <div class="flex items-center space-x-3">
          <RouterLink to="/" class="flex items-center space-x-2">
            <img 
              src="/logo_b.svg" 
              alt="Eternity Tickets" 
              class="h-8 w-auto"
              @error="$event.target.src = '/logo_b.svg'"
            />
          </RouterLink>
          <span class="text-sm font-bold text-gray-900">My Dashboard</span>
        </div>
        <button 
          @click="sidebarOpen = !sidebarOpen" 
          class="w-10 h-10 flex items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <Bars3Icon v-if="! sidebarOpen" class="w-6 h-6" />
          <XMarkIcon v-else class="w-6 h-6" />
        </button>
      </div>
    </div>

    <!-- Spacer -->
    <div class="md:hidden h-[56px]"></div>

    <div class="flex">
      <!-- ✅ Sidebar - White, Clean, Modern -->
      <aside 
        :class="[
          'fixed md:sticky md:top-0 left-0 h-screen z-40 transition-transform duration-300',
          'w-72 flex flex-col',
          'bg-white shadow-xl border-r border-gray-200',
          sidebarOpen ? 'translate-x-0 top-[56px] md:top-0' : '-translate-x-full md:translate-x-0'
        ]"
      >
        <!-- Logo Section - Desktop -->
        <div class="hidden md:block p-6 border-b border-gray-200">
          <RouterLink to="/" class="flex items-center space-x-3 group">
            <img 
              src="/logo_b.svg" 
              alt="Eternity Tickets" 
              class="h-10 w-auto transform group-hover:scale-110 transition-transform"
              @error="$event.target.src = '/logo_b.svg'"
            />
            <div>
              <span class="text-lg font-bold text-gray-900 block">Eternity Tickets</span>
              <span class="text-xs text-gray-500">Participant Dashboard</span>
            </div>
          </RouterLink>
        </div>

        <!-- ✅ User Profile Card - Modern Gradient -->
        <div class="p-4 border-b border-gray-200">
          <div class="bg-gradient-to-br from-primary-50 via-accent-50 to-primary-50 rounded-xl p-4 border border-primary-100 shadow-sm">
            <div class="flex items-center space-x-3 mb-3">
              <img 
                v-if="userAvatar"
                :src="userAvatar" 
                class="w-11 h-11 rounded-xl object-cover border-2 border-primary-200 shadow-md"
                @error="$event.target.style.display = 'none'"
              />
              <div v-else class="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                <span class="text-white font-bold text-lg">
                  {{ authStore.user?.first_name?.charAt(0) }}{{ authStore.user?.last_name?.charAt(0) }}
                </span>
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-bold text-gray-900 text-sm truncate">{{ authStore.fullName }}</p>
                <p class="text-xs text-gray-600 truncate">{{ authStore.user?.email }}</p>
              </div>
            </div>
            
            <!-- Membership Badge -->
            <div v-if="membershipBadge" class="flex items-center justify-center">
              <div :class="['inline-flex items-center px-3 py-2 rounded-full shadow-md font-bold text-sm', membershipBadge.class]">
                <component :is="membershipBadge.icon" class="w-4 h-3 mr-1" />
                {{ membershipBadge.text }} Member
              </div>
            </div>
          </div>
        </div>

        <!-- ✅ Navigation - Colorful Icons -->
        <nav class="flex-1 overflow-y-auto p-4 space-y-2">
          <RouterLink
            v-for="item in navigation"
            :key="item.name"
            :to="item.href"
            @click="sidebarOpen = false"
            :class="[
              'group flex items-center space-x-2 px-4 py-2 rounded-xl transition-all',
              isActive(item.href)
                ? [item.bgColor, item.color, 'font-semibold shadow-md transform scale-105']
                : ['text-gray-700', item.hoverBg, 'hover:shadow-sm']
            ]"
          >
            <div 
              :class="[
                'w-8 h-8 rounded-lg flex items-center justify-center transition-transform',
                isActive(item.href) 
                  ? 'bg-white shadow-sm' 
                  : 'bg-gray-100 group-hover:scale-110'
              ]"
            >
              <component 
                :is="item.icon" 
                :class="[
                  'w-5 h-5',
                  isActive(item.href) ? item.color : 'text-gray-600'
                ]"
              />
            </div>
            <span class="font-medium">{{ item.name }}</span>
            
            <!-- Active Indicator -->
            <div 
              v-if="isActive(item.href)"
              :class="['ml-auto w-2 h-2 rounded-full', item.color. replace('text-', 'bg-')]"
            ></div>
          </RouterLink>
        </nav>

        <!-- ✅ Footer Actions -->
        <div class="p-4 border-t border-gray-200 space-y-2">
          <!-- Back to Home -->
          <RouterLink
            to="/"
            @click="sidebarOpen = false"
            class="flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-700 hover:bg-gray-100 transition-all group"
          >
            <div class="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <HomeIcon class="w-5 h-5 text-gray-600" />
            </div>
            <span class="font-medium">Back to Home</span>
          </RouterLink>

          <!-- Logout -->
          <button 
            @click="handleLogout"
            class="flex items-center space-x-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 w-full transition-all group"
          >
            <div class="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <ArrowRightOnRectangleIcon class="w-5 h-5 text-red-600" />
            </div>
            <span class="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      <!-- Backdrop -->
      <div 
        v-if="sidebarOpen"
        @click="sidebarOpen = false"
        class="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
        style="top: 56px;"
      ></div>

      <!-- ✅ Main Content - Clean White Background -->
      <main class="flex-1 min-h-screen">
        <!-- Top Bar (Desktop) -->
        <div class="hidden md:block bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
          <div class="px-8 py-4">
            <div class="flex items-center justify-between">
              <div>
                <h1 class="text-2xl font-bold text-gray-900">
                  {{ route.meta.title || 'My Dashboard' }}
                </h1>
                <p class="text-sm text-gray-500 mt-1">
                  Manage your tickets, orders, and profile
                </p>
              </div>
              
              <!-- Quick Actions -->
              <div class="flex items-center gap-3">
                <RouterLink
                  to="/"
                  class="btn btn-secondary"
                >
                  <HomeIcon class="w-5 h-5 mr-2" />
                  Browse Events
                </RouterLink>
              </div>
            </div>
          </div>
        </div>

        <!-- Page Content -->
        <div class="p-4 md:p-8">
          <RouterView />
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
/* Custom scrollbar for sidebar */
aside nav::-webkit-scrollbar {
  width: 6px;
}

aside nav::-webkit-scrollbar-track {
  background: #f3f4f6;
  border-radius: 10px;
}

aside nav::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 10px;
}

aside nav::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}
</style>