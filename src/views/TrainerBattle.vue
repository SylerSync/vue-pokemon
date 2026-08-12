<script setup>
import { ref, computed } from 'vue';
import Select from 'primevue/select'; // Use 'primevue/dropdown' if on PrimeVue v3
import DataView from "primevue/dataview"
import gymData from '@/assets/data/trainers.json';
import Button from "primevue/button"
import Card from "primevue/card"
import { usePokemonStore } from '@/stores/pokemonStore';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import InputText from 'primevue/inputtext';

const pokemonStore = usePokemonStore()
const selectedRegion = ref(null)
const selectedRole = ref(null)
const selectedTrainer = ref(null)
const selectedPokemonList = ref([])
const opponentPokemonList = ref([])

/// -----------------
/// Trainer Selection
/// -----------------
const regionOptions = Object.keys(gymData).map(region => ({
    label: region.toUpperCase(),
    value: region
}));

const roleOptions = computed(() => {
    if (!selectedRegion.value) return [];

    const region = gymData[selectedRegion.value];
    if (!region) return [];

    const roles = [];
    if (region.gym_leaders) roles.push({ label: 'Gym Leaders', value: 'gym_leaders' });
    if (region.elite_four) roles.push({ label: 'Elite Four', value: 'elite_four' });
    if (region.champion) roles.push({ label: 'Champion', value: 'champion' });

    return roles;
});

function onRegionChange() {
    selectedRole.value = null;
    selectedTrainer.value = null
}

const trainerOptions = computed(() => {
    if (!selectedRegion.value || !selectedRole.value) return [];

    const rawData = gymData[selectedRegion.value][selectedRole.value];
    if (!rawData) return [];

    // Champion is a single object in the JSON
    if (selectedRole.value === 'champion') {
        return [{ label: `${rawData.name} (${rawData.type})`, value: rawData }];
    }

    // Gym Leaders and Elite Four are arrays
    if (!Array.isArray(rawData)) return [];

    return rawData.map(t => ({
        label: `${t.name} (${t.type})`,
        value: t
    }));
});

function onRoleChange() {
    selectedTrainer.value = null;
}
/// -----------------------
/// PokeBox control section
/// -----------------------

const searchQuery = ref('')
const sortKey = ref(null)
const sortField = ref(null)
const sortOrder = ref(1)

const sortOptions = ref([
    { label: 'Name (A-Z)', value: 'name' },
    { label: 'Name (Z-A)', value: '!name' },
    { label: 'Weight (Lightest)', value: 'weight' },
    { label: 'Weight (Heaviest)', value: '!weight' }
])

const onSortChange = (event) => {
    const value = event.value.value
    if (value.indexOf('!') === 0) {
        sortOrder.value = -1
        sortField.value = value.substring(1)
    } else {
        sortOrder.value = 1
        sortField.value = value
    }
}

const filteredPokemon = computed(() => {
    let result = [...pokemonStore.caughtPokemon]

    if (searchQuery.value && searchQuery.value.trim() !== '') {
        const query = searchQuery.value.toLowerCase().trim()
        result = result.filter(pokemon =>
            pokemon.name.toLowerCase().includes(query)
        )
    }

    if (sortField.value) {
        result.sort((a, b) => {
            const valA = a[sortField.value]
            const valB = b[sortField.value]

            if (typeof valA === 'string') {
                return sortOrder.value * valA.localeCompare(valB)
            }
            return sortOrder.value * (valA - valB)
        })
    }

    return result
})
/// ---------------
/// Selection Logic
/// ---------------

