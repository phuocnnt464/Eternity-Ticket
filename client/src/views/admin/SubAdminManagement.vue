<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router' 
import { toast } from 'vue3-toastify' 
import { adminAPI } from '@/api/admin.js'
import Card from '@/components/common/Card.vue'
import Button from '@/components/common/Button.vue'
import Input from '@/components/common/Input.vue'
import Badge from '@/components/common/Badge.vue'
import Modal from '@/components/common/Modal.vue'
import Spinner from '@/components/common/Spinner.vue'
import {
  UserPlusIcon,
  TrashIcon,
  ShieldCheckIcon,
  EnvelopeIcon
} from '@heroicons/vue/24/outline'

const router = useRouter()  

const loading = ref(true)
const subAdmins = ref([])
const showInviteModal = ref(false)
const inviting = ref(false)

const emailCheckLoading = ref(false)
const emailExists = ref(false)
const existingUser = ref(null)

// Check email khi blur
const handleEmailBlur = async () => {
  // ← THÊM LOG ĐẦU TIÊN
  console.log('========================================')
  console.log('🔍 BLUR EVENT TRIGGERED!')
  console.log('Email value:', inviteForm.value.email)
  console.log('========================================')
  console.log('🔍 Email blur triggered:', inviteForm.value.email)
  
  if (!inviteForm.value.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteForm.value.email)) {
    console.log('❌ Email invalid, skip check')
    return
  }

  emailCheckLoading.value = true
  emailExists.value = false
  existingUser.value = null

  try {
    console.log('🔍 Checking email:', inviteForm.value.email)
    
    // ✅ SỬA: Dùng adminAPI thay vì fetch
    const response = await adminAPI.getAllUsers({ 
      page: 1, 
      limit: 100  // Lấy 100 users đầu để check
    })
    
    console.log('✅ Got users:', response.data)
    
    const users = response.data.users || []
    
    // Tìm user với email trùng
    const foundUser = users.find(u => 
      u.email.toLowerCase() === inviteForm.value.email.toLowerCase()
    )
    
    console.log('🔍 Found user:', foundUser)
    
    if (foundUser) {
      emailExists.value = true
      existingUser.value = foundUser
      errors.value.email = `This email belongs to ${foundUser.first_name} ${foundUser.last_name} (${foundUser.role})`
      console.log('⚠️ Email exists!', existingUser.value)
    } else {
      errors.value.email = ''
      console.log('✅ Email available')
    }
  } catch (error) {
    console.error('❌ Email check error:', error)
    console.error('Response:', error.response?.data)
  } finally {
    emailCheckLoading.value = false
  }
}

const inviteForm = ref({
  email: '',
  first_name: '',
  last_name: '',
  // password: ''
})

const errors = ref({})

const fetchSubAdmins = async () => {
  loading.value = true
  try {
    const response = await adminAPI.getSubAdmins()
    subAdmins.value = response.data.data || []
  } catch (error) {
    console.error('Failed to fetch sub-admins:', error)
  } finally {
    loading.value = false
  }
}

const validateForm = () => {
  errors.value = {}
  
  if (!inviteForm.value.email) {
    errors.value.email = 'Email is required'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteForm.value.email)) {
    errors.value.email = 'Invalid email format'
  }
  
  if (!inviteForm.value.first_name) {
    errors.value.first_name = 'First name is required'
  }
  
  if (!inviteForm.value.last_name) {
    errors.value.last_name = 'Last name is required'
  }

  // if (!inviteForm.value.password) {
  //   errors.value.password = 'Password is required'
  // } else if (inviteForm.value.password.length < 8) {
  //   errors.value.password = 'Password must be at least 8 characters'
  // }
  
  return Object.keys(errors.value).length === 0
}

