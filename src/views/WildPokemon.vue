<script setup>
import {watch, ref, computed} from "vue"
import Select from "primevue/select"

const regions = ref([
    "kanto",
    "johto",
    "hoenn",
    "sinnoh",
    "unova",
    "kalos",
    "galar",
    "paldea"
])
const selectedRegion = ref("")

const pokemonList = ref([])

watch(selectedRegion, async (region)=>{
    if(!region || region === "Select a region") return;
    pokemonList.value = []; // Reset the list so it is clear for the new region.

    let pokedex_urls = []

    let seenPokemon = [];
    let regionPokemon = [];

    const response = await fetch("https://pokeapi.co/api/v2/region/" + region)
    let regionDataDex = (await response.json()).pokedexes;

    for(let pokedex of regionDataDex){
        pokedex_urls.push(pokedex.url)
    }

    for(let url of pokedex_urls){
        const pokeResponse = await fetch(url);
        let pokeData = await pokeResponse.json();

        for(let pokemon of pokeData.pokemon_entries){
            if (seenPokemon.includes(pokemon.pokemon_species.name)) {
                continue;
            }
            regionPokemon.push({
                name: pokemon.pokemon_species.name,
                url: pokemon.pokemon_species.url
            })
            seenPokemon.push(pokemon.pokemon_species.name)
        }
    }

    pokemonList.value = (regionPokemon)
})

const wildPokemon = computed(() => {
    const list = pokemonList.value
    if (!list || list.length === 0) return [] 

    let wildPokemon = []

    const indexes = []
    const listLength = list.length  
    for (let i = 0; i < 6; i++) {
      const randomIndex = Math.floor(Math.random() * listLength)
      indexes.push(randomIndex)
    }
    for(let index of indexes){
        wildPokemon.push(pokemonList.value[index])
    }
    console.log(wildPokemon)
    return wildPokemon
})

</script>
<template>
    <Select v-model="selectedRegion" :options="regions" placeholder="Select a region"/>
    <p>Here is a list of pokemon to choose from.</p>
    <div
    v-for="(pokemon) in wildPokemon"
    :key="pokemon.name"
    class="pokemon-card">
        <p>{{ pokemon.name }}</p>
    </div>
</template>
<style scoped>

</style>