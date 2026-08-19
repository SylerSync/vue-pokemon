<template>
    <Modal @close="props.item ? closeMoveModal() : null">
        <template #default>
            <div class="move-swap-container">
                <div class="modal-header" v-if="pendingMove">
                    <h3><strong>{{ userPokemon.name }}</strong> wants to learn <span class="highlight-move">{{
                        pendingMove.name
                    }}</span></h3>
                    <p>Select a move to forget, or skip learning {{ pendingMove.name }}.</p>
                </div>

                <!-- Current 4 Moves Grid -->
                <div class="moves-section">
                    <span class="section-title">Current Moves</span>
                    <div class="current-moves">
                        <Card v-for="(move, index) in userPokemon.moves" :key="move.name + index"
                            class="move-card select-card" @click="onMoveClick(move, index)"
                            :class="{ 'is-disabled': isPPMaxed(move) }">
                            <template #content>
                                <div class="card-top">
                                    <span class="move-title">{{ move.name }}</span>
                                    <span class="type-pill"
                                        :style="{ backgroundColor: pokemonStore.typeColors[move.type?.toLowerCase()] || '#777' }">
                                        {{ move.type }}
                                    </span>
                                </div>
                                <div class="card-details">
                                    <span><strong>PWR:</strong> {{ move.power || '—' }}</span>
                                    <span><strong>PP:</strong> {{ move.currentPP }}/{{ move.maxPP }}</span>
                                </div>
                                <div class="hover-action" v-if="pendingMove">Forget Move</div>
                            </template>
                        </Card>
                    </div>
                </div>

                <!-- Cancel / Skip Learning Card -->
                <div class="cancel-section" v-if="pendingMove">
                    <span class="section-title">New Move</span>
                    <Card class="move-card cancel-card" @click="closeMoveModal()">
                        <template #content>
                            <div class="card-top">
                                <span class="move-title">{{ pendingMove.name }}</span>
                                <span class="type-pill"
                                    :style="{ backgroundColor: pokemonStore.typeColors[pendingMove.type?.toLowerCase()] || '#777' }">
                                    {{ pendingMove.type }}
                                </span>
                            </div>
                            <div class="card-details">
                                <span><strong>PWR:</strong> {{ pendingMove.power || '—' }}</span>
                            </div>
                            <div class="hover-action cancel">Don't Learn</div>
                        </template>
                    </Card>
                </div>
            </div>
        </template>
    </Modal>
</template>

<script setup>
import { ref } from 'vue';
import { Card } from 'primevue';
import Modal from './Modal.vue';
import { usePokemonStore } from '@/stores/pokemonStore.js';
import { useInventoryStore } from '@/stores/inventoryStore.js';
/* ------------------------------------------------------------------ *
 * Props & emits
 * ------------------------------------------------------------------ */

const props = defineProps({
    /** The Pokémon whos moves are being changed */
    userPokemon: { type: Object, required: true },
    /** the new move replacing an old move */
    pendingMove: { type: Object, default: null },
    item: { type: Object, default: null },
});
const emit = defineEmits(['close']);

const pokemonStore = usePokemonStore()
const inventoryStore = useInventoryStore()
const pendingMove = ref(props.pendingMove)
const userPokemon = ref(props.userPokemon)
const item = ref(props.item)

function isPPMaxed(move) {
  return move.ppBoost >= 3
}

function onMoveClick(move, index) {
  if (isPPMaxed(move)) return
  props.item ? refillPP(move) : replaceMove(index)
}

function replaceMove(index) {
    if (userPokemon.value && pendingMove.value) {
        // Overwrite the move in the selected card slot
        userPokemon.value.moves[index] = pendingMove.value;
        console.log(`${userPokemon.value.name} forgot a move and learned ${pendingMove.value.name}!`);
    }

    // Close modal and release the Promise
    closeMoveModal();
}

function refillPP(move) {
    switch (item.value.effect.type) {
        case "pp-heal":
            if (inventoryStore.UseRecovery(item.value.id)) {
                move.currentPP = Math.min(move.maxPP, move.currentPP + item.value.effect.amount)
            }
        case "pp-max-raise":
            if(!move.ppBoost) move.ppBoost = 0
            if (inventoryStore.UseRecovery(item.value.id) && !isPPMaxed(move)) {
                let ppBonus = item.value.effect.stages - move.ppBoost
                if(ppBonus > 0) {
                    move.maxPP += ppBonus
                    move.ppBoost += ppBonus
                }
            }
    }
    closeMoveModal()
}

function closeMoveModal() {
    emit('close')
}
</script>


<style>
.move-swap-container {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    padding: 0.5rem;
    color: #2c3e50;
}

.modal-header h3 {
    margin: 0 0 0.25rem 0;
    font-size: 1.25rem;
    text-transform: capitalize;
}

.highlight-move {
    color: #e74c3c;
    font-weight: bold;
}

.modal-header p {
    margin: 0;
    color: #666;
    font-size: 0.9rem;
}

.section-title {
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #888;
    margin-bottom: 0.5rem;
    display: block;
}

/* Grids & Cards */
.current-moves {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
}

.move-card {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 0.85rem;
    border-radius: 8px;
    border: 2px solid #e2e8f0;
    background: Canvas;
    cursor: pointer;
    transition: all 0.2s ease;
    overflow: hidden;
}

.move-card:hover {
    transform: translateY(-2px);
    border-color: #3b82f6;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
}

.cancel-card:hover {
    border-color: #ef4444;
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.15);
}

.card-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
}

.move-title {
    font-weight: 700;
    font-size: 1rem;
    text-transform: capitalize;
}

.type-pill {
    color: CanvasText;
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    text-shadow: 0px 1px 2px rgba(0, 0, 0, 0.4);
}

.card-details {
    font-size: 0.85rem;
    color: #475569;
}

.hover-action {
    margin-top: 0.5rem;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    color: #2563eb;
    text-align: right;
}

.hover-action.cancel {
    color: #dc2626;
}

.move-card.is-disabled {
  opacity: 0.5;
  pointer-events: none;
}
</style>