import { defineStore } from "pinia"
import tmsData from "@/assets/data/tms.json"
import evolutionItems from "@/assets/data/evolutionItems.json"
import megaEvoStones from "@/assets/data/megaEvos.json"

export const useInventoryStore = defineStore("inventoryStore", {
    state: () => ({
        pokeballs: {
            greatball: {
                count: 0,
                cost: 1000,
                catchPower: 15
            },
            ultraball: {
                count: 0,
                cost: 2000,
                catchPower: 35

            },
            masterball: {
                count: 0,
                cost: 100000,
                catchPower: 100
            }
        },
        recoveryItems: {
            revive: {
                count: 0,
                cost: 300,
                effect: {
                    type: "revive",
                    percent: 0.50
                }
            },
            maxrevive: {
                count: 0,
                cost: 1000,
                effect: {
                    type: "revive",
                    percent: 1.00
                }
            },
            potion: {
                count: 0,
                cost: 100,
                effect: {
                    type: "heal",
                    amount: 20
                }
            },
            super_potion: {
                count: 0,
                cost: 400,
                effect: {
                    type: "heal",
                    amount: 55
                }
            },
            hyper_potion: {
                count: 0,
                cost: 1000,
                effect: {
                    type: "heal",
                    amount: 150
                }
            },
            max_potion: {
                count: 0,
                cost: 2000,
                effect: {
                    type: "heal",
                    amount: 1000
                }
            },
            antidote: {
                count: 0,
                cost: 100,
                effect: {
                    type: "status-heal",
                    status: "poison"
                }
            },
            burn_heal: {
                count: 0,
                cost: 250,
                effect: {
                    type: "status-heal",
                    status: "burn"
                }
            },
            ice_heal: {
                count: 0,
                cost: 250,
                effect: {
                    type: "status-heal",
                    status: "freeze"
                }
            },
            awakening: {
                count: 0,
                cost: 250,
                effect: {
                    type: "status-heal",
                    status: "sleep"
                }
            },
            paralyze_heal: {
                count: 0,
                cost: 200,
                effect: {
                    type: "status-heal",
                    status: "paralysis"
                }
            }

        },
        tms: {

        },
        evoItems: {

        },
        megaStones: {

        },
        selectedPokeball: "pokeball",
        funds: 5000
    }),
    getters: {
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
            const completeInventory = {
                "pokeballs": state.pokeballs,
                "recoveryItems": state.recoveryItems,
                "tms": state.tms,
                "evoItems": state.evoItems,
                "megaStones": state.megaStones
            }
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
            if (type === "pokeball") {
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
        AddFunds(amount) {
            const value = Number(amount)

            if (!isNaN(value) && value > 0) {
                this.funds += value
                return true
            }
            console.warn(`Invalid funds amount: ${value}`)
            return false
        },
        /* ================= ================= =================
            RECOVERY FUNCTIONS
            ================= ================= ================= */
        UseRecovery(itemType) {
            const item = this.recoveryItems[itemType]

            if (!item || item.count <= 0) {
                console.warn(`Could not find recovery item ${itemType}.`)
                return false
            }

            item.count--
            return true

        },
        BuyRecovery(itemType) {
            const item = this.recoveryItems[itemType]

            if (!item) {
                console.warn(`Could not find recovery item ${itemType}.`)
                return false
            }

            if (item.cost > this.funds) {
                console.warn(`You do not have enough funds to buy a(n) ${item.id}.`)
                return false
            }

            this.funds -= item.cost
            item.count++

            return true
        },
        /* ================= ================= =================
            TM FUNCTIONS
            ================= ================= ================= */
        BuyTM(tmId) {
            // 1. Ensure `tms` object exists on state
            if (!this.tms) {
                this.tms = {};
            }

            // 2. Fetch static metadata from tms.json
            const item = tmsData[tmId]; // Import tmsData from '@/assets/data/tms.json'
            if (!item) {
                console.warn(`Could not find TM definition for ${tmId}`);
                return false;
            }

            // 3. Check funds
            if (this.funds < item.cost) {
                console.warn(`Insufficient funds to buy ${item.code}`);
                return false;
            }

            // 4. Complete transaction & safely initialize count
            this.funds -= item.cost;
            this.tms[tmId] = (this.tms[tmId] || 0) + 1;

            return true;
        },
        UseTM(tmId) {
            if (!this.tms[tmId] || this.tms[tmId] <= 0) {
                console.warn(`No ${tmId} remaining in inventory.`)
                return false
            }

            this.tms[tmId]--

            if (this.tms[tmId] <= 0) {
                delete this.tms[tmId]
            }
            return true
        },
        /* ================= ================= =================
            EVOLUTION FUNCTIONS
            ================= ================= ================= */
        UseEvoItem(evoId) {
            if (!this.evoItems[evoId] || this.evoItems[evoId] <= 0) {
                console.warn(`No ${evoId} remaining in inventory.`)
                return false
            }
            this.evoItems[evoId]--

            if (this.evoItems[evoId] <= 0) {
                delete this.evoItems[evoId]
            }
            return true
        },
        BuyEvoItem(evoId) {
            if (!this.evoItems) {
                this.evoItems = {};
            }
            const item = evolutionItems[evoId]
            if (!item) {
                console.warn(`Could not find item in evolution items with id ${evoId}`)
                return false
            }
            if (this.funds < item.cost) {
                console.warn(`You do not have the funds to purchase item with id: ${evoId}`)
                return false
            }
            this.funds -= item.cost
            this.evoItems[evoId] = (this.evoItems[evoId] || 0) + 1;

            return true

        },
        AddEvoItem(evoId) {
            if (!this.evoItems) {
                this.evoItems = {};
            }
            const item = evolutionItems[evoId]
            if (!item) {
                console.warn(`Could not find item in evolution items with id ${evoId}`)
                return false
            }
            this.evoItems[evoId] = (this.evoItems[evoId] || 0) + 1;

            return true
        },
        /* ================= ================= =================
            MEGA EVOLUTION FUNCTIONS
            ================= ================= ================= */
        UseMegaStone(stoneName) {
            if (!this.megaStones[stoneName] || this.megaStones[stoneName] <= 0) {
                console.warn(`You dont have any ${stoneName}`)
                return false
            }
            this.megaStones[stoneName]--

            if (this.megaStones[stoneName] <= 0) {
                delete this.megaStones[stoneName]
            }
            return true
        },
        BuyMegaStone(stoneName) {
            if (!this.megaStones) {
                this.megaStones = {}
            }
            const item = megaEvoStones[stoneName]
            if (!item) {
                console.warn(`Could not find the megastone named: ${stoneName}`)
                return false
            }
            if (this.funds < item.cost) {
                console.warn(`You do not have the funds to purchase Mega stone with ID: ${stoneName}`)
                return false
            }
            this.funds -= item.cost
            this.megaStones[stoneName] = (this.megaStones[stoneName] || 0) + 1;

            return true
        },
        AddEvoItem(stoneName) {
            if (!this.megaStones) {
                this.megaStones = {}
            }
            const item = megaEvoStones[stoneName]
            if (!item) {
                console.warn(`Could not find item in Mega Stones with ID: ${stoneName}`)
                return false
            }
            this.megaStones[stoneName] = (this.megaStones[stoneName] || 0) + 1

            return true
        }
    },
    persist: {
        key: "inventory-store-save",
        pick: [
            "pokeballs",
            "funds",
            "recoveryItems",
            "tms",
            "evoItems",
            "megaStones",
            "selectedPokeball"
        ]
    }
})