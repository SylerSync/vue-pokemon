<script setup>
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import Checkbox from "primevue/checkbox";
import { useSettingsStore } from '@/stores/settingsStore';

const settingsStore = useSettingsStore()

</script>

<template>
  <Tabs :value="$route.path">
        <TabList>
            <Tab class="custom-tab" value="/dex" as="router-link" to="/dex">Pokedex</Tab>
            <Tab class="custom-tab" value="/wildPokemon" as="router-link" to="/wildPokemon">Wild Pokemon</Tab>
            <Tab class="custom-tab" value="/pokebox" as="router-link" to="/pokebox">PokeBox</Tab>
            <Tab class="custom-tab" value="/wishList" as="router-link" to="/wishList">WishList</Tab>
            <div class="settings-toggle">
                <Checkbox v-model="settingsStore.muteAudio" :binary="true" inputId="muteAudio" />
                <label for="muteAudio" class="toggle-label">Mute Audio</label>
            </div>
        </TabList>
  </Tabs>


  <router-view />
</template>

<style scoped>
    .custom-tab{
        text-decoration: none;
        border-radius: 5px;
        border:black solid 2px;
        margin:10px;
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
</style>