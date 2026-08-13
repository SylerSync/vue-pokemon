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
import SelectButton from 'primevue/selectbutton';
import Badge from 'primevue/badge';
import Splitter from 'primevue/splitter';
import SplitterPanel from 'primevue/splitterpanel';
import { useInventoryStore } from '@/stores/inventoryStore';

const pokemonStore = usePokemonStore()
const inventoryStore = useInventoryStore()
const selectedRegion = ref(null)
const selectedRole = ref(null)
const selectedTrainer = ref(null)
const selectedPokemonTeam = ref([])
const opponentPokemonTeam = ref([])
const selectedPokemon = ref(null)
const usersSelectedPokemon = ref(null)
const battleLog = ref([])
const battleStarted = ref(false)
const anim = ref(null); // { actor: 'ally' | 'foe', type: 'lunge' | 'hit' | 'faint' }
const isResolving = ref(false)
const battleSubView = ref("log")
const isVictory = ref(false)
const isEndModalOpen = ref(false)
const payout = ref(0)


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

function isTeamFainted(team) {
    if (!team || team.length === 0) return true

    return team.every(pokemon => {
        // Safely reads currentHP or currentHp regardless of casing
        const hp = pokemon.currentHP ?? pokemon.currentHp ?? 0
        return hp <= 0
    })
}

async function openBattleModal() {
    if (!selectedTrainer.value) {
        console.warn(`A trainer must be selected to battle!`)
        return
    }
    if (selectedPokemonTeam.value.length < 1) {
        console.warn(`You must select atleast one pokemon!`)
        return
    }
    opponentPokemonTeam.value = selectedTrainer.value.team.map(pokemon => ({
        ...pokemon,
        currentHp: pokemon.totalHp,
        instanceId: crypto.randomUUID()
    }));
    console.log(opponentPokemonTeam.value)
    usersSelectedPokemon.value = selectedPokemonTeam.value[0]
    selectedPokemon.value = opponentPokemonTeam.value[0]
    battleStarted.value = true
    battleLog.value = [`Battle started with ${selectedTrainer.value.name}.`]
    isBattleModalOpen.value = true
}

function closeBattleModal() {
    opponentPokemonTeam.value = null
    battleMessage.value = defaultMessage.value
    usersSelectedPokemon.value = null
    selectedPokemon.value = null
    battleLog.value = []
    battleStarted.value = false
    isBattleModalOpen.value = false
    isResolving.value = false
}

/// ----------------------
/// Battle Phase Functions
/// ----------------------

async function battleTurn(move) {
    if (battleStarted.value) {
        isResolving.value = true
        let userSpeed = usersSelectedPokemon.value.stats.find(s => s.name == "speed").stat
        let wildSpeed = selectedPokemon.value.stats.find(s => s.name == "speed").stat
        const wildMove = selectedPokemon.value.moves.length
            ? selectedPokemon.value.moves[Math.floor(Math.random() * selectedPokemon.value.moves.length)]
            : null;
        if (userSpeed > wildSpeed) {
            await useMove(usersSelectedPokemon.value, selectedPokemon.value, move)
            if (selectedPokemon.value.currentHp <= 0) {
                PokemonFainted("opponent")
                return
            }
            await useMove(selectedPokemon.value, usersSelectedPokemon.value, wildMove)
            if (usersSelectedPokemon.value.currentHp <= 0) {
                PokemonFainted("player")
                return
            }
        } else if (wildSpeed > userSpeed) {
            await useMove(selectedPokemon.value, usersSelectedPokemon.value, wildMove)
            if (usersSelectedPokemon.value.currentHp <= 0) {
                PokemonFainted("player")
                return
            }
            await useMove(usersSelectedPokemon.value, selectedPokemon.value, move)
            if (selectedPokemon.value.currentHp <= 0) {
                PokemonFainted("opponent")
                return
            }
        } else {
            let tieBreaker = Math.floor(Math.random() * 100) + 1
            if (tieBreaker > 50) {
                await useMove(usersSelectedPokemon.value, selectedPokemon.value, move)
                if (selectedPokemon.value.currentHp <= 0) {
                    PokemonFainted("opponent")
                    return
                }
                await useMove(selectedPokemon.value, usersSelectedPokemon.value, wildMove)
                if (usersSelectedPokemon.value.currentHp <= 0) {
                    PokemonFainted("player")
                    return
                }
            } else {
                await useMove(selectedPokemon.value, usersSelectedPokemon.value, wildMove)
                if (usersSelectedPokemon.value.currentHp <= 0) {
                    PokemonFainted("player")
                    return
                }
                await useMove(usersSelectedPokemon.value, selectedPokemon.value, move)
                if (selectedPokemon.value.currentHp <= 0) {
                    PokemonFainted("opponent")
                    return
                }
            }
        }
        isResolving.value = false
    }
}

