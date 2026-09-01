import { defineStore } from "pinia"
import * as PokemonAPI from '@/api/PokemonAPI';


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
    minorStatus: [],
    stats: [
        { name: "hp", stat: 999 },
        { name: "attack", stat: 999 },
        { name: "defense", stat: 999 },
        { name: "special-attack", stat: 909 },
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
            currentPP: 99,
            maxPP: 99,
        },
        {
            name: 'pass-turn', type: 'normal', power: 0,
            maxPP: 20, currentPP: 20, accuracy: null, priority: 0,
            damageClass: 'physical', targetsSelf: false,
            statChanges: [], statChance: 0,
            ailment: null, ailmentChance: 0,
            drain: 0, healing: 0, flinchChance: 0, critRate: 0,
            minTurns: 0, maxTurns: 0, minHits: null, maxHits: null,
            category: 'damage'
        },
        {
            name: 'revival-blessing', type: 'normal', power: 0,
            maxPP: 40, currentPP: 40, accuracy: null, priority: 0,
            damageClass: 'status', targetsSelf: false,
            statChanges: [], statChance: 0,
            ailment: null, ailmentChance: 0,
            drain: 0, healing: 0, flinchChance: 0, critRate: 0,
            minTurns: 0, maxTurns: 0, minHits: null, maxHits: null,
            category: 'unique'
        },
        {
            name: 'guillotine', type: 'normal', power: null,
            maxPP: 10, currentPP: 10, accuracy: 30, priority: 0,
            damageClass: 'physical', targetsSelf: false,
            statChanges: [], statChance: 0,
            ailment: null, ailmentChance: 0,
            drain: 0, healing: 0, flinchChance: 0, critRate: 0,
            minTurns: 0, maxTurns: 0, minHits: null, maxHits: null,
            category: 'ohko'
        },
    ]
}

const testBulbasaur = {
    "name": "bulbasaur",
    "id": 1,
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png",
    "backSprite": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/1.png",
    "types": ["grass", "poison"],
    "height": 7,
    "weight": 69,
    "cry": "https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/1.ogg",
    "captureRate": 18,
    "totalHp": 22,
    "currentHp": 22,
    "level": 16,
    "baseExp": 64,
    "currentExp": 817,
    "totalKOs": 0,
    "totalFaints": 0,
    "instanceId": "test-bulbasaur-lvl6",
    "stats": [
        { "name": "hp", "base_stat": 45, "stat": 10.4 },
        { "name": "attack", "base_stat": 49, "stat": 99 },
        { "name": "defense", "base_stat": 49, "stat": 10.88 },
        { "name": "special-attack", "base_stat": 65, "stat": 12.8 },
        { "name": "special-defense", "base_stat": 65, "stat": 12.8 },
        { "name": "speed", "base_stat": 45, "stat": 10.4 }
    ],
    "moves": [
        {
            "name": "tackle",
            "type": "normal",
            "power": 40,
            "currentPP": 35,
            "maxPP": 35,
            "accuracy": 100,
            "priority": 0,
            "damageClass": "physical",
            "targetsSelf": false,
            "statChanges": [],
            "statChance": 0,
            "ailment": null,
            "ailmentChance": 0,
            "drain": 0,
            "healing": 0,
            "flinchChance": 0,
            "critRate": 0,
            "trap": false,
            "minTurns": 0,
            "maxTurns": 0
        },
        {
            "name": "reflect",
            "type": "normal",
            "power": null,
            "currentPP": 40,
            "maxPP": 40,
            "accuracy": 100,
            "priority": 0,
            "damageClass": "status",
            "targetsSelf": false,
            "statChanges": [{ "stat": "attack", "change": -1 }],
            "statChance": 0,
            "ailment": null,
            "ailmentChance": 0,
            "drain": 0,
            "healing": 0,
            "flinchChance": 0,
            "critRate": 0,
            "trap": false,
            "minTurns": 0,
            "maxTurns": 0
        },
        {
            "name": "scratch",
            "type": "normal",
            "power": 40,
            "currentPP": 35,
            "maxPP": 35,
            "accuracy": 100,
            "priority": 0,
            "damageClass": "physical",
            "targetsSelf": false,
            "statChanges": [],
            "statChance": 0,
            "ailment": null,
            "ailmentChance": 0,
            "drain": 0,
            "healing": 0,
            "flinchChance": 0,
            "critRate": 0,
            "trap": false,
            "minTurns": 0,
            "maxTurns": 0
        },
        {
            "name": "leech-seed",
            "type": "grass",
            "power": null,
            "currentPP": 10,
            "maxPP": 10,
            "accuracy": 90,
            "priority": 0,
            "damageClass": "status",
            "targetsSelf": false,
            "statChanges": [],
            "statChance": 0,
            "ailment": "leech-seed",
            "ailmentChance": 0,
            "drain": 0,
            "healing": 0,
            "flinchChance": 0,
            "critRate": 0,
            "trap": false,
            "minTurns": 0,
            "maxTurns": 0
        }
    ],
    "evoDetails": [
        {
            "level": 16,
            "item": null,
            "heldItem": null,
            "trigger": "level-up",
            "nextEvo": {
                "name": "ivysaur",
                "url": "https://pokeapi.co/api/v2/pokemon-species/2/"
            }
        }
    ]
}

