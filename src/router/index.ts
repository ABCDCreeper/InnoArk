import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/Register.vue'),
  },
  {
    path: '/',
    component: () => import('../components/Layout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'Home', component: () => import('../views/Home.vue') },
      { path: 'projects', name: 'Projects', component: () => import('../views/Projects.vue') },
      { path: 'project/:id', name: 'ProjectDetail', component: () => import('../views/ProjectDetail.vue'), props: true },
      { path: 'resources', name: 'Resources', component: () => import('../views/Resources.vue') },
      { path: 'quiz', name: 'Quiz', component: () => import('../views/Quiz.vue') },
      { path: 'focus', name: 'Focus', component: () => import('../views/Focus.vue') },
      {
        path: 'teacher',
        name: 'TeacherBoard',
        component: () => import('../views/TeacherBoard.vue'),
        meta: { roles: ['teacher'] },
      },
      { path: 'settings', name: 'Settings', component: () => import('../views/Settings.vue') },
      { path: 'about', name: 'About', component: () => import('../views/About.vue') },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'Login', query: { redirect: to.fullPath } }
  }
  if ((to.name === 'Login' || to.name === 'Register') && auth.isAuthenticated) {
    return { name: 'Home' }
  }
  const roles = to.meta.roles as string[] | undefined
  if (roles && !roles.includes(auth.user?.role ?? '')) {
    return { name: 'Home' }
  }
  return true
})

export default router
