<script setup>
import { watch, ref, onUnmounted} from "vue"
import { computed } from "vue"
import Select from "primevue/select"
import Card from "primevue/card"
import Modal from "@/components/Modal.vue"
import { usePokemonStore } from "@/stores/pokemonStore"
import { useSettingsStore } from "@/stores/settingsStore"
import { useInventoryStore } from "@/stores/inventoryStore"
import 'primeicons/primeicons.css';
import { getSpecies } from "@/api/pokeapi"
import PokemonBattle from "@/components/PokemonBattle.vue"
import { getPokemonData } from "@/assets/helpers/pokemonHelper"
import { getPokemonWithLevelData } from "@/assets/helpers/pokemonHelper"
import { useErrorStore } from "@/stores/errorStore"

const errorStore = useErrorStore()

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
const gettingWildPokemon = ref(false)

const isCatchModalOpen = ref(false)

const selectedPokemon = ref(null)
const selectedIndex = ref(null)

const catchMessage = ref("")
const showFeedback = ref(false)
const isFinished = ref(false)

const isBattleModalOpen = ref(false)
const battleStarted = ref(false)
const battleLog = ref([])
const showDefeat = ref(false)
const battleWin = ref(false)

const openCatchModal = (pokemon, index) => {
  if (!pokemon) {
    errorStore.SetErrorDetails("Selection Issue", `Unable to find the selected pokemon, try again.`)
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
  battleWin.value = false
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function closeDefeatModal() {
  showDefeat.value = false
  closeCatchModal()
}

function onBattleEnd({ outcome, opponent }) {
  // outcome: 'won' | 'lost' | 'caught' | 'fled' | 'closed'
  isBattleModalOpen.value = false
  wildPokemon.value.splice(selectedIndex.value, 1)
}

function CatchStarter() {
  console.log("catching starter")
  if (!selectedPokemon.value || selectedIndex.value === null) {
    errorStore.SetErrorDetails("Collection Issue", `Unable to catch pokemon due to an issue collecting pokemon data.`)
    return
  }

  pokemonStore.addPokemon(selectedPokemon.value)
  wildPokemon.value.splice(selectedIndex.value, 1)
  selectedIndex.value = null
  catchMessage.value = `Starter pokemon ${selectedPokemon.value.name} has been chosen.`
  showFeedback.value = true
  isFinished.value = true
}

async function CatchPokemon() {
  console.log(selectedPokemon.value)
  console.log("Attempting catch!")
  if (!selectedPokemon.value || selectedIndex.value === null) {
    errorStore.SetErrorDetails("Collection Issue", `Unable to catch pokemon due to an issue collecting pokemon data.`)
    return
  }
  if (pokemonStore.caughtPokemon.length === 0) {
    CatchStarter()
    return
  }
  try {
    if (inventoryStore.UsePokeball(selectedPokeball.value.id)) {
      // Roll chances for capturing or fleeing
      let captureRoll = Math.floor(Math.random() * 101);
      let damageBonus = 0
      if (battleStarted) {
        console.log(hpPercent(selectedPokemon.value))
        damageBonus = hpPercent(selectedPokemon.value) < 20 ? 20 : hpPercent(selectedPokemon.value) < 50 ? 10 : 0
      }
      const rawRate = captureRoll - selectedPokeball.value.catchPower - damageBonus
      let effectiveCaptureRate = Math.min(100, Math.max(0, rawRate))

      console.log(`Capture roll: ${captureRoll} Damage Modifier: -${damageBonus} Effective Roll: ${effectiveCaptureRate} Capture Chance: ${selectedPokemon.value.captureRate}`)
      battleLog.value.push(`You threw a ${selectedPokeball.value.id} at ${selectedPokemon.value.name}...`)

      // Capture roll chance hits, pokemon is set and relavent data is set
      if (effectiveCaptureRate <= selectedPokemon.value.captureRate) {
        await delay(800)
        battleLog.value.push(`Congradulations, you caught ${selectedPokemon.value.name}`)
        pokemonStore.addPokemon(selectedPokemon.value)
        console.log(`${Math.trunc(3000 / selectedPokemon.value.captureRate)} has been added to your balance`)
        inventoryStore.AddFunds(Math.trunc(3000 / selectedPokemon.value.captureRate))
        catchMessage.value = `Gotcha! ${selectedPokemon.value.name} was caught!`
        showFeedback.value = true
        isFinished.value = true
        battleWin.value = true
        await delay(800)
        endBattle()
      }
      // If a roll chance fails the pokemon has the chance to flee
      else {
        if (checkPokemonFlees()) {
          await delay(800)
          battleLog.value.push(`${selectedPokemon.value.name} fled`)
          catchMessage.value = `Oh no! ${selectedPokemon.value.name} fled!`
          showFeedback.value = true
          isFinished.value = true
          battleWin.value = false
          await delay(800)
          endBattle()
        }
        else {
          // if a catch fails and the pokemon doesnt flee, simply show a message and dont alter state.
          // catchMessage.value = `Aww! ${selectedPokemon.value.name} broke free!`
          showFeedback.value = true
        }
      }
    }
    else {
      catchMessage.value = `You don't have any ${selectedPokeball.value.id}, switching to default Pokeball.`
      showFeedback.value = true
    }
  }
  catch (err) {
    errorStore.SetErrorDetails("Collection Issue", `Unable to catch pokemon due to the following issue. ${err}`)
    console.error(`An error occured catching pokemon. ${err}`)
  }

}

function battlePokemon() {
  isBattleModalOpen.value = true
  isCatchModalOpen.value = false
}

// Audio Management Section
function PlayCry(cry_url) {
  // IF the cry URL is exists we will lowered volume on background music, play the cry, and return the background volume to normal
  if (!cry_url || settingsStore.muteAudio) return

  if (bgmTrack && !settingsStore.muteAudio) {
    bgmTrack.volume = 0.3
  }
  let cry = new Audio(cry_url)
  cry.loop = false
  cry.currentTime = 0;
  cry.play()
    .catch((err) => {
      errorStore.SetErrorDetails("Audio Issue", `Unable to play pokemon cry at this time.`)
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
    errorStore.SetErrorDetails("Audio Issue", `Unable to play battle music at this time.`)
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
    if (bgmTrack) {
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

    const timer = setTimeout(() => {
      gettingWildPokemon.value = true;
    }, 200);
    await getWildPokemonData(region);
    clearTimeout(timer);
    gettingWildPokemon.value = false

  } catch (err) {
    errorStore.SetErrorDetails("Collection Issue", `Unable to find region data for ${region}. ${err}`)
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
      errorStore.SetErrorDetails("Collection Issue", `An error occured finding starter data for ${region}.`)
      console.error(`Unable to collect starter pokemon for ${region}`);
      return;
    }

    // Collect pokemon data for the starters and set the wildPokemon value to the returned list
    const starterPromises = starterIDs.map(async (pokemonID) => {
      try {
        const data = await fetch("https://pokeapi.co/api/v2/pokemon/" + pokemonID);
        let speciesData = await getSpecies(pokemonID)
        if (!data.ok || !speciesData) {
          errorStore.SetErrorDetails("Collection Issue", `An error occured finding data for starter pokemon ${pokemonID}.`)
          console.error(`An error occurred collecting json data for starter ${pokemonID}`);
          return null;
        }

        const dataJson = await data.json();
        return await getPokemonWithLevelData(dataJson.name, selectedRegion.value, 5)
      } catch (err) {
        errorStore.SetErrorDetails("Collection Issue", `An error occured finding data for starter pokemon ${pokemonID}.`)
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
    errorStore.SetErrorDetails("Collection Issue", `An error occured finding the pokemon list.`)
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

    const pokemonIdentifier = target.name;
    // const pokemonIdentifier = "ditto"
    return await getPokemonData(pokemonIdentifier, selectedRegion)
  });

  const wildResults = await Promise.all(wildPromises);
  console.log(wildResults)
  wildPokemon.value = wildResults.filter(Boolean);
}

</script>

<template>
  <Select v-model="selectedRegion" :options="regions" placeholder="Select a region" />
  <div v-if="gettingWildPokemon" class="searching">
    <div class="grass">
      <span class="blade" v-for="n in 5" :key="n" />
    </div>
    <p class="searching-text">Searching for Pokémon…</p>
  </div>
  <div class="pokemon-grid">
    <Card v-for="(pokemon, index) in wildPokemon" :key="index" class="w-full pokemonCard"
      @click="openCatchModal(pokemon, index)">

      <template #title>{{ pokemon.name }} (Level {{ pokemon.level }})</template>
      <template #header>
        <div class="sprite-container">
          <span class="favPokemon" v-if="pokemonStore.pokemonIsInWishList(pokemon.name)">&#9734;</span>
          <img v-if="pokemon.shiny" class="pokemon-sprite" :src="pokemon.shinySprite" :alt="pokemon.name" />
          <img v-else class="pokemon-sprite" :src="pokemon.sprite" :alt="pokemon.name" />
        </div>

      </template>

    </Card>
  </div>

  <Modal v-if="isCatchModalOpen" @close="closeCatchModal">
    <div v-if="selectedPokemon" class="catchModal">
      <h2>{{ selectedPokemon.name }}</h2>
      <img v-if="selectedPokemon.shiny" class="pokemon-sprite" :src="selectedPokemon.shinySprite" :alt="selectedPokemon.name" />
      <img v-else class="pokemon-sprite" :src="selectedPokemon.sprite" :alt="selectedPokemon.name" />

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
      <button v-else-if="pokemonStore.caughtPokemon.length === 0" @click="CatchPokemon()">
        Catch
      </button>
      <button v-else @click="battlePokemon()">
        Battle Pokemon
      </button>
    </div>
  </Modal>

  <PokemonBattle v-if="isBattleModalOpen" :opponent="selectedPokemon" :isWild="true" @end="onBattleEnd"
    @close="selectedPokemon = null" />

  <Modal v-if="showDefeat" @close="closeDefeatModal()">
    <div class="catchModal">
      <p v-if="battleWin" class="feedback-text">Congratulations you won!</p>
      <p v-else class="feedback-text">You lost, better luck next time.</p>
      <p v-if="catchMessage" class="feedback-text">{{ catchMessage }}</p>
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


/* Styles for battle modal */
.battle-split {
  height: 28rem;
  width: 100%;
  max-width: 40rem;
  margin-inline: auto;
  border: 1px solid var(--p-content-border-color);
  border-radius: var(--p-content-border-radius);
  overflow: hidden;
}

/* ---- setup ---- */
.battle-stage {
  display: flex;
}

.setup {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  margin: auto;
  padding: 1.5rem;
  width: 100%;
  max-width: 16rem;
}

.setup-title {
  margin: 0;
  font-size: 0.6875rem;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--p-text-muted-color);
  text-align: center;
}

.setup-select {
  width: 100%;
}

.option-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.option-sprite {
  width: 1.5rem;
  height: 1.5rem;
  object-fit: contain;
}

.option-name {
  text-transform: capitalize;
}

.placeholder {
  color: var(--p-text-muted-color);
}

/* ---- arena ---- */
.arena {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
  height: 100%;
  padding: 1rem;
  overflow-y: auto;
}

.combatant {
  display: flex;
  align-items: center;
  gap: 1rem;
}

/* opponent: info left, sprite right */
.combatant-foe {
  flex-direction: row;
  justify-content: space-between;
}

/* player: sprite left, info right — the diagonal */
.combatant-ally {
  flex-direction: row-reverse;
  justify-content: space-between;
}

.combatant-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.battle-sprite {
  flex: none;
  object-fit: contain;
  image-rendering: pixelated;
  filter: drop-shadow(0 3px 2px rgb(0 0 0 / 0.25));
}

.sprite-foe {
  width: 4.5rem;
  height: 4.5rem;
}

.sprite-ally {
  width: 5.5rem;
  height: 5.5rem;
}

.combatant-head {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}

.label {
  font-size: 0.625rem;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--p-text-muted-color);
}

.combatant-name {
  font-weight: 600;
  text-transform: capitalize;
}

.hp {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.hp-track {
  flex: 1;
  height: 8px;
  border-radius: 4px;
  background: var(--p-surface-200);
  overflow: hidden;
}

.hp-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.45s ease-out, background-color 0.3s;
}

.hp-fill.ok {
  background: #22c55e;
}

.hp-fill.warn {
  background: #eab308;
}

.hp-fill.crit {
  background: #ef4444;
}

.hp-text {
  flex: none;
  min-width: 4.5rem;
  text-align: right;
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  color: var(--p-text-muted-color);
}

/* ---- moves ---- */
.moves {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  /* margin-top: auto; */
}

.move {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: var(--p-content-border-radius);
  background: var(--p-content-background);
  font: inherit;
  font-size: 0.8125rem;
  cursor: pointer;
  transition: background-color 0.15s, border-color 0.15s;
}

.move:hover:not(:disabled) {
  background: var(--p-content-hover-background);
  border-color: var(--p-primary-color);
}

.move:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.move-name {
  text-transform: capitalize;
}

.move-power {
  font-variant-numeric: tabular-nums;
  color: var(--p-text-muted-color);
}

/* ---- log ---- */
.log-panel {
  display: flex;
  flex-direction: column;
  border-inline-start: 1px solid var(--p-content-border-color);
}

.log-head {
  flex: none;
  padding: 0.625rem 0.875rem;
  border-bottom: 1px solid var(--p-content-border-color);
  font-size: 0.625rem;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--p-text-muted-color);
}

.log-body {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem 0.875rem;
}

.log-line {
  margin: 0 0 0.5rem;
  font-size: 0.75rem;
  line-height: 1.45;
}

@media (prefers-color-scheme: dark) {
  .hp-track {
    background: var(--p-surface-700);
  }
}

/* attacker lunges toward the opponent */
.anim-lunge {
  animation: lunge 300ms ease-in-out;
}

.sprite-foe.anim-lunge {
  animation-name: lunge-foe;
}

@keyframes lunge {
  50% {
    transform: translate(20px, -20px);
  }
}

@keyframes lunge-foe {
  50% {
    transform: translate(-20px, 20px);
  }
}

/* defender flashes and shakes */
.anim-hit {
  animation: hit 400ms steps(2, end) 3;
}

@keyframes hit {

  0%,
  100% {
    opacity: 1;
    transform: translateX(0);
  }

  50% {
    opacity: 0.2;
    transform: translateX(-6px);
  }
}

/* faint: slide down and fade */
.anim-faint {
  animation: faint 700ms ease-in forwards;
}

@keyframes faint {
  to {
    transform: translateY(40px);
    opacity: 0;
  }
}

.searching {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  min-height: 12rem;
  padding: 2rem;
}

.grass {
  display: flex;
  align-items: flex-end;
  gap: 0.25rem;
  height: 2.5rem;
}

.blade {
  width: 0.5rem;
  height: 2rem;
  border-radius: 0.25rem 0.25rem 0 0;
  background: #4ea832;
  transform-origin: bottom center;
  animation: rustle 0.9s ease-in-out infinite;
}

.blade:nth-child(2) {
  animation-delay: 0.1s;
  height: 2.4rem;
}

.blade:nth-child(3) {
  animation-delay: 0.2s;
  height: 1.8rem;
}

.blade:nth-child(4) {
  animation-delay: 0.3s;
  height: 2.2rem;
}

.blade:nth-child(5) {
  animation-delay: 0.4s;
  height: 1.6rem;
}

@keyframes rustle {

  0%,
  100% {
    transform: rotate(-8deg);
  }

  50% {
    transform: rotate(8deg);
  }
}

.searching-text {
  margin: 0;
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}

.searching-text::after {
  content: '';
  animation: dots 1.2s steps(4, end) infinite;
}

@keyframes dots {
  0% {
    content: '';
  }

  25% {
    content: '.';
  }

  50% {
    content: '..';
  }

  75% {
    content: '...';
  }
}

@media (prefers-reduced-motion: reduce) {
  .blade {
    animation: none;
  }

  .searching-text::after {
    animation: none;
    content: '...';
  }
}
</style>