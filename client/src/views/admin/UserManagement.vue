<script setup>
import { ref, computed, onMounted, watch } from 'vue'
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
  UserIcon,
  PencilSquareIcon
} from '@heroicons/vue/24/outline'

const loading = ref(true)
const users = ref([])
const searchQuery = ref('')
const selectedRole = ref('all')
const selectedStatus = ref('all')
const showDetailModal = ref(false)
const showChangeRoleModal = ref(false)
const selectedUser = ref(null)
const newRole = ref('')  
const actionLoading = ref(false)
const searching = ref(false)
const isSearchActive = ref(false) 

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

const changeRoleOptions = [
  { value: 'participant', label: 'Participant' },
  { value: 'organizer', label: 'Organizer' },
  { value: 'sub_admin', label: 'Sub Admin' }
]

const statusOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' }
]

// const filteredUsers = computed(() => {
//   let result = users.value

//   if (searchQuery.value) {
//     const query = searchQuery.value.toLowerCase()
//     result = result.filter(user =>
//       user.first_name?.toLowerCase().includes(query) ||
//       user.last_name?.toLowerCase().includes(query) ||
//       user.email?.toLowerCase().includes(query)
//     )
//   }

//   if (selectedRole.value !== 'all') {
//     result = result.filter(user => user.role === selectedRole.value)
//   }

//   if (selectedStatus.value !== 'all') {
//     result = result.filter(user => user.is_active === (selectedStatus.value === 'active'))
//   }

//   return result
// })

const getRoleBadge = (role) => {
  const badges = {
    admin: { variant: 'danger', text: 'Admin' },
    sub_admin: { variant: 'warning', text: 'Sub Admin' },
    organizer: { variant: 'accent', text: 'Organizer' },
    participant: { variant: 'info', text: 'Participant' }
  }
  return badges[role] || badges.participant
}

const getMembershipBadge = (tier) => {
  const badges = {
    basic: { variant: 'secondary', text: 'Basic' },
    premium: { variant: 'warning', text: 'Premium' },
    vip: { variant: 'success', text: 'VIP' }
  }
  return badges[tier] || badges.basic
}

// Search handler with debounce
let searchTimeout = null

const handleSearchInput = (event) => {
  const query = event.target.value.trim()
  searchQuery.value = query // Update reactive value
  
  // Clear existing timeout
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  
  // Case 1: Empty search → reset
  if (!query || query.trim() === '') {
    console.log('🔄 Search cleared')
    isSearchActive.value = false
    searching.value = false
    // users.value = [] // Clear users để tránh hiển thị kết quả cũ
    if (!loading.value) {
      pagination.value.currentPage = 1
      fetchUsers()
    }
    return
  }
  
  // Case 2: Query too short → wait
  if (query.length < 2) {
    console.log('⏳ Query too short:', query)
    // users.value = [] // Clear users
    return
  }
  
  // Case 3: Valid query → debounce search
  console.log('⏰ Debouncing search for:', query)
  searchTimeout = setTimeout(() => {
    console.log('🔍 Executing search for:', query)
    isSearchActive.value = true
    performSearch(query)
  }, 600) // Increase to 600ms for safer debounce
}

// Server-side search function
const performSearch = async (query) => {
  // Prevent concurrent searches
  if (searching.value) {
    console.log('⚠️ Already searching, aborting...')
    return
  }
  
  searching.value = true
  console.log('🔍 API call: searchUsers with query:', query)
  
  try {
    const response = await adminAPI.searchUsers({ 
      q: query,
      limit: 50
    })
    
    console.log('📦 API response:', response)
    
    users.value = response.data.users || []
    
    // Reset pagination for search results
    pagination.value.currentPage = 1
    pagination.value.totalItems = users.value.length
    pagination.value.totalPages = 1
    
    console.log(`✅ Search complete: ${users.value.length} users found`)
  } catch (error) {
    console.error('❌ Search error:', error)
    console.error('Error details:', error.response?.data)
    users.value = []
  } finally {
    searching.value = false
  }
}

const fetchUsers = async () => {
  // Prevent concurrent fetches
  if (loading.value) {
    console.log('⚠️ Already loading, aborting...')
    return
  }
  
  loading.value = true
  console.log('📥 Fetching users with filters:', {
    page: pagination.value.currentPage,
    role: selectedRole.value,
    status: selectedStatus.value
  })
  
  try {
    const params = {
      page: pagination.value.currentPage,
      limit: pagination.value.perPage
    }
    
    // Apply role filter
    if (selectedRole.value !== 'all') {
      params.role = selectedRole.value
    }
    
    // Apply status filter
    if (selectedStatus.value !== 'all') {
      params.is_active = selectedStatus.value === 'active'
    }
    
    const response = await adminAPI.getAllUsers(params)
    
    users.value = response.data.users || []
    
    const paginationData = response.data.pagination || {}
    pagination.value.totalItems = paginationData.total || 0
    pagination.value.totalPages = paginationData.pages || Math.ceil(paginationData.total / pagination.value.perPage)
    pagination.value.currentPage = paginationData.page || 1
    
    console.log(`✅ Fetch complete: ${users.value.length} users loaded`)
  } catch (error) {
    console.error('❌ Fetch error:', error)
    users.value = []
  } finally {
    loading.value = false
  }
}

