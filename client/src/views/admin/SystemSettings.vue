<script setup>
import { ref, onMounted } from 'vue'
import { adminAPI } from '@/api/admin.js'
import Card from '@/components/common/Card.vue'
import Button from '@/components/common/Button.vue'
import Input from '@/components/common/Input.vue'
import Spinner from '@/components/common/Spinner.vue'
import {
  Cog6ToothIcon,
  CurrencyDollarIcon,
  BellIcon,
  ShieldCheckIcon,
  EnvelopeIcon,
  CheckCircleIcon
} from '@heroicons/vue/24/outline'

const loading = ref(true)
const saving = ref(false)
const activeTab = ref('general')

const settings = ref({
  // General Settings
  site_name: '',
  site_description: '',
  support_email: '',
  
  // Payment Settings
  payment_gateway: 'stripe',
  stripe_public_key: '',
  stripe_secret_key: '',
  paypal_client_id: '',
  paypal_secret: '',
  platform_fee_percentage: 10,
  
  // Email Settings
  smtp_host: '',
  smtp_port: 587,
  smtp_username: '',
  smtp_password: '',
  smtp_from_email: '',
  smtp_from_name: '',
  
  // Notification Settings
  enable_email_notifications: true,
  enable_sms_notifications: false,
  notify_event_approval: true,
  notify_ticket_purchase: true,
  notify_refund_request: true,
  
  // Security Settings
  require_email_verification: true,
  enable_two_factor_auth: false,
  session_timeout_minutes: 60,
  max_login_attempts: 5,
  password_min_length: 8,
  
  // Maintenance Mode
  maintenance_mode: false,
  maintenance_message: ''
})

const errors = ref({})
const successMessage = ref('')

const tabs = [
  { id: 'general', name: 'General', icon: Cog6ToothIcon },
  { id: 'payment', name: 'Payment', icon: CurrencyDollarIcon },
  { id: 'email', name: 'Email', icon: EnvelopeIcon },
  { id: 'notifications', name: 'Notifications', icon: BellIcon },
  { id: 'security', name: 'Security', icon: ShieldCheckIcon }
]

const paymentGateways = [
  { value: 'stripe', label: 'Stripe' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'vnpay', label: 'VNPay' }
]

const fetchSettings = async () => {
  loading.value = true
  try {
    const response = await adminAPI.getSettings()
    settings.value = { ...settings.value, ...response.data.data }
  } catch (error) {
    console.error('Failed to fetch settings:', error)
  } finally {
    loading.value = false
  }
}

const validateSettings = () => {
  errors.value = {}
  
  if (activeTab.value === 'general') {
    if (!settings.value.site_name) {
      errors.value.site_name = 'Site name is required'
    }
    if (!settings.value.support_email) {
      errors.value.support_email = 'Support email is required'
    }
  }
  
  if (activeTab.value === 'payment') {
    if (settings.value.platform_fee_percentage < 0 || settings.value.platform_fee_percentage > 100) {
      errors.value.platform_fee_percentage = 'Fee must be between 0 and 100'
    }
  }
  
  if (activeTab.value === 'email') {
    if (!settings.value.smtp_host) {
      errors.value.smtp_host = 'SMTP host is required'
    }
    if (!settings.value.smtp_from_email) {
      errors.value.smtp_from_email = 'From email is required'
    }
  }
  
  return Object.keys(errors.value).length === 0
}

const handleSave = async () => {
  if (!validateSettings()) {
    alert('Please fix the errors before saving')
    return
  }
  
  saving.value = true
  successMessage.value = ''
  
  try {
    await adminAPI.updateSettings(settings.value)
    successMessage.value = 'Settings saved successfully!'
    
    setTimeout(() => {
      successMessage.value = ''
    }, 3000)
  } catch (error) {
    alert(error.response?.data?.error?.message || 'Failed to save settings')
  } finally {
    saving.value = false
  }
}

const handleTestEmail = async () => {
  try {
    await adminAPI.testEmailSettings({
      to: settings.value.support_email
    })
    alert('Test email sent successfully! Please check your inbox.')
  } catch (error) {
    alert('Failed to send test email: ' + (error.response?.data?.error?.message || 'Unknown error'))
  }
}

