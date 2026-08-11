<script setup>
import { watch, ref, onUnmounted } from "vue"
import {computed} from "vue"
import Select from "primevue/select"
import Card from "primevue/card"
import Modal from "@/components/Modal.vue"
import { usePokemonStore } from "@/stores/pokemonStore"
import { useSettingsStore } from "@/stores/settingsStore"
import { getMove } from "@/api/pokeapi"
import Splitter from 'primevue/splitter';
import SplitterPanel from 'primevue/splitterpanel';
import { useInventoryStore } from "@/stores/inventoryStore"
import SelectButton from 'primevue/selectbutton';
import Badge from 'primevue/badge';
import 'primeicons/primeicons.css';

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

const isBattleModalOpen = ref(false)
const battleStarted = ref(false)
const usersSelectedPokemon = ref(null)
const battleLog = ref([])
const showDefeat = ref(false)

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

const pokeballOptions = computed(() => {
    const standardPokeball = {
        id: "pokeball",
        label: "Pokeball",
        count: '∞'
    };

    const storeBalls = Object.keys(inventoryStore.pokeballs).map((key) => ({
        id: key,
        label: key.charAt(0).toUpperCase() + key.slice(1),
        count: inventoryStore.pokeballs[key].count
    }));

    return [standardPokeball, ...storeBalls];
});

const closeCatchModal = () => {
    selectedPokemon.value = null
    isCatchModalOpen.value = false
    catchMessage.value = ""
    showFeedback.value = false
    isFinished.value = false
}

