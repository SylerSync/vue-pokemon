import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  // Define your routes here
  {
    path: '/home',
    name: 'Home',
    component: () => import('../views/HomeView.vue')
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router
