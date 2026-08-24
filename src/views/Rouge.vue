<script setup>
/**
 * RouteMap.vue — procedural roguelite route map (Slay the Spire style layout,
 * Pokémon-themed points of interest, Gym Leader as the final node).
 *
 * Generation follows the STS approach: N independent paths are walked upward
 * through a grid, edges are merged where paths overlap, and crossing edges are
 * rejected so the map stays readable. Node types are then assigned by weighted
 * roll with placement rules (no Center/Mart/Trainer too early, no duplicate
 * specials among siblings, fixed rows for the first battle / item / heal).
 *
 * Fully seeded — the same seed always produces the same route.
 */
import { ref, computed, onMounted, nextTick } from 'vue'
import PokemonBattle from '@/components/PokemonBattle.vue'

const props = defineProps({
  seed: { type: String, default: '' },
  rows: { type: Number, default: 15 },
  cols: { type: Number, default: 7 },
  paths: { type: Number, default: 6 }
})
const emit = defineEmits(['node-entered', 'run-complete'])

/* ---------- layout constants ---------- */
const COL_W = 88
const ROW_H = 104
const PAD = 56
const BOSS_GAP = 130

/* ---------- seeded rng ---------- */
function hashSeed (str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
function mulberry32 (a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function randomSeed () {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

/* ---------- point of interest catalogue ---------- */
const POI = {
  grass:   { label: 'Tall Grass',     blurb: 'A wild Pokémon rustles in the underbrush.', hp: -6,  money: 40 },
  trainer: { label: 'Trainer Battle', blurb: 'An Ace Trainer has spotted you. No backing out.', hp: -15, money: 180 },
  mystery: { label: 'Mystery Zone',   blurb: 'Something happens here. Nobody agrees on what.', hp: 0, money: 0 },
  center:  { label: 'Pokémon Center', blurb: 'Rest your party and top up your PP.', hp: 30, money: 0 },
  mart:    { label: 'Poké Mart',      blurb: 'Trade your winnings for supplies.', hp: 0, money: -220 },
  item:    { label: 'Item Ball',      blurb: 'Someone left this lying in the grass.', hp: 0, money: 120 },
  gym:     { label: 'Gym Leader',     blurb: 'The badge is on the other side of this battle.', hp: -28, money: 600 }
}
const SPECIAL = ['trainer', 'center', 'mart']
const WEIGHTS = [
  ['grass', 0.45], ['mystery', 0.22], ['trainer', 0.16], ['center', 0.12], ['mart', 0.05]
]

/* ---------- generation ---------- */
function generate (seedStr) {
  const rng = mulberry32(hashSeed(seedStr))
  const { rows: ROWS, cols: COLS, paths: PATHS } = props
  const ITEM_ROW = Math.floor(ROWS * 0.55)

  const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null))
  const edges = new Set()
  const key = (r, a, b) => `${r}:${a}>${b}`
  const ensure = (r, c) => {
    if (!grid[r][c]) {
      grid[r][c] = { id: `n${r}_${c}`, row: r, col: c, type: null, children: [], parents: [], x: 0, y: 0 }
    }
    return grid[r][c]
  }

  // walk each path from the bottom row upward
  let firstStart = -1
  for (let p = 0; p < PATHS; p++) {
    let start = Math.floor(rng() * COLS)
    if (p === 0) firstStart = start
    if (p === 1) while (start === firstStart) start = Math.floor(rng() * COLS)

    let cur = ensure(0, start)
    for (let r = 0; r < ROWS - 1; r++) {
      const opts = []
      for (const d of [-1, 0, 1]) {
        const nc = cur.col + d
        if (nc < 0 || nc >= COLS) continue
        // reject an edge that would cross a sibling edge going the other way
        if (d !== 0 && edges.has(key(r, nc, cur.col))) continue
        opts.push(nc)
      }
      const nc = opts[Math.floor(rng() * opts.length)]
      const next = ensure(r + 1, nc)
      edges.add(key(r, cur.col, nc))
      if (!cur.children.includes(next)) cur.children.push(next)
      if (!next.parents.includes(cur)) next.parents.push(cur)
      cur = next
    }
  }

  const all = grid.flat().filter(Boolean)

  // type assignment
  const siblings = (n) => {
    const out = new Set()
    for (const p of n.parents) for (const c of p.children) if (c !== n) out.add(c)
    for (const c of n.children) for (const p of c.parents) if (p !== n) out.add(p)
    return [...out]
  }
  const roll = () => {
    const r = rng()
    let acc = 0
    for (const [t, w] of WEIGHTS) { acc += w; if (r < acc) return t }
    return 'grass'
  }
  for (const n of all) {
    if (n.row === 0) { n.type = 'grass'; continue }          // always open on a wild battle
    if (n.row === ITEM_ROW) { n.type = 'item'; continue }    // guaranteed mid-run item
    if (n.row === ROWS - 1) { n.type = 'center'; continue }  // heal before the Gym
    let t = 'grass'
    for (let i = 0; i < 24; i++) {
      t = roll()
      if (SPECIAL.includes(t) && n.row < 4) continue               // no specials in the first stretch
      if (t === 'center' && n.row >= ROWS - 2) continue            // don't stack two heals
      if (SPECIAL.includes(t) && siblings(n).some(s => s.type === t)) continue
      break
    }
    n.type = t
  }

  // positions (row 0 sits at the bottom); jitter keeps it hand-drawn rather than gridded
  const width = PAD * 2 + (COLS - 1) * COL_W
  const height = PAD * 2 + (ROWS - 1) * ROW_H + BOSS_GAP
  for (const n of all) {
    n.x = PAD + n.col * COL_W + (rng() - 0.5) * 26
    n.y = height - PAD - n.row * ROW_H + (rng() - 0.5) * 22
  }

  const boss = {
    id: 'gym', row: ROWS, col: (COLS - 1) / 2, type: 'gym',
    children: [], parents: [], x: width / 2, y: PAD + 10
  }
  for (const n of grid[ROWS - 1]) {
    if (!n) continue
    n.children.push(boss)
    boss.parents.push(n)
  }

  return { nodes: [...all, boss], boss, width, height }
}

/* ---------- reactive state ---------- */
const seed = ref(props.seed || randomSeed())
const seedInput = ref(seed.value)
const map = ref(generate(seed.value))
const visited = ref([])
const current = ref(null)
const hp = ref(66)
const maxHp = ref(66)
const money = ref(900)
const scroller = ref(null)
const wildBattle = ref(false)

const nodes = computed(() => map.value.nodes)
const byId = computed(() => Object.fromEntries(nodes.value.map(n => [n.id, n])))
const finished = computed(() => current.value?.id === 'gym')

const reachable = computed(() => {
  if (finished.value) return new Set()
  if (!current.value) return new Set(nodes.value.filter(n => n.row === 0).map(n => n.id))
  return new Set(current.value.children.map(c => c.id))
})

const lines = computed(() => {
  const out = []
  for (const n of nodes.value) {
    for (const c of n.children) {
      const takenIdx = visited.value.indexOf(n.id)
      const taken = takenIdx > -1 && visited.value[takenIdx + 1] === c.id
      const live = current.value?.id === n.id && reachable.value.has(c.id)
      out.push({ id: `${n.id}-${c.id}`, x1: n.x, y1: n.y, x2: c.x, y2: c.y, taken, live })
    }
  }
  return out
})

function state (n) {
  if (current.value?.id === n.id) return 'current'
  if (visited.value.includes(n.id)) return 'visited'
  if (reachable.value.has(n.id)) return 'open'
  return 'locked'
}

function enter (n) {
  if (!reachable.value.has(n.id)) return
  current.value = n
  visited.value.push(n.id)
  const fx = POI[n.type]
  hp.value = Math.max(1, Math.min(maxHp.value, hp.value + fx.hp))
  money.value = Math.max(0, money.value + fx.money)
  emit('node-entered', { node: n, poi: fx })
  if(n.id === 'grass') {wildBattle.value = true}
  if (n.id === 'gym') emit('run-complete', { seed: seed.value, path: [...visited.value] })
}

function reroll (newSeed = randomSeed()) {
  seed.value = newSeed
  seedInput.value = newSeed
  map.value = generate(newSeed)
  visited.value = []
  current.value = null
  hp.value = maxHp.value
  money.value = 900
  nextTick(scrollToStart)
}
function applySeed () {
  const s = seedInput.value.trim().toUpperCase()
  if (s) reroll(s)
}
function scrollToStart () {
  if (scroller.value) scroller.value.scrollTop = scroller.value.scrollHeight
}
onMounted(scrollToStart)

/* ---------- icon glyphs ---------- */
const ICONS = {
  grass:   '<path d="M12 21c0-5 1.4-8.4 4.6-11.4M12 21c0-4.4-1.4-7.6-4.6-10.4M12 21v-8.6"/>',
  trainer: '<path d="M5 4.5l9.5 11M19 4.5L9.5 15.5M4 17.5l3.2 3M20 17.5l-3.2 3"/>',
  mystery: '<path d="M9.2 9.2a2.9 2.9 0 1 1 3.6 2.8c-.6.2-.9.8-.9 1.5v.6"/><circle cx="11.9" cy="17.6" r=".2"/>',
  center:  '<path d="M12 5.5v13M5.5 12h13"/>',
  mart:    '<path d="M5.4 8.4h13.2l-1.1 11H6.5z"/><path d="M9.2 8.4V6.6a2.8 2.8 0 0 1 5.6 0v1.8"/>',
  item:    '<circle cx="12" cy="12" r="7.6"/><path d="M4.4 12h15.2"/><circle cx="12" cy="12" r="2.3"/>',
  gym:     '<circle cx="12" cy="12" r="8.2"/><path d="M12 6.6l1.7 3.5 3.8.5-2.8 2.7.7 3.8L12 15.3l-3.4 1.8.7-3.8-2.8-2.7 3.8-.5z"/>'
}

const legend = ['grass', 'trainer', 'mystery', 'item', 'center', 'mart', 'gym']
const hpPct = computed(() => Math.round((hp.value / maxHp.value) * 100))
</script>

<template>
  <div class="route">
    <!-- run status -->
    <header class="hud">
      <div class="hud__who">
        <span class="hud__name">Route 0</span>
        <span class="hud__sub">badgeless</span>
      </div>

      <div class="hud__stat">
        <span class="hud__label">HP</span>
        <span class="hud__value" :class="{ 'is-low': hpPct < 34 }">{{ hp }}<i>/{{ maxHp }}</i></span>
        <div class="meter"><div class="meter__fill" :style="{ width: hpPct + '%' }" /></div>
      </div>

      <div class="hud__stat">
        <span class="hud__label">Funds</span>
        <span class="hud__value">₽{{ money.toLocaleString() }}</span>
      </div>

      <div class="hud__stat">
        <span class="hud__label">Cleared</span>
        <span class="hud__value">{{ visited.length }}<i>/{{ rows + 1 }}</i></span>
      </div>

      <div class="hud__seed">
        <input v-model="seedInput" class="seedbox" spellcheck="false" aria-label="Route seed"
               @keyup.enter="applySeed">
        <button class="btn" @click="applySeed">Load seed</button>
        <button class="btn btn--solid" @click="reroll()">New route</button>
      </div>
    </header>

    <div class="body">
      <!-- the map -->
      <div ref="scroller" class="scroller">
        <div class="paper" :style="{ width: map.width + 'px', height: map.height + 'px' }">
          <svg class="wires" :viewBox="`0 0 ${map.width} ${map.height}`" aria-hidden="true">
            <line v-for="l in lines" :key="l.id"
                  :x1="l.x1" :y1="l.y1" :x2="l.x2" :y2="l.y2"
                  class="wire" :class="{ 'wire--taken': l.taken, 'wire--live': l.live }" />
          </svg>

          <button v-for="n in nodes" :key="n.id"
                  class="poi" :class="[`poi--${n.type}`, `is-${state(n)}`, { 'poi--gym': n.type === 'gym' }]"
                  :style="{ left: n.x + 'px', top: n.y + 'px' }"
                  :disabled="!reachable.has(n.id)"
                  :aria-label="`${POI[n.type].label}, floor ${n.row + 1}`"
                  @click="enter(n)">
            <svg class="poi__glyph" viewBox="0 0 24 24" v-html="ICONS[n.type]" />
            <span class="poi__tip">
              <b>{{ POI[n.type].label }}</b>
              <em>{{ POI[n.type].blurb }}</em>
            </span>
          </button>

          <p class="paper__foot">Floor 1 — start here</p>
        </div>
      </div>

      <!-- key -->
      <aside class="key">
        <h2 class="key__title">Route key</h2>
        <ul class="key__list">
          <li v-for="t in legend" :key="t" class="key__row">
            <span class="key__icon" :class="`poi--${t}`">
              <svg viewBox="0 0 24 24" v-html="ICONS[t]" />
            </span>
            <span>
              <b>{{ POI[t].label }}</b>
              <em>{{ POI[t].blurb }}</em>
            </span>
          </li>
        </ul>

        <p v-if="finished" class="key__note key__note--win">
          Badge earned. Load a new route to run it again.
        </p>
        <p v-else-if="!current" class="key__note">
          Pick any node on the bottom row to set off. Once you commit to a branch you can only move upward.
        </p>
        <p v-else class="key__note">
          At <b>{{ POI[current.type].label }}</b>. {{ reachable.size }} way{{ reachable.size === 1 ? '' : 's' }} forward.
        </p>
      </aside>
    </div>
  </div>

  <PokemonBattle v-if="wildBattle">

  </PokemonBattle>
</template>

<style scoped>
.route {
  /* falls back cleanly if the PrimeVue theme vars aren't present */
  --paper: #cbc4a8;
  --paper-dim: #b7af92;
  --ink: #2b333c;
  --ink-soft: #6a7180;
  --badge: var(--p-primary-color, #d8a52c);
  --trail: #a8482e;
  --shell: var(--p-content-background, #171b20);
  --shell-line: var(--p-content-border-color, #2c333c);

  font-family: ui-sans-serif, "Segoe UI", Roboto, system-ui, sans-serif;
  color: var(--p-text-color, #e6e3da);
  background: var(--shell);
  border-radius: 10px;
  overflow: hidden;
}

/* ---- hud ---- */
.hud {
  display: flex; align-items: center; gap: 1.75rem; flex-wrap: wrap;
  padding: .7rem 1.1rem;
  background: linear-gradient(180deg, #20262e, #171c22);
  border-bottom: 1px solid var(--shell-line);
}
.hud__who { display: flex; align-items: baseline; gap: .5rem; }
.hud__name { font-size: 1.15rem; font-weight: 700; letter-spacing: .01em; }
.hud__sub { font-size: .78rem; color: var(--ink-soft); font-style: italic; }
.hud__stat { display: grid; grid-template-columns: auto auto; gap: 0 .5rem; align-items: baseline; }
.hud__label {
  font-size: .66rem; text-transform: uppercase; letter-spacing: .14em; color: var(--ink-soft);
}
.hud__value { font-variant-numeric: tabular-nums; font-weight: 600; font-size: .95rem; }
.hud__value i { font-style: normal; color: var(--ink-soft); font-weight: 400; }
.hud__value.is-low { color: #d4553e; }
.meter {
  grid-column: 1 / -1; height: 3px; width: 92px; margin-top: .25rem;
  background: #333b45; border-radius: 2px; overflow: hidden;
}
.meter__fill { height: 100%; background: var(--badge); transition: width .25s ease; }
.hud__seed { margin-left: auto; display: flex; gap: .4rem; }
.seedbox {
  width: 9.5rem; padding: .38rem .6rem; letter-spacing: .09em; font-size: .78rem;
  font-family: ui-monospace, "SF Mono", Menlo, monospace; text-transform: uppercase;
  color: inherit; background: #10141a; border: 1px solid var(--shell-line); border-radius: 5px;
}
.btn {
  padding: .38rem .75rem; font-size: .78rem; border-radius: 5px; cursor: pointer;
  color: inherit; background: transparent; border: 1px solid var(--shell-line);
}
.btn:hover { border-color: var(--badge); color: var(--badge); }
.btn--solid { background: var(--badge); border-color: var(--badge); color: #1b1207; font-weight: 600; }
.btn--solid:hover { filter: brightness(1.08); color: #1b1207; }

/* ---- layout ---- */
.body { display: flex; align-items: stretch; gap: 0; }
.scroller { flex: 1; overflow: auto; max-height: 78vh; padding: 2rem 1rem; display: flex; justify-content: center; }

/* ---- paper ---- */
.paper {
  position: relative; flex: none;
  background:
    radial-gradient(120% 60% at 50% 0%, rgba(255,255,255,.12), transparent 60%),
    linear-gradient(175deg, var(--paper), var(--paper-dim));
  box-shadow: 0 18px 44px rgba(0,0,0,.55);
  border-radius: 3px;
}
.paper::before,
.paper::after {
  content: ""; position: absolute; left: 0; right: 0; height: 16px;
  background: repeating-linear-gradient(90deg, var(--paper-dim) 0 9px, transparent 9px 18px);
  -webkit-mask-image: linear-gradient(180deg, #000, transparent);
  mask-image: linear-gradient(180deg, #000, transparent);
}
.paper::before { top: 0; }
.paper::after { bottom: 0; transform: scaleY(-1); }
.paper__foot {
  position: absolute; bottom: 14px; left: 0; right: 0; margin: 0; text-align: center;
  font-size: .68rem; letter-spacing: .18em; text-transform: uppercase; color: rgba(43,51,60,.5);
}
.wires { position: absolute; inset: 0; width: 100%; height: 100%; }
.wire {
  stroke: rgba(43,51,60,.45); stroke-width: 2; stroke-dasharray: 5 7; stroke-linecap: round;
}
.wire--live { stroke: var(--trail); stroke-width: 2.4; opacity: .85; }
.wire--taken { stroke: var(--trail); stroke-width: 3; stroke-dasharray: none; }

/* ---- nodes ---- */
.poi {
  position: absolute; transform: translate(-50%, -50%);
  width: 40px; height: 40px; padding: 0; display: grid; place-items: center;
  background: transparent; border: 0; cursor: pointer; color: var(--ink);
}
.poi__glyph {
  width: 26px; height: 26px; fill: none; stroke: currentColor;
  stroke-width: 1.9; stroke-linecap: round; stroke-linejoin: round;
  transition: transform .15s ease;
}
.poi.is-locked { color: rgba(43,51,60,.42); cursor: default; }
.poi.is-visited { color: var(--trail); }
.poi.is-open {
  color: var(--ink);
  filter: drop-shadow(0 0 7px rgba(216,165,44,.9));
  animation: pulse 1.9s ease-in-out infinite;
}
.poi.is-open:hover .poi__glyph,
.poi.is-open:focus-visible .poi__glyph { transform: scale(1.22); }
.poi.is-current { color: var(--trail); }
.poi.is-current::before {
  content: ""; position: absolute; inset: -3px; border-radius: 50%;
  border: 2px solid var(--trail);
}
.poi:focus-visible { outline: 2px solid var(--badge); outline-offset: 3px; border-radius: 50%; }
.poi--gym { width: 62px; height: 62px; }
.poi--gym .poi__glyph { width: 44px; height: 44px; stroke-width: 1.5; }
.poi--gym.is-locked { color: rgba(43,51,60,.6); }
@keyframes pulse { 50% { filter: drop-shadow(0 0 2px rgba(216,165,44,.35)); } }

/* tooltip */
.poi__tip {
  position: absolute; left: 50%; bottom: calc(100% + 8px); transform: translateX(-50%);
  width: 168px; padding: .45rem .55rem; border-radius: 4px; z-index: 5;
  background: #10141a; border: 1px solid var(--shell-line); color: #e6e3da;
  opacity: 0; pointer-events: none; transition: opacity .12s ease;
}
.poi:hover .poi__tip, .poi:focus-visible .poi__tip { opacity: 1; }
.poi__tip b { display: block; font-size: .8rem; }
.poi__tip em { display: block; margin-top: .15rem; font-size: .7rem; color: var(--ink-soft); font-style: normal; }

/* ---- key ---- */
.key {
  flex: none; width: 264px; padding: 1.4rem 1.2rem;
  border-left: 1px solid var(--shell-line); background: #12161c;
}
.key__title {
  margin: 0 0 1rem; font-size: .7rem; letter-spacing: .18em; text-transform: uppercase; color: var(--ink-soft);
}
.key__list { list-style: none; margin: 0; padding: 0; display: grid; gap: .8rem; }
.key__row { display: flex; gap: .65rem; align-items: flex-start; font-size: .82rem; }
.key__icon {
  flex: none; width: 26px; height: 26px; display: grid; place-items: center;
  border-radius: 50%; background: var(--paper); color: var(--ink);
}
.key__icon svg { width: 17px; height: 17px; fill: none; stroke: currentColor; stroke-width: 1.9; stroke-linecap: round; stroke-linejoin: round; }
.key__row em { display: block; font-style: normal; font-size: .72rem; color: var(--ink-soft); margin-top: .1rem; }
.key__note {
  margin: 1.4rem 0 0; padding-top: 1rem; border-top: 1px solid var(--shell-line);
  font-size: .78rem; line-height: 1.5; color: var(--ink-soft);
}
.key__note--win { color: var(--badge); }

@media (max-width: 900px) {
  .body { flex-direction: column; }
  .key { width: auto; border-left: 0; border-top: 1px solid var(--shell-line); }
  .hud__seed { margin-left: 0; width: 100%; }
}
@media (prefers-reduced-motion: reduce) {
  .poi.is-open { animation: none; }
  .poi__glyph, .meter__fill { transition: none; }
}
</style>