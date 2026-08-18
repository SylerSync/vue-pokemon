<template>
  <Modal @close="requestClose">
    <div class="battle">
      <Splitter :sizes="[70, 30]" class="battle-split">
        <SplitterPanel :minSize="45" class="battle-stage">

          <!-- pre-battle -->
          <div v-if="!battleStarted" class="setup">
            <h2 class="setup-title">Choose your fighter</h2>
            <Select v-model="userPokemon" :options="team" :optionDisabled="isFainted" optionLabel="name" filter
              filterBy="name" showClear placeholder="Select a Pokémon" class="setup-select">
              <template #value="slotProps">
                <div v-if="slotProps.value" class="option-row">
                  <img v-if="slotProps.value.sprite" :src="slotProps.value.sprite" alt="" class="option-sprite" />
                  <span class="option-name">{{ slotProps.value.name }}</span>
                </div>
                <span v-else class="placeholder">{{ slotProps.placeholder }}</span>
              </template>
              <template #option="slotProps">
                <div class="option-row" :class="{ fainted: isFainted(slotProps.option) }">
                  <img v-if="slotProps.option.sprite" :src="slotProps.option.sprite" alt="" class="option-sprite" />
                  <span class="option-name">
                    {{ slotProps.option.name }} · Lv {{ slotProps.option.level }}
                  </span>
                  <span v-if="isFainted(slotProps.option)" class="fnt-tag">FNT</span>
                </div>
              </template>
            </Select>
            <button class="btn btn-primary" :disabled="!userPokemon" @click="startBattle">
              Start Battle
            </button>
          </div>

          <!-- in battle -->
          <div v-else class="arena">
            <!-- opponent: info left, sprite right -->
            <div class="combatant combatant-foe">
              <div class="combatant-info">
                <div class="combatant-head">
                  <span class="label">Lv {{ foe.level }}</span>
                  <span class="combatant-name">{{ foe.name }}</span>
                  <!-- Status icons -->
                  <template v-if="foe.status">
                    <img v-if="STATUS_ICONS[foe.status]" :src="STATUS_ICONS[foe.status]" :alt="foe.status"
                      :title="foe.status" class="status-icon" />
                    <span v-else class="status-chip" :title="foe.status">
                      {{ STATUS_ABBR[foe.status] ?? foe.status }}
                    </span>
                  </template>
                </div>
                <div class="hp">
                  <div class="hp-track">
                    <div class="hp-fill" :class="hpTone(foe)" :style="{ width: hpPercent(foe) + '%' }" />
                  </div>
                  <span class="hp-text">
                    {{ Math.max(0, foe.currentHp) }}/{{ foe.totalHp }}
                  </span>
                </div>
              </div>
              <img :src="foe.sprite" :alt="foe.name" class="battle-sprite sprite-foe"
                :class="anim?.actor === 'foe' ? `anim-${anim.type}` : null" />
            </div>
            <!-- player: sprite left, info right -->
            <div class="combatant combatant-ally">
              <div class="combatant-info">
                <div class="combatant-head">
                  <span class="label">Lv {{ userPokemon.level }}</span>
                  <span class="combatant-name">{{ userPokemon.name }}</span>
                  <!-- Status icons -->
                  <template v-if="userPokemon.status">
                    <img v-if="STATUS_ICONS[userPokemon.status]" :src="STATUS_ICONS[userPokemon.status]"
                      :alt="userPokemon.status" :title="userPokemon.status" class="status-icon" />
                    <span v-else class="status-chip" :title="userPokemon.status">
                      {{ STATUS_ABBR[userPokemon.status] ?? userPokemon.status }}
                    </span>
                  </template>
                </div>
                <div class="hp">
                  <div class="hp-track">
                    <div class="hp-fill" :class="hpTone(userPokemon)"
                      :style="{ width: hpPercent(userPokemon) + '%' }" />
                  </div>
                  <span class="hp-text">
                    {{ Math.max(0, userPokemon.currentHp) }}/{{ userPokemon.totalHp }}
                  </span>
                </div>
              </div>
              <img :src="userPokemon.backSprite ?? userPokemon.sprite" :alt="userPokemon.name"
                class="battle-sprite sprite-ally" :class="anim?.actor === 'ally' ? `anim-${anim.type}` : null" />
            </div>
            <!-- moves -->
            <div class="moves">
              <button v-for="move in userPokemon.moves" :key="move.name" class="move"
                :disabled="isResolving || move.disabled || (userPokemon.minorStatus?.includes('torment') && userPokemon.lastUsedMove?.name == move.name) || isFainted(userPokemon)"
                @click="battleTurn(move)">
                <span class="move-name">{{ move.name }}</span>
                <span class="move-power">{{ move.power ?? '—' }}</span>
              </button>
            </div>
            <!-- Mega Evolution Button -->
            <div class="megaEvo">
              <button class="mega-btn"
                :disabled="isResolving || isFainted(userPokemon) || userPokemon?.minorStatus?.includes('embargo')"
                v-if="canMegaEvolve && !hasMegaEvo" @click="handleMegaEvo(userPokemon)">
                Mega Evolve
              </button>
            </div>

            <!-- pokeballs -->
            <div v-if="isWild">
              <SelectButton v-model="inventoryStore.selectedPokeball" :options="pokeballOptions" optionLabel="label"
                optionValue="id" :optionDisabled="(option) => option.count <= 0" aria-labelledby="basic"
                class="custom-select-button">
                <template #option="slotProps">
                  <div class="pokeball-option" :title="slotProps.option.label">
                    <img :src="slotProps.option.icon" :alt="slotProps.option.label" class="pokeball-icon" />
                    <Badge :value="slotProps.option.count"
                      :severity="slotProps.option.count === '∞' || slotProps.option.count > 0 ? 'info' : 'secondary'"
                      class="pokeball-badge" />
                  </div>
                </template>
              </SelectButton>
              <button :disabled="isResolving || !inventoryStore.selectedPokeball"
                @click="battleTurn(null, inventoryStore.selectedPokeball)">
                Catch Pokemon
              </button>
            </div>
          </div>
        </SplitterPanel>

        <!-- side panel -->
        <SplitterPanel :minSize="20" class="side-panel">
          <div class="panel-tabs" role="tablist">
            <button v-for="tab in TABS" :key="tab.id" class="tab-btn" :class="{ active: sidePanel === tab.id }"
              role="tab" :aria-selected="sidePanel === tab.id" @click="sidePanel = tab.id">
              {{ tab.label }}
            </button>
          </div>

          <div class="panel-content">

            <!-- log -->
            <div v-if="sidePanel === 'log'" ref="logEl" class="log-body">
              <p v-for="(entry, i) in battleLog" :key="i" class="log-line">{{ entry }}</p>
              <p v-if="!battleLog.length" class="empty-msg">The battle hasn't started.</p>
            </div>

            <!-- team -->
            <div v-else-if="sidePanel === 'team'" class="team-body">
              <div v-for="pokemon in team" :key="pokemon.instanceId" class="team-card" :class="{
                fainted: isFainted(pokemon),
                active: pokemon.instanceId === userPokemon?.instanceId
              }" @click="switchActivePokemon(pokemon)">
                <img :src="pokemon.sprite" :alt="pokemon.name" class="team-sprite" />
                <div class="team-info">
                  <span class="team-name">{{ pokemon.name }}</span>
                  <span class="team-hp">
                    {{ Math.max(0, pokemon.currentHp ?? pokemon.totalHp) }} / {{ pokemon.totalHp }} HP
                  </span>
                </div>
                <span v-if="pokemon.instanceId === userPokemon?.instanceId" class="active-tag">ACTIVE</span>
              </div>
              <p v-if="!team.length" class="empty-msg">No Pokémon caught yet.</p>
            </div>

            <!-- items -->
            <div v-else-if="sidePanel === 'inventory'" class="inventory-body">
              <div class="target-picker-container">
                <label class="target-label" for="target-select">Target Pokémon</label>
                <Select id="target-select" v-model="selectedTargetPokemon" :options="team" optionLabel="name"
                  placeholder="Select Target" class="target-select">
                  <template #value="slotProps">
                    <div v-if="slotProps.value" class="target-option">
                      <span class="target-name">{{ slotProps.value.name }}</span>
                      <span class="target-hp-text">
                        {{ Math.max(0, slotProps.value.currentHp ?? slotProps.value.totalHp) }}/{{
                          slotProps.value.totalHp }}
                      </span>
                    </div>
                    <span v-else class="placeholder">{{ slotProps.placeholder }}</span>
                  </template>
                  <template #option="slotProps">
                    <div class="target-option-dropdown">
                      <div class="target-head">
                        <span class="target-name">{{ slotProps.option.name }}</span>
                        <span class="target-hp-text">
                          {{ Math.max(0, slotProps.option.currentHp ?? slotProps.option.totalHp) }}/{{
                            slotProps.option.totalHp }} HP
                        </span>
                      </div>
                      <div class="hp-track">
                        <div class="hp-fill" :class="hpTone(slotProps.option)"
                          :style="{ width: hpPercent(slotProps.option) + '%' }" />
                      </div>
                    </div>
                  </template>
                </Select>
              </div>

              <div v-for="item in formattedInventory" :key="item.id" class="item-card">
                <div class="item-info">
                  <span class="item-name">{{ item.id }}</span>
                  <span class="item-count">x{{ item.count }}</span>
                </div>
                <Button label="Use" size="small" :disabled="!canUseItem(item)" @click="useBattleItem(item)" />
              </div>

              <p v-if="!formattedInventory.length" class="empty-msg">No items in your bag.</p>
            </div>
          </div>
        </SplitterPanel>
      </Splitter>
    </div>
  </Modal>

  <Modal v-if="isSwapModalOpen" @close="closeReplaceMoveModal()">
    <template #default>
      <div class="move-swap-container">
        <div class="modal-header">
          <h3><strong>{{ userPokemon.name }}</strong> wants to learn <span class="highlight-move">{{ pendingMove.name
              }}</span></h3>
          <p>Select a move to forget, or skip learning {{ pendingMove.name }}.</p>
        </div>

        <!-- Current 4 Moves Grid -->
        <div class="moves-section">
          <span class="section-title">Current Moves</span>
          <div class="current-moves">
            <Card v-for="(move, index) in userPokemon.moves" :key="move.name + index" class="move-card select-card"
              @click="replaceMove(index)">
              <template #content>
                <div class="card-top">
                  <span class="move-title">{{ move.name }}</span>
                  <span class="type-pill"
                    :style="{ backgroundColor: pokemonStore.typeColors[move.type?.toLowerCase()] || '#777' }">
                    {{ move.type }}
                  </span>
                </div>
                <div class="card-details">
                  <span><strong>PWR:</strong> {{ move.power || '—' }}</span>
                </div>
                <div class="hover-action">Forget Move</div>
              </template>
            </Card>
          </div>
        </div>

        <!-- Cancel / Skip Learning Card -->
        <div class="cancel-section">
          <span class="section-title">New Move</span>
          <Card class="move-card cancel-card" @click="closeReplaceMoveModal()">
            <template #content>
              <div class="card-top">
                <span class="move-title">{{ pendingMove.name }}</span>
                <span class="type-pill"
                  :style="{ backgroundColor: pokemonStore.typeColors[pendingMove.type?.toLowerCase()] || '#777' }">
                  {{ pendingMove.type }}
                </span>
              </div>
              <div class="card-details">
                <span><strong>PWR:</strong> {{ pendingMove.power || '—' }}</span>
              </div>
              <div class="hover-action cancel">Don't Learn</div>
            </template>
          </Card>
        </div>
      </div>
    </template>
  </Modal>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue';
