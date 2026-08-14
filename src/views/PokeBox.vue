<script setup>
import { ref, computed } from "vue"
import { usePokemonStore } from "@/stores/pokemonStore";
import Card from "primevue/card"
import Modal from "@/components/Modal.vue"
import DataView from "primevue/dataview"
import DataTable from "primevue/datatable"
import Column from "primevue/column"
import Button from "primevue/button"
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import { useInventoryStore } from "@/stores/inventoryStore";
import tmData from '@/assets/data/tms.json';

const pokemonStore = usePokemonStore()
const inventoryStore = useInventoryStore()

const searchQuery = ref('')
const sortKey = ref(null)
const sortOrder = ref(null)
const sortField = ref(null)
const isTmModalOpen = ref(false)
const isReplaceModalOpen = ref(false);
const pendingNewMove = ref(null);
const pendingTmId = ref(null);

function openReplaceMoveModal(newMove, tmId) {
    pendingNewMove.value = newMove;
    pendingTmId.value = tmId;
    isReplaceModalOpen.value = true;
}

function closeReplaceMoveModal() {
    isReplaceModalOpen.value = false;
    pendingNewMove.value = null;
    pendingTmId.value = null;
}

function confirmReplaceMove(indexToReplace) {
    const target = selectedPokemon.value;
    if (!target || !pendingNewMove.value || pendingTmId.value === null) return;

    // Use TM from store
    if (inventoryStore.UseTM(pendingTmId.value)) {
        // Overwrite selected move slot
        target.moves[indexToReplace] = pendingNewMove.value;

        closeReplaceMoveModal();
        closeTmModal();
    }
}

const openTmModal = () => {
    isTmModalOpen.value = true;
};

const closeTmModal = () => {
    isTmModalOpen.value = false;
};

const tmInventory = computed(() => {
    return Object.entries(inventoryStore.tms || {})
        .filter(([_, count]) => count > 0)
        .map(([id, count]) => {
            const tm = tmData[id];
            return {
                id,
                code: tm?.code || id.toUpperCase(),
                moveName: tm?.moveName || 'Unknown Move',
                move: tm?.move,
                type: tm?.type || 'normal',
                count
            };
        });
});

async function handleUseTM(tmItem) {
    const target = selectedPokemon.value;
    if (!target) return;

    // 1. Check if Pokémon ALREADY knows this move
    const alreadyKnows = target.moves.some(m => m.name.toLowerCase() === tmItem.moveName.toLowerCase());
    if (alreadyKnows) {
        console.warn(`${target.name} already knows ${tmItem.moveName}!`);
        return;
    }

    try {
        // 2. Fetch Pokémon species data to check if it CAN learn this TM
        const pResp = await fetch(`https://pokeapi.co/api/v2/pokemon/${target.name.toLowerCase()}`);
        const pData = await pResp.json();

        const canLearn = pData.moves.some(m => m.move.name.toLowerCase() === tmItem.move.toLowerCase());
        if (!canLearn) {
            console.warn(`${target.name} cannot learn ${tmItem.moveName}!`);
            alert(`${target.name} is not compatible with ${tmItem.code} (${tmItem.moveName}).`);
            return;
        }

        // 3. Fetch move details
        const mResp = await fetch(`https://pokeapi.co/api/v2/move/${tmItem.move}`);
        const mData = await mResp.json();

        const newMove = {
            name: tmItem.moveName,
            type: tmItem.type,
            class: mData.damage_class?.name || 'status',
            power: mData.power || 0,
            accuracy: mData.accuracy || 100
        };

        // 4. Handle Moveset Capacity (Max 4 Moves)
        if (target.moves.length < 4) {
            if (inventoryStore.UseTM(tmItem.id)) {
                target.moves.push(newMove);
                closeTmModal();
            }
        } else {
            // Trigger Move Replacement Modal!
            openReplaceMoveModal(newMove, tmItem.id);
        }

    } catch (err) {
        console.error("Error verifying TM learning compatibility:", err);
    }
}

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

const selectedPokemon = ref(null)
const isDetailModalOpen = ref(false)
const selectedPokemonIndex = ref(null)
const isItemModalOpen = ref(false)

function ReleasePokemon() {
    if (selectedPokemonIndex.value !== null) {
        pokemonStore.releasePokemon(selectedPokemonIndex.value)
    }
    closeDetailModal()
}

const openDetailsModal = (pokemon, index) => {
    selectedPokemon.value = pokemon
    selectedPokemonIndex.value = index
    isDetailModalOpen.value = true
}

