import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// ==========================================
// LAYOUTS
// ==========================================
const DefaultLayout = () => import('@/layouts/DefaultLayout.vue')
const AuthLayout = () => import('@/layouts/AuthLayout.vue')
const ParticipantLayout = () => import('@/layouts/ParticipantLayout.vue')
const OrganizerLayout = () => import('@/layouts/OrganizerLayout.vue')
const AdminLayout = () => import('@/layouts/AdminLayout.vue')

// ==========================================
// PUBLIC PAGES
// ==========================================
const Home = () => import('@/views/Home.vue')
const EventList = () => import('@/views/events/EventList.vue')
const EventDetail = () => import('@/views/events/EventDetail.vue')
const EventCheckout = () => import('@/views/events/EventCheckout.vue')
const OrderPaymentResult = () => import('@/views/events/OrderPaymentResult.vue')
const MembershipPaymentResult = () => import('@/views/events/MembershipPaymentResult.vue')
const AboutUs = () => import('@/views/AboutUs.vue')
const ContactUs = () => import('@/views/ContactUs.vue')

// ==========================================
// AUTH PAGES
// ==========================================
const Login = () => import('@/views/auth/Login.vue')
const Register = () => import('@/views/auth/Register.vue')
const ForgotPassword = () => import('@/views/auth/ForgotPassword.vue')
const ResetPassword = () => import('@/views/auth/ResetPassword.vue')
const VerifyEmail = () => import('@/views/auth/VerifyEmail.vue')
const AcceptInvitation = () => import('@/views/auth/AcceptInvitation.vue')

// ==========================================
// PARTICIPANT PAGES
// ==========================================
const ParticipantProfile = () => import('@/views/participant/Profile.vue')
const MyTickets = () => import('@/views/participant/MyTickets.vue')
const MyOrders = () => import('@/views/participant/MyOrders.vue')
const OrderDetails = () => import('@/views/participant/OrderDetails.vue')
const Membership = () => import('@/views/participant/Membership.vue')
const Notifications = () => import('@/views/participant/Notifications.vue')

// ==========================================
// ORGANIZER PAGES
// ==========================================
const OrganizerDashboard = () => import('@/views/organizer/Dashboard.vue')
const MyEvents = () => import('@/views/organizer/MyEvents.vue')
const CreateEvent = () => import('@/views/organizer/CreateEvent.vue')
const EditEvent = () => import('@/views/organizer/EditEvent.vue')
const EventStatistics = () => import('@/views/organizer/EventStatistics.vue')
const OrderManagement = () => import('@/views/organizer/OrderManagement.vue')
const TeamManagement = () => import('@/views/organizer/TeamManagement.vue')
const TeamsMember = () => import('@/views/organizer/TeamsMember.vue')
const CheckinPage = () => import('@/views/organizer/CheckinPage.vue')
const CheckinScanner = () => import('@/views/organizer/CheckinScanner.vue')
const CouponManagement = () => import('@/views/organizer/CouponManagement.vue')
const EventOverview = () => import('@/views/organizer/EventOverview.vue')
const SessionManagement = () => import('@/views/organizer/SessionManagement.vue')

// ==========================================
// ADMIN PAGES
// ==========================================
const AdminDashboard = () => import('@/views/admin/Dashboard.vue')
const EventApproval = () => import('@/views/admin/EventApproval.vue')
const UserManagement = () => import('@/views/admin/UserManagement.vue')
const SubAdminManagement = () => import('@/views/admin/SubAdminManagement.vue')
const SystemSettings = () => import('@/views/admin/SystemSettings.vue')
const AuditLogs = () => import('@/views/admin/AuditLogs.vue')
const RefundManagement = () => import('@/views/admin/RefundManagement.vue')
const AdminOrderManagement = () => import('@/views/admin/OrderManagement.vue')

// ==========================================
// ERROR PAGES
// ==========================================
const NotFound = () => import('@/views/errors/NotFound.vue')
const Forbidden = () => import('@/views/errors/Forbidden.vue')
const ServerError = () => import('@/views/errors/ServerError.vue')


