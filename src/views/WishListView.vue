<template>
    <section class="wishlist">
        <header class="list-head">
            <h1>Wish List</h1>
            <span class="count">{{ pokemon.length }} {{ pokemon.length === 1 ? 'entry' : 'entries' }}</span>
        </header>
        <DataTable :value="pokemon" removableSort class="wishlist-table" :pt="{ table: { style: 'min-width: 34rem' } }">
            <Column header="Pokemon" field="name" sortable>
                <template #body="{ data }">
                    <div class="cell-pokemon">
                        <div class="thumb">
                            <img :src="data.sprites.other['official-artwork'].front_default" :alt="data.name" class="w-12 rounded-md shadow" />
                        </div>
                        <div class="ident">
                            <span class="font-medium">{{ data.name }}</span>
                        </div>
                    </div>
                </template>
            </Column>
            <Column header="Primary Type" field="type1" sortable>
                <template #body="{ data }">
                    <div class="cell-types">
                        <Tag :value="data.types[0].type.name" severity="secondary" />
                    </div>
                </template>
            </Column>
            <Column header="Secondary Type" field="type2" sortable>
                <template #body="{ data }">
                    <div class="cell-types">
                        <Tag v-if="data.types[1]" :value="data.types[1].type.name" severity="secondary" />
                        <Tag v-else severity="secondary">None</Tag>
                    </div>
                </template>
            </Column>
            <Column header="DexNumber" field="id" sortable>
                <template #body="{ data }">
                    <div>
                        <span class="dex-no">#{{ String(data.id).padStart(4, '0') }}</span>
                    </div>
                </template>
            </Column>
            <Column header="Status" field="caught" sortable class="col-status">
                <template #body="{ data }">
                    <Tag :value="getSeverityLabel(data.caught)" :severity="getSeverity(data.caught)" />
                </template>
            </Column>
            <Column>
                <template #body="{ data }">
                    <button @click="toggleModal(data)">Remove</button>
                </template>
            </Column>
            <template #empty>
                <p class="empty">Nothing on your wish list yet.</p>
            </template>
        </DataTable>
    </section>
    <Teleport to="body" v-if="showModal">
        <Modal @close="toggleModal(selectedPokemon)">
            <div class="confirm">
              <h2 class="confirm-title">Remove from wish list?</h2>
              <p class="confirm-body">
                <span class="subject">{{ selectedPokemon.name }}</span>
                will be removed from your wish list.
              </p>
              <div class="confirm-actions">
                <button class="btn btn-ghost" @click="toggleModal(selectedPokemon)">
                  Cancel
                </button>
                <button class="btn btn-danger" @click="removeFromWishList(selectedPokemon)">
                  Remove
                </button>
              </div>
            </div>
        </Modal>
    </Teleport>
</template>

<script setup>
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import ColumnGroup from 'primevue/columngroup';   // optional
import Row from 'primevue/row';                   // optional
import Tag from 'primevue/tag';
import { usePokemonStore } from '@/stores/pokemonStore';
import { ref, onMounted, computed, watchEffect } from 'vue';
import Modal from '@/components/Modal.vue';

const pokemonStore = usePokemonStore();
const showModal = ref(false);
const selectedPokemon = ref(null);

// ads a caught value to the objects and brings the types up to the top of the
//  json object so that it can be referenced by primevue's sortable field
const pokemon = computed(() =>
    pokemonStore.wishlistPokemon.map(p => ({
        ...p,
        caught: pokemonStore.pokemonIsCaught(p.name),
        type1: p.types[0].type.name,
        type2: p.types[1] ? p.types[1].type.name : null
    }))
);

const getSeverity = (caught) => {
    if (caught) {
        return 'success';
    } else {
        return 'danger';
    }
};
const getSeverityLabel = (caught) => {
    if (caught) {
        return 'Captured';
    } else {
        return 'Still Searching';
    }
};

function removeFromWishList(pokemon){
    pokemonStore.removeWishlistPokemon(pokemon.name)
    showModal.value = false;
}

function toggleModal(pokemon) {
    selectedPokemon.value = pokemon;
    showModal.value = !showModal.value;
}
</script>

<style scoped>
.wishlist {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* ---- header ---- */
.list-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
}

.list-head h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  line-height: 1.2;
}

.count {
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
  font-variant-numeric: tabular-nums;
}

/* ---- table shell ---- */
.wishlist-table {
  border: 1px solid var(--p-content-border-color);
  border-radius: var(--p-content-border-radius);
  overflow: hidden;
}

.wishlist-table :deep(th) {
  font-size: 0.6875rem;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--p-text-muted-color);
}

.wishlist-table :deep(tbody tr) {
  transition: background-color 0.15s;
}

.wishlist-table :deep(tbody tr:hover) {
  background: var(--p-content-hover-background);
}

/* ---- pokemon cell ---- */
.cell-pokemon {
  display: flex;
  align-items: center;
  gap: 0.875rem;
}

.thumb {
  flex: none;
  display: grid;
  place-items: center;
  width: 3rem;
  height: 3rem;
  border-radius: var(--p-content-border-radius);
  background: var(--p-surface-100);
  border: 1px solid var(--p-content-border-color);
}

.thumb img {
  width: 2.5rem;
  height: 2.5rem;
  object-fit: contain;
}

.ident {
  display: flex;
  flex-direction: column;
  gap: 0.0625rem;
  min-width: 0;
}

.name {
  font-weight: 500;
  text-transform: capitalize;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dex-no {
  font-family: ui-monospace, monospace;
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

/* ---- type cell ---- */
.cell-types {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.cell-types :deep(.p-tag) {
  text-transform: capitalize;
}

/* ---- status ---- */
.col-status :deep(.p-tag) {
  min-width: 5rem;
  justify-content: center;
}

.empty {
  margin: 0;
  padding: 2rem 0;
  text-align: center;
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}

.confirm {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 18rem;
  max-width: 26rem;
  padding: 0.5rem;
}

.confirm-title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  line-height: 1.3;
}

.confirm-body {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--p-text-muted-color);
}

.subject {
  text-transform: capitalize;
  font-weight: 500;
  color: var(--p-text-color);
}

.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.625rem;
  margin-top: 1rem;
}

.btn {
  padding: 0.5rem 1rem;
  border-radius: var(--p-content-border-radius);
  border: 1px solid transparent;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s, border-color 0.15s;
}

.btn:focus-visible {
  outline: var(--p-focus-ring-width, 2px) solid var(--p-focus-ring-color, currentColor);
  outline-offset: 2px;
}

.btn-ghost {
  background: transparent;
  border-color: var(--p-content-border-color);
  color: var(--p-text-color);
}

.btn-ghost:hover {
  background: var(--p-content-hover-background);
}

.btn-danger {
  background: var(--p-red-500);
  color: #fff;
}

.btn-danger:hover {
  background: var(--p-red-600);
}

@media (prefers-color-scheme: dark) {
  .thumb { background: var(--p-surface-800); }
}

@media (max-width: 24rem) {
  .confirm-actions {
    flex-direction: column-reverse;
  }
  .btn {
    width: 100%;
  }
}
</style>