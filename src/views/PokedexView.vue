<script setup>
import { ref, onMounted, computed, watchEffect } from 'vue';
import VirtualScroller from 'primevue/virtualscroller';
import Splitter from 'primevue/splitter';
import SplitterPanel from 'primevue/splitterpanel';
import Button from 'primevue/button';
import Card from 'primevue/card';
import InputGroup from 'primevue/inputgroup';
import InputText from 'primevue/inputtext';
import InputGroupAddon from 'primevue/inputgroupaddon';
import Search from '@primeicons/vue/search';
import { Checkbox } from 'primevue';
import Select from 'primevue/select';
import * as PokemonAPI from '@/api/PokemonAPI';
import { getIndex } from '@/api/pokeapi.js';
import { getPokemon } from '@/api/pokeapi.js';
import { getPokemonByGen } from '@/api/pokeapi.js';
import { getSpecies } from '@/api/pokeapi.js';
import Modal from '@/components/Modal.vue';
import { usePokemonStore } from '@/stores/pokemonStore';
import { useAuthStore } from '@/stores/auth';

const selectedPokemon = ref();
const pokemon = ref([]);
const allPokemon = ref([]);
const isLoading = ref(true);
const text1 = ref(null);
const selectedRegion = ref(null);
const showModal = ref(false);
const regions = ref([
  { region: "All", gen: 0 },
  { region: "Kanto", gen: 1 },
  { region: "Johto", gen: 2 },
  { region: "Hoenn", gen: 3 },
  { region: "Sinnoh", gen: 4 },
  { region: "Unova", gen: 5 },
  { region: "Kalos", gen: 6 },
  { region: "Alola", gen: 7 },
  { region: "Galar", gen: 8 },
  { region: "Paldea", gen: 9 }
]);
const pokemonStore = usePokemonStore();
const authStore = useAuthStore();
const showWishListed = ref(false);
const showCaught = ref(false);
const user = ref(localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null);

// let bgmTrack = null;

function toggleModal() {
  showModal.value = !showModal.value;
}

async function addWishList() {
  if (selectedPokemon.value && user.value) {
    await pokemonStore.addWishlistPokemon(selectedPokemon.value);
  }
}

function checkWishList(name) {
  return pokemonStore.pokemonIsInWishList(name);
}

async function selectPokemon(pokemon) {
  isLoading.value = true;
  selectedPokemon.value = pokemonList.value.find(p => p.name === pokemon)
}

onMounted(async () => {
  try {
    allPokemon.value = await PokemonAPI.getIndex()
  } catch (ex) {
    console.log(`Failed to load list, using PokeAPI fallback: ${ex}`)
    const results = await getIndex()
    allPokemon.value = results.results
  }
  try {
    var data = JSON.parse(localStorage.getItem('user') || '')
    pokemonStore.getUserData(data.email)
  }
  catch {
    console.log("An error occured loading user data.")
  }
  pokemon.value = allPokemon.value
});

const pokemonList = computed(() => {
  // Map to a new array rather than mutating pokemon.value objects directly
  let filteredPokemon = pokemon.value.map(pok => ({
    ...pok,
    wishList: checkWishList(pok.name), // Returns true/false boolean!
    caught: pokemonStore.pokemonIsCaught(pok.name)
  }));

  if (showWishListed.value) {
    filteredPokemon = filteredPokemon.filter(p => p.wishList);
  }
  if (showCaught.value) {
    filteredPokemon = filteredPokemon.filter(p => p.caught);
  }
  if (text1.value) {
    const searchTerm = text1.value.toLowerCase();
    filteredPokemon = filteredPokemon.filter(p => p.name.toLowerCase().includes(searchTerm));
  }

  return filteredPokemon;
});

watchEffect(() => {
  //Because region information isn't stored in the pokemon list. When filtered 
  // by region a new api call is run to grab the list of pokemon from the selected region
  if (selectedRegion.value && selectedRegion.value.gen != 0) {
    getPokemonByGen(selectedRegion.value.gen).then(results => {
      pokemon.value = results.pokemon_species;
    });
  } else {
    pokemon.value = allPokemon.value;
  }
});