function closeDefeatModal() {
    showDefeat.value = false
    usersSelectedPokemon.value.currentHp = usersSelectedPokemon.value.totalHp
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
    console.log(selectedPokemon.value)
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

function battlePokemon() {
    isBattleModalOpen.value = true
    isCatchModalOpen.value = false
}

function startBattle() {
    battleStarted.value = true;
}

function endBattle(){
    battleStarted.value = false
    isBattleModalOpen.value = false
    if(usersSelectedPokemon.value.currentHp > 0) {
        usersSelectedPokemon.value.currentHp = usersSelectedPokemon.value.totalHp
        inventoryStore.AddFunds(Math.trunc(3000 - (selectedPokemon.value.captureRate * 10)))
    }
    wildPokemon.value.splice(selectedIndex.value, 1)
    battleLog.value = []
    closeCatchModal()
}

function battleTurn(move) {
    if(battleStarted) {
        let userSpeed = usersSelectedPokemon.value.stats.find(s => s.name == "speed").stat
        let wildSpeed = selectedPokemon.value.stats.find(s => s.name == "speed").stat
        const wildMove = selectedPokemon.value.moves.length
            ? selectedPokemon.value.moves[Math.floor(Math.random() * selectedPokemon.value.moves.length)]
            : null;
        if(userSpeed > wildSpeed) {
            useMove(usersSelectedPokemon.value, selectedPokemon.value, move)
            if (selectedPokemon.value.currentHp <= 0) {
                endBattle()
                return
            }
            useMove(selectedPokemon.value, usersSelectedPokemon.value, move)
            if (usersSelectedPokemon.value.currentHp <= 0) {
                endBattle()
                return
            }
        } else if (wildSpeed > userSpeed) {
            useMove(selectedPokemon.value, usersSelectedPokemon.value, wildMove)
            if (usersSelectedPokemon.value.currentHp <= 0) {
                endBattle()
                return
            }
            useMove(usersSelectedPokemon.value, selectedPokemon.value, move)
            if (selectedPokemon.value.currentHp <= 0) {
                endBattle()
                return
            }
        } else {
            let tieBreaker = Math.floor(Math.random() * 100) + 1
            if(tieBreaker > 50) {
                useMove(usersSelectedPokemon.value, selectedPokemon.value, move)
                if (selectedPokemon.value.currentHp <= 0) {
                    endBattle()
                    return
                }
                useMove(selectedPokemon.value, usersSelectedPokemon.value, move)
                if (usersSelectedPokemon.value.currentHp <= 0) {
                    endBattle()
                    return
                }
            } else {
                useMove(selectedPokemon.value, usersSelectedPokemon.value, wildMove)
                if (usersSelectedPokemon.value.currentHp <= 0) {
                endBattle()
                return
                }
                useMove(usersSelectedPokemon.value, selectedPokemon.value, move)
                if (selectedPokemon.value.currentHp <= 0) {
                    endBattle()
                    return
                }
            }
        }
    }
}

function useMove(user, target, move) {
    battleLog.value.push(`${user.name} used ${move.name}`)
    const randInt = Math.floor(Math.random() * 100) + 1
    if(randInt > move.accuracy) {
        return battleLog.value.push(`${move.name} missed`)
    }
    if(move.power) {
        const results = calculateDamage(user, target, move)
        if(results.critical) {
            battleLog.value.push("Critical Hit!")
        }
        if(results.effectiveness == 2){
            battleLog.value.push("Super Effective")
        } else if (results.effectiveness == .5){
            battleLog.value.push("Not very effective")
        }
        battleLog.value.push(`${user.name} did ${results.damage} damage`)
        target.currentHp -= results.damage
    } else {
        battleLog.value.push("This move does nothing bozo.")
    }

}

function calculateDamage(attacker, defender, move, opts = {}) {
  const {
    critical = Math.random() < 1 / 24,
    randomFactor = (Math.floor(Math.random() * 16) + 85) / 100,
    weatherMod = 1,
    otherMod = 1,
  } = opts;

  if (move.class === 'status' || !move.power) {
    return { damage: 0, effectiveness: 1, critical: false, immune: false };
  }

  const physical = move.class === 'physical';
  const atk = physical ? attacker.stats.find(s => s.name == "attack").stat : attacker.stats.find(s => s.name == "special-attack").stat;
  const def = physical ? defender.stats.find(s => s.name == "defense").stat : defender.stats.find(s => s.name == "special-defense").stat;

  const base =
    Math.floor(
      Math.floor(
        (Math.floor((2 * 1) / 5 + 2) * move.power * atk) / def
      ) / 50
    ) + 2;

  const stab = attacker.types.includes(move.type) ? 1.5 : 1;
  const effectiveness = typeEffectiveness(move.type, defender.types);
  const critMod = critical ? 1.5 : 1;

  if (effectiveness === 0) {
    return { damage: 0, effectiveness: 0, critical: false, immune: true };
  }

  const damage = Math.max(
    1,
    Math.floor(
      base * weatherMod * critMod * randomFactor * stab * effectiveness * otherMod
    )
  );

  return { damage, effectiveness, critical, immune: false };
}

function typeEffectiveness(moveType, defenderTypes) {
  return defenderTypes.reduce(
    (mult, t) => mult * (pokemonStore.typeChart[moveType]?.[t] ?? 1),
    1
  );
}

function hpPercent(p) {
  return Math.max(0, Math.min(100, (p.currentHp / p.totalHp) * 100));
}

function hpTone(p) {
  const pct = hpPercent(p);
  return pct > 50 ? 'ok' : pct > 20 ? 'warn' : 'crit';
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

watch( 
    () => usersSelectedPokemon.value?.currentHp, 
    (hp) => {
        if(typeof hp === 'number' && hp <= 0) {
            showDefeat.value = true;
        }
    }
)

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
        const randomMoves = [];
        try{
            if (dataJson.moves.length > 4){
                for (let i = 0; i < 4; i++) {
                  let randMoveIndex = Math.floor(Math.random() * dataJson.moves.length)
                  const move = await getMove(randMoveIndex)
                //   console.log(move)
                  let moveInfo = {
                      name: move.name,
                      accuracy: move.accuracy,
                      type: move.type.name,
                      class: move.damage_class.name,
                      power: move.power,
                      pp: move.pp,
                      stat_changes: move.stat_changes.map(s => ({stat: s.stat.name, change: s.change}))
                  }
                  randomMoves.push(moveInfo)
                }
            } else {
                for (let move of dataJson.moves) {
                    const moveResp = await fetch(move.move.url)
                    const moveData = await moveResp.json()
                    let moveInfo = {
                      name: moveData.name,
                      accuracy: moveData.accuracy,
                      type: moveData.type.name,
                      class: moveData.damage_class.name,
                      power: moveData.power,
                      pp: moveData.pp,
                      stat_changes: moveData.stat_changes.map(s => ({stat: s.stat.name, change: s.change}))
                  }
                  randomMoves.push(moveInfo)
                }
            }
        } catch(err) {
            console.log(`An error occured getting moves for ${dataJson.name}`)
        }

        const hpCalc = Math.floor(((2 * dataJson.stats.find(s => s.stat.name == "hp")?.base_stat * 1) / 100) + 1 + 10)

        return {
          name: dataJson.name,
          id: dataJson.id,
          sprite: 10 < randInt && randInt < 15 ? dataJson.sprites.front_shiny : dataJson.sprites.front_default,
          types: dataJson.types.map(t => t.type.name),
          height: dataJson.height,
          weight: dataJson.weight,
          cry: dataJson.cries?.latest ? dataJson.cries.latest : (dataJson.cries?.legacy || ""),
          //Since these are starters the capture rate is manually set to 100% so you cant fail to aquire a starter.
          captureRate: 100,
          totalHp: hpCalc,
          currentHp: hpCalc,
          stats: dataJson.stats.map(s => ({name: s.stat.name, stat: s.base_stat})),
          moves: randomMoves
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

      const randomMoves = [];
        try{
            if (pokemonData.moves.length > 4){
                for (let i = 0; i < 4; i++) {
                  let randMoveIndex = Math.floor(Math.random() * pokemonData.moves.length)
                  const move = await getMove(randMoveIndex)
                //   console.log(move)
                  let moveInfo = {
                      name: move.name,
                      accuracy: move.accuracy,
                      type: move.type.name,
                      class: move.damage_class.name,
                      power: move.power,
                      pp: move.pp,
                      stat_changes: move.stat_changes.map(s => ({stat: s.stat.name, change: s.change}))
                  }
                  randomMoves.push(moveInfo)
                }
            } else {
                for (let move of pokemonData.moves) {
                    const moveResp = await fetch(move.move.url)
                    const moveData = await moveResp.json()
                    let moveInfo = {
                      name: moveData.name,
                      accuracy: moveData.accuracy,
                      type: moveData.type.name,
                      class: moveData.damage_class.name,
                      power: moveData.power,
                      pp: moveData.pp,
                      stat_changes: moveData.stat_changes.map(s => ({stat: s.stat.name, change: s.change}))
                  }
                  randomMoves.push(moveInfo)
                }
            }
        } catch(err) {
            console.log(`An error occured getting moves for ${pokemonData.name}`)
        }

        const hpCalc = Math.floor(((2 * pokemonData.stats.find(s => s.stat.name == "hp")?.base_stat * 1) / 100) + 1 + 10)

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
        captureRate: Math.round((speciesData.capture_rate / 255) * 100),
        totalHp: hpCalc,
        currentHp: hpCalc,
        stats: pokemonData.stats.map(s => ({name: s.stat.name, stat: s.base_stat})),
        moves: randomMoves

      };
    } catch (err) {
      console.error(`An error occurred collecting data for ${target.name}`, err);
      return null;
    }
  });

  const wildResults = await Promise.all(wildPromises);
  console.log(wildResults)
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
        <button v-else-if="pokemonStore.caughtPokemon.length === 0" @click="CatchPokemon()">
            Catch
        </button>
        <button v-else @click="battlePokemon()">
            Battle Pokemon
        </button>
        </div>
    </Modal>

    <Modal v-if="isBattleModalOpen" @close="endBattle()">
    <div class="battle">
      <Splitter :sizes="[70, 30]" class="battle-split">
        <SplitterPanel :minSize="45" class="battle-stage">

          <!-- pre-battle -->
          <div v-if="!battleStarted" class="setup">
            <h2 class="setup-title">Choose your fighter</h2>
            <Select
              v-model="usersSelectedPokemon"
              :options="pokemonStore.caughtPokemon"
              optionLabel="name"
              filter
              filterBy="name"
              showClear
              placeholder="Select a Pokémon"
              class="setup-select"
            >
              <template #value="slotProps">
                <div v-if="slotProps.value" class="option-row">
                  <img v-if="slotProps.value.sprite" :src="slotProps.value.sprite" alt="" class="option-sprite" />
                  <span class="option-name">{{ slotProps.value.name }}</span>
                </div>
                <span v-else class="placeholder">{{ slotProps.placeholder }}</span>
              </template>
              <template #option="slotProps">
                <div class="option-row">
                  <img v-if="slotProps.option.sprite" :src="slotProps.option.sprite" alt="" class="option-sprite" />
                  <span class="option-name">{{ slotProps.option.name }}</span>
                </div>
              </template>
            </Select>
            <button
              class="btn btn-primary"
              :disabled="!usersSelectedPokemon"
              @click="startBattle()"
            >
              Start Battle
            </button>
          </div>

          <!-- in battle -->
          <div v-else class="arena">
                <!-- opponent -->
                <div class="combatant">
                  <div class="combatant-head">
                    <span class="label">Wild</span>
                    <span class="combatant-name">{{ selectedPokemon.name }}</span>
                  </div>
                  <div class="hp">
                    <div class="hp-track">
                      <div
                        class="hp-fill"
                        :class="hpTone(selectedPokemon)"
                        :style="{ width: hpPercent(selectedPokemon) + '%' }"
                      />
                    </div>
                    <span class="hp-text">
                      {{ Math.max(0, selectedPokemon.currentHp) }}/{{ selectedPokemon.totalHp }}
                    </span>
                  </div>
                </div>      
                <!-- player -->
                <div class="combatant">
                  <div class="combatant-head">
                    <span class="label">Yours</span>
                    <span class="combatant-name">{{ usersSelectedPokemon.name }}</span>
                  </div>
                  <div class="hp">
                    <div class="hp-track">
                      <div
                        class="hp-fill"
                        :class="hpTone(usersSelectedPokemon)"
                        :style="{ width: hpPercent(usersSelectedPokemon) + '%' }"
                      />
                    </div>
                    <span class="hp-text">
                      {{ Math.max(0, usersSelectedPokemon.currentHp) }}/{{ usersSelectedPokemon.totalHp }}
                    </span>
                  </div>
                </div>      
                <!-- moves -->
                <div class="moves">
                  <button
                    v-for="move in usersSelectedPokemon.moves"
                    :key="move.name"
                    class="move"
                    @click="battleTurn(move)"
                  >
                    <span class="move-name">{{ move.name }}</span>
                    <span class="move-power">{{ move.power ?? '—' }}</span>
                  </button>
                </div>
                <SelectButton
                v-model="inventoryStore.selectedPokeball"
                :options="pokeballOptions"
                optionLabel="label"
                optionValue="id"
                :optionDisabled="(option) => option.count <= 0"
                aria-labelledby="basic"
                >
                    <template #option="slotProps">
                        <div class="pokeball-badge-item">
                            <span class="ball-name">{{ slotProps.option.label }}</span>
                            <Badge
                                :value="slotProps.option.count"
                                :severity="slotProps.option.count > 0 ? 'info' : 'secondary'"
                            />
                        </div>
                    </template>
                </SelectButton>
                <button @click="CatchPokemon()">
                    Catch Pokemon
                </button>
          </div>
        </SplitterPanel>

        <!-- log -->
        <SplitterPanel :minSize="20" class="log-panel">
          <div class="log-head">Log</div>
          <div ref="logEl" class="log-body">
            <p v-for="(entry, i) in battleLog" :key="i" class="log-line">{{ entry }}</p>
          </div>
        </SplitterPanel>
      </Splitter>
    </div>
  </Modal>

  <Modal v-if="showDefeat" @close="closeDefeatModal()">
        <div class="catchModal">
            <p>You lost :(</p>
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
  height: 22rem;
  width: 100%;
  max-width: 40rem;
  margin-inline: auto;
  border: 1px solid var(--p-content-border-color);
  border-radius: var(--p-content-border-radius);
  overflow: hidden;
}

/* ---- setup ---- */
.battle-stage { display: flex; }

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

.setup-select { width: 100%; }

.option-row { display: flex; align-items: center; gap: 0.5rem; }
.option-sprite { width: 1.5rem; height: 1.5rem; object-fit: contain; }
.option-name { text-transform: capitalize; }
.placeholder { color: var(--p-text-muted-color); }

/* ---- arena ---- */
.arena {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  padding: 1.25rem;
}

.combatant {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
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

.hp-fill.ok   { background: #22c55e; }
.hp-fill.warn { background: #eab308; }
.hp-fill.crit { background: #ef4444; }

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
  margin-top: auto;
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

.move:disabled { opacity: 0.5; cursor: not-allowed; }

.move-name { text-transform: capitalize; }

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
  .hp-track { background: var(--p-surface-700); }
}
</style>