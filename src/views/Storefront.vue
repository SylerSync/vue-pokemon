<script setup>
import { ref, computed, onMounted } from "vue";
import { useInventoryStore } from "@/stores/inventoryStore";
import { usePokemonStore } from "@/stores/pokemonStore";
import { useErrorStore } from "@/stores/errorStore.js";

import SelectButton from "primevue/selectbutton";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Button from "primevue/button";
import Tag from "primevue/tag";

const inventoryStore = useInventoryStore();
const pokemonStore = usePokemonStore();
const errorStore = useErrorStore();

const shopCats = ref([
  { label: "Pokeballs", value: "pokeballs" },
  { label: "Recovery Items", value: "recovery" },
  { label: "TM Shop", value: "tms" },
  { label: "Evolution Items", value: "evolution-stones" },
  { label: "Mega Evolution", value: "mega-items" }
]);

const shopTab = ref("pokeballs");

// Load master catalog and active user inventory from C# API on view mount
onMounted(async () => {
  await inventoryStore.FetchCatalog();
  await inventoryStore.GetUserInventory();
});

// Dynamic items fetch for the active tab from MongoDB catalog
const currentTableItems = computed(() => {
  return inventoryStore.GetItemsByCategory(shopTab.value, false);
});

// Helper getter to display the user's owned count for a specific catalog item
function getOwnedCount(itemId) {
  const slot = inventoryStore.items.find((i) => i.itemId === itemId);
  return slot ? slot.count : 0;
}

// Single purchase handler replacing category-specific buy functions
async function handleBuyItem(itemId) {
  const success = await inventoryStore.BuyItem(itemId, 1);
  if (!success) {
    errorStore.SetErrorDetails(
      "Low funds",
      `Unable to buy ${itemId} due to lack of funds or server error.`
    );
  }
}
</script>

<template>
  <div class="shop-container">
    <!-- HEADER -->
    <div class="shop-header">
      <h2>PokeMart</h2>
      <Tag severity="success" class="funds-tag">
        Funds: ${{ inventoryStore.funds ? inventoryStore.funds : 0 }}
      </Tag>
    </div>

    <!-- TAB SELECTION -->
    <SelectButton
      v-model="shopTab"
      :options="shopCats"
      optionLabel="label"
      optionValue="value"
      aria-labelledby="basic"
      class="shopSelection"
    />

    <!-- UNIFIED SHOP DATATABLE -->
    <div class="shop-table-wrapper">
      <h3 class="shopTab">
        {{ shopCats.find((c) => c.value === shopTab)?.label }}
      </h3>

      <DataTable
        :value="currentTableItems"
        paginator
        :rows="5"
        responsiveLayout="scroll"
        class="p-datatable-sm dataTable"
      >
        <!-- ITEM / NAME COLUMN -->
        <Column field="Name" header="Item" style="width: 40%">
          <template #body="slotProps">
            <div v-if="shopTab === 'tms'" class="tm-item-cell">
              <span
                class="tm-type-badge"
                :style="{
                  backgroundColor:
                    pokemonStore.typeColors[slotProps.data.type?.toLowerCase()] || '#777'
                }"
              >
                {{ slotProps.data.type || 'NORMAL' }}
              </span>
              <span class="tm-name-text">{{ slotProps.data.name }}</span>
            </div>
            <div v-else>
              {{ slotProps.data.name }}
            </div>
          </template>
        </Column>

        <!-- COST COLUMN -->
        <Column field="Cost" header="Cost" style="width: 20%">
          <template #body="slotProps">
            ${{ slotProps.data.cost ? slotProps.data.cost.toLocaleString() : 0 }}
          </template>
        </Column>

        <!-- IN BAG COLUMN -->
        <Column header="In Bag" style="width: 20%">
          <template #body="slotProps">
            {{ getOwnedCount(slotProps.data.id) }}
          </template>
        </Column>

        <!-- ACTION COLUMN -->
        <Column header="Action" style="width: 20%">
          <template #body="slotProps">
            <Button
              label="Buy"
              icon="pi pi-shopping-cart"
              severity="primary"
              size="small"
              class="shop-btn"
              :disabled="inventoryStore.funds < slotProps.data.cost"
              @click="handleBuyItem(slotProps.data.id)"
            />
          </template>
        </Column>
      </DataTable>
    </div>
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

.shopSelection {
  display: flex;
  justify-content: center;
}
</style>