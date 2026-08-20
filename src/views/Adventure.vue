<template>
  <div class="game-container">
    <!-- Centered Viewport Container matching canvas bounds -->
    <div class="viewport-wrapper">
      <canvas ref="canvasRef"></canvas>

      <!-- HUD Menu Button -->
      <button class="hud-menu-btn" @click="toggleMenu">
        ☰ Menu
      </button>

      <!-- Main RPG Menu Overlay -->
      <div v-if="isMenuOpen" class="menu-overlay" @click.self="toggleMenu">
        <div class="menu-card">
          <div class="menu-header">
            <h2>Pause Menu</h2>
            <button class="close-btn" @click="toggleMenu">✕</button>
          </div>

          <ul class="menu-list">
            <li @click="selectMenuOption('Party')">
              <span class="icon">🐾</span>
              <span>Party</span>
            </li>
            <li @click="selectMenuOption('Bag')">
              <span class="icon">🎒</span>
              <span>Bag</span>
            </li>
            <li @click="selectMenuOption('Save')">
              <span class="icon">💾</span>
              <span>Save</span>
            </li>
            <li @click="toggleMenu">
              <span class="icon">❌</span>
              <span>Close</span>
            </li>
          </ul>
        </div>
      </div>

      <!-- Overlay Modal for Wild Pokémon Battles -->
      <div v-if="isBattleModalOpen" class="modal-overlay">
        <div class="modal-card">
          <h2>⚡ Wild Pokémon Encounter!</h2>
          <p>A wild Pokémon appeared in the tall grass!</p>
          <button class="modal-btn" @click="closeModals">Run / Close</button>
        </div>
      </div>

      <!-- Overlay Modal for Doorway Transitions -->
      <div v-if="isDoorwayModalOpen" class="modal-overlay">
        <div class="modal-card">
          <h2>🚪 Entering {{ activeBuildingName }}</h2>
          <p>Would you like to step inside?</p>

          <div class="modal-actions">
            <button class="modal-btn primary" @click="enterBuilding">Enter</button>
            <button class="modal-btn secondary" @click="closeModals">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';

// Import Maps
import overworldMap from '@/assets/data/mapData/map1.json';
import pokeMartMap from '@/assets/data/mapData/PokeMart.json';
import pokeCenterMap from '@/assets/data/mapData/PokeCenter.json';

const canvasRef = ref(null);

// Dynamic Map State
const activeMapData = ref(overworldMap);
const activeMapName = ref('overworld');
const outdoorReturnPosition = ref({ x: 0, y: 0 });

// Reactive Map Dimensions
const tileSize = computed(() => activeMapData.value.tilewidth);
const mapWidth = computed(() => activeMapData.value.width);
const mapHeight = computed(() => activeMapData.value.height);

// Viewport Camera Settings
const viewportWidth = computed(() => 15 * tileSize.value);  
const viewportHeight = computed(() => 15 * tileSize.value); 
const zoomScale = 2.8;

// Menu & Modal UI State Controls
const isMenuOpen = ref(false);
const isBattleModalOpen = ref(false);
const isDoorwayModalOpen = ref(false);
const activeBuildingName = ref('');

// Player starting position
const player = ref({ 
  x: Math.floor(overworldMap.width / 2), 
  y: Math.floor(overworldMap.height / 2) 
});

const moveSpeedPerSec = 3.2; 

// Cache structure & state
const tileImages = {};
const keysPressed = {};
let animationFrameId = null;
let lastFrameTime = performance.now();

// Dynamic Collision & Special Tile Sets
const treeTileGids = new Set();
const waterTileGids = new Set();
const buildingTileGids = new Set();
const grassTileGids = new Set();
const interiorSolidGids = new Set(); 

// Individual Feature GID Sets for Interactions
const martCounterGids = new Set();
const centerCounterGids = new Set();
const pokeBoxPcGids = new Set();

const buildingBoxes = [];

// Discrete Tile Event States
let isCurrentlyOnDoorway = false;
let currentGridTile = { 
  x: Math.floor(player.value.x), 
  y: Math.floor(player.value.y) 
};
const ENCOUNTER_CHANCE = 0.10; 

// Placeholder Interaction Callbacks
function onPokeMartCounterContact() {
  console.log('🛍️ [INTERACTION EVENT] Contacted PokéMart Counter!');
  // TODO: Trigger Shop UI
}