import Splitter from 'primevue/splitter';
import SplitterPanel from 'primevue/splitterpanel';
import Select from 'primevue/select';
import Button from 'primevue/button';
import Modal from '@/components/Modal.vue';
import { usePokemonStore } from '@/stores/pokemonStore';
import { useInventoryStore } from '@/stores/inventoryStore';
import Card from "primevue/card"
import SelectButton from 'primevue/selectbutton';
import Badge from 'primevue/badge';
import expChart from "@/assets/data/levelThresholds.json"
import * as pokeapi from "@/api/pokeapi";
import * as pokemonHelper from "@/assets/helpers/pokemonHelper.js"
import paralysisIcon from '@/assets/statusIcons/paralysis.png';
import sleepIcon from '@/assets/statusIcons/sleep.png';
import frozenIcon from '@/assets/statusIcons/frozen.png';
import burnIcon from '@/assets/statusIcons/burn.png';
import poisonIcon from '@/assets/statusIcons/poison.png';
import { getRandomWithExclusions } from '@/assets/helpers/numberHelper.js'
import megaEvos from "@/assets/data/megaEvos.json"

/* ------------------------------------------------------------------ *
 * Status Icons
 * ------------------------------------------------------------------ */
const STATUS_ICONS = {
  paralysis: paralysisIcon,
  sleep: sleepIcon,
  freeze: frozenIcon,
  burn: burnIcon,
  poison: poisonIcon
};

const STATUS_ABBR = {
  burn: 'BRN', poison: 'PSN', 'bad-poison': 'TOX',
  freeze: 'FRZ', paralysis: 'PAR', sleep: 'SLP',
};

/* ------------------------------------------------------------------ *
 * Props & emits
 * ------------------------------------------------------------------ */

const props = defineProps({
  /** The Pokémon being fought. Cloned internally — never mutated. */
  opponent: { type: Object, required: true },
  /** team of opponents pokemon when fighting a trainer */
  oppTeam: { type: Object, default: null },
  /** Roster to fight with. Defaults to the player's caught Pokémon. */
  team: { type: Array, default: null },
  /** Skip the fighter picker and open straight into battle. */
  autoStart: { type: Boolean, default: false },
  /** Flags if the fight is against a wild pokemon to show pokeballs */
  isWild: { type: Boolean, default: false },

});

const emit = defineEmits(['close', 'end', 'caught', 'fled']);

const pokemonStore = usePokemonStore();
const inventoryStore = useInventoryStore();

const canMegaEvolve = ref(false)

/* ------------------------------------------------------------------ *
 * State
 * ------------------------------------------------------------------ */

const TABS = [
  { id: 'log', label: 'LOG' },
  { id: 'team', label: 'TEAM' },
  { id: 'inventory', label: 'ITEMS' }
];

const battleStarted = ref(false);
const isResolving = ref(false);
const battleLog = ref([]);
const sidePanel = ref('log');
const logEl = ref(null);
const anim = ref(null);
const isSwapModalOpen = ref(false)
const pendingMove = ref(null)

const userPokemon = ref(null);
const selectedTargetPokemon = ref(null);

// Map IDs to PokeAPI sprite URLs
const pokeballIcons = {
  pokeball: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png",
  greatball: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/great-ball.png",
  ultraball: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/ultra-ball.png",
  masterball: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/master-ball.png"
};

const pokeballOptions = computed(() => {
  const standardPokeball = {
    id: "pokeball",
    label: "Pokeball",
    icon: pokeballIcons.pokeball,
    count: '∞'
  };

  const storeBalls = Object.keys(inventoryStore.pokeballs).map((key) => ({
    id: key,
    label: key.charAt(0).toUpperCase() + key.slice(1),
    icon: pokeballIcons[key] || pokeballIcons.pokeball,
    count: inventoryStore.pokeballs[key].count
  }));

  return [standardPokeball, ...storeBalls];
});

/** Working copy of the opponent so the parent's object is never mutated. */
const foe = ref(null)

const team = computed(() => props.team ?? pokemonStore.caughtPokemon);

const formattedInventory = computed(() => {
  const items = inventoryStore.recoveryItems;
  if (!items) return [];

  return Object.entries(items)
    .filter(([key, data]) => data.count > 0) // Only show items you actually own
    .map(([key, data]) => {
      // Clean up the name for display (e.g., 'maxrevive' -> 'Max Revive')
      let displayName = key === 'maxrevive' ? 'Max Revive' : key.charAt(0).toUpperCase() + key.slice(1);

      return {
        id: key,            // 'potion', 'revive', etc.
        name: displayName,
        count: data.count,
        effect: data.effect // Passes your { type: "heal", amount: 20 } along!
      };
    });
});

const MAJOR_STATUSES = new Set([
  'burn', 'freeze', 'paralysis', 'poison', 'bad-poison', 'sleep',
]);

const STAT_LABEL = {
  attack: 'Attack', defense: 'Defense',
  'special-attack': 'Sp. Atk', 'special-defense': 'Sp. Def',
  speed: 'Speed', accuracy: 'accuracy', evasion: 'evasiveness',
};

const SELF_KO_MOVES = new Set([
  'self-destruct', 'explosion', 'misty-explosion', 'final-gambit',
  'memento', 'healing-wish', 'lunar-dance',
]);

const prettyName = (n) => n.replace(/-/g, ' ');

const freshStages = () => ({
  attack: 0, defense: 0, 'special-attack': 0,
  'special-defense': 0, speed: 0, accuracy: 0, evasion: 0,
});

if (props.isWild) {
  foe.value = makeCombatant(props.opponent);
} else {
  foe.value = props.oppTeam[0];
}

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const hasMegaEvo = ref(false)

