import {defineStore} from "pinia"

export const usePokemonStore = defineStore("pokemonStore", {
    

    state: () => ({
        caughtPokemon: [],
        wishlistPokemon: [],
        typeColors: {
            normal:   '#A8A878',
            fire:     '#F08030',
            water:    '#6890F0',
            electric: '#F8D030',
            grass:    '#78C850',
            ice:      '#98D8D8',
            fighting: '#C03028',
            poison:   '#A040A0',
            ground:   '#E0C068',
            flying:   '#A890F0',
            psychic:  '#F85888',
            bug:      '#A8B820',
            rock:     '#B8A038',
            ghost:    '#705898',
            dragon:   '#7038F8',
            dark:     '#705848',
            steel:    '#B8B8D0',
            fairy:    '#EE99AC',
            stellar:  '#40B5A5'
        },
        starters: {
            kanto: [1, 4, 7],
            johto: [152, 155, 158],
            hoenn: [252, 255, 258],
            sinnoh: [387, 390, 393],
            unova: [495, 498, 501],
            kalos: [650, 653, 656],
            alola: [722, 725, 728],
            galar: [810, 813, 816],
            paldea: [906, 909, 912]
        }

    }),
    getters:{
        getStartersByRegion: (state) => (region) =>{
            return state.starters[region] || []
        }
    },
    actions: {
        addPokemon(pokemon){
            this.caughtPokemon.push(pokemon)
        },
        addWishlistPokemon(pokemon){
            this.caughtPokemon.push(pokemon)
        },
        releasePokemon(index){
            this.caughtPokemon.splice(index, 1)
        }
    }
})