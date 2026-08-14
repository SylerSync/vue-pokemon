<script setup>
import { computed } from "vue"
import { useInventoryStore } from "@/stores/inventoryStore";
import { usePokemonStore } from "@/stores/pokemonStore";
import DataTable from "primevue/datatable"
import Column from "primevue/column"
import Button from "primevue/button"
import Tag from "primevue/tag"
import tms from "@/assets/data/tms.json"

const inventoryStore = useInventoryStore();
const pokemonStore = usePokemonStore();

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
    return Object.keys(inventoryStore.recoveryItems).map((key) => {
        const item = inventoryStore.recoveryItems[key]
        return {
            id: key,
            name: key === 'maxrevive' ? 'Max Revive' : key.charAt(0).toUpperCase() + key.slice(1),
            cost: item.cost,
            count: item.count
        }
    })
})

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

// --- PURCHASE FUNCTIONS ---
function buyPokeball(itemType) {
    console.log(`Attempting to purchase pokeball: ${itemType}`)
    const success = inventoryStore.BuyPokeball(itemType, 1)
    if (!success) {
        console.warn(`Not enough funds to buy ${itemType}`)
    }
}

function buyRecovery(itemType) {
    console.log(`Attempting to purchase recovery item: ${itemType}`)
    const success = inventoryStore.BuyRecovery(itemType, 1)
    if (!success) {
        console.warn(`Not enough funds to buy ${itemType}`)
    }
}

function buyTM(tmId) {
    console.log(`Attempting to purchase TM: ${tmId}`)
    const success = inventoryStore.BuyTM(tmId)
    if (!success) {
        console.warn(`Not enough funds to buy TM ${tmId}`)
    }
}
</script>

<template>
    <div class="shop-container">

        <!-- HEADER -->
        <div class="shop-header">
            <h2>PokeMart</h2>
            <Tag severity="success" class="funds-tag">
                Funds: ${{ inventoryStore.funds.toLocaleString() }}
            </Tag>
        </div>

        <!-- TABLE 1: POKEBALLS -->
        <h3 class="shopTab">Pokeballs</h3>
        <DataTable :value="shopPokeball" responsiveLayout="scroll" class="p-datatable-sm dataTable">
            <Column field="name" header="Item" style="width: 40%"></Column>
            <Column field="cost" header="Cost" style="width: 20%">
                <template #body="slotProps">
                    ${{ slotProps.data.cost.toLocaleString() }}
                </template>
            </Column>
            <Column field="count" header="In Bag" style="width: 20%"></Column>
            <Column header="Action" style="width: 20%">
                <template #body="slotProps">
                    <Button label="Buy" icon="pi pi-shopping-cart" severity="primary" size="small" class="shop-btn"
                        :disabled="inventoryStore.funds < slotProps.data.cost"
                        @click="buyPokeball(slotProps.data.id)" />
                </template>
            </Column>
        </DataTable>

        <!-- TABLE 2: RECOVERY ITEMS -->
        <h3 class="shopTab">Recovery Items</h3>
        <DataTable :value="shopRecovery" responsiveLayout="scroll" class="p-datatable-sm dataTable">
            <Column field="name" header="Item" style="width: 40%"></Column>
            <Column field="cost" header="Cost" style="width: 20%">
                <template #body="slotProps">
                    ${{ slotProps.data.cost.toLocaleString() }}
                </template>
            </Column>
            <Column field="count" header="In Bag" style="width: 20%"></Column>
            <Column header="Action" style="width: 20%">
                <template #body="slotProps">
                    <Button label="Buy" icon="pi pi-shopping-cart" severity="primary" size="small" class="shop-btn"
                        :disabled="inventoryStore.funds < slotProps.data.cost"
                        @click="buyRecovery(slotProps.data.id)" />
                </template>
            </Column>
        </DataTable>

        <!-- TABLE 3: TMs -->
        <h3 class="shopTab">Technical Machines (TMs)</h3>
        <DataTable :value="shopTMs" paginator :rows="5" responsiveLayout="scroll" class="p-datatable-sm dataTable">
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
                    <Button label="Buy" icon="pi pi-shopping-cart" severity="primary" size="small" class="shop-btn"
                        :disabled="inventoryStore.funds < slotProps.data.cost" @click="buyTM(slotProps.data.id)" />
                </template>
            </Column>
        </DataTable>

    </div>
</template>

<style scoped>
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
</style>