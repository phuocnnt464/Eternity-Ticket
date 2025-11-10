<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { eventsAPI } from '@/api/events.js'
import { sessionsAPI } from '@/api/sessions.js'
import Input from '@/components/common/Input.vue'
import Button from '@/components/common/Button.vue'
import Card from '@/components/common/Card.vue'
import Badge from '@/components/common/Badge.vue'
import Spinner from '@/components/common/Spinner.vue'
import {
  CalendarIcon,
  MapPinIcon,
  PhotoIcon,
  PlusIcon,
  TrashIcon,
  ArrowLeftIcon
} from '@heroicons/vue/24/outline'

const router = useRouter()
const route = useRoute()

const loading = ref(true)
const saving = ref(false)
const eventId = ref(route.params.id)

const eventForm = ref({
  title: '',
  description: '',
  category_id: '',
  start_date: '',
  end_date: '',
  venue_name: '',
  venue_address: '',
  venue_capacity: null,
  status: 'draft'
})

const sessions = ref([])
const errors = ref({})
const coverPreview = ref(null)

const getStatusBadge = (status) => {
  const badges = {
    approved: { variant: 'success', text: 'Active' },
    pending_approval: { variant: 'warning', text: 'Pending Approval' },
    rejected: { variant: 'danger', text: 'Rejected' },
    draft: { variant: 'info', text: 'Draft' },
    cancelled: { variant: 'danger', text: 'Cancelled' }
  }
  return badges[status] || badges.draft
}

const loadEvent = async () => {
  loading.value = true
  try {
    const eventResponse = await eventsAPI.getEventById(eventId.value)
    const event = eventResponse.data.data
    
    eventForm.value = {
      title: event.title,
      description: event.description,
      category_id: event.category_id,
      start_date: event.start_date ? new Date(event.start_date).toISOString().slice(0, 16) : '',
      end_date: event.end_date ? new Date(event.end_date).toISOString().slice(0, 16) : '',
      venue_name: event.venue_name,
      venue_address: event.venue_address,
      venue_capacity: event.venue_capacity,
      status: event.status
    }
    
    coverPreview.value = event.cover_image

    // Load sessions
    const sessionsResponse = await sessionsAPI.getEventSessions(eventId.value)
    sessions.value = sessionsResponse.data.data || []
    
    // Load ticket types for each session
    for (const session of sessions.value) {
      const ticketsResponse = await sessionsAPI.getSessionTicketTypes(session.session_id)
      session.ticket_types = ticketsResponse.data.data || []
    }
  } catch (error) {
    console.error('Failed to load event:', error)
    alert('Failed to load event')
    router.push('/organizer/events')
  } finally {
    loading.value = false
  }
}

const handleImageUpload = (event) => {
  const file = event.target.files[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    errors.value.cover_image = 'Please select an image file'
    return
  }

  if (file.size > 5 * 1024 * 1024) {
    errors.value.cover_image = 'Image size must be less than 5MB'
    return
  }

  eventForm.value.cover_image = file
  errors.value.cover_image = ''

  const reader = new FileReader()
  reader.onload = (e) => {
    coverPreview.value = e.target.result
  }
  reader.readAsDataURL(file)
}

const validateForm = () => {
  errors.value = {}
  
  if (!eventForm.value.title) errors.value.title = 'Title is required'
  if (!eventForm.value.description) errors.value.description = 'Description is required'
  if (!eventForm.value.start_date) errors.value.start_date = 'Start date is required'
  if (!eventForm.value.end_date) errors.value.end_date = 'End date is required'
  
  if (new Date(eventForm.value.end_date) < new Date(eventForm.value.start_date)) {
    errors.value.end_date = 'End date must be after start date'
  }
  
  if (!eventForm.value.venue_name) errors.value.venue_name = 'Venue name is required'
  if (!eventForm.value.venue_address) errors.value.venue_address = 'Venue address is required'
  
  return Object.keys(errors.value).length === 0
}

const handleUpdate = async () => {
  if (!validateForm()) {
    alert('Please fill in all required fields')
    return
  }

  saving.value = true
  try {
    const formData = new FormData()
    Object.keys(eventForm.value).forEach(key => {
      if (eventForm.value[key] && key !== 'status') {
        formData.append(key, eventForm.value[key])
      }
    })

    await eventsAPI.updateEvent(eventId.value, formData)
    alert('Event updated successfully!')
    router.push('/organizer/events')
  } catch (error) {
    alert(error.response?.data?.error?.message || 'Failed to update event')
  } finally {
    saving.value = false
  }
}

