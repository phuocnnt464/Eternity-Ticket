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
  site_name: '',
  site_description: '',
  currency_code: '',
  currency_symbol: '',
  timezone: '',
  date_format: '',
  time_format: '',
  
  max_queue_capacity: '',
  ticket_hold_duration_minutes: '',
  max_file_size_mb: '',
  
  vat_rate: '',
  
  premium_discount_rate: '',
  advanced_discount_rate: '',
  premium_early_access_hours: ''
})

const errors = ref({})
const successMessage = ref('')

const tabs = [
  { id: 'general', name: 'General', icon: Cog6ToothIcon },
]

const fetchSettings = async () => {
  loading.value = true
  try {
    const response = await adminAPI.getSettings()
    const settingsArray = response.data.settings 

    const settingsObj = {}
    settingsArray.forEach(setting => {
      settingsObj[setting.setting_key] = setting.setting_value
    })
    
    settings.value = { ...settings.value, ...settingsObj }
  } catch (error) {
    console.error('Failed to fetch settings:', error)
    alert('Failed to load settings')
  } finally {
    loading.value = false
  }
}

const validateSettings = () => {
  errors.value = {}
  
  if (!settings.value.site_name?.trim()) {
    errors.value.site_name = 'Site name is required'
  }
  
  if (!settings.value.site_description?.trim()) {
    errors.value.site_description = 'Site description is required'
  }
  
  const numericFields = [
    'max_queue_capacity',
    'ticket_hold_duration_minutes', 
    'max_file_size_mb',
    'premium_early_access_hours'
  ]
  
  numericFields.forEach(field => {
    const value = Number(settings.value[field])
    if (isNaN(value) || value <= 0) {
      errors.value[field] = 'Must be a positive number'
    }
  })
  
  const rateFields = ['vat_rate', 'premium_discount_rate', 'advanced_discount_rate']
  rateFields.forEach(field => {
    const value = Number(settings.value[field])
    if (isNaN(value) || value < 0 || value > 1) {
      errors.value[field] = 'Must be between 0 and 1 (e.g., 0.1 for 10%)'
    }
  })
  
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
    const settingsToSave = {
      site_name: settings.value.site_name,
      site_description: settings.value.site_description,
      currency_code: settings.value.currency_code,
      currency_symbol: settings.value.currency_symbol,
      timezone: settings.value.timezone,
      date_format: settings.value.date_format,
      time_format: settings.value.time_format,
      max_queue_capacity: settings.value.max_queue_capacity,
      ticket_hold_duration_minutes: settings.value.ticket_hold_duration_minutes,
      max_file_size_mb: settings.value.max_file_size_mb,
      vat_rate: settings.value.vat_rate,
      premium_discount_rate: settings.value.premium_discount_rate,
      advanced_discount_rate: settings.value.advanced_discount_rate,
      premium_early_access_hours: settings.value.premium_early_access_hours
    }

    // Remove undefined/null/empty values
    const cleanedSettings = {}
    for (const [key, value] of Object.entries(settingsToSave)) {
      if (value !== undefined && value !== null && value !== '') {
        cleanedSettings[key] = value
      }
    }

    await adminAPI.updateSettingsBulk(cleanedSettings) 

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

onMounted(() => {
  fetchSettings()
})
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">System Settings</h1>
      <p class="text-gray-600 mt-1">Configure platform-wide settings</p>
    </div>

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

      <div class="lg:col-span-3">
        <Card>
          <h2 class="text-xl font-semibold mb-6">System Settings</h2>
          
          <div class="space-y-8">
            <div class="space-y-4">
              <h3 class="text-lg font-medium text-gray-900 border-b pb-2">Site Information</h3>
              
              <Input
                v-model="settings.site_name"
                label="Site Name"
                placeholder="Eternity Ticket"
                :error="errors.site_name"
                required
              />

              <div>
                <label class="label label-required">Site Description</label>
                <textarea
                  v-model="settings.site_description"
                  rows="3"
                  placeholder="Event ticketing and management platform"
                  class="textarea"
                  :class="{ 'border-red-500': errors.site_description }"
                ></textarea>
                <p v-if="errors.site_description" class="mt-1 text-sm text-red-600">
                  {{ errors.site_description }}
                </p>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <Input
                  v-model="settings.currency_code"
                  label="Currency Code"
                  placeholder="VND"
                  help-text="ISO currency code"
                />
                <Input
                  v-model="settings.currency_symbol"
                  label="Currency Symbol"
                  placeholder="₫"
                />
              </div>

              <Input
                v-model="settings.timezone"
                label="Timezone"
                placeholder="Asia/Ho_Chi_Minh"
              />

              <div class="grid grid-cols-2 gap-4">
                <Input
                  v-model="settings.date_format"
                  label="Date Format"
                  placeholder="DD/MM/YYYY"
                />
                <Input
                  v-model="settings.time_format"
                  label="Time Format"
                  placeholder="24"
                  help-text="12 or 24 hour format"
                />
              </div>
            </div>

            <div class="space-y-4">
              <h3 class="text-lg font-medium text-gray-900 border-b pb-2">System Limits</h3>
              
              <Input
                v-model="settings.max_queue_capacity"
                type="number"
                label="Max Queue Capacity"
                placeholder="1000"
                :error="errors.max_queue_capacity"
                help-text="Maximum waiting room capacity per event"
                required
              />

              <Input
                v-model="settings.ticket_hold_duration_minutes"
                type="number"
                label="Ticket Hold Duration (minutes)"
                placeholder="15"
                :error="errors.ticket_hold_duration_minutes"
                help-text="How long tickets are held during checkout"
                required
              />

              <Input
                v-model="settings.max_file_size_mb"
                type="number"
                label="Max File Size (MB)"
                placeholder="2"
                :error="errors.max_file_size_mb"
                help-text="Maximum file upload size"
                required
              />
            </div>

            <div class="space-y-4">
              <h3 class="text-lg font-medium text-gray-900 border-b pb-2">Financial Settings</h3>
              
              <Input
                v-model="settings.vat_rate"
                type="number"
                step="0.01"
                label="VAT Rate"
                placeholder="0.1"
                :error="errors.vat_rate"
                help-text="VAT/Tax rate as decimal (0.1 = 10%)"
                required
              />
            </div>

            <div class="space-y-4">
              <h3 class="text-lg font-medium text-gray-900 border-b pb-2">Membership Discount Rates</h3>
              
              <Input
                v-model="settings.premium_discount_rate"
                type="number"
                step="0.01"
                label="Premium Discount Rate"
                placeholder="0.1"
                :error="errors.premium_discount_rate"
                help-text="Premium membership discount (0.1 = 10%)"
                required
              />

              <Input
                v-model="settings.advanced_discount_rate"
                type="number"
                step="0.01"
                label="Advanced Discount Rate"
                placeholder="0.05"
                :error="errors.advanced_discount_rate"
                help-text="Advanced membership discount (0.05 = 5%)"
                required
              />

              <Input
                v-model="settings.premium_early_access_hours"
                type="number"
                label="Premium Early Access (hours)"
                placeholder="5"
                :error="errors.premium_early_access_hours"
                help-text="Hours of early access for premium members"
                required
              />
            </div>
          </div>
        </Card>

        <div class="flex justify-end space-x-3 mt-6">
          <Button variant="secondary" @click="fetchSettings">
            Reset
          </Button>
          <Button variant="primary" :loading="saving" @click="handleSave">
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>