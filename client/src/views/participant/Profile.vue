<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { usersAPI } from '@/api/users.js'
import Input from '@/components/common/Input.vue'
import Button from '@/components/common/Button.vue'
import Badge from '@/components/common/Badge.vue'
import Modal from '@/components/common/Modal.vue'
import { 
  UserIcon, 
  EnvelopeIcon, 
  PhoneIcon,
  CameraIcon,
  KeyIcon,
  ExclamationTriangleIcon
} from '@heroicons/vue/24/outline'

import { toast } from 'vue3-toastify'  
import 'vue3-toastify/dist/index.css'

const authStore = useAuthStore()

const form = ref({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  date_of_birth: '',
  gender: '',
  address: ''
})

const passwordForm = ref({
  current_password: '',
  new_password: '',
  confirm_password: ''
})

const errors = ref({})
const passwordErrors = ref({})
const loading = ref(false)
const passwordLoading = ref(false)
const avatarFile = ref(null)
const avatarPreview = ref(null)
const showPasswordForm = ref(false)

const showDeactivateModal = ref(false)
const deactivatePassword = ref('')
const deactivateLoading = ref(false)
const deactivateError = ref('')

const membershipTier = computed(() => {
  return authStore.user?.membership_tier || 'basic'
})

const membershipBadge = computed(() => {
  const badges = {
    basic: { variant: 'info', text: 'Basic' },
    premium: { variant: 'warning', text: 'Premium' },
    vip: { variant: 'success', text: 'VIP' }
  }
  return badges[membershipTier.value] || badges.basic
})

const loadProfile = async () => {
  try {
    const userId = authStore.user?.id

    if (!userId) {
      console.error('User ID not found')
      return
    }

    const response = await usersAPI.getUserById(userId)
    const user = response.data.user
    
    form.value = {
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || '',
      phone: user.phone || '',
      date_of_birth: user.date_of_birth ? user.date_of_birth.split('T')[0] : '',
      gender: user.gender || '',
      address: user.address || ''
    }
    
    // Add API base URL if needed
    if (user.avatar_url) {
      // Check if it's a relative or absolute URL
      if (user. avatar_url.startsWith('http')) {
        avatarPreview.value = user.avatar_url
      } else {
        // Prepend API base URL
        const baseUrl = 'http://localhost:3000'
        avatarPreview.value = `${baseUrl}${user.avatar_url}` 
      }
    } else {
      avatarPreview.value = null
    }

    console.log('✅ Profile loaded, avatar:', avatarPreview.value)
  } catch (error) {
    console.error('Failed to load profile:', error)
    console.error('Error response:', error.response?.data)
  }
}

const handleAvatarChange = (event) => {
  const file = event.target.files[0]
  if (!file) return
  
  // Validate file
  if (!file.type.startsWith('image/')) {
    errors.value.avatar = 'Please select an image file'
    return
  }
  
  if (file.size > 2 * 1024 * 1024) {
    errors.value.avatar = 'Image size must be less than 2MB'
    return
  }
  
  avatarFile.value = file
  errors.value.avatar = ''
  
  // Create preview
  const reader = new FileReader()
  reader.onload = (e) => {
    avatarPreview.value = e.target.result
  }
  reader.readAsDataURL(file)
}

const uploadAvatar = async () => {
  if (!avatarFile. value) {
    errors.value.avatar = 'Please select an image first'
    return
  }
  
  console.log('📤 Uploading avatar...')
  
  loading.value = true
  try {
    const userId = authStore.user?.id
    
    if (! userId) {
      throw new Error('User ID not found')
    }
    
    // 1. Upload avatar
    const uploadResponse = await usersAPI.uploadAvatar(userId, avatarFile. value)
    console.log('✅ Upload response:', uploadResponse. data)
    
    // 2. Get new avatar URL from response
    const newAvatarUrl = uploadResponse.data.avatar_url
    
    // 3. Update preview immediately
    if (newAvatarUrl) {
      avatarPreview.value = newAvatarUrl
      
      // 4. Update auth store immediately (without fetching)
      authStore.updateUser({ avatar_url: newAvatarUrl })
    }
    
    // 5. Optionally fetch full profile to ensure sync
    await authStore.fetchProfile()
    
    // 6. Reset file input AFTER everything completes
    avatarFile.value = null
    errors.value.avatar = ''
    
    console.log('✅ Avatar updated successfully')
    // alert('Avatar updated successfully!')
    toast.success('Avatar updated successfully! ', {
      position: 'top-right',
      autoClose: 3000
    })
    
  } catch (error) {
    console.error('❌ Upload avatar error:', error)
    console.error('❌ Error details:', error.response?.data)
    
    errors.value.avatar = error.response?.data?.error?.message || 'Failed to upload avatar'
     toast.error(errors.value.avatar, {
      position: 'top-right',
      autoClose: 5000
    })
  } finally {
    loading.value = false
  }
}

