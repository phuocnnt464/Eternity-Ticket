import { ref } from 'vue'
import { UPLOAD_LIMITS } from '@/utils/constants'

/**
 * Image upload composable
 */
export function useImageUpload(options = {}) {
  const {
    maxSize = UPLOAD_LIMITS.IMAGE_MAX_SIZE,
    allowedTypes = UPLOAD_LIMITS.ALLOWED_IMAGE_TYPES,
    maxWidth = null,
    maxHeight = null
  } = options

  const file = ref(null)
  const preview = ref(null)
  const uploading = ref(false)
  const progress = ref(0)
  const error = ref(null)

  // Validate file
  const validateFile = (fileToValidate) => {
    error.value = null

    // Check if file exists
    if (!fileToValidate) {
      error.value = 'Please select a file'
      return false
    }

    // Check file type
    if (!allowedTypes.includes(fileToValidate.type)) {
      error.value = 'Invalid file type. Allowed types: ' + allowedTypes.join(', ')
      return false
    }

    // Check file size
    if (fileToValidate.size > maxSize) {
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2)
      error.value = `File size must be less than ${maxSizeMB}MB`
      return false
    }

    return true
  }

  // Validate image dimensions
  const validateDimensions = (img) => {
    if (maxWidth && img.width > maxWidth) {
      error.value = `Image width must not exceed ${maxWidth}px`
      return false
    }

    if (maxHeight && img.height > maxHeight) {
      error.value = `Image height must not exceed ${maxHeight}px`
      return false
    }

    return true
  }

  // Create preview
  const createPreview = (fileToPreview) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (e) => {
        preview.value = e.target.result

        // If dimensions validation is needed
        if (maxWidth || maxHeight) {
          const img = new Image()
          img.onload = () => {
            if (validateDimensions(img)) {
              resolve(preview.value)
            } else {
              preview.value = null
              reject(new Error(error.value))
            }
          }
          img.onerror = () => {
            error.value = 'Failed to load image'
            reject(new Error(error.value))
          }
          img.src = e.target.result
        } else {
          resolve(preview.value)
        }
      }

      reader.onerror = () => {
        error.value = 'Failed to read file'
        reject(new Error(error.value))
      }

      reader.readAsDataURL(fileToPreview)
    })
  }

  // Handle file selection
  const handleFileSelect = async (event) => {
    const selectedFile = event.target?.files?.[0] || event

    if (!validateFile(selectedFile)) {
      file.value = null
      preview.value = null
      return { success: false, error: error.value }
    }

    file.value = selectedFile

    try {
      await createPreview(selectedFile)
      return { success: true, file: file.value, preview: preview.value }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // Upload file
  const uploadFile = async (uploadFn) => {
    if (!file.value) {
      error.value = 'No file selected'
      return { success: false, error: error.value }
    }

    uploading.value = true
    progress.value = 0
    error.value = null

    try {
      const result = await uploadFn(file.value, (progressEvent) => {
        progress.value = Math.round((progressEvent.loaded * 100) / progressEvent.total)
      })

      return { success: true, data: result }
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      uploading.value = false
    }
  }

  // Clear selection
  const clear = () => {
    file.value = null
    preview.value = null
    error.value = null
    progress.value = 0
  }

  // Compress image
  const compressImage = (quality = 0.8) => {
    return new Promise((resolve, reject) => {
      if (!file.value || !preview.value) {
        reject(new Error('No image to compress'))
        return
      }

      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height

        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.value.name, {
                type: file.value.type,
                lastModified: Date.now()
              })
              file.value = compressedFile
              resolve(compressedFile)
            } else {
              reject(new Error('Compression failed'))
            }
          },
          file.value.type,
          quality
        )
      }

      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = preview.value
    })
  }

  return {
    // State
    file,
    preview,
    uploading,
    progress,
    error,

    // Methods
    handleFileSelect,
    uploadFile,
    clear,
    compressImage,
    validateFile
  }
}