const testCharizard = {
    "name": "charizard",
    "id": 6,
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/6.png",
    "backSprite": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/6.png",
    "types": ["fire", "flying"],
    "height": 17,
    "weight": 905,
    "cry": "https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/6.ogg",
    "captureRate": 45,
    "totalHp": 108,
    "currentHp": 108,
    "level": 36,
    "baseExp": 240,
    "currentExp": 14200,
    "totalKOs": 0,
    "totalFaints": 0,
    "instanceId": "test-charizard-mega-x",
    "heldItem": "Charizardite-X",
    "stats": [
        { "name": "hp", "base_stat": 78, "stat": 108 },
        { "name": "attack", "base_stat": 84, "stat": 65.44 },
        { "name": "defense", "base_stat": 78, "stat": 61.12 },
        { "name": "special-attack", "base_stat": 109, "stat": 83.48 },
        { "name": "special-defense", "base_stat": 85, "stat": 66.2 },
        { "name": "speed", "base_stat": 100, "stat": 77.0 }
    ],
    "moves": [
        {
            "name": "flamethrower",
            "type": "fire",
            "power": 90,
            "currentPP": 15,
            "maxPP": 15,
            "accuracy": 100,
            "priority": 0,
            "damageClass": "special",
            "targetsSelf": false,
            "statChanges": [],
            "statChance": 0,
            "ailment": "burn",
            "ailmentChance": 10,
            "drain": 0,
            "healing": 0,
            "flinchChance": 0,
            "critRate": 0,
            "trap": false,
            "minTurns": 0,
            "maxTurns": 0
        },
        {
            "name": "dragon-claw",
            "type": "dragon",
            "power": 80,
            "currentPP": 15,
            "maxPP": 15,
            "accuracy": 100,
            "priority": 0,
            "damageClass": "physical",
            "targetsSelf": false,
            "statChanges": [],
            "statChance": 0,
            "ailment": null,
            "ailmentChance": 0,
            "drain": 0,
            "healing": 0,
            "flinchChance": 0,
            "critRate": 0,
            "trap": false,
            "minTurns": 0,
            "maxTurns": 0
        },
        {
            "name": "air-slash",
            "type": "flying",
            "power": 75,
            "currentPP": 15,
            "maxPP": 15,
            "accuracy": 95,
            "priority": 0,
            "damageClass": "special",
            "targetsSelf": false,
            "statChanges": [],
            "statChance": 0,
            "ailment": null,
            "ailmentChance": 0,
            "drain": 0,
            "healing": 0,
            "flinchChance": 30,
            "critRate": 0,
            "trap": false,
            "minTurns": 0,
            "maxTurns": 0
        },
        {
            "name": "burn-up",
            "type": "fire",
            "power": 130,
            "currentPP": 20,
            "maxPP": 20,
            "accuracy": 100,
            "priority": 0,
            "damageClass": "special",
            "targetsSelf": false,
            "statChanges": [],
            "statChance": 0,
            "ailment": null,
            "ailmentChance": 0,
            "drain": 0,
            "healing": 0,
            "flinchChance": 0,
            "critRate": 0,
            "trap": false,
            "minTurns": 0,
            "maxTurns": 0
        }
    ],
    "evoDetails": []
}

