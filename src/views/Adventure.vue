<template>
    <div class="game-container">
        <!-- Centered Viewport Container matching canvas bounds -->
        <div class="viewport-wrapper">
            <canvas ref="canvasRef"></canvas>

            <!-- ENCOUNTER FLASH OVERLAY (Layered over canvas during wild encounters) -->
            <div v-if="isEncounterAnimating" class="encounter-flash-overlay"></div>

            <!-- HUD Menu Button -->
            <button class="hud-menu-btn" @click="toggleMenu">
                ☰ Menu
            </button>

            <!-- Main RPG Menu Overlay -->
            <div v-if="isMenuOpen" class="menu-overlay" @click.self="toggleMenu">
                <div class="menu-card">
                    <div class="menu-header">
                        <h2>Pause Menu</h2>
                        <button class="close-btn" @click="toggleMenu">✕</button>
                    </div>

                    <ul class="menu-list">
                        <li @click="selectMenuOption('Party')">
                            <span class="icon">🐾</span>
                            <span>Party</span>
                        </li>
                        <li @click="selectMenuOption('Bag')">
                            <span class="icon">🎒</span>
                            <span>Bag</span>
                        </li>
                        <li @click="toggleMenu">
                            <span class="icon">❌</span>
                            <span>Close</span>
                        </li>
                    </ul>
                </div>
            </div>

            <!-- Overlay Modal for Doorway Transitions -->
            <div v-if="isDoorwayModalOpen" class="modal-overlay">
                <div class="modal-card">
                    <h2>🚪 Entering {{ activeBuildingName }}</h2>
                    <p>Would you like to step inside?</p>

                    <div class="modal-actions">
                        <button class="modal-btn primary" @click="enterBuilding">Enter</button>
                        <button class="modal-btn secondary" @click="closeModals">Cancel</button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <Modal v-if="isStarterModalOpen">
        <div class="starters-wrapper">
            <div v-for="(pokemonList, regionName) in starters" :key="regionName" class="region-section">
                <h2 class="region-title">{{ regionName.toUpperCase() }} REGION</h2>

                <div class="grid-container">
                    <div v-for="poke in pokemonList" :key="poke?.id" class="starter-card">
                        <div class="card-header">
                            <span class="poke-id">#{{ poke?.id }}</span>
                            <span class="poke-level">Lv. {{ poke?.level }}</span>
                        </div>

                        <img :src="poke?.sprite" :alt="poke?.name" class="poke-sprite" />

                        <h3 class="poke-name">{{ poke?.name }}</h3>

                        <!-- Dynamic type badge styling from store -->
                        <div class="type-badges" v-if="poke?.types">
                            <span v-for="t in poke.types" :key="t.type?.name" class="type-tag"
                                :style="{ backgroundColor: pokemonStore.typeColors[t.type?.name] || '#777' }">
                                {{ t.type?.name }}
                            </span>
                        </div>

                        <button class="select-btn" @click="chooseStarter(poke)">
                            Choose {{ poke?.name }}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </Modal>

    <Modal v-if="isPokeBoxModalOpen" class="box-modal-wide" @close="closePokeBoxModal">
        <div class="box-layout-container">

            <!-- LEFT PANEL: Party List (6 Slots Fixed) -->
            <div class="panel-left">
                <div class="panel-header">
                    <h3>Party ({{ pokemonStore.pokemonParty?.length || 0 }}/6)</h3>
                </div>

                <div class="party-list">
                    <div v-for="(poke, index) in pokemonStore.pokemonParty" :key="poke?.id || index"
                        class="party-card-row" @click="selectPartyMember(poke)">
                        <img :src="poke?.sprite || poke?.sprites || poke?.image" :alt="poke?.name"
                            class="party-sprite-icon" />

                        <div class="party-details">
                            <div class="party-top">
                                <span class="poke-name">{{ poke?.name }}</span>
                                <span class="poke-lvl">Lv. {{ poke?.level }}</span>
                            </div>

                            <div class="hp-row">
                                <div class="hp-bar-track">
                                    <div class="hp-bar-fill" :class="getHpBarSeverity(poke)"
                                        :style="{ width: getHpPercentage(poke) + '%' }"></div>
                                </div>
                                <span class="hp-num">{{ poke?.currentHp ?? poke?.stats?.hp }}/{{ poke?.maxHp ??
                                    poke?.stats?.hp }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- RIGHT PANEL: 30-Slot Paginated Storage Box -->
            <div class="panel-right">
                <div class="panel-header">
                    <h3>Storage Box</h3>
                </div>

                <DataView :value="pokemonStore.caughtPokemon" layout="grid" :paginator="true" :rows="30"
                    class="box-dataview-paginated">
                    <template #grid="slotProps">
                        <div class="box-grid-30">
                            <div v-for="poke in slotProps.items" :key="poke?.id" class="box-slot-card"
                                :class="{ 'in-party-outline': isMemberInParty(poke) }" @click="selectBoxPokemon(poke)">
                                <img :src="poke?.sprite || poke?.sprites || poke?.image" :alt="poke?.name"
                                    class="box-sprite-icon" />
                                <span class="box-name-label">{{ poke?.name }}</span>
                                <span class="box-lvl-label">L{{ poke?.level }}</span>
                            </div>
                        </div>
                    </template>
                </DataView>
            </div>

        </div>
    </Modal>

    <Modal v-if="isShopModalOpen" @close="closeShopModal">
        <div class="shop-container">

            <!-- HEADER -->
            <div class="shop-header">
                <h2>PokeMart</h2>
                <Tag severity="success" class="funds-tag">
                    Funds: ${{ inventoryStore.funds.toLocaleString() }}
                </Tag>
            </div>

            <SelectButton v-model="shopTab" :options="shopCats" optionLabel="label" optionValue="value"
                aria-labelledby="basic" class="shopSelection" />

            <!-- TABLE 1: POKEBALLS -->
            <template v-if="shopTab === 'pokeballs'">
                <h3 class="shopTab">Pokeballs</h3>
                <DataTable :value="shopPokeball" paginator :rows="5" responsiveLayout="scroll"
                    class="p-datatable-sm dataTable">
                    <Column field="name" header="Item" style="width: 40%"></Column>
                    <Column field="cost" header="Cost" style="width: 20%">
                        <template #body="slotProps">
                            ${{ slotProps.data.cost.toLocaleString() }}
                        </template>
                    </Column>
                    <Column field="count" header="In Bag" style="width: 20%"></Column>
                    <Column header="Action" style="width: 20%">
                        <template #body="slotProps">
                            <Button label="Buy" icon="pi pi-shopping-cart" severity="primary" size="small"
                                class="shop-btn" :disabled="inventoryStore.funds < slotProps.data.cost"
                                @click="buyPokeball(slotProps.data.id)" />
                        </template>
                    </Column>
                </DataTable>
            </template>

            <!-- TABLE 2: RECOVERY ITEMS -->
            <template v-if="shopTab === 'recovery'">
                <h3 class="shopTab">Recovery Items</h3>
                <DataTable :value="shopRecovery" paginator :rows="5" responsiveLayout="scroll"
                    class="p-datatable-sm dataTable">
                    <Column field="name" header="Item" style="width: 40%"></Column>
                    <Column field="cost" header="Cost" style="width: 20%">
                        <template #body="slotProps">
                            ${{ slotProps.data.cost.toLocaleString() }}
                        </template>
                    </Column>
                    <Column field="count" header="In Bag" style="width: 20%"></Column>
                    <Column header="Action" style="width: 20%">
                        <template #body="slotProps">
                            <Button label="Buy" icon="pi pi-shopping-cart" severity="primary" size="small"
                                class="shop-btn" :disabled="inventoryStore.funds < slotProps.data.cost"
                                @click="buyRecovery(slotProps.data.id)" />
                        </template>
                    </Column>
                </DataTable>
            </template>

            <!-- TABLE 3: TMs -->
            <template v-if="shopTab === 'tms'">
                <h3 class="shopTab">Technical Machines (TMs)</h3>
                <DataTable :value="shopTMs" paginator :rows="5" responsiveLayout="scroll"
                    class="p-datatable-sm dataTable">
                    <!-- CUSTOM TYPE-COLORED ITEM COLUMN -->
                    <Column field="name" header="Item" style="width: 40%">
                        <template #body="slotProps">
                            <div class="tm-item-cell">
                                <span class="tm-type-badge"
                                    :style="{ backgroundColor: pokemonStore.typeColors[slotProps.data.type] || '#777' }">
                                    {{ slotProps.data.type }}
                                </span>
                                <span class="tm-name-text">{{ slotProps.data.name }}</span>
                            </div>
                        </template>
                    </Column>

                    <Column field="cost" header="Cost" style="width: 20%">
                        <template #body="slotProps">
                            ${{ slotProps.data.cost.toLocaleString() }}
                        </template>
                    </Column>
                    <Column field="count" header="In Bag" style="width: 20%"></Column>
                    <Column header="Action" style="width: 20%">
                        <template #body="slotProps">
                            <Button label="Buy" icon="pi pi-shopping-cart" severity="primary" size="small"
                                class="shop-btn" :disabled="inventoryStore.funds < slotProps.data.cost"
                                @click="buyTM(slotProps.data.id)" />
                        </template>
                    </Column>
                </DataTable>
            </template>

            <!-- Table 4: Evolution Items -->
            <template v-if="shopTab === 'evolution'">
                <h3 class="shopTab">Evolution Items</h3>
                <DataTable :value="evoItems" paginator :rows="5" responsiveLayout="scroll"
                    class="p-datatable-sm dataTable">
                    <Column field="name" header="Item" style="width: 40%"></Column>
                    <Column field="cost" header="Cost" style="width: 20%">
                        <template #body="slotProps">
                            ${{ slotProps.data.cost.toLocaleString() }}
                        </template>
                    </Column>
                    <Column field="count" header="In Bag" style="width: 20%"></Column>
                    <Column header="Action" style="width: 20%">
                        <template #body="slotProps">
                            <Button label="Buy" icon="pi pi-shopping-cart" severity="primary" size="small"
                                class="shop-btn" :disabled="inventoryStore.funds < slotProps.data.cost"
                                @click="buyEvo(slotProps.data.id)" />
                        </template>
                    </Column>
                </DataTable>
            </template>

            <!-- Table 5: Mega Evolution Items -->
            <template v-if="shopTab === 'megaEvo'">
                <h3 class="shopTab">Mega Evolution Items</h3>
                <DataTable :value="megaStones" paginator :rows="5" responsiveLayout="scroll"
                    class="p-datatable-sm dataTable">
                    <Column field="name" header="Item" style="width: 40%"></Column>
                    <Column field="cost" header="Cost" style="width: 20%">
                        <template #body="slotProps">
                            ${{ slotProps.data.cost.toLocaleString() }}
                        </template>
                    </Column>
                    <Column field="count" header="In Bag" style="width: 20%"></Column>
                    <Column header="Action" style="width: 20%">
                        <template #body="slotProps">
                            <Button label="Buy" icon="pi pi-shopping-cart" severity="primary" size="small"
                                class="shop-btn" @click="buyMega(slotProps.data.id)" />
                        </template>
                    </Column>
                </DataTable>
            </template>

        </div>
    </Modal>

    <Modal v-if="isPartyModalOpen" @close="closePartyModal">
        <div class="party-list-container">
            <div class="party-header-title">
                <span>POKÉMON PARTY</span>
                <span class="count-badge">{{ pokemonStore.pokemonParty?.length || 0 }}/6</span>
            </div>

            <div class="party-slots-wrapper">
                <div v-for="(poke, index) in paddedParty" :key="poke?.instanceId || poke?.id || 'empty-' + index"
                    class="pkmn-slot-card" :class="{
                        'is-empty': !poke,
                        'is-lead': index === 0 && poke,
                        'is-fainted': poke && (poke.currentHp <= 0)
                    }" @click="poke ? openPokemonModal(poke, index) : null">
                    <!-- FILLED SLOT -->
                    <template v-if="poke">
                        <div class="sprite-circle">
                            <img :src="poke.sprite" :alt="poke.name" class="pkmn-sprite" />
                            <span v-if="index === 0" class="lead-badge">LEAD</span>
                        </div>

                        <div class="pkmn-info-section">
                            <div class="pkmn-top-row">
                                <span class="pkmn-name">{{ poke.name }}</span>
                                <span class="pkmn-level">Lv. {{ poke.level }}</span>
                                <img v-if="STATUS_ICONS[poke.status]" :src="STATUS_ICONS[poke.status]"
                                    :alt="poke.status" class="status-pill" />
                            </div>

                            <!-- HP BAR SECTION -->
                            <div class="hp-gauge-container">
                                <span class="hp-label">HP</span>
                                <div class="hp-bar-track">
                                    <div class="hp-bar-fill" :class="getHpBarSeverity(poke)"
                                        :style="{ width: getHpPercentage(poke) + '%' }"></div>
                                </div>
                            </div>

                            <div class="hp-numeric-row">
                                <span class="hp-num">
                                    {{ Math.max(0, poke?.currentHp ?? poke?.totalHp ?? 0) }} / {{ poke?.totalHp ??
                                        poke?.maxHp ?? 0 }}
                                </span>
                            </div>
                        </div>
                    </template>

                    <!-- EMPTY SLOT -->
                    <template v-else>
                        <div class="empty-slot-bar">
                            <span class="pokeball-icon">⚪</span>
                            <span class="empty-text">SLOT {{ index + 1 }} - EMPTY</span>
                        </div>
                    </template>
                </div>
            </div>
        </div>
    </Modal>

    <Modal v-if="isPokemonModalOpen" @close="closePokemonModal">
        <div class="pokemon-details-container">
            <h3 class="pokemon-title pkmn-name">{{ selectedPokemon?.name }} Lvl {{ selectedPokemon.level }}</h3>
            <img :src="selectedPokemon?.sprite" />
            <div class="pokemon-detail-body">
                <p>Status: {{ selectedPokemon.status ?? "none" }}</p>
                <p>Held Item: {{ selectedPokemon.heldItem || "none" }}</p>
                <div class="hp-gauge-container">
                    <span class="hp-label">HP</span>
                    <div class="hp-bar-track">
                        <div class="hp-bar-fill" :class="getHpBarSeverity(selectedPokemon)"
                            :style="{ width: getHpPercentage(selectedPokemon) + '%' }"></div>
                    </div>
                </div>
                <div class="exp-gauge-container">
                    <span class="exp-label">EXP</span>
                    <div class="exp-bar-track">
                        <div class="exp-bar-fill" :style="{ width: getExpPercentage(selectedPokemon) + '%' }"></div>
                    </div>
                </div>
            </div>
            <div class="move-grid">
                <div v-for="move of selectedPokemon.moves" class="move-card"
                    :style="{ backgroundColor: pokemonStore.typeColors[move.type] }">
                    <span class="move-name">{{ move.name }}</span>
                    <span class="move-pp">{{ move.currentPP }}/{{ move.maxPP }}</span>
                </div>
            </div>
            <div class="pokemon-details-buttons">
                <Button @click="openUseItemModal">Use Item</Button>
                <Button @click="openHeldItemModal(!selectedPokemon?.heldItem)">
                    {{ selectedPokemon?.heldItem ? 'Remove Item' : 'Give Item' }}
                </Button>
            </div>
        </div>

    </Modal>

    <Modal v-if="isHeldItemModalOpen" @close="closeHeldItemModal">
        <DataTable :value="heldItems" paginator :rows="5">
            <Column header="Item">
                <template #body="{ data }">
                    <span>{{ data.name }}</span>
                </template>
            </Column>
            <Column header="Count">
                <template #body="{ data }">
                    <span>{{ data.quantity }}</span>
                </template>
            </Column>
            <Column header="Give Item">
                <template #body="{ data }">
                    <Button @click="giveHeldItem(data)">Give</Button>
                </template>
            </Column>
        </DataTable>
    </Modal>

    <Modal v-if="isUseItemModalOpen" @close="closeUseItemModal">
        <SelectButton v-model="itemTab" :options="itemTabs" optionLabel="label" optionValue="value" />
        <div v-if="itemTab === 'recovery'">
            <h3>Recovery Items</h3>
            <DataTable :value="shopRecovery.filter(item => item.count > 0)" paginator :rows="5">
                <Column field="name" header="Item">
                    <template #body="{ data }">
                        <span>{{ data.name }}</span>
                    </template>
                </Column>
                <Column header="Count" field="count">
                    <template #body="{ data }">
                        {{ data.count }}
                    </template>
                </Column>
                <Column>
                    <template #body="{ data }">
                        <Button @click="useRecoveryItem(data)">Use</Button>
                    </template>
                </Column>
            </DataTable>
        </div>
        <div v-if="itemTab === 'evoItems'">
            <h3>Evolution Items</h3>
            <DataTable :value="heldItems.filter(item => item.type === 'evo')" paginator :rows="5">
                <Column field="name" header="Item">
                    <template #body="{ data }">
                        <span>{{ data.name }}</span>
                    </template>
                </Column>
                <Column field="count" header="Count">
                    <template #body="{ data }">
                        <span>{{ data.quantity }}</span>
                    </template>
                </Column>
                <Column>
                    <template #body="{ data }">
                        <Button @click="useEvoItem(data.name)">Use</Button>
                    </template>
                </Column>
            </DataTable>
        </div>
    </Modal>

    <Modal v-if="isTrainerModalOpen" @close="closeTrainerModal">
        <div>
            <label class="w-full text-left text-sm font-semibold mb-1">Region</label>
            <Select v-model="selectedRegion" :options="regionOptions" optionLabel="label" optionValue="value"
                placeholder="Select Region" class="w-48 selector" @change="onRegionChange" />
        </div>
        <div>
            <label class="w-full text-left text-sm font-semibold mb-1">Role</label>
            <Select v-model="selectedRole" :options="roleOptions" optionLabel="label" optionValue="value"
                placeholder="Select Role" class="w-48 selector" @change="onRoleChange" />
        </div>
        <div>
            <label class="w-full text-left text-sm font-semibold mb-1">Trainer</label>
            <Select v-model="selectedTrainer" :options="trainerOptions" optionLabel="label" optionValue="value"
                placeholder="Select Trainer" class="w-48 selector" />
        </div>
        <Button @click="openTrainerBattleModal">
            Battle
        </Button>
    </Modal>

    <PokemonBattle 
    v-if="isBattleModalOpen" 
    :auto-start="true" 
    :team="selectedPokemonTeam" 
    :opponent="oppPokemon" 
    :opp-team="opponentTeam"
    :isWild="isWildBattle" @end="onBattleEnd" @close="resetBattleDetails" />
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { usePokemonStore } from '@/stores/pokemonStore';
import { useInventoryStore } from '@/stores/inventoryStore';
import { useErrorStore } from '@/stores/errorStore'
import * as pokemonHelper from "@/assets/helpers/pokemonHelper.js"
import SelectButton from 'primevue/selectbutton';
import Select from "primevue/select"
import paralysisIcon from '@/assets/statusIcons/paralysis.png';
import sleepIcon from '@/assets/statusIcons/sleep.png';
import frozenIcon from '@/assets/statusIcons/frozen.png';
import burnIcon from '@/assets/statusIcons/burn.png';
import poisonIcon from '@/assets/statusIcons/poison.png';
import Tag from 'primevue/tag'
import Column from 'primevue/column'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Modal from "@/components/Modal.vue"
import DataView from "primevue/dataview"
import wildJson from "@/assets/data/wildPokemon.json"
import PokemonBattle from "@/components/PokemonBattle.vue"
import { useSettingsStore } from '@/stores/settingsStore';
import tms from '@/assets/data/tms.json'
import evolutionItems from "@/assets/data/evolutionItems.json"
import megaEvoStones from "@/assets/data/megaEvos.json"
import expChart from "@/assets/data/levelThresholds.json"
import gymData from "@/assets/data/trainers.json"
import * as pokemonApi from "@/api/pokeapi"