function checkMegaEvo() {
  const rawItem = userPokemon.value?.heldItem
  if(userPokemon.value.name.toLowerCase() === "rayquaza" && userPokemon.value.moves.some(m => m.name.toLowerCase() === "dragon-ascent")){
    canMegaEvolve.value = true
  }
  if (rawItem && rawItem !== "") {
    // 1. Normalize key: "Charizardite-X" -> "charizardite-x"
    const key = rawItem.toLowerCase().trim()

    // 2. Safely resolve megaEvos whether it's imported directly or wrapped in .default
    const catalog = megaEvos.default || megaEvos

    // 3. Try exact key, normalized key, or case-insensitive search
    const hItem = catalog[rawItem] || catalog[key] ||
      Object.values(catalog).find(item => item.name?.toLowerCase() === key)

    if (hItem) {
      if (
        hItem.pokemon?.toLowerCase() === userPokemon.value.name.toLowerCase() &&
        !hasMegaEvo.value
      ) {
        canMegaEvolve.value = true
      } else {
        console.log(
          `Held item ${hItem.name} does not work for ${userPokemon.value.name}. ` +
          `Requires: ${hItem.pokemon} - Current: ${userPokemon.value.name}`
        )
      }
    } else {
      console.log(`Could not find key "${key}" in megaEvos dictionary. Available keys:`, Object.keys(catalog))
    }
  }
}

async function handleMegaEvo(pokemon) {
  console.log(`Converting ${pokemon.name}.`)
  const megaEvo = await pokemonHelper.handleMegaEvo(pokemon)

  userPokemon.value = megaEvo
  hasMegaEvo.value = true
  console.log(userPokemon.value)
}


function makeCombatant(source) {
  return {
    ...structuredClone(JSON.parse(JSON.stringify(source))),
    stages: freshStages(),
    status: null,
    flinched: false,
  };
}

function isFainted(p) {
  return (p?.currentHp ?? p?.totalHp ?? 0) <= 0;
}

function hpPercent(p) {
  const max = p?.totalHp;
  const cur = p?.currentHp ?? max;
  if (!max || typeof cur !== 'number') return 0;
  return Math.max(0, Math.min(100, (cur / max) * 100));
}

function hpTone(p) {
  const pct = hpPercent(p);
  return pct > 50 ? 'ok' : pct > 20 ? 'warn' : 'crit';
}

function log(message) {
  battleLog.value.push(message);
}

async function playAnim(actor, type, ms) {
  anim.value = { actor, type };
  await delay(ms);
  anim.value = null;
}

function isPokeball(item) {
  return Object.prototype.hasOwnProperty.call(inventoryStore.pokeballs, item) || item === "pokeball"
}

function canUseItem(item) {
  if (isResolving.value || item.count <= 0) return false;
  if (isPokeball(item)) return battleStarted.value;
  return !!selectedTargetPokemon.value;
}

function isHealBlocked(pokemon) {
  return pokemon.minorStatus?.includes('heal-block') ?? false;
}

function applyPerishSong(pokemon) {
  if (!pokemon) return false;
  if (!pokemon.minorStatus) pokemon.minorStatus = [];
  if (pokemon.minorStatus.includes('perish-song')) return false;
  pokemon.minorStatus.push('perish-song');
  pokemon.perishTurns = 4;
  return true;
}

/* ------------------------------------------------------------------ *
 * Battle lifecycle
 * ------------------------------------------------------------------ */

function startBattle() {
  if (!userPokemon.value) return;
  if (userPokemon.value.currentHp == null) {
    userPokemon.value.currentHp = userPokemon.value.totalHp;
  }
  console.log(userPokemon.value)
  checkMegaEvo()
  userPokemon.value.stages = freshStages();
  userPokemon.value.flinched = false;
  battleStarted.value = true;
  selectedTargetPokemon.value = userPokemon.value;
  log(`A wild ${foe.value.name} appeared!`);
  log(`Go, ${userPokemon.value.name}!`);
}

function endBattle(outcome = 'ended') {
  battleStarted.value = false;
  isResolving.value = false;
  canMegaEvolve.value = false
  emit('end', { outcome, opponent: foe.value, pokemon: userPokemon.value });
  emit('close');
}

function requestClose() {
  if (isResolving.value) return; // don't close mid-turn
  endBattle('closed');
}

/* ------------------------------------------------------------------ *
 * Turn resolution
 * ------------------------------------------------------------------ */

async function battleTurn(playerMove, item = null) {
  if (!battleStarted.value || isResolving.value) return;
  isResolving.value = true;

  try {
    const player = userPokemon.value;
    const wild = foe.value;
    const wildMove = pickMove(wild);

    // --- item branch: using an item costs your turn ---
    if (item) {
      if (isPokeball(item)) {
        const caught = await throwPokeball(wild, item);
        if (caught) return endBattle('caught');
        if (!battleStarted.value) return; // it fled
      } else {
        const itemTarget = selectedTargetPokemon.value;
        if (itemTarget?.minorStatus?.includes('embargo')) {
          log(`${itemTarget.name} can't use items due to Embargo!`);
          await delay(800);
        } else {
          await handleUseRecoveryItem(item, selectedTargetPokemon.value);
        }
      }

      if (wildMove) {
        await useMove(wild, player, wildMove);
        if (await handleFaint(player)) return;
      }
      await endOfTurnPerish(wild);
      await endOfTurnPerish(player);
      if (await endOfTurn(wild, player)) return;
      if (await endOfTurn(player, wild)) return;

      return;
    }

    // --- normal turn: order by speed, ties broken randomly ---
    const playerSpeed = statOf(player, 'speed');
    const wildSpeed = statOf(wild, 'speed');
    const playerFirst =
      playerSpeed > wildSpeed ||
      (playerSpeed === wildSpeed && Math.random() < 0.5);

    const order = playerFirst
      ? [[player, wild, playerMove], [wild, player, wildMove]]
      : [[wild, player, wildMove], [player, wild, playerMove]];


    for (const [attacker, defender, move] of order) {
      if (!move || isFainted(attacker)) continue;
      await useMove(attacker, defender, move);
      const attackerDown = isFainted(attacker);
      if (await handleFaint(defender)) {
        if (attackerDown) await handleFaint(attacker);
        return;
      }
      if (attackerDown && await handleFaint(attacker)) return;
    }
    await endOfTurnPerish(wild);
    await endOfTurnPerish(player);
    if (await endOfTurn(wild, player)) return;
    if (await endOfTurn(player, wild)) return;

    // drowsy logic
    if (player.minorStatus?.includes('yawn')) {
      if (!player.yawnTurn) player.yawnTurn = 0
      if (player.yawnTurn == 1) {
        player.minorStatus = player.minorStatus.filter(s => s !== 'yawn')
        await inflictStatus(player, 'sleep')
        player.yawnTurn = 0
      } else {
        player.yawnTurn++
      }
    }
    if (wild.minorStatus?.includes('yawn')) {
      if (!wild.yawnTurn) wild.yawnTurn = 0
      if (wild.yawnTurn == 1) {
        wild.minorStatus = wild.minorStatus.filter(s => s !== 'yawn')
        await inflictStatus(wild, 'sleep')
      } else {
        wild.yawnTurn++
      }
    }
  } catch (err) {
    console.error('Turn failed:', err);
    log('Something went wrong.');
  } finally {
    isResolving.value = false;
  }
}

function statOf(pokemon, name) {
  // console.log(name)
  // console.log(pokemon.stages?.[name] ?? 0)
  const raw = pokemon.stats.find(s => s.name === name)?.stat ?? 1;
  let value = raw * stageMultiplier(pokemon.stages?.[name] ?? 0);
  if (name === 'attack' && pokemon.status === 'burn') value *= 0.5;
  if (name === 'speed' && pokemon.status === 'paralysis') value *= 0.5;
  return Math.floor(value);
}

function pickMove(pokemon) {
  // let move = {
  //   name: 'self-destruct',
  //   type: 'normal',
  //   power: 200,
  //   accuracy: 100,
  //   priority: 0,
  //   damageClass: 'physical',
  //   targetsSelf: false,        // target is 'all-other-pokemon'
  //   statChanges: [],
  //   statChance: 0,
  //   ailment: null,
  //   ailmentChance: 0,
  //   drain: 0,                  // ⚠️ not -100 — the self-KO isn't here
  //   healing: 0,
  //   flinchChance: 0,
  //   critRate: 0,
  //   minTurns: 0,               // null in API
  //   maxTurns: 0,               // null in API
  //   category: 'damage',        // ⚠️ not 'unique' or anything self-KO-ish
  // }
  // return move
  const moves = pokemon.moves ?? [];
  let disabledMoves = []
  if (pokemon.minorStatus?.includes("torment") && pokemon.lastUsedMove) {
    disabledMoves.push(moves.findIndex(m => m.name == pokemon.lastUsedMove.name))
    // console.log(disabledMoves)
  }
  if (pokemon.minorStatus?.includes("disable") && pokemon.lastUsedMove) {
    disabledMoves.push(moves.findIndex(m => m.disabled))
    // console.log(moves)
    // console.log(pokemon.lastUsedMove.name)
    console.log(disabledMoves)
  }
  let selectedMoveIndex = getRandomWithExclusions(0, moves.length - 1, disabledMoves);
  return moves[selectedMoveIndex];
}

