<script setup>
import { ref } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AppSidebar from '@/components/layout/AppSidebar.vue'
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
  ArrowRightOnRectangleIcon
} from '@heroicons/vue/24/outline'

const route = useRoute()
const authStore = useAuthStore()
const sidebarOpen = ref(false)

const navigation = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: HomeIcon },
  { name: 'Users', href: '/admin/users', icon: UsersIcon },
  { name: 'Events', href: '/admin/events', icon: CalendarIcon },
  { name: 'Sub-Admins', href: '/admin/sub-admins', icon: ShieldCheckIcon, adminOnly: true },
  { name: 'Refunds', href: '/admin/refunds', icon: CurrencyDollarIcon },
  { name: 'Settings', href: '/admin/settings', icon: Cog6ToothIcon, adminOnly: true },
  { name: 'Audit Logs', href: '/admin/audit-logs', icon: DocumentTextIcon },
]

const filteredNavigation = navigation.filter(item => 
  !item.adminOnly || authStore.isMainAdmin
)

const handleLogout = async () => {
  await authStore.logout()
}

const isActive = (href) => route.path.startsWith(href)
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <div class="md:hidden bg-red-600 text-white shadow-sm sticky top-0 z-40">
      <div class="flex items-center justify-between px-4 py-3">
        <h1 class="text-lg font-semibold">Admin Panel</h1>
        <button @click="sidebarOpen = !sidebarOpen" class="text-white">
          <Bars3Icon v-if="!sidebarOpen" class="w-6 h-6" />
          <XMarkIcon v-else class="w-6 h-6" />
        </button>
      </div>
    </div>

    <div class="flex">
       <aside 
        :class="[
          'fixed md:sticky top-0 left-0 h-screen bg-red-600 text-white shadow-lg z-30 transition-transform duration-300',
          'w-64 flex flex-col',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        ]"
      >
        <div class="hidden md:flex items-center space-x-3 p-6 border-b border-red-500">
          <RouterLink to="/" class="flex items-center space-x-2">
            <ShieldCheckIcon class="w-10 h-10" />
            <span class="text-xl font-bold">Admin Panel</span>
          </RouterLink> 
        </div>

        <div class="p-6 border-b border-red-500">
          <div class="flex items-center space-x-3">
            <div class="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
              <span class="font-semibold text-lg">
                {{ authStore.user?.first_name?.charAt(0) }}
              </span>
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-semibold truncate">{{ authStore.fullName }}</p>
              <p class="text-sm text-red-200">
                {{ authStore.isMainAdmin ? 'Admin' : 'Sub-Admin' }}
              </p>
            </div>
          </div>
        </div>

        <nav class="flex-1 overflow-y-auto p-4">
          <RouterLink
            v-for="item in filteredNavigation"
            :key="item.name"
            :to="item.href"
            @click="sidebarOpen = false"
            :class="[
              'flex items-center space-x-3 px-4 py-3 rounded-lg mb-1 transition-colors',
              isActive(item.href)
                ? 'bg-red-500 font-medium'
                : 'hover:bg-red-500/50'
            ]"
          >
            <component :is="item.icon" class="w-5 h-5" />
            <span>{{ item.name }}</span>
          </RouterLink>
        </nav>

        <div class="p-4 border-t border-red-500">
          <button 
            @click="authStore.logout()"
            class="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-red-500/50 w-full transition-colors"
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