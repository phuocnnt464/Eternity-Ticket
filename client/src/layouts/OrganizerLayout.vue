<script setup>
import { ref, computed } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import {
  HomeIcon,
  CalendarIcon,
  PlusCircleIcon,
  ChartBarIcon,
  UsersIcon,
  TicketIcon,
  Bars3Icon,
  XMarkIcon,
  ArrowRightOnRectangleIcon,
  SparklesIcon,
  BoltIcon,
  UserCircleIcon
} from '@heroicons/vue/24/outline'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const sidebarOpen = ref(false)

const navigation = computed(() => {
  if (authStore.isOrganizer) {
    return [
      { 
        name: 'Dashboard', 
        href: '/organizer/dashboard', 
        icon: HomeIcon,
        gradient: 'from-primary-500 to-primary-700',
        exact: false 
      },
      { 
        name: 'My Events', 
        href: '/organizer/events', 
        icon: CalendarIcon,
        gradient: 'from-accent-500 to-accent-700',
        exact: true 
      },
      { 
        name: 'Create Event', 
        href: '/organizer/events/create', 
        icon: PlusCircleIcon,
        gradient: 'from-success-500 to-success-700',
        exact: false
      },
    ]
  } else {
    return [
      { 
        name: 'My Team Events', 
        href: '/organizer/teams', 
        icon: UsersIcon,
        gradient: 'from-accent-500 to-primary-600',
        exact: false
      },
    ]
  }
})

const layoutTitle = computed(() => {
  return authStore.isOrganizer ?   'Organizer' : 'Team Events'
})

const roleLabel = computed(() => {
  return authStore. isOrganizer ? 'Event Organizer' : 'Team Member'
})

const handleLogout = async () => {
  await authStore.logout()
  router.push('/')
}

const isActive = (item) => {
  if (item.exact) {
    return route.path === item.href
  } else {
    return route.path.startsWith(item.href)
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Mobile Header -->
    <div class="md:hidden bg-gradient-to-r from-dark-900 via-primary-900 to-dark-900 shadow-xl fixed top-0 left-0 right-0 z-50 border-b border-primary-800">
      <div class="flex items-center justify-between px-4 py-3">
        <div class="flex items-center space-x-3">
          <RouterLink to="/" class="flex items-center space-x-2">
            <img 
              src="/logo_w.svg" 
              alt="Eternity Tickets" 
              class="h-10 w-auto"
              @error="$event.target.src = '/logo_w.svg'"
            />
          </RouterLink>
          <span class="text-sm font-bold text-white">{{ layoutTitle }}</span>
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

    <!-- Spacer for fixed mobile header -->
    <div class="md:hidden h-[56px]"></div>

    <div class="flex">
      <!-- Sidebar -->
      <aside 
        :class="[
          'fixed md:sticky md:top-0 left-0 h-screen z-40 transition-transform duration-300',
          'w-72 flex flex-col',
          'bg-gradient-to-b from-dark-900 via-dark-800 to-dark-900',
          'shadow-2xl',
          sidebarOpen ? 'translate-x-0 top-[56px] md:top-0' : '-translate-x-full md:translate-x-0'
        ]"
      >
        <!-- Logo Section - Desktop -->
        <div class="hidden md:block p-6 border-b border-white/10">
          <RouterLink to="/" class="flex items-center space-x-3 group">
            <img 
              src="/logo_w.svg" 
              alt="Eternity Tickets" 
              class="h-12 w-auto transform group-hover:scale-110 transition-transform"
              @error="$event.target.src = '/logo_w.svg'"
            />
            <div>
              <span class="text-lg font-bold text-white block">Eternity Tickets</span>
              <span class="text-xs text-gray-400">{{ layoutTitle }}</span>
            </div>
          </RouterLink>
        </div>

        <!-- User Profile Card - Compact -->
        <div class="p-4 border-b border-white/10">
          <div class="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-600 rounded-lg flex items-center justify-center shadow-lg flex-shrink-0">
                <span class="text-white font-bold text-sm">
                  {{ authStore.user?.first_name?.charAt(0) }}{{ authStore.user?.last_name?.charAt(0) }}
                </span>
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-bold text-white text-sm truncate">{{ authStore.fullName }}</p>
                <div class="flex items-center gap-2 mt-1">
                  <span class="text-xs text-gray-400">{{ roleLabel }}</span>
                  <!-- Premium Badge -->
                  <span 
                    v-if="authStore.membershipTier === 'premium'"
                    class="inline-flex items-center bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-2 py-0.5 rounded-full text-xs font-bold"
                  >
                    <BoltIcon class="w-3 h-3 mr-0.5" />
                    Premium
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <nav class="flex-1 overflow-y-auto p-4 space-y-2">
          <RouterLink
            v-for="item in navigation"
            :key="item.name"
            :to="item.href"
            @click="sidebarOpen = false"
            :class="[
              'group flex items-center space-x-3 px-4 py-3 rounded-xl transition-all relative overflow-hidden',
              isActive(item)
                ? 'bg-gradient-to-r ' + item.gradient + ' text-white shadow-lg transform scale-105'
                : 'text-gray-300 hover:bg-white/5 hover:text-white'
            ]"
          >
            <div 
              v-if="isActive(item)"
              class="absolute inset-0 bg-white/10 rounded-xl"
            ></div>
            
            <component 
              :is="item.icon" 
              :class="[
                'w-5 h-5 relative z-10 flex-shrink-0',
                ! isActive(item) && 'group-hover:scale-110 transition-transform'
              ]"
            />
            <span class="font-semibold relative z-10 text-sm">{{ item.name }}</span>
            
            <div 
              v-if="isActive(item)"
              class="absolute right-4 w-2 h-2 bg-white rounded-full"
            ></div>
          </RouterLink>
        </nav>

        <!-- Footer Actions -->
        <div class="p-4 border-t border-white/10 space-y-2">
          <RouterLink
            to="/"
            @click="sidebarOpen = false"
            class="flex items-center space-x-3 px-4 py-2 rounded-xl text-gray-300 hover:bg-white/5 hover:text-white transition-all group"
          >
            <HomeIcon class="w-5 h-5 group-hover:scale-110 transition-transform flex-shrink-0" />
            <span class="font-medium text-sm">Back to Home</span>
          </RouterLink>

          <button 
            @click="handleLogout"
            class="flex items-center space-x-3 px-4 py-2 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 w-full transition-all group"
          >
            <ArrowRightOnRectangleIcon class="w-5 h-5 group-hover:scale-110 transition-transform flex-shrink-0" />
            <span class="font-medium text-sm">Logout</span>
          </button>
        </div>
      </aside>

      <div 
        v-if="sidebarOpen"
        @click="sidebarOpen = false"
        class="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
        style="top: 56px;"
      ></div>

      <main class="flex-1 min-h-screen">
        <div class="p-4 md:p-8">
          <RouterView />
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
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