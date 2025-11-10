<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { eventsAPI, usersAPI } from '@/api'
import Card from '@/components/common/Card.vue'
import Button from '@/components/common/Button.vue'
import Input from '@/components/common/Input.vue'
import Badge from '@/components/common/Badge.vue'
import Modal from '@/components/common/Modal.vue'
import Spinner from '@/components/common/Spinner.vue'
import {
  ArrowLeftIcon,
  UserPlusIcon,
  TrashIcon,
  EnvelopeIcon,
  UserIcon
} from '@heroicons/vue/24/outline'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const eventId = ref(route.params.id)
const event = ref(null)
const teamMembers = ref([])
const showInviteModal = ref(false)
const inviting = ref(false)

const inviteForm = ref({
  email: '',
  role: 'staff'
})

const inviteErrors = ref({})

const roleOptions = [
  { value: 'staff', label: 'Staff', description: 'Can check-in attendees' },
  { value: 'manager', label: 'Manager', description: 'Can manage event and team' }
]

const getRoleBadge = (role) => {
  const badges = {
    manager: { variant: 'primary', text: 'Manager' },
    staff: { variant: 'info', text: 'Staff' }
  }
  return badges[role] || badges.staff
}

const fetchTeamMembers = async () => {
  loading.value = true
  try {
    const [eventRes, teamRes] = await Promise.all([
      eventsAPI.getEventById(eventId.value),
      eventsAPI.getEventTeam(eventId.value)
    ])
    
    event.value = eventRes.data.data
    teamMembers.value = teamRes.data.data || []
  } catch (error) {
    console.error('Failed to fetch team members:', error)
  } finally {
    loading.value = false
  }
}

const validateInvite = () => {
  inviteErrors.value = {}
  
  if (!inviteForm.value.email) {
    inviteErrors.value.email = 'Email is required'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteForm.value.email)) {
    inviteErrors.value.email = 'Invalid email format'
  }
  
  return Object.keys(inviteErrors.value).length === 0
}

const handleInvite = async () => {
  if (!validateInvite()) return
  
  inviting.value = true
  try {
    await eventsAPI.inviteTeamMember(eventId.value, inviteForm.value)
    
    alert('Invitation sent successfully!')
    showInviteModal.value = false
    inviteForm.value = { email: '', role: 'staff' }
    await fetchTeamMembers()
  } catch (error) {
    inviteErrors.value.general = error.response?.data?.error?.message || 'Failed to send invitation'
  } finally {
    inviting.value = false
  }
}

const handleRemoveMember = async (memberId, memberName) => {
  if (!confirm(`Remove ${memberName} from the team?`)) return
  
  try {
    await eventsAPI.removeTeamMember(eventId.value, memberId)
    alert('Team member removed')
    await fetchTeamMembers()
  } catch (error) {
    alert(error.response?.data?.error?.message || 'Failed to remove team member')
  }
}

const handleChangeRole = async (memberId, currentRole) => {
  const newRole = currentRole === 'manager' ? 'staff' : 'manager'
  
  if (!confirm(`Change role to ${newRole}?`)) return
  
  try {
    await eventsAPI.updateTeamMemberRole(eventId.value, memberId, { role: newRole })
    alert('Role updated')
    await fetchTeamMembers()
  } catch (error) {
    alert(error.response?.data?.error?.message || 'Failed to update role')
  }
}

