import { defineStore } from "pinia"
import * as pokemonApi from "@/api/PokemonAPI"

export const useInventoryStore = defineStore("inventoryStore", {
    state: () => ({
        funds: 0,
        items: [],
        catalog: [],
        loading: false
    }),
    getters: {
        GetItemsByCategory: (state) => (category, isUser = false) => {
            if (!isUser) {
                // Return DB catalog items matching the PascalCase 'Category' property
                return state.catalog.filter((item) => item.category === category);
            }
            // Return user's owned items matched with DB catalog metadata using PascalCase properties
            return state.items
                .map((userItem) => {
                    const metadata = state.catalog.find((c) => c.Id === userItem.itemId) || {};
                    return {
                        ...metadata,
                        ItemId: userItem.itemId,
                        Count: userItem.count
                    };
                })
                .filter((item) => item.category === category && item.Count > 0);
        }
    },
    actions: {
        // Used to fetch catalog data at the start of the app
        async FetchCatalog() {
            try {
                this.catalog = await pokemonApi.getAllItems()
            } catch (err) {
                console.error("Failed to load item catalog from database: ", err)
            }
        },
        /* =========================================================
            FUND FUNCTIONS
           ========================================================= */
        async AddFunds(amount) {
            var user = JSON.parse(localStorage.getItem('user') || 'null');
            if (user !== null) {
                try {
                    var response = await pokemonApi.addFunds(user.Email, amount);
                    
                    this.items = response.ftems;
                    this.funds = response.funds;
                } catch (err) {
                    console.error(`There was an issue adding funds for ${user.Email}.`, err);
                }
            }
        },

        /* =========================================================
            BUY ITEMS
           ========================================================= */
        async BuyItem(itemId, quantity = 1) {
            var user = JSON.parse(localStorage.getItem('user') || 'null');
            console.log(user)
            if (user !== null) {
                try {
                    var response = await pokemonApi.buyItem(user.email, itemId, quantity);
                    console.log(response)
                    this.items = response.items;
                    this.funds = response.funds;
                    return true;
                } catch (err) {
                    console.error(`There was an issue buying an item for ${user.Email}.`, err);
                    return false;
                }
            }
        },

        /* =========================================================
            USE ITEMS
           ========================================================= */
        async UseItem(itemId, quantity = 1) {
            var user = JSON.parse(localStorage.getItem('user') || 'null');
            if (user !== null) {
                try {
                    var response = await pokemonApi.useItem(user.Email, itemId, quantity);
                    
                    this.items = response.items;
                    this.funds = response.funds;
                } catch (err) {
                    console.error(`There was an issue using an item for ${user.Email}.`, err);
                }
            }
        },

        /* =========================================================
            ADD ITEMS
           ========================================================= */
        async AddItem(itemId, quantity = 1) {
            var user = JSON.parse(localStorage.getItem('user') || 'null');
            if (user !== null) {
                try {
                    var response = await pokemonApi.addItem(user.Email, itemId, quantity);
                    this.items = response.items;
                    this.funds = response.funds;
                } catch (err) {
                    console.error(`There was an issue adding an item for ${user.Email}.`, err);
                }
            }
        },

        /* =========================================================
            GET USER INVENTORY
           ========================================================= */
        async GetUserInventory() {
            var user = JSON.parse(localStorage.getItem('user') || 'null');
            if (user !== null) {
                try {
                    var response = await pokemonApi.getInventory(user.email);
                    this.items = response.items;
                    this.funds = response.funds;
                } catch (err) {
                    console.error(`Unable to find inventory for ${user.email}.`, err);
                }
            } else {
                console.error("Unable to find inventory: No user found in localStorage.");
            }
        }
    }
})