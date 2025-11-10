<script setup>
import { onMounted, ref, watch } from 'vue'
import QRCode from 'qrcode'

const props = defineProps({
  value: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    default: 200
  },
  errorCorrectionLevel: {
    type: String,
    default: 'M',
    validator: (value) => ['L', 'M', 'Q', 'H'].includes(value)
  }
})

const canvas = ref(null)

const generateQR = async () => {
  if (!canvas.value || !props.value) return
  
  try {
    await QRCode.toCanvas(canvas.value, props.value, {
      width: props.size,
      margin: 2,
      errorCorrectionLevel: props.errorCorrectionLevel,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })
  } catch (error) {
    console.error('QR Code generation error:', error)
  }
}

onMounted(() => {
  generateQR()
})

watch(() => props.value, () => {
  generateQR()
})
</script>

<template>
  <div class="inline-flex items-center justify-center">
    <canvas ref="canvas" class="rounded-lg"></canvas>
  </div>
</template>