onMounted(() => {
  fetchSettings()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-2xl font-bold text-gray-900">System Settings</h1>
      <p class="text-gray-600 mt-1">Configure platform-wide settings</p>
    </div>

    <!-- Success Message -->
    <div v-if="successMessage" class="bg-green-50 border border-green-200 rounded-lg p-4">
      <div class="flex items-center space-x-2 text-green-800">
        <CheckCircleIcon class="w-5 h-5" />
        <p class="font-medium">{{ successMessage }}</p>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <Spinner size="xl" />
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <!-- Sidebar Tabs -->
      <div class="lg:col-span-1">
        <Card no-padding>
          <nav class="space-y-1">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              @click="activeTab = tab.id"
              :class="[
                'w-full flex items-center space-x-3 px-4 py-3 text-left transition-colors',
                activeTab === tab.id
                  ? 'bg-primary-50 text-primary-700 border-r-4 border-primary-600'
                  : 'text-gray-700 hover:bg-gray-50'
              ]"
            >
              <component :is="tab.icon" class="w-5 h-5" />
              <span class="font-medium">{{ tab.name }}</span>
            </button>
          </nav>
        </Card>
      </div>

      <!-- Content Area -->
      <div class="lg:col-span-3">
        <!-- General Settings -->
        <Card v-show="activeTab === 'general'">
          <h2 class="text-xl font-semibold mb-6">General Settings</h2>
          <div class="space-y-4">
            <Input
              v-model="settings.site_name"
              label="Site Name"
              placeholder="Eternity Ticket"
              :error="errors.site_name"
              required
            />

            <div>
              <label class="label">Site Description</label>
              <textarea
                v-model="settings.site_description"
                rows="3"
                placeholder="Your trusted platform for event tickets..."
                class="textarea"
              ></textarea>
            </div>

            <Input
              v-model="settings.support_email"
              type="email"
              label="Support Email"
              placeholder="support@eternityticket.com"
              :error="errors.support_email"
              :icon="EnvelopeIcon"
              help-text="This email will be displayed for customer support"
              required
            />
          </div>
        </Card>

        <!-- Payment Settings -->
        <Card v-show="activeTab === 'payment'">
          <h2 class="text-xl font-semibold mb-6">Payment Settings</h2>
          <div class="space-y-4">
            <div>
              <label class="label label-required">Payment Gateway</label>
              <select v-model="settings.payment_gateway" class="select">
                <option
                  v-for="gateway in paymentGateways"
                  :key="gateway.value"
                  :value="gateway.value"
                >
                  {{ gateway.label }}
                </option>
              </select>
            </div>

            <Input
              v-model.number="settings.platform_fee_percentage"
              type="number"
              label="Platform Fee (%)"
              placeholder="10"
              :error="errors.platform_fee_percentage"
              help-text="Percentage of ticket price taken as platform fee"
              required
            />

            <!-- Stripe Settings -->
            <div v-if="settings.payment_gateway === 'stripe'" class="space-y-4 pt-4 border-t">
              <h3 class="font-semibold">Stripe Configuration</h3>
              <Input
                v-model="settings.stripe_public_key"
                label="Stripe Public Key"
                placeholder="pk_test_..."
                :error="errors.stripe_public_key"
              />
              <Input
                v-model="settings.stripe_secret_key"
                type="password"
                label="Stripe Secret Key"
                placeholder="sk_test_..."
                :error="errors.stripe_secret_key"
              />
            </div>

            <!-- PayPal Settings -->
            <div v-if="settings.payment_gateway === 'paypal'" class="space-y-4 pt-4 border-t">
              <h3 class="font-semibold">PayPal Configuration</h3>
              <Input
                v-model="settings.paypal_client_id"
                label="PayPal Client ID"
                placeholder="AXt..."
                :error="errors.paypal_client_id"
              />
              <Input
                v-model="settings.paypal_secret"
                type="password"
                label="PayPal Secret"
                placeholder="EIL..."
                :error="errors.paypal_secret"
              />
            </div>
          </div>
        </Card>

        <!-- Email Settings -->
        <Card v-show="activeTab === 'email'">
          <h2 class="text-xl font-semibold mb-6">Email Settings</h2>
          <div class="space-y-4">
            <Input
              v-model="settings.smtp_host"
              label="SMTP Host"
              placeholder="smtp.gmail.com"
              :error="errors.smtp_host"
              required
            />

            <Input
              v-model.number="settings.smtp_port"
              type="number"
              label="SMTP Port"
              placeholder="587"
              :error="errors.smtp_port"
              required
            />

            <Input
              v-model="settings.smtp_username"
              label="SMTP Username"
              placeholder="your-email@gmail.com"
              :error="errors.smtp_username"
            />

            <Input
              v-model="settings.smtp_password"
              type="password"
              label="SMTP Password"
              placeholder="••••••••"
              :error="errors.smtp_password"
            />

            <Input
              v-model="settings.smtp_from_email"
              type="email"
              label="From Email"
              placeholder="noreply@eternityticket.com"
              :error="errors.smtp_from_email"
              required
            />

            <Input
              v-model="settings.smtp_from_name"
              label="From Name"
              placeholder="Eternity Ticket"
              :error="errors.smtp_from_name"
            />

            <div class="pt-4 border-t">
              <Button variant="secondary" @click="handleTestEmail">
                Send Test Email
              </Button>
            </div>
          </div>
        </Card>

        <!-- Notification Settings -->
        <Card v-show="activeTab === 'notifications'">
          <h2 class="text-xl font-semibold mb-6">Notification Settings</h2>
          <div class="space-y-4">
            <label class="flex items-center space-x-3 cursor-pointer p-4 border rounded-lg hover:bg-gray-50">
              <input
                v-model="settings.enable_email_notifications"
                type="checkbox"
                class="w-5 h-5 rounded"
              />
              <div>
                <p class="font-medium">Enable Email Notifications</p>
                <p class="text-sm text-gray-600">Send email notifications to users</p>
              </div>
            </label>

            <label class="flex items-center space-x-3 cursor-pointer p-4 border rounded-lg hover:bg-gray-50">
              <input
                v-model="settings.enable_sms_notifications"
                type="checkbox"
                class="w-5 h-5 rounded"
              />
              <div>
                <p class="font-medium">Enable SMS Notifications</p>
                <p class="text-sm text-gray-600">Send SMS notifications to users</p>
              </div>
            </label>

            <div class="pt-4 border-t">
              <h3 class="font-semibold mb-3">Notification Events</h3>
              <div class="space-y-2">
                <label class="flex items-center space-x-3 cursor-pointer">
                  <input
                    v-model="settings.notify_event_approval"
                    type="checkbox"
                    class="w-4 h-4 rounded"
                  />
                  <span class="text-sm">Event Approval/Rejection</span>
                </label>

                <label class="flex items-center space-x-3 cursor-pointer">
                  <input
                    v-model="settings.notify_ticket_purchase"
                    type="checkbox"
                    class="w-4 h-4 rounded"
                  />
                  <span class="text-sm">Ticket Purchase</span>
                </label>

                <label class="flex items-center space-x-3 cursor-pointer">
                  <input
                    v-model="settings.notify_refund_request"
                    type="checkbox"
                    class="w-4 h-4 rounded"
                  />
                  <span class="text-sm">Refund Requests</span>
                </label>
              </div>
            </div>
          </div>
        </Card>

        <!-- Security Settings -->
        <Card v-show="activeTab === 'security'">
          <h2 class="text-xl font-semibold mb-6">Security Settings</h2>
          <div class="space-y-4">
            <label class="flex items-center space-x-3 cursor-pointer p-4 border rounded-lg hover:bg-gray-50">
              <input
                v-model="settings.require_email_verification"
                type="checkbox"
                class="w-5 h-5 rounded"
              />
              <div>
                <p class="font-medium">Require Email Verification</p>
                <p class="text-sm text-gray-600">Users must verify email before accessing platform</p>
              </div>
            </label>

            <label class="flex items-center space-x-3 cursor-pointer p-4 border rounded-lg hover:bg-gray-50">
              <input
                v-model="settings.enable_two_factor_auth"
                type="checkbox"
                class="w-5 h-5 rounded"
              />
              <div>
                <p class="font-medium">Enable Two-Factor Authentication</p>
                <p class="text-sm text-gray-600">Allow users to enable 2FA for their accounts</p>
              </div>
            </label>

            <Input
              v-model.number="settings.session_timeout_minutes"
              type="number"
              label="Session Timeout (minutes)"
              placeholder="60"
              help-text="How long before inactive sessions expire"
            />

            <Input
              v-model.number="settings.max_login_attempts"
              type="number"
              label="Max Login Attempts"
              placeholder="5"
              help-text="Number of failed attempts before account lockout"
            />

            <Input
              v-model.number="settings.password_min_length"
              type="number"
              label="Minimum Password Length"
              placeholder="8"
              help-text="Minimum number of characters required for passwords"
            />

            <div class="pt-4 border-t">
              <label class="flex items-center space-x-3 cursor-pointer p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                <input
                  v-model="settings.maintenance_mode"
                  type="checkbox"
                  class="w-5 h-5 rounded"
                />
                <div>
                  <p class="font-medium text-red-900">Maintenance Mode</p>
                  <p class="text-sm text-red-700">Enable to temporarily disable the platform</p>
                </div>
              </label>

              <div v-if="settings.maintenance_mode" class="mt-3">
                <label class="label">Maintenance Message</label>
                <textarea
                  v-model="settings.maintenance_message"
                  rows="3"
                  placeholder="We're currently performing maintenance. We'll be back soon!"
                  class="textarea"
                ></textarea>
              </div>
            </div>
          </div>
        </Card>

        <!-- Save Button -->
        <div class="flex justify-end space-x-3 mt-6">
          <Button
            variant="secondary"
            @click="fetchSettings"
          >
            Reset
          </Button>
          <Button
            variant="primary"
            :loading="saving"
            @click="handleSave"
          >
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>