function onPokeCenterCounterContact() {
  console.log('🏥 [INTERACTION EVENT] Contacted Pokémon Center Counter!');
  // TODO: Trigger Nurse Joy Healing Dialogue / UI
}

function onPokeBoxPcContact() {
  console.log('💻 [INTERACTION EVENT] Contacted Pokémon Box PC!');
  // TODO: Trigger PC Storage Box UI
}

function clearInputs() {
  Object.keys(keysPressed).forEach((key) => {
    keysPressed[key] = false;
  });
}

function toggleMenu() {
  clearInputs();
  isMenuOpen.value = !isMenuOpen.value;
}

function selectMenuOption(option) {
  console.log(`[Menu Selected]: ${option}`);
}

function openBattleModal() {
  clearInputs();
  isBattleModalOpen.value = true;
}

function openDoorwayModal(buildingName) {
  clearInputs();
  activeBuildingName.value = buildingName;
  isDoorwayModalOpen.value = true;
}

function closeModals() {
  isBattleModalOpen.value = false;
  isDoorwayModalOpen.value = false;
  clearInputs();
}

// Master Map Swapping Function
async function loadMap(newMapData, mapName, spawnX, spawnY) {
  clearInputs();

  // 1. Reset dynamic collision sets for the new map
  treeTileGids.clear();
  waterTileGids.clear();
  buildingTileGids.clear();
  grassTileGids.clear();
  interiorSolidGids.clear();
  martCounterGids.clear();
  centerCounterGids.clear();
  pokeBoxPcGids.clear();
  buildingBoxes.length = 0;

  // 2. Assign active map data
  activeMapData.value = newMapData;
  activeMapName.value = mapName;

  // 3. Preload tilesets and recalculate colliders for this map
  await loadTileImages();

  // 4. Update canvas size and set player position
  const canvas = canvasRef.value;
  if (canvas) {
    canvas.width = viewportWidth.value * zoomScale;
    canvas.height = viewportHeight.value * zoomScale;
  }

  player.value = { x: spawnX, y: spawnY };
  currentGridTile = { x: Math.floor(spawnX), y: Math.floor(spawnY) };
}

function enterBuilding() {
  outdoorReturnPosition.value = { ...player.value };

  if (activeBuildingName.value === 'PokeMart') {
    const spawnX = Math.floor(pokeMartMap.width / 2);
    const spawnY = pokeMartMap.height - 2;
    loadMap(pokeMartMap, 'PokeMart', spawnX, spawnY);
  } else if (activeBuildingName.value === 'PokeCenter') {
    const spawnX = Math.floor(pokeCenterMap.width / 2);
    const spawnY = pokeCenterMap.height - 2;
    loadMap(pokeCenterMap, 'PokeCenter', spawnX, spawnY);
  }

  closeModals();
}

function exitBuilding() {
  loadMap(
    overworldMap, 
    'overworld', 
    outdoorReturnPosition.value.x, 
    outdoorReturnPosition.value.y + 1
  );
}

async function loadTileImages() {
  const promises = [];

  activeMapData.value.tilesets.forEach((tileset) => {
    tileset.tiles?.forEach((tile) => {
      const promise = new Promise((resolve) => {
        const fileName = tile.image.split('/').pop().trim();

        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => {
          console.error(`[Load Error] Check file name: /MapTiles/${fileName}`);
          resolve();
        };

        img.src = `/MapTiles/${fileName}`;

        const globalId = tileset.firstgid + tile.id;

        // Overworld Colliders
        if (fileName === 'Trees.png') treeTileGids.add(globalId);
        if (fileName === 'Water.png') waterTileGids.add(globalId);
        if (fileName === 'TallGrass.png') grassTileGids.add(globalId);

        // General Interior Colliders
        if (fileName === 'PokeMartShelves.png') {
          interiorSolidGids.add(globalId);
        }

        // Specific Interactive Feature Registration
        if (fileName === 'PokeMartCounter.png') {
          martCounterGids.add(globalId);
          interiorSolidGids.add(globalId);
        }

        if (fileName === 'PokeCenterCounter.png') {
          centerCounterGids.add(globalId);
          interiorSolidGids.add(globalId);
        }

        if (fileName === 'PokeBoxPC.png') {
          pokeBoxPcGids.add(globalId);
          interiorSolidGids.add(globalId);
        }

        const buildingFiles = ['Gym.png', 'EliteFour.png', 'PokeCenter.png', 'PokeMart.png'];
        if (buildingFiles.includes(fileName)) buildingTileGids.add(globalId);

        tileImages[globalId] = {
          img,
          fileName,
          width: tile.imagewidth || img.naturalWidth || tileSize.value,
          height: tile.imageheight || img.naturalHeight || tileSize.value
        };
      });

      promises.push(promise);
    });
  });

  await Promise.all(promises);

  // Scan building bounding boxes for overworld maps
  activeMapData.value.layers.forEach((layer) => {
    if (layer.type === 'tilelayer' && layer.visible) {
      layer.data.forEach((tileId, index) => {
        if (buildingTileGids.has(tileId)) {
          const tileData = tileImages[tileId];
          if (!tileData) return;

          const wTiles = Math.round(tileData.width / tileSize.value);
          const hTiles = Math.round(tileData.height / tileSize.value);

          const anchorX = index % mapWidth.value;
          const anchorY = Math.floor(index / mapWidth.value);

          const leftX = anchorX;
          const topY = anchorY - (hTiles - 1);

          buildingBoxes.push({
            name: tileData.fileName.replace('.png', ''),
            leftX,
            topY,
            wTiles,
            hTiles,
            bottomY: anchorY
          });
        }
      });
    }
  });
}

