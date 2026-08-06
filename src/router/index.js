import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  // Define your routes here
  {
    path: '/home',
    name: 'Home',
    component: () => import('../views/HomeView.vue')
  },
  {
    path: "/wildPokemon",
    name: "WildPokemon",
    component: () => import("@/views/WildPokemon.vue")
  },
  {
    path: '/dex',
    name: 'Pokedex',
    component: () => import('../views/PokedexView.vue')
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router
