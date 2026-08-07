import {defineStore} from "pinia"

export const usePokemonStore = defineStore("pokemonStore", {

    state: () => ({
        caughtPokemon: [],
        wishlistPokemon: []
    }),
    getters:{
        pokemonIsCaught: (state) => (pokemonName) => {
            return state.caughtPokemon.some(pokemon => pokemon.name === pokemonName);
        }
    },
    actions: {
        addPokemon(pokemon){
            this.caughtPokemon.push(pokemon)
        },
        addWishlistPokemon(pokemon){
            this.wishlistPokemon.push(pokemon)
        },
        releasePokemon(index){
            this.caughtPokemon.splice(index, 1)
        }
    }
})