const closeDetailModal = () => {
    isDetailModalOpen.value = false
}

const itemInventory = computed(() => {
    return Object.entries(inventoryStore.recoveryItems).map(([id, item]) => {
        const formattedName = id
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, (str) => str.toUpperCase())
            .replace('revive', ' Revive')
            .trim();

        let effectDescription = '';
        if (item.effect.type === 'revive') {
            effectDescription = `Revives with ${item.effect.percent * 100}% HP`;
        } else if (item.effect.type === 'heal') {
            effectDescription = `Heals ${item.effect.amount} HP`;
        }

        return {
            id,
            name: formattedName,
            count: item.count,
            cost: item.cost,
            effect: item.effect,
            effectDescription
        };
    });
});

const openItemModal = () => {
    isItemModalOpen.value = true
}

const closeItemModal = () => {
    isItemModalOpen.value = false
}

function handleUseItem(item) {
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
                console.warn(`${target.name} has not fainted, a revive item cant be used.`)
            }
        case "heal":
            if (target.currentHp <= 0) {
                console.warn(`${target.name} has fainted, you must use a revive item to fix this injury!`)
                return
            }
            else {
                if (target.currentHp == target.totalHp) {
                    console.warn(`${target.name} is already at full health!`)
                    return
                }
                if (inventoryStore.UseRecovery(item.id)) {
                    target.currentHp = Math.min(target.totalHp, target.currentHp + 20);
                    return
                }

            }
    }
}

// Helper functions for health bar calculations
function hpPercent(p) {
    if (!p || !p.totalHp) return 0;
    return Math.max(0, Math.min(100, (p.currentHp / p.totalHp) * 100));
}

function hpTone(p) {
    const pct = hpPercent(p);
    return pct > 50 ? 'ok' : pct > 20 ? 'warn' : 'crit';
}

</script>

