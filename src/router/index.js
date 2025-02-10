import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '../views/DashboardView.vue'
import LoginView from '../views/LoginView.vue'
import JobsView from '@/views/JobsView.vue'
import JobDetailView from '@/views/JobDetailView.vue'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { public: true }
  },
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: DashboardView
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
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

router.beforeEach((to, from, next) => {
  const publicPages = ['/login']
  const authRequired = !publicPages.includes(to.path)
  const loggedIn = localStorage.getItem('tokens')

  if (authRequired && !loggedIn) {
    return next('/login')
  }

  if (loggedIn && to.path === '/login') {
    return next('/dashboard')
  }

  next()
})

export default router
