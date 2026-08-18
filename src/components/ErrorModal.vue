<script setup>
import { useErrorStore } from "@/stores/errorStore"
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'

const errorStore = useErrorStore()

</script>
<template>
    <Dialog v-model:visible="errorStore.isOpen" modal :dismissableMask="true" :closable="false" :header="errorStore.errorTitle" :style="{ width: '25rem' }"
        @hide="errorStore.ClearErrorDetails">
        <p>{{ errorStore.errorMsg }}</p>

        <template #footer>
            <Button label="Dismiss" severity="danger" class="w-full" @click="errorStore.ClearErrorDetails" />
        </template>
    </Dialog>
</template>

<style scoped></style>