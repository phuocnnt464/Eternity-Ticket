<script setup>
import { ref, onMounted } from 'vue'
import { ordersAPI } from '@/api/orders.js'

const debugInfo = ref(null)
const loading = ref(false)
const error = ref(null)

const loadDebugInfo = async () => {
  loading.value = true
  error.value = null
  
  try {
    const response = await fetch('/api/orders/debug/vnpay', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      }
    })
    
    const data = await response.json()
    debugInfo.value = data
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadDebugInfo()
})
</script>

<template>
  <div class="container mx-auto p-8">
    <h1 class="text-2xl font-bold mb-4">🔍 VNPay Debug Info</h1>
    
    <div v-if="loading" class="text-gray-600">Loading...</div>
    
    <div v-else-if="error" class="bg-red-100 p-4 rounded text-red-700">
      ❌ Error: {{ error }}
    </div>
    
    <div v-else-if="debugInfo" class="bg-gray-50 p-6 rounded">
      <pre class="text-sm overflow-auto">{{ JSON.stringify(debugInfo, null, 2) }}</pre>
      
      <div class="mt-4 space-y-2">
        <div class="flex items-center">
          <span class="font-semibold w-48">Credentials Configured:</span>
          <span :class="debugInfo.data?.credentials_configured ? 'text-green-600' : 'text-red-600'">
            {{ debugInfo.data?.credentials_configured ? '✅ Yes' : '❌ No' }}
          </span>
        </div>
        
        <div class="flex items-center">
          <span class="font-semibold w-48">TMN Code:</span>
          <code class="bg-gray-200 px-2 py-1 rounded">{{ debugInfo.data?.tmn_code }}</code>
        </div>
        
        <div class="flex items-center">
          <span class="font-semibold w-48">TMN Code Length:</span>
          <span>{{ debugInfo.data?.tmn_code_length }} chars</span>
        </div>
        
        <div class="flex items-center">
          <span class="font-semibold w-48">Hash Secret Length:</span>
          <span>{{ debugInfo.data?.hash_secret_length }} chars</span>
        </div>
        
        <div class="flex items-center">
          <span class="font-semibold w-48">VNPay URL:</span>
          <code class="bg-gray-200 px-2 py-1 rounded text-xs">{{ debugInfo.data?.vnpay_url }}</code>
        </div>
        
        <div v-if="debugInfo.data?.test_payment_url" class="mt-4">
          <span class="font-semibold">Test Payment URL:</span>
          <div class="bg-blue-50 p-2 rounded mt-2 break-all text-xs">
            <a :href="debugInfo.data.test_payment_url" target="_blank" class="text-blue-600 hover:underline">
              {{ debugInfo.data.test_payment_url }}
            </a>
          </div>
        </div>
        
        <div v-if="debugInfo.data?.error" class="mt-4">
          <span class="font-semibold text-red-600">Error:</span>
          <div class="bg-red-50 p-2 rounded mt-2">
            {{ debugInfo.data.error }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>