// ==========================================
// ROUTES DEFINITION
// ==========================================
const routes = [
  {
    path: '/debug/vnpay',
    name: 'VNPayDebug',
    component: () => import('@/views/debug/VNPayDebug.vue'),
    meta: { requiresAuth: true }
  },
  
  // ==========================================
  // PUBLIC ROUTES
  // ==========================================
  {
    path: '/',
    component: DefaultLayout,
    children: [
      {
        path: '',
        name: 'Home',
        component: Home,
        meta: { 
          title: 'Home - Eternity Ticket',
          public: true 
        }
      },
      {
        path: 'events',
        name: 'EventList',
        component: EventList,
        meta: { 
          title: 'Events - Eternity Ticket',
          public: true 
        }
      },
      {
        path: 'events/:slug',
        name: 'EventDetail',
        component: EventDetail,
        meta: { 
          title: 'Event Details - Eternity Ticket',
          public: true 
        }
      },
      {
        path: 'events/:slug/checkout',
        name: 'EventCheckout',
        component: EventCheckout,
        meta: { 
          title: 'Checkout - Eternity Ticket',
          requiresAuth: true 
        }
      },
     
      {
        path: 'about',
        name: 'AboutUs',
        component: AboutUs,
        meta: { 
          title: 'About Us - Eternity Ticket',
          public: true 
        }
      },
      {
        path: 'contact',
        name: 'ContactUs',
        component: ContactUs,
        meta: { 
          title: 'Contact Us - Eternity Ticket',
          public: true 
        }
      },
      {
        path: 'invitations/:token',
        name: 'AcceptInvitation',
        component: AcceptInvitation,
        meta: { 
          title: 'Accept Invitation - Eternity Ticket',
          public: true
        }
      },
      {
        path: 'events/payment/result',  
        name: 'OrderPaymentResult',
        component: OrderPaymentResult,
        meta: { 
          title: 'Payment Result - Eternity Ticket',
          public: true 
        }
      },
      {
        path: 'events/membership/payment/result',  
        name: 'MembershipPaymentResult',
        component: MembershipPaymentResult,
        meta: { 
          title: 'Membership Payment Result - Eternity Ticket',
          public: true,
          requiresAuth: true
        }
      }
    ]
  },

  // ==========================================
  // AUTH ROUTES
  // ==========================================
  {
    path: '/auth',
    component: AuthLayout,
    meta: { guestOnly: true },
    children: [
      {
        path: 'login',
        name: 'Login',
        component: Login,
        meta: { title: 'Login - Eternity Ticket' }
      },
      {
        path: 'register',
        name: 'Register',
        component: Register,
        meta: { title: 'Register - Eternity Ticket' }
      },
      {
        path: 'forgot-password',
        name: 'ForgotPassword',
        component: ForgotPassword,
        meta: { title: 'Forgot Password - Eternity Ticket' }
      },
      {
        path: 'reset-password/:token',
        name: 'ResetPassword',
        component: ResetPassword,
        meta: { title: 'Reset Password - Eternity Ticket' }
      },
      {
        path: 'verify-email',
        name: 'VerifyEmail',
        component: VerifyEmail,
        meta: { title: 'Verify Email - Eternity Ticket' }
      }
    ]
  },

  // ==========================================
  // PARTICIPANT ROUTES
  // ==========================================
  {
    path: '/participant',
    component: ParticipantLayout,
    meta: { 
      requiresAuth: true,
      allowedRoles: ['participant']
    },
    children: [
      {
        path: 'profile',
        name: 'ParticipantProfile',
        component: ParticipantProfile,
        meta: { title: 'My Profile - Eternity Ticket' }
      },
      {
        path: 'tickets',
        name: 'MyTickets',
        component: MyTickets,
        meta: { title: 'My Tickets - Eternity Ticket' }
      },
      {
        path: 'orders',
        name: 'MyOrders',
        component: MyOrders,
        meta: { title: 'My Orders - Eternity Ticket' }
      },
      {
        path: 'orders/:orderId',
        name: 'OrderDetails',
        component: OrderDetails,
        meta: { title: 'Order Details - Eternity Ticket' }
      },
      {
        path: 'membership',
        name: 'Membership',
        component: Membership,
        meta: { title: 'Membership - Eternity Ticket' }
      },
      {
        path: 'notifications',
        name: 'ParticipantNotifications',
        component: Notifications,
        meta: { title: 'Notifications - Eternity Ticket' }
      }
    ]
  },

  // ==========================================
  // ORGANIZER ROUTES
  // ==========================================
  {
    path: '/organizer',
    component: OrganizerLayout,
    meta: { 
      requiresAuth: true,
      allowedRoles: ['organizer']
    },
    children: [
      {
        path: 'dashboard',
        name: 'OrganizerDashboard',
        component: OrganizerDashboard,
        meta: { title: 'Dashboard - Organizer' }
      },
      {
        path: 'events',
        name: 'MyEvents',
        component: MyEvents,
        meta: { title: 'My Events - Organizer' }
      },
      {
        path: 'events/create',
        name: 'CreateEvent',
        component: CreateEvent,
        meta: { title: 'Create Event - Organizer' }
      },
      {
        path: 'events/:id/edit',
        name: 'EditEvent',
        component: EditEvent,
        meta: { title: 'Edit Event - Organizer' }
      },
      {
        path: 'events/:id/statistics',
        name: 'EventStatistics',
        component: EventStatistics,
        meta: { title: 'Event Statistics - Organizer' }
      },
      {
        path: 'events/:id/orders',
        name: 'OrderManagement',
        component: OrderManagement,
        meta: { title: 'Order Management - Organizer' }
      },
      {
        path: 'events/:id/team',
        name: 'TeamManagement',
        component: TeamManagement,
        meta: { title: 'Team Management - Organizer' }
      },
      {
        path: 'events/:id/checkin',
        name: 'CheckinPage',
        component: CheckinPage,
        meta: { title: 'Check-in - Organizer' }
      },
      {
        path: 'events/:id/checkin/scanner',  
        name: 'CheckinScanner',
        component: CheckinScanner,
        meta: { title: 'Check-in Scanner - Organizer' }
      },
      {
        path: 'events/:id/coupons',
        name: 'CouponManagement',
        component: CouponManagement,
        meta: { title: 'Coupon Management - Organizer' }
      },
      {
        path: 'events/:id/sessions', 
        name: 'SessionManagement',
        component: SessionManagement,
        meta: { title: 'Sessions & Tickets - Organizer' }
      },
      {
        path: '/organizer/events/:id/overview',
        name: 'EventOverview',
        component: EventOverview,
        meta: { 
          requiresAuth: true, 
          role: 'organizer',
          title: 'Event Management'
        }
      },
    ]
  },

  {
  path: '/organizer/teams',
  component: OrganizerLayout, 
  meta: { 
    requiresAuth: true,
    allowedRoles: ['organizer', 'participant']  
  },
  children: [
    {
      path: '',
      name: 'TeamsMember',
      component: TeamsMember,
      meta: { title: 'My Team Events' }
    }
  ]
},

  // ==========================================
  // ADMIN ROUTES
  // ==========================================
  {
    path: '/admin',
    component: AdminLayout,
    meta: { 
      requiresAuth: true,
      allowedRoles: ['admin', 'sub_admin']
    },
    children: [
      {
        path: 'dashboard',
        name: 'AdminDashboard',
        component: AdminDashboard,
        meta: { title: 'Dashboard - Admin' }
      },
      {
        path: 'events',
        name: 'EventApproval',
        component: EventApproval,
        meta: { title: 'Event Approval - Admin' }
      },
      {
        path: 'users',
        name: 'UserManagement',
        component: UserManagement,
        meta: { title: 'User Management - Admin' }
      },
      {
        path: 'sub-admins',
        name: 'SubAdminManagement',
        component: SubAdminManagement,
        meta: { 
          title: 'Sub-Admin Management - Admin',
          allowedRoles: ['admin'] // Only main admin
        }
      },
      {
        path: 'refunds',
        name: 'RefundManagement',
        component: RefundManagement,
        meta: { title: 'Refund Management - Admin' }
      },
      {
        path: 'settings',
        name: 'SystemSettings',
        component: SystemSettings,
        meta: { 
          title: 'System Settings - Admin',
          allowedRoles: ['admin'] // Only main admin
        }
      },
      {
        path: 'audit-logs',
        name: 'Audit Logs',
        component: AuditLogs,
        meta: { title: 'Audit Logs' }
      },
      {
        path: 'orders',
        name: 'Admin Orders',
        component: AdminOrderManagement,
        meta: { 
          title: 'Order Management'
        }
      },
    ]
  },

  // ==========================================
  // ERROR ROUTES
  // ==========================================
  {
    path: '/403',
    name: 'Forbidden',
    component: Forbidden,
    meta: { title: '403 - Forbidden' }
  },
  {
    path: '/500',
    name: 'ServerError',
    component: ServerError,
    meta: { title: '500 - Server Error' }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: NotFound,
    meta: { title: '404 - Not Found' }
  }
]