function gameLoop(currentTime) {
  const deltaTime = (currentTime - lastFrameTime) / 1000;
  lastFrameTime = currentTime;

  if (!isMenuOpen.value && !isBattleModalOpen.value && !isDoorwayModalOpen.value) {
    updatePlayerPosition(Math.min(deltaTime, 0.1));
  }

  drawMap(); 
  animationFrameId = requestAnimationFrame(gameLoop);
}

// Check adjacent neighbor tiles for interactive features
function checkAdjacentInteractions(tileX, tileY) {
  const adjacentOffsets = [
    { x: 0, y: -1 }, // North
    { x: 0, y: 1 },  // South
    { x: -1, y: 0 }, // West
    { x: 1, y: 0 }   // East
  ];

  for (const layer of activeMapData.value.layers) {
    if (layer.type === 'tilelayer' && layer.visible) {
      for (const offset of adjacentOffsets) {
        const checkX = tileX + offset.x;
        const checkY = tileY + offset.y;

        if (checkX >= 0 && checkX < mapWidth.value && checkY >= 0 && checkY < mapHeight.value) {
          const tileIndex = checkY * mapWidth.value + checkX;
          const tileId = layer.data[tileIndex];

          if (martCounterGids.has(tileId)) {
            onPokeMartCounterContact();
            return;
          }
          if (centerCounterGids.has(tileId)) {
            onPokeCenterCounterContact();
            return;
          }
          if (pokeBoxPcGids.has(tileId)) {
            onPokeBoxPcContact();
            return;
          }
        }
      }
    }
  }
}

function isSolidTile(tileX, tileY) {
  const floorX = Math.floor(tileX);
  const floorY = Math.floor(tileY);

  if (floorX < 0 || floorX >= mapWidth.value || floorY < 0 || floorY >= mapHeight.value) {
    return true;
  }

  for (const layer of activeMapData.value.layers) {
    if (layer.type === 'tilelayer' && layer.visible) {
      const tileIndex = floorY * mapWidth.value + floorX;
      const tileId = layer.data[tileIndex];

      // Check solid environmental objects
      if (treeTileGids.has(tileId) || waterTileGids.has(tileId) || interiorSolidGids.has(tileId)) {
        return true;
      }
    }
  }

  // Overworld Building Bounding Box Check
  for (const b of buildingBoxes) {
    if (
      floorX >= b.leftX &&
      floorX < b.leftX + b.wTiles &&
      floorY >= b.topY &&
      floorY < b.topY + b.hTiles
    ) {
      if (floorY === b.bottomY) return false;
      return true;
    }
  }

  return false;
}

function isGrassTile(tileX, tileY) {
  for (const layer of activeMapData.value.layers) {
    if (layer.type === 'tilelayer' && layer.visible) {
      const tileIndex = tileY * mapWidth.value + tileX;
      const tileId = layer.data[tileIndex];
      if (grassTileGids.has(tileId)) return true;
    }
  }
  return false;
}