onMounted(() => {
  fetchTeamMembers()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <button
          @click="router.push('/organizer/events')"
          class="flex items-center text-gray-600 hover:text-gray-900 mb-2"
        >
          <ArrowLeftIcon class="w-5 h-5 mr-2" />
          Back to Events
        </button>
        <h1 class="text-2xl font-bold text-gray-900">Team Management</h1>
        <p v-if="event" class="text-gray-600 mt-1">{{ event.title }}</p>
      </div>
      <Button variant="primary" @click="showInviteModal = true">
        <UserPlusIcon class="w-5 h-5" />
        Invite Team Member
      </Button>
    </div>

    <!-- Info Card -->
    <Card class="bg-blue-50 border-blue-200">
      <div class="flex items-start space-x-3">
        <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
          <UserIcon class="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 class="font-semibold text-blue-900 mb-1">Team Roles</h3>
          <ul class="text-sm text-blue-800 space-y-1">
            <li>• <strong>Manager:</strong> Can manage event details, team, and view all data</li>
            <li>• <strong>Staff:</strong> Can check-in attendees at the event</li>
          </ul>
        </div>
      </div>
    </Card>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <Spinner size="xl" />
    </div>

    <!-- Team Members List -->
    <div v-else>
      <Card v-if="teamMembers.length > 0">
        <div class="divide-y divide-gray-200">
          <div
            v-for="member in teamMembers"
            :key="member.team_member_id"
            class="py-4 first:pt-0 last:pb-0"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-4 flex-1">
                <!-- Avatar -->
                <div class="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span class="text-primary-600 font-semibold text-lg">
                    {{ member.first_name?.charAt(0) || 'U' }}
                  </span>
                </div>

                <!-- Info -->
                <div class="flex-1 min-w-0">
                  <h3 class="font-semibold text-gray-900">
                    {{ member.first_name }} {{ member.last_name }}
                  </h3>
                  <p class="text-sm text-gray-600">{{ member.email }}</p>
                  <div class="flex items-center space-x-2 mt-1">
                    <Badge :variant="getRoleBadge(member.role).variant">
                      {{ getRoleBadge(member.role).text }}
                    </Badge>
                    <Badge
                      v-if="member.status === 'pending'"
                      variant="warning"
                    >
                      Invitation Pending
                    </Badge>
                  </div>
                </div>
              </div>

              <!-- Actions -->
              <div class="flex items-center space-x-2">
                <Button
                  variant="secondary"
                  size="sm"
                  @click="handleChangeRole(member.team_member_id, member.role)"
                >
                  Change Role
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  @click="handleRemoveMember(member.team_member_id, member.first_name)"
                >
                  <TrashIcon class="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <!-- Empty State -->
      <Card v-else class="text-center py-12">
        <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <UserIcon class="w-10 h-10 text-gray-400" />
        </div>
        <h3 class="text-xl font-semibold text-gray-900 mb-2">No team members yet</h3>
        <p class="text-gray-600 mb-6">
          Invite team members to help manage your event
        </p>
        <Button variant="primary" @click="showInviteModal = true">
          <UserPlusIcon class="w-5 h-5" />
          Invite Team Member
        </Button>
      </Card>
    </div>

    <!-- Invite Modal -->
    <Modal
      v-model="showInviteModal"
      title="Invite Team Member"
      size="md"
    >
      <div v-if="inviteErrors.general" class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4 text-sm">
        {{ inviteErrors.general }}
      </div>

      <form @submit.prevent="handleInvite" class="space-y-4">
        <Input
          v-model="inviteForm.email"
          type="email"
          label="Email Address"
          placeholder="colleague@example.com"
          :error="inviteErrors.email"
          :icon="EnvelopeIcon"
          help-text="An invitation will be sent to this email"
          required
        />

        <div>
          <label class="label label-required">Role</label>
          <div class="space-y-2">
            <label
              v-for="option in roleOptions"
              :key="option.value"
              :class="[
                'border-2 rounded-lg p-3 cursor-pointer transition-all flex items-start',
                inviteForm.role === option.value
                  ? 'border-primary-600 bg-primary-50'
                  : 'border-gray-300 hover:border-gray-400'
              ]"
            >
              <input
                type="radio"
                v-model="inviteForm.role"
                :value="option.value"
                class="mt-1"
              />
              <div class="ml-3">
                <p class="font-medium">{{ option.label }}</p>
                <p class="text-sm text-gray-600">{{ option.description }}</p>
              </div>
            </label>
          </div>
        </div>
      </form>

      <template #footer>
        <div class="flex space-x-3">
          <Button
            variant="secondary"
            @click="showInviteModal = false"
            full-width
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            :loading="inviting"
            @click="handleInvite"
            full-width
          >
            Send Invitation
          </Button>
        </div>
      </template>
    </Modal>
  </div>
</template>