// Clear search function
const clearSearch = () => {
  console.log('🧹 Clearing search')
  searchQuery.value = ''
  isSearchActive.value = false
  searching.value = false 
  
  // Clear timeout if exists
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  
  if (!loading.value) {
    pagination.value.currentPage = 1
    fetchUsers()
  }
}

// Watch filters to reload - only when NOT searching
watch([selectedRole, selectedStatus], () => {
  if (!isSearchActive.value) {
    console.log('🔄 Filter changed:', {
      role: selectedRole.value,
      status: selectedStatus.value
    })
    pagination.value.currentPage = 1
    fetchUsers()
  }
})

const handleViewDetails = (user) => {
  selectedUser.value = user
  showDetailModal.value = true
}

const handleOpenChangeRole = (user) => {
  selectedUser.value = user
  newRole.value = user.role
  showChangeRoleModal.value = true
}

const handleChangeRole = async () => {
  if (!newRole.value || newRole.value === selectedUser.value.role) {
    alert('Please select a different role')
    return
  }

  if (!confirm(`Change role of "${selectedUser.value.first_name} ${selectedUser.value.last_name}" to ${newRole.value}?`)) {
    return
  }

  actionLoading.value = true
  try {
    await adminAPI.updateUserRole(selectedUser.value.id, { role: newRole.value })
    alert('User role updated successfully!')
    showChangeRoleModal.value = false
    showDetailModal.value = false
    await fetchUsers()
  } catch (error) {
    alert(error.response?.data?.error?.message || 'Failed to change user role')
  } finally {
    actionLoading.value = false
  }
}

const handleReactivateAccount = async (userId, userName) => {
  if (!confirm(`Reactivate account for "${userName}"?`)) return

  actionLoading.value = true
  try {
    await adminAPI.reactivateAccount(userId)
    alert('Account reactivated successfully!')
    showDetailModal.value = false
    await fetchUsers()
  } catch (error) {
    alert(error.response?.data?.error?.message || 'Failed to reactivate account')
  } finally {
    actionLoading.value = false
  }
}

// const handleToggleStatus = async (userId, currentStatus) => {
//   const action = currentStatus ? 'deactivate' : 'activate'
//   if (!confirm(`Are you sure you want to ${action} this user?`)) return

//   actionLoading.value = true
//   try {
//     await adminAPI.toggleUserStatus(userId, { is_active: !currentStatus })
//     alert(`User ${action}d successfully!`)
//     showDetailModal.value = false
//     await fetchUsers()
//   } catch (error) {
//     alert(error.response?.data?.error?.message || `Failed to ${action} user`)
//   } finally {
//     actionLoading.value = false
//   }
// }

// const handleDeleteUser = async (userId, userName) => {
//   if (!confirm(`Delete user "${userName}"? This action cannot be undone.`)) return

//   actionLoading.value = true
//   try {
//     await adminAPI.deleteUser(userId)
//     alert('User deleted successfully')
//     showDetailModal.value = false
//     await fetchUsers()
//   } catch (error) {
//     alert(error.response?.data?.error?.message || 'Failed to delete user')
//   } finally {
//     actionLoading.value = false
//   }
// }

