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
                                        v-if="pokemon.currentHp > 0"
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
    <div class="battle">
      <Splitter :sizes="[70, 30]" class="battle-split">
        <SplitterPanel :minSize="45" class="battle-stage">

          <!-- pre-battle -->
          <div v-if="!battleStarted" class="setup">
            <h2 class="setup-title">Choose your fighter</h2>
            <Select
              v-model="usersSelectedPokemon"
              :options="pokemonStore.caughtPokemon"
              :optionDisabled="(option) => (option.currentHp ?? option.totalHp) <= 0"
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
                  <span class="option-name">{{ slotProps.option.name }} Lvl {{ slotProps.option.level }}</span>
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
            <!-- opponent: info left, sprite right -->
            <div class="combatant combatant-foe">
              <div class="combatant-info">
                <div class="combatant-head">
                  <span class="label">Wild</span>
                  <span class="combatant-name">{{ selectedPokemon.name }} Lvl {{ selectedPokemon.level }}</span>
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
              <img
                :src="selectedPokemon.sprite"
                :alt="selectedPokemon.name"
                class="battle-sprite sprite-foe"
                :class="anim?.actor === 'foe' ? `anim-${anim.type}` : null"
              />
            </div>
          
            <!-- player: sprite left, info right -->
            <div class="combatant combatant-ally">
              <div class="combatant-info">
                <div class="combatant-head">
                  <span class="label">Yours</span>
                  <span class="combatant-name">{{ usersSelectedPokemon.name }} Lvl {{ usersSelectedPokemon.level }}</span>
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
              <img
                :src="usersSelectedPokemon.backSprite ?? usersSelectedPokemon.sprite"
                :alt="usersSelectedPokemon.name"
                class="battle-sprite sprite-ally"
                :class="anim?.actor === 'ally' ? `anim-${anim.type}` : null"
              />
            </div> 
                <!-- moves -->
                <div class="moves">
                  <button
                    v-for="move in usersSelectedPokemon.moves"
                    :key="move.name"
                    class="move"
                    :disabled="isResolving"
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
                <button :disabled="isResolving || !inventoryStore.selectedPokeball" @click="battleTurn('Catch')">
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