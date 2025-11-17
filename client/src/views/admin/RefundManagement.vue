<script setup>
import { ref, computed, onMounted } from 'vue'
import { refundAPI } from '@/api/refund.js'
import Card from '@/components/common/Card.vue'
import Button from '@/components/common/Button.vue'
import Badge from '@/components/common/Badge.vue'
import Pagination from '@/components/common/Pagination.vue'
import Spinner from '@/components/common/Spinner.vue'
import Modal from '@/components/common/Modal.vue'
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  CurrencyDollarIcon,
  FunnelIcon,
  EyeIcon
} from '@heroicons/vue/24/outline'

const loading = ref(true)
const refunds = ref([])
const selectedStatus = ref('pending')
const showDetailModal = ref(false)
const selectedRefund = ref(null)
const processingAction = ref(false)
const rejectionReason = ref('')

const pagination = ref({
  currentPage: 1,
  totalPages: 1,
  totalItems: 0,
  perPage: 20
})

const statusOptions = [
  { value: 'all', label: 'All Refunds' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'completed', label: 'Completed' }
]

const getStatusBadge = (status) => {
  const badges = {
    pending: { variant: 'warning', text: 'Pending', icon: ClockIcon },
    approved: { variant: 'success', text: 'Approved', icon: CheckCircleIcon },
    rejected: { variant: 'danger', text: 'Rejected', icon: XCircleIcon },
    completed: { variant: 'success', text: 'Completed', icon: CheckCircleIcon }
  }
  return badges[status] || badges.pending
}

const filteredRefunds = computed(() => {
  if (selectedStatus.value === 'all') {
    return refunds.value
  }
  return refunds.value.filter(refund => refund.status === selectedStatus.value)
})

const fetchRefunds = async () => {
  loading.value = true
  try {
    const response = await refundAPI.getRefundRequests({
      page: pagination.value.currentPage,
      limit: pagination.value.perPage
    })
    
    refunds.value = response.data.data || []
    pagination.value.totalItems = response.data.pagination?.total || 0
    pagination.value.totalPages = Math.ceil(pagination.value.totalItems / pagination.value.perPage)
  } catch (error) {
    console.error('Failed to fetch refunds:', error)
  } finally {
    loading.value = false
  }
}

const handleViewDetails = (refund) => {
  selectedRefund.value = refund
  rejectionReason.value = ''
  showDetailModal.value = true
}

const handleApprove = async (refundId) => {
  if (!confirm('Approve this refund request?')) return

  processingAction.value = true
  try {
    await refundAPI.approveRefund(refundId)
    alert('Refund approved successfully!')
    showDetailModal.value = false
    await fetchRefunds()
  } catch (error) {
    alert(error.response?.data?.error?.message || 'Failed to approve refund')
  } finally {
    processingAction.value = false
  }
}

const handleReject = async (refundId) => {
  if (!rejectionReason.value.trim()) {
    alert('Please provide a rejection reason')
    return
  }

  if (!confirm('Reject this refund request?')) return

  processingAction.value = true
  try {
    await refundAPI.rejectRefund(refundId, {
      reason: rejectionReason.value
    })
    alert('Refund rejected')
    rejectionReason.value = ''
    showDetailModal.value = false
    await fetchRefunds()
  } catch (error) {
    alert(error.response?.data?.error?.message || 'Failed to reject refund')
  } finally {
    processingAction.value = false
  }
}

const formatPrice = (price) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(price)
}

