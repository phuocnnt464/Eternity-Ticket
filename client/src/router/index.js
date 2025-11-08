import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// Layouts
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import AuthLayout from '@/layouts/AuthLayout.vue'
import OrganizerLayout from '@/layouts/OrganizerLayout.vue'
import AdminLayout from '@/layouts/AdminLayout.vue'

// Public Pages
import Home from '@/views/Home.vue'
import EventList from '@/views/events/EventList.vue'
import EventDetail from '@/views/events/EventDetail.vue'

// Auth Pages
import Login from '@/views/auth/Login.vue'
import Register from '@/views/auth/Register.vue'
import ForgotPassword from '@/views/auth/ForgotPassword.vue'
import VerifyEmail from '@/views/auth/VerifyEmail.vue'

// Participant Pages
import Profile from '@/views/participant/Profile.vue'
import MyTickets from '@/views/participant/MyTickets.vue'
import MyOrders from '@/views/participant/MyOrders.vue'
import Membership from '@/views/participant/Membership.vue'

// Organizer Pages
import OrganizerDashboard from '@/views/organizer/Dashboard.vue'
import CreateEvent from '@/views/organizer/CreateEvent.vue'
import MyEvents from '@/views/organizer/MyEvents.vue'
import EventStatistics from '@/views/organizer/EventStatistics.vue'
import CheckinPage from '@/views/organizer/CheckinPage.vue'

// Admin Pages
import AdminDashboard from '@/views/admin/Dashboard.vue'
import EventApproval from '@/views/admin/EventApproval.vue'
import UserManagement from '@/views/admin/UserManagement.vue'
import SubAdminManagement from '@/views/admin/SubAdminManagement.vue'

const routes = [
  // Public routes
  {
    path: '/',
    component: DefaultLayout,
    children: [
      { path: '', name: 'Home', component: Home },
      { path: 'events', name: 'EventList', component: EventList },
      { path: 'events/:slug', name: 'EventDetail', component: EventDetail },
    ]
  },

  // Auth routes
  {
    path: '/auth',
    component: AuthLayout,
    children: [
      { path: 'login', name: 'Login', component: Login },
      { path: 'register', name: 'Register', component: Register },
      { path: 'forgot-password', name: 'ForgotPassword', component: ForgotPassword },
      { path: 'verify-email/:token', name: 'VerifyEmail', component: VerifyEmail },
    ]
  },

  // Participant routes
  {
    path: '/participant',
    component: DefaultLayout,
    meta: { requiresAuth: true, role: 'participant' },
    children: [
      { path: 'profile', name: 'Profile', component: Profile },
      { path: 'tickets', name: 'MyTickets', component: MyTickets },
      { path: 'orders', name: 'MyOrders', component: MyOrders },
      { path: 'membership', name: 'Membership', component: Membership },
    ]
  },

  // Organizer routes
  {
    path: '/organizer',
    component: OrganizerLayout,
    meta: { requiresAuth: true, role: 'organizer' },
    children: [
      { path: 'dashboard', name: 'OrganizerDashboard', component: OrganizerDashboard },
      { path: 'events', name: 'MyEvents', component: MyEvents },
      { path: 'events/create', name: 'CreateEvent', component: CreateEvent },
      { path: 'events/:id/statistics', name: 'EventStatistics', component: EventStatistics },
      { path: 'events/:id/checkin', name: 'CheckinPage', component: CheckinPage },
    ]
  },

  // Admin routes
  {
    path: '/admin',
    component: AdminLayout,
    meta: { requiresAuth: true, role: ['admin', 'sub_admin'] },
    children: [
      { path: 'dashboard', name: 'AdminDashboard', component: AdminDashboard },
      { path: 'events', name: 'EventApproval', component: EventApproval },
      { path: 'users', name: 'UserManagement', component: UserManagement },
      { path: 'sub-admins', name: 'SubAdminManagement', component: SubAdminManagement },
    ]
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }
    return { top: 0 }
  }
})

// Navigation guard
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  
  if (to.meta.requiresAuth) {
    if (!authStore.isAuthenticated) {
      next({ name: 'Login', query: { redirect: to.fullPath } })
      return
    }
    
    if (to.meta.role) {
      const allowedRoles = Array.isArray(to.meta.role) ? to.meta.role : [to.meta.role]
      if (!allowedRoles.includes(authStore.user?.role)) {
        next({ name: 'Home' })
        return
      }
    }
  }
  
  next()
})

export default router