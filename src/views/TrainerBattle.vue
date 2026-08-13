<script setup>
import { ref, computed } from 'vue';
import Select from 'primevue/select'; // Use 'primevue/dropdown' if on PrimeVue v3
import DataView from "primevue/dataview"
import gymData from '@/assets/data/trainers.json';
import Button from "primevue/button"
import Card from "primevue/card"
import Modal from "@/components/Modal.vue"
import { usePokemonStore } from '@/stores/pokemonStore';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import InputText from 'primevue/inputtext';
import "@/api/pokeapi"
import { getPokemon } from '@/api/pokeapi';

const pokemonStore = usePokemonStore()
const selectedRegion = ref(null)
const selectedRole = ref(null)
const selectedTrainer = ref(null)
const selectedPokemonTeam = ref([])
const opponentPokemonTeam = ref([])

const isBattleModalOpen = ref(false)

const defaultMessage = ref("What will you do?")
const battleMessage = ref(defaultMessage)

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
    const index = selectedPokemonTeam.value.findIndex(p => p.instanceId === pokemon.instanceId)

    if (index !== -1) {
        selectedPokemonTeam.value.splice(index, 1)
        console.log(`Removed ${pokemon.name} from team.`)
    } else {
        if (selectedPokemonTeam.value.length < 6) {
            selectedPokemonTeam.value.push(pokemon)
            console.log(`Added ${pokemon.name} to team.`)
        } else {
            console.warn('Your team is full! (Max 6 Pokémon)')
        }
    }
    console.log(selectedPokemonTeam.value)
}

/// ---------------------
/// Battle Modal Controls
/// ---------------------

async function openBattleModal() {
    opponentPokemonTeam.value = await BuildOpponentTeam()
    isBattleModalOpen.value = true
    console.log(opponentPokemonTeam.value)
}

function closeBattleModal() {
    isBattleModalOpen.value = false
    opponentPokemonTeam.value = null
    battleMessage.value = defaultMessage.value
}

async function BuildOpponentTeam() {
    const opponent = selectedTrainer.value
    try {
        const promises = opponent.team.map(async (name) => {
            const formattedName = name.toLowerCase().trim().replace(/[\s\.]+/g, '-').replace(/[^a-z0-9-]/g, '');
            const raw = await getPokemon(formattedName);
            return {
                name: raw.name,
                sprite: raw.sprites.front_default,
                types: raw.types.map(t => t.type.name),
                totalHP: raw.stats.find(s => s.stat.name === 'hp')?.base_stat || 0,
                currentHP: raw.stats.find(s => s.stat.name === 'hp')?.base_stat || 0,
                instanceId: crypto.randomUUID()
            }
        })

        return await Promise.all(promises)
    }
    catch (error) {
        console.error(`Failed to load pokemon team: ${error}`)
    }
}

// Computed active fighters (default to first non-fainted Pokemon)
const activeOpponentPokemon = computed(() => {
    return opponentPokemonTeam.value?.find(p => p.currentHP > 0) || opponentPokemonTeam.value?.[0]
})

const activePlayerPokemon = computed(() => {
    return selectedPokemonTeam.value?.find(p => (p.currentHp ?? p.totalHp) > 0) || selectedPokemonTeam.value?.[0]
})

// Helper: Calculate HP percentage safely across different property casings
function getHpPercent(pokemon) {
    if (!pokemon) return 0
    const current = pokemon.currentHP ?? pokemon.currentHp ?? 0
    const total = pokemon.totalHP ?? pokemon.totalHp ?? 1
    return Math.max(0, Math.min(100, Math.round((current / total) * 100)))
}

// Helper: Dynamic HP Bar Color
function getHpColorClass(pokemon) {
    const percent = getHpPercent(pokemon)
    if (percent > 50) return 'hp-green'
    if (percent > 20) return 'hp-yellow'
    return 'hp-red'
}

const battleSubView = ref('arena')

function selectPokemonToSwitch(pokemon) {
    if ((pokemon.currentHp ?? pokemon.totalHp) <= 0) {
        battleMessage.value = `${pokemon.name} has no energy left to fight!`
        return
    }

    // Set as active combatant (e.g., move to index 0 or set active ID)
    activePlayerPokemonId.value = pokemon.instanceId
    battleMessage.value = `Go! ${pokemon.name}!`

    // Return to the arena view
    battleSubView.value = 'arena'
}

function HandleRun() {
    battleMessage.value = "You can't run from a trainer battle."
}

const dialogSubView = ref('menu')

