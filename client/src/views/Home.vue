<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { eventsAPI } from '@/api/events.js'
import EventCard from '@/components/features/EventCard.vue'
import Button from '@/components/common/Button.vue'
import Spinner from '@/components/common/Spinner.vue'
import { 
  MagnifyingGlassIcon,
  TicketIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  SparklesIcon
} from '@heroicons/vue/24/outline'

const router = useRouter()
const featuredEvents = ref([])
const loading = ref(true)
const searchQuery = ref('')

const features = [
  {
    icon: TicketIcon,
    title: 'Easy Booking',
    description: 'Book tickets for your favorite events in just a few clicks'
  },
  {
    icon: ShieldCheckIcon,
    title: 'Secure Payment',
    description: 'Your transactions are protected with bank-level security'
  },
  {
    icon: UserGroupIcon,
    title: 'Event Management',
    description: 'Organizers can easily manage events, tickets, and attendees'
  },
  {
    icon: SparklesIcon,
    title: 'Exclusive Perks',
    description: 'Premium members get early access and special discounts'
  }
]

onMounted(async () => {
  try {
    const response = await eventsAPI.getFeaturedEvents({ limit: 6 })
    featuredEvents.value = response.data.events || []
  } catch (error) {
    console.error('Failed to load featured events:', error)
  } finally {
    loading.value = false
  }
})

const handleSearch = () => {
  if (searchQuery.value.trim()) {
    router.push({ path: '/events', query: { search: searchQuery.value } })
  }
}
</script>

<template>
  <div>
    <!-- Hero Section -->
    <section class="bg-gradient-to-br from-primary-600 via-primary-700 to-accent-600 text-white py-20">
      <div class="container-custom">
        <div class="max-w-3xl mx-auto text-center">
          <h1 class="text-4xl md:text-6xl font-bold mb-6 animate-fade-in">
            Discover Amazing Events
          </h1>
          <p class="text-xl md:text-2xl mb-8 text-primary-100">
            Book tickets for concerts, festivals, sports, and more
          </p>

          <!-- Search Bar -->
          <div class="max-w-2xl mx-auto">
            <div class="flex">
              <input
                v-model="searchQuery"
                @keyup.enter="handleSearch"
                type="text"
                placeholder="Search for events..."
                class="input flex-1 !text-gray-900 rounded-r-none"
              />
              <Button 
                variant="accent" 
                size="lg"
                @click="handleSearch"
                class="rounded-l-none"
              >
                <MagnifyingGlassIcon class="w-5 h-5" />
                Search
              </Button>
            </div>
          </div>

          <div class="mt-6 flex items-center justify-center space-x-4">
            <Button variant="secondary" size="lg" @click="router.push('/events')">
              Browse All Events
            </Button>
            <Button variant="outline" size="lg" @click="router.push('/auth/register?role=organizer')">
              Become an Organizer
            </Button>
          </div>
        </div>
      </div>
    </section>

    <!-- Featured Events -->
    <section class="py-16 bg-gray-50">
      <div class="container-custom">
        <div class="flex items-center justify-between mb-8">
          <div>
            <h2 class="text-3xl font-bold text-gray-900">Featured Events</h2>
            <p class="text-gray-600 mt-2">Don't miss these amazing upcoming events</p>
          </div>
          <Button variant="ghost" @click="router.push('/events')">
            View All →
          </Button>
        </div>

        <div v-if="loading" class="flex justify-center py-12">
          <Spinner size="xl" />
        </div>

        <div v-else-if="featuredEvents.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <EventCard
            v-for="event in featuredEvents"
            :key="event.event_id"
            :event="event"
          />
        </div>

        <div v-else class="text-center py-12">
          <p class="text-gray-500">No featured events at the moment</p>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section class="py-16">
      <div class="container-custom">
        <div class="text-center mb-12">
          <h2 class="text-3xl font-bold text-gray-900 mb-4">Why Choose Eternity Ticket?</h2>
          <p class="text-gray-600 max-w-2xl mx-auto">
            We provide the best experience for both event attendees and organizers
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div
            v-for="feature in features"
            :key="feature.title"
            class="text-center"
          >
            <div class="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <component :is="feature.icon" class="w-8 h-8 text-primary-600" />
            </div>
            <h3 class="text-xl font-semibold mb-2">{{ feature.title }}</h3>
            <p class="text-gray-600">{{ feature.description }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="bg-gradient-to-br from-accent-600 to-primary-600 text-white py-16">
      <div class="container-custom text-center">
        <h2 class="text-3xl md:text-4xl font-bold mb-4">Ready to Get Started?</h2>
        <p class="text-xl mb-8 text-accent-100">
          Join thousands of users who trust Eternity Ticket for their events
        </p>
        <div class="flex items-center justify-center space-x-4">
          <Button variant="secondary" size="lg" @click="router.push('/auth/register')">
            Sign Up Now
          </Button>
          <Button variant="outline" size="lg" @click="router.push('/about')">
            Learn More
          </Button>
        </div>
      </div>
    </section>
  </div>
</template>