const handleSubmitForApproval = async () => {
  if (!validateForm()) return
  
  if (!confirm('Submit this event for approval?')) return

  saving.value = true
  try {
    await eventsAPI.submitForApproval(eventId.value)
    alert('Event submitted for approval!')
    await loadEvent()
  } catch (error) {
    alert(error.response?.data?.error?.message || 'Failed to submit event')
  } finally {
    saving.value = false
  }
}

const handleCancel = async () => {
  if (!confirm('Are you sure you want to cancel this event?')) return

  saving.value = true
  try {
    await eventsAPI.cancelEvent(eventId.value)
    alert('Event cancelled')
    router.push('/organizer/events')
  } catch (error) {
    alert(error.response?.data?.error?.message || 'Failed to cancel event')
  } finally {
    saving.value = false
  }
}

const handleDelete = async () => {
  if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) return

  saving.value = true
  try {
    await eventsAPI.deleteEvent(eventId.value)
    alert('Event deleted')
    router.push('/organizer/events')
  } catch (error) {
    alert(error.response?.data?.error?.message || 'Failed to delete event')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadEvent()
})
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <button
          @click="router.push('/organizer/events')"
          class="flex items-center text-gray-600 hover:text-gray-900 mb-2"
        >
          <ArrowLeftIcon class="w-5 h-5 mr-2" />
          Back to Events
        </button>
        <h1 class="text-2xl font-bold text-gray-900">Edit Event</h1>
      </div>
      <Badge v-if="!loading" :variant="getStatusBadge(eventForm.status).variant">
        {{ getStatusBadge(eventForm.status).text }}
      </Badge>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <Spinner size="xl" />
    </div>

    <div v-else class="space-y-6">
      <!-- Event Information -->
      <Card>
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
                Change Image
                <input
                  type="file"
                  accept="image/*"
                  @change="handleImageUpload"
                  class="hidden"
                />
              </label>
              <p class="text-xs text-gray-500 mt-2">Max 5MB</p>
            </div>
            <p v-if="errors.cover_image" class="error-text">{{ errors.cover_image }}</p>
          </div>
        </div>
      </Card>

      <!-- Venue Details -->
      <Card>
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

      <!-- Sessions Summary -->
      <Card>
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-semibold">Sessions & Tickets</h2>
          <Button
            variant="secondary"
            size="sm"
            @click="router.push(`/organizer/events/${eventId}/sessions`)"
          >
            Manage Sessions
          </Button>
        </div>

        <div v-if="sessions.length > 0" class="space-y-3">
          <div
            v-for="session in sessions"
            :key="session.session_id"
            class="border border-gray-200 rounded-lg p-4"
          >
            <h3 class="font-semibold mb-2">{{ session.name }}</h3>
            <p class="text-sm text-gray-600 mb-2">
              {{ new Date(session.start_time).toLocaleString() }}
            </p>
            <div class="flex items-center space-x-2">
              <Badge variant="info">{{ session.ticket_types?.length || 0 }} ticket types</Badge>
              <Badge variant="success">{{ session.available_tickets || 0 }} available</Badge>
            </div>
          </div>
        </div>
        <p v-else class="text-gray-500 text-center py-4">No sessions configured</p>
      </Card>

      <!-- Action Buttons -->
      <Card>
        <div class="space-y-3">
          <div class="flex items-center space-x-3">
            <Button
              variant="primary"
              :loading="saving"
              @click="handleUpdate"
              full-width
            >
              Save Changes
            </Button>
            
            <Button
              v-if="eventForm.status === 'draft'"
              variant="accent"
              :loading="saving"
              @click="handleSubmitForApproval"
              full-width
            >
              Submit for Approval
            </Button>
          </div>

          <div class="flex items-center space-x-3">
            <Button
              v-if="['approved', 'pending_approval'].includes(eventForm.status)"
              variant="danger"
              :loading="saving"
              @click="handleCancel"
              full-width
            >
              Cancel Event
            </Button>

            <Button
              v-if="eventForm.status === 'draft'"
              variant="danger"
              :loading="saving"
              @click="handleDelete"
              full-width
            >
              Delete Event
            </Button>
          </div>
        </div>
      </Card>
    </div>
  </div>
</template>