function ToggleSelectedPokemon(pokemon) {
    // 1. Find the index of the pokemon in the selected list
    const index = selectedPokemonList.value.findIndex(p => p.instanceId === pokemon.instanceId)

    if (index !== -1) {
        selectedPokemonList.value.splice(index, 1)
        console.log(`Removed ${pokemon.name} from team.`)
    } else {
        if (selectedPokemonList.value.length < 6) {
            selectedPokemonList.value.push(pokemon)
            console.log(`Added ${pokemon.name} to team.`)
        } else {
            console.warn('Your team is full! (Max 6 Pokémon)')
        }
    }
    console.log(selectedPokemonList.value)
}
</script>
<template>
    <!-- Single Root Wrapper prevents RouterView parentNode DOM errors -->
    <div class="page-wrapper">
        <div class="layout-container">
            <!-- Top Row: 1/4 Left, 3/4 Right -->
            <div class="top-row">
                <Card class="panel-left">
                    <template #content>
                        <div>
                            <label class="w-full text-left text-sm font-semibold mb-1">Region</label>
                            <Select v-model="selectedRegion" :options="regionOptions" optionLabel="label"
                                optionValue="value" placeholder="Select Region" class="w-48 selector"
                                @change="onRegionChange" />
                        </div>
                        <div>
                            <label class="w-full text-left text-sm font-semibold mb-1">Role</label>
                            <Select v-model="selectedRole" :options="roleOptions" optionLabel="label"
                                optionValue="value" placeholder="Select Role" class="w-48 selector"
                                @change="onRoleChange" />
                        </div>
                        <div>
                            <label class="w-full text-left text-sm font-semibold mb-1">Trainer</label>
                            <Select v-model="selectedTrainer" :options="trainerOptions" optionLabel="label"
                                optionValue="value" placeholder="Select Trainer" class="w-48 selector" />
                        </div>
                    </template>
                </Card>

                <Card class="panel-right">
                    <template #content>
                        <DataView :value="filteredPokemon" layout="grid" paginator :rows="12">
                            <template #header>
                                <div class="header-wrapper">
                                    <IconField iconPosition="left">
                                        <InputIcon class="pi pi-search" />
                                        <InputText v-model="searchQuery" placeholder="Search caught Pokémon..." />
                                    </IconField>

                                    <Select v-model="sortKey" :options="sortOptions" optionLabel="label"
                                        placeholder="Sort By" @change="onSortChange" />
                                </div>
                            </template>

                            <template #grid="slotProps">
                                <div class="pokemon-grid">
                                    <Card v-for="(pokemon, index) in (slotProps.items || filteredPokemon)"
                                        :key="pokemon.id ? pokemon.id : index" class="w-full pokemonCard" @click="ToggleSelectedPokemon(pokemon)"
                                        :class="{ 'is-selected': selectedPokemonList.some(p => p.instanceId === pokemon.instanceId) }"
                                        >
                                        <template #title>{{ pokemon.name }}</template>
                                        <template #header>
                                            <div class="sprite-container">
                                                <img class="pokemon-sprite" :src="pokemon.sprite" :alt="pokemon.name" />
                                            </div>
                                        </template>
                                    </Card>
                                </div>
                            </template>
                        </DataView>
                    </template>
                </Card>
            </div>

            <!-- Bottom Row: Full Width Bar -->
            <Card class="bottom-row">
                <template #content>
                    <Button class="battleBtn">Start Battle</Button>
                </template>
            </Card>
        </div>
    </div>
</template>

<style scoped>
.layout-container {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding: 1.5rem;
    box-sizing: border-box;
}

.top-row {
    display: grid;
    grid-template-columns: 1fr 3fr;
    /* 1/4 and 3/4 split */
    gap: 1.5rem;
    width: 100%;
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
.bottom-row {
    width: 100%;
}

.selector {
    display: flex;
    justify-content: end;
}

.pokemon-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr)); /* Exactly 5 equal columns */
  gap: 1rem;
  width: 100%;
}

.pokemonCard :deep(.p-card-body),
.pokemonCard :deep(.p-card-caption) {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
}

.pokemonCard:hover {
    cursor: pointer;
    background-color: Canvas;
}

.battleBtn{
    width:33%;
    display: flex;
    justify-self: center;
}

.is-selected{
    border: 2px solid CanvasText;
}

/* Stack vertically on smaller screens */
@media (max-width: 992px) {
    .top-row {
        grid-template-columns: 1fr;
    }
}
</style>