const handleInvite = async () => {
  if (!validateForm()) return
  
  inviting.value = true
  try {
     const data = {
      ...inviteForm.value,
      password: generatePassword()
    }
    await adminAPI.createSubAdmin(data)
    
    // alert('Sub-admin invitation sent successfully!')
    toast.success('Sub-admin account created successfully!', {
      position: 'top-right',
      autoClose: 3000
    })
    showInviteModal.value = false
    // inviteForm.value = { email: '', first_name: '', last_name: '', password: '' }
    inviteForm.value = { email: '', first_name: '', last_name: '' }
    await fetchSubAdmins()
  } catch (error) {
    const errorMessage = error.response?.data?.error?.message || 'Failed to send invitation'

    if (error.response?.status === 409) {
      // Clear general error
      errors.value.general = ''
      
      // Hiển thị toast error với action button
      toast.error(
        `Email "${inviteForm.value.email}" already exists in the system.`,
        {
          position: 'top-right',
          autoClose: 5000,
          closeButton: true
        }
      )
      
      // Hiển thị warning toast với gợi ý
      setTimeout(() => {
        toast.warning(
          '💡 You can change the user role in User Management instead.',
          {
            position: 'top-right',
            autoClose: 7000,
            closeButton: true,
            onClick: () => {
              // Đóng modal và navigate đến User Management
              showInviteModal.value = false
              router.push('/admin/users')
            }
          }
        )
      }, 500)
      
      // Highlight email field
      errors.value.email = 'This email already exists'
    } else {
      toast.error(errorMessage, {
        position: 'top-right',
        autoClose: 5000
      })
      errors.value.general = errorMessage
    }
  } finally {
    inviting.value = false
  }
}

