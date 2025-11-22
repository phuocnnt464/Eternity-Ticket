<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { eventsAPI } from '@/api/events.js'
import { sessionsAPI } from '@/api/sessions.js'
import Card from '@/components/common/Card.vue'
import Button from '@/components/common/Button.vue'
import Input from '@/components/common/Input.vue'
import Badge from '@/components/common/Badge.vue'
import Modal from '@/components/common/Modal.vue'
import Spinner from '@/components/common/Spinner.vue'
import {
  ArrowLeftIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CalendarIcon,
  TicketIcon,
  ClockIcon
} from '@heroicons/vue/24/outline'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const eventId = ref(route.params.id)
const event = ref(null)
const sessions = ref([])
const expandedSessions = ref(new Set())

// Session Modal
const showSessionModal = ref(false)
const sessionForm = ref({
  id: null,
  title: '',
  description: '',
  start_time: '',
  end_time: '',
  min_tickets_per_order: 1,
  max_tickets_per_order: 10
})
const sessionErrors = ref({})
const savingSession = ref(false)

// Ticket Type Modal
const showTicketModal = ref(false)
const ticketForm = ref({
  id: null,
  session_id: null,
  name: '',
  description: '',
  price: 0,
  total_quantity: 0,
  min_quantity_per_order: 1,
  max_quantity_per_order: 5,
  sale_start_time: '',
  sale_end_time: ''
})
const ticketErrors = ref({})
const savingTicket = ref(false)

const formatPrice = (price) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(price)
}

