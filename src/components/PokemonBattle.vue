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
                  <span v-if="foe.status">
                    <span v-if="foe.status === 'paralysis'" class="pi pi-bolt"></span>
                  </span>
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
                  <span v-if="userPokemon.status">
                    <span v-if="userPokemon.status === 'paralysis'" class="pi pi-bolt"></span>
                  </span>
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
                :disabled="isResolving || isFainted(userPokemon)" @click="battleTurn(move)">
                <span class="move-name">{{ move.name }}</span>
                <span class="move-power">{{ move.power ?? '—' }}</span>
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
import { label } from '@primeuix/themes/aura/metergroup';
import SelectButton from 'primevue/selectbutton';
import Badge from 'primevue/badge';

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



const STAT_LABEL = {
  attack: 'Attack', defense: 'Defense',
  'special-attack': 'Sp. Atk', 'special-defense': 'Sp. Def',
  speed: 'Speed', accuracy: 'accuracy', evasion: 'evasiveness',
};

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

/* ------------------------------------------------------------------ *
 * Battle lifecycle
 * ------------------------------------------------------------------ */

function startBattle() {
  if (!userPokemon.value) return;
  if (userPokemon.value.currentHp == null) {
    userPokemon.value.currentHp = userPokemon.value.totalHp;
  }
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
        await applyItem(item, selectedTargetPokemon.value);
      }

      if (wildMove) {
        await useMove(wild, player, wildMove);
        if (await handleFaint(player)) return;
      }

      endOfTurnDamage(player)
      endOfTurnDamage(wild)
      if (await handleFaint(player)) return;
      if (await handleFaint(wild)) return;

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
      if (await handleFaint(defender)) return;
    }
    endOfTurnDamage(player)
    endOfTurnDamage(wild)
    if (await handleFaint(player)) return;
    if (await handleFaint(wild)) return;
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
  const moves = pokemon.moves ?? [];
  return moves.length ? moves[randInt(0, moves.length - 1)] : null;
}

/**
 * Handles a fainted combatant. Returns true if the turn should stop.
 */
async function handleFaint(pokemon) {
  if (!isFainted(pokemon)) return false;
  log(`${pokemon.name} fainted!`);
  await playAnim(pokemon === foe.value ? 'foe' : 'ally', 'faint', 700);

  if (pokemon === foe.value) {

    
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
  const actor = user === userPokemon.value ? 'ally' : 'foe';
  const victim = actor === 'ally' ? 'foe' : 'ally';

  // --- pre-move status checks ---
  if (!(await canAct(user))) return;

  log(`${user.name} used ${prettyName(move.name)}!`);
  await playAnim(actor, 'lunge', 300);

  // --- accuracy (null = never misses) ---
  if (move.accuracy != null) {
    const accMod =
      stageMultiplier(user.stages?.accuracy ?? 0, true) /
      stageMultiplier(target.stages?.evasion ?? 0, true);
    if (randInt(1, 100) > move.accuracy * accMod) {
      log(`${user.name}'s attack missed!`);
      await delay(800);
      return;
    }
  }

  let dealt = 0;

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
      await inflictStatus(target, move.ailment);
    }
  }

  // --- drain / recoil ---
  if ((move.drain ?? 0) !== 0 && dealt > 0) {
    const amount = Math.max(1, Math.floor(dealt * (Math.abs(move.drain) / 100)));
    if (move.drain > 0) {
      user.currentHp = Math.min(user.totalHp, user.currentHp + amount);
      log(`${user.name} drained ${amount} HP!`);
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

  const effectiveness = typeEffectiveness(move.type, defender.types);
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
};

async function inflictStatus(target, ailment) {
  console.log("Inflicting status...")
  if (target.status) {
    log(`But ${target.name} is already ${target.status}!`);
    await delay(700);
    return;
  }
  target.status = ailment;
  if (ailment === 'sleep') target.sleepTurns = randInt(1, 3);
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

async function endOfTurnDamage(pokemon) {
  if (pokemon.currentHp <= 0) return;
  const chip = { burn: 1 / 16, poison: 1 / 8, 'bad-poison': 1 / 8 }[pokemon.status];
  if (!chip) return;
  const amount = Math.max(1, Math.floor(pokemon.totalHp * chip));
  pokemon.currentHp = Math.max(0, pokemon.currentHp - amount);
  log(`${pokemon.name} is hurt by its ${pokemon.status}!`);
  await delay(800);
}

/* ------------------------------------------------------------------ *
 * Items
 * ------------------------------------------------------------------ */

async function useBattleItem(item) {
  await battleTurn(null, item);
}

async function applyItem(item, target) {
  if (!target) return;
  // if (!inventoryStore.UseRecovery?.(item.id)) {
  //   log(`You have no ${item.label} left.`);
  //   return;
  // }

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

  if (!battleStarted.value) {
    userPokemon.value = pokemon;
    return;
  }

  userPokemon.value.stages = freshStages();
  userPokemon.value.flinched = false;

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
</style>