<template>
    <DataView :value="filteredPokemon" layout="grid" paginator :rows="12">
        <template #header>
            <div class="flex flex-column sm:flex-row justify-content-between gap-3">
                <IconField iconPosition="left">
                    <InputIcon class="pi pi-search" />
                    <InputText v-model="searchQuery" placeholder="Search caught Pokémon..." />
                </IconField>

                <Select v-model="sortKey" :options="sortOptions" optionLabel="label" placeholder="Sort By"
                    @change="onSortChange" />
            </div>
        </template>

        <template #grid="slotProps">
            <div class="pokemon-grid">
                <Card v-for="(pokemon, index) in slotProps.items" :key="pokemon.id + '-' + index"
                    class="w-full pokemonCard" @click="openDetailsModal(pokemon, index)">
                    <template #title>
                        <span class="pokemon-card-title">{{ pokemon.name }} Lvl {{ pokemon.level }}</span>
                    </template>
                    <template #header>
                        <div class="sprite-container">
                            <img class="pokemon-sprite" :src="pokemon.sprite" :alt="pokemon.name" />
                        </div>
                    </template>
                </Card>
            </div>
        </template>
    </DataView>

    <!-- POKÉMON DETAIL MODAL -->
    <Modal v-if="isDetailModalOpen" @close="closeDetailModal">
        <div v-if="selectedPokemon" class="detailModal">
            <!-- HEADER: Sprite + Name + Level + Types -->
            <div class="pokemon-header">
                <div class="sprite-wrapper">
                    <img :src="selectedPokemon.sprite" :alt="selectedPokemon.name" class="pokemon-avatar" />
                </div>

                <div class="header-info">
                    <div class="title-row">
                        <h2 class="pokemon-name">{{ selectedPokemon.name }}</h2>
                        <span class="level-badge">Lvl {{ selectedPokemon.level }}</span>
                    </div>

                    <!-- TYPE BADGES -->
                    <div class="types-row">
                        <span v-for="type in selectedPokemon.types" :key="type" class="type-pill"
                            :style="{ backgroundColor: pokemonStore.typeColors[type] || 'var(--p-primary-color)' }">
                            {{ type }}
                        </span>
                    </div>
                </div>
            </div>

            <!-- HEALTH BAR SECTION -->
            <div class="stats-section">
                <div class="hp-header">
                    <span class="hp-label">HP</span>
                    <span class="hp-value">
                        {{ Math.max(0, selectedPokemon.currentHp) }} / {{ selectedPokemon.totalHp }}
                    </span>
                </div>
                <div class="hp-track">
                    <div class="hp-fill" :class="hpTone(selectedPokemon)"
                        :style="{ width: hpPercent(selectedPokemon) + '%' }" />
                </div>
            </div>

            <!-- MOVESET GRID (4 Moves) -->
            <div class="moves-section">
                <h3 class="section-title">Moveset</h3>
                <div class="moves-grid">
                    <div v-for="move in selectedPokemon.moves" :key="move.name" class="move-card">
                        <div class="move-main">
                            <span class="move-name">{{ move.name }}</span>
                            <span class="move-type" :style="{ color: pokemonStore.typeColors[move.type] || 'inherit' }">
                                {{ move.type }}
                            </span>
                        </div>
                        <div class="move-stats">
                            <span class="move-class-badge" :class="move.class">{{ move.class }}</span>
                            <span class="move-power">PWR: {{ move.power || '—' }}</span>
                        </div>
                    </div>

                    <!-- Fallback if Pokémon has fewer than 4 moves -->
                    <div v-if="!selectedPokemon.moves?.length" class="empty-moves">
                        No moves learned yet.
                    </div>
                </div>
            </div>

            <!-- ACTION BUTTONS: 2 Top (Heal + TM), 1 Bottom (Release) -->
            <div class="modal-actions">
                <div class="top-actions">
                    <Button label="Heal / Recover" icon="pi pi-heart-fill" severity="success" class="action-btn"
                        @click="openItemModal" />
                    <Button label="Use TM" icon="pi pi-bolt" severity="info" class="action-btn" @click="openTmModal" />
                </div>
                <Button label="Release Pokémon" icon="pi pi-trash" severity="danger" variant="outlined" class="full-btn"
                    @click="ReleasePokemon" />
            </div>
        </div>
    </Modal>

    <!-- RECOVERY ITEM SELECTION MODAL -->
    <Modal v-if="isItemModalOpen" @close="closeItemModal">
        <div class="itemModal-container">
            <h3 class="section-title mb-2">Select Recovery Item</h3>
            <DataTable :value="itemInventory" responsiveLayout="scroll" class="p-datatable-sm itemMenu">
                <Column field="name" header="Item" style="width: 30%"></Column>
                <Column field="effectDescription" header="Effect" style="width: 35%"></Column>
                <Column field="count" header="In Bag" style="width: 15%"></Column>
                <Column header="Action" style="width: 20%">
                    <template #body="slotProps">
                        <Button label="Use" severity="primary" size="small" :disabled="slotProps.data.count <= 0"
                            @click="handleUseItem(slotProps.data)" />
                    </template>
                </Column>
            </DataTable>
        </div>
    </Modal>

    <!-- TM SELECTION MODAL -->
    <Modal v-if="isTmModalOpen" @close="closeTmModal">
        <div class="itemModal-container">
            <h3 class="section-title mb-2">Select TM to Teach</h3>
            <DataTable :value="tmInventory" responsiveLayout="scroll" paginator :rows="5"
                class="p-datatable-sm itemMenu">
                <Column field="code" header="TM" style="width: 20%"></Column>
                <Column field="moveName" header="Move" style="width: 35%">
                    <template #body="slotProps">
                        <span class="tm-type-pill"
                            :style="{ backgroundColor: pokemonStore.typeColors[slotProps.data.type] || '#777' }">
                            {{ slotProps.data.moveName }}
                        </span>
                    </template>
                </Column>
                <Column field="count" header="In Bag" style="width: 20%"></Column>
                <Column header="Action" style="width: 25%">
                    <template #body="slotProps">
                        <Button label="Teach" severity="info" size="small" :disabled="slotProps.data.count <= 0"
                            @click="handleUseTM(slotProps.data)" />
                    </template>
                </Column>
            </DataTable>
        </div>
    </Modal>

    <!-- REPLACE MOVE SELECTION MODAL -->
    <Modal v-if="isReplaceModalOpen" @close="closeReplaceMoveModal">
        <div class="itemModal-container" v-if="pendingNewMove">
            <h3 class="section-title mb-2">
                Select a move for {{ selectedPokemon.name }} to forget for {{ pendingNewMove.name }}:
            </h3>

            <div class="replace-grid">
                <div v-for="(move, index) in selectedPokemon.moves" :key="move.name" class="move-card replace-card"
                    @click="confirmReplaceMove(index)">
                    <div class="move-main">
                        <span class="move-name">{{ move.name }}</span>
                        <span class="move-type" :style="{ color: pokemonStore.typeColors[move.type] || 'inherit' }">
                            {{ move.type }}
                        </span>
                    </div>
                    <div class="move-stats">
                        <span class="move-class-badge" :class="move.class">{{ move.class }}</span>
                        <span class="move-power">PWR: {{ move.power || '—' }}</span>
                    </div>
                    <Button label="Forget This Move" severity="danger" size="small" class="mt-2 w-full" />
                </div>
            </div>
        </div>
    </Modal>
