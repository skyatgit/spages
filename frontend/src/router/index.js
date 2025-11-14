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

// 路由守卫
router.beforeEach((to, from, next) => {
  const requiresAuth = to.meta.requiresAuth !== false // 默认需要认证

  if (requiresAuth && !isAuthenticated()) {
    // 如果未认证则重定向到登录页
    next('/login')
  } else if (to.path === '/login' && isAuthenticated()) {
    // 如果已认证则重定向到仪表板
    next('/')
  } else {
    next()
  }
})

export default router