function calcExperience(pokemon) {
  const baseExp = pokemon?.baseExp ?? 50;
  const level = pokemon?.level ?? 1;
  return Math.trunc(((baseExp * level) / 7) * (props.isWild ? 1.0 : 1.5));
}

async function checkLevelUp(pokemon) {
  const startingLevel = pokemon.level;

  // Internal recusive function incase multiple levels are gained
  async function processLeveling() {
    if (pokemon.level >= 100) {
      pokemon.currentExp = 0;
      return;
    }

    const nextLevel = pokemon.level + 1;
    const requiredExp = expChart[nextLevel];

    if (pokemon.currentExp >= requiredExp) {
      pokemon.currentExp -= requiredExp;
      pokemon.level++;
      console.log(`${userPokemon.value.name} has leveled up to ${userPokemon.value.level}!`)
      await checkEvolution(pokemon)
      await checkNewMoves(userPokemon.value)
      await processLeveling();
    }
  }

  await processLeveling();

  return pokemon.level > startingLevel;
}

//check for evolution by level
async function checkEvolution(pokemon) {
  if (!pokemon.evoDetails || !Array.isArray(pokemon.evoDetails) || pokemon.evoDetails.length === 0) {
    return false;
  }

  for (const evo of pokemon.evoDetails) {

    if (pokemon.level >= evo.level && evo.trigger === "level-up") {

      if (evo.heldItem && pokemon.heldItem !== evo.heldItem) {
        console.log(`Cannot evolve: Needs to be holding ${evo.heldItem} while leveling up.`);
        continue; // Try next evolution condition if available
      }

      console.log(`${pokemon.name} is ready to evolve into ${evo.nextEvo.name}!`);

      const evoSuccess = await pokemonHelper.handleEvolution(pokemon, evo.nextEvo.name);
      if (evoSuccess) {
        const updated = pokemonStore.caughtPokemon.find(p => p.instanceId === pokemon.instanceId)
        userPokemon.value = updated
        userPokemon.value.heldItem = ""
      }
      return evoSuccess
    }
  }

  return false;
}


//Recalculate stats
function recalcStats(pokemon) {
  pokemon.stats = pokemon.stats.map(s => ({
    name: s.name,
    base_stat: s.base_stat,
    stat: Math.floor(((2 * s.base_stat * pokemon.level) / 100) + 5)
  }))
  let oldHp = pokemon.totalHp
  console.log(oldHp)
  pokemon.totalHp = Math.floor(((2 * pokemon.stats.find(s => s.name == "hp")?.base_stat * pokemon.level) / 100) + pokemon.level + 10)
  pokemon.currentHp += pokemon.totalHp - oldHp
}

//Check for new moves by level
async function checkNewMoves(pokemon) {
  let pokeData = await pokeapi.getPokemon(pokemon.name)
  for (let move of pokeData.moves) {
    if (move?.version_group_details[0]?.level_learned_at == pokemon.level &&
      move?.version_group_details[0]?.move_learn_method?.name === "level-up") {
      console.log(`A new move has been found! ${move.move.name}`)
      //get move information
      const url = move.move.url
      const match = url.match(/\/(\d+)\/?$/);
      const id = match ? parseInt(match[1], 10) : null;
      let moveData = await pokemonHelper.getMoveData(await pokeapi.getMove(id))
      //Check if pokemon already has 4 moves
      if (pokemon.moves.length < 4) {
        pokemon.moves.push(moveData)
      }
      else if (pokemon.moves.length == 4) {
        pendingMove.value = moveData;
        await openReplaceMoveModal()
      }
    }
  }
}
let resolveMoveSwap = null

function openReplaceMoveModal() {
  isSwapModalOpen.value = true
  return new Promise((resolve) => {
    resolveMoveSwap = resolve;
  })
}

function closeReplaceMoveModal() {
  isSwapModalOpen.value = false
  pendingMove.value = null

  if (resolveMoveSwap) {
    resolveMoveSwap();
    resolveMoveSwap = null; // Clean up after buzzing
  }

}

function replaceMove(index) {
  if (userPokemon.value && pendingMove.value) {
    // Overwrite the move in the selected card slot
    userPokemon.value.moves[index] = pendingMove.value;
    console.log(`${userPokemon.value.name} forgot a move and learned ${pendingMove.value.name}!`);
  }

  // Close modal and release the Promise
  closeReplaceMoveModal();
}


/**
 * Handles a fainted combatant. Returns true if the turn should stop.
 */
async function handleFaint(pokemon) {
  if (!isFainted(pokemon)) return false;
  log(`${pokemon.name} fainted!`);
  canMegaEvolve.value = false
  await playAnim(pokemon === foe.value ? 'foe' : 'ally', 'faint', 700);

  if (pokemon === foe.value) {

    // Reward experience to the pokemon
    let rewardExp = calcExperience(pokemon)
    console.log(`${rewardExp} EXP has been rewarded!`)
    userPokemon.value.currentExp += rewardExp
    if (await checkLevelUp(userPokemon.value)) {
      recalcStats(userPokemon.value)
    }

    if (props.isWild) {
      const reward = Math.trunc(3000 - (pokemon.captureRate * 10));
      inventoryStore.AddFunds(reward);
      log(`You earned ₽${reward}.`);
      await delay(100)
      endBattle('won');
      return true;
    } else if (props.oppTeam) {
      let indexes = []
      for (const [index, poke] of props.oppTeam.entries()) {
        // if (foe.value)
        if (poke.currentHp > 0) {
          indexes.push(index)
        }
      }
      if (indexes.length > 0) {
        const randomIndex = indexes[Math.floor(Math.random() * indexes.length)]
        foe.value = props.oppTeam[randomIndex]
        return true
      }
      else {
        endBattle('won')
      }
    }
  }

  pokemon.status = ""

  // Player's Pokémon fainted — switch if anyone is left standing.
  const next = team.value.find(p => !isFainted(p) && p.instanceId !== pokemon.instanceId);
  if (next) {
    log(`Go, ${next.name}!`);
    userPokemon.value = next;
    sidePanel.value = 'team';
    return true;
  }

  log('You have no Pokémon left!');
  await delay(800);
  endBattle('lost');
  return true;
}

/* ------------------------------------------------------------------ *
 * Moves
 * ------------------------------------------------------------------ */

