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
            <div class="battlefield">
              <div v-if="weather.type || terrain.type" class="field-chips">
                <span v-if="weather.type" class="field-chip">{{ WEATHER_LABEL[weather.type] }} · {{ weather.turns
                }}</span>
                <span v-if="terrain.type" class="field-chip">{{ terrain.type }} terrain · {{ terrain.turns }}</span>
              </div>
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
                    <!-- Status info tooltip -->
                    <span class="info-dot" tabindex="0" role="img" :aria-label="`${foe.name} field effects`"
                      v-tooltip.bottom="{ value: volatileTooltip(foe), escape: false }">i</span>
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
                    <!-- Status info tooltip -->
                    <span class="info-dot" tabindex="0" role="img" :aria-label="`${userPokemon.name} field effects`"
                      v-tooltip.top="{ value: volatileTooltip(userPokemon), escape: false }">i</span>
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
                  class="battle-sprite sprite-ally" :class="[
                    anim?.actor === 'ally' ? `anim-${anim.type}` : null,
                    { 'mega-evolving': isMegaEvolving }
                  ]" />
              </div>
            </div>
            <!-- moves -->
            <div class="moves">
              <button v-for="move in userPokemon.moves" :key="move.name" class="move"
                :style="{ backgroundColor: pokemonStore.typeColors[move.type] }"
                :disabled="isResolving || move.disabled || move.currentPP == 0
                  || (userPokemon.charging && userPokemon.charging.move.name !== move.name) || (userPokemon.locked && userPokemon.locked.move.name !== move.name) || (userPokemon.bide && userPokemon.bide.move.name !== move.name)
                  || (userPokemon.minorStatus?.includes('torment') && userPokemon.lastUsedMove?.name == move.name) || isFainted(userPokemon)" @click="battleTurn(move)">
                <span class="move-name">{{ move.name }}</span>
                <span class="move-power">{{ move.currentPP }}/{{ move.maxPP }}</span>
              </button>
            </div>
            <!-- Mega Evolution Button -->
            <div class="megaEvo">
              <button class="mega-btn"
                :disabled="isResolving || isFainted(userPokemon) || userPokemon?.minorStatus?.includes('embargo') || field.magicRoom > 0"
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
              <p v-for="(entry, i) in battleLog" :key="i" class="log-line"
                :class="{ 'turn-header': entry.startsWith('Battle Turn') }">{{ entry }}</p>
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

  <SelectMove v-if="isSwapModalOpen" @close="closeReplaceMoveModal()" :userPokemon="userPokemon"
    :pendingMove="pendingMove">
  </SelectMove>

  <!-- Evolution Overlay -->
  <div v-if="evoOverlay.active" class="evo-modal-overlay">
    <div class="evo-stage">
      <h3>What? {{ evoOverlay.currentMon.name }} is evolving!</h3>

      <img :src="evoOverlay.phase === 'complete' ? userPokemon.sprite : evoOverlay.currentMon.sprite" :class="{
        'evo-pulse': evoOverlay.phase === 'pulsing',
        'evo-burst': evoOverlay.phase === 'complete'
      }" />
    </div>
  </div>

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
import SelectMove from './SelectMove.vue';
import { getMove } from '@/api/pokeapi';
import { getMoveData } from '@/assets/helpers/pokemonHelper.js';
import Tooltip from 'primevue/tooltip';

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


const vTooltip = Tooltip;
const battleStarted = ref(false);
const isResolving = ref(false);
const battleLog = ref([]);
const sidePanel = ref('log');
const logEl = ref(null);
const anim = ref(null);
const isSwapModalOpen = ref(false)
const pendingMove = ref(null)
const allyFaintedThisTurn = ref(false)
const allyFaintedLastTurn = ref(false)
const lastMoveInBattle = ref(null);   // Copycat
let turnValue = 1
const evoOverlay = ref({
  active: false,
  phase: 'idle', // 'pulsing' | 'swapping' | 'complete'
  currentMon: null,
  nextEvoMon: null
})

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

const activeMegaPokemon = ref(null)
const activeTransformPokemon = ref(null)

const team = computed(() => {
  const sourceTeam = props.team ?? pokemonStore.caughtPokemon
  if (!activeMegaPokemon.value) {
    return sourceTeam
  }

  const filtered = sourceTeam.filter(
    p => p.instanceId !== activeMegaPokemon.value.instanceId
  )

  return [...filtered, activeMegaPokemon.value]

});



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
const MINOR_LABEL = {
  confusion: 'Confused', 'leech-seed': 'Leech Seed', 'perish-song': 'Perish Song',
  ingrain: 'Ingrained', embargo: 'Embargo', 'heal-block': 'Heal Block',
  nightmare: 'Nightmare', torment: 'Torment', infatuation: 'Infatuated',
  disable: 'Disabled', yawn: 'Drowsy', trap: 'Trapped',
  'no-type-immunity': 'Grounded',
};

function minorDetail(p, s) {
  switch (s) {
    case 'confusion': return p.confusionTurns ? `${p.confusionTurns} turns` : '';
    case 'perish-song': return `faints in ${p.perishTurns}`;
    case 'heal-block': return `${p.healBlockTurns} turns`;
    case 'embargo': return `${p.embargoTurns} turns`;
    case 'trap': return p.trapped ? `${p.trapped.move} · ${p.trapped.turns}` : '';
    case 'disable': return p.disabled ? `${prettyName(p.disabled.move)} · ${p.disabled.turns}` : '';
    default: return '';
  }
}

const tipRow = (label, value, color) =>
  `<div style="display:flex;justify-content:space-between;gap:.75rem;font-size:.6875rem;line-height:1.55">
     <span>${label}</span><span style="color:${color};font-variant-numeric:tabular-nums">${value}</span>
   </div>`;

const tipSection = (title, rows) =>
  `<div style="margin-bottom:.4rem">
     <div style="font-size:.5625rem;letter-spacing:.06em;text-transform:uppercase;opacity:.6;margin-bottom:.15rem">${title}</div>
     ${rows.length ? rows.join('') : `<div style="font-size:.6875rem;opacity:.5">None</div>`}
   </div>`;

function volatileTooltip(p) {
  if (!p) return '';

  const boosts = Object.entries(p.stages ?? {})
    .filter(([, v]) => v !== 0)
    .sort((a, b) => b[1] - a[1])
    .map(([stat, v]) => tipRow(
      STAT_LABEL[stat] ?? stat,
      `${v > 0 ? '+' : ''}${v}`,
      v > 0 ? '#4ade80' : '#f87171'
    ));

  const rows = (p.minorStatus ?? [])
    .map(s => tipRow(MINOR_LABEL[s] ?? prettyName(s), minorDetail(p, s), '#fbbf24'));

  if (p.substitute > 0) rows.push(tipRow('Substitute', `${p.substitute} HP`, '#93c5fd'));
  if (p.charging) rows.push(tipRow('Charging', prettyName(p.charging.move.name), '#93c5fd'));
  if (p.locked) rows.push(tipRow('Locked in', prettyName(p.locked.move.name), '#93c5fd'));
  if (p.bide) rows.push(tipRow('Bide', `${p.bide.turns} turns`, '#93c5fd'));
  if (p.mustRecharge) rows.push(tipRow('Recharging', '', '#93c5fd'));

  const sideTitle = sideKey(p) === 'ally' ? 'Your Side' : "Foe's Side";

  return `<div class="mon-info" style="min-width:11rem">
    ${tipSection('Stat Changes', boosts)}
    ${tipSection('Volatile Effects', rows)}
    ${tipSection(sideTitle, sideRows(p))}
    ${tipSection('Field', fieldRows())}
  </div>`;
}

function sideRows(p) {
  const side = sideOf(p);
  const rows = [];

  for (const k of SCREEN_KEYS) {
    if (side[k] > 0) rows.push(tipRow(FIELD_LABEL[k], `${side[k]} turns`, '#93c5fd'));
  }
  for (const k of HAZARD_KEYS) {
    const v = side[k];
    if (!v) continue;
    rows.push(tipRow(
      HAZARD_LABEL[k],
      typeof v === 'number' ? `${v} layer${v === 1 ? '' : 's'}` : '',
      '#f87171'
    ));
  }
  return rows;
}

function fieldRows() {
  const rows = [];
  for (const [k, v] of Object.entries(field.value)) {
    if (v > 0) rows.push(tipRow(FIELD_LABEL[k], `${v} turns`, '#c4b5fd'));
  }
  if (weather.value.type) {
    rows.push(tipRow(WEATHER_LABEL[weather.value.type], `${weather.value.turns} turns`, '#c4b5fd'));
  }
  if (terrain.value.type) {
    rows.push(tipRow(
      `${terrain.value.type[0].toUpperCase()}${terrain.value.type.slice(1)} Terrain`,
      `${terrain.value.turns} turns`, '#c4b5fd'
    ));
  }
  return rows;
}

const freshSide = () => ({
  reflect: 0, lightScreen: 0, auroraVeil: 0,
  safeguard: 0, mist: 0, tailwind: 0,
  spikes: 0, toxicSpikes: 0, stealthRock: false, stickyWeb: false,
});

const sides = ref({ ally: freshSide(), foe: freshSide() });
const field = ref({ trickRoom: 0, gravity: 0, magicRoom: 0, wonderRoom: 0 });

function sideKey(pokemon) {
  return pokemon === userPokemon.value ? 'ally' : 'foe';
}
function sideOf(pokemon) { return sides.value[sideKey(pokemon)]; }
function foeSideOf(pokemon) {
  return sides.value[sideKey(pokemon) === 'ally' ? 'foe' : 'ally'];
}

const weather = ref({ type: null, turns: 0 });  // 'rain' | 'sun' | 'sandstorm' | 'hail' | 'snow'
const terrain = ref({ type: null, turns: 0 });  // 'electric' | 'grassy' | 'misty' | 'psychic'

const WEATHER_MOVES = {
  'rain-dance': 'rain', 'sunny-day': 'sun',
  sandstorm: 'sandstorm', hail: 'hail', snowscape: 'snow',
};
const WEATHER_START_MSG = {
  rain: 'It started to rain!',
  sun: 'The sunlight turned harsh!',
  sandstorm: 'A sandstorm kicked up!',
  hail: 'It started to hail!',
  snow: 'It started to snow!',
};
const WEATHER_END_MSG = {
  rain: 'The rain stopped.', sun: 'The harsh sunlight faded.',
  sandstorm: 'The sandstorm subsided.', hail: 'The hail stopped.', snow: 'The snow stopped.',
};
const WEATHER_LABEL = {
  rain: 'Rain', sun: 'Sun', sandstorm: 'Sandstorm', hail: 'Hail', snow: 'Snow',
};