// Import Maps
import overworldMap from '@/assets/data/mapData/map1.json';
import pokeMartMap from '@/assets/data/mapData/PokeMart.json';
import pokeCenterMap from '@/assets/data/mapData/PokeCenter.json';

// store setups
const pokemonStore = usePokemonStore()
const inventoryStore = useInventoryStore()
const errorStore = useErrorStore()
const settingsStore = useSettingsStore()

// modal values
const isStarterModalOpen = ref(false)
const isPokeBoxModalOpen = ref(false)
const isShopModalOpen = ref(false)
const isPartyModalOpen = ref(false)
const isPokemonModalOpen = ref(false)
const isHeldItemModalOpen = ref(false)
const isUseItemModalOpen = ref(false)
const isTrainerModalOpen = ref(false)

// Ref values
const starters = ref({})
const isGameplayPause = ref(false);
const isEncounterAnimating = ref(false);
const selectedPokemon = ref(null)
const selectedIndex = ref(null)
const itemTab = ref("recovery")
const isWildBattle = ref(true)
const opponentTeam = ref(null)
const selectedTrainer = ref(null)
const oppPokemon = ref(null)
const selectedRegion = ref(null)
const selectedRole = ref("gym_leaders")
const selectedPokemonTeam = ref(null)
const userPokemon = ref(null)

