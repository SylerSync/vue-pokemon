import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import PrimeVue from 'primevue/config';
import Aura from '@primeuix/themes/aura';
import piniaPluginPersistedstate  from 'pinia-plugin-persistedstate';
import './assets/main.css'

const app = createApp(App)
const pinia = createPinia()

pinia.use(piniaPluginPersistedstate)

app.use(pinia)
app.use(router)
app.use(PrimeVue,{
    theme: {
        preset: Aura,
    },
    license: import.meta.env.VITE_PRIMEUI_LICENSE_KEY
})

app.mount('#app')
