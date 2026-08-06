<script setup>
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
</script>

<template>
  <Tabs>
        <TabList>
            <Tab><router-link to="/home">Home</router-link></Tab>
            <Tab><router-link to="/wildPokemon">Pokedex</router-link></Tab>
        </TabList>
  </Tabs>
  <router-view />
</template>

<style scoped></style>