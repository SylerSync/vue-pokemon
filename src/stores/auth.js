import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as PokemonAPI from '@/api/PokemonAPI';

export const useAuthStore = defineStore('auth', () => {
  const user = ref(JSON.parse(localStorage.getItem('user') || 'null'))
  const isLoggedIn = computed(() => user.value !== null)

  async function login(username, password) {
    const result = await PokemonAPI.login(username, password)
    user.value = result
    localStorage.setItem('user', JSON.stringify(result))
    // pokemonStore.setWishlistPokemon(result.wishList)
    return result
  }

  function logout() {
    user.value = null
    localStorage.removeItem('user')
    localStorage.removeItem('token')
  }

  return { user, isLoggedIn, login, logout }
})