<script setup>
import { ref } from 'vue'
import Input from '@/components/common/Input.vue'
import Button from '@/components/common/Button.vue'
import {
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  ClockIcon,
  ChatBubbleLeftRightIcon,
  QuestionMarkCircleIcon
} from '@heroicons/vue/24/outline'

const form = ref({
  name: '',
  email: '',
  subject: '',
  message: ''
})

const errors = ref({})
const loading = ref(false)
const success = ref(false)

const validate = () => {
  errors.value = {}
  
  if (!form.value.name) errors.value.name = 'Name is required'
  if (!form.value.email) errors.value.email = 'Email is required'
  if (!form.value.subject) errors.value.subject = 'Subject is required'
  if (!form.value.message) errors.value.message = 'Message is required'
  
  return Object.keys(errors.value).length === 0
}

const handleSubmit = async () => {
  if (! validate()) return
  
  loading.value = true
  
  // Simulate API call
  setTimeout(() => {
    success.value = true
    loading.value = false
    form.value = { name: '', email: '', subject: '', message: '' }
    
    setTimeout(() => {
      success.value = false
    }, 5000)
  }, 1000)
}

const contactInfo = [
  {
    icon: EnvelopeIcon,
    title: 'Email',
    value: 'support@eternityticket.com',
    link: 'mailto:support@eternityticket.com',
    gradient: 'from-primary-500 to-primary-700'
  },
  {
    icon: PhoneIcon,
    title: 'Phone',
    value: '+84 123 456 789',
    link: 'tel:+84123456789',
    gradient: 'from-success-500 to-success-700'
  },
  {
    icon: MapPinIcon,
    title: 'Office',
    value: '123 Business St, District 1, Ho Chi Minh City, Vietnam',
    link: null,
    gradient: 'from-accent-500 to-accent-700'
  },
  {
    icon: ClockIcon,
    title: 'Working Hours',
    value: 'Mon - Fri: 9:00 AM - 6:00 PM',
    link: null,
    gradient: 'from-primary-600 to-accent-600'
  }
]

const faqs = [
  {
    icon: QuestionMarkCircleIcon,
    question: 'How do I purchase tickets?',
    answer: 'Browse events, select your tickets, and complete the secure checkout process.'
  },
  {
    icon: QuestionMarkCircleIcon,
    question: 'Can I get a refund?',
    answer: 'Refund policies vary by event. Check the event details or contact the organizer.'
  },
  {
    icon: QuestionMarkCircleIcon,
    question: 'How do I become an organizer?',
    answer: 'Sign up with an organizer account and start creating your events right away.'
  }
]
</script>