function selectMove(move) {
    // 1. Show move execution message
    battleMessage.value = `${activePlayerPokemon.value?.name} used ${move.name.toUpperCase()}!`

    // 2. Return to the main menu view
    dialogSubView.value = 'menu'
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
                                        :key="pokemon.id ? pokemon.id : index" class="w-full pokemonCard"
                                        @click="ToggleSelectedPokemon(pokemon)"
                                        :class="{ 'is-selected': selectedPokemonTeam.some(p => p.instanceId === pokemon.instanceId) }">
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
                    <Button class="battleBtn" @click="openBattleModal">Start Battle</Button>
                </template>
            </Card>
        </div>
    </div>

    <Modal v-if="isBattleModalOpen">
        <div class="battle-screen">
            <!-- TOP BAR: TRAINER BANNER -->
            <div class="battle-header">
                <span class="vs-badge">VS</span>
                <h3 class="trainer-title">Battle vs. {{ selectedTrainer?.name }}</h3>
            </div>

            <!-- MAIN ARENA SCREEN -->
            <div class="battle-arena">
                <!-- OPPONENT FIELD (Top Right) -->
                <div class="field-side opponent-side">
                    <div class="status-box opponent-status">
                        <div class="info-row">
                            <span class="pokemon-name">{{ activeOpponentPokemon?.name }}</span>
                            <div class="party-balls">
                                <span v-for="(poke, i) in opponentPokemonTeam" :key="'opp-ball-' + i"
                                    class="ball"></span>
                            </div>
                        </div>
                        <div class="hp-wrapper">
                            <span class="hp-label">HP</span>
                            <div class="hp-bar-bg">
                                <div class="hp-bar-fill hp-green" style="width: 100%;"></div>
                            </div>
                        </div>
                    </div>
                    <div class="sprite-platform opponent-platform">
                        <img :src="activeOpponentPokemon?.sprite" :alt="activeOpponentPokemon?.name"
                            class="battle-sprite opponent-sprite" />
                    </div>
                </div>

                <!-- PLAYER FIELD (Bottom Left) -->
                <div class="field-side player-side">
                    <div class="sprite-platform player-platform">
                        <img :src="activePlayerPokemon?.sprite" :alt="activePlayerPokemon?.name"
                            class="battle-sprite player-sprite" />
                    </div>
                    <div class="status-box player-status">
                        <div class="info-row">
                            <span class="pokemon-name">{{ activePlayerPokemon?.name }}</span>
                            <div class="party-balls">
                                <span v-for="(poke, i) in selectedPokemonTeam" :key="'player-ball-' + i"
                                    class="ball"></span>
                            </div>
                        </div>
                        <div class="hp-wrapper">
                            <span class="hp-label">HP</span>
                            <div class="hp-bar-bg">
                                <div class="hp-bar-fill hp-green" style="width: 100%;"></div>
                            </div>
                        </div>
                        <div class="hp-text">
                            {{ activePlayerPokemon?.currentHp || activePlayerPokemon?.totalHp || 0 }} / {{
                            activePlayerPokemon?.totalHp || 0 }}
                        </div>
                    </div>
                </div>
            </div>

            <!-- ARENA BOTTOM MENU -->
            <div class="battle-menu">

                <!-- VIEW 1: MAIN BATTLE MENU (Default) -->
                <template v-if="dialogSubView === 'menu'">
                    <div class="dialog-box">
                        <p v-if="battleMessage">{{ battleMessage }}</p>
                        <p v-else>What will <strong>{{ activePlayerPokemon?.name }}</strong> do?</p>
                    </div>
                    <div class="action-grid">
                        <!-- Clicking FIGHT switches to the moves view -->
                        <button class="menu-btn fight-btn" @click="battleSubView = 'moves'">FIGHT</button>
                        <button class="menu-btn pkmn-btn">POKÉMON</button>
                        <button class="menu-btn bag-btn">BAG</button>
                        <button class="menu-btn run-btn" @click="handleRun">RUN</button>
                    </div>
                </template>

                <!-- VIEW 2: MOVE SELECTOR GRID -->
                <template v-else-if="dialogSubView === 'moves'">
                    <div class="moves-grid">
                        <!-- Loop through the active player Pokemon's moves -->
                        <button v-for="(move, index) in activePlayerPokemon?.moves?.slice(0, 4)" :key="index"
                            class="move-btn" @click="selectMove(move)">
                            {{ move.name }}
                        </button>
                    </div>

                    <!-- Back button to return to main actions -->
                    <button class="menu-btn back-btn" @click="battleSubView = 'menu'">CANCEL</button>
                </template>

            </div>
        </div>
    </Modal>
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
    grid-template-columns: repeat(5, minmax(0, 1fr));
    /* Exactly 5 equal columns */
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

.battleBtn {
    width: 33%;
    display: flex;
    justify-self: center;
}

.is-selected {
    border: 2px solid CanvasText;
}

/* Battle Container */
.battle-screen {
    width: 100%;
    max-width: 600px;
    background: linear-gradient(to bottom, #d8f8d8 0%, #f8f8f8 100%);
    border: 4px solid #282828;
    border-radius: 12px;
    overflow: hidden;
    font-family: 'Courier New', Courier, monospace;
    color: #282828;
}

.battle-header {
    background-color: #ef4444;
    color: white;
    padding: 8px 16px;
    display: flex;
    align-items: center;
    gap: 12px;
}

.vs-badge {
    background-color: #f59e0b;
    color: #000;
    font-weight: 900;
    padding: 2px 8px;
    border-radius: 4px;
}

.trainer-title {
    margin: 0;
    font-size: 1.1rem;
    text-transform: capitalize;
}

/* Battle Field Layout */
.battle-arena {
    display: flex;
    flex-direction: column;
    padding: 16px;
    gap: 16px;
    min-height: 280px;
    justify-content: space-between;
}

.field-side {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
}

.opponent-side {
    flex-direction: row;
}

.player-side {
    flex-direction: row-reverse;
}

/* Status / Health Cards */
.status-box {
    background: #f8f8d8;
    border: 3px solid #484848;
    border-radius: 8px;
    padding: 8px 12px;
    width: 200px;
    box-shadow: 3px 3px 0px #888888;
}

.info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
}

.pokemon-name {
    font-weight: bold;
    text-transform: capitalize;
    font-size: 0.95rem;
}

.party-balls {
    display: flex;
    gap: 3px;
}

.ball {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: #ef4444;
    border: 1px solid #000;
}

.ball.fainted {
    background-color: #9ca3af;
}

/* HP Bar Styling */
.hp-wrapper {
    display: flex;
    align-items: center;
    gap: 6px;
}

.hp-label {
    font-weight: bold;
    font-size: 0.75rem;
    color: #d97706;
}

.hp-bar-bg {
    flex-grow: 1;
    height: 10px;
    background-color: #4b5563;
    border-radius: 5px;
    border: 1px solid #000;
    overflow: hidden;
}

.hp-bar-fill {
    height: 100%;
    transition: width 0.4s ease-in-out, background-color 0.4s ease;
}

.hp-green {
    background-color: #22c55e;
}

.hp-yellow {
    background-color: #eab308;
}

.hp-red {
    background-color: #ef4444;
}

.hp-text {
    text-align: right;
    font-size: 0.75rem;
    margin-top: 2px;
    font-weight: bold;
}

/* Platforms & Sprites */
.sprite-platform {
    width: 120px;
    height: 40px;
    background: #b8e0b8;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    border: 2px solid #88b088;
}

.battle-sprite {
    width: 96px;
    height: 96px;
    position: absolute;
    bottom: 5px;
    image-rendering: pixelated;
}

.opponent-sprite {
    filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.2));
}

