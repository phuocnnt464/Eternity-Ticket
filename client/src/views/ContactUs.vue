<script setup>
import { ref } from 'vue'
import Input from '@/components/common/Input.vue'
import Button from '@/components/common/Button.vue'
import {
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  UserIcon
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
  if (!validate()) return
  
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
    link: 'mailto:support@eternityticket.com'
  },
  {
    icon: PhoneIcon,
    title: 'Phone',
    value: '+84 123 456 789',
    link: 'tel:+84123456789'
  },
  {
    icon: MapPinIcon,
    title: 'Address',
    value: '123 Business St, Ho Chi Minh City, Vietnam',
    link: null
  }
]
</script>

<template>
  <div>
    <!-- Hero Section -->
    <section class="bg-gradient-to-br from-primary-600 to-accent-600 text-white py-20">
      <div class="container-custom text-center">
        <h1 class="text-4xl md:text-5xl font-bold mb-4">Contact Us</h1>
        <p class="text-xl text-primary-100 max-w-2xl mx-auto">
          Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
        </p>
      </div>
    </section>

    <!-- Contact Section -->
    <section class="py-16">
      <div class="container-custom">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <!-- Contact Info -->
          <div class="lg:col-span-1">
            <h2 class="text-2xl font-bold mb-6">Get in Touch</h2>
            <div class="space-y-6">
              <div
                v-for="info in contactInfo"
                :key="info.title"
                class="flex items-start space-x-4"
              >
                <div class="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <component :is="info.icon" class="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <h3 class="font-semibold mb-1">{{ info.title }}</h3>
                  <a
                    v-if="info.link"
                    :href="info.link"
                    class="text-gray-600 hover:text-primary-600"
                  >
                    {{ info.value }}
                  </a>
                  <p v-else class="text-gray-600">{{ info.value }}</p>
                </div>
              </div>
            </div>

            <div class="mt-8">
              <h3 class="font-semibold mb-4">Follow Us</h3>
              <div class="flex space-x-4">
                <a href="#" class="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center hover:bg-primary-600 hover:text-white transition-colors">
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                  </svg>
                </a>
                <a href="#" class="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center hover:bg-primary-600 hover:text-white transition-colors">
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                </a>
                <a href="#" class="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center hover:bg-primary-600 hover:text-white transition-colors">
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>

          <!-- Contact Form -->
          <div class="lg:col-span-2">
            <div class="card">
              <h2 class="text-2xl font-bold mb-6">Send us a Message</h2>

              <div v-if="success" class="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-6">
                <p class="font-medium">Message sent successfully!</p>
                <p class="text-sm mt-1">We'll get back to you as soon as possible.</p>
              </div>

              <form @submit.prevent="handleSubmit" class="space-y-4">
                <Input
                  v-model="form.name"
                  label="Full Name"
                  placeholder="John Doe"
                  :error="errors.name"
                  :icon="UserIcon"
                  required
                />

                <Input
                  v-model="form.email"
                  type="email"
                  label="Email"
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
                  Send Message
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Map Section (Optional) -->
    <section class="bg-gray-100 py-16">
      <div class="container-custom">
        <div class="bg-gray-300 rounded-xl h-96 flex items-center justify-center">
          <p class="text-gray-600">Map Placeholder (Integrate Google Maps here)</p>
        </div>
      </div>
    </section>
  </div>
</template>