const handlePageChange = (page) => {
  pagination.value.currentPage = page
  fetchRefunds()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => {
  fetchRefunds()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Refund Management</h1>
      <p class="text-gray-600 mt-1">Review and process refund requests</p>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
      <Card>
        <div class="text-center">
          <p class="text-gray-600 text-sm mb-2">Total Requests</p>
          <p class="text-3xl font-bold text-gray-900">{{ pagination.totalItems }}</p>
        </div>
      </Card>
      <Card>
        <div class="text-center">
          <p class="text-gray-600 text-sm mb-2">Pending</p>
          <p class="text-3xl font-bold text-yellow-600">
            {{ refunds.filter(r => r.status === 'pending').length }}
          </p>
        </div>
      </Card>
      <Card>
        <div class="text-center">
          <p class="text-gray-600 text-sm mb-2">Approved</p>
          <p class="text-3xl font-bold text-green-600">
            {{ refunds.filter(r => r.status === 'approved' || r.status === 'completed').length }}
          </p>
        </div>
      </Card>
      <Card>
        <div class="text-center">
          <p class="text-gray-600 text-sm mb-2">Total Amount</p>
          <p class="text-2xl font-bold text-purple-600">
            {{ formatPrice(refunds.reduce((sum, r) => sum + (r.refund_amount || 0), 0)) }}
          </p>
        </div>
      </Card>
    </div>

    <!-- Filter -->
    <Card>
      <div class="flex items-center space-x-2">
        <FunnelIcon class="w-5 h-5 text-gray-400" />
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
    </Card>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <Spinner size="xl" />
    </div>

    <!-- Refunds Table -->
    <Card v-else-if="filteredRefunds.length > 0" no-padding>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 border-b">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Request ID</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr
              v-for="refund in filteredRefunds"
              :key="refund.refund_id"
              class="hover:bg-gray-50"
            >
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="font-mono text-sm">#{{ refund.refund_id }}</span>
              </td>
              <td class="px-6 py-4">
                <div class="text-sm">
                  <p class="font-medium text-gray-900">{{ refund.customer_name }}</p>
                  <p class="text-gray-500">{{ refund.customer_email }}</p>
                </div>
              </td>
              <td class="px-6 py-4">
                <span class="text-sm text-gray-900">{{ refund.event_title }}</span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="text-sm font-semibold text-gray-900">
                  {{ formatPrice(refund.refund_amount) }}
                </span>
              </td>
              <td class="px-6 py-4">
                <span class="text-sm text-gray-600 line-clamp-2">{{ refund.reason }}</span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <Badge :variant="getStatusBadge(refund.status).variant">
                  <component :is="getStatusBadge(refund.status).icon" class="w-4 h-4" />
                  {{ getStatusBadge(refund.status).text }}
                </Badge>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ new Date(refund.created_at).toLocaleDateString() }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <Button
                  variant="ghost"
                  size="sm"
                  @click="handleViewDetails(refund)"
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
      <CurrencyDollarIcon class="w-16 h-16 text-gray-400 mx-auto mb-4" />
      <p class="text-gray-500">No refund requests found</p>
    </Card>

    <!-- Detail Modal -->
    <Modal
      v-model="showDetailModal"
      title="Refund Request Details"
      size="lg"
    >
      <div v-if="selectedRefund" class="space-y-4">
        <!-- Customer & Order Info -->
        <div class="grid grid-cols-2 gap-4 pb-4 border-b">
          <div>
            <p class="text-sm text-gray-600">Customer</p>
            <p class="font-medium">{{ selectedRefund.customer_name }}</p>
            <p class="text-sm text-gray-500">{{ selectedRefund.customer_email }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600">Order Number</p>
            <p class="font-medium">#{{ selectedRefund.order_number }}</p>
          </div>
        </div>

        <!-- Event & Amount -->
        <div class="grid grid-cols-2 gap-4 pb-4 border-b">
          <div>
            <p class="text-sm text-gray-600">Event</p>
            <p class="font-medium">{{ selectedRefund.event_title }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600">Refund Amount</p>
            <p class="text-xl font-bold text-primary-600">
              {{ formatPrice(selectedRefund.refund_amount) }}
            </p>
          </div>
        </div>

        <!-- Reason -->
        <div>
          <p class="text-sm text-gray-600 mb-2">Refund Reason</p>
          <div class="bg-gray-50 rounded-lg p-4">
            <p class="text-sm text-gray-900">{{ selectedRefund.reason }}</p>
          </div>
        </div>

        <!-- Status -->
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-600">Current Status:</span>
          <Badge :variant="getStatusBadge(selectedRefund.status).variant">
            {{ getStatusBadge(selectedRefund.status).text }}
          </Badge>
        </div>

        <!-- Rejection Reason Form (if pending) -->
        <div v-if="selectedRefund.status === 'pending'">
          <label class="label">Rejection Reason (if rejecting)</label>
          <textarea
            v-model="rejectionReason"
            rows="3"
            placeholder="Provide reason for rejection..."
            class="textarea"
          ></textarea>
        </div>
      </div>

      <template #footer>
        <div v-if="selectedRefund?.status === 'pending'" class="flex space-x-3">
          <Button
            variant="danger"
            :loading="processingAction"
            @click="handleReject(selectedRefund.refund_id)"
            full-width
          >
            <XCircleIcon class="w-5 h-5" />
            Reject
          </Button>
          <Button
            variant="success"
            :loading="processingAction"
            @click="handleApprove(selectedRefund.refund_id)"
            full-width
          >
            <CheckCircleIcon class="w-5 h-5" />
            Approve
          </Button>
        </div>
        <Button
          v-else
          variant="secondary"
          @click="showDetailModal = false"
          full-width
        >
          Close
        </Button>
      </template>
    </Modal>
  </div>
</template>