async function useMove(user, target, move) {
  let actor = user === userPokemon.value ? 'ally' : 'foe';
  let victim = actor === 'ally' ? 'foe' : 'ally';
  let hitsSelf = false
  user.lastUsedMove = move

  // --- pre-move status checks ---
  if (!(await canAct(user))) return;
  if (user.minorStatus?.includes("confusion")) {
    if (--user.confusionTurns <= 0) {
      user.minorStatus = user.minorStatus.filter(s => s !== 'confusion');
      log(`${user.name} snapped out of confusion.`);
      await delay(800);
    } else {
      log(`${user.name} is confused!`);
      hitsSelf = (randInt(1, 3) === 3)
      await delay(800)
    }
  }
  if (user.minorStatus?.includes("infatuation")) {
    if (randInt(1, 2) == 1) {
      log(`${user.name} is immobilized by love.`);
      return
    }
  }
  if (user.disabled && --user.disabled.turns <= 0) {
    console.log(user.disabled.move)
    console.log(user.moves)
    let move = user.moves.find(m => m.name === user.disabled.move)
    console.log(move)
    move.disabled = false
    user.minorStatus = user.minorStatus.filter(s => s !== 'disable');
    log(`${user.name}'s move ${prettyName(user.disabled.move)} is no longer disabled.`);
    user.disabled = false
    await delay(800);
  }

  if (hitsSelf) {
    log(`${user.name} hit itself in confusion.`);
    target = user;
    victim = "foe"
    move = {
      name: move.name,
      power: 40,
      accuracy: null,
      damageClass: 'physical'
    }
  } else {
    log(`${user.name} used ${prettyName(move.name)}!`);
    await playAnim(actor, 'lunge', 300);
  }
  // --- heal block: healing moves fail entirely ---
  if ((move.healing ?? 0) > 0 && isHealBlocked(user)) {
    log(`But ${user.name} can't use it due to Heal Block!`);
    await delay(800);
    return;
  }

  // --- accuracy (null = never misses) ---
  if (move.accuracy != null) {
    if (move.category === 'ohko') {
      if (randInt(1, 100) > move.accuracy + (user.level - target.level)) {
        log(`${user.name}'s attack missed!`);
        await delay(800);
        return;
      }
    } else {
      const evasion = target.minorStatus?.includes('no-type-immunity')
        ? 0
        : (target.stages?.evasion ?? 0);
      const accMod =
        stageMultiplier(user.stages?.accuracy ?? 0, true) / stageMultiplier(evasion, true);
      if (randInt(1, 100) > move.accuracy * accMod) {
        log(`${user.name}'s attack missed!`);
        await delay(800);
        return;
      }
    }
  }

  if (SELF_KO_MOVES.has(move.name)) {
    user.currentHp = 0;
  }

  let dealt = 0;

  // --- OHKO ---
  if (move.category === 'ohko') {
    if (target.level > user.level) {
      log(`${target.name} is unaffected!`);
      await delay(800);
      return;
    }
    if (typeEffectiveness(move.type, target.types) === 0) {
      log(`It doesn't affect ${target.name}...`);
      await delay(800);
      return;
    }
    target.currentHp = 0;
    await playAnim(victim, 'hit', 400);
    log("It's a one-hit KO!");
    await delay(800);
    return;
  }

  // --- damage ---
  if (move.power) {
    const results = calculateDamage(user, target, move);

    if (results.immune) {
      log(`It doesn't affect ${target.name}...`);
      await delay(800);
      return;
    }

    dealt = Math.min(results.damage, target.currentHp);
    target.currentHp = Math.max(0, target.currentHp - results.damage);
    await playAnim(victim, 'hit', 400);
    log(`${user.name} dealt ${results.damage} damage.`);

    if (results.critical) {
      await delay(600);
      log('A critical hit!');
    }
    if (results.effectiveness > 1) {
      await delay(600);
      log("It's super effective!");
    } else if (results.effectiveness > 0 && results.effectiveness < 1) {
      await delay(600);
      log("It's not very effective...");
    }
    await delay(600);
  }

  // fainted — skip every secondary effect
  if (target.currentHp <= 0) return;

  // --- stat changes ---
  const statChanges = move.statChanges ?? [];
  if (statChanges.length) {
    const chance = move.statChance || 100;
    if (randInt(1, 100) <= chance) {
      const recipient = move.targetsSelf ? user : target;
      for (const { stat, change } of statChanges) {
        const applied = applyStatChange(recipient, stat, change);
        log(statChangeMessage(recipient.name, stat, applied, change));
        await delay(700);
      }
    }
  }

  // --- status ailment ---
  if (move.ailment) {
    const chance = move.ailmentChance || 100;
    if (randInt(1, 100) <= chance) {
      const recipient = move.targetsSelf ? user : target;
      await inflictStatus(recipient, move.ailment, move);
    }
  }

  // --- drain / recoil ---
  if ((move.drain ?? 0) !== 0 && dealt > 0) {
    const amount = Math.max(1, Math.floor(dealt * (Math.abs(move.drain) / 100)));
    if (move.drain > 0) {
      if (isHealBlocked(user)) {
        log(`${user.name}'s HP was not restored due to Heal Block!`);
      } else {
        user.currentHp = Math.min(user.totalHp, user.currentHp + amount);
        log(`${user.name} drained ${amount} HP!`);
      }
    } else {
      user.currentHp = Math.max(0, user.currentHp - amount);
      log(`${user.name} is hit with ${amount} recoil!`);
    }
    await delay(700);
  }

  // --- healing ---
  if ((move.healing ?? 0) > 0) {
    const amount = Math.floor(user.totalHp * (move.healing / 100));
    const before = user.currentHp;
    user.currentHp = Math.min(user.totalHp, user.currentHp + amount);
    log(
      user.currentHp > before
        ? `${user.name} restored ${user.currentHp - before} HP!`
        : `${user.name}'s HP is already full!`
    );
    await delay(700);
  }

  // --- flinch ---
  if ((move.flinchChance ?? 0) > 0 && randInt(1, 100) <= move.flinchChance) {
    target.flinched = true;
  }

  await delay(400);
}

function calculateDamage(attacker, defender, move, opts = {}) {
  const critStage = (move.critRate ?? 0) + (attacker.critStages ?? 0);
  const critChance = [1 / 24, 1 / 8, 1 / 2, 1][Math.min(critStage, 3)];

  const {
    critical = Math.random() < critChance,
    randomFactor = randInt(85, 100) / 100,
    weatherMod = 1,
    otherMod = 1,
  } = opts;

  if (move.class === 'status' || !move.power) {
    return { damage: 0, effectiveness: 1, critical: false, immune: false };
  }

  let effectiveness = typeEffectiveness(move.type, defender.types);
  const grounded = defender.minorStatus?.includes('no-type-immunity') || (move.type === 'ground' && defender.minorStatus?.includes('ingrain'));
  if (grounded && effectiveness == 0) effectiveness = 1
  if (effectiveness === 0) {
    return { damage: 0, effectiveness: 0, critical: false, immune: true };
  }

  const physical = move.damageClass === 'physical';
  const atkStat = physical ? 'attack' : 'special-attack'
  const defStat = physical ? 'defense' : 'special-defense'

  const atk = critical ? Math.max(statOf(attacker, atkStat), rawStat(attacker, atkStat)) : statOf(attacker, atkStat);
  const def = critical ? Math.min(statOf(defender, defStat), rawStat(defender, defStat)) : statOf(defender, defStat);

  const base =
    Math.floor(
      Math.floor(
        (Math.floor((2 * attacker.level) / 5 + 2) * move.power * atk) / def
      ) / 50
    ) + 2;

  const stab = attacker.types.includes(move.type) ? 1.5 : 1;
  const critMod = critical ? 1.5 : 1;

  const damage = Math.max(
    1,
    Math.floor(base * weatherMod * critMod * randomFactor * stab * effectiveness * otherMod)
  );

  return { damage, effectiveness, critical, immune: false };
}

function rawStat(pokemon, name) {
  const raw = pokemon.stats.find(s => s.name === name)?.stat ?? 1;
  let value = raw;
  if (name === 'attack' && pokemon.status === 'burn') value *= 0.5;
  return Math.floor(value);
}

function typeEffectiveness(moveType, defenderTypes) {
  return defenderTypes.reduce(
    (mult, t) => mult * (pokemonStore.typeChart[moveType]?.[t] ?? 1),
    1
  );
}

function stageMultiplier(stage, isAccuracy = false) {
  const base = isAccuracy ? 3 : 2;
  return stage >= 0 ? (base + stage) / base : base / (base - stage);
}

function applyStatChange(target, statName, change) {
  if (!target.stages) target.stages = freshStages();
  const current = target.stages[statName] ?? 0;
  const next = Math.max(-6, Math.min(6, current + change));
  const applied = next - current;
  target.stages[statName] = next;
  return applied;
}

function statChangeMessage(name, statName, applied, requested) {
  const label = STAT_LABEL[statName] ?? statName;
  if (applied === 0) {
    return requested > 0
      ? `${name}'s ${label} won't go higher!`
      : `${name}'s ${label} won't go lower!`;
  }
  const mag = Math.abs(applied);
  const verb = applied > 0
    ? (mag >= 3 ? 'rose drastically' : mag === 2 ? 'rose sharply' : 'rose')
    : (mag >= 3 ? 'fell severely' : mag === 2 ? 'harshly fell' : 'fell');
  return `${name}'s ${label} ${verb}!`;
}

const STATUS_MESSAGES = {
  burn: (n) => `${n} was burned!`,
  poison: (n) => `${n} was poisoned!`,
  'bad-poison': (n) => `${n} was badly poisoned!`,
  paralysis: (n) => `${n} is paralyzed! It may be unable to move!`,
  freeze: (n) => `${n} was frozen solid!`,
  sleep: (n) => `${n} fell asleep!`,
  confusion: (n) => `${n} became confused!`,
  'heal-block': (n) => `${n} was prevented from healing!`,
  'leech-seed': (n) => `${n} was seeded!`,
  ingrain: (n) => `${n} planted its roots!`,
};

