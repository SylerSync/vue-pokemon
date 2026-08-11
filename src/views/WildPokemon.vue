<script setup>
import { watch, ref, onUnmounted } from "vue"
import {computed} from "vue"
import Select from "primevue/select"
import Card from "primevue/card"
import Modal from "@/components/Modal.vue"
import { usePokemonStore } from "@/stores/pokemonStore"
import { useSettingsStore } from "@/stores/settingsStore"
import { useInventoryStore } from "@/stores/inventoryStore"

const settingsStore = useSettingsStore()

const pokemonStore = usePokemonStore()

const inventoryStore = useInventoryStore()

const selectedPokeball = computed(() => {
    return inventoryStore.SelectedPokeballData(inventoryStore.selectedPokeball)
})

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
const selectedIndex = ref(null)

const catchMessage = ref("")
const showFeedback = ref(false)
const isFinished = ref(false)

const openCatchModal = (pokemon, index) => {
    if (!pokemon) {
        console.warn("Unable to open the modal, failed to find selected Pokemon.")
        return
    }
    selectedPokemon.value = pokemon
    selectedIndex.value = index
    isCatchModalOpen.value = true
    PlayCry(pokemon.cry)
}

const closeCatchModal = () => {
    selectedPokemon.value = null
    isCatchModalOpen.value = false
    catchMessage.value = ""
    showFeedback.value = false
    isFinished.value = false
}

function CatchStarter(){
    console.log("catching starter")
    if (!selectedPokemon.value || selectedIndex.value === null) {
        console.warn("Unable to catch pokemon, pokemon data was not found")
        return
    }

    pokemonStore.addPokemon(selectedPokemon.value)
    wildPokemon.value.splice(selectedIndex.value, 1)
    selectedIndex.value = null
    catchMessage.value = `Starter pokemon ${selectedPokemon.value.name} has been chosen.`
    showFeedback.value = true
    isFinished.value = true
}


function CatchPokemon() {
    console.log("Attempting catch!")
    if (!selectedPokemon.value || selectedIndex.value === null) {
        console.warn("Unable to catch pokemon, pokemon data was not found")
        return
    }
    if(pokemonStore.caughtPokemon.length === 0){
        CatchStarter()
        return
    }
    try {
        if(inventoryStore.UsePokeball(selectedPokeball.value.id)){
            // Roll chances for capturing or fleeing
            let captureRoll = Math.floor(Math.random() * 101);
            const fleeChance = Math.min(30, 100 - selectedPokemon.value.captureRate);
            const fleeRoll = Math.floor(Math.random() * 101);

            const rawRate = captureRoll - selectedPokeball.value.catchPower
            let effectiveCaptureRate = Math.min(100, Math.max(0, rawRate))

            console.log(`Capture roll: ${captureRoll} Effective Roll: ${effectiveCaptureRate} Capture Chance: ${selectedPokemon.value.captureRate}`)
        
        // Capture roll chance hits, pokemon is set and relavent data is set
            if(effectiveCaptureRate <= selectedPokemon.value.captureRate){
                pokemonStore.addPokemon(selectedPokemon.value)
                wildPokemon.value.splice(selectedIndex.value, 1)
                selectedIndex.value = null
                console.log(`${Math.trunc(3000/selectedPokemon.value.captureRate)} has been added to your balance`)
                inventoryStore.AddFunds(Math.trunc(3000/selectedPokemon.value.captureRate))
                catchMessage.value = `Gotcha! ${selectedPokemon.value.name} was caught!`
                showFeedback.value = true
                isFinished.value = true
            }
            // If a roll chance fails the pokemon has the chance to flee
            else{
                if(fleeRoll <= fleeChance){
                    wildPokemon.value.splice(selectedIndex.value, 1)
                    catchMessage.value = `Oh no! ${selectedPokemon.value.name} fled!`
                    selectedIndex.value = null
                    showFeedback.value = true
                    isFinished.value = true
                }
                else{
                    // if a catch fails and the pokemon doesnt flee, simply show a message and dont alter state.
                    catchMessage.value = `Aww! ${selectedPokemon.value.name} broke free!`
                    showFeedback.value = true
                }
            }
        }
        else{
            catchMessage.value = `You don't have any ${selectedPokeball.value.id}, switching to default Pokeball.`
            showFeedback.value = true
        }
    }
    catch (err) {
        console.error("Unable to catch pokemon", err)
    }

}

