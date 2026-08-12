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

const pokemonStore = usePokemonStore()
const inventoryStore = useInventoryStore()

const searchQuery = ref('')
const sortKey = ref(null)
const sortOrder = ref(null)
const sortField = ref(null)

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
            effectDescription = `Revives with ${item.effect.percent*100}% HP`;
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
            else{
                console.warn(`${target.name} has not fainted, a revive item cant be used.`)
            }
        case "heal":
            if(target.currentHp <= 0){
                console.warn(`${target.name} has fainted, you must use a revive item to fix this injury!`)
                return
            }
            else{
                if(target.currentHp == target.totalHp){
                    console.warn(`${target.name} is already at full health!`)
                    return
                }
                if(inventoryStore.UseRecovery(item.id)){
                    target.currentHp = Math.min(target.totalHp, target.currentHp + 20);
                    return
                }
                
            }
    }
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

    <Modal v-if="isDetailModalOpen" @close="closeDetailModal">
        <div v-if="selectedPokemon" class="detailModal">
            <h2>{{ selectedPokemon.name }}</h2>
            <img :src="selectedPokemon.sprite" :alt="selectedPokemon.name">
            <h3>Types:</h3>
            <div v-for="type of selectedPokemon.types" :key="type">
                <p class="typeTag" :style="{ backgroundColor: pokemonStore.typeColors[type] }">
                    {{ type }}
                </p>
            </div>
            <p>KOs: {{ selectedPokemon.totalKOs }}</p>
            <p>Faints: {{ selectedPokemon.totalFaints }}</p>
            <p>Hp: {{ selectedPokemon.currentHp }}/{{ selectedPokemon.totalHp }}</p>

            <button @click="ReleasePokemon()">Release Pokemon</button>
            <button @click="openItemModal()">Use Recovery Item</button>
        </div>
    </Modal>

    <Modal v-if="isItemModalOpen" @close="closeItemModal">
        <DataTable :value="itemInventory" responsiveLayout="scroll" class="p-datatable-sm dataTable itemMenu">
            <Column field="name" header="Item" style="width: 30%"></Column>

            <Column field="effectDescription" header="Effect" style="width: 35%"></Column>

            <Column field="count" header="In Bag" style="width: 15%"></Column>

            <Column header="Action" style="width: 20%">
                <template #body="slotProps">
                    <Button label="Use" severity="primary" size="small" class="btn"
                        :disabled="slotProps.data.count <= 0" @click="handleUseItem(slotProps.data)" />
                </template>
            </Column>
        </DataTable>
    </Modal>
</template>

<style scoped>
.pokemon-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1rem;
    margin-top: 1rem;
}

:deep(.p-card-body),
:deep(.p-card-caption) {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
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

.pokemon-title {
    text-transform: capitalize;
}

.detailModal {
    background-color: Canvas;
    color: CanvasText;
    width: 450px;
    padding: 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
}

.detailModal Button {
    background-color: red;
    width: 50%;
    border-radius: 5px;
    border: 2px solid darkred;
    font-size: medium;
    cursor: pointer;
}

.detailModal Button:hover {
    background-color: blue;
    border: 2px solid darkblue;
}

.pokemonCard:hover {
    cursor: pointer;
    background-color: Canvas;
}

.typeTag {
    border-radius: 5px;
    padding: 5px;
    margin: 3px;
    width: 5rem;
    text-align: center;
}

.itemMenu {
    border-radius: 5px;
    border: solid 2px CanvasText
}
</style>