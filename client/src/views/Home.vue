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
  SparklesIcon,
  BoltIcon,
  CheckBadgeIcon,
  ClockIcon,
  StarIcon
} from '@heroicons/vue/24/outline'

const router = useRouter()
const featuredEvents = ref([])
const loading = ref(true)
const searchQuery = ref('')

const features = [
  {
    icon: BoltIcon,
    title: 'Lightning Fast Booking',
    description: 'Book tickets instantly with our optimized system.  No more waiting in virtual queues.',
    gradient: 'from-primary-500 to-primary-700'
  },
  {
    icon: ShieldCheckIcon,
    title: 'Bank-Level Security',
    description: 'Your payments protected with 256-bit encryption and PCI DSS compliance.',
    gradient: 'from-success-500 to-success-700'
  },
  {
    icon: SparklesIcon,
    title: 'Premium Membership',
    description: 'Get early access, exclusive discounts, and VIP treatment for major events.',
    gradient: 'from-accent-500 to-accent-700'
  },
  {
    icon: UserGroupIcon,
    title: 'Easy Event Management',
    description: 'Powerful dashboard for organizers with real-time analytics and attendance tracking.',
    gradient: 'from-primary-500 to-accent-600'
  }
]

const stats = [
  { value: '50K+', label: 'Happy Customers', icon: UserGroupIcon },
  { value: '10K+', label: 'Events Hosted', icon: TicketIcon },
  { value: '99. 9%', label: 'Uptime', icon: CheckBadgeIcon },
  { value: '24/7', label: 'Support', icon: ClockIcon }
]