const handleImageError = (e) => {
  console.error('❌ Failed to load avatar image:', avatarPreview.value)
  // Fallback to default avatar
  avatarPreview.value = null
}

// ✅ THÊM: Computed để build full avatar URL
const avatarUrl = computed(() => {
  if (!avatarPreview. value) return null
  
  // If already absolute URL
  if (avatarPreview. value.startsWith('http')) {
    return avatarPreview. value
  }
  
  // Build full URL
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
  return `${baseUrl}${avatarPreview.value}`
})

const validateProfile = () => {
  errors.value = {}
  
  if (!form.value.first_name) {
    errors.value.first_name = 'First name is required'
  }
  
  if (!form.value.last_name) {
    errors.value.last_name = 'Last name is required'
  }
  
  if (!form.value.phone) {
    errors.value.phone = 'Phone number is required'
  } else if (!/^[\d\s+()-]{10,20}$/.test(form.value.phone)) { 
    errors.value.phone = 'Invalid phone number (10-20 digits, can include spaces, +, -, ())'
  }
  
  return Object.keys(errors.value).length === 0
}

const handleUpdateProfile = async () => {
  if (!validateProfile()) return
  
  loading.value = true
  try {
    const userId = authStore.user?.id
    await usersAPI.updateProfile(userId, form.value)
    
    // Reload user data
    await authStore.fetchProfile()
    // alert('Profile updated successfully!')
    toast.success('Profile updated successfully!', {
      position: 'top-right',
      autoClose: 3000
    })
  } catch (error) {
    errors.value.general = error.response?.data?.error?.message || 'Failed to update profile'
    toast.error(errors.value.general, {
      position: 'top-right',
      autoClose: 5000
    })
  } finally {
    loading.value = false
  }
}

const validatePassword = () => {
  passwordErrors.value = {}
  
  if (!passwordForm.value.current_password) {
    passwordErrors.value.current_password = 'Current password is required'
  }
  
  if (!passwordForm.value.new_password) {
    passwordErrors.value.new_password = 'New password is required'
  } else if (passwordForm.value.new_password.length < 8) {
    passwordErrors.value.new_password = 'Password must be at least 8 characters'
  }
  
  if (passwordForm.value.new_password !== passwordForm.value.confirm_password) {
    passwordErrors.value.confirm_password = 'Passwords do not match'
  }
  
  return Object.keys(passwordErrors.value).length === 0
}

const handleChangePassword = async () => {
  if (!validatePassword()) return
  
  passwordLoading.value = true
  try {
    await authStore.changePassword(passwordForm.value)
    
    // Reset form
    passwordForm.value = {
      current_password: '',
      new_password: '',
      confirm_password: ''
    }
    showPasswordForm.value = false
    // alert('Password changed successfully!')
    toast.success('Password changed successfully!', {
      position: 'top-right',
      autoClose: 3000
    })
  } catch (error) {
    passwordErrors.value.general = error.response?.data?.error?.message || 'Failed to change password'
    toast.error(passwordErrors.value.general, {
      position: 'top-right',
      autoClose: 5000
    })
  } finally {
    passwordLoading.value = false
  }
}

const handleDeactivateAccount = () => {
  showDeactivateModal.value = true
  deactivatePassword.value = ''
  deactivateError.value = ''
}

