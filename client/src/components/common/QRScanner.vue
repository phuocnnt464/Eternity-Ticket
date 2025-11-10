<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { Html5Qrcode } from 'html5-qrcode'
import { CameraIcon, XMarkIcon } from '@heroicons/vue/24/outline'

const props = defineProps({
  fps: {
    type: Number,
    default: 10
  },
  qrbox: {
    type: Number,
    default: 250
  }
})

const emit = defineEmits(['scan', 'error'])

const scanning = ref(false)
const error = ref('')
const html5QrCode = ref(null)

const startScanning = async () => {
  try {
    error.value = ''
    
    html5QrCode.value = new Html5Qrcode('qr-reader')
    
    await html5QrCode.value.start(
      { facingMode: 'environment' },
      {
        fps: props.fps,
        qrbox: props.qrbox
      },
      (decodedText) => {
        emit('scan', decodedText)
      },
      (errorMessage) => {
        // Scanning errors are normal, just ignore
      }
    )
    
    scanning.value = true
  } catch (err) {
    error.value = err.message || 'Failed to start camera'
    emit('error', error.value)
  }
}

const stopScanning = async () => {
  if (html5QrCode.value) {
    try {
      await html5QrCode.value.stop()
      scanning.value = false
    } catch (err) {
      console.error('Stop scanning error:', err)
    }
  }
}

onBeforeUnmount(() => {
  stopScanning()
})
</script>

<template>
  <div class="w-full">
    <div v-if="!scanning" class="text-center p-8 bg-gray-50 rounded-lg border-2 border-dashed">
      <CameraIcon class="w-16 h-16 text-gray-400 mx-auto mb-4" />
      <p v-if="error" class="text-red-600 mb-4">{{ error }}</p>
      <button @click="startScanning" class="btn-primary">
        Start Scanning
      </button>
    </div>

    <div v-else class="relative">
      <div id="qr-reader" class="rounded-lg overflow-hidden"></div>
      
      <button
        @click="stopScanning"
        class="absolute top-4 right-4 btn-danger btn-sm"
      >
        <XMarkIcon class="w-5 h-5" />
        Stop
      </button>
    </div>
  </div>
</template>

<style scoped>
:deep(#qr-reader) {
  border: none;
}

:deep(#qr-reader video) {
  border-radius: 0.5rem;
}
</style>