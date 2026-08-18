import {defineStore} from "pinia"

export const useErrorStore = defineStore("errorStore", {
    state: () =>({
        errorMsg: "",
        errorTitle: "",
        isOpen: false
    }),
    getters:{
        GetErrorData: (state) => {
            return {errTitle: state.errorTitle, errMsg: state.errorMsg}
        }
    },
    actions: {
        SetErrorDetails(errTitle, errMsg){
            if(errMsg === "" || errTitle === ""){
                return false
            }
            this.errorMsg = errMsg
            this.errorTitle = errTitle

            this.isOpen = true
        },
        ClearErrorDetails(){
            this.errorMsg = ""
            this.errorTitle = ""

            this.isOpen = false
        }
    }
})