<template>
  <div class="bg-white">
    <!-- Hero Section -->
    <section class="relative bg-gradient-to-br from-dark-900 via-primary-900 to-black text-white py-24 overflow-hidden">
      <div class="absolute inset-0 opacity-10">
        <div class="absolute inset-0" style="background-image: radial-gradient(circle at 2px 2px, white 1px, transparent 0); background-size: 40px 40px;"></div>
      </div>

      <div class="container-custom relative z-10 text-center">
        <div class="inline-flex items-center space-x-2 bg-primary-500/20 backdrop-blur-sm border border-primary-500/30 rounded-full px-4 py-2 mb-6">
          <ChatBubbleLeftRightIcon class="w-4 h-4 text-primary-400" />
          <span class="text-sm font-medium text-primary-300">We're here to help</span>
        </div>

        <h1 class="text-5xl md:text-6xl font-bold mb-6">Get in Touch</h1>
        <p class="text-xl text-gray-300 max-w-2xl mx-auto">
          Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible. 
        </p>
      </div>

      <div class="absolute top-20 right-10 w-72 h-72 bg-primary-500 rounded-full blur-3xl opacity-20"></div>
      <div class="absolute bottom-20 left-10 w-96 h-96 bg-accent-500 rounded-full blur-3xl opacity-20"></div>
    </section>

    <!-- Main Content -->
    <section class="py-20">
      <div class="container-custom">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <!-- Contact Form -->
          <div>
            <div class="mb-8">
              <h2 class="text-3xl font-bold text-gray-900 mb-2">Send us a Message</h2>
              <p class="text-gray-600">Fill out the form and our team will get back to you within 24 hours</p>
            </div>

            <!-- Success Message -->
            <div v-if="success" class="bg-success-50 border-2 border-success-500 text-success-800 px-6 py-4 rounded-xl mb-6 animate-fade-in">
              <div class="flex items-center">
                <svg class="w-6 h-6 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                </svg>
                <p class="font-semibold">Message sent successfully!  We'll get back to you soon.</p>
              </div>
            </div>

            <form @submit.prevent="handleSubmit" class="space-y-6">
              <Input
                v-model="form.name"
                label="Your Name"
                placeholder="John Doe"
                :error="errors.name"
                required
              />

              <Input
                v-model="form.email"
                type="email"
                label="Email Address"
                placeholder="your.email@example.com"
                :error="errors.email"
                :icon="EnvelopeIcon"
                required
              />

              <Input
                v-model="form.subject"
                label="Subject"
                placeholder="How can we help you?"
                :error="errors.subject"
                required
              />

              <div>
                <label class="label label-required">Message</label>
                <textarea
                  v-model="form.message"
                  rows="6"
                  placeholder="Tell us more about your inquiry..."
                  :class="['textarea', errors.message && 'input-error']"
                ></textarea>
                <p v-if="errors.message" class="error-text">{{ errors.message }}</p>
              </div>

              <Button
                type="submit"
                variant="primary"
                :loading="loading"
                full-width
                size="lg"
              >
                <EnvelopeIcon class="w-5 h-5 mr-2" />
                Send Message
              </Button>
            </form>
          </div>

          <!-- Contact Info & FAQs -->
          <div class="space-y-8">
            <!-- Contact Cards -->
            <div>
              <h3 class="text-2xl font-bold text-gray-900 mb-6">Contact Information</h3>
              <div class="grid grid-cols-1 gap-4">
                <div
                  v-for="info in contactInfo"
                  :key="info.title"
                  class="bg-white rounded-2xl p-6 shadow-lg border-2 border-gray-100 hover:border-primary-300 transition-all group"
                >
                  <div class="flex items-start space-x-4">
                    <div :class="['w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br', info.gradient]">
                      <component :is="info.icon" class="w-6 h-6 text-white" />
                    </div>
                    <div class="flex-1">
                      <h4 class="font-semibold text-gray-900 mb-1">{{ info.title }}</h4>
                      <a
                        v-if="info.link"
                        :href="info.link"
                        class="text-primary-600 hover:text-primary-700 group-hover:underline"
                      >
                        {{ info.value }}
                      </a>
                      <p v-else class="text-gray-600">{{ info.value }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Quick FAQs -->
            <div class="bg-gradient-to-br from-primary-50 to-accent-50 rounded-2xl p-8">
              <h3 class="text-2xl font-bold text-gray-900 mb-6">Quick FAQs</h3>
              <div class="space-y-4">
                <div
                  v-for="faq in faqs"
                  :key="faq.question"
                  class="bg-white rounded-xl p-4 shadow-sm"
                >
                  <div class="flex items-start space-x-3">
                    <component :is="faq.icon" class="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 class="font-semibold text-gray-900 mb-1">{{ faq.question }}</h4>
                      <p class="text-sm text-gray-600">{{ faq.answer }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Map Section (Optional) -->
    <section class="py-16 bg-gray-50">
      <div class="container-custom">
        <div class="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div class="aspect-video bg-gray-200 flex items-center justify-center">
            <div class="text-center">
              <MapPinIcon class="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p class="text-gray-600">Map integration coming soon</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>