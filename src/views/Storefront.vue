<script setup>
    import {computed} from "vue"
    import { useInventoryStore } from "@/stores/inventoryStore";
    import DataTable from "primevue/datatable"
    import Column from "primevue/column"
    import Button from "primevue/button"
    import Tag from "primevue/tag"

    const inventoryStore = useInventoryStore();

    const shopItems = computed(() => {
        return Object.keys(inventoryStore.pokeballs).map((key) => {
            const item = inventoryStore.pokeballs[key]
            return{
                id: key,
                name: key.charAt(0).toUpperCase() + key.slice(1),
                cost : item.cost,
                count: item.count
            }
        })
    })

    function buyItem(itemType){
        console.log(`Attempting to purchase pokeball: ${itemType}`)
        const success = inventoryStore.BuyPokeball(itemType, 1)
        if(!success){
            console.warn(  `Not enough funds to buy ${itemType}`)
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

        <DataTable :value="shopItems" responsiveLayout="scroll" class="p-datatable-sm">
            <Column field="name" header="Item"></Column>
            <Column field="cost" header="Cost">
                <template #body="slotProps">
                    ${{ slotProps.data.cost.toLocaleString() }}
                </template>
            </Column>
            <Column field="count" header="In Bag"></Column>
            <Column header="Action">
                <template #body="slotProps">
                    <Button
                        label="Buy"
                        icon="pi pi-shopping-cart"
                        severity="primary"
                        size="small"
                        class="shop-btn"
                        :disabled="inventoryStore.funds < slotProps.data.cost"
                        @click="buyItem(slotProps.data.id)"
                    />
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

.shop-btn:hover{
    cursor: pointer;
}
</style>