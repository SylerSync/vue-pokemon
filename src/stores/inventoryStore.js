import {defineStore} from "pinia"

export const useInventoryStore = defineStore("inventoryStore", {
    state: () => ({
        pokeballs : {
            greatball : {
                count:0,
                cost:1000,
                catchPower: 15
            },
            ultraball: {
                count:0,
                cost:2000,
                catchPower: 35

            },
            masterball : {
                count:0,
                cost:100000,
                catchPower: 100
            }
        },
        recoveryItems : {
            revive : {
                count: 0,
                cost: 300
            }
        },
        selectedPokeball : "pokeball",
        funds : 5000
    }),
    getters:{
        SelectedPokeballData: (state) => {
            return (type) => {
                let pokeballData = {};
                if (type && type.toLowerCase() === "pokeball") {
                    pokeballData = {
                        id: "pokeball",
                        count: '∞',
                        cost: 0,
                        catchPower: 0
                    };
                } else if (type && state.pokeballs[type]) {
                    pokeballData = {
                        id: type,
                        ...state.pokeballs[type]
                    };
                }
                return pokeballData;
            };
        },
        GetCompleteInventory: (state) => {
            const completeInventory = {}

            return completeInventory
        }
    },
    actions: {
        /* ================= ================= =================
            POKEBALL FUNCTIONS
            ================= ================= ================= */
        BuyPokeball(type, amount = 1) {
            const item = this.pokeballs[type];

            // Make sure the pokeball type is valid
            if (!item) {
                console.warn(`Could not find pokeball type of: ${type}`);
                return false;
            }

            const totalCost = item.cost * amount;

            // Make sure player has enough money
            if (this.funds < totalCost) {
                console.warn(`Insufficient funds. Required: $${totalCost}, Current: $${this.funds}`);
                return false;
            }

            // Complete the transaction
            this.funds -= totalCost;
            item.count += amount;
            return true;
        },

        UsePokeball(type) {
            if(type === "pokeball"){
                return true
            }
            const item = this.pokeballs[type];

            // Make sure the pokeball type is valid and available
            if (!item || item.count <= 0) {
                console.warn(`Cannot use pokeball, none in inventory: ${type}. Switching to Default Pokeball`);
                this.selectedPokeball = "pokeball"
                return false;
            }

            item.count--;
            return true;
        },
        /* ================= ================= =================
            FUND FUNCTIONS
            ================= ================= ================= */
        AddFunds(amount){
            const value = Number(amount)

            if(!isNaN(value) && value > 0){
                this.funds += value
                return true
            }
            console.warn(`Invalid funds amount: ${value}`)
            return false
        },
        /* ================= ================= =================
            RECOVERY FUNCTIONS
            ================= ================= ================= */
        UseRecovery(itemType){
            const item = this.recoveryItems[itemType]

            if(!item || item.count <= 0){
                console.warn(`Could not find recovery item ${itemType}.`)
                return false
            }

            item.count--
            return true
            
        },
        BuyRecovery(itemType){
            const item = this.recoveryItems[itemType]

            if(!item){
                console.warn(`Could not find recovery item ${itemType}.`)
                return false
            }

            if(item.cost > this.funds){
                console.warn(`You do not have enough funds to buy a(n) ${item.id}.`)
                return false
            }

            this.funds -= item.cost
            item.count++

            return true
        }
    }
})