// Audio Management Section
function PlayCry(cry_url) {
    // IF the cry URL is exists we will lowered volume on background music, play the cry, and return the background volume to normal
    console.log("Playing cry using URL: " + cry_url)
    if (!cry_url || settingsStore.muteAudio) return

    if (bgmTrack && !settingsStore.muteAudio) {
        bgmTrack.volume = 0.3
    }
    let cry = new Audio(cry_url)
    cry.loop = false
    cry.currentTime = 0;
    cry.play()
        .catch((err) => {
            console.warn("Could not play audio at url: " + cry_url, err)
            if (bgmTrack) {
                bgmTrack.volume = 1.0
            }
        })
    cry.onended = () => {
        if (bgmTrack) {
            bgmTrack.volume = 1.0
        }
    }
}

function PlayRegionAudio(region) {
    // Every region has different battle music, so depending on region you will get different audio
    if (bgmTrack) {
        bgmTrack.pause()
        bgmTrack.currentTime = 0
    }

    const audioUrl = regionMusic[region.value]
    console.log("Using url: " + audioUrl)
    if (!audioUrl) {
        console.warn("Failed to grab audio URL for region: " + region.value)
        bgmTrack = null
        return
    }

    // bgmTrack will be allowed to loop so you will have background audio the whole time the app is open
    bgmTrack = new Audio(audioUrl)
    bgmTrack.loop = true

    bgmTrack.muted = Boolean(settingsStore.muteAudio);

    bgmTrack.play()
        .catch((err) => {
            console.warn("autoplay prevented or failed: ", err)
        })
}

watch(
    // Keep watch on the mute toggle value and modify bgmTrack accordingly
    () => settingsStore.muteAudio,
    (isMuted) => {
        console.log("Mute toggle change detected.")
        if(bgmTrack){
            bgmTrack.muted = isMuted;
        }
    }
);

onUnmounted(() => {
    // clean up the audio when you leave the page.
    if (bgmTrack) {
        bgmTrack.pause()
        bgmTrack.currentTime = 0
        bgmTrack = null
    }
})

watch(selectedRegion, async (region) => {
    // Watch for changed on the selected region, if the region chances repopulate the wild pokemon
  if (!region || region === "Select a region") return;

  pokemonList.value = [];
  wildPokemon.value = [];
  PlayRegionAudio(selectedRegion);

  try {
    // Collect the available dexes for the selected region
    const response = await fetch("https://pokeapi.co/api/v2/region/" + region);
    if (!response.ok) return;

    // A region can have more than one dex for special events, special pokemon, etc so we collect them all
    const regionDataDex = (await response.json()).pokedexes;
    if (!regionDataDex || regionDataDex.length === 0) return;

    const dexPromises = regionDataDex.map(p => 
      fetch(p.url).then(res => res.ok ? res.json() : null)
    );
    // collect all the dexes in a Promise all to collect the dex data in parallel
    const dexResults = await Promise.all(dexPromises);

    const seenPokemon = new Set();
    const regionPokemon = [];

    // Run a loop looking over all the available dexes
    for (const pokeData of dexResults) {
      if (!pokeData) continue;
        // for each dex we will loop through all the available pokemon, seenPokemon Set will be used to tell if the pokemon is
        // and overlap or a new one that needs added to the regionPokemon
      for (const entry of pokeData.pokemon_entries) {
        const speciesName = entry.pokemon_species.name;
        
        if (!seenPokemon.has(speciesName)) {
          seenPokemon.add(speciesName);
          regionPokemon.push({
            name: speciesName,
            url: entry.pokemon_species.url
          });
        }
      }
    }

    pokemonList.value = regionPokemon;
    await getWildPokemonData(region);

  } catch (err) {
    console.warn("An error occurred loading region data for: " + region, err);
  }
});

