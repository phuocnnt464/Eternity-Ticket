<script setup>
import { 
  TicketIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  HeartIcon,
  SparklesIcon,
  TrophyIcon
} from '@heroicons/vue/24/outline'

const values = [
  {
    icon: HeartIcon,
    title: 'Customer First',
    description: 'We prioritize the needs and satisfaction of our users above all else'
  },
  {
    icon: ShieldCheckIcon,
    title: 'Trust & Security',
    description: 'Your data and transactions are protected with the highest security standards'
  },
  {
    icon: SparklesIcon,
    title: 'Innovation',
    description: 'We continuously improve our platform with cutting-edge technology'
  },
  {
    icon: TrophyIcon,
    title: 'Excellence',
    description: 'We strive for excellence in every aspect of our service'
  }
]

const stats = [
  { label: 'Events Hosted', value: '10,000+' },
  { label: 'Happy Users', value: '500,000+' },
  { label: 'Tickets Sold', value: '2M+' },
  { label: 'Countries', value: '50+' }
]

const team = [
  {
    name: 'John Doe',
    role: 'CEO & Founder',
    image: '/team/john.jpg'
  },
  {
    name: 'Jane Smith',
    role: 'CTO',
    image: '/team/jane.jpg'
  },
  {
    name: 'Mike Johnson',
    role: 'Head of Product',
    image: '/team/mike.jpg'
  },
  {
    name: 'Sarah Williams',
    role: 'Head of Marketing',
    image: '/team/sarah.jpg'
  }
]
</script>

<template>
  <div>
    <!-- Hero Section -->
    <section class="bg-gradient-to-br from-primary-600 to-accent-600 text-white py-20">
      <div class="container-custom text-center">
        <h1 class="text-4xl md:text-5xl font-bold mb-4">About Eternity Ticket</h1>
        <p class="text-xl text-primary-100 max-w-3xl mx-auto">
          We're on a mission to make event ticketing simple, secure, and accessible for everyone
        </p>
      </div>
    </section>

    <!-- Story Section -->
    <section class="py-16">
      <div class="container-custom">
        <div class="max-w-3xl mx-auto">
          <h2 class="text-3xl font-bold text-center mb-8">Our Story</h2>
          <div class="prose prose-lg max-w-none">
            <p class="text-gray-600 leading-relaxed">
              Founded in 2024, Eternity Ticket was born from a simple idea: buying and selling event tickets 
              should be easy, secure, and transparent. We noticed that both event organizers and attendees 
              faced numerous challenges in the ticketing process, from complex platforms to security concerns.
            </p>
            <p class="text-gray-600 leading-relaxed mt-4">
              Today, we've grown into a comprehensive event ticketing platform that serves thousands of 
              organizers and hundreds of thousands of attendees across the globe. Our platform combines 
              cutting-edge technology with user-friendly design to deliver an exceptional experience for 
              everyone involved.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Stats Section -->
    <section class="bg-gray-50 py-16">
      <div class="container-custom">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div v-for="stat in stats" :key="stat.label" class="text-center">
            <div class="text-4xl font-bold text-primary-600 mb-2">{{ stat.value }}</div>
            <div class="text-gray-600">{{ stat.label }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Values Section -->
    <section class="py-16">
      <div class="container-custom">
        <h2 class="text-3xl font-bold text-center mb-12">Our Core Values</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div
            v-for="value in values"
            :key="value.title"
            class="text-center"
          >
            <div class="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <component :is="value.icon" class="w-8 h-8 text-primary-600" />
            </div>
            <h3 class="text-xl font-semibold mb-2">{{ value.title }}</h3>
            <p class="text-gray-600">{{ value.description }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Team Section -->
    <section class="bg-gray-50 py-16">
      <div class="container-custom">
        <h2 class="text-3xl font-bold text-center mb-12">Meet Our Team</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div
            v-for="member in team"
            :key="member.name"
            class="text-center"
          >
            <div class="w-32 h-32 bg-gray-200 rounded-full mx-auto mb-4 overflow-hidden">
              <div class="w-full h-full bg-gradient-to-br from-primary-400 to-accent-400"></div>
            </div>
            <h3 class="font-semibold text-lg">{{ member.name }}</h3>
            <p class="text-gray-600">{{ member.role }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="py-16">
      <div class="container-custom text-center">
        <h2 class="text-3xl font-bold mb-4">Join Us on Our Journey</h2>
        <p class="text-gray-600 mb-8 max-w-2xl mx-auto">
          Whether you're an event organizer or an attendee, we're here to make your experience unforgettable
        </p>
        <div class="flex items-center justify-center space-x-4">
          <RouterLink to="/events" class="btn-primary btn-lg">
            Browse Events
          </RouterLink>
          <RouterLink to="/contact" class="btn-secondary btn-lg">
            Contact Us
          </RouterLink>
        </div>
      </div>
    </section>
  </div>
</template>