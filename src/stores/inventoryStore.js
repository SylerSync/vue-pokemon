import { defineStore } from "pinia"
import * as pokemonApi from "@/api/PokemonAPI"

export const useInventoryStore = defineStore("inventoryStore", {
    state: () => ({
        funds: 0,
        items: [],
        catalog: [],
        loading: false,
        selectedPokeball: 'pokeball'
    }),
    getters: {
        GetItemsByCategory: (state) => (category, isUser = false) => {
            console.log(`Get Items by Category: ${category}.`)
            if (!isUser) {
                return state.catalog.filter((item) => item.category === category);
            }
            console.log("User items:", state.items);
            if(state.items) {
                return state.items
                    .map((userItem) => {
                        const metadata = state.catalog.find((c) => c.id === userItem.itemId) || {};
                        return {
                            ...metadata,
                            itemId: userItem.itemId,
                            count: userItem.count
                        };
                    })
                    .filter((item) => item.category === category && item.count > 0);
            }
        },
        GetRecoveryItems: (state) => (isUser = false) => {
            const RECOVERY_CATS = [
                "recovery",
                "Status-recovery",
                "pp-recovery",
                "stat-boosters"
            ];

            if (!isUser) {
                return state.catalog.filter(catItem =>
                    catItem && RECOVERY_CATS.includes(catItem.category)
                );
            }

            if (!Array.isArray(state.items)) return [];

            return state.items
                .map(userItem => {
                    const id = (userItem.itemId || userItem.ItemId || '').toLowerCase();
                    const count = userItem.count ?? userItem.Count ?? 0;

                    // Look up directly in state.catalog
                    const catalogData = state.catalog.find(
                        c => (c.itemId || c.id || '').toLowerCase() === id
                    );

                    if (!catalogData) return null;

                    return {
                        ...catalogData,
                        id,
                        count
                    };
                })
                .filter(item => item && item.count > 0 && RECOVERY_CATS.includes(item.category));
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
                    var response = await pokemonApi.addFunds(user.email, amount);

                    this.items = response.ftems;
                    this.funds = response.funds;
                } catch (err) {
                    console.error(`There was an issue adding funds for ${user.email}.`, err);
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
                    console.error(`There was an issue buying an item for ${user.email}.`, err);
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
                    var response = await pokemonApi.useItem(user.email, itemId, quantity);

                    this.items = response.items;
                    this.funds = response.funds;
                } catch (err) {
                    console.error(`There was an issue using an item for ${user.email}.`, err);
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
                    var response = await pokemonApi.addItem(user.email, itemId, quantity);
                    this.items = response.items;
                    this.funds = response.funds;
                } catch (err) {
                    console.error(`There was an issue adding an item for ${user.email}.`, err);
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