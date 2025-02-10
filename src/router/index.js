import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '../views/DashboardView.vue'
import LoginView from '../views/LoginView.vue'
import JobsView from '@/views/JobsView.vue'
import JobDetailView from '@/views/JobDetailView.vue'
import { useStore } from 'vuex'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { 
      public: true,
      title: 'Login - Timekeeper'
    }
  },
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: DashboardView,
    meta: {
      title: 'Dashboard - Timekeeper'
    }
  },
  {
    path: '/clients',
    name: 'clients',
    component: () => import('../views/ClientsView.vue')
  },
  {
    path: '/jobs',
    name: 'jobs',
    component: JobsView,
    meta: { requiresAuth: true }
  },
  {
    path: '/reports',
    name: 'reports',
    component: () => import('../views/ReportsView.vue')
  },
  {
    path: '/jobs/:jobId',
    name: 'JobDetail',
    component: JobDetailView,
    meta: {
      activeNav: 'jobs'
    }
  },
  {
    path: '/clients/:clientId',
    name: 'ClientDetail',
    component: () => import('../views/ClientDetailView.vue'),
    meta: {
      activeNav: 'clients'
    }
  },
  {
    path: '/timesheet',
    name: 'timesheet',
    component: () => import('../views/WeeklyTimesheetView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/admin',
    name: 'admin',
    component: () => import('../views/AdminView.vue'),
    meta: { 
      requiresAuth: true,
      requiresAdmin: true,
      title: 'Admin - Timekeeper'
    }
  },
  {
    path: '/admin/staff/:staffId/dashboard',
    name: 'adminStaffDashboard',
    component: DashboardView,
    meta: { 
      requiresAuth: true,
      requiresAdmin: true,
      title: 'Staff Dashboard - Timekeeper'
    },
    props: true
  },
  {
    path: '/admin/staff/:staffId/timesheet',
    name: 'adminStaffTimesheet',
    component: () => import('../views/WeeklyTimesheetView.vue'),
    meta: { 
      requiresAuth: true,
      requiresAdmin: true,
      title: 'Staff Timesheet - Timekeeper'
    },
    props: true
  },
  {
    path: '/admin/staff/:staffId',
    name: 'StaffDetail',
    component: () => import('../views/StaffDetailView.vue'),
    meta: { 
      requiresAuth: true,
      requiresAdmin: true,
      title: 'Staff Details - Timekeeper'
    }
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

router.beforeEach(async (to, from, next) => {
  const publicPages = ['/login']
  const authRequired = !publicPages.includes(to.path)
  const store = useStore()
  
  const hasTokens = localStorage.getItem('tokens')
  
  if (authRequired) {
    if (!hasTokens) {
      return next('/login')
    }
    
    // If we have tokens but no user, try to initialize auth
    if (!store.state.auth.user) {
      try {
        await store.dispatch('auth/initializeAuth')
      } catch (error) {
        return next('/login')
      }
    }

    // Check admin requirements
    if (to.meta.requiresAdmin && !store.getters['auth/isAdmin']) {
      return next('/dashboard')
    }
  }
  
  if (hasTokens && to.path === '/login') {
    return next('/dashboard')
  }
  
  next()
})

router.afterEach((to) => {
  // Update document title
  document.title = to.meta.title || 'Timekeeper'
})

export default router