// static values
const STATUS_ICONS = {
    paralysis: paralysisIcon,
    sleep: sleepIcon,
    freeze: frozenIcon,
    burn: burnIcon,
    poison: poisonIcon
};

const itemTabs = [
    { label: "Recovery Items", value: "recovery" },
    { label: "Evolution Items", value: "evoItems" }
]

const heldItems = computed(() => {
    const allHeld = [];

    // Map Evolution Items
    if (inventoryStore.evoItems) {
        for (const [key, quantity] of Object.entries(inventoryStore.evoItems)) {
            if (quantity > 0) {
                allHeld.push({
                    id: key,
                    name: key.replace(/-/g, ' '), // e.g. "fire-stone" -> "fire stone"
                    quantity,
                    type: 'evo'
                });
            }
        }
    }

    // Map Mega Stones
    if (inventoryStore.megaStones) {
        for (const [key, quantity] of Object.entries(inventoryStore.megaStones)) {
            if (quantity > 0) {
                allHeld.push({
                    id: key,
                    name: key.replace(/-/g, ' '),
                    quantity,
                    type: 'mega'
                });
            }
        }
    }

    return allHeld;
});

// Control Functions
// #region CONTROLS
async function checkForStarter() {
    if (pokemonStore.caughtPokemon.length == 0) {
        await generateStarterList()
        isStarterModalOpen.value = true
    }
    if (pokemonStore.caughtPokemon.length > 0 && pokemonStore.pokemonParty.length === 0) {
        pokemonStore.pokemonParty.push(pokemonStore.caughtPokemon[0])
    }
}

async function generateStarterList() {
    const starterList = pokemonStore.starters;
    const result = {};

    for (const [region, pokeIds] of Object.entries(starterList)) {
        // 1. Fetch all 3 Pokemon concurrently
        const pokemonPromises = pokeIds.map((id) =>
            pokemonHelper.getPokemonWithLevelData(id, "", 5)
        );

        const regionPokemon = await Promise.all(pokemonPromises);

        // 2. Assign the flat array directly (filtering out any null/undefined results)
        result[region] = regionPokemon.filter(Boolean);
    }

    // 3. Assign to reactive state
    starters.value = result;
}

function chooseStarter(starter) {
    pokemonStore.addPokemon(starter)
    closeStarterModal()
}

function closeStarterModal() {
    starters.value = {}
    isStarterModalOpen.value = false
}

function openPokeBox() {
    isPokeBoxModalOpen.value = true
}

function closePokeBoxModal() {
    isPokeBoxModalOpen.value = false
}

function isMemberInParty(poke) {
    if (!poke || !pokemonStore.pokemonParty) return false;
    return pokemonStore.pokemonParty.some(p => p.id === poke.id);
}

function getHpPercentage(poke) {
    const current = poke?.currentHp ?? poke?.stats?.hp ?? 1;
    const max = poke?.maxHp ?? poke?.stats?.hp ?? 1;
    return Math.max(0, Math.min(100, Math.round((current / max) * 100)));
}

function getHpBarSeverity(poke) {
    const pct = getHpPercentage(poke);
    if (pct > 50) return 'hp-green';
    if (pct > 20) return 'hp-yellow';
    return 'hp-red';
}

function selectPartyMember(poke) {

    if (pokemonStore.pokemonParty.length <= 1) {
        errorStore.SetErrorDetails("Party Issue", "You can't remove your last pokemon from party!");
        return;
    }

    pokemonStore.removePokemonParty(poke);
}

function selectBoxPokemon(poke) {
    // Check if this specific instance or ID is already in party
    const isAlreadyInParty = pokemonStore.pokemonParty.some(
        p => (p.instanceId && poke.instanceId && p.instanceId === poke.instanceId) || p.id === poke.id
    );

    if (isAlreadyInParty) {
        errorStore.SetErrorDetails("Party Issue", "That pokemon is already in your party.")
        return;
    }

    if (pokemonStore.pokemonParty.length >= 6) {
        errorStore.SetErrorDetails("Party Issue", "Your party already has 6 members!");
        return;
    }

    pokemonStore.addPokemonParty(poke);
}

function calcWildWeightedLevel() {
    let totalParty = 0
    let partyLevel = 0
    for (let pokemon of pokemonStore.pokemonParty) {
        totalParty++
        partyLevel += pokemon.level
    }
    let avgLevel = partyLevel / totalParty

    function generateWeightedWildLevel(targetLevel, spread = 4) {
        // Box-Muller transform to generate a standard normal distribution value
        let u1 = Math.random();
        let u2 = Math.random();

        // Standard Normal Variate (mean = 0, stdev = 1)
        let z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

        // Scale by spread (standard deviation) and center around targetLevel
        let generatedLevel = Math.round(targetLevel + z * spread);

        // Clamp strictly between 1 and 100
        return Math.max(1, Math.min(100, generatedLevel));
    }

    let weightedLevel = generateWeightedWildLevel(avgLevel)


    console.log(`Average Level: ${avgLevel}. Wild level Level: ${weightedLevel}.`)
    return weightedLevel
}

async function generateWildPokemon() {
    let wildLevel = Number(calcWildWeightedLevel());
    let canLegend = wildLevel >= 70
    // This increases rarity of legends at lvl 70+
    let allowLegendThisRoll = canLegend && Math.random() < 0.10;
    console.log(wildLevel)
    let availablePokemon = wildJson.filter(poke => {
        // Level range check
        let levelMatches = poke.stageMin <= wildLevel && wildLevel <= poke.stageMax;

        // Non-legendaries are ALWAYS allowed. Legendaries are ONLY allowed if canLegend is true.
        let legendaryMatches = !poke.isLegendary || allowLegendThisRoll;

        return levelMatches && legendaryMatches;
    });

    if (availablePokemon.length === 0) {
        errorStore.SetErrorDetails("Collection Issue", "An error occured trying to get available wild pokemon.")
        return false
    }
    let randPoke = availablePokemon[Math.floor(Math.random() * availablePokemon.length)]
    if (!randPoke) {
        errorStore.SetErrorDetails("Cellection Issue", "An error occured trying to generate a wild pokemon.")
        return false
    }
    console.log(`Wild pokemon ${randPoke.name} has spawned at level ${wildLevel}.`)

    let wildPoke = await pokemonHelper.getPokemonWithLevelData(randPoke.name, "", wildLevel)
    if (!wildPoke) {
        errorStore.SetErrorDetails("Collection Issue", `An error occured trying to generate ${randPoke.name}`)
        return false
    }
    oppPokemon.value = wildPoke

    return true
}

async function startWildEncounter() {
    enableBattleMusic()
    clearInputs()
    isGameplayPause.value = true
    const [didGen] = await Promise.all([
        generateWildPokemon(),
        triggerEncounterAnimation()
    ]);

    // 3. Open battle or handle failure
    if (didGen) {
        openBattleModal(true);
    } else {
        disableBattleMusic();
        errorStore.SetErrorDetails("Generation Issue", "There was an issue generating the Wild Pokemon.");
    }

    isGameplayPause.value = false;
}

function onBattleEnd() {
    let canContinue = false
    disableBattleMusic()
    for (let poke of pokemonStore.pokemonParty) {
        if (poke.currentHp > 0) {
            canContinue = true
        }
    }
    isGameplayPause.value = false
    isBattleModalOpen.value = false
    if (!canContinue) {
        handlePartyFainted()
    }
    // Reset battle values
    oppPokemon.value = null
    opponentTeam.value = null
    selectedTrainer.value = null
    opponentTeam.value = null
    selectedPokemon.value = null
}