const TERRAIN_MOVES = {
  'electric-terrain': 'electric', 'grassy-terrain': 'grassy',
  'misty-terrain': 'misty', 'psychic-terrain': 'psychic',
};
const TERRAIN_START_MSG = {
  electric: 'An electric current ran across the battlefield!',
  grassy: 'Grass grew to cover the battlefield!',
  misty: 'Mist swirled around the battlefield!',
  psychic: 'The battlefield got weird!',
};

function isGrounded(pokemon) {
  if (field.value.gravity > 0) return true;
  if (pokemon.minorStatus?.includes('ingrain')) return true;
  if (pokemon.minorStatus?.includes('no-type-immunity')) return true; // smack down
  return !pokemon.types.includes('flying');
}

// Hardcoded moves that have special/unique effects that arn't listed in pokeapi
const SELF_KO_MOVES = new Set([
  'self-destruct', 'explosion', 'misty-explosion',
  'memento', 'healing-wish', 'lunar-dance',
]);

const RECHARGE_MOVES = new Set([
  'hyper-beam', 'giga-impact', 'blast-burn', 'hydro-cannon', 'frenzy-plant',
  'rock-wrecker', 'roar-of-time', 'prismatic-laser', 'eternabeam',
  'meteor-assault',
]);

const TWO_TURN_MOVES = {
  // semi-invulnerable — can't be touched during the charge turn
  fly: { message: (n) => `${n} flew up high!`, invulnerable: true },
  bounce: { message: (n) => `${n} sprang up!`, invulnerable: true },
  dig: { message: (n) => `${n} burrowed its way under the ground!`, invulnerable: true },
  dive: { message: (n) => `${n} hid underwater!`, invulnerable: true },
  'phantom-force': { message: (n) => `${n} vanished instantly!`, invulnerable: true },
  'shadow-force': { message: (n) => `${n} vanished instantly!`, invulnerable: true },

  // plain charge — vulnerable while charging
  'solar-beam': { message: (n) => `${n} absorbed light!` },
  'solar-blade': { message: (n) => `${n} absorbed light!` },
  'razor-wind': { message: (n) => `${n} whipped up a whirlwind!` },
  'sky-attack': { message: (n) => `${n} became cloaked in a harsh light!` },
  'freeze-shock': { message: (n) => `${n} became cloaked in a freezing light!` },
  'ice-burn': { message: (n) => `${n} became cloaked in freezing air!` },

  // charge turn also raises a stat
  'skull-bash': {
    message: (n) => `${n} tucked in its head!`,
    chargeStatChanges: [{ stat: 'defense', change: 1 }]
  },
  'meteor-beam': {
    message: (n) => `${n} is overflowing with space power!`,
    chargeStatChanges: [{ stat: 'special-attack', change: 1 }]
  },
  'electro-shot': {
    message: (n) => `${n} absorbed electricity!`,
    chargeStatChanges: [{ stat: 'special-attack', change: 1 }]
  },
};

// moves that connect anyway, keyed by the charge move being used
const HITS_THROUGH = {
  fly: ['gust', 'twister', 'thunder', 'hurricane', 'sky-uppercut', 'smack-down'],
  bounce: ['gust', 'twister', 'thunder', 'hurricane', 'smack-down'],
  dig: ['earthquake', 'magnitude', 'fissure'],
  dive: ['surf', 'whirlpool'],
};

const LOCKING_MOVES = {
  outrage: { confusionAfter: true },
  thrash: { confusionAfter: true },
  'petal-dance': { confusionAfter: true },
  'raging-fury': { confusionAfter: true },
  uproar: { confusionAfter: false },
};

const CHAIN_MOVES = {
  // doubling, per-user. Rollout/Ice Ball also lock the user in.
  rollout: { base: 30, mode: 'double', maxSteps: 5, lock: true, defenseCurl: true },
  'ice-ball': { base: 30, mode: 'double', maxSteps: 5, lock: true, defenseCurl: true },
  'fury-cutter': { base: 40, mode: 'double', maxSteps: 3 },   // Gen 6+: caps at 160
  // additive, shared across the field
  'echoed-voice': { base: 40, mode: 'add', max: 200, shared: true },
};

const echoedVoice = ref({ count: 0, lastTurn: -1 });

const FIXED_DAMAGE_MOVES = {
  'seismic-toss': (user) => user.level,
  'night-shade': (user) => user.level,
  'dragon-rage': () => 40,
  'sonic-boom': () => 20,
  psywave: (user) => Math.max(1, Math.floor(user.level * (randInt(0, 100) + 50) / 100)),
  'super-fang': (user, target) => Math.max(1, Math.floor(target.currentHp / 2)),
  'natures-madness': (user, target) => Math.max(1, Math.floor(target.currentHp / 2)),
  ruination: (user, target) => Math.max(1, Math.floor(target.currentHp / 2)),
  // null = the move fails
  endeavor: (user, target) =>
    target.currentHp > user.currentHp ? target.currentHp - user.currentHp : null,
  'final-gambit': (user) => Math.max(1, user.currentHp),
};

// each returns a base power; move.power is null for all of these
const VARIABLE_POWER_MOVES = {
  // --- target weight (hectograms) ---
  'low-kick': (u, t) => weightPower(t.weight),
  'grass-knot': (u, t) => weightPower(t.weight),

  // --- weight ratio, user vs target ---
  'heavy-slam': (u, t) => weightRatioPower(u.weight, t.weight),
  'heat-crash': (u, t) => weightRatioPower(u.weight, t.weight),

  // --- speed ratio ---
  'electro-ball': (u, t) => {
    const us = Math.max(1, statOf(u, 'speed'));
    const ts = Math.max(1, statOf(t, 'speed'));
    const r = ts / us;
    return r <= 0.25 ? 150 : r <= 1 / 3 ? 120 : r <= 0.5 ? 80 : r < 1 ? 60 : 40;
  },
  'gyro-ball': (u, t) => {
    const us = Math.max(1, statOf(u, 'speed'));
    const ts = Math.max(1, statOf(t, 'speed'));
    return Math.min(150, Math.max(1, Math.floor((25 * ts) / us) + 1));
  },

  // --- user's remaining HP (lower = stronger) ---
  flail: (u) => flailPower(u),
  reversal: (u) => flailPower(u),

  // --- user's remaining HP (higher = stronger) ---
  eruption: (u) => Math.max(1, Math.floor(150 * (u.currentHp / u.totalHp))),
  'water-spout': (u) => Math.max(1, Math.floor(150 * (u.currentHp / u.totalHp))),
  'dragon-energy': (u) => Math.max(1, Math.floor(150 * (u.currentHp / u.totalHp))),

  // --- target's remaining HP ---
  'wring-out': (u, t) => Math.max(1, Math.floor(120 * (t.currentHp / t.totalHp))),
  'crush-grip': (u, t) => Math.max(1, Math.floor(120 * (t.currentHp / t.totalHp))),
  'hard-press': (u, t) => Math.max(1, Math.floor(100 * (t.currentHp / t.totalHp))),

  // --- target's positive stat stages ---
  punishment: (u, t) => {
    const boosts = Object.values(t.stages ?? {}).reduce((n, s) => n + Math.max(0, s), 0);
    return Math.min(200, 60 + 20 * boosts);
  },

  // --- user's own stages, positive only ---
  'stored-power': (u) => {
    const boosts = Object.values(u.stages ?? {}).reduce((n, s) => n + Math.max(0, s), 0);
    return Math.min(860, 20 + 20 * boosts);
  },
  'power-trip': (u) => {
    const boosts = Object.values(u.stages ?? {}).reduce((n, s) => n + Math.max(0, s), 0);
    return Math.min(860, 20 + 20 * boosts);
  },

  // --- Uses current turn data
  counter: (u) => u.turn.lastPhysicalDamage > 0
    ? u.turn.lastPhysicalDamage * 2 : null,
  'mirror-coat': (u) => u.turn.lastSpecialDamage > 0
    ? u.turn.lastSpecialDamage * 2 : null,
  'metal-burst': (u) => u.turn.lastDamageTaken > 0
    ? Math.floor(u.turn.lastDamageTaken * 1.5) : null,
  'comeuppance': (u) => u.turn.lastDamageTaken > 0
    ? Math.floor(u.turn.lastDamageTaken * 1.5) : null,

  // --- friendship: we have no happiness stat, so these are flat ---
  'return': () => 102,   // max-happiness value
  frustration: () => 102,   // min-happiness value

  magnitude: () => {
    const r = randInt(1, 100);
    return r <= 5 ? 10 : r <= 15 ? 30 : r <= 35 ? 50 : r <= 65 ? 70
      : r <= 85 ? 90 : r <= 95 ? 110 : 150;
  },

  present: () => {
    const r = randInt(1, 100);
    return r <= 40 ? 40 : r <= 70 ? 80 : r <= 80 ? 120 : 0;  // 0 = heal branch
  },

  'trump-card': (u) => {
    const slot = u.moves?.find(m => m.name === 'trump-card');
    const pp = slot?.currentPP ?? 0;
    return [200, 80, 60, 50][pp] ?? 40;
  },
};

const CONDITIONAL_POWER = {
  facade: (u) => ['burn', 'poison', 'bad-poison', 'paralysis'].includes(u.status) ? 2 : 1,
  hex: (u, t) => t.status ? 2 : 1,
  venoshock: (u, t) => ['poison', 'bad-poison'].includes(t.status) ? 2 : 1,
  brine: (u, t) => t.currentHp <= t.totalHp / 2 ? 2 : 1,
  'barb-barrage': (u, t) => ['poison', 'bad-poison'].includes(t.status) ? 2 : 1,
  'infernal-parade': (u, t) => t.status ? 2 : 1,
  retaliate: () => allyFaintedLastTurn.value ? 2 : 1,

  payback: (u, t) => t.turn?.hasMoved ? 2 : 1,
  avalanche: (u) => u.turn?.damageTaken > 0 ? 2 : 1,
  revenge: (u) => u.turn?.damageTaken > 0 ? 2 : 1,
  assurance: (u, t) => t.turn?.wasHit ? 2 : 1,
  'stomping-tantrum': (u) => u.turn?.moveFailedLastTurn ? 2 : 1,

  'rising-voltage': (u, t) => terrain.value.type === 'electric' && isGrounded(t) ? 2 : 1,
  'expanding-force': (u) => terrain.value.type === 'psychic' && isGrounded(u) ? 1.5 : 1,
  'misty-explosion': (u) => terrain.value.type === 'misty' && isGrounded(u) ? 1.5 : 1,
};

