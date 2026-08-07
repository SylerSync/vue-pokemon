<script setup>
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
</script>

<template>
  <Tabs :value="$route.path">
        <TabList>
            <Tab class="custom-tab" value="/dex" as="router-link" to="/dex">Pokedex</Tab>
            <Tab class="custom-tab" value="/wildPokemon" as="router-link" to="/wildPokemon">Wild Pokemon</Tab>
            <Tab class="custom-tab" value="/pokebox" as="router-link" to="/pokebox">PokeBox</Tab>
            <Tab class="custom-tab" value="/wishList" as="router-link" to="/wishList">WishList</Tab>
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
</style>