function handlePartyFainted() {
    healParty(true)
    loadMap(pokeCenterMap, 'PokeCenter', 5, 6)
    outdoorReturnPosition.value = {
        x: 31,
        y: 25
    }
    errorStore.SetErrorDetails("Blacked Out!", "All of your Pokemon fainted! You rushed to the nearest Pokemon Center.")
}

function healParty(partyFainted) {
    for (let poke of pokemonStore.pokemonParty) {
        poke.currentHp = poke.totalHp
        poke.status = null
        poke.minorStatus = []
    }
    if (!partyFainted) {
        errorStore.SetErrorDetails("PokeCenter", "Your party has been fully healed.")
    }
}

// Pre-load battle music
const BATTLE_MUSIC_URL = "https://play.pokemonshowdown.com/audio/dpp-trainer.mp3";
let bgmTrack = new Audio(BATTLE_MUSIC_URL);
bgmTrack.loop = true;
bgmTrack.preload = "auto";

function enableBattleMusic() {
    bgmTrack.currentTime = 0;
    bgmTrack.muted = Boolean(settingsStore.muteAudio);
    bgmTrack.play().catch((err) => {
        console.warn("Autoplay prevented or failed: ", err);
    });
}

function disableBattleMusic() {
    bgmTrack.pause();
    bgmTrack.currentTime = 0;
}

function triggerEncounterAnimation() {
    return new Promise((resolve) => {
        isEncounterAnimating.value = true;
        setTimeout(() => {
            isEncounterAnimating.value = false;
            resolve();
        }, 2000);
    });
}

function openShopModal() {
    clearInputs()
    isGameplayPause.value = true
    isShopModalOpen.value = true
}

function closeShopModal() {
    isGameplayPause.value = false
    isShopModalOpen.value = false
}

const shopCats = ref([
    { label: "Pokeballs", value: "pokeballs" },
    { label: "Recovery Items", value: "recovery" },
    { label: "TM Shop", value: "tms" },
    { label: "Evolution Items", value: "evolution" },
    { label: "Mega Evolution", value: "megaEvo" }
])

const shopTab = ref("pokeballs")

// --- 1. POKEBALLS COMPUTED ---
const shopPokeball = computed(() => {
    return Object.keys(inventoryStore.pokeballs).map((key) => {
        const item = inventoryStore.pokeballs[key]
        return {
            id: key,
            name: key.charAt(0).toUpperCase() + key.slice(1) + ' Ball',
            cost: item.cost,
            count: item.count
        }
    })
})

// --- 2. RECOVERY ITEMS COMPUTED ---
const shopRecovery = computed(() => {
    if (!inventoryStore.recoveryItems) return [];

    return Object.keys(inventoryStore.recoveryItems).map((key) => {
        const item = inventoryStore.recoveryItems[key] || {};
        return {
            id: key,
            name: key === 'maxrevive' ? 'Max Revive' : key.charAt(0).toUpperCase() + key.slice(1),
            cost: item.cost || 0,
            count: item.count || 0,
            type: item.effect?.type || 'recovery', // Reads type from effect sub-object
            effect: item.effect || null
        };
    });
});

// --- 3. TMs COMPUTED ---
const shopTMs = computed(() => {
    return Object.entries(tms).map(([id, tm]) => {
        return {
            id: id,                                      // 'tm01'
            code: tm.code,                               // 'TM01'
            name: `${tm.code}: ${tm.moveName}`,          // 'TM01: Mega Punch'
            type: tm.type,                               // 'normal'
            cost: tm.cost,
            count: inventoryStore.tms?.[id] || 0          // Reads dynamic bag count
        }
    })
})

// --- Evo Items COMPUTED ---
const evoItems = computed(() => {
    return Object.entries(evolutionItems).map(([id, item]) => {
        return {
            id: id,
            name: item.name,
            category: item.category,
            description: item.description,
            cost: item.cost,
            count: inventoryStore.evoItems?.[id] || 0
        }
    })
})

// --- Mega Evo Items COMPUTED ---
const megaStones = computed(() => {
    return Object.entries(megaEvoStones).map(([id, item]) => {
        return {
            id: id,
            name: item.name,
            category: item.category,
            cost: item.cost,
            pokemon: item.pokemon,
            description: item.description
        }
    })
})

// --- PURCHASE FUNCTIONS ---
function buyPokeball(itemType) {
    console.log(`Attempting to purchase pokeball: ${itemType}`)
    const success = inventoryStore.BuyPokeball(itemType, 1)
    if (!success) {
        errorStore.SetErrorDetails("Low funds", `Unable to buy a(n) ${itemType} due to lack of funds.`)
    }
}

function buyRecovery(itemType) {
    console.log(`Attempting to purchase recovery item: ${itemType}`)
    const success = inventoryStore.BuyRecovery(itemType, 1)
    if (!success) {
        errorStore.SetErrorDetails("Low funds", `Unable to buy a(n) ${itemType} due to lack of funds.`)
    }
}

function buyTM(tmId) {
    console.log(`Attempting to purchase TM: ${tmId}`)
    const success = inventoryStore.BuyTM(tmId)
    if (!success) {
        errorStore.SetErrorDetails("Low funds", `Unable to buy a(n) ${tmId} due to lack of funds.`)
    }
}

function buyEvo(evoId) {
    console.log(`Attempting to purchase Evo Item: ${evoId}`)
    const success = inventoryStore.BuyEvoItem(evoId)
    if (!success) {
        errorStore.SetErrorDetails("Low funds", `Unable to buy a(n) ${evoId} due to lack of funds.`)
    }
}

function buyMega(stoneId) {
    console.log(`Attempting to puchase Mega Item: ${stoneId}`)
    const success = inventoryStore.BuyMegaStone(stoneId)
    if (!success) {
        errorStore.SetErrorDetails("Low funds", `Unable to buy a(n) ${stoneId} due to lack of funds.`)
    }
}

const paddedParty = computed(() => {
    const party = pokemonStore.pokemonParty || [];
    const slots = [...party];
    while (slots.length < 6) {
        slots.push(null);
    }
    return slots;
});

function openPartyModal() {
    clearInputs()
    isGameplayPause.value = true
    isPartyModalOpen.value = true
}

function closePartyModal() {
    isGameplayPause.value = false
    isPartyModalOpen.value = false
}

function openPokemonModal(poke, index) {
    selectedPokemon.value = poke
    selectedIndex.value = index
    isPokemonModalOpen.value = true
}

function closePokemonModal() {
    isGameplayPause.value = false
    isPokemonModalOpen.value = false
    selectedPokemon.value = null
    selectedIndex.value = null
}

function getExpPercentage(pokemon) {
    if (!pokemon || pokemon.level >= 100) return 100;

    const requiredExp = expChart[pokemon.level + 1];
    if (!requiredExp) return 0;

    return Math.min(100, Math.floor(((pokemon.currentExp || 0) / requiredExp) * 100));
}

function openHeldItemModal(isGive) {
    if (isGive) {
        isHeldItemModalOpen.value = true;
    } else {
        const currentItem = selectedPokemon.value?.heldItem;

        if (currentItem) {
            // Check if held item is a Mega Stone or Evolution Item and return it to inventory
            if (megaEvoStones[currentItem]) {
                inventoryStore.AddMegaStone(currentItem);
            } else if (evolutionItems[currentItem]) {
                inventoryStore.AddEvoItem(currentItem);
            }

            // Clear held item from the Pokemon
            selectedPokemon.value.heldItem = "";
            console.log(`Removed ${currentItem} and returned it to inventory.`);
        }
    }
}
function closeHeldItemModal() {
    isHeldItemModalOpen.value = false
}
function openUseItemModal() {
    isUseItemModalOpen.value = true
}
function closeUseItemModal() {
    isUseItemModalOpen.value = false
}

function giveHeldItem(item) {
    let itemName = item.id
    if (evolutionItems[itemName]) {
        if (inventoryStore.UseEvoItem(itemName)) {
            selectedPokemon.value.heldItem = itemName
            closeHeldItemModal()
            return
        }
        else {
            errorStore.SetErrorDetails("Inventory Issue", `we could not give the pokemon a(n) ${itemName} at this time.`)
            return
        }
    }
    if (megaEvoStones[itemName]) {
        if (inventoryStore.UseMegaStone(itemName)) {
            selectedPokemon.value.heldItem = itemName
            closeHeldItemModal()
            return
        }
        else {
            errorStore.SetErrorDetails("Inventory Issue", `we could not give the pokemon a(n) ${itemName} at this time.`)
            return
        }
    }
    errorStore.SetErrorDetails("Collection Issue", `Unable to find item ${itemName} at this time.`)
}

async function useEvoItem(itemId) {
    const pokemon = selectedPokemon.value;
    if (!pokemon?.evoDetails || !Array.isArray(pokemon.evoDetails)) {
        errorStore.SetErrorDetails("Item Issue", `You can't evolve ${pokemon.name} using a(n) ${itemId}.`)
        console.log(`You can't evolve ${pokemon?.name} using a ${itemId}`);
        return;
    }

    // Search the array directly for a matching trigger + item
    const matchingEvo = pokemon.evoDetails.find(
        evo => evo.trigger === "use-item" && evo.item === itemId
    );

    if (matchingEvo) {
        const evoName = matchingEvo.nextEvo.name;

        // Run evolution helper
        const success = await pokemonHelper.handleEvolution(pokemon, evoName);

        if (success) {
            // Deduct stone from inventory
            inventoryStore.UseEvoItem(itemId, 1);

            // Re-sync active modal reference to newly evolved species
            selectedPokemon.value = pokemonStore.caughtPokemon.find(
                p => p.instanceId === pokemon.instanceId
            );
            closeItemModal()
            closeDetailModal();
        }
    } else {
        errorStore.SetErrorDetails("Item Issue", `You can't evolve ${pokemon.name} using a(n) ${itemId}.`)
        console.log(`You can't evolve ${pokemon.name} using a ${itemId}`);
    }
}

