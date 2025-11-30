<script setup>
import { 
  CheckCircleIcon,
  HeartIcon,
  RocketLaunchIcon,
  SparklesIcon,
  ShieldCheckIcon,
  LightBulbIcon,
  TrophyIcon,
  GlobeAltIcon
} from '@heroicons/vue/24/outline'

const values = [
  {
    icon: HeartIcon,
    title: 'Customer First',
    description: 'We prioritize user experience and satisfaction in everything we do',
    gradient: 'from-success-500 to-success-700'
  },
  {
    icon: ShieldCheckIcon,
    title: 'Trust & Security',
    description: 'Your data and transactions are protected with industry-leading security',
    gradient: 'from-primary-500 to-primary-700'
  },
  {
    icon: LightBulbIcon,
    title: 'Innovation',
    description: 'Constantly evolving to bring you the best ticketing experience',
    gradient: 'from-accent-500 to-accent-700'
  },
  {
    icon: TrophyIcon,
    title: 'Excellence',
    description: 'Committed to delivering exceptional service at every touchpoint',
    gradient: 'from-success-500 to-primary-600'
  }
]

const milestones = [
  { 
    year: '2020', 
    event: 'Company Founded', 
    description: 'Started with a vision to revolutionize event ticketing in Vietnam'
  },
  { 
    year: '2021', 
    event: '10,000 Users', 
    description: 'Reached our first major milestone with rapid growth'
  },
  { 
    year: '2022', 
    event: 'Series A Funding', 
    description: 'Secured $5M funding to scale operations nationwide'
  },
  { 
    year: '2023', 
    event: '50,000+ Events', 
    description: 'Became the leading ticketing platform in Vietnam'
  },
  { 
    year: '2024', 
    event: 'Global Expansion', 
    description: 'Expanding to Southeast Asia markets'
  }
]

const achievements = [
  { number: '50K+', label: 'Active Users' },
  { number: '10K+', label: 'Events Hosted' },
  { number: '500+', label: 'Partner Venues' },
  { number: '99.9%', label: 'Customer Satisfaction' }
]
</script>

