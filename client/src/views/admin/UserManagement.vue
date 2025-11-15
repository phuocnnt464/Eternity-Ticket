<script setup>
import { ref, computed, onMounted } from 'vue'
import { adminAPI } from '@/api/admin.js'
import Card from '@/components/common/Card.vue'
import Button from '@/components/common/Button.vue'
import Badge from '@/components/common/Badge.vue'
import Pagination from '@/components/common/Pagination.vue'
import Spinner from '@/components/common/Spinner.vue'
import Modal from '@/components/common/Modal.vue'
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  LockClosedIcon,
  LockOpenIcon,
  TrashIcon,
  UserIcon
} from '@heroicons/vue/24/outline'

const loading = ref(true)
const users = ref([])
const searchQuery = ref('')
const selectedRole = ref('all')
const selectedStatus = ref('all')
const showDetailModal = ref(false)
const selectedUser = ref(null)
const actionLoading = ref(false)

const pagination = ref({
  currentPage: 1,
  totalPages: 1,
  totalItems: 0,
  perPage: 20
})

const roleOptions = [
  { value: 'all', label: 'All Roles' },
  { value: 'participant', label: 'Participants' },
  { value: 'organizer', label: 'Organizers' },
  { value: 'sub_admin', label: 'Sub Admins' }
]

const statusOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' }
]

const filteredUsers = computed(() => {
  let result = users.value

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(user =>
      user.first_name?.toLowerCase().includes(query) ||
      user.last_name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query)
    )
  }

  if (selectedRole.value !== 'all') {
    result = result.filter(user => user.role === selectedRole.value)
  }

  if (selectedStatus.value !== 'all') {
    result = result.filter(user => user.is_active === (selectedStatus.value === 'active'))
  }

  return result
})

const getRoleBadge = (role) => {
  const badges = {
    admin: { variant: 'danger', text: 'Admin' },
    sub_admin: { variant: 'warning', text: 'Sub Admin' },
    organizer: { variant: 'primary', text: 'Organizer' },
    participant: { variant: 'info', text: 'Participant' }
  }
  return badges[role] || badges.participant
}

const getMembershipBadge = (tier) => {
  const badges = {
    basic: { variant: 'info', text: 'Basic' },
    premium: { variant: 'warning', text: 'Premium' },
    vip: { variant: 'success', text: 'VIP' }
  }
  return badges[tier] || badges.basic
}

const fetchUsers = async () => {
  loading.value = true
  try {
    const response = await adminAPI.getAllUsers({
      page: pagination.value.currentPage,
      limit: pagination.value.perPage
    })
    
    users.value = response.data.users || []
    pagination.value.totalItems = response.data.pagination?.total || 0
    pagination.value.totalPages = response.data.pagination?.totalPages ||Math.ceil(pagination.value.totalItems / pagination.value.perPage)
  } catch (error) {
    console.error('Failed to fetch users:', error)
    console.error('Error response:', error.response)
  } finally {
    loading.value = false
  }
}

const handleViewDetails = (user) => {
  selectedUser.value = user
  showDetailModal.value = true
}

const handleToggleStatus = async (userId, currentStatus) => {
  const action = currentStatus ? 'deactivate' : 'activate'
  if (!confirm(`Are you sure you want to ${action} this user?`)) return

  actionLoading.value = true
  try {
    await adminAPI.toggleUserStatus(userId, { is_active: !currentStatus })
    alert(`User ${action}d successfully!`)
    showDetailModal.value = false
    await fetchUsers()
  } catch (error) {
    alert(error.response?.data?.error?.message || `Failed to ${action} user`)
  } finally {
    actionLoading.value = false
  }
}

const handleDeleteUser = async (userId, userName) => {
  if (!confirm(`Delete user "${userName}"? This action cannot be undone.`)) return

  actionLoading.value = true
  try {
    await adminAPI.deleteUser(userId)
    alert('User deleted successfully')
    showDetailModal.value = false
    await fetchUsers()
  } catch (error) {
    alert(error.response?.data?.error?.message || 'Failed to delete user')
  } finally {
    actionLoading.value = false
  }
}