function useRecoveryItem(item) {
    if (!inventoryStore.recoveryItems[item.id]) {
        console.warn(`Can not find item ${item.id} in the inventory.`)
        return
    }

    const target = selectedPokemon.value;
    if (!target) return;

    switch (item.effect.type) {
        case "revive":
            if (target.currentHp <= 0) {
                if (inventoryStore.UseRecovery(item.id)) {
                    target.currentHp = Math.trunc(target.totalHp * item.effect.percent)
                }
            }
            else {
                errorStore.SetErrorDetails("Item Issue", `${target.name} has not fainted. you can't use a revive now.`)
                console.warn(`${target.name} has not fainted, a revive item cant be used.`)
            }
            break
        case "heal":
            if (target.currentHp <= 0) {
                console.warn(`${target.name} has fainted, you must use a revive item to fix this injury!`)
                return
            }
            else {
                if (target.currentHp == target.totalHp) {
                    errorStore.SetErrorDetails("Item Issue", `${target.name} is already at full health!.`)
                    console.warn(`${target.name} is already at full health!`)
                    return
                }
                if (inventoryStore.UseRecovery(item.id)) {
                    target.currentHp = Math.min(target.totalHp, target.currentHp + item.effect.amount);
                    return
                }
            }
            break
        case "status-heal":
            if (target.status !== "" && target.status) {
                if (target.status === item.effect.status)
                    target.status = ""
                inventoryStore.UseRecovery(item.id)
                return
            }
            else {
                console.log(`${target.name} is not effected by ${item.effect.status}. Can't use this item.`)
            }
            break
        case "pp-heal":
            if (item.effect.scope === "single") {
                console.log(item)
                ppRecoveryItem.value = item
                isRefillPPModalOpen.value = true
            } else if (item.effect.scope === "all") {
                if (inventoryStore.UseRecovery(item.id)) {
                    for (let move of selectedPokemon.value.moves) {
                        move.currentPP = Math.min(move.maxPP, move.currentPP + item.effect.amount)
                    }
                }
            }
            break
        case "pp-max-raise":
            ppRecoveryItem.value = item
            isRefillPPModalOpen.value = true
            break
    }
}

