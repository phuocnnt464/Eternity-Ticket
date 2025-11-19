<script setup>
import { ref, computed, onMounted, watch } from 'vue'
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
  DocumentTextIcon, 
  ShieldCheckIcon,   
  UserGroupIcon 
} from '@heroicons/vue/24/outline'

import { toast } from 'vue3-toastify' 

const activeTab = ref('audit') 

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

const tabs = [
  { id: 'audit', label: 'Admin Actions', icon: ShieldCheckIcon, description: 'Admin & sub-admin actions' },
  { id: 'activity', label: 'User Activities', icon: UserGroupIcon, description: 'User system activities' }
]

const auditActionTypes = [
  { value: 'all', label: 'All Actions' },
  { value: 'CREATE_SUB_ADMIN', label: 'Create Sub-Admin' },
  { value: 'UPDATE_USER_ROLE', label: 'Update User Role' },
  { value: 'DEACTIVATE_ACCOUNT', label: 'Deactivate Account' },
  { value: 'REACTIVATE_ACCOUNT', label: 'Reactivate Account' },
  { value: 'APPROVE_EVENT', label: 'Approve Event' },
  { value: 'REJECT_EVENT', label: 'Reject Event' },
  { value: 'APPROVE_REFUND', label: 'Approve Refund' },
  { value: 'REJECT_REFUND', label: 'Reject Refund' },
  { value: 'UPDATE_SETTING', label: 'Update Setting' },
  { value: 'UPDATE_SETTINGS_BULK', label: 'Bulk Update Settings' }
]

const activityActionTypes = [
  { value: 'all', label: 'All Activities' },
  { value: 'user_login', label: 'User Login' },
  { value: 'user_logout', label: 'User Logout' },
  { value: 'user_register', label: 'User Register' },
  { value: 'event_created', label: 'Event Created' },
  { value: 'event_updated', label: 'Event Updated' },
  { value: 'order_created', label: 'Order Created' },
  { value: 'order_paid', label: 'Order Paid' },
  { value: 'order_cancelled', label: 'Order Cancelled' },
  { value: 'ticket_checked_in', label: 'Ticket Checked In' },
  { value: 'refund_requested', label: 'Refund Requested' }
]

const actionTypes = computed(() => {
  return activeTab.value === 'audit' ? auditActionTypes : activityActionTypes
})

const getActionBadge = (action) => {
  if (action.includes('CREATE') || action.includes('created') || action.includes('register')) 
    return { variant: 'success', text: action }
  if (action.includes('UPDATE') || action.includes('updated')) 
    return { variant: 'info', text: action }
  if (action.includes('DELETE') || action.includes('deleted') || action.includes('DEACTIVATE')) 
    return { variant: 'danger', text: action }
  if (action.includes('APPROVE') || action.includes('approved')) 
    return { variant: 'success', text: action }
  if (action.includes('REJECT') || action.includes('rejected') || action.includes('cancelled')) 
    return { variant: 'danger', text: action }
  if (action.includes('login')) 
    return { variant: 'info', text: 'Login' }
  if (action.includes('logout')) 
    return { variant: 'warning', text: 'Logout' }
  if (action.includes('paid')) 
    return { variant: 'success', text: 'Paid' }
  if (action.includes('checked_in')) 
    return { variant: 'accent', text: 'Checked In' }
  return { variant: 'primary', text: action }
}

