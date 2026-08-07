<script setup>
import {watch, ref, onUnmounted} from "vue"
import Select from "primevue/select"
import Card from "primevue/card"
import Modal from "@/components/Modal.vue"

const regionMusic = {
  kanto: "https://play.pokemonshowdown.com/audio/hgss-kanto-trainer.mp3",
  johto: "https://play.pokemonshowdown.com/audio/hgss-johto-trainer.mp3",
  hoenn: "https://play.pokemonshowdown.com/audio/oras-trainer.mp3",
  sinnoh: "https://play.pokemonshowdown.com/audio/dpp-trainer.mp3",
  unova: "https://play.pokemonshowdown.com/audio/bw-trainer.mp3",
  kalos: "https://play.pokemonshowdown.com/audio/xy-trainer.mp3",
  alola: "https://play.pokemonshowdown.com/audio/sm-trainer.mp3",
  galar: "https://play.pokemonshowdown.com/audio/sm-trainer.mp3",
  paldea: "https://play.pokemonshowdown.com/audio/sm-trainer.mp3"
}

const regions = ref([
    "kanto",
    "johto",
    "hoenn",
    "sinnoh",
    "unova",
    "kalos",
    "alola",
    "galar",
    "paldea"
])

let bgmTrack = null

const selectedRegion = ref("")

const pokemonList = ref([])

const wildPokemon = ref([])

const isCatchModalOpen = ref(false)

const selectedPokemon = ref(null)

const openCatchModal = (pokemon) => {
    selectedPokemon.value = pokemon
    isCatchModalOpen.value = true
}

const closeCatchModal = () => {
    selectedPokemon.value = null
    isCatchModalOpen.value = false
}

function PlayRegionAudio(region){
    console.log("Attempting to play music for region: " + region.value)
    if (bgmTrack){
        bgmTrack.pause()
        bgmTrack.currentTime = 0
    }

    const audioUrl = regionMusic[region.value]
    console.log("Using url: " + audioUrl)
    if(!audioUrl) return

    bgmTrack = new Audio(audioUrl)
    bgmTrack.loop = true

    bgmTrack.play()
    .catch((err) => {
        console.warn("autoplay prevented or failed: ", err)
    })
}

// clean up the audio when you leave the page.
onUnmounted(() => {
  if (bgmTrack) {
    bgmTrack.pause()
    bgmTrack = null
  }
})

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

    PlayRegionAudio(selectedRegion)
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

</script>

<template>
    <Select v-model="selectedRegion" :options="regions" placeholder="Select a region"/>
    <div class="pokemon-grid">
        <Card  v-for="pokemon in wildPokemon" :key="pokemon.name" class="w-full pokemonCard" @click="openCatchModal(pokemon)">
            <template #title>{{ pokemon.name }}</template>
            <template #header>
                <div class="sprite-container">
                    <img class="pokemon-sprite" :src="pokemon.sprite" :alt="pokemon.name"/>
                </div>
                
            </template>
            
        </Card>
    </div>

    <Modal v-if="isCatchModalOpen" @close="closeCatchModal">
        <div v-if="selectedPokemon" class="catchModal">
            <h2>{{ selectedPokemon.name }}</h2>
            <img :src="selectedPokemon.sprite" :alt="selectedPokemon.name">
            <h3>Types:</h3>
            <div v-for="type of selectedPokemon.types" :key="type">
                <p>{{ type }} </p>
            </div>
            <p>Weight: {{ selectedPokemon.weight }}</p>
            <p>Height: {{ selectedPokemon.height }}</p>

            <button>Catch Pokemon</button>
        </div>
    </Modal>
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

.catchModal{
    background-color: Canvas;
    color: CanvasText;
    width:450px;
    padding:24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
}

.catchModal Button{
    background-color: red;
    width: 50%;
    border-radius: 5px;
    border: 2px solid darkred;
    font-size: medium;
    cursor: pointer;
}
.catchModal Button:hover {
    background-color: blue;
    border:2px solid darkblue;
}

.pokemonCard:hover {
    cursor: pointer;
    background-color: Canvas;
}


@media (max-width: 768px) {
  .pokemon-grid {
    grid-template-columns: 1fr;
  }
}
</style>