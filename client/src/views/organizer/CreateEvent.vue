<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { eventsAPI } from '@/api/events.js'
import { sessionsAPI } from '@/api/sessions.js'
import Input from '@/components/common/Input.vue'
import Button from '@/components/common/Button.vue'
import Card from '@/components/common/Card.vue'
import {
  CalendarIcon,
  MapPinIcon,
  PhotoIcon,
  PlusIcon,
  TrashIcon,
  BuildingOfficeIcon,
  BanknotesIcon,
  GlobeAltIcon,
  LockClosedIcon,
  InformationCircleIcon
} from '@heroicons/vue/24/outline'

const router = useRouter()

const currentStep = ref(1)
const loading = ref(false)
const categories = ref([])

// Event Form
const eventForm = ref({
  // Basic Info
  title: '',
  description: '',
  category_id: '',
  start_date: '',
  end_date: '',
  
  // Venue Info
  venue_name: '',
  venue_address: '',
  venue_city: '',
  venue_capacity: null,
  
  // Organizer Info
  organizer_name: '',
  organizer_description: '',
  organizer_contact_email: '',
  organizer_contact_phone: '',
  
  // Privacy
  is_public: true,
  
  // Payment Info
  payment_account_name: '',
  payment_account_number: '',
  payment_bank_name: '',
  payment_bank_branch: '',
  
  // Images
  cover_image: null,
  thumbnail_image: null,
  logo_image: null,
  venue_map_image: null
})

// ✅ ĐÚNG: Sessions với min/max tickets per order CỦA SESSION
const sessions = ref([
  {
    name: 'Main Session',
    start_time: '',
    end_time: '',
    min_tickets_per_order: 1,    // ✅ Min tổng vé cho mỗi đơn hàng
    max_tickets_per_order: 10,   // ✅ Max tổng vé cho mỗi đơn hàng
    ticket_types: [
      {
        name: 'General Admission',
        price: 0,
        quantity: 0,
        min_quantity_per_order: 1,          // ✅ Min của LOẠI VÉ này
        max_quantity_per_order: 10,         // ✅ Max của LOẠI VÉ này (phải <= session max)
        sale_start_time: '',
        sale_end_time: ''
      }
    ]
  }
])

const errors = ref({})
const coverPreview = ref(null)
const thumbnailPreview = ref(null)
const logoPreview = ref(null)
const venueMapPreview = ref(null)

const totalSteps = 5

const canProceed = computed(() => {
  if (currentStep.value === 1) {
    return eventForm.value.title && 
           eventForm.value.description && 
           eventForm.value.category_id &&
           eventForm.value.start_date &&
           eventForm.value.end_date
  }
  if (currentStep.value === 2) {
    return eventForm.value.venue_name && 
           eventForm.value.venue_address &&
           eventForm.value.venue_city
  }
  if (currentStep.value === 3) {
    return eventForm.value.organizer_name &&
           eventForm.value.organizer_contact_email
  }
  if (currentStep.value === 4) {
    return eventForm.value.payment_account_name &&
           eventForm.value.payment_account_number &&
           eventForm.value.payment_bank_name
  }
  return true
})

const handleImageUpload = (event, type) => {
  const file = event.target.files[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    errors.value[type] = 'Please select an image file'
    return
  }

  const maxSize = type === 'venue_map_image' ? 2 * 1024 * 1024 : 5 * 1024 * 1024
  if (file.size > maxSize) {
    errors.value[type] = `Image size must be less than ${maxSize / 1024 / 1024}MB`
    return
  }

  eventForm.value[type] = file
  errors.value[type] = ''

  const reader = new FileReader()
  reader.onload = (e) => {
    if (type === 'cover_image') {
      coverPreview.value = e.target.result
    } else if (type === 'thumbnail_image') {
      thumbnailPreview.value = e.target.result
    } else if (type === 'logo_image') {
      logoPreview.value = e.target.result
    } else if (type === 'venue_map_image') {
      venueMapPreview.value = e.target.result
    }
  }
  reader.readAsDataURL(file)
}

