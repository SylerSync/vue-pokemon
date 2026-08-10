<script setup>
import { watch, ref, onUnmounted } from "vue"
import Select from "primevue/select"
import Card from "primevue/card"
import Modal from "@/components/Modal.vue"
import { usePokemonStore } from "@/stores/pokemonStore"

const pokemonStore = usePokemonStore()

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
    if (!pokemon) {
        console.warn("Unable to open the modal, failed to find selected Pokemon.")
        return
    }
    selectedPokemon.value = pokemon
    isCatchModalOpen.value = true
    PlayCry(pokemon.cry)
}

const closeCatchModal = () => {
    selectedPokemon.value = null
    isCatchModalOpen.value = false
}

function CatchPokemon(pokemon) {
    if (!pokemon) {
        console.warn("Unable to catch pokemon, pokemon data was not found")
        return
    }
    try {
        pokemonStore.addPokemon(pokemon)
        wildPokemon.value = wildPokemon.value.filter(p => p.name !== pokemon.name)
    }
    catch (err) {
        console.error("Unable to catch pokemon", err)
    }
    finally {
        closeCatchModal()
    }

}

function PlayCry(cry_url) {
    console.log("Playing cry using URL: " + cry_url)
    if (!cry_url) return

    if (bgmTrack) {
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
        bgmTrack.currentTime = 0
        bgmTrack = null
    }
})

watch(selectedRegion, async (region) => {
  if (!region || region === "Select a region") return;

  pokemonList.value = [];
  wildPokemon.value = [];
  PlayRegionAudio(selectedRegion);

  try {
    const response = await fetch("https://pokeapi.co/api/v2/region/" + region);
    if (!response.ok) return;

    const regionDataDex = (await response.json()).pokedexes;
    if (!regionDataDex || regionDataDex.length === 0) return;

    const dexPromises = regionDataDex.map(p => 
      fetch(p.url).then(res => res.ok ? res.json() : null)
    );
    const dexResults = await Promise.all(dexPromises);

    const seenPokemon = new Set();
    const regionPokemon = [];

    for (const pokeData of dexResults) {
      if (!pokeData) continue;

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
  const list = pokemonList.value;

  if (pokemonStore.caughtPokemon.length === 0) {
    const starterIDs = pokemonStore.getStartersByRegion(region);

    if (!starterIDs || starterIDs.length === 0) {
      console.error(`Unable to collect starter pokemon for ${region}`);
      return;
    }

    const starterPromises = starterIDs.map(async (pokemonID) => {
      const randInt = Math.floor(Math.random() * 101);
      try {
        const data = await fetch("https://pokeapi.co/api/v2/pokemon/" + pokemonID);

        if (!data.ok) {
          console.error(`An error occurred collecting json data for starter ${pokemonID}`);
          return null; // Return null on HTTP error
        }

        const dataJson = await data.json();

        return {
          name: dataJson.name,
          id: dataJson.id,
          sprite: 10 < randInt && randInt < 15 ? dataJson.sprites.front_shiny : dataJson.sprites.front_default,
          types: dataJson.types.map(t => t.type.name),
          height: dataJson.height,
          weight: dataJson.weight,
          cry: dataJson.cries?.latest ? dataJson.cries.latest : (dataJson.cries?.legacy || "")
        };
      } catch (err) {
        console.error(`An error occurred loading data for starter: ${pokemonID}`, err);
        return null; // Return null on network error
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

  const randomTargets = [];
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * list.length);
    randomTargets.push(list[randomIndex]);
  }

  const wildPromises = randomTargets.map(async (target) => {
    const randInt = Math.floor(Math.random() * 101);
    try {
      const data = await fetch("https://pokeapi.co/api/v2/pokemon/" + target.name);

      if (!data.ok) {
        console.error(`An error occurred collecting pokemon data for ${target.name}`);
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
        cry: dataJson.cries?.latest ? dataJson.cries.latest : (dataJson.cries?.legacy || "")
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
        <Card v-for="pokemon in wildPokemon" :key="pokemon.name" class="w-full pokemonCard"
            @click="openCatchModal(pokemon)">

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

            <button @click="CatchPokemon(selectedPokemon)">Catch Pokemon</button>
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