// TODO: Implement button to play pokemon cry
// function PlayCry(cryUrl){
//     console.log("Attempting to play cry for pokemon.")
//     if (bgmTrack){
//         bgmTrack.pause()
//         bgmTrack.currentTime = 0
//     }
//     console.log("Using url: " + audioUrl)
//     if(!audioUrl) return

//     bgmTrack = new Audio(cryUrl)
//     bgmTrack.loop = true

//     bgmTrack.play()
//     .catch((err) => {
//         console.warn("play prevented or failed: ", err)
//     })
// }

</script>

<template>
  <Modal v-if="showModal" @close="toggleModal">
    <div class="flex justify-center">
      <Card class="pokemon-card">
        <template #title>
          <span class="name">{{ selectedPokemon.name }}</span>
          <span class="dex-no">#{{ String(selectedPokemon.id).padStart(4, '0') }}</span>
        </template>
        <template #subtitle>
          <div class="types">
            <span v-for="type in selectedPokemon.types" :key="type" class="type-chip"> | {{ type }} </span>
          </div>
        </template>
        <template #content>
          <dl class="measures">
            <div>
              <dt>Height</dt>
              <dd>{{ selectedPokemon.height }} m</dd>
            </div>
            <div>
              <dt>Weight</dt>
              <dd>{{ selectedPokemon.weight }} kgs</dd>
            </div>
          </dl>
          <div v-if="selectedPokemon.evolutionReqs.length > 0">
            <section class="block">
              <ul class="abilities" v-for="evo in selectedPokemon.evolutionReqs" :key="evo">
                <li v-if="evo.nextEvo">Evolution: {{ evo.nextEvo }}
                </li>
                <li v-if="evo.level">Level: {{ evo.level }}
                </li>
                <li v-if="evo.item">Item: {{ evo.item }}
                </li>
                <li v-if="evo.heldItem">Held Item: {{ evo.heldItem }}
                </li>
              </ul>
            </section>
          </div>
          <section class="block">
            <h3>Base Stats</h3>
            <div v-for="stat in selectedPokemon.stats" :key="stat">
              <span class="stat-name">{{ stat.name }}: </span>
              <span class="stat-value">{{ stat.baseStat }}</span>
            </div>
          </section>
        </template>
      </Card>
    </div>
    <!-- <button label="Cry" class="w-full" @click="PlayCry(selectPokemon.cries.latest)" /> -->
  </Modal>

  <Splitter class="pokedex">
    <SplitterPanel :size="25" :minSize="15" class="list-panel">
      <div class="list-header">
        <span>Pokedex</span>
        <div class="space-y-4 max-w-xs mx-auto">
          <InputGroup>
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputText v-model="text1" placeholder="Search" />
            <Select v-model="selectedRegion" :options="regions" optionLabel="region" placeholder="Region"
              class="w-full md:w-56 name" />
            <InputGroupAddon>
              <span class="name">Wish
                <Checkbox v-model="showWishListed" :binary="true" />
              </span>
            </InputGroupAddon>
            <InputGroupAddon>
              <span class="name">Caught
                <Checkbox v-model="showCaught" :binary="true" />
              </span>
            </InputGroupAddon>
          </InputGroup>
        </div>
      </div>
      <VirtualScroller :items="pokemonList" :itemSize="44" class="list-scroller">
        <template v-slot:item="{ item }">
          <div @click="selectPokemon(item.name)" class="list-row"
            :class="{ selected: selectedPokemon?.name == item.name }">
            <span v-if="item.caught"><img src="../assets/pokeball.png" alt="(Caught)" class="marker">&nbsp;</span>
            <span v-if="item.wishList" class="star">&#9734;&nbsp;</span>
            <span class="name">{{ item.name }}</span>
          </div>
        </template>
      </VirtualScroller>
    </SplitterPanel>
    <SplitterPanel class="detail-panel" :size="75">
      <Card v-if="selectedPokemon" class="detail-card">
        <template #header>
          <div class="art">
            <img v-if="selectedPokemon" :alt="selectedPokemon.name" :src="selectedPokemon.sprites.front" />
          </div>
        </template>
        <template #title><span class="name">{{ selectedPokemon.name }}</span></template>
        <template #subtitle><span v-for="type in selectedPokemon.types" :key="type" class="name"> | {{ type }}
          </span></template>
        <template #content>
          <p class="m-0">
            {{ selectedPokemon.flavorText || 'No dex entry available.' }}
          </p>
        </template>
        <template #footer>
          <div class="flex gap-3 mt-1">
            <Button label="Details" class="w-full" @click="toggleModal" />
            <Button v-if="!checkWishList(selectedPokemon.name) && authStore.isLoggedIn" label="Whishlist" class="w-full"
              @click="addWishList" />
          </div>
        </template>
      </Card>
    </SplitterPanel>
  </Splitter>
