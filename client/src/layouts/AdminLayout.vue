<script setup>
import { ref, computed } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import {
  HomeIcon,
  UsersIcon,
  CalendarIcon,
  ShieldCheckIcon,
  CurrencyDollarIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  Bars3Icon,
  XMarkIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  ShoppingBagIcon,
  ChartBarIcon,
  SparklesIcon,
  BoltIcon
} from '@heroicons/vue/24/outline'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const sidebarOpen = ref(false)

const navigation = [
  { 
    name: 'Dashboard', 
    href: '/admin/dashboard', 
    icon: HomeIcon,
    gradient: 'from-red-500 to-red-700'
  },
  { 
    name: 'Users', 
    href: '/admin/users', 
    icon: UsersIcon,
    gradient: 'from-orange-500 to-red-600'
  },
  { 
    name: 'Events', 
    href: '/admin/events', 
    icon: CalendarIcon,
    gradient: 'from-pink-500 to-red-600'
  },
  { 
    name: 'Orders', 
    href: '/admin/orders', 
    icon: ShoppingBagIcon,
    gradient: 'from-rose-500 to-red-600'
  },
  { 
    name: 'Sub-Admins', 
    href: '/admin/sub-admins', 
    icon: ShieldCheckIcon, 
    adminOnly: true,
    gradient: 'from-red-600 to-red-800'
  },
  { 
    name: 'Refunds', 
    href: '/admin/refunds', 
    icon: CurrencyDollarIcon,
    gradient: 'from-amber-500 to-orange-600'
  },
  { 
    name: 'Settings', 
    href: '/admin/settings', 
    icon: Cog6ToothIcon, 
    adminOnly: true,
    gradient: 'from-gray-600 to-gray-800'
  },
  { 
    name: 'Audit Logs', 
    href: '/admin/audit-logs', 
    icon: DocumentTextIcon,
    gradient: 'from-purple-600 to-red-600'
  },
]

const filteredNavigation = computed(() => 
  navigation.filter(item => !item. adminOnly || authStore.isMainAdmin)
)

const handleLogout = async () => {
  await authStore.logout()
  router.push('/')
}

const isActive = (href) => route.path. startsWith(href)