const generatePassword = () => {
  // Đảm bảo password có đủ: uppercase, lowercase, number, special char
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const numbers = '0123456789'
  const special = '!@#$%^&*'
  
  // Tạo password 12 ký tự với đầy đủ yêu cầu
  let password = ''
  
  // 1 uppercase, 1 lowercase, 1 number, 1 special
  password += uppercase.charAt(Math.floor(Math.random() * uppercase.length))
  password += lowercase.charAt(Math.floor(Math.random() * lowercase.length))
  password += numbers.charAt(Math.floor(Math.random() * numbers.length))
  password += special.charAt(Math.floor(Math.random() * special.length))
  
  // Phần còn lại: random từ tất cả
  const allChars = uppercase + lowercase + numbers + special
  for (let i = 4; i < 12; i++) {
    password += allChars.charAt(Math.floor(Math.random() * allChars.length))
  }
  
  // Shuffle password để không bị pattern cố định
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

const handleRemove = async (subAdminId, name) => {
  if (!confirm(`Remove ${name} as sub-admin? They will lose all admin privileges.`)) return
  
  try {
    await adminAPI.removeSubAdmin(subAdminId)
    alert('Sub-admin removed successfully')
    await fetchSubAdmins()
  } catch (error) {
    alert(error.response?.data?.error?.message || 'Failed to remove sub-admin')
  }
}

onMounted(() => {
  fetchSubAdmins()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Sub-Admin Management</h1>
        <p class="text-gray-600 mt-1">Manage administrative team members</p>
      </div>
      <Button variant="primary" @click="showInviteModal = true">
        <UserPlusIcon class="w-5 h-5" />
        Invite Sub-Admin
      </Button>
    </div>

    <!-- Info Card -->
    <Card class="bg-blue-50 border-blue-200">
      <div class="flex items-start space-x-3">
        <ShieldCheckIcon class="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
        <div>
          <h3 class="font-semibold text-blue-900 mb-1">About Sub-Admins</h3>
          <p class="text-sm text-blue-800">
            Sub-admins can approve events, manage users, handle refunds, and view audit logs. 
            They cannot invite other sub-admins or access system settings.
          </p>
        </div>
      </div>
    </Card>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <Spinner size="xl" />
    </div>

    <!-- Sub-Admins List -->
    <div v-else-if="subAdmins.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card
        v-for="admin in subAdmins"
        :key="admin.user_id"
      >
        <div class="flex items-start justify-between mb-4">
          <div class="flex items-center space-x-3">
            <div class="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <ShieldCheckIcon class="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <h3 class="font-semibold text-gray-900">
                {{ admin.first_name }} {{ admin.last_name }}
              </h3>
              <p class="text-sm text-gray-600">{{ admin.email }}</p>
            </div>
          </div>
        </div>

        <div class="space-y-2 mb-4">
          <div class="flex items-center justify-between text-sm">
            <span class="text-gray-600">Status:</span>
            <Badge :variant="admin.is_active ? 'success' : 'danger'">
              {{ admin.is_active ? 'Active' : 'Inactive' }}
            </Badge>
          </div>
          <div class="flex items-center justify-between text-sm">
            <span class="text-gray-600">Added:</span>
            <span class="font-medium">{{ new Date(admin.created_at).toLocaleDateString() }}</span>
          </div>
          <div class="flex items-center justify-between text-sm">
            <span class="text-gray-600">Last Login:</span>
            <span class="font-medium">
              {{ admin.last_login ? new Date(admin.last_login).toLocaleDateString() : 'Never' }}
            </span>
          </div>
        </div>

        <Button
          variant="danger"
          size="sm"
          @click="handleRemove(admin.user_id, `${admin.first_name} ${admin.last_name}`)"
          full-width
        >
          <TrashIcon class="w-4 h-4" />
          Remove Access
        </Button>
      </Card>
    </div>

    <!-- Empty State -->
    <Card v-else class="text-center py-12">
      <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <ShieldCheckIcon class="w-10 h-10 text-gray-400" />
      </div>
      <h3 class="text-xl font-semibold text-gray-900 mb-2">No sub-admins yet</h3>
      <p class="text-gray-600 mb-6">
        Invite team members to help manage the platform
      </p>
      <Button variant="primary" @click="showInviteModal = true">
        <UserPlusIcon class="w-5 h-5" />
        Invite Sub-Admin
      </Button>
    </Card>

    <!-- Invite Modal -->
    <Modal
      v-model="showInviteModal"
      title="Invite Sub-Admin"
      size="md"
    >
      <div v-if="errors.general" class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4 text-sm">
        {{ errors.general }}
      </div>

      <form @submit.prevent="handleInvite" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <Input
            v-model="inviteForm.first_name"
            label="First Name"
            placeholder="John"
            :error="errors.first_name"
            required
          />
          <Input
            v-model="inviteForm.last_name"
            label="Last Name"
            placeholder="Doe"
            :error="errors.last_name"
            required
          />
        </div>

        <Input
          v-model="inviteForm.email"
          type="email"
          label="Email Address"
          placeholder="admin@example.com"
          :error="errors.email"
          :icon="EnvelopeIcon"
          :loading="emailCheckLoading"
          @blur="handleEmailBlur"
          help-text="Make sure this email hasn't been registered yet"
          required
        />

        <div v-if="emailExists && existingUser" class="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <div class="flex items-start">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm text-yellow-700">
                <strong>User already exists:</strong> 
                {{ existingUser.first_name }} {{ existingUser.last_name }} 
                ({{ existingUser.role }})
              </p>
              <button
                type="button"
                @click="router.push(`/admin/users`); showInviteModal = false"
                class="mt-2 text-sm font-medium text-yellow-800 hover:text-yellow-900 underline"
              >
                Go to User Management to change their role →
              </button>
            </div>
          </div>
        </div>

        <!-- <Input
          v-model="inviteForm.password"
          type="password"
          label="Temporary Password"
          placeholder="Enter temporary password (min 8 characters)"
          :error="errors.password"
          help-text="This password will be sent to the sub-admin via email"
          required
        /> -->

        <!-- <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p class="text-sm text-yellow-800">
            <strong>Note:</strong> The invited user will receive an email with instructions to set up their admin account.
          </p>
        </div> -->
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p class="text-sm text-blue-800">
            <strong>💡 Tip:</strong> If the email already exists, you can change their role to "Sub Admin" in 
            <button 
              type="button"
              @click="router.push('/admin/users'); showInviteModal = false"
              class="underline hover:text-blue-900 font-medium"
            >
              User Management
            </button>
            instead.
          </p>
        </div>

        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p class="text-sm text-yellow-800">
            <strong>Note:</strong> The sub-admin will receive an email with login credentials.
          </p>
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