</template>

<style scoped>
.pokedex {
  height: 36rem;
  border-radius: var(--p-content-border-radius);
  overflow: hidden;
}

.pokemon-card {
  width: 100%;
  max-width: 24rem;
}

.head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
}

.dex-no {
  font-family: ui-monospace, monospace;
  font-size: 0.8125rem;
  font-weight: 400;
  color: var(--p-text-muted-color);
}

/* ---- list ---- */
.list-panel {
  display: flex;
  flex-direction: column;
}

.list-header {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--p-content-border-color);
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--p-text-muted-color);
}

.list-scroller {
  flex: 1;
  width: 100%;
}

.list-row {
  display: flex;
  align-items: center;
  height: 44px;
  padding: 0 1rem;
  font-size: 0.875rem;
  text-transform: capitalize;
  cursor: pointer;
  transition: background-color 0.15s;
}

.list-row:hover {
  background: var(--p-content-hover-background);
}

.list-row.selected {
  background: var(--p-highlight-background);
  color: var(--p-highlight-color);
  font-weight: 500;
}

.marker {
  flex: none;
  width: 1em;
  height: 1em;
  object-fit: contain;
}

.star {
  flex: none;
  line-height: 1;
}

.name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ---- measures ---- */
.measures {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  margin: 0 0 1.5rem;
  background: var(--p-content-border-color);
  border: 1px solid var(--p-content-border-color);
  border-radius: var(--p-content-border-radius);
  overflow: hidden;
}

.measures>div {
  padding: 0.75rem 1rem;
  background: var(--p-content-background);
}

.measures dt {
  margin-bottom: 0.25rem;
  font-size: 0.6875rem;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--p-text-muted-color);
}

.measures dd {
  margin: 0;
  font-size: 1.125rem;
  font-variant-numeric: tabular-nums;
}

/* ---- blocks ---- */
.block+.block {
  margin-top: 1.5rem;
}

.block h3 {
  margin: 0 0 0.625rem;
  font-size: 0.6875rem;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--p-text-muted-color);
}

.abilities {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.abilities li {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.3125rem 0.625rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: var(--p-content-border-radius);
  font-size: 0.8125rem;
  text-transform: capitalize;
}

.abilities li.is-hidden {
  border-style: dashed;
  color: var(--p-text-muted-color);
}

.tag {
  font-size: 0.625rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  opacity: 0.7;
}

/* ---- stats ---- */
.stats {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.stat {
  display: grid;
  grid-template-columns: 4.5rem 2.25rem 1fr;
  align-items: center;
  gap: 0.75rem;
}

.stat-name {
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
  text-transform: uppercase;
}

.stat-value {
  font-size: 0.875rem;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

/* ---- detail ---- */
.detail-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.detail-card {
  width: 100%;
  max-width: 24rem;
  overflow: hidden;
}

.art {
  display: flex;
  justify-content: center;
  padding: 1.5rem;
  background: var(--p-surface-100);
}

.art img {
  width: 12rem;
  height: 12rem;
  object-fit: contain;
  filter: drop-shadow(0 4px 6px rgb(0 0 0 / 0.15));
}

.name {
  text-transform: capitalize;
}

.types {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  text-transform: capitalize;
}

.type-chip {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  background: var(--p-surface-100);
  border: 1px solid var(--p-content-border-color);
  font-size: 0.6875rem;
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.25rem;
}

.actions :deep(.p-button) {
  flex: 1;
}

.empty {
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}

@media (prefers-color-scheme: dark) {
  .art {
    background: var(--p-surface-800);
  }
}
</style>