// Trainer battle section

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

    const rawData = gymData[selectedRegion.value]?.[selectedRole.value];
    if (!rawData) return [];

    // Champion might be a single object OR an array with 1 item
    if (selectedRole.value === 'champion') {
        const championObj = Array.isArray(rawData) ? rawData[0] : rawData;
        if (!championObj) return [];

        return [{ label: `${championObj.name} (${championObj.type})`, value: championObj }];
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

function openTrainerModal(){
    clearInputs()
    isGameplayPause.value = true
    isTrainerModalOpen.value = true

}

function closeTrainerModal(){
    isGameplayPause.value = false
    isTrainerModalOpen.value = false
}

async function openTrainerBattleModal() {
    if (!selectedTrainer.value) {
        errorStore.SetErrorDetails("Selection Issue", `You must select and opponent to battle.`)
        return
    }

    // 1. Assign pokemon party
    selectedPokemonTeam.value = pokemonStore.pokemonParty

    // 2. Hydrate the opponent's team using the 'roster' array + await
    opponentTeam.value = await pokemonApi.fetchTrainerTeam(selectedTrainer.value.roster)

    // Verify hydration succeeded
    if (!opponentTeam.value || opponentTeam.value.length < 1) {
        console.error(`Failed to hydrate opponent team!`)
        errorStore.SetErrorDetails("Collection Issue", `Unable to collect opponent team details.`)
        return
    }

    // 3. Assign active battle fighters
    userPokemon.value = selectedPokemonTeam.value[0]
    oppPokemon.value = opponentTeam.value[0]
    isTrainerModalOpen.value = false
    isWildBattle.value = false
    openBattleModal(false)
}

function resetBattleDetails(){
    oppPokemon.value = null
    userPokemon.value = null
    opponentTeam.value = null
    isWildBattle.value = true
    selectedTrainer.value = null
    selectedRegion.value = null
    selectedRole.value = null
    selectedPokemonTeam.value = null
    userPokemon.value = null
}


// #endregion

/* 
-------------------------------------
Game Controller and Map Builder logic
-------------------------------------
*/

// #region GAMEPLAY MECHANICS
const canvasRef = ref(null);

// Dynamic Map State
const activeMapData = ref(overworldMap);
const activeMapName = ref('overworld');
const outdoorReturnPosition = ref({ x: 0, y: 0 });

// Reactive Map Dimensions
const tileSize = computed(() => activeMapData.value.tilewidth);
const mapWidth = computed(() => activeMapData.value.width);
const mapHeight = computed(() => activeMapData.value.height);

// Viewport Camera Settings
const viewportWidth = computed(() => 15 * tileSize.value);
const viewportHeight = computed(() => 15 * tileSize.value);
const zoomScale = 2.8;

// Menu & Modal UI State Controls
const isMenuOpen = ref(false);
const isBattleModalOpen = ref(false);
const isDoorwayModalOpen = ref(false);
const activeBuildingName = ref('');

// Player starting position
const player = ref({
    x: Math.floor(overworldMap.width / 2),
    y: Math.floor(overworldMap.height / 2)
});

const moveSpeedPerSec = 3.2;

// Cache structure & state
const tileImages = {};
const keysPressed = {};
let animationFrameId = null;
let lastFrameTime = performance.now();

// Dynamic Collision & Special Tile Sets
const treeTileGids = new Set();
const waterTileGids = new Set();
const buildingTileGids = new Set();
const grassTileGids = new Set();
const interiorSolidGids = new Set();

// Individual Feature GID Sets for Interactions
const martCounterGids = new Set();
const centerCounterGids = new Set();
const pokeBoxPcGids = new Set();

const buildingBoxes = [];

// Discrete Tile Event States
let isCurrentlyOnDoorway = false;
let currentGridTile = {
    x: Math.floor(player.value.x),
    y: Math.floor(player.value.y)
};
const ENCOUNTER_CHANCE = 0.10;

// Placeholder Interaction Callbacks
function onPokeMartCounterContact() {
    openShopModal()
}

function onPokeCenterCounterContact() {
    healParty(false)
}

function onPokeBoxPcContact() {
    openPokeBox()
}

function clearInputs() {
    Object.keys(keysPressed).forEach((key) => {
        keysPressed[key] = false;
    });
}

function toggleMenu() {
    clearInputs();
    isMenuOpen.value = !isMenuOpen.value;
}

function selectMenuOption(option) {
    console.log(`[Menu Selected]: ${option}`);
    switch (option) {
        case "Party":
            openPartyModal()
            break
        case "Bag":
            //openBagModal()
            break
        default:
            errorStore.SetErrorDetails("Menu Issue", "There was an issue opening the selected option.")
    }
}

function openBattleModal(isWild) {
    clearInputs();
    if(isWild){
        isWildBattle.value = true
    }
    isBattleModalOpen.value = true;
}

function openDoorwayModal(buildingName) {
    clearInputs();
    activeBuildingName.value = buildingName;
    isDoorwayModalOpen.value = true;
}

function closeModals() {
    isBattleModalOpen.value = false;
    isDoorwayModalOpen.value = false;
    clearInputs();
}

// Master Map Swapping Function
async function loadMap(newMapData, mapName, spawnX, spawnY) {
    clearInputs();

    // 1. Reset dynamic collision sets for the new map
    treeTileGids.clear();
    waterTileGids.clear();
    buildingTileGids.clear();
    grassTileGids.clear();
    interiorSolidGids.clear();
    martCounterGids.clear();
    centerCounterGids.clear();
    pokeBoxPcGids.clear();
    buildingBoxes.length = 0;

    // 2. Assign active map data
    activeMapData.value = newMapData;
    activeMapName.value = mapName;

    // 3. Preload tilesets and recalculate colliders for this map
    await loadTileImages();

    // 4. Update canvas size and set player position
    const canvas = canvasRef.value;
    if (canvas) {
        canvas.width = viewportWidth.value * zoomScale;
        canvas.height = viewportHeight.value * zoomScale;
    }

    player.value = { x: spawnX, y: spawnY };
    currentGridTile = { x: Math.floor(spawnX), y: Math.floor(spawnY) };
}

function enterBuilding() {
    outdoorReturnPosition.value = { ...player.value };

    if (activeBuildingName.value === 'PokeMart') {
        const spawnX = Math.floor(pokeMartMap.width / 2);
        const spawnY = pokeMartMap.height - 2;
        loadMap(pokeMartMap, 'PokeMart', spawnX, spawnY);
    } else if (activeBuildingName.value === 'PokeCenter') {
        const spawnX = Math.floor(pokeCenterMap.width / 2);
        const spawnY = pokeCenterMap.height - 2;
        loadMap(pokeCenterMap, 'PokeCenter', spawnX, spawnY);
    } else if(activeBuildingName.value === "Gym"){
        openTrainerModal()
    }

    closeModals();
}

function exitBuilding() {
    loadMap(
        overworldMap,
        'overworld',
        outdoorReturnPosition.value.x,
        outdoorReturnPosition.value.y + 1
    );
}

async function loadTileImages() {
    const promises = [];

    activeMapData.value.tilesets.forEach((tileset) => {
        tileset.tiles?.forEach((tile) => {
            const promise = new Promise((resolve) => {
                const fileName = tile.image.split('/').pop().trim();

                const img = new Image();
                img.onload = () => resolve();
                img.onerror = () => {
                    console.error(`[Load Error] Check file name: /MapTiles/${fileName}`);
                    resolve();
                };

                img.src = `/MapTiles/${fileName}`;

                const globalId = tileset.firstgid + tile.id;

                // Overworld Colliders
                if (fileName === 'Trees.png') treeTileGids.add(globalId);
                if (fileName === 'Water.png') waterTileGids.add(globalId);
                if (fileName === 'TallGrass.png') grassTileGids.add(globalId);

                // General Interior Colliders
                if (fileName === 'PokeMartShelves.png') {
                    interiorSolidGids.add(globalId);
                }

                // Specific Interactive Feature Registration
                if (fileName === 'PokeMartCounter.png') {
                    martCounterGids.add(globalId);
                    interiorSolidGids.add(globalId);
                }

                if (fileName === 'PokeCenterCounter.png') {
                    centerCounterGids.add(globalId);
                    interiorSolidGids.add(globalId);
                }

                if (fileName === 'PokeBoxPC.png') {
                    pokeBoxPcGids.add(globalId);
                    interiorSolidGids.add(globalId);
                }

                const buildingFiles = ['Gym.png', 'EliteFour.png', 'PokeCenter.png', 'PokeMart.png'];
                if (buildingFiles.includes(fileName)) buildingTileGids.add(globalId);

                tileImages[globalId] = {
                    img,
                    fileName,
                    width: tile.imagewidth || img.naturalWidth || tileSize.value,
                    height: tile.imageheight || img.naturalHeight || tileSize.value
                };
            });

            promises.push(promise);
        });
    });

    await Promise.all(promises);

    // Scan building bounding boxes for overworld maps
    activeMapData.value.layers.forEach((layer) => {
        if (layer.type === 'tilelayer' && layer.visible) {
            layer.data.forEach((tileId, index) => {
                if (buildingTileGids.has(tileId)) {
                    const tileData = tileImages[tileId];
                    if (!tileData) return;

                    const wTiles = Math.round(tileData.width / tileSize.value);
                    const hTiles = Math.round(tileData.height / tileSize.value);

                    const anchorX = index % mapWidth.value;
                    const anchorY = Math.floor(index / mapWidth.value);

                    const leftX = anchorX;
                    const topY = anchorY - (hTiles - 1);

                    buildingBoxes.push({
                        name: tileData.fileName.replace('.png', ''),
                        leftX,
                        topY,
                        wTiles,
                        hTiles,
                        bottomY: anchorY
                    });
                }
            });
        }
    });
}

function gameLoop(currentTime) {
    const deltaTime = (currentTime - lastFrameTime) / 1000;
    lastFrameTime = currentTime;

    if (!isMenuOpen.value && !isBattleModalOpen.value && !isDoorwayModalOpen.value) {
        updatePlayerPosition(Math.min(deltaTime, 0.1));
    }

    drawMap();
    animationFrameId = requestAnimationFrame(gameLoop);
}

// Check adjacent neighbor tiles for interactive features
function checkAdjacentInteractions(tileX, tileY) {
    const adjacentOffsets = [
        { x: 0, y: -1 }, // North
        { x: 0, y: 1 },  // South
        { x: -1, y: 0 }, // West
        { x: 1, y: 0 }   // East
    ];

    for (const layer of activeMapData.value.layers) {
        if (layer.type === 'tilelayer' && layer.visible) {
            for (const offset of adjacentOffsets) {
                const checkX = tileX + offset.x;
                const checkY = tileY + offset.y;

                if (checkX >= 0 && checkX < mapWidth.value && checkY >= 0 && checkY < mapHeight.value) {
                    const tileIndex = checkY * mapWidth.value + checkX;
                    const tileId = layer.data[tileIndex];

                    if (martCounterGids.has(tileId)) {
                        onPokeMartCounterContact();
                        return;
                    }
                    if (centerCounterGids.has(tileId)) {
                        onPokeCenterCounterContact();
                        return;
                    }
                    if (pokeBoxPcGids.has(tileId)) {
                        onPokeBoxPcContact();
                        return;
                    }
                }
            }
        }
    }
}

function isSolidTile(tileX, tileY) {
    const floorX = Math.floor(tileX);
    const floorY = Math.floor(tileY);

    if (floorX < 0 || floorX >= mapWidth.value || floorY < 0 || floorY >= mapHeight.value) {
        return true;
    }

    for (const layer of activeMapData.value.layers) {
        if (layer.type === 'tilelayer' && layer.visible) {
            const tileIndex = floorY * mapWidth.value + floorX;
            const tileId = layer.data[tileIndex];

            // Check solid environmental objects
            if (treeTileGids.has(tileId) || waterTileGids.has(tileId) || interiorSolidGids.has(tileId)) {
                return true;
            }
        }
    }

    // Overworld Building Bounding Box Check
    for (const b of buildingBoxes) {
        if (
            floorX >= b.leftX &&
            floorX < b.leftX + b.wTiles &&
            floorY >= b.topY &&
            floorY < b.topY + b.hTiles
        ) {
            if (floorY === b.bottomY) return false;
            return true;
        }
    }

    return false;
}

function isGrassTile(tileX, tileY) {
    for (const layer of activeMapData.value.layers) {
        if (layer.type === 'tilelayer' && layer.visible) {
            const tileIndex = tileY * mapWidth.value + tileX;
            const tileId = layer.data[tileIndex];
            if (grassTileGids.has(tileId)) return true;
        }
    }
    return false;
}

function handleNewTileStep(tileX, tileY) {
    if (activeMapName.value !== 'overworld') {
        // Check adjacent tiles for interactive counter/PC triggers
        checkAdjacentInteractions(tileX, tileY);

        // Interior Exit Check: Step on bottom row to return outside
        if (tileY >= mapHeight.value - 1) {
            exitBuilding();
            return;
        }
    } else {
        // Overworld Doorway Contact
        const activeDoor = buildingBoxes.find(
            (b) => tileX >= b.leftX && tileX < b.leftX + b.wTiles && tileY === b.bottomY
        );

        if (activeDoor) {
            if (!isCurrentlyOnDoorway) {
                isCurrentlyOnDoorway = true;
                openDoorwayModal(activeDoor.name);
            }
        } else {
            isCurrentlyOnDoorway = false;
        }

        // Tall Grass Encounter Roll
        if (isGrassTile(tileX, tileY)) {
            if (Math.random() < ENCOUNTER_CHANCE) {
                startWildEncounter(true)
            }
        }
    }
}

function updatePlayerPosition(deltaTime) {
    let dx = 0;
    let dy = 0;

    if (keysPressed['ArrowUp'] || keysPressed['w'] || keysPressed['W']) dy -= 1;
    if (keysPressed['ArrowDown'] || keysPressed['s'] || keysPressed['S']) dy += 1;
    if (keysPressed['ArrowLeft'] || keysPressed['a'] || keysPressed['A']) dx -= 1;
    if (keysPressed['ArrowRight'] || keysPressed['d'] || keysPressed['D']) dx += 1;

    if (dx === 0 && dy === 0) return;

    if (dx !== 0 && dy !== 0) {
        dx *= 0.7071;
        dy *= 0.7071;
    }

    const step = moveSpeedPerSec * deltaTime;
    const moveX = dx * step;
    const moveY = dy * step;

    const margin = 0.2;

    if (moveX !== 0) {
        const nextX = player.value.x + moveX;
        const targetTileY1 = player.value.y + margin;
        const targetTileY2 = player.value.y + 1 - margin;

        if (moveX > 0) {
            const targetTileX = nextX + 1 - margin;
            if (!isSolidTile(targetTileX, targetTileY1) && !isSolidTile(targetTileX, targetTileY2)) {
                player.value.x = nextX;
            }
        } else {
            const targetTileX = nextX + margin;
            if (!isSolidTile(targetTileX, targetTileY1) && !isSolidTile(targetTileX, targetTileY2)) {
                player.value.x = nextX;
            }
        }
    }

    if (moveY !== 0) {
        const nextY = player.value.y + moveY;
        const targetTileX1 = player.value.x + margin;
        const targetTileX2 = player.value.x + 1 - margin;

        if (moveY > 0) {
            const targetTileY = nextY + 1 - margin;
            if (!isSolidTile(targetTileX1, targetTileY) && !isSolidTile(targetTileX2, targetTileY)) {
                player.value.y = nextY;
            }
        } else {
            const targetTileY = nextY + margin;
            if (!isSolidTile(targetTileX1, targetTileY) && !isSolidTile(targetTileX2, targetTileY)) {
                player.value.y = nextY;
            }
        }
    }

    const newGridX = Math.floor(player.value.x + 0.5);
    const newGridY = Math.floor(player.value.y + 0.5);

    if (newGridX !== currentGridTile.x || newGridY !== currentGridTile.y) {
        currentGridTile = { x: newGridX, y: newGridY };
        handleNewTileStep(newGridX, newGridY);
    }
}

function drawMap() {
    const canvas = canvasRef.value;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const playerPixelX = player.value.x * tileSize.value;
    const playerPixelY = player.value.y * tileSize.value;

    const cameraX = Math.max(0, Math.min(mapWidth.value * tileSize.value - viewportWidth.value, playerPixelX - viewportWidth.value / 2));
    const cameraY = Math.max(0, Math.min(mapHeight.value * tileSize.value - viewportHeight.value, playerPixelY - viewportHeight.value / 2));

    ctx.save();

    ctx.scale(zoomScale, zoomScale);
    ctx.translate(-cameraX, -cameraY);

    activeMapData.value.layers.forEach((layer) => {
        if (layer.type === 'tilelayer' && layer.visible) {
            layer.data.forEach((tileId, index) => {
                if (tileId === 0) return;

                const tileData = tileImages[tileId];
                if (!tileData || !tileData.img.complete || tileData.img.naturalWidth === 0) return;

                const tileX = (index % mapWidth.value) * tileSize.value;
                const tileY = Math.floor(index / mapWidth.value) * tileSize.value;

                const drawY = tileY - (tileData.height - tileSize.value);

                if (
                    tileX + tileData.width >= cameraX &&
                    tileX <= cameraX + viewportWidth.value &&
                    drawY + tileData.height >= cameraY &&
                    drawY <= cameraY + viewportHeight.value
                ) {
                    ctx.drawImage(
                        tileData.img,
                        tileX,
                        drawY,
                        tileData.width + 0.5,
                        tileData.height + 0.5
                    );
                }
            });
        }
    });

    // Draw Player Character
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(playerPixelX + 2, playerPixelY + 2, tileSize.value - 4, tileSize.value - 4);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(playerPixelX + 2, playerPixelY + 2, tileSize.value - 4, tileSize.value - 4);

    ctx.restore();
}

function handleKeyDown(event) {
    if (isMenuOpen.value || isBattleModalOpen.value || isDoorwayModalOpen.value || isGameplayPause.value) return;

    const keysToDisableScroll = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '];
    if (keysToDisableScroll.includes(event.key)) {
        event.preventDefault();
    }

    keysPressed[event.key] = true;
}

function handleKeyUp(event) {
    keysPressed[event.key] = false;
}

onMounted(async () => {
    await nextTick();

    // Initialize overworld map
    await loadMap(
        overworldMap,
        'overworld',
        Math.floor(overworldMap.width / 2),
        Math.floor(overworldMap.height / 2)
    );

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('keyup', handleKeyUp, { capture: true });
    window.addEventListener('blur', clearInputs);

    lastFrameTime = performance.now();
    animationFrameId = requestAnimationFrame(gameLoop);

    checkForStarter()

});

onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown, { capture: true });
    window.removeEventListener('keyup', handleKeyUp, { capture: true });
    window.removeEventListener('blur', clearInputs);

    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
});