// ==========================================
// ROUTER INSTANCE
// ==========================================
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }
    if (to.hash) {
      return {
        el: to.hash,
        behavior: 'smooth'
      }
    }
    return { top: 0, behavior: 'smooth' }
  }
})

// ==========================================
// NAVIGATION GUARDS
// ==========================================
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  
  // Set page title
  document.title = to.meta.title || 'Eternity Ticket'
  
  // Show loading (optional)
  // You can add loading state here
  
  // Guest-only routes (login, register)
  if (to.meta.guestOnly && authStore.isAuthenticated) {
    return next({ name: 'Home' })
  }
  
  // Protected routes
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return next({
      name: 'Login',
      query: { redirect: to.fullPath }
    })
  }
  
  // Role-based access
  if (to.meta.allowedRoles && authStore.isAuthenticated) {
    const userRole = authStore.user?.role
    const allowedRoles = Array.isArray(to.meta.allowedRoles) 
      ? to.meta.allowedRoles 
      : [to.meta.allowedRoles]
    
    if (!allowedRoles.includes(userRole)) {
      return next({ name: 'Forbidden' })
    }
  }
  
  next()
})

router.afterEach(() => {
  // Hide loading (optional)
  // You can remove loading state here
})

// ==========================================
// ERROR HANDLER
// ==========================================
router.onError((error) => {
  console.error('Router error:', error)
  // You can show error toast here
})

export default router