async function inflictStatus(target, ailment, move) {
  if (!target.minorStatus) target.minorStatus = [];
  // Major status effects
  if (MAJOR_STATUSES.has(ailment)) {
    if (target.status) {
      log(`But ${target.name} is already ${target.status}!`);
      await delay(700);
      return;
    }
    target.status = ailment;
    if (ailment === 'sleep') target.sleepTurns = randInt(2, 4);
    log((STATUS_MESSAGES[ailment] ?? ((n) => `${n} was afflicted with ${ailment}!`))(target.name));
    await delay(800);
    return;
  }

  if (ailment === 'perish-song') {
    const field = [userPokemon.value, foe.value].filter(Boolean);
    const affected = field.filter(applyPerishSong).length;
    if (!affected) {
      log('But it failed!');
      await delay(700);
      return;
    }
    log('All Pokémon that hear the song will faint in three turns!');
    await delay(800);
    return;
  }

  // Minor status effects
  if (target.minorStatus.includes(ailment)) {
    log(`But ${target.name} is already ${ailment}!`);
    await delay(700);
    return;
  }

  if (ailment === 'confusion') {
    target.confusionTurns = randInt(2, 5)
    target.minorStatus.push('confusion')
  }
  else if (ailment === 'trap') {
    target.minorStatus.push('trap')
    target.trapped = {
      move: prettyName(move.name),
      turns: randInt(move.minTurns || 4, move.maxTurns || 5),
    };
    log(`${target.name} was trapped by ${target.trapped.move}!`);
    await delay(800);
    return
  } else if (ailment === 'nightmare') {
    if (target.status != 'sleep') {
      log(`${target.name} is not asleep, ${prettyName(move.name)} failed!`);
      await delay(800);
      return
    }
    target.minorStatus.push('nightmare')
    target.nightmare = true
  } else if (ailment === 'disable') {
    if (!target.lastUsedMove) {
      log(`${target.name} has not used a move, ${prettyName(move.name)} failed!`);
      await delay(800);
      return
    }
    target.minorStatus.push(ailment)
    target.lastUsedMove.disabled = true
    target.disabled = {
      move: target.lastUsedMove.name,
      turns: 4
    }
  } else if (ailment === 'yawn') {
    if (target.status === 'sleep') {
      log(`${target.name} is already asleep, ${prettyName(move.name)} failed!`);
      await delay(800);
      return
    }
    target.minorStatus.push(ailment)
    log(`${target.name} has grown drowsy!`);
    await delay(800);
    return
  } else if (ailment === 'heal-block') {
    target.healBlockTurns = 5
    target.minorStatus.push(ailment)
  } else if (ailment === 'leech-seed') {
    if (target.types.includes('grass')) {
      log(`It doesn't affect ${target.name}...`);
      await delay(800);
      return;
    }
    target.minorStatus.push(ailment);
  } else if (ailment === 'embargo') {
    target.minorStatus.push(ailment)
    target.embargoTurns = 5
  }
  else {
    target.minorStatus.push(ailment)
  }


  log((STATUS_MESSAGES[ailment] ?? ((n) => `${n} was afflicted with ${ailment}!`))(target.name));
  await delay(800);
}

async function canAct(pokemon) {
  if (pokemon.flinched) {
    pokemon.flinched = false;
    log(`${pokemon.name} flinched and couldn't move!`);
    await delay(800);
    return false;
  }
  if (pokemon.status === 'sleep') {
    if (--pokemon.sleepTurns <= 0) {
      pokemon.minorStatus = pokemon.minorStatus.filter(s => s !== 'nightmare');
      pokemon.status = null;
      log(`${pokemon.name} woke up!`);
      await delay(800);
      return true;
    }
    log(`${pokemon.name} is fast asleep.`);
    await delay(800);
    return false;
  }
  if (pokemon.status === 'freeze') {
    if (randInt(1, 100) <= 20) {
      pokemon.status = null;
      log(`${pokemon.name} thawed out!`);
      await delay(800);
      return true;
    }
    log(`${pokemon.name} is frozen solid!`);
    await delay(800);
    return false;
  }
  if (pokemon.status === 'paralysis' && randInt(1, 100) <= 25) {
    log(`${pokemon.name} is paralyzed! It can't move!`);
    await delay(800);
    return false;
  }
  return true;
}

async function endOfTurn(target, reciver) {
  await endOfTurnIngrain(target)
  await endOfTurnDamage(target)
  await endOfTurnTrap(target)
  await endOfTurnLeechSeed(target, reciver)
  if (await handleFaint(target)) return true;
  await endOfTurnHealBlock(target)
  if (target.embargoTurns && --target.embargoTurns <= 0) {
    target.minorStatus = target.minorStatus.filter(s => s !== 'embargo');
    target.embargoTurns = null
    log(`${target.name}'s embargo has ended`)
  }
  return false
}

async function endOfTurnDamage(pokemon) {
  if (pokemon.currentHp <= 0) return;
  if (pokemon.minorStatus?.includes('nightmare')) {
    log(`${pokemon.name} is locked in a nightmare!`);
    const nightmareDamage = Math.max(1, Math.floor(pokemon.totalHp * (1 / 4)));
    pokemon.currentHp = Math.max(0, pokemon.currentHp - nightmareDamage);
    await delay(800)
  }
  const chip = { burn: 1 / 16, poison: 1 / 8, 'bad-poison': 1 / 8 }[pokemon.status];
  if (!chip) return;
  const amount = Math.max(1, Math.floor(pokemon.totalHp * chip));
  pokemon.currentHp = Math.max(0, pokemon.currentHp - amount);
  log(`${pokemon.name} is hurt by its ${pokemon.status}!`);
  await delay(800);
}

async function endOfTurnTrap(pokemon) {
  if (!pokemon.trapped || pokemon.currentHp <= 0) return;

  const amount = Math.max(1, Math.floor(pokemon.totalHp / 8));
  pokemon.currentHp = Math.max(0, pokemon.currentHp - amount);
  log(`${pokemon.name} is hurt by ${pokemon.trapped.move}!`);
  await delay(800);

  if (--pokemon.trapped.turns <= 0) {
    log(`${pokemon.name} was freed from ${pokemon.trapped.move}!`);
    pokemon.trapped = null;
    pokemon.minorStatus = pokemon.minorStatus.filter(s => s !== 'trap');
    await delay(700);
  }
}

async function endOfTurnHealBlock(pokemon) {
  if (!isHealBlocked(pokemon)) return;
  if (--pokemon.healBlockTurns <= 0) {
    pokemon.minorStatus = pokemon.minorStatus.filter(s => s !== 'heal-block');
    pokemon.healBlockTurns = 0;
    log(`${pokemon.name}'s Heal Block wore off!`);
    await delay(700);
  }
}

async function endOfTurnLeechSeed(target, receiver) {
  if (!target.minorStatus?.includes('leech-seed')) return;
  if (target.currentHp <= 0 || !receiver) return;

  const seedDamage = Math.max(1, Math.floor(target.totalHp / 8));
  const drained = Math.min(seedDamage, target.currentHp);
  target.currentHp = Math.max(0, target.currentHp - seedDamage);
  log(`${target.name}'s health was sapped by Leech Seed!`);
  await delay(800);

  if (isHealBlocked(receiver)) {
    log(`${receiver.name}'s HP was not restored due to Heal Block!`);
    await delay(700);
    return;
  }

  if (receiver.currentHp > 0) {
    receiver.currentHp = Math.min(receiver.totalHp, receiver.currentHp + drained);
    await delay(400);
  }
}

async function endOfTurnPerish(pokemon) {
  if (!pokemon.minorStatus?.includes('perish-song')) return;
  if (pokemon.currentHp <= 0) return;

  pokemon.perishTurns = (pokemon.perishTurns ?? PERISH_TURNS) - 1;
  log(`${pokemon.name}'s perish count fell to ${pokemon.perishTurns}!`);
  await delay(800);

  if (pokemon.perishTurns <= 0) {
    pokemon.minorStatus = pokemon.minorStatus.filter(s => s !== 'perish-song');
    pokemon.perishTurns = 0;
    pokemon.currentHp = 0;
  }
}

async function endOfTurnIngrain(pokemon) {
  if (!pokemon.minorStatus?.includes('ingrain')) return;
  if (pokemon.currentHp <= 0) return;

  if (isHealBlocked(pokemon)) {
    log(`${pokemon.name}'s roots can't absorb nutrients due to Heal Block!`);
    await delay(700);
    return;
  }
  if (pokemon.currentHp >= pokemon.totalHp) return;

  const amount = Math.max(1, Math.floor(pokemon.totalHp / 16));
  const before = pokemon.currentHp;
  pokemon.currentHp = Math.min(pokemon.totalHp, pokemon.currentHp + amount);
  log(`${pokemon.name} absorbed nutrients with its roots! (+${pokemon.currentHp - before} HP)`);
  await delay(800);
}

/* ------------------------------------------------------------------ *
 * Items
 * ------------------------------------------------------------------ */

async function useBattleItem(item) {
  await battleTurn(null, item);
}

async function handleUseRecoveryItem(item, targetPokemon) {
  if (!inventoryStore.recoveryItems[item.id]) {
    console.warn(`Can not find item ${item.id} in the inventory.`)
    return
  }

  const target = targetPokemon;
  if (!target) return;

  if (item.effect.type === 'heal' && isHealBlocked(target)) {
    log(`${target.name} can't be healed right now!`);
    sidePanel.value = 'log';
    await delay(800);
    return;
  }

  switch (item.effect.type) {
    case "revive":
      if (target.currentHp <= 0) {
        if (inventoryStore.UseRecovery(item.id)) {
          target.currentHp = Math.trunc(target.totalHp * item.effect.percent)
          battleLog.value.push(`${target.name} has been revived!`)
          selectedTargetPokemon.value = null;
          sidePanel.value = "log"
          await delay(800)
          return
        }
      }
      else {
        battleLog.value.push(`${target.name} is not fainted!`);
        sidePanel.value = 'log';
        await delay(800);
        return;
      }
    case "heal":
      if (target.currentHp <= 0) {
        battleLog.value.push(`${target.name} is fainted! Use a Revive instead.`);
        sidePanel.value = 'log';
        await delay(800);
        return;
      }
      else {
        if (target.currentHp == target.totalHp) {
          battleLog.value.push(`${target.name} is already at full HP!`);
          sidePanel.value = 'log';
          await delay(800);
          return;
        }
        if (inventoryStore.UseRecovery(item.id)) {
          target.currentHp = Math.min(target.totalHp, target.currentHp + item.effect.amount);
          battleLog.value.push(`${item.name} has been used on ${target.name}.`)
          selectedTargetPokemon.value = null;
          sidePanel.value = "log"
          await delay(800)
          return
        }
      }
    case "status-heal":
      if (target.status !== "" && target.status) {
        if (target.status === item.effect.status)
          target.status = ""
        inventoryStore.UseRecovery(item.id)
        battleLog.value.push(`${target.name} has been heal from status: ${item.effect.status}`)
        selectedTargetPokemon.value = null;
        await delay(800)
        return
      }
      else {
        battleLog.value.push(`${target.name} is not effected by ${item.effect.status}. Can't use this item.`)
        sidePanel.value = "log"
        await delay(800)
        return
      }
  }
}