const filteredLogs = computed(() => {
  let result = logs.value

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(log =>
      log.admin_name?.toLowerCase().includes(query) ||
      log.admin_email?.toLowerCase().includes(query) ||
      log.user_name?.toLowerCase().includes(query) ||
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
    const params = {
      page: pagination.value.currentPage,
      limit: pagination.value.perPage
    }
    
    let response
    if (activeTab.value === 'audit') {
      response = await adminAPI.getAuditLogs(params)
    } else {
      response = await adminAPI.getActivityLogs(params)
    }

    logs.value = response.data.logs || []

    // pagination.value.totalItems = response.data.pagination?.total_count || 0
    // pagination.value.totalPages = Math.ceil(pagination.value.totalItems / pagination.value.perPage)
    const paginationData = response.data.pagination || {}

    pagination.value.totalItems = paginationData.total_count || 0  
    pagination.value.totalPages = paginationData.total_pages || 1
    pagination.value.currentPage = paginationData.current_page || 1
  } catch (error) {
    console.error('Failed to fetch audit logs:', error)
  } finally {
    loading.value = false
  }
}

watch(activeTab, () => {
  selectedAction.value = 'all'
  pagination.value.currentPage = 1
  fetchLogs()
})

const handleExport = async () => {
  try {
    const timestamp = Date.now()

    const response = await adminAPI.exportAuditLogs({
      start_date: dateFrom.value,
      end_date: dateTo.value,
      action: selectedAction.value !== 'all' ? selectedAction.value : undefined,
      _t: timestamp // Cache buster
    })

    // Kiểm tra response có data không
    if (!response.data || response.data.length === 0) {
      toast.error('No data to export', {
        position: 'top-right',
        autoClose: 3000
      })
      return
    }
    
    const url = window.URL.createObjectURL(response.data)
    const link = document.createElement('a')
    link.href = url
    // link.setAttribute('download', `audit-logs-eternity-${new Date().toISOString().split('T')[0]}.csv`)
    const fileName = activeTab.value === 'audit' 
      ? `audit-logs-eternity-${new Date().toISOString().split('T')[0]}.csv`
      : `activity-logs-eternity-${new Date().toISOString().split('T')[0]}.csv`
    link.setAttribute('download', fileName)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
    
    toast.success('Audit logs exported successfully!', {
      position: 'top-right',
      autoClose: 2000
    })
  } catch (error) {
    console.error('Export error:', error)
    toast.error('Failed to export logs', {
      position: 'top-right',
      autoClose: 3000
    })
  }
}

// const handleExport = () => {
//   try {
//     if (filteredLogs.value.length === 0) {
//       toast.error('No logs to export', {
//         position: 'top-right',
//         autoClose: 2000
//       })
//       return
//     }
    
//     console.log(`📊 Exporting ${filteredLogs.value.length} logs...`)
    
//     // CSV headers
//     const headers = ['Timestamp', 'Admin Name', 'Admin Email', 'Action', 'Target Type', 'Target ID', 'Description', 'IP Address']
//     const csvRows = [headers.join(',')]
    
//     // Data rows
//     filteredLogs.value.forEach(log => {
//       const row = [
//         `"${formatDate(log.created_at)}"`,
//         `"${log.admin_name || log.user_name || 'System'}"`,
//         `"${log.admin_email || log.user_email || 'N/A'}"`,
//         `"${log.action || 'N/A'}"`,
//         `"${log.target_type || 'N/A'}"`,
//         `"${log.target_id || 'N/A'}"`,
//         `"${(log.description || '').replace(/"/g, '""')}"`,
//         `"${log.ip_address || 'N/A'}"`
//       ]
//       csvRows.push(row.join(','))
//     })
    
//     // Create CSV
//     const csvContent = csvRows.join('\n')
//     const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
//     const url = window.URL.createObjectURL(blob)
    
//     // Download
//     const link = document.createElement('a')
//     link.href = url
//     link.setAttribute('download', `audit-logs-${new Date().toISOString().split('T')[0]}.csv`)
//     document.body.appendChild(link)
//     link.click()
//     link.remove()
//     window.URL.revokeObjectURL(url)
    
//     console.log('✅ Exported:', csvContent.length, 'bytes')
    
//     toast.success(`Exported ${filteredLogs.value.length} logs successfully!`, {
//       position: 'top-right',
//       autoClose: 2000
//     })
//   } catch (error) {
//     console.error('❌ Export error:', error)
//     toast.error('Failed to export logs', {
//       position: 'top-right',
//       autoClose: 3000
//     })
//   }
// }

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

    <Card>
      <div class="border-b border-gray-200">
        <nav class="-mb-px flex space-x-8">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            :class="[
              'flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm',
              activeTab === tab.id
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            <component :is="tab.icon" class="w-5 h-5" />
            <span>{{ tab.label }}</span>
          </button>
        </nav>
      </div>
      
      <div class="pt-4">
        <p class="text-sm text-gray-600">
          {{ tabs.find(t => t.id === activeTab)?.description }}
        </p>
      </div>
    </Card>

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
                    <!-- <p class="font-medium text-gray-900">{{ log.user_name || 'System' }}</p>
                    <p class="text-gray-500">{{ log.user_email }}</p> -->
                    <p class="font-medium text-gray-900">
                      {{ activeTab === 'audit' 
                        ? (log.admin_name || 'System') 
                        : (log.user_name || 'Unknown User') 
                      }}
                    </p>
                    <p class="text-gray-500">
                      {{ activeTab === 'audit' 
                        ? log.admin_email 
                        : log.user_email 
                      }}
                    </p>
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