const testRayquaza = {
    name: "rayquaza",
    id: 384,
    instanceId: "test-mega-rayquaza-001",
    level: 70,
    heldItem: "Mega Cuff", // Or whatever mega item key your check system uses
    sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/384.png",
    backSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/384.png",
    types: ["dragon", "flying"],
    height: 70,
    weight: 2065,
    baseExp: 340,
    currentExp: 0,
    captureRate: 18,
    totalHp: 248,
    currentHp: 248,
    totalKOs: 0,
    totalFaints: 0,
    minorStatus: [],
    cry: "https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/384.ogg",
    stats: [
        { name: "hp", base_stat: 105, stat: 248 },
        { name: "attack", base_stat: 150, stat: 215 },
        { name: "defense", base_stat: 90, stat: 131 },
        { name: "special-attack", base_stat: 150, stat: 215 },
        { name: "special-defense", base_stat: 90, stat: 131 },
        { name: "speed", base_stat: 95, stat: 138 }
    ],
    moves: [
        {
            name: "dragon-ascent",
            type: "flying",
            power: 120,
            accuracy: 100,
            damageClass: "physical",
            currentPP: 5,
            maxPP: 5
        },
        {
            name: "dragon-claw",
            type: "dragon",
            power: 80,
            accuracy: 100,
            damageClass: "physical",
            currentPP: 15,
            maxPP: 15
        },
        {
            name: "extreme-speed",
            type: "normal",
            power: 80,
            accuracy: 100,
            damageClass: "physical",
            currentPP: 5,
            maxPP: 5
        },
        {
            name: 'future-sight', type: 'psychic', power: 120,
            maxPP: 10, currentPP: 10, accuracy: 100, priority: 0,
            damageClass: 'special', targetsSelf: false,
            statChanges: [], statChance: 0,
            ailment: null, ailmentChance: 0,
            drain: 0, healing: 0, flinchChance: 0, critRate: 0,
            minTurns: 0, maxTurns: 0, minHits: null, maxHits: null,
            category: 'unique'
        }
    ]
};

const testGligar = {
    "name": "gligar",
    "id": 207,
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/207.png",
    "backSprite": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/207.png",
    "types": ["ground", "flying"],
    "height": 11,
    "weight": 648,
    "cry": "https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/207.ogg",
    "captureRate": 60,
    "totalHp": 48,
    "currentHp": 48,
    "level": 15,
    "baseExp": 86,
    "currentExp": 720,
    "totalKOs": 0,
    "totalFaints": 0,
    "heldItem": "razor-fang",
    "instanceId": "test-gligar-item-evo",
    "stats": [
        { "name": "hp", "base_stat": 65, "stat": 48 },
        { "name": "attack", "base_stat": 75, "stat": 29 },
        { "name": "defense", "base_stat": 105, "stat": 38 },
        { "name": "special-attack", "base_stat": 35, "stat": 17 },
        { "name": "special-defense", "base_stat": 65, "stat": 26 },
        { "name": "speed", "base_stat": 85, "stat": 32 }
    ],
    "moves": [
        {
            "name": "poison-sting",
            "type": "poison",
            "power": 15,
            "currentPP": 35,
            "maxPP": 35,
            "accuracy": 100,
            "priority": 0,
            "damageClass": "physical",
            "targetsSelf": false,
            "statChanges": [],
            "statChance": 0,
            "ailment": "poison",
            "ailmentChance": 30,
            "drain": 0,
            "healing": 0,
            "flinchChance": 0,
            "critRate": 0,
            "trap": false,
            "minTurns": 0,
            "maxTurns": 0
        },
        {
            "name": "sand-attack",
            "type": "ground",
            "power": null,
            "currentPP": 15,
            "maxPP": 15,
            "accuracy": 100,
            "priority": 0,
            "damageClass": "status",
            "targetsSelf": false,
            "statChanges": [{ "stat": "accuracy", "change": -1 }],
            "statChance": 0,
            "ailment": null,
            "ailmentChance": 0,
            "drain": 0,
            "healing": 0,
            "flinchChance": 0,
            "critRate": 0,
            "trap": false,
            "minTurns": 0,
            "maxTurns": 0
        },
        {
            "name": "harden",
            "type": "normal",
            "power": null,
            "currentPP": 30,
            "maxPP": 30,
            "accuracy": null,
            "priority": 0,
            "damageClass": "status",
            "targetsSelf": true,
            "statChanges": [{ "stat": "defense", "change": 1 }],
            "statChance": 0,
            "ailment": null,
            "ailmentChance": 0,
            "drain": 0,
            "healing": 0,
            "flinchChance": 0,
            "critRate": 0,
            "trap": false,
            "minTurns": 0,
            "maxTurns": 0
        },
        {
            "name": "knock-off",
            "type": "dark",
            "power": 65,
            "currentPP": 20,
            "maxPP": 20,
            "accuracy": 100,
            "priority": 0,
            "damageClass": "physical",
            "targetsSelf": false,
            "statChanges": [],
            "statChance": 0,
            "ailment": null,
            "ailmentChance": 0,
            "drain": 0,
            "healing": 0,
            "flinchChance": 0,
            "critRate": 0,
            "trap": false,
            "minTurns": 0,
            "maxTurns": 0
        }
    ],
    "evoDetails": [
        {
            "level": 1,
            "item": null,
            "heldItem": "razor-fang",
            "trigger": "level-up",
            "nextEvo": {
                "name": "gliscor",
                "url": "https://pokeapi.co/api/v2/pokemon-species/472/"
            }
        }
    ]
}