<template>
  <div class="bg-white">
    <!-- Hero Section -->
    <section class="relative bg-gradient-to-br from-dark-900 via-primary-900 to-black text-white py-24 md:py-32">
      <div class="absolute inset-0 opacity-10">
        <div class="absolute inset-0" style="background-image: radial-gradient(circle at 2px 2px, white 1px, transparent 0); background-size: 40px 40px;"></div>
      </div>

      <div class="container-custom relative z-10">
        <div class="max-w-4xl mx-auto text-center">
          <div class="inline-flex items-center space-x-2 bg-primary-500/20 backdrop-blur-sm border border-primary-500/30 rounded-full px-4 py-2 mb-6">
            <GlobeAltIcon class="w-4 h-4 text-primary-400" />
            <span class="text-sm font-medium text-primary-300">Trusted Across Vietnam</span>
          </div>
          
          <h1 class="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Building the Future of
            <span class="bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent"> Event Ticketing</span>
          </h1>
          <p class="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto">
            Connecting people with unforgettable experiences through innovative technology and exceptional service
          </p>
        </div>
      </div>

      <div class="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-white to-transparent"></div>
    </section>

    <!-- Achievements Stats -->
    <section class="py-16 bg-white">
      <div class="container-custom">
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-8">
          <div 
            v-for="achievement in achievements" 
            :key="achievement.label"
            class="text-center p-6 rounded-2xl bg-gradient-to-br from-primary-50 to-accent-50 hover:shadow-lg transition-all"
          >
            <h3 class="text-4xl font-bold text-primary-700 mb-2">{{ achievement. number }}</h3>
            <p class="text-gray-700 font-medium">{{ achievement.label }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Mission & Vision -->
    <section class="py-20 bg-gray-50">
      <div class="container-custom">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div class="bg-white rounded-3xl p-12 shadow-lg border-2 border-primary-200 hover:shadow-2xl transition-all">
            <div class="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center mb-6">
              <RocketLaunchIcon class="w-8 h-8 text-white" />
            </div>
            <h2 class="text-3xl font-bold text-gray-900 mb-4">Our Mission</h2>
            <p class="text-lg text-gray-700 leading-relaxed">
              To democratize access to amazing events by providing a secure, user-friendly platform 
              that connects event organizers with passionate attendees across Vietnam and beyond.
            </p>
          </div>

          <div class="bg-white rounded-3xl p-12 shadow-lg border-2 border-accent-200 hover:shadow-2xl transition-all">
            <div class="w-16 h-16 bg-gradient-to-br from-accent-500 to-accent-700 rounded-2xl flex items-center justify-center mb-6">
              <SparklesIcon class="w-8 h-8 text-white" />
            </div>
            <h2 class="text-3xl font-bold text-gray-900 mb-4">Our Vision</h2>
            <p class="text-lg text-gray-700 leading-relaxed">
              To become Southeast Asia's most trusted and innovative event ticketing platform, 
              creating seamless experiences that bring people together through shared moments.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Core Values -->
    <section class="py-20 bg-white">
      <div class="container-custom">
        <div class="text-center mb-16">
          <h2 class="text-4xl font-bold text-gray-900 mb-4">Our Core Values</h2>
          <p class="text-xl text-gray-600">The principles that guide everything we do</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div
            v-for="value in values"
            :key="value. title"
            class="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-gray-100 hover:border-primary-300"
          >
            <div 
              :class="[
                'w-16 h-16 rounded-2xl flex items-center justify-center mb-6 bg-gradient-to-br',
                value.gradient
              ]"
            >
              <component :is="value.icon" class="w-8 h-8 text-white" />
            </div>
            <h3 class="text-xl font-bold text-gray-900 mb-3">{{ value.title }}</h3>
            <p class="text-gray-600 leading-relaxed">{{ value.description }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Journey Timeline -->
    <section class="py-20 bg-gradient-to-br from-gray-50 to-primary-50">
      <div class="container-custom">
        <div class="text-center mb-16">
          <h2 class="text-4xl font-bold text-gray-900 mb-4">Our Journey</h2>
          <p class="text-xl text-gray-600">Growing together, one milestone at a time</p>
        </div>

        <div class="max-w-4xl mx-auto">
          <div class="relative">
            <!-- Timeline line -->
            <div class="absolute left-1/2 transform -translate-x-1/2 h-full w-1 bg-primary-200 hidden md:block"></div>

            <div class="space-y-12">
              <div
                v-for="(milestone, index) in milestones"
                :key="index"
                :class="[
                  'relative flex flex-col md:flex-row items-center gap-8',
                  index % 2 === 0 ?  'md:flex-row' : 'md:flex-row-reverse'
                ]"
              >
                <div :class="['w-full md:w-1/2', index % 2 === 0 ? 'md:pr-8 md:text-right' : 'md:pl-8 md:text-left']">
                  <div class="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all border-2 border-primary-100">
                    <h3 class="text-3xl font-bold text-primary-600 mb-2">{{ milestone.year }}</h3>
                    <h4 class="text-xl font-bold text-gray-900 mb-2">{{ milestone.event }}</h4>
                    <p class="text-gray-600">{{ milestone.description }}</p>
                  </div>
                </div>
                
                <div class="absolute left-1/2 transform -translate-x-1/2 w-8 h-8 bg-primary-600 rounded-full border-4 border-white shadow-lg flex items-center justify-center hidden md:flex z-10">
                  <CheckCircleIcon class="w-5 h-5 text-white" />
                </div>
                
                <div class="w-full md:w-1/2"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="py-24 bg-gradient-to-br from-accent-900 via-primary-900 to-dark-900 text-white relative overflow-hidden">
      <div class="absolute inset-0 opacity-10">
        <div class="absolute inset-0" style="background-image: radial-gradient(circle at 2px 2px, white 1px, transparent 0); background-size: 30px 30px;"></div>
      </div>

      <div class="container-custom text-center relative z-10">
        <h2 class="text-4xl md:text-5xl font-bold mb-6">Ready to Experience the Difference?</h2>
        <p class="text-xl text-accent-200 mb-10 max-w-2xl mx-auto">
          Join thousands who trust Eternity Ticket for seamless event booking and management
        </p>
        <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button 
            @click="$router.push('/events')"
            class="bg-white text-gray-900 px-8 py-4 rounded-full font-bold text-lg hover:bg-gray-100 transition-all shadow-2xl"
          >
            Explore Events
          </button>
          <button 
            @click="$router.push('/auth/register?role=organizer')"
            class="bg-success-600 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-success-700 transition-all shadow-2xl"
          >
            Become an Organizer
          </button>
        </div>
      </div>

      <div class="absolute -top-20 -right-20 w-96 h-96 bg-accent-500 rounded-full blur-3xl opacity-30"></div>
      <div class="absolute -bottom-20 -left-20 w-96 h-96 bg-primary-500 rounded-full blur-3xl opacity-30"></div>
    </section>
  </div>
</template>