<script setup>
import { computed } from "vue"
import { useInventoryStore } from "@/stores/inventoryStore";
import DataTable from "primevue/datatable"
import Column from "primevue/column"
import Button from "primevue/button"
import Tag from "primevue/tag"

const inventoryStore = useInventoryStore();

const shopPokeball = computed(() => {
    return Object.keys(inventoryStore.pokeballs).map((key) => {
        const item = inventoryStore.pokeballs[key]
        return {
            id: key,
            name: key.charAt(0).toUpperCase() + key.slice(1),
            cost: item.cost,
            count: item.count
        }
    })
})

const shopRecovery = computed(() => {
    return Object.keys(inventoryStore.recoveryItems).map((key) => {
        const item = inventoryStore.recoveryItems[key]
        return {
            id: key,
            name: key.charAt(0).toUpperCase() + key.slice(1),
            cost: item.cost,
            count: item.count
        }
    })
})

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

</script>
<template>
    <div class="shop-container">

        <div class="shop-header">
            <h2>PokeMart</h2>
            <Tag severity="success" class="funds-tag">
                Funds: ${{ inventoryStore.funds.toLocaleString() }}
            </Tag>
        </div>

        <!-- Table 1: Pokeballs -->
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

        <!-- Table 2: Recovery Items -->
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
}

.shopTab {
    border-bottom: 1px solid CanvasText;
}
</style>