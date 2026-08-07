<template>
    <div class="backdrop" @click.self="closeModal">
        <div class="modal" :class="{sale: theme === 'sale'}">
            <slot>default content</slot>
            <div class="actions">
                <slot name="links"></slot>
            </div>
        </div>
    </div>
</template>

<script setup>
    const props = defineProps(['theme'])

    const emit = defineEmits(['close'])


    const closeModal = () => {
        emit('close')
    }
</script>
<style scoped>
.backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-container {
  /* Let the parent's content dictate the size, up to a safe screen limit */
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
}
</style>
