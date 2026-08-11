import {defineStore} from "pinia"

export const useInventoryStore = defineStore("inventoryStore", {
    state: () => ({
        pokeballs : {
            greatball : {
                count:0,
                cost:1000
            },
            ultraball: {
                count:0,
                cost:2000
            },
            masterball : {
                count:0,
                cost:100000
            }
        },
        recoveryItems : {
            revive : 0
        },
        selectedPokeball : "",
        funds : 0
    }),
    getters:{

    },
    actions: {
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
            const item = this.pokeballs[type];

            // Make sure the pokeball type is valid and available
            if (!item || item.count <= 0) {
                console.warn(`Cannot use pokeball, none in inventory: ${type}`);
                return false;
            }

            item.count--;
            return true;
        }
    }
})