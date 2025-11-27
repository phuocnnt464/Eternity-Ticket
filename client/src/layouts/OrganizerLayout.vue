<script setup>
import { ref, computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
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
  ArrowRightOnRectangleIcon
} from '@heroicons/vue/24/outline'

const route = useRoute()
const authStore = useAuthStore()
const sidebarOpen = ref(false)

const navigation = computed(() => {
  if (authStore.isOrganizer) {
    // Navigation cho Organizer (owner)
    return [
      { name: 'Dashboard', href: '/organizer/dashboard', icon: HomeIcon },
      { name: 'My Events', href: '/organizer/events', icon: CalendarIcon },
      { name: 'Create Event', href: '/organizer/events/create', icon: PlusCircleIcon },
    ]
  } else {
    // Navigation cho Participant (team member)
    return [
      { name: 'My Team Events', href: '/organizer/teams', icon: UsersIcon },
    ]
  }
})

const layoutTitle = computed(() => {
  return authStore.isOrganizer ?  'Organizer Dashboard' : 'Team Events'
})

const roleLabel = computed(() => {
  return authStore.isOrganizer ? 'Organizer' : 'Team Member'
})

const handleLogout = async () => {
  await authStore.logout()
}

const isActive = (href) => route.path.startsWith(href)
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Similar structure to ParticipantLayout but with organizer navigation -->
    <div class="md:hidden bg-white shadow-sm sticky top-0 z-40">
      <div class="flex items-center justify-between px-4 py-3">
        <h1 class="text-lg font-semibold">{{ layoutTitle }}</h1>
        <button @click="sidebarOpen = !sidebarOpen" class="btn-ghost btn-sm">
          <Bars3Icon v-if="!sidebarOpen" class="w-6 h-6" />
          <XMarkIcon v-else class="w-6 h-6" />
        </button>
      </div>
    </div>

    <div class="flex">
      <!-- Sidebar -->
      <aside 
        :class="[
          'fixed md:sticky top-0 left-0 h-screen bg-white shadow-lg z-30 transition-transform duration-300',
          'w-64 flex flex-col',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        ]"
      >
        <div class="hidden md:flex items-center space-x-3 p-6 border-b">
          <RouterLink to="/" class="flex items-center space-x-2">
            <div class="w-10 h-10 bg-gradient-to-br from-primary-600 to-accent-600 rounded-lg flex items-center justify-center">
              <span class="text-white font-bold text-xl">ET</span>
            </div>
            <span class="text-xl font-bold">{{ layoutTitle }}</span>
          </RouterLink>
        </div>

        <div class="p-6 border-b">
          <div class="flex items-center space-x-3">
            <div class="w-12 h-12 bg-accent-100 rounded-full flex items-center justify-center">
              <span class="text-accent-600 font-semibold text-lg">
                {{ authStore.user?.first_name?.charAt(0) }}
              </span>
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-semibold truncate">{{ authStore.fullName }}</p>
              <p class="text-sm text-gray-500">{{ roleLabel }}</p>
            </div>
          </div>
        </div>

        <nav class="flex-1 overflow-y-auto p-4">
          <RouterLink
            v-for="item in navigation"
            :key="item. name"
            :to="item.href"
            @click="sidebarOpen = false"
            :class="[
              'flex items-center space-x-3 px-4 py-3 rounded-lg mb-1 transition-colors',
              isActive(item.href)
                ? 'bg-accent-50 text-accent-600 font-medium'
                : 'text-gray-700 hover:bg-gray-50'
            ]"
          >
            <component :is="item.icon" class="w-5 h-5" />
            <span>{{ item.name }}</span>
          </RouterLink>
        </nav>

        <div class="p-4 border-t">
          <button 
            @click="handleLogout"
            class="flex items-center space-x-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 w-full transition-colors"
          >
            <ArrowRightOnRectangleIcon class="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <div 
        v-if="sidebarOpen"
        @click="sidebarOpen = false"
        class="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
      ></div>

      <main class="flex-1 p-4 md:p-8">
        <RouterView />
      </main>
    </div>
  </div>
</template>