// Hard coded moves for copy logic
const COPY_MOVES = new Set([
  'metronome', 'mirror-move', 'copycat', 'me-first', 'assist',
  'nature-power', 'sleep-talk',
]);

// never selectable by a calling move
const UNCOPYABLE = new Set([
  ...COPY_MOVES,
  'struggle', 'transform', 'counter', 'mirror-coat', 'metal-burst',
  'bide', 'focus-punch', 'dynamic-punch', 'destiny-bond', 'detect',
  'endure', 'protect', 'feint', 'follow-me', 'helping-hand', 'snatch',
  'thief', 'covet', 'trick', 'switcheroo', 'bestow', 'chatter',
  'sketch', 'mimic', 'quash', 'after-you', 'belch', 'shell-trap',
  'beak-blast', 'baneful-bunker', 'spiky-shield', "king-s-shield",
]);

const NATURE_POWER_BY_TERRAIN = {
  electric: 'thunderbolt', grassy: 'energy-ball',
  misty: 'moonblast', psychic: 'psychic',
};

// Protection Moves
const PROTECT_MOVES = {
  protect: 'protect', detect: 'protect',
  'spiky-shield': 'protect', 'baneful-bunker': 'protect',
  "king-s-shield": 'protect', 'wide-guard': 'protect',
  endure: 'endure',
};
const SCREEN_MOVES = {
  reflect: 'reflect', 'light-screen': 'lightScreen', 'aurora-veil': 'auroraVeil',
  safeguard: 'safeguard', mist: 'mist', tailwind: 'tailwind',
};

const SCREEN_KEYS = ['reflect', 'lightScreen', 'auroraVeil', 'safeguard', 'mist', 'tailwind'];

// Hazard Moves
const HAZARD_MOVES = {
  spikes: 'spikes', 'toxic-spikes': 'toxicSpikes',
  'stealth-rock': 'stealthRock', 'sticky-web': 'stickyWeb',
};

const HAZARD_KEYS = ['spikes', 'toxicSpikes', 'stealthRock', 'stickyWeb'];

const HAZARD_LABEL = {
  spikes: 'Spikes', toxicSpikes: 'Toxic Spikes',
  stealthRock: 'Stealth Rock', stickyWeb: 'Sticky Web',
};

function clearHazards(side) {
  let cleared = false;
  for (const k of HAZARD_KEYS) {
    const empty = typeof side[k] === 'boolean' ? false : 0;
    if (side[k] !== empty) { side[k] = empty; cleared = true; }
  }
  return cleared;
}

// Field Moves
const FIELD_MOVES = {
  'trick-room': 'trickRoom',
  gravity: 'gravity',
  'magic-room': 'magicRoom',
  'wonder-room': 'wonderRoom',
};
const FIELD_LABEL = {
  reflect: 'Reflect', lightScreen: 'Light Screen', auroraVeil: 'Aurora Veil',
  safeguard: 'Safeguard', mist: 'Mist', tailwind: 'Tailwind',
  trickRoom: 'Trick Room', gravity: 'Gravity',
  magicRoom: 'Magic Room', wonderRoom: 'Wonder Room',
};

// PokeAPI only labels Roar/Whirlwind (meta.category "force-switch").
// The damaging phazers and all self-switch moves are invisible to metadata.
const DAMAGE_PHAZE_MOVES = new Set(['dragon-tail', 'circle-throw']);

const SELF_SWITCH_MOVES = {
  'u-turn': {},
  'volt-switch': {},
  'flip-turn': {},
  'parting-shot': {},
  teleport: { escapesWild: true },        // wild battle: Teleport = escape
  'baton-pass': { baton: true },
  'shed-tail': { shedTail: true },
  'chilly-reception': { weather: 'snow' }, // pairs with the weather system you just built
};

// volatiles Baton Pass hands to the recipient
const PASSED_VOLATILES = ['confusion', 'leech-seed', 'perish-song', 'ingrain', 'embargo', 'heal-block'];

const pendingSwitch = ref(null);   // { side, mode: 'phaze' | 'self', baton, shedSub, escapesWild }
const awaitingSwitchPick = ref(false);
let resolveSwitchPick = null;

function weightPower(hg) {
  const w = hg ?? 0;
  return w < 100 ? 20 : w < 250 ? 40 : w < 500 ? 60 : w < 1000 ? 80 : w < 2000 ? 100 : 120;
}

function weightRatioPower(userHg, targetHg) {
  const r = (targetHg || 1) / (userHg || 1);
  return r <= 0.2 ? 120 : r <= 0.25 ? 100 : r <= 1 / 3 ? 80 : r <= 0.5 ? 60 : 40;
}

function flailPower(u) {
  const x = Math.floor((48 * u.currentHp) / u.totalHp);
  return x < 1 ? 200 : x < 5 ? 150 : x < 13 ? 100 : x < 22 ? 80 : x < 43 ? 40 : 20;
}

function isSemiInvulnerable(pokemon) {
  return !!pokemon?.charging?.invulnerable;
}

const prettyName = (n) => n.replace(/-/g, ' ');

const freshStages = () => ({
  attack: 0, defense: 0, 'special-attack': 0,
  'special-defense': 0, speed: 0, accuracy: 0, evasion: 0,
});

function freshTurnMemory() {
  return {
    damageTaken: 0,
    physicalDamage: 0,
    specialDamage: 0,
    lastDamageTaken: 0,        // Metal Burst
    lastPhysicalDamage: 0,     // Counter
    lastSpecialDamage: 0,      // Mirror Coat
    hasMoved: false,
    wasHit: false,
    moveFailed: false,
    moveFailedLastTurn: false, // Stomping Tantrum
  };
}

