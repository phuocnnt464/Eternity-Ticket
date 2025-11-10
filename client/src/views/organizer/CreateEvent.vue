<script setup>
import { ref, computed } from 'vue'
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
  TrashIcon
} from '@heroicons/vue/24/outline'

const router = useRouter()

const currentStep = ref(1)
const loading = ref(false)
const categories = ref([])

// Event Form
const eventForm = ref({
  title: '',
  description: '',
  category_id: '',
  start_date: '',
  end_date: '',
  venue_name: '',
  venue_address: '',
  venue_capacity: null,
  cover_image: null,
  thumbnail_image: null
})

// Sessions
const sessions = ref([
  {
    name: 'Main Session',
    start_time: '',
    end_time: '',
    ticket_types: [
      {
        name: 'General Admission',
        price: 0,
        quantity: 0,
        max_quantity_per_order: 10
      }
    ]
  }
])

const errors = ref({})
const coverPreview = ref(null)
const thumbnailPreview = ref(null)

const totalSteps = 3

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
           eventForm.value.venue_address
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

  if (file.size > 5 * 1024 * 1024) {
    errors.value[type] = 'Image size must be less than 5MB'
    return
  }

  eventForm.value[type] = file
  errors.value[type] = ''

  const reader = new FileReader()
  reader.onload = (e) => {
    if (type === 'cover_image') {
      coverPreview.value = e.target.result
    } else {
      thumbnailPreview.value = e.target.result
    }
  }
  reader.readAsDataURL(file)
}

const addSession = () => {
  sessions.value.push({
    name: `Session ${sessions.value.length + 1}`,
    start_time: '',
    end_time: '',
    ticket_types: [
      {
        name: 'General Admission',
        price: 0,
        quantity: 0,
        max_quantity_per_order: 10
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
    max_quantity_per_order: 10
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
  
  // Validate event info
  if (!eventForm.value.title) errors.value.title = 'Title is required'
  if (!eventForm.value.description) errors.value.description = 'Description is required'
  if (!eventForm.value.category_id) errors.value.category_id = 'Category is required'
  
  // Validate dates
  if (!eventForm.value.start_date) errors.value.start_date = 'Start date is required'
  if (!eventForm.value.end_date) errors.value.end_date = 'End date is required'
  
  if (new Date(eventForm.value.end_date) < new Date(eventForm.value.start_date)) {
    errors.value.end_date = 'End date must be after start date'
  }
  
  // Validate venue
  if (!eventForm.value.venue_name) errors.value.venue_name = 'Venue name is required'
  if (!eventForm.value.venue_address) errors.value.venue_address = 'Venue address is required'
  
  return Object.keys(errors.value).length === 0
}

const handleSubmit = async (status = 'draft') => {
  if (!validateForm()) {
    alert('Please fill in all required fields')
    return
  }

  loading.value = true
  try {
    // Create event
    const formData = new FormData()
    Object.keys(eventForm.value).forEach(key => {
      if (eventForm.value[key]) {
        formData.append(key, eventForm.value[key])
      }
    })
    formData.append('status', status)

    const eventResponse = await eventsAPI.createEvent(formData)
    const eventId = eventResponse.data.data.event_id

    // Create sessions
    for (const session of sessions.value) {
      const sessionResponse = await sessionsAPI.createSession(eventId, {
        name: session.name,
        start_time: session.start_time,
        end_time: session.end_time
      })

      const sessionId = sessionResponse.data.data.session_id

      // Create ticket types
      for (const ticket of session.ticket_types) {
        await sessionsAPI.createTicketType(sessionId, ticket)
      }
    }

    alert(status === 'draft' ? 'Event saved as draft!' : 'Event submitted for approval!')
    router.push('/organizer/events')
  } catch (error) {
    alert(error.response?.data?.error?.message || 'Failed to create event')
  } finally {
    loading.value = false
  }
}
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
              'w-10 h-10 rounded-full flex items-center justify-center font-semibold',
              currentStep >= step 
                ? 'bg-primary-600 text-white' 
                : 'bg-gray-200 text-gray-600'
            ]">
              {{ step }}
            </div>
            <div v-if="step < totalSteps" :class="[
              'flex-1 h-1 mx-4',
              currentStep > step ? 'bg-primary-600' : 'bg-gray-200'
            ]"></div>
          </div>
          <p class="text-sm mt-2 font-medium">
            {{ step === 1 ? 'Event Info' : step === 2 ? 'Venue Details' : 'Sessions & Tickets' }}
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
            placeholder="Describe your event..."
            :class="['textarea', errors.description && 'input-error']"
          ></textarea>
          <p v-if="errors.description" class="error-text">{{ errors.description }}</p>
        </div>

        <div>
          <label class="label label-required">Category</label>
          <select
            v-model="eventForm.category_id"
            :class="['select', errors.category_id && 'input-error']"
          >
            <option value="">Select category</option>
            <option value="1">Music</option>
            <option value="2">Sports</option>
            <option value="3">Conference</option>
            <option value="4">Festival</option>
          </select>
          <p v-if="errors.category_id" class="error-text">{{ errors.category_id }}</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            v-model="eventForm.start_date"
            type="datetime-local"
            label="Start Date & Time"
            :error="errors.start_date"
            :icon="CalendarIcon"
            required
          />

          <Input
            v-model="eventForm.end_date"
            type="datetime-local"
            label="End Date & Time"
            :error="errors.end_date"
            :icon="CalendarIcon"
            required
          />
        </div>

        <!-- Cover Image -->
        <div>
          <label class="label">Cover Image</label>
          <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <div v-if="coverPreview" class="mb-4">
              <img :src="coverPreview" class="max-h-48 mx-auto rounded-lg" />
            </div>
            <PhotoIcon class="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <label class="btn-secondary btn-sm cursor-pointer">
              Choose Image
              <input
                type="file"
                accept="image/*"
                @change="handleImageUpload($event, 'cover_image')"
                class="hidden"
              />
            </label>
            <p class="text-xs text-gray-500 mt-2">Max 5MB. Recommended: 1920x1080px</p>
          </div>
          <p v-if="errors.cover_image" class="error-text">{{ errors.cover_image }}</p>
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
            placeholder="Full address..."
            :class="['textarea', errors.venue_address && 'input-error']"
          ></textarea>
          <p v-if="errors.venue_address" class="error-text">{{ errors.venue_address }}</p>
        </div>

        <Input
          v-model.number="eventForm.venue_capacity"
          type="number"
          label="Venue Capacity"
          placeholder="Maximum capacity"
        />
      </div>
    </Card>

    <!-- Step 3: Sessions & Tickets -->
    <div v-show="currentStep === 3" class="space-y-4">
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
            placeholder="e.g. Main Session, Day 1, etc."
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

          <div class="space-y-3">
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

              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  v-model="ticket.name"
                  label="Name"
                  placeholder="e.g. VIP, General"
                  required
                />
                <Input
                  v-model.number="ticket.price"
                  type="number"
                  label="Price (VND)"
                  placeholder="0"
                  required
                />
                <Input
                  v-model.number="ticket.quantity"
                  type="number"
                  label="Available Quantity"
                  placeholder="0"
                  required
                />
                <Input
                  v-model.number="ticket.max_quantity_per_order"
                  type="number"
                  label="Max Per Order"
                  placeholder="10"
                  required
                />
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