.player-sprite {
    transform: scale(1.1);
}

/* Bottom Command Panel */
.battle-menu {
    display: grid;
    grid-template-columns: 1fr 1fr;
    background-color: #282828;
    padding: 8px;
    gap: 8px;
    border-top: 4px solid #484848;
}

.dialog-box {
    background: #ffffff;
    border: 3px solid #686868;
    border-radius: 6px;
    padding: 12px;
    display: flex;
    align-items: center;
}

.dialog-box p {
    margin: 0;
    font-size: 0.9rem;
}

.action-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
}

.menu-btn {
    border: 2px solid #000;
    border-radius: 6px;
    font-weight: bold;
    font-size: 0.85rem;
    cursor: pointer;
    padding: 8px;
    transition: transform 0.1s, filter 0.1s;
}

.menu-btn:hover {
    filter: brightness(1.1);
    transform: translateY(-1px);
}

.fight-btn {
    background-color: #ef4444;
    color: white;
}

.pkmn-btn {
    background-color: #22c55e;
    color: white;
}

.bag-btn {
    background-color: #eab308;
    color: white;
}

.run-btn {
    background-color: #6b7280;
    color: white;
}

.moves-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  flex-grow: 1;
}

.move-btn {
  background-color: #ffffff;
  border: 2px solid #282828;
  border-radius: 6px;
  font-family: inherit;
  font-weight: bold;
  font-size: 0.85rem;
  text-transform: uppercase;
  padding: 10px;
  cursor: pointer;
  transition: transform 0.1s, background-color 0.1s;
}

.move-btn:hover {
  background-color: #f3f4f6;
  transform: translateY(-1px);
}

.back-btn {
  background-color: #4b5563;
  color: white;
  grid-column: span 2;
}

/* Stack vertically on smaller screens */
@media (max-width: 992px) {
    .top-row {
        grid-template-columns: 1fr;
    }
}
</style>