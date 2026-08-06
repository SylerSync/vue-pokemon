<script setup>
import {watch, ref, computed} from "vue"
import Select from "primevue/select"
import Card from "primevue/card"

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

const wildPokemon = ref([])

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

    getWildPokemonData();
})

async function getWildPokemonData(){
    const list = pokemonList.value;
    if(!list || list.length === 0){
        wildPokemon.value = []
        return
    }

    const indexes = []
    const listLength = list.length
    let pokemonData = []

    for (let i = 0; i < 6; i++) {
      const randomIndex = Math.floor(Math.random() * listLength)
      indexes.push(randomIndex)
    }
    for(let index of indexes){
        pokemonData.push(pokemonList.value[index])
    }

    for(let pokemon of pokemonData){
        const data = await fetch("https://pokeapi.co/api/v2/pokemon/" + pokemon.name)
        let dataJson = await data.json();

        pokemon.id = dataJson.id
        pokemon.sprite = dataJson.sprites.front_default
        pokemon.types = dataJson.types.map(t => t.type.name)
        pokemon.height = dataJson.height
        pokemon.weight = dataJson.weight
    }

    wildPokemon.value = pokemonData

    console.log(wildPokemon)
}

const wildPokemon2 = computed(() => {
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
    <div class="pokemon-grid">
        <Card  v-for="pokemon in wildPokemon" :key="pokemon.name" class="w-full">
            <template #title>{{ pokemon.name }}</template>
            <template #header>
                <div class="sprite-container">
                    <img class="pokemon-sprite" :src="pokemon.sprite" :alt="pokemon.name"/>
                </div>
                
            </template>
            
        </Card>
    </div>
</template>

<style scoped>
.pokemon-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

:deep(.p-card-body),
:deep(.p-card-caption) {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.sprite-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding-top: 1rem;
}

.pokemon-sprite {
  width: 96px;
  height: 96px;
  image-rendering: pixelated;
}

.pokemon-title {
  text-transform: capitalize;
}


@media (max-width: 768px) {
  .pokemon-grid {
    grid-template-columns: 1fr;
  }
}
</style>