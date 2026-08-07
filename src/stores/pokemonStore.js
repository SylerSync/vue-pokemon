import {defineStore} from "pinia"

export const usePokemonStore = defineStore("pokemonStore", {

    state: () => ({
        caughtPokemon: [],
        wishlistPokemon: []
    }),
    getters:{
        
    },
    actions: {
        addPokemon(pokemon){
            this.caughtPokemon.push(pokemon)
        },
        addWishlistPokemon(pokemon){
            this.caughtPokemon.push(pokemon)
        }
    }
})