function startTurn(pokemon) {
  if (!pokemon) return;
  const prev = pokemon.turn;
  pokemon.turn = freshTurnMemory();
  pokemon.turn.moveFailedLastTurn = prev?.moveFailed ?? false;
}

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
  canMegaEvolve.value = false
  const rawItem = userPokemon.value?.heldItem
  if (userPokemon.value.name.toLowerCase() === "rayquaza" && userPokemon.value.moves.some(m => m.name.toLowerCase() === "dragon-ascent")) {
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

function syncBattleForm() {
  const active = activeTransformPokemon.value?.trainer === 'ally'
    ? activeTransformPokemon.value.pokemon
    : activeMegaPokemon.value;
  if (!active) return;

  const base = pokemonStore.caughtPokemon.find(p => p.instanceId === active.instanceId);
  if (base) {
    if (active.currentHp <= 0) {
      base.currentHp = 0;
      base.totalFaints = (base.totalFaints || 0) + 1;
    } else {
      const hpRatio = active.currentHp / active.totalHp;
      base.currentHp = Math.max(1, Math.round(base.totalHp * hpRatio));
    }
    base.level = active.level;
    base.currentExp = active.currentExp;
    base.status = active.status || null;
    if (active.totalKOs) base.totalKOs = active.totalKOs;

    //Mega only logic
    if (activeMegaPokemon.value) {
      base.moves = active.moves
    }
  }

  activeMegaPokemon.value = null;
  activeTransformPokemon.value = null;
}

const isMegaEvolving = ref(false)

async function handleMegaEvo(pokemon) {

  // 1. Fetch data from helper script
  const megaData = await pokemonHelper.handleMegaEvo(pokemon)

  if (megaData) {
    // 2. Start energy buildup
    isMegaEvolving.value = true
    log(`${pokemon.name}'s Mega Ring is reacting to the Key Stone!`)

    // 3. Pause while energy charges (600ms)
    await new Promise(resolve => setTimeout(resolve, 600))

    // 4. Swap data to Mega form mid-flash
    activeMegaPokemon.value = megaData
    userPokemon.value = megaData
    hasMegaEvo.value = true
    canMegaEvolve.value = false

    // 5. Hold burst/shatter phase (600ms)
    await new Promise(resolve => setTimeout(resolve, 600))

    // 6. Finish animation
    isMegaEvolving.value = false
    log(`${pokemon.name} has Mega Evolved into ${activeMegaPokemon.value.name}!`)
  }
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

function rollHitCount(move) {
  const min = move.minHits ?? 1;
  const max = move.maxHits ?? 1;
  if (max <= 1) return 1;
  if (min === max) return min;
  if (min === 2 && max === 5) {
    const r = randInt(1, 100);
    return r <= 35 ? 2 : r <= 70 ? 3 : r <= 85 ? 4 : 5;
  }
  return randInt(min, max);
}

function isImmuneTo(move, target) {
  if (!move.type) return false;
  let eff = typeEffectiveness(move.type, target.types);
  const grounded = target.minorStatus?.includes('no-type-immunity') ||
    (move.type === 'ground' && target.minorStatus?.includes('ingrain')) ||
    (field.value.gravity > 0 && (move.type === 'ground' && target.types.includes('flying')));
  if (grounded && eff === 0) eff = 1;
  return eff === 0;
}

async function applyHazards(pokemon) {
  const side = sideOf(pokemon);
  const grounded = !pokemon.types.includes('flying') || field.value.gravity > 0;

  if (side.stealthRock) {
    const eff = typeEffectiveness('rock', pokemon.types);
    const dmg = Math.max(1, Math.floor(pokemon.totalHp * (eff / 8)));
    pokemon.currentHp = Math.max(0, pokemon.currentHp - dmg);
    log(`Pointed stones dug into ${pokemon.name}!`);
    await delay(800);
  }
  if (side.spikes > 0 && grounded) {
    const frac = [0, 1 / 8, 1 / 6, 1 / 4][side.spikes];
    pokemon.currentHp = Math.max(0, pokemon.currentHp - Math.max(1, Math.floor(pokemon.totalHp * frac)));
    log(`${pokemon.name} was hurt by spikes!`);
    await delay(800);
  }
  if (side.toxicSpikes > 0 && grounded) {
    if (pokemon.types.includes('poison')) {
      side.toxicSpikes = 0;
      log(`${pokemon.name} absorbed the poison spikes!`);
    } else if (!pokemon.status) {
      await inflictStatus(pokemon, side.toxicSpikes >= 2 ? 'bad-poison' : 'poison', null, pokemon);
    }
    await delay(800);
  }
  if (side.stickyWeb && grounded) {
    applyStatChange(pokemon, 'speed', -1);
    log(`${pokemon.name} was caught in a sticky web!`);
    await delay(800);
  }
}

function resetVolatiles(p) {
  p.stages = freshStages();
  p.flinched = false;
  p.charging = null;
  p.minorStatus = [];
  p.healBlockTurns = 0;
  p.confusionTurns = 0;
  p.perishTurns = 0;
  p.embargoTurns = 0;
  p.trapped = null;
  p.disabled = false;
  p.moves?.forEach(m => { if (m.disabled) m.disabled = false; });
  p.mustRecharge = false;
  p.locked = null;
  p.bide = null;
  p.substitute = 0;
  p.protecting = null;
  p.protectStreak = 0;
  p.yawnTurn = 0;
  p.chain = null;
  p.raging = false;
  p.defenseCurled = false;
}

/* ------------------------------------------------------------------ *
 * Battle lifecycle
 * ------------------------------------------------------------------ */

function startBattle() {
  if (!userPokemon.value) return;
  if (userPokemon.value.currentHp == null) {
    userPokemon.value.currentHp = userPokemon.value.totalHp;
  }
  checkMegaEvo()
  userPokemon.value.stages = freshStages();
  userPokemon.value.flinched = false;
  userPokemon.value.charging = null;
  userPokemon.value.mustRecharge = false;
  userPokemon.value.locked = null
  userPokemon.value.bide = null
  sides.value.ally = freshSide()
  sides.value.foe = freshSide()
  weather.value = { type: null, turns: 0 };
  terrain.value = { type: null, turns: 0 };
  echoedVoice.value = { count: 0, lastTurn: -1 };
  battleStarted.value = true;
  selectedTargetPokemon.value = userPokemon.value;
  log(`A wild ${foe.value.name} appeared!`);
  log(`Go, ${userPokemon.value.name}!`);
}

function endBattle(outcome = 'ended') {
  if (activeMegaPokemon.value || activeTransformPokemon.value) {
    syncBattleForm()
  }
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
    allyFaintedLastTurn.value = allyFaintedThisTurn.value;
    allyFaintedThisTurn.value = false;
    log(`Battle Turn ${turnValue}`)
    turnValue++
    let player = userPokemon.value;
    startTurn(player);
    player.turn.pendingMove = playerMove;
    let wild = foe.value;
    startTurn(wild);
    const wildMove = await pickMove(wild);
    wild.turn.pendingMove = wildMove;

    // --- item branch: using an item costs your turn ---
    if (item) {
      if (isPokeball(item)) {
        const caught = await throwPokeball(item);
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
        if (await resolvePendingSwitch()) return;
        player = userPokemon.value;
        wild = foe.value;
        if (await handleFaint(player)) return;
      }
      await endOfTurnPerish(wild);
      await endOfTurnPerish(player);
      if (await endOfTurn(wild, player)) return;
      if (await endOfTurn(player, wild)) return;
      await endOfTurnField();

      player.protecting = null;
      wild.protecting = null;

      return;
    }

    // --- normal turn: order by speed, ties broken randomly ---
    const playerSpeed = statOf(player, 'speed');
    const wildSpeed = statOf(wild, 'speed');
    const playerPriority = playerMove?.priority ?? 0;
    const wildPriority = wildMove?.priority ?? 0;
    const slower = field.value.trickRoom > 0;
    const playerFirst =
      playerPriority !== wildPriority
        ? playerPriority > wildPriority
        : (slower ? playerSpeed < wildSpeed : playerSpeed > wildSpeed) ||
        (playerSpeed === wildSpeed && Math.random() < 0.5);

    const order = playerFirst
      ? [['ally', playerMove], ['foe', wildMove]]
      : [['foe', wildMove], ['ally', playerMove]];

    const skipTurn = { ally: false, foe: false };

    for (const [role, move] of order) {
      if (skipTurn[role]) continue;
      const attacker = role === 'ally' ? userPokemon.value : foe.value;
      const defender = role === 'ally' ? foe.value : userPokemon.value;
      if (!move || isFainted(attacker)) continue;
      await useMove(attacker, defender, move);
      if (await resolvePendingSwitch(skipTurn)) return;
      player = userPokemon.value;   // re-sync locals: covers switches AND Transform
      wild = foe.value;             // (replaces the activeTransformPokemon ternary)
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
    await endOfTurnField();

    player.protecting = null;
    wild.protecting = null;

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
  const raw = pokemon.stats.find(s => s.name === name)?.stat ?? 1;
  let value = raw * stageMultiplier(pokemon.stages?.[name] ?? 0);
  if (name === 'attack' && pokemon.status === 'burn') value *= 0.5;
  if (name === 'speed' && pokemon.status === 'paralysis') value *= 0.5;
  if (name === 'speed' && sideOf(pokemon).tailwind > 0) value *= 2;
  if (name === 'special-defense' && weather.value.type === 'sandstorm' && pokemon.types.includes('rock')) value *= 1.5;
  if (name === 'defense' && weather.value.type === 'snow' && pokemon.types.includes('ice')) value *= 1.5;
  return Math.floor(value);
}

async function pickMove(pokemon) {
  //const move = await getMove('sand-attack')
  //let moveInfo = await getMoveData(move)
  //return moveInfo
  if (pokemon.charging) return pokemon.charging.move;
  if (pokemon.locked) return pokemon.locked.move;
  if (pokemon.bide) return pokemon.bide.move;
  const moves = pokemon.moves ?? [];
  let disabledMoves = []
  if (pokemon.minorStatus?.includes("torment") && pokemon.lastUsedMove) {
    disabledMoves.push(moves.findIndex(m => m.name == pokemon.lastUsedMove.name))
  }
  if (pokemon.minorStatus?.includes("disable") && pokemon.lastUsedMove) {
    disabledMoves.push(moves.findIndex(m => m.disabled))
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
  console.log(`${pokemon.name} current has ${pokemon.currentExp} experience points.`)

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
        continue;
      }

      console.log(`${pokemon.name} is ready to evolve into ${evo.nextEvo.name}!`);

      // ─── 🎨 TRIGGER ANIMATION OVERLAY START ─────────────────────────
      evoOverlay.value = {
        active: true,
        phase: 'pulsing',
        currentMon: pokemon,
        nextEvoName: evo.nextEvo.name
      }

      // Wait 3 seconds while the sprite pulses as a silhouette
      await new Promise(r => setTimeout(r, 3000))
      // ───────────────────────────────────────────────────────────────

      // Perform your existing data transformation in helper
      const evoSuccess = await pokemonHelper.handleEvolution(pokemon, evo.nextEvo.name);

      if (evoSuccess) {
        const updated = pokemonStore.caughtPokemon.find(p => p.instanceId === pokemon.instanceId)
        userPokemon.value = updated
        userPokemon.value.heldItem = ""

        // ─── 🎨 FINISH ANIMATION ────────────────────────────────────
        evoOverlay.value.phase = 'complete'

        // Hold success screen for 2 seconds so player sees evolved form
        await new Promise(r => setTimeout(r, 2000))
        evoOverlay.value.active = false
        // ───────────────────────────────────────────────────────────────
      } else {
        // If helper failed or user cancelled
        evoOverlay.value.active = false
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


/**
 * Handles a fainted combatant. Returns true if the turn should stop.
 */
async function handleFaint(pokemon) {
  if (!isFainted(pokemon)) return false;
  pokemon.charging = null;
  pokemon.mustRecharge = false;
  pokemon.locked = null;
  pokemon.bide = null

  if (activeTransformPokemon.value?.pokemon === pokemon) {
    activeTransformPokemon.value = null;
  }

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
        startTurn(foe.value)
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
  allyFaintedThisTurn.value = true

  if (next) {
    sidePanel.value = 'team';
    await resolvePendingSwitch()
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

async function useMove(user, target, move, opts = {}) {
  let actor = user === userPokemon.value ? 'ally' : 'foe';
  let victim = actor === 'ally' ? 'foe' : 'ally';
  let hitsSelf = false;

  user.turn.hasMoved = true;
  if (!PROTECT_MOVES[move?.name]) user.protectStreak = 0;

  // --- recharge: the turn is spent before anything else happens ---
  if (user.mustRecharge) {
    user.mustRecharge = false;
    log(`${user.name} must recharge!`);
    await delay(800);
    return;
  }

  const releasing = !!user.charging;
  if (releasing) move = user.charging.move;
  else if (user.locked) move = user.locked.move;
  else if (user.bide) move = user.bide.move;

  const continuing = releasing || !!user.locked || !!user.bide;

  user.lastUsedMove = move;

  // --- pre-move status checks ---
  if (!(await canAct(user, move))) {
    user.charging = null;
    return;
  }
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
      user.charging = null;
      return
    }
  }
  if (user.disabled && --user.disabled.turns <= 0) {
    let move = user.moves.find(m => m.name === user.disabled.move)
    move.disabled = false
    user.minorStatus = user.minorStatus.filter(s => s !== 'disable');
    log(`${user.name}'s move ${prettyName(user.disabled.move)} is no longer disabled.`);
    user.disabled = false
    await delay(800);
  }

  if (!continuing && !opts.copied && move.currentPP != null) move.currentPP--;

  if (hitsSelf) {
    user.charging = null;
    log(`${user.name} hit itself in confusion.`);
    target = user;
    victim = "foe"
    move = {
      name: move.name,
      power: 40,
      accuracy: null,
      damageClass: 'physical'
    }
  } else if (releasing) {
    log(`${user.name} unleashed ${prettyName(move.name)}!`);
    await playAnim(actor, 'lunge', 300);
  } else {
    log(`${user.name} used ${prettyName(move.name)}!`);
    await playAnim(actor, 'lunge', 300);
  }

  // --- escalating chains: any different move breaks the streak ---
  if (!hitsSelf) {
    if (user.chain && user.chain.move !== move.name) user.chain = null;
    if (user.raging && move.name !== 'rage') user.raging = false;
    if (move.name === 'defense-curl') user.defenseCurled = true;
  }

  // --- calling moves for coypying ---
  if (COPY_MOVES.has(move.name) && !hitsSelf && !opts.copied) {
    const called = await resolveCalledMove(user, target, move);
    if (!called) {
      log('But it failed!');
      user.turn.moveFailed = true;
      await delay(800);
      return;
    }
    log(`${prettyName(move.name)} became ${prettyName(called.name)}!`);
    await delay(700);
    return await useMove(user, target, called, { copied: true });
  }

  // --- two-turn moves ---
  const charge = TWO_TURN_MOVES[move.name];
  const sunCharged = ['solar-beam', 'solar-blade'].includes(move.name) && weather.value.type === 'sun';
  if (charge && !releasing && !hitsSelf && !sunCharged) {
    if (field.value.gravity > 0 && ['fly', 'bounce', 'sky-attack'].includes(move.name)) {
      log(`${user.name} can't fly under intense gravity!`);
      user.turn.moveFailed = true;
      await delay(800);
      return;
    }
    user.charging = { move, invulnerable: !!charge.invulnerable };
    log(charge.message(user.name));
    await delay(800);
    for (const { stat, change } of charge.chargeStatChanges ?? []) {
      const applied = applyStatChange(user, stat, change);
      log(statChangeMessage(user.name, stat, applied, change));
      await delay(700);
    }
    return;
  }
  if (releasing) user.charging = null;

  // --- heal block: healing moves fail entirely ---
  if ((move.healing ?? 0) > 0 && isHealBlocked(user)) {
    log(`But ${user.name} can't use it due to Heal Block!`);
    user.turn.moveFailed = true;
    await delay(800);
    return;
  }

  // --- target used protection move
  if (target.protecting === 'protect' && target !== user && !move.targetsSelf) {
    log(`${target.name} protected itself!`);
    user.turn.moveFailed = true;
    await delay(800);
    return;
  }

  // --- psychic terrain shields grounded targets from priority ---
  if (terrain.value.type === 'psychic' && (move.priority ?? 0) > 0 &&
    target !== user && !move.targetsSelf && isGrounded(target)) {
    log(`${target.name} is protected by the psychic terrain!`);
    user.turn.moveFailed = true;
    await delay(800);
    return;
  }

  // --- target is off the field ---
  if (isSemiInvulnerable(target) && target !== user) {
    const through = HITS_THROUGH[target.charging.move.name] ?? [];
    if (!through.includes(move.name)) {
      log(`${target.name} avoided the attack!`);
      user.turn.moveFailed = true;
      await delay(800);
      return;
    }
  }

  // --- accuracy (null = never misses) ---
  let accuracy = move.accuracy;
  if (['thunder', 'hurricane'].includes(move.name)) {
    if (weather.value.type === 'rain') accuracy = null;
    else if (weather.value.type === 'sun') accuracy = 50;
  }
  if (move.name === 'blizzard' && ['hail', 'snow'].includes(weather.value.type)) accuracy = null;
  if (accuracy != null) {
    if (move.category === 'ohko') {
      if (randInt(1, 100) > accuracy + (user.level - target.level)) {
        log(`${user.name}'s attack missed!`);
        user.turn.moveFailed = true;
        await delay(800);
        return;
      }
    } else {
      const evasion = target.minorStatus?.includes('no-type-immunity')
        ? 0
        : (target.stages?.evasion ?? 0);
      const accMod =
        stageMultiplier(user.stages?.accuracy ?? 0, true) / stageMultiplier(evasion, true);
      if (randInt(1, 100) > accuracy * accMod) {
        log(`${user.name}'s attack missed!`);
        user.turn.moveFailed = true;
        user.locked = null;
        user.chain = null;
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
      user.turn.moveFailed = true;
      await delay(800);
      return;
    }
    if (typeEffectiveness(move.type, target.types) === 0) {
      log(`It doesn't affect ${target.name}...`);
      user.turn.moveFailed = true;
      await delay(800);
      return;
    }
    target.currentHp = 0;
    await playAnim(victim, 'hit', 400);
    log("It's a one-hit KO!");
    await delay(800);
    return;
  }

  // --- fixed damage (power is null, so the normal damage block skips these) ---
  const fixed = FIXED_DAMAGE_MOVES[move.name];
  if (fixed) {
    if (isImmuneTo(move, target)) {
      log(`It doesn't affect ${target.name}...`);
      user.turn.moveFailed = true;
      await delay(800);
      return;
    }
    const amount = fixed(user, target);
    if (amount == null) {
      log('But it failed!');
      user.turn.moveFailed = true;
      await delay(800);
      return;
    }
    dealt = Math.min(amount, target.currentHp);
    target.currentHp = Math.max(0, target.currentHp - amount);
    await playAnim(victim, 'hit', 400);
    log(`${user.name} dealt ${dealt} damage.`);

    if (!hitsSelf && dealt > 0) recordDamage(target, move, dealt);

    await delay(600);

    if (move.name === 'final-gambit') {
      user.currentHp = 0;
      log(`${user.name} gave it everything it had!`);
      await delay(600);
    }
  }

  // --- variable power: compute before the damage block reads move.power ---
  const scaler = VARIABLE_POWER_MOVES[move.name];
  if (scaler && !hitsSelf) {
    const power = scaler(user, target);
    if (power == null) {
      log('But it failed!');
      user.turn.moveFailed = true;
      await delay(800);
      return;
    }
    move = { ...move, power: move.name === 'present' ? power : Math.max(1, power) };
  }
  if (move.name === 'magnitude') {
    const tier = { 10: 4, 30: 5, 50: 6, 70: 7, 90: 8, 110: 9, 150: 10 }[move.power];
    log(`Magnitude ${tier}!`);
    await delay(600);
  }
  if (move.name === 'present' && move.power === 0) {
    if (isHealBlocked(target)) {
      log(`${target.name}'s HP was not restored due to Heal Block!`);
      user.turn.moveFailed = true;
    } else {
      const amount = Math.max(1, Math.floor(target.totalHp / 4));
      const before = target.currentHp;
      target.currentHp = Math.min(target.totalHp, target.currentHp + amount);
      log(`${target.name} restored ${target.currentHp - before} HP!`);
    }
    await delay(800);
    return;
  }
  const mult = CONDITIONAL_POWER[move.name];
  if (mult && !hitsSelf && move.power) {
    move = { ...move, power: move.power * mult(user, target) };
  }

  // --- Logic for protection moves
  const screen = SCREEN_MOVES[move.name];
  if (screen === 'auroraVeil' && !['hail', 'snow'].includes(weather.value.type)) {
    log('But it failed!');
    user.turn.moveFailed = true;
    await delay(800);
    return;
  }
  if (screen) {
    const side = sideOf(user);
    if (side[screen] > 0) {
      log('But it failed!');
      user.turn.moveFailed = true;
    } else {
      side[screen] = screen === 'tailwind' ? 4 : 5;
      log(`${prettyName(move.name)} went up on ${user.name}'s side!`);
    }
    await delay(800);
    return;
  }
  if (PROTECT_MOVES[move.name]) {
    const streak = user.protectStreak ?? 0;
    if (streak > 0 && randInt(1, 100) > Math.floor(100 / Math.pow(3, streak))) {
      log('But it failed!');
      user.protectStreak = 0;
      user.turn.moveFailed = true;
      await delay(800);
      return;
    }
    user.protecting = PROTECT_MOVES[move.name];
    user.protectStreak = streak + 1;
    log(`${user.name} protected itself!`);
    await delay(800);
    return;
  }

  // --- Logic for Field Moves
  const fieldMove = FIELD_MOVES[move.name];
  if (fieldMove) {
    if (field.value[fieldMove] > 0) {
      field.value[fieldMove] = 0;
      log(`The ${FIELD_LABEL[fieldMove]} wore off!`);
    } else {
      field.value[fieldMove] = 5;
      log(`${user.name} twisted the dimensions!`);
    }
    await delay(800);
    return;
  }

  // --- Logic for Weather Moves
  const weatherType = WEATHER_MOVES[move.name];
  if (weatherType) {
    if (weather.value.type === weatherType) {
      log('But it failed!');
      user.turn.moveFailed = true;
    } else {
      weather.value = { type: weatherType, turns: 5 };
      log(WEATHER_START_MSG[weatherType]);
    }
    await delay(800);
    return;
  }

  // --- Logic for Terrain Moves
  const terrainType = TERRAIN_MOVES[move.name];
  if (terrainType) {
    if (terrain.value.type === terrainType) {
      log('But it failed!');
      user.turn.moveFailed = true;
    } else {
      terrain.value = { type: terrainType, turns: 5 };
      log(TERRAIN_START_MSG[terrainType]);
    }
    await delay(800);
    return;
  }

  // --- Logic for Roar / Whirlwind (PokeAPI meta.category "force-switch") ---
  if (move.category === 'force-switch') {
    if (target.substitute > 0 || target.minorStatus?.includes('ingrain')) {
      log('But it failed!');
      user.turn.moveFailed = true;
      await delay(800);
      return;
    }
    pendingSwitch.value = { side: victim, mode: 'phaze' };
    await delay(400);
    return;
  }

  // --- Logic for Hazard Moves
  const hazard = HAZARD_MOVES[move.name];
  if (hazard) {
    const side = foeSideOf(user);
    const cap = hazard === 'spikes' ? 3 : hazard === 'toxicSpikes' ? 2 : 1;
    const current = hazard === 'spikes' || hazard === 'toxicSpikes' ? side[hazard] : (side[hazard] ? 1 : 0);

    if (current >= cap) {
      log('But it failed!');
      user.turn.moveFailed = true;
    } else {
      if (cap === 1) side[hazard] = true;
      else side[hazard] += 1;
      log(`${prettyName(move.name)} was scattered around ${target.name}'s feet!`);
    }
    await delay(800);
    return;
  }

  // --- Logic for Rapid Spin
  if (move.name === 'rapid-spin') {
    if (clearHazards(sideOf(user))) {
      log(`${user.name} blew away the hazards!`);
      await delay(700);
    }
    if (user.trapped) {
      log(`${user.name} broke free from ${user.trapped.move}!`);
      user.trapped = null;
      user.minorStatus = user.minorStatus.filter(s => s !== 'trap');
      await delay(700);
    }
    user.minorStatus = user.minorStatus.filter(s => s !== 'leech-seed');
    // no return — Rapid Spin still deals damage
  }

  // --- Logic for Defog
  if (move.name === 'defog') {
    if (terrain.value.type) { terrain.value = { type: null, turns: 0 }; }
    clearHazards(sideOf(user));
    clearHazards(foeSideOf(user));
    const theirs = foeSideOf(user);
    for (const k of ['reflect', 'lightScreen', 'auroraVeil', 'safeguard', 'mist']) {
      theirs[k] = 0;
    }
    applyStatChange(target, 'evasion', -1);
    log(`${user.name} blew away the barriers and hazards!`);
    await delay(800);
    return;
  }

  // --- Logic for the move Bide ---
  if (move.name === 'bide') {
    if (!user.bide) {
      user.bide = { move: move, turns: 2, damage: 0 };
      log(`${user.name} is storing energy!`);
      await delay(800);
      return;
    }
    if (--user.bide.turns > 0) {
      log(`${user.name} is storing energy!`);
      await delay(800);
      return;
    }
    const stored = user.bide.damage * 2;
    user.bide = null;
    log(`${user.name} unleashed energy!`);
    await delay(600);
    if (stored <= 0) {
      log('But it failed!');
      user.turn.moveFailed = true;
      await delay(800);
      return;
    }
    dealt = Math.min(stored, target.currentHp);
    target.currentHp = Math.max(0, target.currentHp - stored);
    await playAnim(victim, 'hit', 400);
    log(`${user.name} dealt ${dealt} damage.`);
    recordDamage(target, { damageClass: null }, dealt);
    await delay(600);
  }

  // --- Logic for the moves Mimic and Sketch
  if (move.name === 'mimic' || move.name === 'sketch') {
    const copy = target.lastUsedMove;
    if (!copy || UNCOPYABLE.has(copy.name) ||
      user.moves.some(m => m.name === copy.name)) {
      log('But it failed!');
      user.turn.moveFailed = true;
      await delay(800);
      return;
    }
    const slot = user.moves.findIndex(m => m.name === move.name);
    const learned = move.name === 'sketch'
      ? { ...copy, currentPP: copy.maxPP }
      : { ...copy, maxPP: 5, currentPP: 5, mimicked: true };
    user.moves[slot] = learned;
    log(`${user.name} learned ${prettyName(copy.name)}!`);
    await delay(800);
    return;
  }

  // --- Logic for the move Transform
  if (move.name === 'transform') {
    log(`${user.name} transformed into ${target.name}`)
    if (actor === 'ally') {

      userPokemon.value = makeCombatant(target);
      userPokemon.value.name = user.name
      userPokemon.value.id = user.id
      userPokemon.value.level = user.level
      userPokemon.value.totalHp = user.totalHp
      userPokemon.value.currentHp = user.currentHp
      userPokemon.value.baseExp = user.baseExp
      userPokemon.value.currentExp = user.currentExp
      userPokemon.value.captureRate = user.captureRate
      userPokemon.value.instanceId = user.instanceId
      userPokemon.value.evoDetails = user.evoDetails
      userPokemon.value.totalKOs = user.totalKOs
      userPokemon.value.totalFaints = user.totalFaints
      userPokemon.value.heldItem = user.heldItem
      userPokemon.value.moves = userPokemon.value.moves.map(m => ({ ...m, maxPP: 5, currentPP: 5, disabled: false }));
      activeTransformPokemon.value = { pokemon: userPokemon.value, trainer: 'ally' }
    }
    else {
      foe.value = makeCombatant(target);
      foe.value.name = user.name
      foe.value.id = user.id
      foe.value.level = user.level
      foe.value.totalHp = user.totalHp
      foe.value.currentHp = user.currentHp
      foe.value.baseExp = user.baseExp
      foe.value.currentExp = user.currentExp
      foe.value.captureRate = user.captureRate
      foe.value.instanceId = user.instanceId
      foe.value.evoDetails = user.evoDetails
      foe.value.totalKOs = user.totalKOs
      foe.value.totalFaints = user.totalFaints
      foe.value.heldItem = user.heldItem
      foe.value.moves = foe.value.moves.map(m => ({ ...m, maxPP: 5, currentPP: 5, disabled: false }));
      activeTransformPokemon.value = { pokemon: foe.value, trainer: 'foe' }
    }
    return
  }

  // --- Logic for the move Substitute
  if (move.name === 'substitute') {
    const cost = Math.floor(user.totalHp / 4);
    if (user.currentHp <= cost || user.substitute) {
      log('But it failed!');
      user.turn.moveFailed = true;
    } else {
      user.currentHp -= cost;
      user.substitute = cost;
      log(`${user.name} put in a substitute!`);
    }
    await delay(800);
    return;
  }

  // --- Logic for weather ball
  if (move.name === 'weather-ball' && weather.value.type) {
    const t = { rain: 'water', sun: 'fire', sandstorm: 'rock', hail: 'ice', snow: 'ice' }[weather.value.type];
    move = { ...move, type: t, power: 100 };
  }
  // --- Logic for terrain pulse
  if (move.name === 'terrain-pulse' && terrain.value.type && isGrounded(user)) {
    const t = { electric: 'electric', grassy: 'grass', misty: 'fairy', psychic: 'psychic' }[terrain.value.type];
    move = { ...move, type: t, power: 100 };
  }

  // --- escalating chain moves (Rollout, Fury Cutter, Echoed Voice) ---
  const chain = CHAIN_MOVES[move.name];
  let chainStep = 0;
  if (chain && !hitsSelf) {
    if (chain.shared) {
      const c = echoedVoice.value;
      c.count = c.lastTurn >= turnValue - 1 ? Math.min(c.count + 1, 5) : 1;
      c.lastTurn = turnValue;
      chainStep = c.count;
    } else {
      chainStep = Math.min((user.chain?.count ?? 0) + 1, chain.maxSteps);
      user.chain = { move: move.name, count: chainStep };
    }

    if (chain.lock && !user.locked) {
      user.locked = { move, turns: chain.maxSteps };   // store the ORIGINAL move object
    }

    let power = chain.mode === 'double'
      ? chain.base * Math.pow(2, chainStep - 1)
      : Math.min(chain.max, chain.base * chainStep);

    if (chain.defenseCurl && user.defenseCurled) power *= 2;
    move = { ...move, power };

    if (chainStep > 1) {
      log(`${prettyName(move.name)} is building momentum! (${power} power)`);
      await delay(400);
    }
  }

  // --- damage ---
  if (move.power) {
    const hits = rollHitCount(move);
    let landed = 0;
    let effectiveness = 1;
    let anyCrit = false;

    for (let i = 0; i < hits; i++) {
      const results = calculateDamage(user, target, move);
      if (results.immune) {
        log(`It doesn't affect ${target.name}...`);
        user.turn.moveFailed = true;
        user.locked = null;
        user.chain = null;
        await delay(800);
        return;
      }
      effectiveness = results.effectiveness;
      anyCrit ||= results.critical;
      const surviving = target.protecting === 'endure' && target.currentHp > 0;
      // Checks for substitute to give tamage to instead
      if (target.substitute > 0 && !move.targetsSelf) {
        target.substitute -= results.damage;
        if (target.substitute <= 0) {
          target.substitute = 0;
          log(`${target.name}'s substitute faded!`);
        }
        continue;  // no HP loss, no recordDamage
      }

      dealt += Math.min(results.damage, target.currentHp);

      target.currentHp = surviving
        ? Math.max(1, target.currentHp - results.damage)
        : Math.max(0, target.currentHp - results.damage);
      await playAnim(victim, 'hit', 250);
      landed++;
      if (target.currentHp <= 0) break;
    }

    if (!hitsSelf && dealt > 0) recordDamage(target, move, dealt);

    if (hits > 1) { log(`Hit ${landed} time${landed === 1 ? '' : 's'}!`); await delay(400); }
    log(`${user.name} dealt ${dealt} damage.`);
    if (anyCrit) { await delay(600); log('A critical hit!'); }
    if (effectiveness > 1) { await delay(600); log("It's super effective!"); }
    else if (effectiveness > 0 && effectiveness < 1) { await delay(600); log("It's not very effective..."); }
    await delay(600);

    if (RECHARGE_MOVES.has(move.name)) user.mustRecharge = true;
  }

  // --- lock-in moves ---
  const lock = LOCKING_MOVES[move.name];
  if (lock) {
    if (!user.locked) {
      user.locked = { move, turns: randInt(move.minTurns || 2, move.maxTurns || 3) };
    }
    if (--user.locked.turns <= 0) {
      user.locked = null;
      if (lock.confusionAfter) await inflictStatus(user, 'confusion');
    }
  }

  // --- chain lock countdown (Rollout / Ice Ball) ---
  if (chain?.lock && user.locked) {
    if (--user.locked.turns <= 0 || chainStep >= chain.maxSteps) {
      user.locked = null;
      user.chain = null;
    }
  }

  // fainted — skip every secondary effect
  if (target.currentHp <= 0) return;

  // --- stat changes ---
  const statChanges = move.statChanges ?? [];
  if (statChanges.length) {
    const chance = move.statChance || 100;
    if (randInt(1, 100) <= chance) {
      const recipient = (move.targetsSelf || /^damage[+-]raise$/.test(move.category)) ? user : target;
      for (const { stat, change } of statChanges) {
        const blocked = change < 0
          && recipient !== user
          && sideOf(recipient).mist > 0;

        if (blocked) {
          log(`${recipient.name} is protected by Mist!`);
          user.turn.moveFailed = true;
          await delay(700);
          continue;
        }

        const applied = applyStatChange(recipient, stat, change);
        log(statChangeMessage(recipient.name, stat, applied, change));
        await delay(700);
      }
    }
  }

  // --- status ailment ---
  if (move.ailment && !LOCKING_MOVES[move.name]) {
    const chance = move.ailmentChance || 100;
    if (randInt(1, 100) <= chance) {
      const recipient = move.targetsSelf ? user : target;
      await inflictStatus(recipient, move.ailment, move, user);
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
    let healPct = move.healing;
    if (['moonlight', 'synthesis', 'morning-sun'].includes(move.name)) {
      healPct = weather.value.type === 'sun' ? 66 : weather.value.type ? 25 : 50;
    }
    if (move.name === 'shore-up' && weather.value.type === 'sandstorm') healPct = 66;
    const amount = Math.floor(user.totalHp * (healPct / 100));
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

  // --- forced / self switching (after all other effects) ---
  if (!hitsSelf) {
    if (DAMAGE_PHAZE_MOVES.has(move.name) && dealt > 0
      && !target.minorStatus?.includes('ingrain')) {
      pendingSwitch.value = { side: victim, mode: 'phaze' };
    }
    const selfSwitch = SELF_SWITCH_MOVES[move.name];
    if (selfSwitch) {
      if (selfSwitch.weather && weather.value.type !== selfSwitch.weather) {
        weather.value = { type: selfSwitch.weather, turns: 5 };
        log(WEATHER_START_MSG[selfSwitch.weather]);
        await delay(700);
      }
      if (selfSwitch.shedTail) {
        const cost = Math.floor(user.totalHp / 2);
        if (user.currentHp <= cost) {
          log('But it failed!');
          user.turn.moveFailed = true;
          await delay(800);
          return;
        }
        user.currentHp -= cost;
        log(`${user.name} shed its tail to create a decoy!`);
        await delay(700);
      }
      pendingSwitch.value = {
        side: actor, mode: 'self',
        baton: !!selfSwitch.baton,
        shedSub: selfSwitch.shedTail ? Math.floor(user.totalHp / 4) : 0,
        escapesWild: !!selfSwitch.escapesWild,
      };
    }
  }

  if (!hitsSelf && move.name === 'rage') user.raging = true;

  if (!hitsSelf && !COPY_MOVES.has(move.name)) lastMoveInBattle.value = move;
  await delay(400);
}

function calculateDamage(attacker, defender, move, opts = {}) {
  const critStage = (move.critRate ?? 0) + (attacker.critStages ?? 0);
  const critChance = [1 / 24, 1 / 8, 1 / 2, 1][Math.min(critStage, 3)];

  const {
    critical = Math.random() < critChance,
    randomFactor = randInt(85, 100) / 100,
    otherMod = 1,
  } = opts;

  const weatherMod = opts.weatherMod ?? weatherDamageMod(move);
  const terrainMod = opts.terrainMod ?? terrainDamageMod(move, attacker, defender);

  if (move.class === 'status' || !move.power) {
    return { damage: 0, effectiveness: 1, critical: false, immune: false };
  }

  let effectiveness = typeEffectiveness(move.type, defender.types);
  const grounded = defender.minorStatus?.includes('no-type-immunity') || (move.type === 'ground' && defender.minorStatus?.includes('ingrain'))
    || (field.value.gravity > 0 && (move.type === 'ground' && defender.types.includes('flying')));
  if (grounded && effectiveness == 0) effectiveness = 1
  if (effectiveness === 0) {
    return { damage: 0, effectiveness: 0, critical: false, immune: true };
  }

  const physical = move.damageClass === 'physical';
  const atkStat = physical ? 'attack' : 'special-attack'
  const defStat = physical ? 'defense' : 'special-defense'
  const realDefStat = field.value.wonderRoom > 0
    ? (defStat === 'defense' ? 'special-defense' : 'defense')
    : defStat;

  const atk = critical ? Math.max(statOf(attacker, atkStat), rawStat(attacker, atkStat)) : statOf(attacker, atkStat);
  const def = critical ? Math.min(statOf(defender, realDefStat), rawStat(defender, realDefStat)) : statOf(defender, realDefStat);

  const base =
    Math.floor(
      Math.floor(
        (Math.floor((2 * attacker.level) / 5 + 2) * move.power * atk) / def
      ) / 50
    ) + 2;

  const stab = attacker.types.includes(move.type) ? 1.5 : 1;
  const critMod = critical ? 1.5 : 1;

  const screens = sides.value[defender === userPokemon.value ? 'ally' : 'foe'];
  const screened =
    (physical && (screens.reflect > 0 || screens.auroraVeil > 0)) ||
    (!physical && (screens.lightScreen > 0 || screens.auroraVeil > 0));
  const screenMod = screened && !critical ? 0.5 : 1;

  const damage = Math.max(
    1,
    Math.floor(base * weatherMod * terrainMod * critMod * randomFactor * stab * effectiveness * otherMod * screenMod)
  );

  return { damage, effectiveness, critical, immune: false };
}

function rawStat(pokemon, name) {
  const raw = pokemon.stats.find(s => s.name === name)?.stat ?? 1;
  let value = raw;
  if (name === 'attack' && pokemon.status === 'burn') value *= 0.5;
  if (name === 'special-defense' && weather.value.type === 'sandstorm' && pokemon.types.includes('rock')) value *= 1.5;
  if (name === 'defense' && weather.value.type === 'snow' && pokemon.types.includes('ice')) value *= 1.5;
  return Math.floor(value);
}

function typeEffectiveness(moveType, defenderTypes) {
  return defenderTypes.reduce(
    (mult, t) => mult * (pokemonStore.typeChart[moveType]?.[t] ?? 1),
    1
  );
}

function weatherDamageMod(move) {
  const w = weather.value.type;
  if (!w) return 1;
  if (w === 'rain') {
    if (move.type === 'water') return 1.5;
    if (move.type === 'fire') return 0.5;
  }
  if (w === 'sun') {
    if (move.type === 'fire') return 1.5;
    if (move.type === 'water') return 0.5;
  }
  // Solar Beam / Solar Blade are halved in any non-sun weather
  if (w !== 'sun' && ['solar-beam', 'solar-blade'].includes(move.name)) return 0.5;
  return 1;
}

function terrainDamageMod(move, attacker, defender) {
  const t = terrain.value.type;
  if (!t) return 1;
  if (t === 'electric' && move.type === 'electric' && isGrounded(attacker)) return 1.3;
  if (t === 'grassy') {
    if (move.type === 'grass' && isGrounded(attacker)) return 1.3;
    if (['earthquake', 'magnitude', 'bulldoze'].includes(move.name)) return 0.5;
  }
  if (t === 'psychic' && move.type === 'psychic' && isGrounded(attacker)) return 1.3;
  if (t === 'misty' && move.type === 'dragon' && isGrounded(defender)) return 0.5;
  return 1;
}

function stageMultiplier(stage, isAccuracy = false) {
  const base = isAccuracy ? 3 : 2;
  return stage >= 0 ? (base + stage) / base : base / (base - stage);
}

function recordDamage(target, move, amount) {
  if (!target.turn) startTurn(target);
  if (target.raging && amount > 0) {
    const applied = applyStatChange(target, 'attack', 1);
    if (applied) log(`${target.name}'s rage is building!`);
  }
  target.turn.damageTaken += amount;
  target.turn.wasHit = true;
  target.turn.lastDamageTaken = amount;
  if (move.damageClass === 'physical') {
    target.turn.physicalDamage += amount;
    target.turn.lastPhysicalDamage = amount;
  } else if (move.damageClass === 'special') {
    target.turn.specialDamage += amount;
    target.turn.lastSpecialDamage = amount;
  }
  if (target.bide) target.bide.damage += amount;
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

async function inflictStatus(target, ailment, move, user) {
  if (!target.minorStatus) target.minorStatus = [];

  if (user && sideOf(target) !== sideOf(user) && sideOf(target).safeguard > 0
    && MAJOR_STATUSES.has(ailment)) {
    log(`${target.name} is protected by Safeguard!`);
    user.turn.moveFailed = true;
    await delay(800);
    return;
  }

  if (terrain.value.type === 'electric' && ailment === 'sleep' && isGrounded(target)) {
    log(`${target.name} can't sleep on the electric terrain!`);
    if (user) user.turn.moveFailed = true;
    await delay(800);
    return;
  }
  if (terrain.value.type === 'misty' && isGrounded(target) &&
    (MAJOR_STATUSES.has(ailment) || ailment === 'confusion')) {
    log(`${target.name} is protected by the misty terrain!`);
    if (user) user.turn.moveFailed = true;
    await delay(800);
    return;
  }

  // Major status effects
  if (MAJOR_STATUSES.has(ailment)) {
    if (target.status) {
      log(`But ${target.name} is already ${target.status}!`);
      user.turn.moveFailed = true;
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
    const combatants = [userPokemon.value, foe.value].filter(Boolean);
    const affected = combatants.filter(applyPerishSong).length;
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
    user.turn.moveFailed = true;
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
      user.turn.moveFailed = true;
      await delay(800);
      return
    }
    target.minorStatus.push('nightmare')
    target.nightmare = true
  } else if (ailment === 'disable') {
    if (!target.lastUsedMove) {
      log(`${target.name} has not used a move, ${prettyName(move.name)} failed!`);
      user.turn.moveFailed = true;
      await delay(800);
      return
    } else if (target.locked || target.charging) {
      log(`${prettyName(move.name)} failed!`);
      user.turn.moveFailed = true;
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
      user.turn.moveFailed = true;
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

async function canAct(pokemon, move) {
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
    if (move.name === 'sleep-talk') return true
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

async function resolveCalledMove(user, target, move) {
  const usable = (m) => m && !UNCOPYABLE.has(m.name);

  switch (move.name) {
    case 'mirror-move':
      return usable(target.lastUsedMove) ? target.lastUsedMove : null;

    case 'copycat':
      return usable(lastMoveInBattle.value) ? lastMoveInBattle.value : null;

    case 'me-first': {
      const theirs = target.turn?.pendingMove;
      if (target.turn?.hasMoved) return null;          // must move first
      if (!usable(theirs) || !theirs.power) return null; // damaging only
      return { ...theirs, power: Math.floor(theirs.power * 1.5) };
    }

    case 'nature-power':
      return await fetchMoveByName(NATURE_POWER_BY_TERRAIN[terrain.value.type] ?? 'tri-attack');

    case 'sleep-talk':
    case 'assist': {
      const pool = move.name === 'sleep-talk'
        ? (user.moves ?? []).filter(m => m.name !== 'sleep-talk')
        : team.value
          .filter(p => p.instanceId !== user.instanceId)
          .flatMap(p => p.moves ?? []);
      const valid = pool.filter(usable);
      return valid.length ? valid[randInt(0, valid.length - 1)] : null;
    }

    case 'metronome': {
      for (let i = 0; i < 6; i++) {
        const picked = await fetchMoveById(randInt(1, 559));
        if (usable(picked)) return picked;
      }
      return null;
    }
  }
  return null;
}

async function fetchMoveById(id) {
  try {
    return await pokemonHelper.getMoveData(await pokeapi.getMove(id));
  } catch { return null; }
}

async function fetchMoveByName(name) {
  try {
    return await pokemonHelper.getMoveData(await pokeapi.getMove(name));
  } catch { return null; }
}

function captureBatonPayload(p) {
  return {
    stages: { ...p.stages },
    substitute: p.substitute ?? 0,
    minorStatus: (p.minorStatus ?? []).filter(s => PASSED_VOLATILES.includes(s)),
    confusionTurns: p.confusionTurns ?? 0,
    perishTurns: p.perishTurns ?? 0,
    embargoTurns: p.embargoTurns ?? 0,
    healBlockTurns: p.healBlockTurns ?? 0,
  };
}

function applyBatonPayload(p, payload) {
  p.stages = payload.stages;
  p.substitute = payload.substitute;
  if (!p.minorStatus) p.minorStatus = [];
  for (const s of payload.minorStatus) {
    if (!p.minorStatus.includes(s)) p.minorStatus.push(s);
  }
  if (payload.minorStatus.includes('confusion')) p.confusionTurns = payload.confusionTurns;
  if (payload.minorStatus.includes('perish-song')) p.perishTurns = payload.perishTurns;
  if (payload.minorStatus.includes('embargo')) p.embargoTurns = payload.embargoTurns;
  if (payload.minorStatus.includes('heal-block')) p.healBlockTurns = payload.healBlockTurns;
}

// same promise pattern as your openReplaceMoveModal
function requestSwitchPick() {
  awaitingSwitchPick.value = true;
  sidePanel.value = 'team';
  return new Promise((resolve) => {
    resolveSwitchPick = (pokemon) => {
      awaitingSwitchPick.value = false;
      resolveSwitchPick = null;
      resolve(pokemon);
    };
  });
}

/** Resolves any queued switch. Returns true if the battle ended / turn should stop. */
async function resolvePendingSwitch(skipTurn = null) {
  const req = pendingSwitch.value;
  if (!req) return false;
  pendingSwitch.value = null;

  // ---------- foe side ----------
  if (req.side === 'foe') {
    if (isFainted(foe.value)) return false;

    if (props.isWild) {
      if (req.mode === 'phaze' || req.escapesWild) {
        log(req.mode === 'phaze'
          ? `${foe.value.name} was blown away!`
          : `${foe.value.name} teleported away!`);
        await delay(800);
        emit('fled', foe.value);
        endBattle('fled');
        return true;
      }
      return false; // wild mons have no bench — U-turn etc. is just damage
    }

    const options = props.oppTeam?.filter(p => p !== foe.value && p.currentHp > 0) ?? [];
    if (!options.length) {
      if (req.mode === 'phaze') { log('But it failed!'); await delay(700); }
      return false;
    }
    if (req.mode === 'phaze' && skipTurn) skipTurn.foe = true;

    const incoming = options[Math.floor(Math.random() * options.length)];
    const payload = req.baton ? captureBatonPayload(foe.value) : null;
    resetVolatiles(foe.value);
    log(req.mode === 'phaze'
      ? `${foe.value.name} was dragged out!`
      : `${foe.value.name} went back! Go, ${incoming.name}!`);
    foe.value = incoming;
    startTurn(foe.value);
    if (payload) applyBatonPayload(foe.value, payload);
    if (req.shedSub) foe.value.substitute = req.shedSub;
    await delay(700);
    await applyHazards(foe.value);
    if (await handleFaint(foe.value)) return true;
    return false;
  }

  // ---------- ally side ----------
  if (isFainted(userPokemon.value)) return false;
  const options = team.value.filter(
    p => !isFainted(p) && p.instanceId !== userPokemon.value.instanceId
  );
  if (!options.length) {
    if (req.mode === 'phaze') { log('But it failed!'); await delay(700); }
    return false;
  }
  if (req.mode === 'phaze' && skipTurn) skipTurn.ally = true;

  let incoming;
  if (req.mode === 'phaze') {
    incoming = options[Math.floor(Math.random() * options.length)];
  } else {
    log('Choose a Pokémon to switch in!');
    incoming = await requestSwitchPick();
  }

  const payload = req.baton ? captureBatonPayload(userPokemon.value) : null;
  resetVolatiles(userPokemon.value);
  log(req.mode === 'phaze'
    ? `${incoming.name} was dragged out!`
    : `${userPokemon.value.name}, come back! Go, ${incoming.name}!`);
  userPokemon.value = incoming;
  if (incoming.currentHp == null) incoming.currentHp = incoming.totalHp;
  startTurn(incoming);
  if (payload) applyBatonPayload(incoming, payload);
  if (req.shedSub) incoming.substitute = req.shedSub;
  sidePanel.value = 'log';
  await delay(700);
  await applyHazards(incoming);       // must run AFTER userPokemon.value is reassigned — sideOf() depends on it
  if (await handleFaint(incoming)) return true;
  return false;
}

async function endOfTurn(target, reciver) {
  await endOfTurnIngrain(target)
  await endOfTurnGrassy(target)
  await endOfTurnWeather(target)
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

  pokemon.perishTurns = (pokemon.perishTurns) - 1;
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

async function endOfTurnField() {
  for (const key of ['ally', 'foe']) {
    const s = sides.value[key];
    for (const k of ['reflect', 'lightScreen', 'auroraVeil', 'safeguard', 'mist', 'tailwind']) {
      if (s[k] > 0 && --s[k] === 0) log(`${key === 'ally' ? 'Your' : "The foe's"} ${k} wore off!`);
    }
  }
  for (const k of Object.keys(field.value)) {
    if (field.value[k] > 0 && --field.value[k] === 0) log(`The ${k} wore off!`);
  }
  if (weather.value.type && --weather.value.turns <= 0) {
    log(WEATHER_END_MSG[weather.value.type]);
    weather.value = { type: null, turns: 0 };
  }
  if (terrain.value.type && --terrain.value.turns <= 0) {
    log(`The ${terrain.value.type} terrain disappeared!`);
    terrain.value = { type: null, turns: 0 };
  }
}

async function endOfTurnWeather(pokemon) {
  const w = weather.value.type;
  if (pokemon.currentHp <= 0) return;
  const immune = w === 'sandstorm'
    ? pokemon.types.some(t => ['rock', 'ground', 'steel'].includes(t))
    : pokemon.types.includes('ice');
  if ((w === 'sandstorm' || w === 'hail') && !immune) {
    const amount = Math.max(1, Math.floor(pokemon.totalHp / 16));
    pokemon.currentHp = Math.max(0, pokemon.currentHp - amount);
    log(`${pokemon.name} is buffeted by the ${w}!`);
    await delay(800);
  }
}

async function endOfTurnGrassy(pokemon) {
  if (terrain.value.type !== 'grassy') return;
  if (pokemon.currentHp <= 0 || pokemon.currentHp >= pokemon.totalHp) return;
  if (!isGrounded(pokemon) || isHealBlocked(pokemon)) return;
  const amount = Math.max(1, Math.floor(pokemon.totalHp / 16));
  const before = pokemon.currentHp;
  pokemon.currentHp = Math.min(pokemon.totalHp, pokemon.currentHp + amount);
  log(`${pokemon.name} was healed by the grassy terrain! (+${pokemon.currentHp - before} HP)`);
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

async function throwPokeball(pokeball) {
  let target = props.opponent
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
  // mid-turn pick for U-turn / Baton Pass / etc.
  if (awaitingSwitchPick.value) {
    if (isFainted(pokemon)) return;
    if (pokemon.instanceId === userPokemon.value?.instanceId) return;
    resolveSwitchPick?.(pokemon);
    return;
  }
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

  resetVolatiles(userPokemon.value)

  if (activeTransformPokemon.value) syncBattleForm()
  activeTransformPokemon.value = null

  isResolving.value = true;
  try {
    startTurn(pokemon)
    startTurn(foe.value)
    log(`${userPokemon.value.name}, come back!`);
    await delay(600);
    userPokemon.value = pokemon;
    if (pokemon.currentHp == null) pokemon.currentHp = pokemon.totalHp;
    log(`Go, ${pokemon.name}!`);
    sidePanel.value = 'log';
    await delay(600);

    // Applying all stage Hazards to the newly switched in pokemon
    await applyHazards(pokemon)

    checkMegaEvo()

    // switching costs your turn
    const wildMove = await pickMove(foe.value);
    if (wildMove) {
      await useMove(foe.value, userPokemon.value, wildMove);
      if (await resolvePendingSwitch()) return;
      await handleFaint(userPokemon.value);
    }
    await endOfTurnPerish(foe.value);
    await endOfTurnPerish(pokemon);
    if (await endOfTurn(foe.value, pokemon)) return;
    if (await endOfTurn(pokemon, foe.value)) return;
    await endOfTurnField();
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
  color: Canvas;
}

.move-power {
  font-variant-numeric: tabular-nums;
  color: Canvas;
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

.battlefield {
  background-image: url("@/assets/img/pokemonField.png");
  background-position: center;
  background-repeat: no-repeat;
  background-size: 100% 100%;
  border: solid 2px DarkBlue;
}

.combatant-foe .combatant-name {
  color: black;
  /* Change to desired color */
}

.combatant-foe .label {
  color: black;
}

.combatant-foe .hp-text {
  color: black;
}

.combatant-ally .combatant-name {
  color: black;
  /* Change to desired color */
}

/* Player Level ("Lv 50") */
.combatant-ally .label {
  color: black;
}

/* Player HP Text ("120/120") */
.combatant-ally .hp-text {
  color: black;
}

.arena {
  background-color: white;
  border: 3px solid red;
  overflow: hidden;
}

.mega-btn {
  display: flex;
  justify-content: center;
  align-items: center;
  justify-self: center;
  width: 75%;
  background-color: Canvas;
  color: CanvasText;
  border-radius: 3px;
  border: 2px solid gray;
}

.mega-btn:hover {
  border: 2px solid red;
  cursor: pointer;
}

.log-line.turn-header {
  border-bottom: 2px solid currentColor;
  font-weight: bold;
  margin-top: 10px;
  padding-bottom: 4px;
}

.evo-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  color: white;
  text-align: center;
}

/* Glowing silhouette during pulse phase */
.evo-pulse {
  filter: brightness(0) invert(1) drop-shadow(0 0 12px white);
  animation: pulseScale 1s infinite ease-in-out;
}

@keyframes pulseScale {

  0%,
  100% {
    transform: scale(1);
  }

  50% {
    transform: scale(0.8);
  }
}

/* Bright pop when evolution finishes */
.evo-burst {
  animation: burstIn 0.8s ease-out;
}

@keyframes burstIn {
  0% {
    transform: scale(0.2);
    filter: brightness(3);
  }

  100% {
    transform: scale(1);
    filter: brightness(1);
  }
}

/* Mega Evolution Energy Burst Effect */
.battle-sprite.sprite-ally.mega-evolving {
  animation: megaBurst 1.2s ease-in-out infinite;
}

@keyframes megaBurst {
  0% {
    filter: brightness(1) drop-shadow(0 0 0px transparent);
    transform: scale(1);
  }

  40% {
    /* Energy buildup: Magenta/Purple glow */
    filter: brightness(1.8) saturate(2) drop-shadow(0 0 18px #e056fd);
    transform: scale(1.1) rotate(-2deg);
  }

  50% {
    /* Cyan white-hot energy flash right at the sprite swap */
    filter: brightness(4) drop-shadow(0 0 35px #00d2d3);
    transform: scale(1.25) rotate(2deg);
  }

  100% {
    filter: brightness(1) drop-shadow(0 0 0px transparent);
    transform: scale(1);
  }
}

@media (prefers-color-scheme: dark) {
  .status-chip {
    background: var(--p-surface-700);
  }
}

.field-chips {
  display: flex;
  gap: 0.375rem;
}

.field-chip {
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: capitalize;
  background: var(--p-surface-200);
  background-color: black;
}

.info-dot {
  flex: none;
  align-self: center;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 0.9rem;
  height: 0.9rem;
  border-radius: 50%;
  border: 1px solid black;
  font-size: 0.5625rem;
  font-weight: 700;
  font-style: italic;
  color: black;
  line-height: 1;
  opacity: 0.65;
  cursor: help;
}

.info-dot:hover,
.info-dot:focus-visible {
  opacity: 1;
}
</style>

<style>
/* not scoped: PrimeVue teleports tooltips to <body> */
.p-tooltip .p-tooltip-text:has(.mon-info) {
  max-width: none;
  padding: 0.5rem 0.625rem;
}
</style>