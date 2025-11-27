// client/src/composables/useEventPermissions.js
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { eventsAPI } from '@/api/events'

export function useEventPermissions(eventId) {
  const authStore = useAuthStore()
  const eventRole = ref(null)
  const isOwner = ref(false)
  const loading = ref(false)
  const error = ref(null)

  const fetchEventRole = async () => {
    if (!eventId.value) {
      console.warn('No eventId provided')
      return
    }
    
    loading.value = true
    error. value = null
    
    try {
      console.log('🔍 Fetching event role for event:', eventId.value)

      const response = await eventsAPI.getTeamMembers(eventId.value)
      const members = response.data.data?.members || response.data.members || []
      
      console.log('👥 Team members:', members)
      console.log('👤 Current user:', authStore.user?.id)
      
      const currentMember = members.find(m => m.user_id === authStore.user?.id)
      
      if (currentMember) {
        eventRole.value = currentMember.role
        isOwner.value = currentMember.role === 'owner'
        console.log('✅ User role in event:', eventRole.value)
      } else {
        console. warn('⚠️ User is not a member of this event')
      }
    } catch (err) {
      console.error('❌ Failed to fetch event role:', err)
      error.value = err.response?.data?.message || 'Failed to fetch event role'
      
      if (err.response?.status === 403) {
        eventRole.value = null
      }
    } finally {
      loading.value = false
    }
  }
  
  // Owner: Thêm Manager hoặc Check-in Staff
  // Manager: CHỈ thêm được Check-in Staff
  const canManageTeam = computed(() => {
    return ['owner', 'manager'].includes(eventRole.value)
  })

  // Manager CHỈ XEM orders, không chỉnh sửa
  const canViewOrders = computed(() => {
    return ['owner', 'manager'].includes(eventRole.value)
  })

  // Tất cả roles có thể check-in
  const canCheckIn = computed(() => {
    return ['owner', 'manager', 'checkin_staff'].includes(eventRole.value)
  })

  // ❌ CHỈ OWNER mới chỉnh sửa event
  const canEditEvent = computed(() => {
    return eventRole.value === 'owner'
  })

  // ❌ CHỈ OWNER xem statistics
  const canViewStatistics = computed(() => {
    return eventRole.value === 'owner'
  })

  // ❌ CHỈ OWNER quản lý sessions & tickets
  const canManageSessions = computed(() => {
    return eventRole.value === 'owner'
  })

  // ❌ CHỈ OWNER quản lý coupons
  const canManageCoupons = computed(() => {
    return eventRole.value === 'owner'
  })

  // ❌ CHỈ OWNER xóa event
  const canDeleteEvent = computed(() => {
    return eventRole.value === 'owner'
  })

  // ✅ THÊM: Manager có thể gửi email, xuất báo cáo
  const canExportReports = computed(() => {
    return ['owner', 'manager'].includes(eventRole.value)
  })

  const canUndoCheckin = computed(() => {
    return ['owner', 'manager'].includes(eventRole.value)
  })


  return {
    eventRole,
    isOwner,
    loading,
    error,
    fetchEventRole,
    canManageTeam,
    canViewOrders,
    canCheckIn,
    canEditEvent,
    canViewStatistics,
    canManageSessions,
    canManageCoupons,
    canDeleteEvent,
    canExportReports,
    canUndoCheckin
  }
}