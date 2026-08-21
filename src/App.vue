<script setup>
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import Checkbox from "primevue/checkbox";
import SelectButton from 'primevue/selectbutton';
import Badge from 'primevue/badge';
import 'primeicons/primeicons.css';
import { useSettingsStore } from '@/stores/settingsStore';
import { useInventoryStore } from './stores/inventoryStore';
import { computed } from "vue";
import ErrorModal from '@/components/ErrorModal.vue'

const settingsStore = useSettingsStore();
const inventoryStore = useInventoryStore();

// Map IDs to PokeAPI sprite URLs
const pokeballIcons = {
    pokeball: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png",
    greatball: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/great-ball.png",
    ultraball: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/ultra-ball.png",
    masterball: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/master-ball.png"
};

const pokeballOptions = computed(() => {
    const standardPokeball = {
        id: "pokeball",
        label: "Pokeball",
        icon: pokeballIcons.pokeball,
        count: '∞'
    };

    const storeBalls = Object.keys(inventoryStore.pokeballs).map((key) => ({
        id: key,
        label: key.charAt(0).toUpperCase() + key.slice(1),
        icon: pokeballIcons[key] || pokeballIcons.pokeball,
        count: inventoryStore.pokeballs[key].count
    }));

    return [standardPokeball, ...storeBalls];
});


</script>

<template>
      <Tabs :value="$route.path">
                <TabList>
            <Tab class="custom-tab" value="/dex" as="router-link" to="/dex">Pokedex</Tab>
            <Tab class="custom-tab" value="/wildPokemon" as="router-link" to="/wildPokemon">Wild Pokemon</Tab>
            <Tab class="custom-tab" value="/pokebox" as="router-link" to="/pokebox">PokeBox</Tab>
            <Tab class="custom-tab" value="/wishList" as="router-link" to="/wishList">WishList</Tab>
            <Tab class="custom-tab" value="/shop" as="router-link" to="/shop">Shop</Tab>
            <Tab class="custom-tab" value="/trainers" as="router-link" to="/trainers">Trainers</Tab>
            <Tab class="custom-tab" value="/trainers" as="router-link" to="/rouge">Rouge Map</Tab>
            <Tab class="custom-tab" value="/adventure" as="router-link" to="/adventure">Adventure</Tab>
            <SelectButton v-model="inventoryStore.selectedPokeball" :options="pokeballOptions" optionLabel="label"
                optionValue="id" :optionDisabled="(option) => option.count <= 0" aria-labelledby="basic"
                class="custom-select-button">
                <template #option="slotProps">
                    <div class="pokeball-option" :title="slotProps.option.label">
                        <img :src="slotProps.option.icon" :alt="slotProps.option.label" class="pokeball-icon" />
                        <Badge :value="slotProps.option.count"
                            :severity="slotProps.option.count === '∞' || slotProps.option.count > 0 ? 'info' : 'secondary'"
                            class="pokeball-badge" />
                    </div>
                </template>
            </SelectButton>
            <div class="settings-toggle">
                <Checkbox v-model="settingsStore.muteAudio" :binary="true" inputId="muteAudio" />
                <label for="muteAudio" class="toggle-label">Mute Audio</label>
            </div>
                    
        </TabList>
          </Tabs>


      <router-view />
    <ErrorModal />
</template>

<style scoped>
.custom-tab {
    text-decoration: none;
    border-radius: 5px;
    border: black solid 2px;
    margin: 10px;
}

.custom-tab.p-tab:hover,
.custom-tab:hover {
    border-color: CanvasText !important;
}

.custom-tab.router-link-active,
custom-tab.p-tab-active {
    color: CanvasText;
    border-color: CanvasText;

}

:deep(.p-tablist-tab-list) {
    display: flex;
    align-items: center;
    width: 100%;
}


.settings-toggle {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0 1rem;
}

.toggle-label {
    cursor: pointer;
    font-size: 0.9rem;
    user-select: none;
    color: CanvasText;
}

.pokeball-option {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.1rem 0.25rem;
}

.pokeball-icon {
    width: 24px;
    height: 24px;
    image-rendering: pixelated;
}

:deep(.custom-select-button.p-selectbutton) {
    display: flex;
    gap: 0.5rem;
    margin: 10px;
}

:deep(.custom-select-button .p-togglebutton) {
    border: 2px solid black !important;
    border-radius: 5px !important;
    background: transparent !important;
    padding: 0.25rem 0.5rem !important;
    transition: all 0.2s ease;
}

:deep(.custom-select-button .p-togglebutton:hover) {
    border-color: CanvasText !important;
}

:deep(.custom-select-button .p-togglebutton.p-togglebutton-checked) {
    border-color: CanvasText !important;
    background-color: rgba(0, 0, 0, 0.08) !important;
}

:deep(.custom-select-button .p-togglebutton.p-disabled) {
    opacity: 0.4;
    cursor: not-allowed;
}
</style>