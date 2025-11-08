import { createRouter, createWebHistory } from 'vue-router'
import { isAuthenticated } from '@/utils/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/Login.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/',
      name: 'dashboard',
      component: () => import('@/views/Dashboard.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/add-project',
      name: 'add-project',
      component: () => import('@/views/AddProject.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/project/:id',
      name: 'project-detail',
      component: () => import('@/views/ProjectDetail.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/Settings.vue'),
      meta: { requiresAuth: true }
    }
  ]
})

// Navigation guard
router.beforeEach((to, from, next) => {
  const requiresAuth = to.meta.requiresAuth !== false // Default to requiring auth

  if (requiresAuth && !isAuthenticated()) {
    // Redirect to login if not authenticated
    next('/login')
  } else if (to.path === '/login' && isAuthenticated()) {
    // Redirect to dashboard if already authenticated
    next('/')
  } else {
    next()
  }
})

export default router