const testEevee = {
    instanceId: "eevee-test-uuid-001",
    name: "eevee",
    level: 25,
    currentExp: 450,
    totalHp: 65,
    currentHp: 65,
    heldItem: null,
    totalKOs: 0,
    totalFaints: 0,
    sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/133.png",
    backSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/133.png",
    types: ["normal"],
    height: 3,
    weight: 65,
    baseExp: 65,
    status: "poison",

    // Base stats matching your getPokemonData structure
    stats: [
        { name: "hp", base_stat: 55, stat: 65 },
        { name: "attack", base_stat: 55, stat: 32 },
        { name: "defense", base_stat: 50, stat: 30 },
        { name: "special-attack", base_stat: 45, stat: 27 },
        { name: "special-defense", base_stat: 65, stat: 37 },
        { name: "speed", base_stat: 55, stat: 32 }
    ],

    // Sample starting moveset
    moves: [
        { name: "tackle", type: "normal", class: "physical", power: 40, currentPP: 35, maxPP: 35 },
        { name: "quick-attack", type: "normal", class: "physical", power: 40, currentPP: 30, maxPP: 30 },
        { name: "bite", type: "dark", class: "physical", power: 60, currentPP: 25, maxPP: 25 },
        { name: "swift", type: "normal", class: "special", power: 60, currentPP: 20, maxPP: 20 }
    ],

    // Evolution details array testing multiple "use-item" stones
    evoDetails: [
        {
            trigger: "use-item",
            item: "water-stone", // match this with your JSON evoItem id
            nextEvo: { name: "vaporeon" }
        },
        {
            trigger: "use-item",
            item: "thunder-stone",
            nextEvo: { name: "jolteon" }
        },
        {
            trigger: "use-item",
            item: "fire-stone",
            nextEvo: { name: "flareon" }
        }
    ]
};

export const usePokemonStore = defineStore("pokemonStore", {


    state: () => ({
        caughtPokemon: [testBulbasaur, testCharizard, testEevee, testGligar, testGodPokemon, testRayquaza],
        pokemonParty: [],
        wishlistPokemon: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).wishList : [],
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
        // StoreSetup
        initializeStore() {
            let user = JSON.parse(localStorage.getItem('user'))
            if (user && user.wishList) {
                this.wishlistPokemon = user.wishList
            }
        },
        // Caught Pokemon controls
        addPokemon(pokemon) {
            const instanceId = crypto.randomUUID();
            const newPokemon = {
                ...pokemon,
                instanceId: instanceId
            };
            this.caughtPokemon.push(newPokemon);

            if (this.partyIds.length < 6) {
                this.partyIds.push(instanceId);
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
        }
    }
})