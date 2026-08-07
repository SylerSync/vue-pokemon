<script setup>
    import {ref} from "vue"
    import { usePokemonStore } from "@/stores/pokemonStore";
    import Card from "primevue/card"
    import Modal from "@/components/Modal.vue"

    const pokemonStore = usePokemonStore()

    const selectedPokemon = ref(null)

    const isDetailModalOpen = ref(false)

    const selectedPokemonIndex = ref(null)

    function ReleasePokemon(){
        if(selectedPokemonIndex.value !== null){
            pokemonStore.releasePokemon(selectedPokemonIndex.value)
        }
        closeDetailModal()
    }

    const openDetailsModal = (pokemon, index) => {
        selectedPokemon.value = pokemon
        selectedPokemonIndex.value = index
        isDetailModalOpen.value = true
    }

    const closeDetailModal = () => {
        isDetailModalOpen.value = false
    }


</script>
<template>
    <div class="pokemon-grid">
        <Card  v-for="(pokemon, index) in pokemonStore.caughtPokemon" :key="index" class="w-full pokemonCard" @click="openDetailsModal(pokemon, index)">
            <template #title>{{ pokemon.name }}</template>
            <template #header>
                <div class="sprite-container">
                    <img class="pokemon-sprite" :src="pokemon.sprite" :alt="pokemon.name"/>
                </div>
                
            </template>
            
        </Card>
    </div>

    <Modal v-if="isDetailModalOpen" @close="closeDetailModal">
        <div v-if="selectedPokemon" class="detailModal">
            <h2>{{ selectedPokemon.name }}</h2>
            <img :src="selectedPokemon.sprite" :alt="selectedPokemon.name">
            <h3>Types:</h3>
            <div v-for="type of selectedPokemon.types" :key="type">
                <p>{{ type }} </p>
            </div>
            <p>Weight: {{ selectedPokemon.weight }}</p>
            <p>Height: {{ selectedPokemon.height }}</p>

            <button @click="ReleasePokemon()">Release Pokemon</button>
        </div>
    </Modal>
</template>
<style scoped>
.pokemon-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

:deep(.p-card-body),
:deep(.p-card-caption) {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.sprite-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding-top: 1rem;
}

.pokemon-sprite {
  width: 96px;
  height: 96px;
  image-rendering: pixelated;
}

.pokemon-title {
  text-transform: capitalize;
}

.detailModal{
    background-color: Canvas;
    color: CanvasText;
    width:450px;
    padding:24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
}

.detailModal Button{
    background-color: red;
    width: 50%;
    border-radius: 5px;
    border: 2px solid darkred;
    font-size: medium;
    cursor: pointer;
}
.detailModal Button:hover {
    background-color: blue;
    border:2px solid darkblue;
}

.pokemonCard:hover {
    cursor: pointer;
    background-color: Canvas;
}


</style>