async function getWildPokemonData(region) {
    // This function will use the list of pokemon generated by the watcher in order to choose 6 random pokemon to display
  const list = pokemonList.value;

  // If the user hasnt caught any pokemon yet, they need a starter. so we will use regional starters instead of random pokemon.
  if (pokemonStore.caughtPokemon.length === 0) {
    // Starters are saved by region in the dataStore for use here
    const starterIDs = pokemonStore.getStartersByRegion(region);

    if (!starterIDs || starterIDs.length === 0) {
      console.error(`Unable to collect starter pokemon for ${region}`);
      return;
    }

    // Collect pokemon data for the starters and set the wildPokemon value to the returned list
    const starterPromises = starterIDs.map(async (pokemonID) => {
      const randInt = Math.floor(Math.random() * 101);
      try {
        const data = await fetch("https://pokeapi.co/api/v2/pokemon/" + pokemonID);

        if (!data.ok) {
          console.error(`An error occurred collecting json data for starter ${pokemonID}`);
          return null; 
        }

        const dataJson = await data.json();

        return {
          name: dataJson.name,
          id: dataJson.id,
          sprite: 10 < randInt && randInt < 15 ? dataJson.sprites.front_shiny : dataJson.sprites.front_default,
          types: dataJson.types.map(t => t.type.name),
          height: dataJson.height,
          weight: dataJson.weight,
          cry: dataJson.cries?.latest ? dataJson.cries.latest : (dataJson.cries?.legacy || ""),
          //Since these are starters the capture rate is manually set to 100% so you cant fail to aquire a starter.
          captureRate: 100
        };
      } catch (err) {
        console.error(`An error occurred loading data for starter: ${pokemonID}`, err);
        return null;
      }
    });

    const starterResults = await Promise.all(starterPromises);
    wildPokemon.value = starterResults.filter(Boolean);
    return;
  }

  if (!list || list.length === 0) {
    wildPokemon.value = [];
    console.error("An error occurred finding the provided pokemon list.");
    return;
  }

  // Generate 6 random index values based on the length of the list of pokemon
  const randomTargets = [];
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * list.length);
    randomTargets.push(list[randomIndex]);
  }

  const wildPromises = randomTargets.map(async (target) => {
    const randInt = Math.floor(Math.random() * 101);
    

    const pokemonIdentifier = target.name || target.id;
    // Both pokemon and pokemon-species calls are required for all the data we need for an individual pokemon
    try {
      const [pokemonRes, speciesRes] = await Promise.all([
        fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonIdentifier}`),
        fetch(`https://pokeapi.co/api/v2/pokemon-species/${pokemonIdentifier}`)
      ]);

      if (!pokemonRes.ok) {
        console.error(`An error occurred collecting pokemon data for ${target.name}`);
        return null;
      }
      if (!speciesRes.ok) {
        console.error(`An error occurred collecting species data for ${target.name}`);
        return null;
      }

      const pokemonData = await pokemonRes.json();
      const speciesData = await speciesRes.json();

      //Create the pokemon data with parts from both the API calls
      return {
        name: pokemonData.name,
        id: pokemonData.id,
        sprite: 10 < randInt && randInt < 15 ? pokemonData.sprites.front_shiny : pokemonData.sprites.front_default,
        types: pokemonData.types.map(t => t.type.name),
        height: pokemonData.height,
        weight: pokemonData.weight,
        cry: pokemonData.cries?.latest ? pokemonData.cries.latest : (pokemonData.cries?.legacy || ""),
        // Pokemon uses a scale of 0-255 for capture rate. this is being converted to a percentage of 100
        captureRate: Math.round((speciesData.capture_rate / 255) * 100) 
      };
    } catch (err) {
      console.error(`An error occurred collecting data for ${target.name}`, err);
      return null;
    }
  });

  const wildResults = await Promise.all(wildPromises);
  wildPokemon.value = wildResults.filter(Boolean);
}



</script>

<template>
    <Select v-model="selectedRegion" :options="regions" placeholder="Select a region" />
    <div class="pokemon-grid">
        <Card v-for="(pokemon, index) in wildPokemon" :key="index" class="w-full pokemonCard"
            @click="openCatchModal(pokemon, index)">

            <template #title>{{ pokemon.name }}</template>
            <template #header>
                <div class="sprite-container">
                    <span class="favPokemon" v-if="pokemonStore.pokemonIsInWishList(pokemon.name)">&#9734;</span>
                    <img class="pokemon-sprite" :src="pokemon.sprite" :alt="pokemon.name" />
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
                <p class="typeTag" :style="{ backgroundColor: pokemonStore.typeColors[type] }">
                    {{ type }}
                </p>
            </div>
            <p>Weight: {{ selectedPokemon.weight }}</p>
            <p>Height: {{ selectedPokemon.height }}</p>

            <p v-if="catchMessage" class="feedback-text">{{ catchMessage }}</p>

        <!-- Button toggle logic -->
        <button v-if="isFinished" @click="closeCatchModal">
            Close
        </button>
        <button v-else @click="CatchPokemon()">
            Catch Pokemon
        </button>
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

.catchModal {
    background-color: Canvas;
    color: CanvasText;
    width: 450px;
    padding: 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
}

.catchModal Button {
    background-color: red;
    width: 50%;
    border-radius: 5px;
    border: 2px solid darkred;
    font-size: medium;
    cursor: pointer;
}

.catchModal Button:hover {
    background-color: blue;
    border: 2px solid darkblue;
}

.pokemonCard {
    position: relative;
}

.favPokemon {
    position: absolute;
    top: 10px;
    right: 10px;
    z-index: 10;
}

.pokemonCard:hover {
    cursor: pointer;
    background-color: SelectedItem;
}

.typeTag {
    border-radius: 5px;
    padding: 5px;
    margin: 3px;
    width: 5rem;
    text-align: center;
}


@media (max-width: 768px) {
    .pokemon-grid {
        grid-template-columns: 1fr;
    }
}
</style>