async function applyItem(item, target) {
  if (!target) return;
  if (item.effect.type === 'heal' && isHealBlocked(target)) {
    log(`${target.name} can't be healed right now!`);
    sidePanel.value = 'log';
    await delay(800);
    return;
  }

  console.log(item)

  const currentHp = target.currentHp ?? 0;
  const isFainted = currentHp <= 0;
  const isFullHp = currentHp >= target.totalHp;
  // 1. Validate item effect against target state BEFORE consuming from store
  if (item.effect.type === 'heal') {
    if (isFainted) {
      battleLog.value.push(`${target.name} is fainted! Use a Revive instead.`);
      sidePanel.value = 'log';
      await delay(800);
      return;
    }
    if (isFullHp) {
      battleLog.value.push(`${target.name} is already at full HP!`);
      sidePanel.value = 'log';
      await delay(800);
      return;
    }
  } else if (item.effect.type === 'revive') {
    if (!isFainted) {
      battleLog.value.push(`${target.name} is not fainted!`);
      sidePanel.value = 'log';
      await delay(800);
      return;
    }
  }

  // 3. Consume item via Pinia store using return boolean validation
  const itemUsed = inventoryStore.UseRecovery(item.id);
  if (!itemUsed) {
    battleLog.value.push(`Failed to use ${item.name}. None remaining!`);
    return;
  }

  // 4. Apply exact recovery math directly
  if (item.effect.type === 'heal') {
    const healAmount = item.effect.amount;
    const previousHp = target.currentHp;

    target.currentHp = Math.min(
      target.totalHp,
      target.currentHp + healAmount
    );

    const actualHealed = target.currentHp - previousHp;
    battleLog.value.push(`Used ${item.name}! Restored ${actualHealed} HP to ${target.name}.`);
  }
  else if (item.effect.type === 'revive') {
    const revivedHp = Math.floor(target.totalHp * item.effect.percent);
    target.currentHp = revivedHp;
    battleLog.value.push(`Used ${item.name}! Revived ${target.name} with ${revivedHp} HP.`);
  }

  // Reset dropdown selection
  selectedTargetPokemon.value = null;
  sidePanel.value = 'log'; // Flip back to log view

  await delay(800);
}

async function throwPokeball(target, pokeball) {
  if (!inventoryStore.UsePokeball(pokeball)) {
    log(`You have no ${pokeball.label} left.`);
    return false;
  }
  const ball = inventoryStore.SelectedPokeballData(pokeball)

  log(`You threw a ${pokeball} at ${target.name}...`);
  await delay(800);

  const hpBonus = hpPercent(target) < 20 ? 20 : hpPercent(target) < 50 ? 10 : 0;
  const roll = randInt(0, 100) - ball.catchPower - hpBonus;
  const effectiveRoll = Math.min(100, Math.max(0, roll));

  if (effectiveRoll <= target.captureRate) {
    log(`Gotcha! ${target.name} was caught!`);
    pokemonStore.addPokemon(target);
    const reward = Math.trunc(3000 / target.captureRate);
    inventoryStore.AddFunds(reward);
    log(`You earned ₽${reward}.`);
    emit('caught', target);
    await delay(800);
    return true;
  }

  log(`Oh no! ${target.name} broke free!`);
  await delay(800);

  if (checkPokemonFlees(target)) {
    if (foe.value?.trapped || foe.value?.minorStatus?.includes('ingrain')) {
      log(`${target.name} can't flee!`);
      return false;
    }
    log(`${target.name} fled!`);
    emit('fled', target);
    await delay(800);
    endBattle('fled');
  }
  return false;
}

function checkPokemonFlees(pokemon) {
  const fleeChance = Math.min(20, 100 - pokemon.captureRate);
  return randInt(0, 100) <= fleeChance;
}

/* ------------------------------------------------------------------ *
 * Team switching
 * ------------------------------------------------------------------ */

async function switchActivePokemon(pokemon) {
  if (isResolving.value) return;
  if (isFainted(pokemon)) return;
  if (pokemon.instanceId === userPokemon.value?.instanceId) return;
  if (battleStarted.value && userPokemon.value?.trapped) {
    log(`${userPokemon.value.name} can't escape ${userPokemon.value.trapped.move}!`);
    sidePanel.value = 'log';
    return;
  }
  if (battleStarted.value && userPokemon.value?.minorStatus?.includes('ingrain')) {
    log(`${userPokemon.value.name} can't get its roots up!`);
    sidePanel.value = 'log';
    return;
  }

  if (!battleStarted.value) {
    userPokemon.value = pokemon;
    return;
  }

  userPokemon.value.stages = freshStages();
  userPokemon.value.flinched = false;
  userPokemon.value.minorStatus = [];
  userPokemon.value.healBlockTurns = 0;
  userPokemon.value.confusionTurns = 0;
  userPokemon.value.perishTurns = 0;
  userPokemon.value.embargoTurns = 0;
  userPokemon.value.trapped = null;
  userPokemon.value.disabled = false;

  isResolving.value = true;
  try {
    log(`${userPokemon.value.name}, come back!`);
    await delay(600);
    userPokemon.value = pokemon;
    if (pokemon.currentHp == null) pokemon.currentHp = pokemon.totalHp;
    log(`Go, ${pokemon.name}!`);
    sidePanel.value = 'log';
    await delay(600);

    // switching costs your turn
    const wildMove = pickMove(foe.value);
    if (wildMove) {
      await useMove(foe.value, userPokemon.value, wildMove);
      await handleFaint(userPokemon.value);
    }
    await endOfTurnPerish(foe.value);
    await endOfTurnPerish(pokemon);
    if (await endOfTurn(foe.value, pokemon)) return;
    if (await endOfTurn(pokemon, foe.value)) return;
  } finally {
    isResolving.value = false;
  }
}

/* ------------------------------------------------------------------ *
 * Log autoscroll
 * ------------------------------------------------------------------ */

watch(
  () => battleLog.value.length,
  async () => {
    const el = logEl.value;
    if (!el) return;
    const wasAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    await nextTick();
    if (wasAtBottom) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }
);

watch(sidePanel, async (tab) => {
  if (tab !== 'log') return;
  await nextTick();
  if (logEl.value) logEl.value.scrollTop = logEl.value.scrollHeight;
});

onMounted(() => {
  if (props.autoStart) {
    userPokemon.value = team.value.find(p => !isFainted(p)) ?? null;
    if (userPokemon.value) startBattle();
  }
});
</script>

<style scoped>
.battle-split {
  height: 26rem;
  width: 100%;
  max-width: 44rem;
  margin-inline: auto;
  border: 1px solid var(--p-content-border-color);
  border-radius: var(--p-content-border-radius);
  overflow: hidden;
}

/* ---- setup ---- */
.battle-stage {
  display: flex;
}

.setup {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  margin: auto;
  padding: 1.5rem;
  width: 100%;
  max-width: 16rem;
}

.setup-title {
  margin: 0;
  font-size: 0.6875rem;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--p-text-muted-color);
  text-align: center;
}

.setup-select {
  width: 100%;
}

.option-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.option-row.fainted {
  opacity: 0.5;
}

.option-sprite {
  width: 1.5rem;
  height: 1.5rem;
  object-fit: contain;
  image-rendering: pixelated;
}

.option-name {
  text-transform: capitalize;
}

.placeholder {
  color: var(--p-text-muted-color);
}

.fnt-tag {
  margin-inline-start: auto;
  font-size: 0.5625rem;
  letter-spacing: 0.06em;
  color: #ef4444;
}

/* ---- arena ---- */
.arena {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
  height: 100%;
  padding: 1rem;
  overflow-y: auto;
}

.combatant {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.combatant-foe {
  flex-direction: row;
  justify-content: space-between;
}

.combatant-ally {
  flex-direction: row-reverse;
  justify-content: space-between;
}

.combatant-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.combatant-head {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}

.label {
  font-size: 0.625rem;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--p-text-muted-color);
}

