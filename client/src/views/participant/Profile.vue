<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { usersAPI } from '@/api/users.js'
import Input from '@/components/common/Input.vue'
import Button from '@/components/common/Button.vue'
import Badge from '@/components/common/Badge.vue'
import { 
  UserIcon, 
  EnvelopeIcon, 
  PhoneIcon,
  CameraIcon,
  KeyIcon
} from '@heroicons/vue/24/outline'

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
  new_password_confirmation: ''
})

const errors = ref({})
const passwordErrors = ref({})
const loading = ref(false)
const passwordLoading = ref(false)
const avatarFile = ref(null)
const avatarPreview = ref(null)
const showPasswordForm = ref(false)

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
    const userId = authStore.user.user_id
    const response = await usersAPI.getUserById(userId)
    const user = response.data.data
    
    form.value = {
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || '',
      phone: user.phone || '',
      date_of_birth: user.date_of_birth ? user.date_of_birth.split('T')[0] : '',
      gender: user.gender || '',
      address: user.address || ''
    }
    
    avatarPreview.value = user.avatar_url
  } catch (error) {
    console.error('Failed to load profile:', error)
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
  if (!avatarFile.value) return
  
  loading.value = true
  try {
    const userId = authStore.user.user_id
    await usersAPI.uploadAvatar(userId, avatarFile.value)
    
    // Reload user data
    await authStore.loadUser()
    avatarFile.value = null
    alert('Avatar updated successfully!')
  } catch (error) {
    errors.value.avatar = error.response?.data?.error?.message || 'Failed to upload avatar'
  } finally {
    loading.value = false
  }
}

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
  } else if (!/^[0-9]{10,11}$/.test(form.value.phone)) {
    errors.value.phone = 'Invalid phone number'
  }
  
  return Object.keys(errors.value).length === 0
}

const handleUpdateProfile = async () => {
  if (!validateProfile()) return
  
  loading.value = true
  try {
    const userId = authStore.user.user_id
    await usersAPI.updateProfile(userId, form.value)
    
    // Reload user data
    await authStore.loadUser()
    alert('Profile updated successfully!')
  } catch (error) {
    errors.value.general = error.response?.data?.error?.message || 'Failed to update profile'
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
  
  if (passwordForm.value.new_password !== passwordForm.value.new_password_confirmation) {
    passwordErrors.value.new_password_confirmation = 'Passwords do not match'
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
      new_password_confirmation: ''
    }
    showPasswordForm.value = false
    alert('Password changed successfully!')
  } catch (error) {
    passwordErrors.value.general = error.response?.data?.error?.message || 'Failed to change password'
  } finally {
    passwordLoading.value = false
  }
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
            Upload a profile picture. Max size: 2MB. Formats: JPG, PNG.
          </p>
          <p v-if="errors.avatar" class="error-text">{{ errors.avatar }}</p>
          
          <Button
            v-if="avatarFile"
            variant="primary"
            size="sm"
            :loading="loading"
            @click="uploadAvatar"
            class="mt-2"
          >
            Upload Avatar
          </Button>
        </div>
      </div>
    </div>

    <!-- Profile Information -->
    <div class="card">
      <h2 class="text-lg font-semibold mb-4">Personal Information</h2>

      <div v-if="errors.general" class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4 text-sm">
        {{ errors.general }}
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
            v-model="passwordForm.new_password_confirmation"
            type="password"
            label="Confirm New Password"
            placeholder="Re-enter new password"
            :error="passwordErrors.new_password_confirmation"
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
    <div class="card border-red-200">
      <h2 class="text-lg font-semibold text-red-600 mb-2">Danger Zone</h2>
      <p class="text-sm text-gray-600 mb-4">
        Once you delete your account, there is no going back. Please be certain.
      </p>
      <Button variant="danger" @click="() => alert('Account deactivation feature - TODO')">
        Deactivate Account
      </Button>
    </div>
  </div>
</template>