function handleNewTileStep(tileX, tileY) {
  if (activeMapName.value !== 'overworld') {
    // Check adjacent tiles for interactive counter/PC triggers
    checkAdjacentInteractions(tileX, tileY);

    // Interior Exit Check: Step on bottom row to return outside
    if (tileY >= mapHeight.value - 1) {
      exitBuilding();
      return;
    }
  } else {
    // Overworld Doorway Contact
    const activeDoor = buildingBoxes.find(
      (b) => tileX >= b.leftX && tileX < b.leftX + b.wTiles && tileY === b.bottomY
    );

    if (activeDoor) {
      if (!isCurrentlyOnDoorway) {
        isCurrentlyOnDoorway = true;
        openDoorwayModal(activeDoor.name);
      }
    } else {
      isCurrentlyOnDoorway = false;
    }

    // Tall Grass Encounter Roll
    if (isGrassTile(tileX, tileY)) {
      if (Math.random() < ENCOUNTER_CHANCE) {
        openBattleModal();
      }
    }
  }
}

function updatePlayerPosition(deltaTime) {
  let dx = 0;
  let dy = 0;

  if (keysPressed['ArrowUp'] || keysPressed['w'] || keysPressed['W']) dy -= 1;
  if (keysPressed['ArrowDown'] || keysPressed['s'] || keysPressed['S']) dy += 1;
  if (keysPressed['ArrowLeft'] || keysPressed['a'] || keysPressed['A']) dx -= 1;
  if (keysPressed['ArrowRight'] || keysPressed['d'] || keysPressed['D']) dx += 1;

  if (dx === 0 && dy === 0) return;

  if (dx !== 0 && dy !== 0) {
    dx *= 0.7071;
    dy *= 0.7071;
  }

  const step = moveSpeedPerSec * deltaTime;
  const moveX = dx * step;
  const moveY = dy * step;

  const margin = 0.2;

  if (moveX !== 0) {
    const nextX = player.value.x + moveX;
    const targetTileY1 = player.value.y + margin;
    const targetTileY2 = player.value.y + 1 - margin;

    if (moveX > 0) {
      const targetTileX = nextX + 1 - margin;
      if (!isSolidTile(targetTileX, targetTileY1) && !isSolidTile(targetTileX, targetTileY2)) {
        player.value.x = nextX;
      }
    } else {
      const targetTileX = nextX + margin;
      if (!isSolidTile(targetTileX, targetTileY1) && !isSolidTile(targetTileX, targetTileY2)) {
        player.value.x = nextX;
      }
    }
  }

  if (moveY !== 0) {
    const nextY = player.value.y + moveY;
    const targetTileX1 = player.value.x + margin;
    const targetTileX2 = player.value.x + 1 - margin;

    if (moveY > 0) {
      const targetTileY = nextY + 1 - margin;
      if (!isSolidTile(targetTileX1, targetTileY) && !isSolidTile(targetTileX2, targetTileY)) {
        player.value.y = nextY;
      }
    } else {
      const targetTileY = nextY + margin;
      if (!isSolidTile(targetTileX1, targetTileY) && !isSolidTile(targetTileX2, targetTileY)) {
        player.value.y = nextY;
      }
    }
  }

  const newGridX = Math.floor(player.value.x + 0.5);
  const newGridY = Math.floor(player.value.y + 0.5);

  if (newGridX !== currentGridTile.x || newGridY !== currentGridTile.y) {
    currentGridTile = { x: newGridX, y: newGridY };
    handleNewTileStep(newGridX, newGridY);
  }
}

function drawMap() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const playerPixelX = player.value.x * tileSize.value;
  const playerPixelY = player.value.y * tileSize.value;

  const cameraX = Math.max(0, Math.min(mapWidth.value * tileSize.value - viewportWidth.value, playerPixelX - viewportWidth.value / 2));
  const cameraY = Math.max(0, Math.min(mapHeight.value * tileSize.value - viewportHeight.value, playerPixelY - viewportHeight.value / 2));

  ctx.save();
  
  ctx.scale(zoomScale, zoomScale);
  ctx.translate(-cameraX, -cameraY);

  activeMapData.value.layers.forEach((layer) => {
    if (layer.type === 'tilelayer' && layer.visible) {
      layer.data.forEach((tileId, index) => {
        if (tileId === 0) return;

        const tileData = tileImages[tileId];
        if (!tileData || !tileData.img.complete || tileData.img.naturalWidth === 0) return;

        const tileX = (index % mapWidth.value) * tileSize.value;
        const tileY = Math.floor(index / mapWidth.value) * tileSize.value;

        const drawY = tileY - (tileData.height - tileSize.value);

        if (
          tileX + tileData.width >= cameraX &&
          tileX <= cameraX + viewportWidth.value &&
          drawY + tileData.height >= cameraY &&
          drawY <= cameraY + viewportHeight.value
        ) {
          ctx.drawImage(
            tileData.img, 
            tileX, 
            drawY, 
            tileData.width + 0.5, 
            tileData.height + 0.5
          );
        }
      });
    }
  });

  // Draw Player Character
  ctx.fillStyle = '#e74c3c';
  ctx.fillRect(playerPixelX + 2, playerPixelY + 2, tileSize.value - 4, tileSize.value - 4);

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.strokeRect(playerPixelX + 2, playerPixelY + 2, tileSize.value - 4, tileSize.value - 4);

  ctx.restore();
}