const confirmDeactivate = async () => {
  if (!deactivatePassword.value) {
    deactivateError.value = 'Password is required'
    return
  }

  deactivateLoading.value = true
  deactivateError.value = ''

  try {
    const userId = authStore.user?. id

    if (!userId) {
      throw new Error('User ID not found')
    }

    await usersAPI.deactivateAccount(userId, deactivatePassword. value)

    toast.success('Account deactivated successfully.  You will be logged out. ', {
      position: 'top-right',
      autoClose: 3000
    })

    // Close modal
    showDeactivateModal.value = false

    // Logout and redirect
    setTimeout(async () => {
      await authStore.logout()
      router. push('/auth/login')
    }, 2000)

  } catch (error) {
    console.error('❌ Deactivate account error:', error)
    deactivateError.value = error.response?.data?.error?. message || 'Failed to deactivate account'
    
    toast.error(deactivateError. value, {
      position: 'top-right',
      autoClose: 5000
    })
  } finally {
    deactivateLoading.value = false
  }
}

const cancelDeactivate = () => {
  showDeactivateModal.value = false
  deactivatePassword.value = ''
  deactivateError. value = ''
}

onMounted(() => {
  loadProfile()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-2xl font-bold text-gray-900">My Profile</h1>
      <p class="text-gray-600 mt-1">Manage your personal information</p>
    </div>

    <!-- Membership Status -->
    <div class="card bg-gradient-to-br from-primary-50 to-accent-50">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm text-gray-600 mb-1">Membership Status</p>
          <Badge :variant="membershipBadge.variant" size="lg">
            {{ membershipBadge.text }}
          </Badge>
        </div>
        <RouterLink to="/participant/membership" class="btn-primary">
          Upgrade Membership
        </RouterLink>
      </div>
    </div>

    <!-- Avatar -->
    <div class="card">
      <h2 class="text-lg font-semibold mb-4">Profile Picture</h2>
      
      <div class="flex items-center space-x-6">
        <div class="relative">
          <div class="w-32 h-32 rounded-full overflow-hidden bg-gray-200">
            <img
              v-if="avatarPreview"
              :src="avatarPreview"
              alt="Avatar"
              class="w-full h-full object-cover"
              @error="handleImageError"
            />
            <div v-else class="w-full h-full flex items-center justify-center bg-primary-100">
              <UserIcon class="w-16 h-16 text-primary-600" />
            </div>
          </div>
          
          <label class="absolute bottom-0 right-0 w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-primary-700 transition-colors">
            <CameraIcon class="w-5 h-5 text-white" />
            <input
              type="file"
              accept="image/*"
              @change="handleAvatarChange"
              class="hidden"
            />
          </label>
        </div>

        <div class="flex-1">
          <p class="text-sm text-gray-600 mb-2">
            Upload a profile picture.  Max size: 2MB.  Formats: JPG, PNG. 
          </p>
          <p v-if="errors.avatar" class="error-text">{{ errors.avatar }}</p>
          
          <Button
            v-if="avatarFile"
            variant="success"
            size="sm"
            :loading="loading"
            @click="uploadAvatar"
            class="mt-2"
          >
            Save Avatar
          </Button>
        </div>
      </div>
    </div>

    <!-- Profile Information -->
    <div class="card">
      <h2 class="text-lg font-semibold mb-4">Personal Information</h2>

      <div v-if="errors.general" class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4 text-sm">
        {{ errors.general }}

        <p v-if="errors.general. includes('Too many')" class="mt-2 text-xs">
          Please wait a few minutes before trying again. 
        </p>
      </div>

      <form @submit.prevent="handleUpdateProfile" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            v-model="form.first_name"
            label="First Name"
            placeholder="John"
            :error="errors.first_name"
            :icon="UserIcon"
            required
          />

          <Input
            v-model="form.last_name"
            label="Last Name"
            placeholder="Doe"
            :error="errors.last_name"
            required
          />
        </div>

        <Input
          v-model="form.email"
          type="email"
          label="Email"
          :icon="EnvelopeIcon"
          disabled
          help-text="Contact support to change your email"
        />

        <Input
          v-model="form.phone"
          type="tel"
          label="Phone Number"
          placeholder="0123456789"
          :error="errors.phone"
          :icon="PhoneIcon"
          required
        />

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="label">Date of Birth</label>
            <input
              v-model="form.date_of_birth"
              type="date"
              class="input"
            />
          </div>

          <div>
            <label class="label">Gender</label>
            <select v-model="form.gender" class="select">
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div>
          <label class="label">Address</label>
          <textarea
            v-model="form.address"
            rows="3"
            placeholder="Enter your address"
            class="textarea"
          ></textarea>
        </div>

        <div class="flex justify-end">
          <Button
            type="submit"
            variant="primary"
            :loading="loading"
          >
            Save Changes
          </Button>
        </div>
      </form>
    </div>

    <!-- Change Password -->
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold">Password</h2>
        <Button
          v-if="!showPasswordForm"
          variant="secondary"
          size="sm"
          @click="showPasswordForm = true"
        >
          <KeyIcon class="w-4 h-4" />
          Change Password
        </Button>
      </div>

      <div v-if="showPasswordForm">
        <div v-if="passwordErrors.general" class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4 text-sm">
          {{ passwordErrors.general }}
        </div>

        <form @submit.prevent="handleChangePassword" class="space-y-4">
          <Input
            v-model="passwordForm.current_password"
            type="password"
            label="Current Password"
            placeholder="Enter current password"
            :error="passwordErrors.current_password"
            required
          />

          <Input
            v-model="passwordForm.new_password"
            type="password"
            label="New Password"
            placeholder="At least 8 characters"
            :error="passwordErrors.new_password"
            help-text="Must be at least 8 characters"
            required
          />

          <Input
            v-model="passwordForm.confirm_password"
            type="password"
            label="Confirm New Password"
            placeholder="Re-enter new password"
            :error="passwordErrors.confirm_password"
            required
          />

          <div class="flex justify-end space-x-3">
            <Button
              type="button"
              variant="secondary"
              @click="showPasswordForm = false"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              :loading="passwordLoading"
            >
              Change Password
            </Button>
          </div>
        </form>
      </div>

      <p v-else class="text-sm text-gray-600">
        Keep your account secure by using a strong password
      </p>
    </div>

    <!-- Account Actions -->
    <div class="card border-red-200 bg-red-50">
      <h2 class="text-lg font-semibold text-red-600 mb-2 flex items-center">
        <ExclamationTriangleIcon class="w-5 h-5 mr-2" />
        Danger Zone
      </h2>
      <p class="text-sm text-gray-700 mb-4">
        Once you delete your account, there is no going back. All your data, orders, and tickets will be permanently lost.  Please be certain.
      </p>
      
      <Button 
        variant="danger" 
        @click="handleDeactivateAccount"
      >
        Deactivate Account
      </Button>
    </div>

    <Modal
      v-model="showDeactivateModal"
      title="Deactivate Account"
      size="md"
    >
      <div class="space-y-4">
        <!-- Warning -->
        <div class="bg-red-50 border border-red-200 rounded-lg p-4">
          <div class="flex items-start space-x-3">
            <ExclamationTriangleIcon class="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 class="font-semibold text-red-900 mb-1">Warning: This action cannot be undone!</h3>
              <ul class="text-sm text-red-800 space-y-1 list-disc list-inside">
                <li>Your account will be permanently deactivated</li>
                <li>All your personal data will be removed</li>
                <li>Your orders and tickets will no longer be accessible</li>
                <li>You will be logged out immediately</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Password Input -->
        <div>
          <p class="text-sm text-gray-700 mb-3">
            Please enter your password to confirm account deactivation:
          </p>
          
          <Input
            v-model="deactivatePassword"
            type="password"
            label="Your Password"
            placeholder="Enter your password"
            :error="deactivateError"
            :icon="KeyIcon"
            required
            autofocus
          />
        </div>

        <!-- Additional Confirmation -->
        <div class="bg-gray-50 rounded-lg p-3">
          <p class="text-xs text-gray-600 italic">
            By clicking "Deactivate My Account", you acknowledge that you understand this action is permanent and irreversible.
          </p>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end space-x-3">
          <Button
            variant="secondary"
            @click="cancelDeactivate"
            :disabled="deactivateLoading"
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            @click="confirmDeactivate"
            :loading="deactivateLoading"
          >
            <ExclamationTriangleIcon class="w-5 h-5 mr-2" />
            Deactivate My Account
          </Button>
        </div>
      </template>
    </Modal>
  </div>
</template>