// #endregion
</script>

<style scoped>
/* ==========================================================================
   1. MAIN GAME & VIEWPORT
   ========================================================================== */
.game-container {
    display: flex;
    justify-content: center;
    align-items: center;
    background: #111;
    width: 100vw;
    height: 80vh;
    margin: 0;
    padding: 0;
    overflow: hidden;
    box-sizing: border-box;
}

.viewport-wrapper {
    position: relative;
    display: inline-block;
    max-width: 90vw;
    max-height: 90vh;
}

canvas {
    display: block;
    image-rendering: pixelated;
    border: 3px solid #444;
    box-shadow: 0 0 20px rgba(0, 0, 0, 0.8);
    max-width: 90vw;
    max-height: 90vh;
    object-fit: contain;
}

/* ==========================================================================
   2. OVERLAYS & HUD MENUS
   ========================================================================== */
.hud-menu-btn {
    position: absolute;
    top: 12px;
    right: 12px;
    z-index: 50;
    background: #2c3e50;
    color: #fff;
    border: 2px solid #ecf0f1;
    padding: 6px 12px;
    border-radius: 6px;
    font-weight: bold;
    cursor: pointer;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4);
}

.hud-menu-btn:hover {
    background: #34495e;
}

.menu-overlay,
.modal-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.65);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 100;
    backdrop-filter: blur(2px);
    box-sizing: border-box;
}

.menu-overlay {
    background: rgba(0, 0, 0, 0.4);
    justify-content: flex-end;
    align-items: flex-start;
    padding: 50px 12px 12px 12px;
    z-index: 90;
}

.menu-card {
    background: #2b2b2b;
    border: 3px solid #e74c3c;
    border-radius: 8px;
    width: 160px;
    padding: 12px;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.7);
}

.menu-header,
.panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid #333;
    padding-bottom: 6px;
    margin-bottom: 8px;
}

.menu-header h2 {
    margin: 0;
    font-size: 1rem;
    color: #f1c40f;
}

.panel-header h3 {
    margin: 0;
    font-size: 0.85rem;
    color: #f1c40f;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.close-btn {
    background: none;
    border: none;
    color: #aaa;
    font-size: 1rem;
    cursor: pointer;
}

.menu-list {
    list-style: none;
    padding: 0;
    margin: 0;
}

.menu-list li {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border-radius: 4px;
    color: #fff;
    font-size: 0.9rem;
    font-weight: bold;
    cursor: pointer;
    transition: background 0.15s;
}

.menu-list li:hover {
    background: #333;
    color: #f1c40f;
}

.menu-list .icon {
    font-size: 1rem;
}

/* ==========================================================================
   3. STANDARD MODAL DIALOGS
   ========================================================================== */
.modal-card {
    background: #222;
    border: 2px solid #555;
    border-radius: 8px;
    padding: 16px 20px;
    color: #fff;
    text-align: center;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.7);

    /* FORCE SHRINK TO CONTENT */
    width: max-content !important;
    max-width: 240px !important;
    min-width: 200px;
    box-sizing: border-box !important;
    margin: auto;
}

.modal-card h2 {
    margin-top: 0;
    color: #f1c40f;
    font-size: 1.1rem;
}

.modal-card p {
    color: #ccc;
    margin-bottom: 16px;
    font-size: 0.85rem;
}

.modal-actions {
    display: flex;
    gap: 10px;
    justify-content: center;
}

.modal-btn,
.select-btn {
    background: #e74c3c;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    font-weight: bold;
    cursor: pointer;
    transition: background 0.2s, transform 0.1s;
}

.modal-btn.primary,
.select-btn {
    background: #2ecc71;
}

.modal-btn.secondary {
    background: #7f8c8d;
}

.modal-btn:hover,
.select-btn:hover {
    opacity: 0.9;
}

/* ==========================================================================
   4. POKÉBOX SYSTEM (WIDE SPLIT & STORAGE)
   ========================================================================== */
/* Break out of narrow Modal constraints */
:deep(.modal-overlay .modal-card),
:deep(.box-modal-wide .modal-card) {
    width: 85vw !important;
    max-width: 1000px !important;
    padding: 12px !important;
    background: #181818 !important;
    border: 2px solid #333 !important;
    text-align: left !important;
}

.box-layout-container {
    display: flex;
    gap: 12px;
    width: 100%;
    height: 520px;
    background: #121212;
    border-radius: 6px;
    overflow: hidden;
    color: #fff;
}

/* Left Panel: Party Column (280px Fixed Width) */
.panel-left {
    width: 280px;
    flex-shrink: 0;
    background: #1a1a1a;
    border-right: 1px solid #2a2a2a;
    padding: 12px;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
}

.party-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.party-card-row {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #222;
    border: 1px solid #333;
    border-radius: 6px;
    padding: 6px 10px;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
}

.party-card-row:hover {
    background: #2a2a2a;
    border-color: #2ecc71;
}

.party-sprite-icon {
    width: 40px;
    height: 40px;
    image-rendering: pixelated;
}