onMounted(async () => {
  try {
    const response = await eventsAPI.getFeaturedEvents({ limit: 6 })
    featuredEvents. value = response.data.events || []
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
  <div class="bg-white">
    <!-- Hero Section - Black & Blue Gradient -->
    <section class="relative bg-gradient-to-br from-dark-900 via-primary-900 to-black text-white py-24 md:py-32 overflow-hidden">
      <!-- Background Pattern -->
      <div class="absolute inset-0 opacity-10">
        <div class="absolute inset-0" style="background-image: radial-gradient(circle at 2px 2px, white 1px, transparent 0); background-size: 40px 40px;"></div>
      </div>
      
      <div class="container-custom relative z-10">
        <div class="max-w-4xl mx-auto text-center">
          <!-- Badge -->
          <div class="inline-flex items-center space-x-2 bg-primary-500/20 backdrop-blur-sm border border-primary-500/30 rounded-full px-4 py-2 mb-6 animate-fade-in">
            <StarIcon class="w-4 h-4 text-primary-400" />
            <span class="text-sm font-medium text-primary-300">Trusted by 50,000+ event-goers</span>
          </div>

          <h1 class="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            <span class="bg-gradient-to-r from-white via-primary-200 to-accent-300 bg-clip-text text-transparent">
              Your Gateway to
            </span>
            <br />
            <span class="text-white">Unforgettable Experiences</span>
          </h1>
          
          <p class="text-xl md:text-2xl mb-10 text-gray-300 max-w-3xl mx-auto">
            Discover, book, and manage tickets for concerts, festivals, sports, and exclusive events across Vietnam
          </p>

          <!-- Search Bar -->
          <div class="max-w-2xl mx-auto mb-8">
            <div class="relative">
              <input
                v-model="searchQuery"
                @keyup.enter="handleSearch"
                type="text"
                placeholder="Search events, artists, venues..."
                class="w-full px-6 py-4 pr-32 text-gray-900 bg-white rounded-full shadow-2xl focus:outline-none focus:ring-4 focus:ring-primary-500/50"
              />
              <Button 
                variant="primary" 
                size="lg"
                @click="handleSearch"
                class="absolute right-2 top-1/2 -translate-y-1/2 rounded-full"
              >
                <MagnifyingGlassIcon class="w-5 h-5 mr-2" />
                Search
              </Button>
            </div>
          </div>

          <!-- CTA Buttons -->
          <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              size="lg" 
              class="bg-white text-gray-900 hover:bg-gray-100 shadow-xl px-8 py-4 text-lg"
              @click="router.push('/events')"
            >
              <TicketIcon class="w-5 h-5 mr-2" />
              Explore Events
            </Button>
            <Button 
              size="lg" 
              variant="success"
              class="shadow-xl px-8 py-4 text-lg"
              @click="router.push('/auth/register?role=organizer')"
            >
              <SparklesIcon class="w-5 h-5 mr-2" />
              Create Your Event
            </Button>
          </div>
        </div>
      </div>

      <!-- Decorative Gradient Blobs -->
      <div class="absolute top-20 right-10 w-72 h-72 bg-primary-500 rounded-full blur-3xl opacity-20"></div>
      <div class="absolute bottom-20 left-10 w-96 h-96 bg-accent-500 rounded-full blur-3xl opacity-20"></div>
    </section>

    <!-- Stats Section -->
    <section class="py-12 bg-gray-50 border-y border-gray-200">
      <div class="container-custom">
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-8">
          <div 
            v-for="stat in stats" 
            :key="stat.label"
            class="text-center group"
          >
            <div class="inline-flex items-center justify-center w-12 h-12 bg-primary-100 rounded-full mb-3 group-hover:bg-primary-600 group-hover:scale-110 transition-all">
              <component :is="stat.icon" class="w-6 h-6 text-primary-600 group-hover:text-white" />
            </div>
            <h3 class="text-3xl font-bold text-gray-900 mb-1">{{ stat.value }}</h3>
            <p class="text-gray-600 text-sm">{{ stat.label }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Featured Events -->
    <section class="py-20 bg-white">
      <div class="container-custom">
        <div class="flex items-center justify-between mb-12">
          <div>
            <h2 class="text-4xl font-bold text-gray-900 mb-2">Featured Events</h2>
            <p class="text-lg text-gray-600">Handpicked experiences you won't want to miss</p>
          </div>
          <Button variant="ghost" size="lg" @click="router.push('/events')">
            View All Events →
          </Button>
        </div>

        <div v-if="loading" class="flex justify-center py-16">
          <Spinner size="xl" />
        </div>

        <div v-else-if="featuredEvents.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <EventCard
            v-for="event in featuredEvents"
            :key="event.id"
            :event="event"
            class="transform hover:scale-105 transition-transform duration-300"
          />
        </div>

        <div v-else class="text-center py-16">
          <TicketIcon class="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p class="text-gray-500 text-lg">No featured events at the moment</p>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section class="py-20 bg-gradient-to-br from-gray-50 to-primary-50">
      <div class="container-custom">
        <div class="text-center mb-16">
          <h2 class="text-4xl font-bold text-gray-900 mb-4">Why Choose Eternity Ticket?</h2>
          <p class="text-xl text-gray-600 max-w-2xl mx-auto">
            The most trusted platform for event discovery and ticketing in Vietnam
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div
            v-for="feature in features"
            :key="feature.title"
            class="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-primary-500 group"
          >
            <div 
              :class="[
                'w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform bg-gradient-to-br',
                feature.gradient
              ]"
            >
              <component :is="feature.icon" class="w-8 h-8 text-white" />
            </div>
            <h3 class="text-xl font-bold text-gray-900 mb-3">{{ feature.title }}</h3>
            <p class="text-gray-600 leading-relaxed">{{ feature.description }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section - Purple/Blue Gradient -->
    <section class="relative py-24 bg-gradient-to-br from-accent-900 via-primary-900 to-dark-900 text-white overflow-hidden">
      <div class="absolute inset-0 opacity-10">
        <div class="absolute inset-0" style="background-image: radial-gradient(circle at 2px 2px, white 1px, transparent 0); background-size: 30px 30px;"></div>
      </div>

      <div class="container-custom relative z-10 text-center">
        <h2 class="text-4xl md:text-5xl font-bold mb-6">Ready to Start Your Journey?</h2>
        <p class="text-xl mb-10 text-accent-200 max-w-2xl mx-auto">
          Join thousands of event-goers and organizers who trust Eternity Ticket for seamless experiences
        </p>
        <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button 
            size="lg" 
            class="bg-white text-gray-900 hover:bg-gray-100 shadow-2xl px-8 py-4 text-lg"
            @click="router.push('/auth/register')"
          >
            Sign Up Free
          </Button>
          <Button 
            size="lg" 
            class="border-2 border-white text-white hover:bg-white/10 px-8 py-4 text-lg"
            @click="router.push('/about')"
          >
            Learn More
          </Button>
        </div>
      </div>

      <!-- Decorative blobs -->
      <div class="absolute -top-20 -right-20 w-96 h-96 bg-accent-500 rounded-full blur-3xl opacity-30"></div>
      <div class="absolute -bottom-20 -left-20 w-96 h-96 bg-primary-500 rounded-full blur-3xl opacity-30"></div>
    </section>
  </div>
</template>