const addSession = () => {
  sessions.value.push({
    name: `Session ${sessions.value.length + 1}`,
    start_time: '',
    end_time: '',
    min_tickets_per_order: 1,
    max_tickets_per_order: 10,
    ticket_types: [
      {
        name: 'General Admission',
        price: 0,
        quantity: 0,
        min_per_order: 1,
        max_per_order: 10,
        sale_start_time: '',
        sale_end_time: ''
      }
    ]
  })
}

const removeSession = (index) => {
  if (sessions.value.length > 1) {
    sessions.value.splice(index, 1)
  }
}

const addTicketType = (sessionIndex) => {
  sessions.value[sessionIndex].ticket_types.push({
    name: '',
    price: 0,
    quantity: 0,
    min_quantity_per_order: 1,
    max_quantity_per_order: sessions.value[sessionIndex].max_tickets_per_order,
    sale_start_time: '',
    sale_end_time: ''
  })
}

const removeTicketType = (sessionIndex, ticketIndex) => {
  if (sessions.value[sessionIndex].ticket_types.length > 1) {
    sessions.value[sessionIndex].ticket_types.splice(ticketIndex, 1)
  }
}

const nextStep = () => {
  if (currentStep.value < totalSteps && canProceed.value) {
    currentStep.value++
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

const prevStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

const validateForm = () => {
  errors.value = {}
  
  if (!eventForm.value.title) errors.value.title = 'Title is required'
  if (!eventForm.value.description) errors.value.description = 'Description is required'
  if (!eventForm.value.category_id) errors.value.category_id = 'Category is required'
  if (!eventForm.value.start_date) errors.value.start_date = 'Start date is required'
  if (!eventForm.value.end_date) errors.value.end_date = 'End date is required'
  
  if (new Date(eventForm.value.end_date) < new Date(eventForm.value.start_date)) {
    errors.value.end_date = 'End date must be after start date'
  }
  
  if (!eventForm.value.venue_name) errors.value.venue_name = 'Venue name is required'
  if (!eventForm.value.venue_address) errors.value.venue_address = 'Venue address is required'
  if (!eventForm.value.venue_city) errors.value.venue_city = 'Venue city is required'
  if (!eventForm.value.organizer_name) errors.value.organizer_name = 'Organizer name is required'
  if (!eventForm.value.organizer_contact_email) errors.value.organizer_contact_email = 'Contact email is required'
  
  if (eventForm.value.organizer_description && eventForm.value.organizer_description.length > 1000) {
    errors.value.organizer_description = 'Organizer description cannot exceed 1000 characters'
  }
  
  if (!eventForm.value.payment_account_name) errors.value.payment_account_name = 'Account name is required'
  if (!eventForm.value.payment_account_number) errors.value.payment_account_number = 'Account number is required'
  if (!eventForm.value.payment_bank_name) errors.value.payment_bank_name = 'Bank name is required'
  
  return Object.keys(errors.value).length === 0
}

const handleSubmit = async (status = 'draft') => {
  if (!validateForm()) {
    alert('Please fill in all required fields')
    return
  }

  loading.value = true
  try {
    const formData = new FormData()
    // Object.keys(eventForm.value).forEach(key => {
    //   if (eventForm.value[key] !== null && eventForm.value[key] !== '') {
    //     formData.append(key, eventForm.value[key])
    //   }
    // })
    Object.keys(eventForm.value).forEach(key => {
      const value = eventForm.value[key]
      
      // Bỏ qua các file images (xử lý riêng sau)
      if (key === 'cover_image' || key === 'thumbnail_image' || 
          key === 'logo_image' || key === 'venue_map_image') {
        return
      }
      
      // Append tất cả các trường khác (kể cả rỗng)
      if (value !== null && value !== undefined) {
        formData.append(key, value)
      }
    })
    
    // Thêm images nếu có
    if (eventForm.value.cover_image) {
      formData.append('cover_image', eventForm.value.cover_image)
    }
    if (eventForm.value.thumbnail_image) {
      formData.append('thumbnail_image', eventForm.value.thumbnail_image)
    }
    if (eventForm.value.logo_image) {
      formData.append('logo_image', eventForm.value.logo_image)
    }
    if (eventForm.value.venue_map_image) {
      formData.append('venue_map_image', eventForm.value.venue_map_image)
    }

    formData.append('status', status)

    console.log('FormData contents:')
    for (let [key, value] of formData.entries()) {
      console.log(key, ':', value instanceof File ? `File: ${value.name}` : value)
    }

    const eventResponse = await eventsAPI.createEvent(formData)

    console.log('response.data:', eventResponse.data)
    console.log('response.data.data:', eventResponse.data.data)

    console.log('=== FULL EVENT RESPONSE ===')
    console.log('Full response object:', JSON.stringify(eventResponse.data, null, 2))
    console.log('Keys at response.data:', Object.keys(eventResponse.data))
    if (eventResponse.data.data) {
      console.log('Keys at response.data.data:', Object.keys(eventResponse.data.data))
    }
    console.log('=== END DEBUG ===')

    const eventId = eventResponse.data.event?.id || eventResponse.data.data?.id  || eventResponse.data.id 

    if (!eventId) {
      // console.error('Full response:', eventResponse)
      console.error('Cannot find event ID in:', {
        'data.data': eventResponse.data.data,
        'data': eventResponse.data
      })
      throw new Error('Event ID not found in response')
    }

    console.log('✅ Creating sessions for event ID:', eventId)

    for (const session of sessions.value) {
      const sessionResponse = await sessionsAPI.createSession(eventId, {
        name: session.name,
        start_time: session.start_time,
        end_time: session.end_time,
        min_tickets_per_order: session.min_tickets_per_order,
        max_tickets_per_order: session.max_tickets_per_order
      })

      const sessionId = sessionResponse.data.data.session_id

      for (const ticket of session.ticket_types) {
        await sessionsAPI.createTicketType(sessionId, ticket)
      }
    }

    alert(status === 'draft' ? 'Event saved as draft!' : 'Event submitted for approval!')
    router.push('/organizer/events')
  } catch (error) {
    console.error('Create event error:', error)
    console.error('Error response:', error.response?.data)  
    alert(error.response?.data?.error?.message || 'Failed to create event')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  try {
    const response = await eventsAPI.getCategories() 
    let cats = response.data.categories || []

    categories.value = cats.sort((a, b) => {
      if (a.name.toLowerCase() === 'others') return 1
      if (b.name.toLowerCase() === 'others') return -1
      return a.name.localeCompare(b.name)
    })
  } catch (error) {
    console.error('Failed to load categories:', error)
    categories.value = [
      { id: '1', name: 'Music' },
      { id: '2', name: 'Sports' },
      { id: '3', name: 'Conference' },
      { id: '4', name: 'Festival' }
    ]
  }
})
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Create New Event</h1>
      <p class="text-gray-600 mt-1">Fill in the details to create your event</p>
    </div>

    <!-- Progress Steps -->
    <div class="card">
      <div class="flex items-center justify-between">
        <div
          v-for="step in totalSteps"
          :key="step"
          class="flex-1"
        >
          <div class="flex items-center">
            <div :class="[
              'w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm',
              currentStep >= step 
                ? 'bg-primary-600 text-white' 
                : 'bg-gray-200 text-gray-600'
            ]">
              {{ step }}
            </div>
            <div v-if="step < totalSteps" :class="[
              'flex-1 h-1 mx-2',
              currentStep > step ? 'bg-primary-600' : 'bg-gray-200'
            ]"></div>
          </div>
          <p class="text-xs mt-2 font-medium">
            {{ 
              step === 1 ? 'Event Info' : 
              step === 2 ? 'Venue' : 
              step === 3 ? 'Organizer' :
              step === 4 ? 'Payment' :
              'Sessions & Tickets'
            }}
          </p>
        </div>
      </div>
    </div>

    <!-- Step 1: Event Information -->
    <Card v-show="currentStep === 1">
      <h2 class="text-xl font-semibold mb-6">Event Information</h2>
      
      <div class="space-y-4">
        <Input
          v-model="eventForm.title"
          label="Event Title"
          placeholder="e.g. Summer Music Festival 2024"
          :error="errors.title"
          required
        />

        <div>
          <label class="label label-required">Description</label>
          <textarea
            v-model="eventForm.description"
            rows="6"
            maxlength="5000"
            placeholder="Describe your event..."
            :class="['textarea', errors.description && 'input-error']"
          ></textarea>
          <p v-if="errors.description" class="error-text">{{ errors.description }}</p>
          <p v-else class="text-xs text-gray-500 mt-1">{{ eventForm.description?.length || 0 }}/5000 characters</p>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div class="md:col-span-1 md:row-span-2">
            <label class="label text-sm">Logo</label>
            <div class="border-2 border-dashed border-gray-300 rounded-lg overflow-hidden">
              <div v-if="logoPreview" class="relative w-full aspect-square bg-gray-100 group">
                <img :src="logoPreview" class="w-full h-full object-cover" />
                <button
                  @click.prevent="logoPreview = null; eventForm.logo_image = null"
                  class="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove image"
                >
                  <TrashIcon class="w-3 h-3" />
                </button>
              </div>
              <div v-else class="w-full aspect-square bg-gray-50 flex flex-col items-center justify-center p-2">
                <PhotoIcon class="w-6 h-6 text-gray-400 mb-1" />
                <p class="text-xs text-gray-500 text-center mb-2">275x275px</p>
                <label class="btn-secondary btn-sm text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded cursor-pointer">
                  Upload
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    @change="handleImageUpload($event, 'logo_image')"
                    class="hidden"
                  />
                </label>
              </div>
            </div>
            <p v-if="errors.logo_image" class="error-text mt-1 text-xs">{{ errors.logo_image }}</p>
          </div>

          <!-- Category  -->
          <div class="md:col-span-5">
            <label class="label label-required">Category</label>
            <select
              v-model="eventForm.category_id"
              :class="['select', errors.category_id && 'input-error']"
            >
              <option value="">Select category</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                {{ cat.name }}
              </option>
            </select>
            <p v-if="errors.category_id" class="error-text">{{ errors.category_id }}</p>
          </div>

          <div class="md:col-span-2">
            <Input
              v-model="eventForm.start_date"
              type="datetime-local"
              label="Start Date & Time"
              :error="errors.start_date"
              :icon="CalendarIcon"
              required
            />
          </div>

          <div class="md:col-span-2">
            <Input
              v-model="eventForm.end_date"
              type="datetime-local"
              label="End Date & Time"
              :error="errors.end_date"
              :icon="CalendarIcon"
              required
            />
          </div>
        </div>

        <!-- Privacy Setting -->
        <div>
          <label class="label label-required">Privacy</label>
          <div class="flex items-center space-x-4">
            <label class="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                v-model="eventForm.is_public"
                :value="true"
                class="radio"
              />
              <GlobeAltIcon class="w-5 h-5 text-green-600" />
              <span class="font-medium">Public - Everyone can see</span>
            </label>
            <label class="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                v-model="eventForm.is_public"
                :value="false"
                class="radio"
              />
              <LockClosedIcon class="w-5 h-5 text-gray-600" />
              <span class="font-medium">Private - Only with link</span>
            </label>
          </div>
          <p class="text-sm text-gray-500 mt-2">
            {{ eventForm.is_public ? 'This event will be visible to everyone' : 'Only people with the direct link can access this event' }}
          </p>
        </div>

        <!-- 3 Image Uploads -->
        <div class="space-y-4">
          <div class="flex flex-col md:flex-row gap-4">
            <!-- Thumbnail  -->
            <div class="md:w-1/4 flex-shrink-0">
              <label class="label text-sm">Thumbnail (Ticket/Slider)</label>
              <p class="text-xs text-gray-500 mb-2">720x958px | Max 5MB</p>
              <div class="border-2 border-dashed border-gray-300 rounded-lg overflow-hidden h-full">
                <div v-if="thumbnailPreview" class="relative w-full h-full min-h-[300px] bg-gray-100 group">
                  <img :src="thumbnailPreview" class="w-full h-full object-cover" />
                  <button
                    @click.prevent="thumbnailPreview = null; eventForm.thumbnail_image = null"
                    class="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    title="Remove image"
                  >
                    <TrashIcon class="w-5 h-5" />
                  </button>
                </div>
                <div v-else class="w-full h-full min-h-[300px] bg-gray-50 flex flex-col items-center justify-center p-4">
                  <PhotoIcon class="w-10 h-10 text-gray-400 mb-2" />
                  <p class="text-xs text-gray-500 text-center mb-2">Portrait (3:4) |  PNG, JPEG, WEBP</p>
                  <label class="btn-secondary btn-sm text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded cursor-pointer">
                    Upload
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      @change="handleImageUpload($event, 'thumbnail_image')"
                      class="hidden"
                    />
                  </label>
                </div>
              </div>
              <p v-if="errors.thumbnail_image" class="error-text mt-1 text-xs">{{ errors.thumbnail_image }}</p>
            </div>

            <!-- Venue Map  -->
            <div class="md:w-3/4 flex-grow">
              <label class="label text-sm">Venue Map (Seat Diagram)</label>
              <p class="text-xs text-gray-500 mb-2">Flexible size | Max 2MB | PNG, JPEG</p>
              <div class="border-2 border-dashed border-gray-300 rounded-lg overflow-hidden h-full">
                <div v-if="venueMapPreview" class="relative w-full h-full min-h-[300px] bg-gray-100 group">
                  <img :src="venueMapPreview" class="w-full h-full object-contain bg-gray-100" />
                  <button
                    @click.prevent="venueMapPreview = null; eventForm.venue_map_image = null"
                    class="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    title="Remove image"
                  >
                    <TrashIcon class="w-5 h-5" />
                  </button>
                </div>
                <div v-else class="w-full h-full min-h-[300px] bg-gray-50 flex flex-col items-center justify-center p-4">
                  <PhotoIcon class="w-12 h-12 text-gray-400 mb-2" />
                  <p class="text-xs text-gray-500 mb-2">Seat map or venue layout</p>
                  <label class="btn-secondary btn-sm text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded cursor-pointer">
                    Upload
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      @change="handleImageUpload($event, 'venue_map_image')"
                      class="hidden"
                    />
                  </label>
                </div>
              </div>
              <p v-if="errors.venue_map_image" class="error-text mt-1 text-xs">{{ errors.venue_map_image }}</p>
            </div>
          </div>

          <!-- Cover Image -->
          <div class="mt-14">
            <label class="label text-sm">Cover Image (Banner)</label>
            <p class="text-xs text-gray-500 mb-2">1280x720px (16:9) | Max 5MB | PNG, JPEG, WEBP</p>
            <div class="border-2 border-dashed border-gray-300 rounded-lg overflow-hidden">
              <div v-if="coverPreview" class="relative w-full aspect-video bg-gray-100 group">
                <img :src="coverPreview" class="w-full h-full object-cover" />
                <button
                  @click.prevent="coverPreview = null; eventForm.cover_image = null"
                  class="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                  title="Remove image"
                >
                  <TrashIcon class="w-5 h-5" />
                </button>
              </div>
              <div v-else class="w-full aspect-video bg-gray-50 flex flex-col items-center justify-center p-6">
                <PhotoIcon class="w-12 h-12 text-gray-400 mb-2" />
                <p class="text-xs text-gray-500 mb-2">Wide banner (16:9 ratio)</p>
                <label class="btn-secondary btn-sm text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded cursor-pointer">
                  Upload
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    @change="handleImageUpload($event, 'cover_image')"
                    class="hidden"
                  />
                </label>
              </div>
            </div>
            <p v-if="errors.cover_image" class="error-text mt-1 text-xs">{{ errors.cover_image }}</p>
          </div>
        </div>
      </div>
    </Card>

    <!-- Step 2: Venue Details -->
    <Card v-show="currentStep === 2">
      <h2 class="text-xl font-semibold mb-6">Venue Details</h2>
      
      <div class="space-y-4">
        <Input
          v-model="eventForm.venue_name"
          label="Venue Name"
          placeholder="e.g. National Stadium"
          :error="errors.venue_name"
          :icon="MapPinIcon"
          required
        />

       <div>
        <label class="label label-required">Venue Address</label>
        <textarea
          v-model="eventForm.venue_address"
          rows="3"
          maxlength="500"
          placeholder="Full address..."
          :class="['textarea', errors.venue_address && 'input-error']"
        ></textarea>
        <p v-if="errors.venue_address" class="error-text">{{ errors.venue_address }}</p>
        <p v-else class="text-xs text-gray-500 mt-1">{{ eventForm.venue_address?.length || 0 }}/500 characters</p>
      </div>

         <Input
          v-model="eventForm.venue_city"
          label="Venue City"
          placeholder="e.g. Ho Chi Minh City, Hanoi"
          :error="errors.venue_city"
          :icon="MapPinIcon"
          required
        />

        <Input
          v-model.number="eventForm.venue_capacity"
          type="number"
          label="Venue Capacity"
          placeholder="Maximum capacity"
        />
      </div>
    </Card>

    <!-- Step 3: Organizer Info -->
    <Card v-show="currentStep === 3">
      <h2 class="text-xl font-semibold mb-6 flex items-center space-x-2">
        <BuildingOfficeIcon class="w-6 h-6" />
        <span>Organizer Information</span>
      </h2>
      
      <div class="space-y-4">
        <Input
          v-model="eventForm.organizer_name"
          label="Organizer Name"
          placeholder="e.g. ABC Entertainment Company"
          :error="errors.organizer_name"
          required
        />

        <div>
          <label class="label">Organizer Description</label>
          <textarea
            v-model="eventForm.organizer_description"
            rows="4"
            maxlength="1000"
            placeholder="Brief description about the organizer..."
            class="textarea"
          ></textarea>
          <p class="text-xs text-gray-500 mt-1">{{ eventForm.organizer_description?.length || 0 }}/1000 characters</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            v-model="eventForm.organizer_contact_email"
            type="email"
            label="Contact Email"
            placeholder="contact@example.com"
            :error="errors.organizer_contact_email"
            required
          />

          <Input
            v-model="eventForm.organizer_contact_phone"
            type="tel"
            label="Contact Phone"
            placeholder="+84 xxx xxx xxx"
          />
        </div>
      </div>
    </Card>

    <!-- Step 4: Payment Info -->
    <Card v-show="currentStep === 4">
      <h2 class="text-xl font-semibold mb-6 flex items-center space-x-2">
        <BanknotesIcon class="w-6 h-6" />
        <span>Payment Information</span>
      </h2>
      
      <p class="text-sm text-gray-600 mb-4">
        This account will receive payments from ticket sales
      </p>

      <div class="space-y-4">
        <Input
          v-model="eventForm.payment_account_name"
          label="Account Holder Name"
          placeholder="e.g. NGUYEN VAN A"
          :error="errors.payment_account_name"
          required
        />

        <Input
          v-model="eventForm.payment_account_number"
          label="Account Number"
          placeholder="e.g. 1234567890"
          :error="errors.payment_account_number"
          required
        />

        <Input
          v-model="eventForm.payment_bank_name"
          label="Bank Name"
          placeholder="e.g. Vietcombank, BIDV, Techcombank"
          :error="errors.payment_bank_name"
          required
        />

        <Input
          v-model="eventForm.payment_bank_branch"
          label="Bank Branch (Optional)"
          placeholder="e.g. Ho Chi Minh Branch"
        />
      </div>
    </Card>

    <!-- Step 5: Sessions & Tickets -->
    <div v-show="currentStep === 5" class="space-y-4">
      <Card
        v-for="(session, sessionIndex) in sessions"
        :key="sessionIndex"
      >
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold">{{ session.name }}</h3>
          <Button
            v-if="sessions.length > 1"
            variant="danger"
            size="sm"
            @click="removeSession(sessionIndex)"
          >
            <TrashIcon class="w-4 h-4" />
          </Button>
        </div>

        <div class="space-y-4 mb-6">
          <Input
            v-model="session.name"
            label="Session Name"
            placeholder="e.g. Main Session, Day 1, Session 1"
          />

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              v-model="session.start_time"
              type="datetime-local"
              label="Session Start"
              required
            />
            <Input
              v-model="session.end_time"
              type="datetime-local"
              label="Session End"
              required
            />
          </div>

          <!-- ✅ SESSION LEVEL: Min/Max tickets per order -->
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div class="flex items-start space-x-2 mb-3">
              <InformationCircleIcon class="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p class="font-medium text-blue-900">Order Limits for This Session</p>
                <p class="text-sm text-blue-700 mt-1">
                  Set the minimum and maximum TOTAL tickets a customer can buy in one order for this session (across all ticket types)
                </p>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <Input
                v-model.number="session.min_tickets_per_order"
                type="number"
                label="Min Tickets Per Order"
                placeholder="1"
                required
              />
              <Input
                v-model.number="session.max_tickets_per_order"
                type="number"
                label="Max Tickets Per Order"
                placeholder="10"
                required
              />
            </div>
          </div>
        </div>

        <!-- Ticket Types -->
        <div>
          <div class="flex items-center justify-between mb-3">
            <h4 class="font-medium">Ticket Types</h4>
            <Button
              variant="secondary"
              size="sm"
              @click="addTicketType(sessionIndex)"
            >
              <PlusIcon class="w-4 h-4" />
              Add Ticket Type
            </Button>
          </div>

          <div class="space-y-4">
            <div
              v-for="(ticket, ticketIndex) in session.ticket_types"
              :key="ticketIndex"
              class="border border-gray-200 rounded-lg p-4"
            >
              <div class="flex items-start justify-between mb-3">
                <p class="font-medium text-sm">Ticket Type {{ ticketIndex + 1 }}</p>
                <Button
                  v-if="session.ticket_types.length > 1"
                  variant="ghost"
                  size="sm"
                  @click="removeTicketType(sessionIndex, ticketIndex)"
                >
                  <TrashIcon class="w-4 h-4 text-red-600" />
                </Button>
              </div>

              <div class="space-y-3">
                <!-- Row 1: Name & Price -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input
                    v-model="ticket.name"
                    label="Ticket Name"
                    placeholder="e.g. VIP, General, Early Bird"
                    required
                  />
                  <Input
                    v-model.number="ticket.price"
                    type="number"
                    label="Price (VND)"
                    placeholder="0"
                    required
                  />
                </div>

                <!-- Row 2: Quantity -->
                <Input
                  v-model.number="ticket.quantity"
                  type="number"
                  label="Available Quantity"
                  placeholder="0"
                  required
                />

                <!-- ✅ TICKET TYPE LEVEL: Min/Max per order CHO LOẠI VÉ NÀY -->
                <div class="bg-gray-50 border border-gray-200 rounded p-3">
                  <p class="text-sm font-medium text-gray-700 mb-2">
                    Limits for This Ticket Type
                  </p>
                  <p class="text-xs text-gray-600 mb-3">
                    Min/max quantity customer can buy of THIS ticket type (must not exceed session max: {{ session.max_tickets_per_order }})
                  </p>
                  <div class="grid grid-cols-2 gap-3">
                    <Input
                      v-model.number="ticket.min_per_order"
                      type="number"
                      label="Min Per Order"
                      placeholder="1"
                      required
                    />
                    <Input
                      v-model.number="ticket.max_per_order"
                      type="number"
                      label="Max Per Order"
                      placeholder="10"
                      :max="session.max_tickets_per_order"
                      required
                    />
                  </div>
                </div>

                <!-- Sale Time -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input
                    v-model="ticket.sale_start_time"
                    type="datetime-local"
                    label="Sale Start Time (Optional)"
                    placeholder="When tickets go on sale"
                  />
                  <Input
                    v-model="ticket.sale_end_time"
                    type="datetime-local"
                    label="Sale End Time (Optional)"
                    placeholder="When tickets stop selling"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Button
        variant="secondary"
        @click="addSession"
        full-width
      >
        <PlusIcon class="w-5 h-5" />
        Add Another Session
      </Button>
    </div>

    <!-- Navigation Buttons -->
    <div class="card">
      <div class="flex items-center justify-between">
        <Button
          v-if="currentStep > 1"
          variant="secondary"
          @click="prevStep"
        >
          ← Previous
        </Button>
        <div v-else></div>

        <div class="flex items-center space-x-3">
          <Button
            v-if="currentStep === totalSteps"
            variant="secondary"
            :loading="loading"
            @click="handleSubmit('draft')"
          >
            Save as Draft
          </Button>
          
          <Button
            v-if="currentStep < totalSteps"
            variant="primary"
            :disabled="!canProceed"
            @click="nextStep"
          >
            Next →
          </Button>
          
          <Button
            v-else
            variant="primary"
            :loading="loading"
            @click="handleSubmit('pending_approval')"
          >
            Submit for Approval
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>