.party-details {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.party-top {
    display: flex;
    justify-content: space-between;
    font-size: 0.8rem;
    font-weight: bold;
}

.poke-name {
    text-transform: capitalize;
    color: #fff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 110px;
}

.poke-lvl {
    color: #2ecc71;
}

.hp-row {
    display: flex;
    align-items: center;
    gap: 6px;
}

.hp-bar-track {
    flex: 1;
    height: 6px;
    background: #333;
    border-radius: 3px;
    overflow: hidden;
}

.hp-bar-fill {
    height: 100%;
    transition: width 0.25s ease;
}

.hp-bar-fill.hp-green {
    background-color: #2ecc71;
}

.hp-bar-fill.hp-yellow {
    background-color: #f1c40f;
}

.hp-bar-fill.hp-red {
    background-color: #e74c3c;
}

.hp-num {
    font-size: 0.65rem;
    color: #888;
}

/* Right Panel: Storage Box Column (Flexible Width) */
.panel-right {
    flex: 1;
    background: #141414;
    padding: 12px;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    overflow: hidden;
}

.box-dataview-paginated {
    display: flex;
    flex-direction: column;
    height: 100%;
    justify-content: space-between;
}

.box-grid-30 {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 8px;
    padding: 4px;
}

.box-slot-card {
    background: #202020;
    border: 1px solid #333;
    border-radius: 6px;
    padding: 6px 4px;
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
    transition: border-color 0.15s, transform 0.15s;
}

.box-slot-card:hover {
    border-color: #f1c40f;
    transform: translateY(-2px);
}

.box-slot-card.in-party-outline {
    border: 2px solid #3498db;
    box-shadow: 0 0 8px rgba(52, 152, 219, 0.4);
    background: #142230;
}

.box-sprite-icon {
    width: 44px;
    height: 44px;
    image-rendering: pixelated;
}

.box-name-label {
    font-size: 0.7rem;
    font-weight: bold;
    color: #fff;
    text-transform: capitalize;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
}

.box-lvl-label {
    font-size: 0.65rem;
    color: #666;
}

/* PrimeVue Paginator Custom Theme */
:deep(.p-paginator) {
    background: transparent !important;
    border: none !important;
    padding: 4px 0 !important;
}

:deep(.p-paginator .p-paginator-page),
:deep(.p-paginator .p-paginator-first),
:deep(.p-paginator .p-paginator-prev),
:deep(.p-paginator .p-paginator-next),
:deep(.p-paginator .p-paginator-last) {
    color: #aaa !important;
    background: #1e1e1e !important;
    border: 1px solid #333 !important;
    min-width: 2rem !important;
    height: 2rem !important;
    border-radius: 4px !important;
    margin: 0 2px !important;
}

:deep(.p-paginator .p-paginator-page.p-highlight) {
    background: #34495e !important;
    color: #f1c40f !important;
    border-color: #f1c40f !important;
}

/* ==========================================================================
   5. STARTER SELECTION DISPLAY
   ========================================================================== */
.starters-wrapper {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding: 1rem;
    max-height: 80vh;
    overflow-y: auto;
    box-sizing: border-box;
}

.region-section {
    background: #1e1e1e;
    border: 1px solid #333;
    border-radius: 8px;
    padding: 1rem;
}

.region-title {
    color: #f1c40f;
    font-size: 1rem;
    font-weight: bold;
    letter-spacing: 1px;
    margin: 0 0 1rem 0;
    padding-bottom: 0.4rem;
    border-bottom: 2px solid #333;
}

.grid-container {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    width: 100%;
}

.starter-card {
    background: #282828;
    border: 2px solid #444;
    border-radius: 8px;
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    transition: transform 0.2s, border-color 0.2s;
}

.starter-card:hover {
    transform: translateY(-3px);
    border-color: #f1c40f;
}

.card-header {
    display: flex;
    justify-content: space-between;
    width: 100%;
    font-size: 0.75rem;
    font-weight: bold;
}

.poke-id {
    color: #888;
}

.poke-sprite {
    width: 80px;
    height: 80px;
    image-rendering: pixelated;
    margin: 0.25rem 0;
}

.type-badges {
    display: flex;
    gap: 0.3rem;
    margin-bottom: 0.75rem;
}

.type-tag {
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 0.65rem;
    font-weight: bold;
    text-transform: uppercase;
    color: #fff;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
}

.encounter-flash-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 10;
    pointer-events: none;
    /* Updated to match the 2-second timeout (2s) */
    animation: pokemonEncounterFlash 2s ease-in-out forwards;
}

@keyframes pokemonEncounterFlash {

    /* Spread the rapid white flashes out over 0% - 75% */
    0% {
        background-color: rgba(255, 255, 255, 0);
    }

    15% {
        background-color: rgba(255, 255, 255, 0.95);
    }

    25% {
        background-color: rgba(255, 255, 255, 0.1);
    }

    40% {
        background-color: rgba(255, 255, 255, 0.95);
    }

    50% {
        background-color: rgba(0, 0, 0, 0.2);
    }

    65% {
        background-color: rgba(255, 255, 255, 0.95);
    }

    75% {
        background-color: rgba(255, 255, 255, 0.1);
    }

    /* Smooth fade to black for the final 25% */
    90% {
        background-color: rgba(0, 0, 0, 1);
    }

    100% {
        background-color: rgba(0, 0, 0, 1);
    }


}

/* ==========================================================================
   PARTY DISPLAY SECTION
   ========================================================================== */
.party-list-container {
    width: 100%;
    max-width: 26rem;
    background: #1e293b;
    border: 3px solid #0f172a;
    border-radius: 12px;
    padding: 1rem;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
    color: #ffffff;
    font-family: monospace, sans-serif;
}

.party-header-title {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 800;
    font-size: 1rem;
    letter-spacing: 0.05em;
    padding-bottom: 0.75rem;
    border-bottom: 2px solid #334155;
    margin-bottom: 0.75rem;
    color: #cbd5e1;
}

.count-badge {
    background: #334155;
    padding: 0.2rem 0.5rem;
    border-radius: 6px;
    font-size: 0.8rem;
}

.party-slots-wrapper {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

/* Individual Slot Card */
.pkmn-slot-card {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 0.75rem;
    background: #334155;
    border: 2px solid #475569;
    border-radius: 10px;
    position: relative;
    box-sizing: border-box;
    transition: all 0.15s ease;
}

/* Lead Pokemon Highlight */
.pkmn-slot-card.is-lead {
    background: #1e3a8a;
    border-color: #3b82f6;
}

/* Fainted State */
.pkmn-slot-card.is-fainted {
    opacity: 0.6;
    background: #451a1a;
    border-color: #991b1b;
}

/* Sprite Container */
.sprite-circle {
    width: 52px;
    height: 52px;
    background: rgba(0, 0, 0, 0.25);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    flex-shrink: 0;
}

.pkmn-sprite {
    width: 56px;
    height: 56px;
    image-rendering: pixelated;
}

.lead-badge {
    position: absolute;
    bottom: -4px;
    background: #ef4444;
    color: #fff;
    font-size: 0.55rem;
    font-weight: 800;
    padding: 1px 4px;
    border-radius: 4px;
    letter-spacing: 0.05em;
}

/* Info Section */
.pkmn-info-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
}

.pkmn-top-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.pkmn-name {
    font-weight: 700;
    font-size: 0.95rem;
    text-transform: capitalize;
    letter-spacing: 0.02em;
}

.pkmn-level {
    font-size: 0.8rem;
    color: #94a3b8;
    font-weight: 600;
}

/* Health Gauge Bar */
.hp-gauge-container {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    margin-top: 0.2rem;
}

.hp-label {
    font-size: 0.65rem;
    font-weight: 800;
    color: #f59e0b;
}

.hp-bar-track {
    flex: 1;
    height: 10px;
    background: #0f172a;
    border: 1px solid #64748b;
    border-radius: 5px;
    padding: 1px;
    box-sizing: border-box;
}

.hp-bar-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.3s ease;
}

.hp-bar-fill.ok {
    background: #22c55e;
}

.hp-bar-fill.warn {
    background: #eab308;
}

.hp-bar-fill.crit {
    background: #ef4444;
}

.hp-numeric-row {
    text-align: right;
}

.hp-num {
    font-size: 0.75rem;
    color: #cbd5e1;
    font-variant-numeric: tabular-nums;
}

/* Empty Slot Bar */
.pkmn-slot-card.is-empty {
    background: rgba(15, 23, 42, 0.4);
    border: 2px dashed #475569;
    justify-content: center;
    min-height: 56px;
}

.pkmn-slot-card:hover {
    cursor: pointer;
    border: 2px CanvasText solid;
}

.empty-slot-bar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #64748b;
    font-size: 0.8rem;
    font-weight: 700;
}

.status-pill,
.status-icon {
    width: 50px;
    height: 12px;
    object-fit: contain;
    image-rendering: pixelated;
    vertical-align: middle;
    border-radius: 3px;
}

/* ==========================================================================
   POKEMART DISPLAY SECTION
   ========================================================================== */
.pokeball-icon {
    font-size: 0.9rem;
    opacity: 0.5;
}

.shop-container {
    max-width: 600px;
    margin: 0 auto;
    padding: 1rem;
}

.shop-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
}

.funds-tag {
    font-size: 1.1rem;
    padding: 0.5rem 1rem;
}

.shop-btn:hover {
    cursor: pointer;
}

.dataTable {
    border: 5px solid CanvasText;
    border-radius: 5px;
    padding: 5px;
    margin-bottom: 1.5rem;
}

.shopTab {
    border-bottom: 1px solid CanvasText;
    margin-top: 1.5rem;
    margin-bottom: 0.5rem;
}

.tm-item-cell {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.tm-type-badge {
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    color: #ffffff;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    letter-spacing: 0.05em;
    min-width: 4.5rem;
    text-align: center;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.tm-name-text {
    font-weight: 600;
}

.shopSelection {
    display: flex;
    justify-content: center;
}

/* ==========================================================================
   POKEMON DETAILS DISPLAY SECTION
   ========================================================================== */
.pokemon-details-container {
    background-color: Canvas;
    border: 3px solid CanvasText;
    border-radius: 5px;
    padding: 10px;
}

.pokemon-details-container h3 {
    border-bottom: 1px solid CanvasText;
    padding: 0rem 1rem 0rem 1rem;
    text-align: center;
}

.pokemon-details-container img {
    display: flex;
    margin: auto;
}

.pokemon-detail-body {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 1rem;
    width: 100%;
    box-sizing: border-box;

}

.pokemon-details-buttons {
    display: flex;
    flex-direction: row;
    justify-content: center;
    gap: 1rem;
}

.exp-gauge-container {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    margin-top: 0.2rem;
}

.exp-label {
    font-size: 0.65rem;
    font-weight: 800;
    color: #3b82f6;
    /* Blue EXP label */
}

.exp-bar-track {
    flex: 1;
    height: 6px;
    /* Slightly thinner than HP track for visual hierarchy */
    background: #0f172a;
    border: 1px solid #64748b;
    border-radius: 3px;
    padding: 1px;
    box-sizing: border-box;
}

.exp-bar-fill {
    height: 100%;
    border-radius: 2px;
    background: #3b82f6;
    /* Classic cyan/blue Pokemon EXP bar */
    transition: width 0.3s ease;
}

.move-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    margin: 10px;
}

.move-card {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    min-width: 150px;
    max-height: 100px;
}

.move-card span {
    text-transform: capitalize;
    color: Canvas;
}

@media (max-width: 768px) {
    .grid-container {
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    }
}
</style>

<style>
html,
body {
    margin: 0;
    padding: 0;
    overflow: hidden;
    background-color: #111;
}
</style>