const handleDeactivateAccount = async (userId, userName) => {
  if (!confirm(`Deactivate account for "${userName}"? They will lose access to the system.`)) {
    return
  }

  actionLoading.value = true
  try {
    await adminAPI.deactivateAccount(userId)
    alert('Account deactivated successfully!')
    showDetailModal.value = false
    await fetchUsers()
  } catch (error) {
    alert(error.response?.data?.error?.message || 'Failed to deactivate account')
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
  loading.value = false
  searching.value = false
  isSearchActive.value = false
  searchQuery.value = ''
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
    <!-- <Card>
      <div class="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4"> -->
        <!-- Search -->
        <!-- <div class="flex-1 max-w-md">
          <div class="relative">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search by name or email..."
              class="input pl-10"
            />
            <MagnifyingGlassIcon class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div> -->

        <!-- Filters -->
        <!-- <div class="flex items-center space-x-2">
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
    </Card> -->

    <Card>
      <div class="space-y-4">
        <!-- Search Bar -->
        <div class="relative">
         <input
            :value="searchQuery"
            @input="handleSearchInput"
            type="text"
            placeholder="Search by name or email (min 2 characters)..."
            class="input pl-10 pr-10"
            :disabled="searching"
          />
          <MagnifyingGlassIcon class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          
          <!-- Loading spinner -->
          <svg 
            v-if="searching" 
            class="animate-spin h-5 w-5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24"
          >
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          
          <!-- Clear button -->
          <button
            v-else-if="searchQuery"
            @click="clearSearch"
            type="button"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- Search hint -->
        <p v-if="searchQuery && searchQuery.length < 2" class="text-sm text-amber-600">
          ⚠️ Please enter at least 2 characters to search
        </p>
        
        <p v-if="searchQuery && users.length > 0" class="text-sm text-green-600">
          ✅ Found {{ users.length }} users matching "{{ searchQuery }}"
        </p>

        <!-- Filters Row -->
        <div class="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
          <div class="flex items-center space-x-2">
            <FunnelIcon class="w-5 h-5 text-gray-400" />
            <select v-model="selectedRole" class="select" :disabled="!!searchQuery">
              <option v-for="option in roleOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>

          <div class="flex items-center space-x-2">
            <select v-model="selectedStatus" class="select" :disabled="!!searchQuery">
              <option v-for="option in statusOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>
          
          <!-- Filter hint khi đang search -->
          <p v-if="searchQuery" class="text-sm text-gray-500 italic">
            (Filters disabled during search)
          </p>
        </div>
      </div>
    </Card>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <Spinner size="xl" />
    </div>

    <!-- Users Table -->
    <!-- <Card v-else-if="filteredUsers.length > 0" no-padding> -->
     <Card v-else-if="users.length > 0" no-padding>
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
            <!-- <tr
              v-for="user in filteredUsers"
              :key="user.id"
              class="hover:bg-gray-50"
            > -->
            <tr v-for="user in users" :key="user.id" class="hover:bg-gray-50">
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
      <!-- <div v-if="pagination.totalPages > 1" class="p-6 border-t"> -->
      <div v-if="!searchQuery && pagination.totalPages > 1" class="p-6 border-t">
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
      <!-- <p class="text-gray-500">No users found</p> -->
      <h3 class="text-xl font-semibold text-gray-900 mb-2">
        {{ searchQuery ? 'No users found' : 'No users yet' }}
      </h3>
      <p class="text-gray-600">
        {{ searchQuery 
          ? `No users match "${searchQuery}". Try a different search.` 
          : 'Users will appear here once they register.' 
        }}
      </p>
      <Button v-if="searchQuery" variant="secondary" @click="clearSearch" class="mt-4">
        Clear Search
      </Button>
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
        <div class="flex flex-col space-y-2">
          <!-- Change Role Button -->
          <Button
            v-if="selectedUser?.role !== 'admin'"
            variant="primary"
            :loading="actionLoading"
            @click="handleOpenChangeRole(selectedUser)"
            full-width
          >
            <PencilSquareIcon class="w-5 h-5" />
            Change Role
          </Button>

           <!-- Deactivate Button (chỉ hiện cho active users, không phải admin) -->
          <Button
            v-if="selectedUser?.is_active && selectedUser?.role !== 'admin'"
            variant="danger"
            :loading="actionLoading"
            @click="handleDeactivateAccount(selectedUser.id, `${selectedUser.first_name} ${selectedUser.last_name}`)"
            full-width
          >
            <LockClosedIcon class="w-5 h-5" />
            Deactivate Account
          </Button>

          <!-- Reactivate Button (chỉ hiện cho inactive users) -->
          <Button
            v-if="!selectedUser?.is_active && selectedUser?.role !== 'admin'"
            variant="success"
            :loading="actionLoading"
            @click="handleReactivateAccount(selectedUser.id, `${selectedUser.first_name} ${selectedUser.last_name}`)"
            full-width
          >
            <LockOpenIcon class="w-5 h-5" />
            Reactivate Account
          </Button>
        </div>
      </template>
    </Modal>

    <!-- Change Role Modal -->
    <Modal
      v-model="showChangeRoleModal"
      title="Change User Role"
      size="md"
    >
      <div v-if="selectedUser" class="space-y-4">
        <p class="text-gray-600">
          Change role for <strong>{{ selectedUser.first_name }} {{ selectedUser.last_name }}</strong>
        </p>

        <div>
          <label class="label">Current Role</label>
          <Badge :variant="getRoleBadge(selectedUser.role).variant">
            {{ getRoleBadge(selectedUser.role).text }}
          </Badge>
        </div>

        <div>
          <label class="label">New Role</label>
          <select v-model="newRole" class="select">
            <option
              v-for="option in changeRoleOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </div>

        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p class="text-sm text-yellow-800">
            ⚠️ Changing user role will affect their access permissions immediately.
          </p>
        </div>
      </div>

      <template #footer>
        <div class="flex space-x-3">
          <Button
            variant="ghost"
            @click="showChangeRoleModal = false"
            full-width
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            :loading="actionLoading"
            @click="handleChangeRole"
            full-width
          >
            Confirm Change
          </Button>
        </div>
      </template>
    </Modal>
  </div>
</template>