.combatant-name {
  font-weight: 600;
  text-transform: capitalize;
}

.hp {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.hp-track {
  flex: 1;
  height: 8px;
  border-radius: 4px;
  background: var(--p-surface-200);
  overflow: hidden;
}

.hp-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.45s ease-out, background-color 0.3s;
}

.hp-fill.ok {
  background: #22c55e;
}

.hp-fill.warn {
  background: #eab308;
}

.hp-fill.crit {
  background: #ef4444;
}

.hp-text {
  flex: none;
  min-width: 4.5rem;
  text-align: right;
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  color: var(--p-text-muted-color);
}

/* ---- sprites ---- */
.battle-sprite {
  flex: none;
  object-fit: contain;
  image-rendering: pixelated;
  filter: drop-shadow(0 3px 2px rgb(0 0 0 / 0.25));
}

.sprite-foe {
  width: 4.5rem;
  height: 4.5rem;
  align-self: flex-start;
}

.sprite-ally {
  width: 5.5rem;
  height: 5.5rem;
  align-self: flex-end;
}

.anim-lunge {
  animation: lunge 300ms ease-in-out;
}

.sprite-foe.anim-lunge {
  animation-name: lunge-foe;
}

.anim-hit {
  animation: hit 400ms steps(2, end) 3;
}

.anim-faint {
  animation: faint 700ms ease-in forwards;
}

@keyframes lunge {
  50% {
    transform: translate(20px, -20px);
  }
}

@keyframes lunge-foe {
  50% {
    transform: translate(-20px, 20px);
  }
}

@keyframes hit {

  0%,
  100% {
    opacity: 1;
    transform: translateX(0);
  }

  50% {
    opacity: 0.2;
    transform: translateX(-6px);
  }
}

@keyframes faint {
  to {
    transform: translateY(40px);
    opacity: 0;
  }
}

/* ---- moves ---- */
.moves {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  margin-top: auto;
}

.move {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: var(--p-content-border-radius);
  background: var(--p-content-background);
  font: inherit;
  font-size: 0.8125rem;
  color: inherit;
  cursor: pointer;
  transition: background-color 0.15s, border-color 0.15s;
}

.move:hover:not(:disabled) {
  background: var(--p-content-hover-background);
  border-color: var(--p-primary-color);
}

.move:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.move-name {
  text-transform: capitalize;
}

.move-power {
  font-variant-numeric: tabular-nums;
  color: var(--p-text-muted-color);
}

/* ---- side panel ---- */
.side-panel {
  display: flex;
  flex-direction: column;
  border-inline-start: 1px solid var(--p-content-border-color);
  min-width: 0;
}

.panel-tabs {
  flex: none;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border-bottom: 1px solid var(--p-content-border-color);
}

.tab-btn {
  padding: 0.5rem 0.25rem;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  font: inherit;
  font-size: 0.625rem;
  font-weight: 500;
  letter-spacing: 0.06em;
  color: var(--p-text-muted-color);
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}

.tab-btn:hover {
  color: var(--p-text-color);
}

.tab-btn.active {
  color: var(--p-primary-color);
  border-bottom-color: var(--p-primary-color);
}

.panel-content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

/* ---- log ---- */
.log-body {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem 0.875rem;
}

.log-line {
  margin: 0 0 0.5rem;
  font-size: 0.75rem;
  line-height: 1.45;
}

/* ---- team ---- */
.team-body {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.team-card {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.5rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: var(--p-content-border-radius);
  cursor: pointer;
  transition: background-color 0.15s, border-color 0.15s;
}

.team-card:hover {
  background: var(--p-content-hover-background);
}

.team-card.active {
  border-color: var(--p-primary-color);
  background: var(--p-highlight-background);
}

.team-card.fainted {
  opacity: 0.45;
  cursor: not-allowed;
}

.team-sprite {
  width: 2rem;
  height: 2rem;
  object-fit: contain;
  image-rendering: pixelated;
}

.team-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.team-name {
  font-size: 0.75rem;
  text-transform: capitalize;
}

.team-hp {
  font-size: 0.625rem;
  color: var(--p-text-muted-color);
  font-variant-numeric: tabular-nums;
}

.active-tag {
  margin-inline-start: auto;
  font-size: 0.5625rem;
  letter-spacing: 0.06em;
  color: var(--p-primary-color);
}

/* ---- inventory ---- */
.inventory-body {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.target-picker-container {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.target-select {
  width: 100%;
}

.target-label {
  font-size: 0.5625rem;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--p-text-muted-color);
}

.target-option,
.target-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.target-option-dropdown {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  width: 100%;
}

.target-name {
  font-size: 0.75rem;
  text-transform: capitalize;
}

.target-hp-text {
  font-size: 0.625rem;
  color: var(--p-text-muted-color);
  font-variant-numeric: tabular-nums;
}

.item-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.375rem 0.5rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: var(--p-content-border-radius);
}

.item-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.item-name {
  font-size: 0.75rem;
  text-transform: capitalize;
}

.item-count {
  font-size: 0.625rem;
  color: var(--p-text-muted-color);
}

.empty-msg {
  margin: auto;
  padding: 1rem;
  text-align: center;
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

/* ---- buttons ---- */
.btn {
  padding: 0.5rem 1rem;
  border: 1px solid transparent;
  border-radius: var(--p-content-border-radius);
  font: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
}

.btn-primary {
  background: var(--p-primary-color);
  color: var(--p-primary-contrast-color);
}

.btn-primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.move:focus-visible,
.tab-btn:focus-visible,
.btn:focus-visible,
.team-card:focus-visible {
  outline: 2px solid var(--p-primary-color);
  outline-offset: 2px;
}

@media (prefers-color-scheme: dark) {
  .hp-track {
    background: var(--p-surface-700);
  }
}

@media (prefers-reduced-motion: reduce) {

  .anim-lunge,
  .anim-hit,
  .anim-faint {
    animation: none;
  }

  .hp-fill {
    transition: none;
  }
}

.pokeball-body {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.ball-select {
  width: 100%;
}

/* stack the toggle buttons vertically */
.ball-select :deep(.p-selectbutton),
.ball-select:deep(.p-selectbutton) {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.ball-select :deep(.p-togglebutton) {
  width: 100%;
  border-radius: 0;
  border-block-end-width: 0;
}

/* restore rounded corners on the ends of the stack */
.ball-select :deep(.p-togglebutton:first-child) {
  border-start-start-radius: var(--p-content-border-radius);
  border-start-end-radius: var(--p-content-border-radius);
}

.ball-select :deep(.p-togglebutton:last-child) {
  border-end-start-radius: var(--p-content-border-radius);
  border-end-end-radius: var(--p-content-border-radius);
  border-block-end-width: 1px;
}

.ball-select :deep(.p-togglebutton-content) {
  width: 100%;
}

.pokeball-badge-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  width: 100%;
}

.ball-name {
  font-size: 0.75rem;
  text-transform: capitalize;
}

.throw-btn {
  width: 100%;
  margin-top: auto;
}

.move-swap-container {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 0.5rem;
  color: #2c3e50;
}

.modal-header h3 {
  margin: 0 0 0.25rem 0;
  font-size: 1.25rem;
  text-transform: capitalize;
}

.highlight-move {
  color: #e74c3c;
  font-weight: bold;
}

.modal-header p {
  margin: 0;
  color: #666;
  font-size: 0.9rem;
}

.section-title {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #888;
  margin-bottom: 0.5rem;
  display: block;
}

/* Grids & Cards */
.current-moves {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

.move-card {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 0.85rem;
  border-radius: 8px;
  border: 2px solid #e2e8f0;
  background: Canvas;
  cursor: pointer;
  transition: all 0.2s ease;
  overflow: hidden;
}

.move-card:hover {
  transform: translateY(-2px);
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
}

.cancel-card:hover {
  border-color: #ef4444;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.15);
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.move-title {
  font-weight: 700;
  font-size: 1rem;
  text-transform: capitalize;
}

.type-pill {
  color: CanvasText;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  text-shadow: 0px 1px 2px rgba(0, 0, 0, 0.4);
}

.card-details {
  font-size: 0.85rem;
  color: #475569;
}

.hover-action {
  margin-top: 0.5rem;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  color: #2563eb;
  text-align: right;
}

.hover-action.cancel {
  color: #dc2626;
}

.status-icon {
  flex: none;
  height: 1.125em;
  width: auto;
  align-self: center;
  object-fit: contain;
  image-rendering: pixelated;
}

.status-chip {
  flex: none;
  align-self: center;
  padding: 0.0625rem 0.3125rem;
  border-radius: 3px;
  font-size: 0.5625rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  background: var(--p-surface-200);
  color: var(--p-text-color);
}

@media (prefers-color-scheme: dark) {
  .status-chip {
    background: var(--p-surface-700);
  }
}
</style>