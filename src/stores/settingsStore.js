import {defineStore} from "pinia"

export const useSettingsStore = defineStore("settingsStore",{
    state: () => ({
        muteAudio: false
    }),
    getter: {

    },
    actions: {
        toggleMuteAudio(){
            this.muteAudio = !this.muteAudio
            console.log("toggle audio")
        }
    }

})