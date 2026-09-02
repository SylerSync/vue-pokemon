import { defineStore } from "pinia"
import * as PokemonAPI from '@/api/PokemonAPI';

export const usePokemonStore = defineStore("pokemonStore", {


    state: () => ({
        caughtPokemon: [],
        pokemonParty: [],
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
        pokemonParty: (state) => {
            return state.partyIds
                .map(id => state.caughtPokemon.find(p => p.instanceId === id))
                .filter(Boolean); // Filters out any missing or released Pokemon
        },
        pokemonIsCaught: (state) => (pokemonName) => {
            return state.caughtPokemon.some(pokemon => pokemon.name === pokemonName);
        },
        getStartersByRegion: (state) => (region) => {
            return state.starters[region] || []
        },
        pokemonIsInWishList: (state) => (pokemonName) => {
            pokemonName = pokemonName.toLowerCase();
            return state.wishlistPokemon.some(pokemon => pokemon === pokemonName.valueOf());
        }
    },
    actions: {
        // Caught Pokemon controls
        async addPokemon(pokemon) {
            pokemon.moves.forEach(move => {
                move.category = move.category.replace(/-(\w)/g, (_, c) => c.toUpperCase())
            })
            pokemon.evoDetails.forEach(evo => {
                evo.nextEvo = evo.nextEvo ? evo.nextEvo.name : null
            })
            let newPokemon = {
                ID: pokemon.id,
                Name: pokemon.name,
                Shiny: pokemon.shiny || false,
                Sprites: {
                    Front: pokemon.sprite,
                    Back: pokemon.backSprite,
                    ShinyFront: pokemon.shinySprite || null,
                    ShinyBack: pokemon.shinyBackSprite || null
                },
                Types: pokemon.types,
                Height: pokemon.height,
                Weight: pokemon.weight,
                Cry: pokemon.cry,
                CaptureRate: pokemon.captureRate,
                totalHP: pokemon.totalHP,
                currentHP: pokemon.currentHP,
                Stats: [],
                Moves: pokemon.moves,
                LearnedMoves: pokemon.learnedMoves || [],
                TotalKOs: pokemon.totalKOs || 0,
                TotalFaints: pokemon.totalFaints || 0,
                Level: pokemon.level || 1,
                EvolutionReqs: pokemon.evoDetails || [],
                BaseExp: pokemon.baseExp || 0,
                CurrentExp: pokemon.currentExp || 0,
            }
            newPokemon.Stats = pokemon.stats.map(stat => ({
                Name: stat.name.replace(/-(\w)/g, (_, c) => c.toUpperCase()),
                BaseStat: stat.base_stat || 0,
                StatTotal: Math.floor(stat.stat) || 0
            }))
            let user = JSON.parse(localStorage.getItem('user'))
            try{
                let results = await PokemonAPI.catchPokemon(user.email, newPokemon)
                this.caughtPokemon = results.pokemon
            } catch (error) {
                console.error("Error catching Pokemon:", error);
            }

            // this.caughtPokemon.push(newPokemon)
            if (this.pokemonParty.length < 6) {
                this.pokemonParty.push(newPokemon)
            }
        },
        releasePokemon(index) {
            const released = this.caughtPokemon[index];
            if (released) {
                // Remove from party if present
                this.partyIds = this.partyIds.filter(id => id !== released.instanceId);
                this.caughtPokemon.splice(index, 1);
            }
        },
        // Wishlist Controls
        async addWishlistPokemon(pokemon) {
            let user = JSON.parse(localStorage.getItem('user'))
            let results = await PokemonAPI.addToWishList(pokemon.name, user.email)
            this.wishlistPokemon = results.wishList
        },
        async removeWishlistPokemon(pokemon) {
            let user = JSON.parse(localStorage.getItem('user'))
            console.log("Removing from wishlist:", pokemon.name, "for user:", user.email);
            let results = await PokemonAPI.removeFromWishList(pokemon.name, user.email)
            this.wishlistPokemon = results.wishList
        },
        // Pokemon Party controls
        addPokemonParty(pokemon) {
            if (this.partyIds.length >= 6) {
                console.log("Party is full (max 6)");
                return false;
            }

            const targetId = typeof pokemon === 'string' ? pokemon : pokemon.instanceId;

            if (!this.partyIds.includes(targetId)) {
                this.partyIds.push(targetId);
                return true;
            }
            return false;
        },

        removePokemonParty(pokemon) {
            if (!pokemon) return false;

            if (this.partyIds.length <= 1) {
                console.log("Cannot remove the last Pokemon from party.");
                return false;
            }

            const targetId = typeof pokemon === 'string' ? pokemon : pokemon.instanceId;
            this.partyIds = this.partyIds.filter(id => id !== targetId);
            return true;
        },
        setWishlistPokemon(pokemonList) {
            this.wishlistPokemon = pokemonList;
        },
        async getUserData(email){
            var user = await PokemonAPI.getUserData(email);
            if(user == null) return;
            console.log(user);
            this.wishlistPokemon = user.wishList || []
        }
    }
})