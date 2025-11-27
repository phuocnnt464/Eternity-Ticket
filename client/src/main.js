import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import Vue3Toastify, { toast } from 'vue3-toastify'

import '../src/style.css'
import 'vue3-toastify/dist/index.css'

import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth' 

import { directive as vClickAway } from 'vue3-click-away'

// Create Pinia instance
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

// Create Vue app
const app = createApp(App)

app.use(pinia)
app.use(router)
app.use(Vue3Toastify, {
  autoClose: 3000,
  position: toast.POSITION.TOP_RIGHT,
  theme: 'colored',
  transition: 'slide',
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true
})

app.config.globalProperties.$toast = toast

app.directive('click-away', vClickAway)

// Global error handler
app.config.errorHandler = (err, instance, info) => {
  console.error('Global error:', err)
  console.error('Error info:', info)
  
  // Show error toast
  toast.error('An error occurred. Please try again.')
}

// Global warning handler
app.config.warnHandler = (msg, instance, trace) => {
  console.warn('Warning:', msg)
  console.warn('Trace:', trace)
}


router.isReady().then(async () => {
  const authStore = useAuthStore()
  
  // Check team membership for authenticated participants
  if (authStore.isAuthenticated && authStore.isParticipant) {
    console.log('🔍 Initializing team membership check...')
    try {
      await authStore.checkTeamMembership()
      console.log('✅ Team membership initialized:', authStore.isTeamMember, 'Count:', authStore.teamEventsCount)
    } catch (error) {
      console.error('❌ Failed to initialize team membership:', error)
    }
  }

  app.mount('#app')
})
