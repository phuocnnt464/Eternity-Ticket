<script setup>
import { ref, computed, onMounted } from 'vue'
import { adminAPI } from '@/api/admin.js'
import Card from '@/components/common/Card.vue'
import Button from '@/components/common/Button.vue'
import Badge from '@/components/common/Badge.vue'
import Pagination from '@/components/common/Pagination.vue'
import Spinner from '@/components/common/Spinner.vue'
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  ClockIcon,
  UserIcon,
  DocumentTextIcon
} from '@heroicons/vue/24/outline'

const loading = ref(true)
const logs = ref([])
const searchQuery = ref('')
const selectedAction = ref('all')
const selectedUser = ref('all')
const dateFrom = ref('')
const dateTo = ref('')

const pagination = ref({
  currentPage: 1,
  totalPages: 1,
  totalItems: 0,
  perPage: 50
})

const actionTypes = [
  { value: 'all', label: 'All Actions' },
  { value: 'user_login', label: 'User Login' },
  { value: 'user_logout', label: 'User Logout' },
  { value: 'user_created', label: 'User Created' },
  { value: 'user_updated', label: 'User Updated' },
  { value: 'user_deleted', label: 'User Deleted' },
  { value: 'event_created', label: 'Event Created' },
  { value: 'event_updated', label: 'Event Updated' },
  { value: 'event_approved', label: 'Event Approved' },
  { value: 'event_rejected', label: 'Event Rejected' },
  { value: 'event_deleted', label: 'Event Deleted' },
  { value: 'order_created', label: 'Order Created' },
  { value: 'order_cancelled', label: 'Order Cancelled' },
  { value: 'refund_approved', label: 'Refund Approved' },
  { value: 'refund_rejected', label: 'Refund Rejected' },
  { value: 'UPDATE_SETTING', label: 'Settings Updated' }
]

const getActionBadge = (action) => {
  if (action.includes('created')) return { variant: 'success', text: 'Created' }
  if (action.includes('updated')) return { variant: 'info', text: 'Updated' }
  if (action.includes('deleted')) return { variant: 'danger', text: 'Deleted' }
  if (action.includes('approved')) return { variant: 'success', text: 'Approved' }
  if (action.includes('rejected')) return { variant: 'danger', text: 'Rejected' }
  if (action.includes('login')) return { variant: 'info', text: 'Login' }
  if (action.includes('logout')) return { variant: 'warning', text: 'Logout' }
  return { variant: 'primary', text: action }
}

const filteredLogs = computed(() => {
  let result = logs.value

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(log =>
      log.user_email?.toLowerCase().includes(query) ||
      log.action?.toLowerCase().includes(query) ||
      log.description?.toLowerCase().includes(query) ||
      log.ip_address?.toLowerCase().includes(query)
    )
  }

  if (selectedAction.value !== 'all') {
    result = result.filter(log => log.action === selectedAction.value)
  }

  if (dateFrom.value) {
    result = result.filter(log => new Date(log.created_at) >= new Date(dateFrom.value))
  }

  if (dateTo.value) {
    result = result.filter(log => new Date(log.created_at) <= new Date(dateTo.value))
  }

  return result
})

const fetchLogs = async () => {
  loading.value = true
  try {
    const response = await adminAPI.getAuditLogs({
      page: pagination.value.currentPage,
      limit: pagination.value.perPage
    })
    
    // DEBUG - Xem response thực tế
    console.log('=== DEBUG AUDIT LOGS ===')
    console.log('1. Full response:', response)
    console.log('2. response.data:', response.data)
    console.log('3. response.data.logs:', response.data.logs)
    console.log('4. response.data.pagination:', response.data.pagination)

    logs.value = response.data.logs || []
    console.log('5. logs.value.length:', logs.value.length)

    // pagination.value.totalItems = response.data.pagination?.total_count || 0
    // pagination.value.totalPages = Math.ceil(pagination.value.totalItems / pagination.value.perPage)
    const paginationData = response.data.pagination || {}

    console.log('6. paginationData:', paginationData)
    console.log('7. paginationData.total_count:', paginationData.total_count)
    pagination.value.totalItems = paginationData.total_count || 0  
    pagination.value.totalPages = paginationData.total_pages || 1
    pagination.value.currentPage = paginationData.current_page || 1

    console.log('8. FINAL pagination.totalItems:', pagination.value.totalItems)
    console.log('9. FINAL pagination object:', pagination.value)
    console.log('========================')


  } catch (error) {
    console.error('Failed to fetch audit logs:', error)
  } finally {
    loading.value = false
  }
}

