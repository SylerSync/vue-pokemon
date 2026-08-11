import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  // Define your routes here
  {
    path: "/wildPokemon",
    name: "WildPokemon",
    component: () => import("@/views/WildPokemon.vue")
  },
  {
    path: '/dex',
    name: 'Pokedex',
    component: () => import('../views/PokedexView.vue')
  },
  {
    path: "/pokebox",
    name: "Pokemon Box",
    component: () => import("@/views/PokeBox.vue")
  },
  {
    path: "/wishList",
    name: "WishList",
    component: () => import("@/views/WishListView.vue")
  },
  {
    path: "/shop",
    name: "Shop",
    component: () => import("@/views/Storefront.vue")
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router
