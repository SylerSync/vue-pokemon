<script setup>
import Button from 'primevue/button';
</script>

<template>
  <router-link to="/home">Home</router-link>
  <Button>Verify</Button>
  <h1>You did it!</h1>
  <p>
    Visit <a href="https://vuejs.org/" target="_blank" rel="noopener">vuejs.org</a> to read the
    documentation
  </p>
  <br />
  <router-view />
</template>

<style scoped></style>