</template>

<style scoped>
/* Main Box Grid */
.pokemon-grid {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 1rem;
    margin-top: 1rem;
}

.pokemonCard {
    transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.pokemonCard:hover {
    cursor: pointer;
    transform: translateY(-2px);
    background-color: darkgray;
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

.pokemon-card-title {
    font-size: 0.95rem;
    font-weight: 600;
    text-transform: capitalize;
}

:deep(.p-card-body),
:deep(.p-card-caption) {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
}

/* Detail Modal Layout */
.detailModal {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    padding: 1.5rem;
    width: 100%;
    max-width: 28rem;
    box-sizing: border-box;
    text-align: left;
    background-color: Canvas;
    border: 3px solid CanvasText;
    border-radius: 5px;
}

/* Header & Avatar */
.pokemon-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding-bottom: 0.875rem;
    border-bottom: 1px solid var(--p-content-border-color);
}

.sprite-wrapper {
    width: 5rem;
    height: 5rem;
    flex: none;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--p-surface-100);
    border-radius: var(--p-content-border-radius);
    border: 1px solid var(--p-content-border-color);
}

.pokemon-avatar {
    width: 4.5rem;
    height: 4.5rem;
    object-fit: contain;
    image-rendering: pixelated;
}

.header-info {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
}

.title-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.pokemon-name {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 700;
    text-transform: capitalize;
}

.level-badge {
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.15rem 0.45rem;
    border-radius: 4px;
    background: var(--p-surface-200);
    color: var(--p-text-muted-color);
}

.types-row {
    display: flex;
    gap: 0.375rem;
}

.type-pill {
    font-size: 0.6875rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #ffffff;
    padding: 0.2rem 0.55rem;
    border-radius: 12px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
}

/* Health Bar Section */
.stats-section {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
}

.hp-header {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    font-weight: 600;
}

.hp-label {
    color: var(--p-text-muted-color);
}

.hp-value {
    font-variant-numeric: tabular-nums;
}

.hp-track {
    width: 100%;
    height: 10px;
    border-radius: 5px;
    background: var(--p-surface-200);
    overflow: hidden;
}

.hp-fill {
    height: 100%;
    border-radius: 5px;
    transition: width 0.4s ease-out, background-color 0.3s;
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

/* Moveset Grid */
.moves-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.section-title {
    margin: 0;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--p-text-muted-color);
}

.moves-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
}

.move-card {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 0.5rem 0.625rem;
    background: var(--p-content-background);
    border: 1px solid var(--p-content-border-color);
    border-radius: var(--p-content-border-radius);
}

.move-main {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.move-name {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: capitalize;
}

.move-type {
    font-size: 0.625rem;
    font-weight: 700;
    text-transform: uppercase;
}

.move-stats {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 0.375rem;
}

.move-class-badge {
    font-size: 0.625rem;
    font-weight: 600;
    text-transform: capitalize;
    color: var(--p-text-muted-color);
}

.move-power {
    font-size: 0.625rem;
    font-variant-numeric: tabular-nums;
    color: var(--p-text-muted-color);
}

.empty-moves {
    grid-column: span 2;
    font-size: 0.75rem;
    color: var(--p-text-muted-color);
    text-align: center;
    padding: 1rem;
}

/* Modal Action Buttons (Stacked Layout) */
.modal-actions {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 0.5rem;
}

.top-actions {
    display: flex;
    gap: 0.5rem;
    width: 100%;
}

.action-btn {
    flex: 1;
}

.full-btn {
    width: 100%;
}

/* Item Menu & TM Styling */
.itemModal-container {
    padding: 1rem;
}

.itemMenu {
    border-radius: var(--p-content-border-radius);
    overflow: hidden;
    border: 1px solid var(--p-content-border-color);
}

.tm-type-pill {
    display: inline-block;
    font-size: 0.75rem;
    font-weight: 600;
    color: #ffffff;
    padding: 0.2rem 0.5rem;
    border-radius: 6px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
}

.replace-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
    margin-top: 0.75rem;
}

.replace-card {
    cursor: pointer;
    transition: transform 0.15s ease, border-color 0.15s ease;
}

.replace-card:hover {
    transform: translateY(-2px);
    border-color: #ef4444;
}
</style>