function handleKeyDown(event) {
  if (isMenuOpen.value || isBattleModalOpen.value || isDoorwayModalOpen.value) return;

  const keysToDisableScroll = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '];
  if (keysToDisableScroll.includes(event.key)) {
    event.preventDefault();
  }

  keysPressed[event.key] = true;
}

function handleKeyUp(event) {
  keysPressed[event.key] = false;
}

onMounted(async () => {
  await nextTick();

  // Initialize overworld map
  await loadMap(
    overworldMap, 
    'overworld', 
    Math.floor(overworldMap.width / 2), 
    Math.floor(overworldMap.height / 2)
  );

  window.addEventListener('keydown', handleKeyDown, { capture: true });
  window.addEventListener('keyup', handleKeyUp, { capture: true });
  window.addEventListener('blur', clearInputs);

  lastFrameTime = performance.now();
  animationFrameId = requestAnimationFrame(gameLoop);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown, { capture: true });
  window.removeEventListener('keyup', handleKeyUp, { capture: true });
  window.removeEventListener('blur', clearInputs);

  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
});
</script>

<style scoped>
.game-container {
  display: flex;
  justify-content: center;
  align-items: center;
  background: #111;
  width: 100vw;
  height: 80vh;
  margin: 0;
  padding: 0;
  overflow: hidden;
  box-sizing: border-box;
}

.viewport-wrapper {
  position: relative;
  display: inline-block;
  max-width: 90vw;
  max-height: 90vh;
}

canvas {
  display: block;
  image-rendering: pixelated;
  border: 3px solid #444;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.8);
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
}

.hud-menu-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 50;
  background: #2c3e50;
  color: #fff;
  border: 2px solid #ecf0f1;
  padding: 6px 12px;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4);
}

.hud-menu-btn:hover {
  background: #34495e;
}

.menu-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  justify-content: flex-end;
  align-items: flex-start;
  padding: 50px 12px 12px 12px;
  z-index: 90;
  box-sizing: border-box;
}

.menu-card {
  background: #2b2b2b;
  border: 3px solid #e74c3c;
  border-radius: 8px;
  width: 160px;
  padding: 12px;
  box-shadow: 0 8px 20px rgba(0,0,0,0.7);
}

.menu-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid #444;
  padding-bottom: 6px;
  margin-bottom: 10px;
}

.menu-header h2 {
  margin: 0;
  font-size: 1rem;
  color: #f1c40f;
}

.close-btn {
  background: none;
  border: none;
  color: #aaa;
  font-size: 1rem;
  cursor: pointer;
}

.menu-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.menu-list li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 4px;
  color: #fff;
  font-size: 0.9rem;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.15s;
}

.menu-list li:hover {
  background: #333;
  color: #f1c40f;
}

.menu-list .icon {
  font-size: 1rem;
}

.modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
  backdrop-filter: blur(2px);
}

.modal-card {
  background: #222;
  border: 2px solid #555;
  border-radius: 8px;
  padding: 24px 32px;
  color: #fff;
  text-align: center;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
  min-width: 240px;
}

.modal-card h2 {
  margin-top: 0;
  color: #f1c40f;
  font-size: 1.25rem;
}

.modal-card p {
  color: #ccc;
  margin-bottom: 20px;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.modal-btn {
  background: #e74c3c;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.2s;
}

.modal-btn.primary {
  background: #2ecc71;
}

.modal-btn.secondary {
  background: #7f8c8d;
}

.modal-btn:hover {
  opacity: 0.9;
}
</style>

<style>
html, body {
  margin: 0;
  padding: 0;
  overflow: hidden;
  background-color: #111;
}
</style>