const adminBadge = computed(() => {
  if (authStore.isMainAdmin) {
    return {
      text: 'Super Admin',
      icon: ShieldCheckIcon,
      class: 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white'
    }
  } else {
    return {
      text: 'Sub Admin',
      icon: SparklesIcon,
      class: 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
    }
  }
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Mobile Header -->
    <div class="md:hidden bg-gradient-to-r from-red-600 via-red-700 to-red-900 shadow-xl fixed top-0 left-0 right-0 z-50 border-b border-red-800">
      <div class="flex items-center justify-between px-4 py-3">
        <div class="flex items-center space-x-3">
          <RouterLink to="/" class="flex items-center space-x-2">
            <img 
              src="/logo_w.svg" 
              alt="Eternity Tickets" 
              class="h-8 w-auto brightness-0 invert"
              @error="$event.target.src = '/logo_w.svg'"
            />
          </RouterLink>
          <span class="text-sm font-bold text-white">Admin Panel</span>
        </div>
        <button 
          @click="sidebarOpen = !sidebarOpen" 
          class="w-10 h-10 flex items-center justify-center rounded-lg text-white hover:bg-white/10 transition-colors"
        >
          <Bars3Icon v-if="! sidebarOpen" class="w-6 h-6" />
          <XMarkIcon v-else class="w-6 h-6" />
        </button>
      </div>
    </div>

    <!-- Spacer -->
    <div class="md:hidden h-[56px]"></div>

    <div class="flex">
      <!-- ✅ Sidebar - Fixed Width, No Transform on Active -->
      <aside 
        :class="[
          'fixed md:sticky md:top-0 left-0 h-screen z-40 transition-transform duration-300',
          'w-72 flex-shrink-0',  // ← flex-shrink-0 prevents width changes
          'bg-gradient-to-b from-red-900 via-red-950 to-black',
          'shadow-2xl',
          sidebarOpen ? 'translate-x-0 top-[56px] md:top-0' : '-translate-x-full md:translate-x-0'
        ]"
      >
        <!-- Logo Section -->
        <div class="hidden md:block p-6 border-b border-red-800/50">
          <RouterLink to="/" class="flex items-center space-x-3 group">
            <img 
              src="/logo_w.svg" 
              alt="Eternity Tickets" 
              class="h-10 w-auto brightness-0 invert transform group-hover:scale-110 transition-transform"
              @error="$event.target.src = '/logo_w.svg'"
            />
            <div>
              <span class="text-lg font-bold text-white block">Eternity Ticket</span>
              <span class="text-xs text-red-300">Admin Panel</span>
            </div>
          </RouterLink>
        </div>

        <!-- Profile Card -->
        <div class="p-4 border-b border-red-800/50">
          <div class="flex items-center space-x-3">
            <div class="relative flex-shrink-0">
              <div class="w-11 h-11 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                <span class="text-white font-bold text-sm">
                  {{ authStore.user?. first_name?. charAt(0) }}{{ authStore.user?.last_name?.charAt(0) }}
                </span>
              </div>
              
              <div class="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center border-2 border-red-900 shadow-lg">
                <ShieldCheckIcon class="w-3 h-3 text-white" />
              </div>
            </div>
            
            <div class="flex-1 min-w-0">
              <p class="font-bold text-white text-sm truncate">{{ authStore.fullName }}</p>
              <div class="flex items-center gap-2 mt-1">
                <span class="text-xs text-red-300">{{ adminBadge.text }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- ✅ Navigation - NO scale transform on active -->
        <nav class="flex-1 overflow-y-auto p-4 space-y-2">
          <RouterLink
            v-for="item in filteredNavigation"
            :key="item.name"
            :to="item.href"
            @click="sidebarOpen = false"
            :class="[
              'group flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors relative overflow-hidden',
              isActive(item. href)
                ? 'bg-gradient-to-r ' + item.gradient + ' text-white shadow-lg'  // ← REMOVED transform scale-105
                : 'text-gray-300 hover:bg-white/5 hover:text-white'
            ]"
          >
            <!-- Background overlay -->
            <div 
              v-if="isActive(item. href)"
              class="absolute inset-0 bg-white/10 rounded-xl"
            ></div>
            
            <!-- ✅ Icon - NO scale on hover when active -->
            <component 
              :is="item.icon" 
              :class="[
                'w-5 h-5 relative z-10 flex-shrink-0',
                isActive(item.href) ? '' : 'group-hover:scale-110 transition-transform'  // ← Only hover when NOT active
              ]"
            />
            
            <span class="font-semibold relative z-10 text-sm flex-1">{{ item.name }}</span>
            
            <!-- Active Indicator -->
            <div 
              v-if="isActive(item.href)"
              class="w-2 h-2 bg-white rounded-full relative z-10 flex-shrink-0"
            ></div>
          </RouterLink>
        </nav>

        <!-- Footer -->
        <div class="p-4 border-t border-red-800/50 space-y-2">
          <RouterLink
            to="/"
            @click="sidebarOpen = false"
            class="flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-300 hover:bg-white/5 hover:text-white transition-all group"
          >
            <HomeIcon class="w-5 h-5 group-hover:scale-110 transition-transform flex-shrink-0" />
            <span class="font-medium text-sm">Back to Home</span>
          </RouterLink>

          <button 
            @click="handleLogout"
            class="flex items-center space-x-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 w-full transition-all group"
          >
            <ArrowRightOnRectangleIcon class="w-5 h-5 group-hover:scale-110 transition-transform flex-shrink-0" />
            <span class="font-medium text-sm">Logout</span>
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

      <!-- ✅ Main Content - Stable Width -->
      <main class="flex-1 min-w-0 min-h-screen">  <!-- ← min-w-0 prevents flex grow issues -->
        <!-- Page Content -->
        <div class="p-4 md:p-8">
          <RouterView />
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
/* Custom scrollbar */
aside nav::-webkit-scrollbar {
  width: 6px;
}

aside nav::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
}

aside nav::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}

aside nav::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>