async function useMove(user, target, move) {
    const actor = user === usersSelectedPokemon.value ? 'ally' : 'foe';
    const victim = actor === 'ally' ? 'foe' : 'ally';

    battleLog.value.push(`${user.name} used ${move.name}`)
    await playAnim(actor, 'lunge', 300);
    const randInt = Math.floor(Math.random() * 100) + 1
    if (randInt > move.accuracy) {
        battleLog.value.push(`${move.name} missed`)
        await delay(800)
        return
    }
    if (move.power) {
        const results = calculateDamage(user, target, move)
        if (results.critical) {
            battleLog.value.push("Critical Hit!")
        }
        if (results.immune) {
            battleLog.value.push(`It doesn't affect ${target.name}...`);
            return;
        }
        if (results.effectiveness == 2) {
            battleLog.value.push("Super Effective")
        } else if (results.effectiveness == .5) {
            battleLog.value.push("Not very effective")
        }
        // await delay(800)
        await playAnim(victim, 'hit', 400);
        battleLog.value.push(`${user.name} did ${results.damage} damage`)
        target.currentHp -= results.damage
        await delay(800)
    } else {
        battleLog.value.push("This move does nothing bozo.")
    }
}

function calculateDamage(attacker, defender, move, opts = {}) {
    const {
        critical = Math.random() < 1 / 24,
        randomFactor = Math.max(.85, Math.random()),
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
                (Math.floor((2 * attacker.level) / 5 + 2) * move.power * atk) / def
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

async function playAnim(actor, type, ms) {
    anim.value = { actor, type };
    await delay(ms);
    anim.value = null;
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function PokemonFainted(trainer) {
    console.log("A pokemon fainted!")
    let indexes = []
    if (trainer === "opponent") {
        for (const [index, pokemon] of opponentPokemonTeam.value.entries()) {
            if (pokemon.currentHp > 0) {
                indexes.push(index)
            }
        }
        if (indexes.length > 0) {
            const randomIndex = indexes[Math.floor(Math.random() * indexes.length)]
            selectedPokemon.value = opponentPokemonTeam.value[randomIndex]
            isResolving.value = false
        }
        else{
            isVictory.value = true
            OpenEndModal()
        }
    }
    if (trainer === "player") {
        for (const [index, pokemon] of selectedPokemonTeam.value.entries()) {
            if (pokemon.currentHp > 0) {
                indexes.push(index)
            }
        }
        if(indexes.length < 1){
            isVictory = false
            OpenEndModal()
        }
    }

    indexes = []
}

function OpenEndModal(){
    if(isVictory.value){
        switch (selectedRole.value){
            case "gym_leaders":
                console.log("Gym leader defeat detected")
                payout.value = 10000
                break;
            case "elite_four":
                console.log("elite four defeat detected")
                payout.value = 20000
                break;
            case "champion":
                console.log("Champion defeat detected")
                payout.value = 30000
                break;
        }
        inventoryStore.AddFunds(payout.value)
        isEndModalOpen.value = true
    }
    else{
        console.log("player defeat detected")
        isEndModalOpen.value = true
    }
    
}

function CloseEndModal(){
    payout.value = 0
    isVictory.value = false
    isEndModalOpen.value = false
    isBattleModalOpen.value = false
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
                                    <template v-for="(pokemon, index) in (slotProps.items || filteredPokemon)"
                                        :key="pokemon.instanceId || pokemon.id || index">
                                        <Card v-if="pokemon && (pokemon.currentHp ?? pokemon.currentHP ?? 0) > 0"
                                            class="w-full pokemonCard" @click="ToggleSelectedPokemon(pokemon)"
                                            :class="{ 'is-selected': selectedPokemonTeam.some(p => p.instanceId === pokemon.instanceId) }">

                                            <template #title>{{ pokemon.name }}</template>
                                            <template #header>
                                                <div class="sprite-container">
                                                    <img class="pokemon-sprite" :src="pokemon.sprite"
                                                        :alt="pokemon.name" />
                                                </div>
                                            </template>
                                        </Card>
                                    </template>

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
                        <Select v-model="usersSelectedPokemon" :options="pokemonStore.caughtPokemon"
                            :optionDisabled="(option) => (option.currentHp ?? option.totalHp) <= 0" optionLabel="name"
                            filter filterBy="name" showClear placeholder="Select a Pokémon" class="setup-select">
                            <template #value="slotProps">
                                <div v-if="slotProps.value" class="option-row">
                                    <img v-if="slotProps.value.sprite" :src="slotProps.value.sprite" alt=""
                                        class="option-sprite" />
                                    <span class="option-name">{{ slotProps.value.name }}</span>
                                </div>
                                <span v-else class="placeholder">{{ slotProps.placeholder }}</span>
                            </template>
                            <template #option="slotProps">
                                <div class="option-row">
                                    <img v-if="slotProps.option.sprite" :src="slotProps.option.sprite" alt=""
                                        class="option-sprite" />
                                    <span class="option-name">{{ slotProps.option.name }} Lvl {{ slotProps.option.level
                                    }}</span>
                                </div>
                            </template>
                        </Select>
                        <button class="btn btn-primary" :disabled="!usersSelectedPokemon" @click="">
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
                                    <span class="combatant-name">{{ selectedPokemon.name }} Lvl {{ selectedPokemon.level
                                    }}</span>
                                </div>
                                <div class="hp">
                                    <div class="hp-track">
                                        <div class="hp-fill" :class="hpTone(selectedPokemon)"
                                            :style="{ width: hpPercent(selectedPokemon) + '%' }" />
                                    </div>
                                    <span class="hp-text">
                                        {{ Math.max(0, selectedPokemon.currentHp) }}/{{ selectedPokemon.totalHp }}
                                    </span>
                                </div>
                            </div>
                            <img :src="selectedPokemon.sprite" :alt="selectedPokemon.name"
                                class="battle-sprite sprite-foe"
                                :class="anim?.actor === 'foe' ? `anim-${anim.type}` : null" />
                        </div>

                        <!-- player: sprite left, info right -->
                        <div class="combatant combatant-ally">
                            <div class="combatant-info">
                                <div class="combatant-head">
                                    <span class="label">Yours</span>
                                    <span class="combatant-name">{{ usersSelectedPokemon.name }} Lvl {{
                                        usersSelectedPokemon.level }}</span>
                                </div>
                                <div class="hp">
                                    <div class="hp-track">
                                        <div class="hp-fill" :class="hpTone(usersSelectedPokemon)"
                                            :style="{ width: hpPercent(usersSelectedPokemon) + '%' }" />
                                    </div>
                                    <span class="hp-text">
                                        {{ Math.max(0, usersSelectedPokemon.currentHp) }}/{{
                                            usersSelectedPokemon.totalHp }}
                                    </span>
                                </div>
                            </div>
                            <img :src="usersSelectedPokemon.backSprite ?? usersSelectedPokemon.sprite"
                                :alt="usersSelectedPokemon.name" class="battle-sprite sprite-ally"
                                :class="anim?.actor === 'ally' ? `anim-${anim.type}` : null" />
                        </div>
                        <!-- moves -->
                        <div class="moves">
                            <button v-for="move in usersSelectedPokemon.moves" :key="move.name" class="move"
                                :disabled="isResolving" @click="battleTurn(move)">
                                <span class="move-name">{{ move.name }}</span>
                                <span class="move-power">{{ move.power ?? '—' }}</span>
                            </button>
                        </div>
                        <!-- MID-BATTLE ACTIONS (POKÉMON & INVENTORY) -->
                        <div class="battle-actions-row">
                            <!-- POKÉMON BUTTON: Opens Party Switch View -->
                            <button class="action-btn pkmn-btn" :disabled="isResolving"
                                @click="battleSubView = 'party'">
                                <i class="mr-1"></i> POKÉMON
                            </button>

                            <!-- INVENTORY BUTTON: Opens Bag / Items View -->
                            <button class="action-btn bag-btn" :disabled="isResolving" @click="battleSubView = 'bag'">
                                <i class="mr-1"></i> INVENTORY
                            </button>
                        </div>
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

    <Modal v-if="isEndModalOpen" @close="CloseEndModal">
        <template class="endModal">
            <div v-if="isVictory">
                <h3>Victory!</h3>
                <p>{{ payout }}</p>
            </div>
            <div v-if="!isVictory">
                <h3>You lose</h3>
                <p>Better luck next time</p>
            </div>
            <Button @click="CloseEndModal">Okay</Button>
        </template>
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

.battle-actions-row {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.5rem;
}

.action-btn {
    flex: 1;
    padding: 0.5rem;
    font-weight: 600;
    font-size: 0.75rem;
    border: 1px solid var(--p-content-border-color);
    border-radius: var(--p-content-border-radius);
    background: var(--p-content-background);
    cursor: pointer;
    transition: background-color 0.15s;
}

.action-btn:hover:not(:disabled) {
    background: var(--p-content-hover-background);
}

@keyframes faint {
    to {
        transform: translateY(40px);
        opacity: 0;
    }
}
</style>