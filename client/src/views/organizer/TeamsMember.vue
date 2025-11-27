<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { eventsAPI } from '@/api/events'
import { UsersIcon, CalendarIcon } from '@heroicons/vue/24/outline'

const router = useRouter()
const authStore = useAuthStore()
const loading = ref(true)
const teamEvents = ref([])

const getRoleBadge = (role) => {
  const badges = {
    'owner': { text: 'Owner', class: 'bg-purple-100 text-purple-700' },
    'manager': { text: 'Manager', class: 'bg-blue-100 text-blue-700' },
    'checkin_staff': { text: 'Check-in Staff', class: 'bg-green-100 text-green-700' }
  }
  return badges[role] || { text: role, class: 'bg-gray-100 text-gray-700' }
}

const goToEvent = (event) => {
  console.log('🔍 Navigation Debug:')
  console.log('  User role:', authStore.user?.role)
  console.log('  Event:', event.title)
  console. log('  Member role:', event.member_role)

  // Navigate dựa trên role
  if (event.member_role === 'checkin_staff') {
    // Staff chỉ có quyền check-in
    const path = `/organizer/events/${event.id}/checkin`
    console.log('  → Navigating to:', path)
    router.push(path)
  } else if (event.member_role === 'manager' || event.member_role === 'owner') {
    const path = `/organizer/events/${event.id}/overview`
    console.log('  → Navigating to:', path)
    router.push(path)
  }
}

const fetchTeamEvents = async () => {
  loading.value = true
  try {
    const response = await eventsAPI.getMyTeamEvents()
    console.log('✅ Team events loaded:', response.data) 
    teamEvents.value = response.data.data?.events || response.data.events || []
    console. log('👤 Current user role:', authStore.user?.role)
    console.log('📊 Total events:', teamEvents.value.length)
    
  } catch (error) {
    console.error('❌ Failed to fetch team events:', error)
    alert('Failed to load team events')
  } finally {
    loading. value = false
  }
}

// const roleOptions = computed(() => {
//   if (userEventRole.value === 'manager') {
//     // Manager chỉ thêm được Check-in Staff
//     return [
//       { value: 'checkin_staff', label: 'Check-in Staff', description: 'Can check-in attendees' }
//     ]
//   } else {
//     // Owner thêm được Manager hoặc Check-in Staff
//     return [
//       { value: 'manager', label: 'Manager', description: 'Can view orders, manage team (add checkin staff), and check-in' },
//       { value: 'checkin_staff', label: 'Check-in Staff', description: 'Can check-in attendees only' }
//     ]
//   }
// })

onMounted(async() => {
  await fetchTeamEvents()
})
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <div class="mb-8">
      <h1 class="text-3xl font-bold mb-2 flex items-center gap-2">
        <UsersIcon class="w-8 h-8" />
        My Team Events
      </h1>
      <p class="text-gray-600">Events where you are a team member</p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12">
      <p class="text-gray-500">Loading... </p>
    </div>

    <!-- Empty State -->
    <div v-else-if="!teamEvents || teamEvents.length === 0" class="text-center py-12">
      <UsersIcon class="w-16 h-16 mx-auto text-gray-300 mb-4" />
      <p class="text-gray-500 mb-2">You are not a member of any event teams yet.</p>
      <p class="text-sm text-gray-400">
        Event organizers can add you as a team member to collaborate on their events.
      </p>
    </div>

    <!-- Team Events List -->
    <div v-else class="grid gap-4">
      <div
        v-for="event in teamEvents"
        :key="event.id"
        class="card hover:shadow-lg transition-shadow cursor-pointer"
        @click="goToEvent(event)"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center gap-3 mb-2">
              <h3 class="text-xl font-semibold">{{ event.title }}</h3>
              <span
                :class="[
                  'px-3 py-1 text-xs font-medium rounded-full',
                  getRoleBadge(event.member_role).class
                ]"
              >
                {{ getRoleBadge(event.member_role).text }}
              </span>
            </div>

            <div class="text-sm text-gray-600 space-y-1">
              <p class="flex items-center gap-2">
                <CalendarIcon class="w-4 h-4" />
                {{ new Date(event.start_date).toLocaleDateString() }}
              </p>
               <p v-if="event.venue_name">
                <strong>Venue:</strong> {{ event.venue_name }}
              </p>
              <p v-if="event.venue_city">
                <strong>City:</strong> {{ event.venue_city }}
              </p>
              <p>
                <strong>Organizer:</strong> 
                {{ event.owner_first_name }} {{ event.owner_last_name }}
                ({{ event.owner_email }})
              </p>
              <p>
                <strong>Added:</strong> 
                {{ new Date(event.added_at).toLocaleDateString() }}
              </p>
            </div>
          </div>

          <button class="btn btn-accent btn-sm mt-2">
            {{ event.member_role === 'checkin_staff' ? 'Go to Check-in' : 'Manage Event' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>