<template>
    <Splitter class="pokedex">
        <SplitterPanel :size="25" :minSize="15" class="list-panel"> 
            <div class="list-header">Pokedex</div>
            <VirtualScroller :items="pokemon" :itemSize="44" class="list-scroller">
                <template v-slot:item="{ item }">
                    <div @click="selectPokemon(item.name)" class="list-row" :class="{selected: selectedPokemon?.name == item.name}">{{ item.name }}</div>
                </template>
            </VirtualScroller>
        </SplitterPanel>
        <SplitterPanel class="detail-panel" :size="75"> 
            <Card v-if="selectedPokemon" class="detail-card">
                <template #header>
                    <div class="art">
                        <img v-if="selectedPokemon" :alt="selectedPokemon.name" :src="selectedPokemon.sprites.other['official-artwork'].front_default" />
                    </div>
                </template>
                <template #title><span class="name">{{ selectedPokemon.name }}</span></template>
                <template #subtitle><span v-for="type in selectedPokemon.types" :key="type"> | {{type.type.name}} </span></template>
                <!-- TODO: Implement Dex Entry -->
                <!-- <template #content>
                    <p class="m-0">
                        Lorem ipsum dolor sit amet, consectetur adipisicing elit. Inventore sed consequuntur error repudiandae numquam deserunt quisquam repellat libero asperiores earum nam nobis, culpa ratione quam perferendis esse, cupiditate neque
                        quas!
                    </p>
                </template> -->
                <!-- <template #footer>
                    <div class="flex gap-3 mt-1">
                        <Button label="Cancel" severity="secondary" outlined class="w-full" />
                        <Button label="Save" class="w-full" />
                    </div>
                </template> -->
            </Card>
        </SplitterPanel>
    </Splitter>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import VirtualScroller from 'primevue/virtualscroller';
import Splitter from 'primevue/splitter';
import SplitterPanel from 'primevue/splitterpanel';
import Button from 'primevue/button';
import Card from 'primevue/card';

const selectedPokemon = ref();
const pokemon = ref([]);
const isLoading = ref(true);
const error = ref(null);

async function fetchData() {
  try {
    const response = await fetch('https://pokeapi.co/api/v2/pokemon?limit=100000&offset=0');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const jsonData = await response.json();
    // console.log(jsonData.results);
    pokemon.value = jsonData.results;
  } catch (err) {
    error.value = err.message;
  } finally {
    isLoading.value = false;
  }
}

async function selectPokemon(pokemon) {
    try {
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemon}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const jsonData = await response.json();
    selectedPokemon.value = jsonData;
    // console.log(JSON.stringify(selectedPokemon.value?.sprites, null, 2));
  } catch (err) {
    error.value = err.message;
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  fetchData();
});

</script>

<style scoped>
.pokedex {
  height: 36rem;
  border-radius: var(--p-content-border-radius);
  overflow: hidden;
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

.dex-no {
  font-family: ui-monospace, monospace;
  color: var(--p-text-muted-color);
}

.types {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  text-transform: capitalize;
}

.stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin: 0;
  font-size: 0.875rem;
}

.stats dt {
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--p-text-muted-color);
}

.stats dd {
  margin: 0;
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