const handleExport = async () => {
  try {
    const response = await adminAPI.exportAuditLogs({
      dateFrom: dateFrom.value,
      dateTo: dateTo.value
    })
    
    // Create blob and download
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `audit-logs-${new Date().toISOString()}.csv`)
    document.body.appendChild(link)
    link.click()
    link.remove()
  } catch (error) {
    alert('Failed to export logs')
  }
}

const handlePageChange = (page) => {
  pagination.value.currentPage = page
  fetchLogs()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

onMounted(() => {
  fetchLogs()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Audit Logs</h1>
        <p class="text-gray-600 mt-1">System activity and security logs</p>
      </div>
      <Button variant="secondary" @click="handleExport">
        <ArrowDownTrayIcon class="w-5 h-5" />
        Export Logs
      </Button>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
      <Card>
        <div class="text-center">
          <p class="text-gray-600 text-sm mb-2">Total Logs</p>
          <p class="text-3xl font-bold text-gray-900">{{ pagination.totalItems }}</p>
        </div>
      </Card>
      <Card>
        <div class="text-center">
          <p class="text-gray-600 text-sm mb-2">Today</p>
          <p class="text-3xl font-bold text-blue-600">
            {{ logs.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString()).length }}
          </p>
        </div>
      </Card>
      <Card>
        <div class="text-center">
          <p class="text-gray-600 text-sm mb-2">This Week</p>
          <p class="text-3xl font-bold text-green-600">
            {{ logs.filter(l => {
              const logDate = new Date(l.created_at)
              const weekAgo = new Date()
              weekAgo.setDate(weekAgo.getDate() - 7)
              return logDate >= weekAgo
            }).length }}
          </p>
        </div>
      </Card>
      <Card>
        <div class="text-center">
          <p class="text-gray-600 text-sm mb-2">Unique Users</p>
          <p class="text-3xl font-bold text-purple-600">
            {{ new Set(logs.map(l => l.user_id)).size }}
          </p>
        </div>
      </Card>
    </div>

    <!-- Filters -->
    <Card>
      <div class="space-y-4">
        <!-- Search -->
        <div class="relative">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search by user, action, description, or IP..."
            class="input pl-10"
          />
          <MagnifyingGlassIcon class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>

        <!-- Filters Row -->
        <div class="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
          <div class="flex items-center space-x-2">
            <FunnelIcon class="w-5 h-5 text-gray-400" />
            <select v-model="selectedAction" class="select">
              <option
                v-for="option in actionTypes"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </div>

          <div class="flex items-center space-x-2">
            <ClockIcon class="w-5 h-5 text-gray-400" />
            <input
              v-model="dateFrom"
              type="date"
              class="input"
              placeholder="From"
            />
            <span class="text-gray-500">to</span>
            <input
              v-model="dateTo"
              type="date"
              class="input"
              placeholder="To"
            />
          </div>
        </div>
      </div>
    </Card>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <Spinner size="xl" />
    </div>

    <!-- Logs Table -->
    <Card v-else-if="filteredLogs.length > 0" no-padding>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 border-b">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
              <!-- <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User Agent</th> -->
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr
              v-for="log in filteredLogs"
              :key="log.log_id"
              class="hover:bg-gray-50"
            >
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ formatDate(log.created_at) }}
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center space-x-2">
                  <UserIcon class="w-4 h-4 text-gray-400" />
                  <div class="text-sm">
                    <p class="font-medium text-gray-900">{{ log.user_name || 'System' }}</p>
                    <p class="text-gray-500">{{ log.user_email }}</p>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <Badge :variant="getActionBadge(log.action).variant">
                  {{ getActionBadge(log.action).text }}
                </Badge>
              </td>
              <td class="px-6 py-4">
                <span class="text-sm text-gray-900 line-clamp-2">
                  {{ log.description || log.action }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="text-sm font-mono text-gray-600">{{ log.ip_address || 'N/A' }}</span>
              </td>
              <!-- <td class="px-6 py-4">
                <span class="text-xs text-gray-500 line-clamp-2">
                  {{ log.user_agent || 'N/A' }}
                </span>
              </td> -->
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
      <DocumentTextIcon class="w-16 h-16 text-gray-400 mx-auto mb-4" />
      <h3 class="text-xl font-semibold text-gray-900 mb-2">No logs found</h3>
      <p class="text-gray-600">
        {{ searchQuery || selectedAction !== 'all' || dateFrom || dateTo
          ? 'Try adjusting your filters'
          : 'System audit logs will appear here'
        }}
      </p>
    </Card>
  </div>
</template>