<script setup>
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
</script>

<template>
  <Tabs>
        <TabList>
            <Tab><router-link to="/wildPokemon">Wild Pokemon</router-link></Tab>
            <Tab><router-link to="/dex">Pokedex</router-link></Tab>
            <tab><router-link to="/pokebox">PokeBox</router-link></tab>
            <tab><router-link to="/wishList">WishList</router-link></tab>
        </TabList>
  </Tabs>
  <router-view />
</template>

<style scoped></style>