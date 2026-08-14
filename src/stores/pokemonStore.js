import { defineStore } from "pinia"

const testGodPokemon = {
    id: 150,
    name: "mewtwo-god",
    level: 100,
    totalHp: 999,
    currentHp: 999,
    types: ["psychic"],
    sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/150.png",
    backSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/150.png",
    cry: "https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/150.ogg",
    instanceId: "test-god-mewtwo-uuid",
    stats: [
        { name: "hp", stat: 999 },
        { name: "attack", stat: 999 },
        { name: "defense", stat: 999 },
        { name: "special-attack", stat: 999 },
        { name: "special-defense", stat: 999 },
        { name: "speed", stat: 999 } // Ensures you always go first
    ],
    moves: [
        {
            name: "psystrike-god",
            type: "psychic",
            class: "special",
            power: 300,
            accuracy: 100,
            pp: 99
        },
        {
            name: "hyper-beam-god",
            type: "normal",
            class: "special",
            power: 300,
            accuracy: 100,
            pp: 99
        }
    ]
}

export const usePokemonStore = defineStore("pokemonStore", {


    state: () => ({
        caughtPokemon: [
            
        ],
        wishlistPokemon: [],
        typeColors: {
            normal: '#A8A878',
            fire: '#F08030',
            water: '#6890F0',
            electric: '#F8D030',
            grass: '#78C850',
            ice: '#98D8D8',
            fighting: '#C03028',
            poison: '#A040A0',
            ground: '#E0C068',
            flying: '#A890F0',
            psychic: '#F85888',
            bug: '#A8B820',
            rock: '#B8A038',
            ghost: '#705898',
            dragon: '#7038F8',
            dark: '#705848',
            steel: '#B8B8D0',
            fairy: '#EE99AC',
            stellar: '#40B5A5'
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
        },
        typeChart: {
            normal: { rock: 0.5, ghost: 0, steel: 0.5 },
            fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
            water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
            electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
            grass: { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
            ice: { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
            fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
            poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
            ground: { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
            flying: { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
            psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
            bug: { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
            rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
            ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
            dragon: { dragon: 2, steel: 0.5, fairy: 0 },
            dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
            steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
            fairy: { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 },
        }
    }),
    getters: {
        pokemonIsCaught: (state) => (pokemonName) => {
            return state.caughtPokemon.some(pokemon => pokemon.name === pokemonName);
        },
        getStartersByRegion: (state) => (region) => {
            return state.starters[region] || []
        },
        pokemonIsInWishList: (state) => (pokemonName) => {
            return state.wishlistPokemon.some(pokemon => pokemon.name === pokemonName);
        }
    },
    actions: {
        addPokemon(pokemon) {
            this.caughtPokemon.push({
                ...pokemon,
                instanceId: crypto.randomUUID()
            })
        },
        addWishlistPokemon(pokemon) {
            this.wishlistPokemon.push(pokemon)
        },
        releasePokemon(index) {
            this.caughtPokemon.splice(index, 1)
        },
        // removes from wishlist by name instead of index number
        removeWishlistPokemon(pokemon) {
            this.wishlistPokemon = this.wishlistPokemon.filter(pok => pok.name !== pokemon)
        }
    }
})