const formatDateTime = (dateString) => {
  return new Date(dateString).toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const toggleSession = (sessionId) => {
  if (expandedSessions.value.has(sessionId)) {
    expandedSessions.value.delete(sessionId)
  } else {
    expandedSessions.value.add(sessionId)
  }
}

const fetchData = async () => {
  loading.value = true
  try {
    const [eventRes, sessionsRes] = await Promise.all([
      eventsAPI.getEventById(eventId.value),
      sessionsAPI.getEventSessions(eventId.value)
    ])
    
    event.value = eventRes.data.data?.event || eventRes.data.event
    sessions.value = sessionsRes.data.data || sessionsRes.data.sessions || []
    
    // Load ticket types for each session
    for (const session of sessions.value) {
      try {
        const ticketsRes = await sessionsAPI.getSessionTicketTypes(session.id || session.session_id)
        session.ticket_types = ticketsRes.data.data || ticketsRes.data.ticket_types || []
      } catch (error) {
        console.error(`Failed to load tickets for session ${session.id}:`, error)
        session.ticket_types = []
      }
    }
  } catch (error) {
    console.error('Failed to fetch data:', error)
    alert('Failed to load event data')
  } finally {
    loading.value = false
  }
}

// SESSION CRUD
const openCreateSessionModal = () => {
  sessionForm.value = {
    id: null,
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    min_tickets_per_order: 1,
    max_tickets_per_order: 10
  }
  sessionErrors.value = {}
  showSessionModal.value = true
}

const openEditSessionModal = (session) => {
  sessionForm.value = {
    id: session.id || session.session_id,
    title: session.title || session.session_name,
    description: session.description || '',
    start_time: session.start_time ? new Date(session.start_time).toISOString().slice(0, 16) : '',
    end_time: session.end_time ? new Date(session.end_time).toISOString().slice(0, 16) : '',
    min_tickets_per_order: session.min_tickets_per_order || 1,
    max_tickets_per_order: session.max_tickets_per_order || 10
  }
  sessionErrors.value = {}
  showSessionModal.value = true
}

const validateSessionForm = () => {
  sessionErrors.value = {}
  
  if (!sessionForm.value.title) {
    sessionErrors.value.title = 'Title is required'
  }
  if (!sessionForm.value.start_time) {
    sessionErrors.value.start_time = 'Start time is required'
  }
  if (!sessionForm.value.end_time) {
    sessionErrors.value.end_time = 'End time is required'
  }
  if (new Date(sessionForm.value.end_time) <= new Date(sessionForm.value.start_time)) {
    sessionErrors.value.end_time = 'End time must be after start time'
  }
  if (sessionForm.value.min_tickets_per_order < 1) {
    sessionErrors.value.min_tickets_per_order = 'Must be at least 1'
  }
  if (sessionForm.value.max_tickets_per_order < sessionForm.value.min_tickets_per_order) {
    sessionErrors.value.max_tickets_per_order = 'Must be greater than minimum'
  }
  
  return Object.keys(sessionErrors.value).length === 0
}

const handleSaveSession = async () => {
  if (!validateSessionForm()) return
  
  savingSession.value = true
  try {
    const data = {
      title: sessionForm.value.title,
      description: sessionForm.value.description,
      start_time: sessionForm.value.start_time,
      end_time: sessionForm.value.end_time,
      min_tickets_per_order: parseInt(sessionForm.value.min_tickets_per_order),
      max_tickets_per_order: parseInt(sessionForm.value.max_tickets_per_order)
    }
    
    if (sessionForm.value.id) {
      // Update
      await sessionsAPI.updateSession(sessionForm.value.id, data)
      alert('Session updated successfully!')
    } else {
      // Create
      await sessionsAPI.createSession(eventId.value, data)
      alert('Session created successfully!')
    }
    
    showSessionModal.value = false
    await fetchData()
  } catch (error) {
    console.error('Failed to save session:', error)
    alert(error.response?.data?.message || 'Failed to save session')
  } finally {
    savingSession.value = false
  }
}

const handleDeleteSession = async (sessionId) => {
  if (!confirm('Delete this session? All ticket types will also be deleted.')) return
  
  try {
    await sessionsAPI.deleteSession(sessionId)
    alert('Session deleted successfully!')
    await fetchData()
  } catch (error) {
    console.error('Failed to delete session:', error)
    alert(error.response?.data?.message || 'Failed to delete session')
  }
}

// TICKET TYPE CRUD
const openCreateTicketModal = (sessionId) => {
  const session = sessions.value.find(s => (s.id || s.session_id) === sessionId)
  
  ticketForm.value = {
    id: null,
    session_id: sessionId,
    name: '',
    description: '',
    price: 0,
    total_quantity: 0,
    min_quantity_per_order: 1,
    max_quantity_per_order: session ? session.max_tickets_per_order : 5,
    sale_start_time: session ? session.start_time : '',
    sale_end_time: session ? session.end_time : ''
  }
  ticketErrors.value = {}
  showTicketModal.value = true
}

const openEditTicketModal = (sessionId, ticket) => {
  ticketForm.value = {
    id: ticket.id,
    session_id: sessionId,
    name: ticket.name,
    description: ticket.description || '',
    price: ticket.price,
    total_quantity: ticket.total_quantity,
    min_quantity_per_order: ticket.min_quantity_per_order || 1,
    max_quantity_per_order: ticket.max_quantity_per_order || 5,
    sale_start_time: ticket.sale_start_time ? new Date(ticket.sale_start_time).toISOString().slice(0, 16) : '',
    sale_end_time: ticket.sale_end_time ? new Date(ticket.sale_end_time).toISOString().slice(0, 16) : ''
  }
  ticketErrors.value = {}
  showTicketModal.value = true
}

const validateTicketForm = () => {
  ticketErrors.value = {}
  
  if (!ticketForm.value.name) {
    ticketErrors.value.name = 'Name is required'
  }
  if (ticketForm.value.price < 0) {
    ticketErrors.value.price = 'Price cannot be negative'
  }
  if (ticketForm.value.total_quantity < 1) {
    ticketErrors.value.total_quantity = 'Quantity must be at least 1'
  }

  if (!Number.isInteger(ticketForm.value.total_quantity)) {
    ticketErrors.value.total_quantity = 'Quantity must be a whole number'
  }
  
  if (ticketForm.value.min_quantity_per_order < 1) {
    ticketErrors.value.min_quantity_per_order = 'Must be at least 1'
  }
  if (ticketForm.value.max_quantity_per_order < ticketForm.value.min_quantity_per_order) {
    ticketErrors.value.max_quantity_per_order = 'Must be greater than minimum'
  }
  
  const session = sessions.value.find(s => (s.id || s.session_id) === ticketForm.value.session_id)
  if (session && ticketForm.value.max_quantity_per_order > session.max_tickets_per_order) {
    ticketErrors.value.max_quantity_per_order = `Cannot exceed session maximum (${session.max_tickets_per_order})`
  }
  
  return Object.keys(ticketErrors.value).length === 0
}

const handleSaveTicket = async () => {
  if (!validateTicketForm()) return
  
  savingTicket.value = true
  try {
    const data = {
      name: ticketForm.value.name,
      description: ticketForm.value.description,
      price: parseFloat(ticketForm.value.price),
      total_quantity: parseInt(ticketForm.value.total_quantity),
      min_quantity_per_order: parseInt(ticketForm.value.min_quantity_per_order),
      max_quantity_per_order: parseInt(ticketForm.value.max_quantity_per_order),
      sale_start_time: ticketForm.value.sale_start_time,
      sale_end_time: ticketForm.value.sale_end_time
    }
    
    if (ticketForm.value.id) {
      // Update
      await sessionsAPI.updateTicketType(ticketForm.value.id, data)
      alert('Ticket type updated successfully!')
    } else {
      // Create
      await sessionsAPI.createTicketType(ticketForm.value.session_id, data)
      alert('Ticket type created successfully!')
    }
    
    showTicketModal.value = false
    await fetchData()
  } catch (error) {
    console.error('Failed to save ticket type:', error)
    alert(error.response?.data?.message || 'Failed to save ticket type')
  } finally {
    savingTicket.value = false
  }
}

const handleDeleteTicket = async (ticketId) => {
  if (!confirm('Delete this ticket type?')) return
  
  try {
    await sessionsAPI.deleteTicketType(ticketId)
    alert('Ticket type deleted successfully!')
    await fetchData()
  } catch (error) {
    console.error('Failed to delete ticket type:', error)
    alert(error.response?.data?.message || 'Failed to delete ticket type')
  }
}

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <button
          @click="router.push(`/organizer/events/${eventId}/edit`)"
          class="flex items-center text-gray-600 hover:text-gray-900 mb-2"
        >
          <ArrowLeftIcon class="w-5 h-5 mr-2" />
          Back to Edit Event
        </button>
        <h1 class="text-2xl font-bold text-gray-900">Sessions & Tickets</h1>
        <p v-if="event" class="text-gray-600 mt-1">{{ event.title }}</p>
      </div>
      <Button variant="primary" @click="openCreateSessionModal">
        <PlusIcon class="w-5 h-5" />
        Create Session
      </Button>
    </div>

    <!-- Info Card -->
    <Card class="bg-blue-50 border-blue-200">
      <div class="flex items-start space-x-3">
        <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
          <TicketIcon class="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 class="font-semibold text-blue-900 mb-1">About Sessions & Tickets</h3>
          <ul class="text-sm text-blue-800 space-y-1">
            <li>• Each event can have multiple sessions (dates/times)</li>
            <li>• Each session can have multiple ticket types (VIP, Regular, etc.)</li>
            <li>• Set min/max tickets per order at session level</li>
            <li>• Set min/max for each ticket type (must be within session limits)</li>
          </ul>
        </div>
      </div>
    </Card>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <Spinner size="xl" />
    </div>

    <!-- Sessions List -->
    <div v-else-if="sessions.length > 0" class="space-y-4">
      <Card v-for="session in sessions" :key="session.id || session.session_id">
        <div class="space-y-4">
          <!-- Session Header -->
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <h3 class="text-lg font-semibold mb-2">{{ session.title || session.session_name }}</h3>
              <p v-if="session.description" class="text-sm text-gray-600 mb-2">{{ session.description }}</p>
              
              <div class="flex items-center space-x-4 text-sm text-gray-600">
                <div class="flex items-center space-x-1">
                  <CalendarIcon class="w-4 h-4" />
                  <span>{{ formatDateTime(session.start_time) }}</span>
                </div>
                <span>→</span>
                <div class="flex items-center space-x-1">
                  <ClockIcon class="w-4 h-4" />
                  <span>{{ formatDateTime(session.end_time) }}</span>
                </div>
              </div>

              <div class="flex items-center space-x-2 mt-2">
                <Badge variant="info">
                  Min: {{ session.min_tickets_per_order }} tickets/order
                </Badge>
                <Badge variant="info">
                  Max: {{ session.max_tickets_per_order }} tickets/order
                </Badge>
                <Badge variant="success">
                  {{ session.ticket_types?.length || 0 }} ticket types
                </Badge>
              </div>
            </div>

            <div class="flex items-center space-x-2">
              <Button
                variant="secondary"
                size="sm"
                @click="openEditSessionModal(session)"
              >
                <PencilIcon class="w-4 h-4" />
              </Button>
              <Button
                variant="danger"
                size="sm"
                @click="handleDeleteSession(session.id || session.session_id)"
              >
                <TrashIcon class="w-4 h-4" />
              </Button>
            </div>
          </div>

          <!-- Ticket Types -->
          <div class="border-t pt-4">
            <div class="flex items-center justify-between mb-3">
              <h4 class="font-semibold">Ticket Types</h4>
              <Button
                variant="accent"
                size="sm"
                @click="openCreateTicketModal(session.id || session.session_id)"
              >
                <PlusIcon class="w-4 h-4" />
                Add Ticket Type
              </Button>
            </div>

            <div v-if="session.ticket_types && session.ticket_types.length > 0" class="space-y-2">
              <div
                v-for="ticket in session.ticket_types"
                :key="ticket.id"
                class="border border-gray-200 rounded-lg p-3 hover:bg-gray-50"
              >
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <h5 class="font-medium mb-1">{{ ticket.name }}</h5>
                    <p v-if="ticket.description" class="text-sm text-gray-600 mb-2">{{ ticket.description }}</p>
                    
                    <div class="flex items-center space-x-3 text-sm">
                      <span class="font-semibold text-primary-600">{{ formatPrice(ticket.price) }}</span>
                      <Badge variant="info">{{ ticket.total_quantity }} total</Badge>
                      <Badge variant="success">{{ ticket.total_quantity - (ticket.sold_quantity || 0) }} available</Badge>
                      <span class="text-gray-600">Min: {{ ticket.min_quantity_per_order }}</span>
                      <span class="text-gray-600">Max: {{ ticket.max_quantity_per_order }}</span>
                    </div>
                  </div>

                  <div class="flex items-center space-x-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      @click="openEditTicketModal(session.id || session.session_id, ticket)"
                    >
                      <PencilIcon class="w-4 h-4" />
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      @click="handleDeleteTicket(ticket.id)"
                    >
                      <TrashIcon class="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            <p v-else class="text-center text-gray-500 py-4">No ticket types yet. Click "Add Ticket Type" to create one.</p>
          </div>
        </div>
      </Card>
    </div>

    <!-- Empty State -->
    <Card v-else class="text-center py-12">
      <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <CalendarIcon class="w-10 h-10 text-gray-400" />
      </div>
      <h3 class="text-xl font-semibold text-gray-900 mb-2">No sessions yet</h3>
      <p class="text-gray-600 mb-6">
        Create your first session to start selling tickets
      </p>
      <Button variant="primary" @click="openCreateSessionModal">
        <PlusIcon class="w-5 h-5" />
        Create First Session
      </Button>
    </Card>

    <!-- Session Modal -->
    <Modal
      v-model="showSessionModal"
      :title="sessionForm.id ? 'Edit Session' : 'Create Session'"
      size="lg"
    >
      <form @submit.prevent="handleSaveSession" class="space-y-4">
        <Input
          v-model="sessionForm.title"
          label="Session Title"
          placeholder="e.g. Day 1 - Main Event"
          :error="sessionErrors.title"
          required
        />

        <div>
          <label class="label">Description</label>
          <textarea
            v-model="sessionForm.description"
            rows="3"
            placeholder="Session details..."
            class="textarea"
          ></textarea>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            v-model="sessionForm.start_time"
            type="datetime-local"
            label="Start Time"
            :error="sessionErrors.start_time"
            :icon="CalendarIcon"
            required
          />

          <Input
            v-model="sessionForm.end_time"
            type="datetime-local"
            label="End Time"
            :error="sessionErrors.end_time"
            :icon="ClockIcon"
            required
          />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            v-model.number="sessionForm.min_tickets_per_order"
            type="number"
            label="Min Tickets Per Order"
            :error="sessionErrors.min_tickets_per_order"
            min="1"
            required
          />

          <Input
            v-model.number="sessionForm.max_tickets_per_order"
            type="number"
            label="Max Tickets Per Order"
            :error="sessionErrors.max_tickets_per_order"
            min="1"
            required
          />
        </div>

        <p class="text-sm text-gray-600">
          These limits apply to the total number of tickets in an order for this session.
        </p>
      </form>

      <template #footer>
        <div class="flex space-x-3">
          <Button
            variant="secondary"
            @click="showSessionModal = false"
            full-width
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            :loading="savingSession"
            @click="handleSaveSession"
            full-width
          >
            {{ sessionForm.id ? 'Update' : 'Create' }} Session
          </Button>
        </div>
      </template>
    </Modal>

    <!-- Ticket Type Modal -->
    <Modal
      v-model="showTicketModal"
      :title="ticketForm.id ? 'Edit Ticket Type' : 'Create Ticket Type'"
      size="lg"
    >
      <form @submit.prevent="handleSaveTicket" class="space-y-4">
        <Input
          v-model="ticketForm.name"
          label="Ticket Name"
          placeholder="e.g. VIP, General Admission"
          :error="ticketErrors.name"
          required
        />

        <div>
          <label class="label">Description</label>
          <textarea
            v-model="ticketForm.description"
            rows="2"
            placeholder="What's included..."
            class="textarea"
          ></textarea>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            v-model.number="ticketForm.price"
            type="number"
            label="Price (VND)"
            :error="ticketErrors.price"
            min="0"
            step="1000"
            required
          />

          <Input
            v-model.number="ticketForm.total_quantity"
            type="number"
            label="Total Quantity"
            :error="ticketErrors.total_quantity"
            min="1"
            required
          />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            v-model.number="ticketForm.min_quantity_per_order"
            type="number"
            label="Min Per Order"
            :error="ticketErrors.min_quantity_per_order"
            min="1"
            required
          />

          <Input
            v-model.number="ticketForm.max_quantity_per_order"
            type="number"
            label="Max Per Order"
            :error="ticketErrors.max_quantity_per_order"
            min="1"
            required
          />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            v-model="ticketForm.sale_start_time"
            type="datetime-local"
            label="Sale Start Time"
            :icon="CalendarIcon"
          />

          <Input
            v-model="ticketForm.sale_end_time"
            type="datetime-local"
            label="Sale End Time"
            :icon="ClockIcon"
          />
        </div>

        <p class="text-sm text-gray-600">
          Min/Max per order must be within session limits. Leave sale times empty to use session times.
        </p>
      </form>

      <template #footer>
        <div class="flex space-x-3">
          <Button
            variant="secondary"
            @click="showTicketModal = false"
            full-width
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            :loading="savingTicket"
            @click="handleSaveTicket"
            full-width
          >
            {{ ticketForm.id ? 'Update' : 'Create' }} Ticket Type
          </Button>
        </div>
      </template>
    </Modal>
  </div>
</template>