const handlePageChange = (page) => {
  pagination.value.currentPage = page
  fetchUsers()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => {
  fetchUsers()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-2xl font-bold text-gray-900">User Management</h1>
      <p class="text-gray-600 mt-1">Manage all users in the system</p>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
      <Card>
        <div class="text-center">
          <p class="text-gray-600 text-sm mb-2">Total Users</p>
          <p class="text-3xl font-bold text-gray-900">{{ pagination.totalItems }}</p>
        </div>
      </Card>
      <Card>
        <div class="text-center">
          <p class="text-gray-600 text-sm mb-2">Participants</p>
          <p class="text-3xl font-bold text-blue-600">
            {{ users.filter(u => u.role === 'participant').length }}
          </p>
        </div>
      </Card>
      <Card>
        <div class="text-center">
          <p class="text-gray-600 text-sm mb-2">Organizers</p>
          <p class="text-3xl font-bold text-purple-600">
            {{ users.filter(u => u.role === 'organizer').length }}
          </p>
        </div>
      </Card>
      <Card>
        <div class="text-center">
          <p class="text-gray-600 text-sm mb-2">Sub Admins</p>
          <p class="text-3xl font-bold text-yellow-600">
            {{ users.filter(u => u.role === 'sub_admin').length }}
          </p>
        </div>
      </Card>
    </div>

    <!-- Search & Filters -->
    <Card>
      <div class="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
        <!-- Search -->
        <div class="flex-1 max-w-md">
          <div class="relative">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search by name or email..."
              class="input pl-10"
            />
            <MagnifyingGlassIcon class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        <!-- Filters -->
        <div class="flex items-center space-x-2">
          <FunnelIcon class="w-5 h-5 text-gray-400" />
          <select v-model="selectedRole" class="select">
            <option
              v-for="option in roleOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
          <select v-model="selectedStatus" class="select">
            <option
              v-for="option in statusOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </div>
      </div>
    </Card>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <Spinner size="xl" />
    </div>

    <!-- Users Table -->
    <Card v-else-if="filteredUsers.length > 0" no-padding>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 border-b">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Membership</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr
              v-for="user in filteredUsers"
              :key="user.user_id"
              class="hover:bg-gray-50"
            >
              <td class="px-6 py-4">
                <div class="flex items-center space-x-3">
                  <div class="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                    <span class="text-primary-600 font-semibold">
                      {{ user.first_name?.charAt(0) || 'U' }}
                    </span>
                  </div>
                  <div>
                    <p class="font-medium text-gray-900">
                      {{ user.first_name }} {{ user.last_name }}
                    </p>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <span class="text-sm text-gray-900">{{ user.email }}</span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <Badge :variant="getRoleBadge(user.role).variant">
                  {{ getRoleBadge(user.role).text }}
                </Badge>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <Badge :variant="getMembershipBadge(user.membership_tier).variant">
                  {{ getMembershipBadge(user.membership_tier).text }}
                </Badge>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <Badge :variant="user.is_active ? 'success' : 'danger'">
                  {{ user.is_active ? 'Active' : 'Inactive' }}
                </Badge>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ new Date(user.created_at).toLocaleDateString() }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <Button
                  variant="ghost"
                  size="sm"
                  @click="handleViewDetails(user)"
                >
                  <EyeIcon class="w-4 h-4" />
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="pagination.totalPages > 1" class="p-6 border-t">
        <Pagination
          v-model:current-page="pagination.currentPage"
          :total-pages="pagination.totalPages"
          @update:current-page="handlePageChange"
        />
      </div>
    </Card>

    <!-- Empty State -->
    <Card v-else class="text-center py-12">
      <UserIcon class="w-16 h-16 text-gray-400 mx-auto mb-4" />
      <p class="text-gray-500">No users found</p>
    </Card>

    <!-- User Detail Modal -->
    <Modal
      v-model="showDetailModal"
      title="User Details"
      size="lg"
    >
      <div v-if="selectedUser" class="space-y-4">
        <!-- User Info -->
        <div class="flex items-center space-x-4 pb-4 border-b">
          <div class="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
            <span class="text-primary-600 font-bold text-2xl">
              {{ selectedUser.first_name?.charAt(0) || 'U' }}
            </span>
          </div>
          <div class="flex-1">
            <h3 class="text-xl font-bold">
              {{ selectedUser.first_name }} {{ selectedUser.last_name }}
            </h3>
            <p class="text-gray-600">{{ selectedUser.email }}</p>
            <div class="flex items-center space-x-2 mt-2">
              <Badge :variant="getRoleBadge(selectedUser.role).variant">
                {{ getRoleBadge(selectedUser.role).text }}
              </Badge>
              <Badge :variant="selectedUser.is_active ? 'success' : 'danger'">
                {{ selectedUser.is_active ? 'Active' : 'Inactive' }}
              </Badge>
            </div>
          </div>
        </div>

        <!-- Details -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <p class="text-sm text-gray-600">Phone</p>
            <p class="font-medium">{{ selectedUser.phone || 'N/A' }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600">Membership</p>
            <Badge :variant="getMembershipBadge(selectedUser.membership_tier).variant">
              {{ getMembershipBadge(selectedUser.membership_tier).text }}
            </Badge>
          </div>
          <div>
            <p class="text-sm text-gray-600">Joined Date</p>
            <p class="font-medium">{{ new Date(selectedUser.created_at).toLocaleDateString() }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600">Last Login</p>
            <p class="font-medium">
              {{ selectedUser.last_login ? new Date(selectedUser.last_login).toLocaleDateString() : 'Never' }}
            </p>
          </div>
        </div>

        <!-- Stats (if organizer) -->
        <div v-if="selectedUser.role === 'organizer'" class="pt-4 border-t">
          <h4 class="font-semibold mb-3">Organizer Stats</h4>
          <div class="grid grid-cols-3 gap-4">
            <div class="text-center p-3 bg-gray-50 rounded-lg">
              <p class="text-2xl font-bold text-primary-600">{{ selectedUser.total_events || 0 }}</p>
              <p class="text-sm text-gray-600">Events</p>
            </div>
            <div class="text-center p-3 bg-gray-50 rounded-lg">
              <p class="text-2xl font-bold text-green-600">{{ selectedUser.total_tickets_sold || 0 }}</p>
              <p class="text-sm text-gray-600">Tickets Sold</p>
            </div>
            <div class="text-center p-3 bg-gray-50 rounded-lg">
              <p class="text-2xl font-bold text-purple-600">
                {{ selectedUser.total_revenue ? `${(selectedUser.total_revenue / 1000000).toFixed(1)}M` : '0' }}
              </p>
              <p class="text-sm text-gray-600">Revenue (VND)</p>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex space-x-3">
          <Button
            v-if="selectedUser?.role !== 'admin'"
            :variant="selectedUser?.is_active ? 'warning' : 'success'"
            :loading="actionLoading"
            @click="handleToggleStatus(selectedUser.user_id, selectedUser.is_active)"
            full-width
          >
            <component :is="selectedUser?.is_active ? LockClosedIcon : LockOpenIcon" class="w-5 h-5" />
            {{ selectedUser?.is_active ? 'Deactivate' : 'Activate' }}
          </Button>
          <Button
            v-if="selectedUser?.role !== 'admin'"
            variant="danger"
            :loading="actionLoading"
            @click="handleDeleteUser(selectedUser.user_id, `${selectedUser.first_name} ${selectedUser.last_name}`)"
            full-width
          >
            <TrashIcon class="w-5 h-5" />
            Delete
          </Button>
        </div>
      </template>
    </Modal>
  </div>
</template>