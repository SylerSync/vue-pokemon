<template>
    <h1 class="text-2xl font-bold mb-4">Wish List</h1>
   <div>
        <DataTable :value="pokemon" tableStyle="min-width: 50rem">
            <Column header="Product">
                <template #body="{ data }">
                    <div class="flex items-center gap-3">
                        <img :src="data.sprites.other['official-artwork'].front_default" :alt="data.name" class="w-12 rounded-md shadow" />
                        <div class="flex flex-col">
                            <span class="font-medium">{{ data.name }}</span>
                        </div>
                    </div>
                </template>
            </Column>
            <Column header="Type">
                <template #body="{ data }">
                    <Tag v-for="type in data.types" :key="type" :value="type.type.name" severity="secondary" />
                </template>
            </Column>
            <Column header="Status">
                <template #body="{ data }">
                    <Tag :value="getSeverityLabel(pokemonStore.pokemonIsCaught(data.name))" :severity="getSeverity(pokemonStore.pokemonIsCaught(data.name))" />
                </template>
            </Column>
        </DataTable>
    </div>
</template>

<script setup>
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import ColumnGroup from 'primevue/columngroup';   // optional
import Row from 'primevue/row';                   // optional
import Tag from 'primevue/tag';
import { usePokemonStore } from '@/stores/pokemonStore';
import { ref, onMounted } from 'vue';

const pokemonStore = usePokemonStore();

const pokemon = ref(pokemonStore.wishlistPokemon);

onMounted(() => {
    console.log('Wishlist Pokemon:', pokemonStore.wishlistPokemon);
    // ProductService.getProductsSmall().then(data => pokemonStore.wishlistPokemon = data);
});

const getSeverity = (caught) => {
    if (caught) {
        return 'success';
    } else {
        return 'danger';
    }
};
const getSeverityLabel = (caught) => {
    if (caught) {
        return 'Captured';
    } else {
        return 'Still Searching';
    }
};
</script>

<style>

</style>