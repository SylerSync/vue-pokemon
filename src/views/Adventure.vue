<template>
  <div class="game-container">
    <!-- Main Canvas Viewport -->
    <canvas ref="canvasRef"></canvas>

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
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import mapData from '@/assets/data/mapData/map1.json';

const canvasRef = ref(null);

// Modal UI State Controls
const isBattleModalOpen = ref(false);
const isDoorwayModalOpen = ref(false);
const activeBuildingName = ref('');

// Map dimensions
const tileSize = mapData.tilewidth; // 16px
const mapWidth = mapData.width;     // 60 tiles
const mapHeight = mapData.height;   // 60 tiles

// Viewport Camera Settings
const viewportWidth = 15 * tileSize;  
const viewportHeight = 15 * tileSize; 
const zoomScale = 2.8;

// Player starting position
const player = ref({ 
  x: Math.floor(mapWidth / 2), 
  y: Math.floor(mapHeight / 2) 
});

const moveSpeedPerSec = 3.2; // Smooth movement speed in tiles/sec

// Cache structure & state
const tileImages = {};
const keysPressed = {};
let animationFrameId = null;
let lastFrameTime = performance.now();

// Collision & Special Tile Tracking
const treeTileGids = new Set();
const waterTileGids = new Set();
const buildingTileGids = new Set();
const grassTileGids = new Set();
const buildingBoxes = [];

// Discrete Tile Event States
let isCurrentlyOnDoorway = false;
let currentGridTile = { 
  x: Math.floor(player.value.x), 
  y: Math.floor(player.value.y) 
};
const ENCOUNTER_CHANCE = 0.10; 

// Reset all input states when opening modals to prevent stuck keypresses
function clearInputs() {
  Object.keys(keysPressed).forEach((key) => {
    keysPressed[key] = false;
  });
}

function openBattleModal() {
  clearInputs();
  isBattleModalOpen.value = true;
  console.log('⚡ [WILD ENCOUNTER TRIGGERED!] Battle Modal opened.');
}

function openDoorwayModal(buildingName) {
  clearInputs();
  activeBuildingName.value = buildingName;
  isDoorwayModalOpen.value = true;
  console.log(`🚪 [DOORWAY CONTACT] Prompting entrance for ${buildingName}.`);
}

function closeModals() {
  isBattleModalOpen.value = false;
  isDoorwayModalOpen.value = false;
  clearInputs();
}

function enterBuilding() {
  console.log(`Loading interior map for ${activeBuildingName.value}...`);
  closeModals();
}

async function loadTileImages() {
  const promises = [];

  mapData.tilesets.forEach((tileset) => {
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

        if (fileName === 'Trees.png') treeTileGids.add(globalId);
        if (fileName === 'Water.png') waterTileGids.add(globalId);
        if (fileName === 'TallGrass.png') grassTileGids.add(globalId);

        const buildingFiles = ['Gym.png', 'EliteFour.png', 'PokeCenter.png', 'PokeMart.png'];
        if (buildingFiles.includes(fileName)) buildingTileGids.add(globalId);

        tileImages[globalId] = {
          img,
          fileName,
          width: tile.imagewidth || img.naturalWidth || tileSize,
          height: tile.imageheight || img.naturalHeight || tileSize
        };
      });

      promises.push(promise);
    });
  });

  await Promise.all(promises);

  mapData.layers.forEach((layer) => {
    if (layer.type === 'tilelayer' && layer.visible) {
      layer.data.forEach((tileId, index) => {
        if (buildingTileGids.has(tileId)) {
          const tileData = tileImages[tileId];
          if (!tileData) return;

          const wTiles = Math.round(tileData.width / tileSize);
          const hTiles = Math.round(tileData.height / tileSize);

          const anchorX = index % mapWidth;
          const anchorY = Math.floor(index / mapWidth);

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

// Continuous Game Engine Loop
function gameLoop(currentTime) {
  const deltaTime = (currentTime - lastFrameTime) / 1000;
  lastFrameTime = currentTime;

  // ONLY update movement if no modal overlay is currently active
  if (!isBattleModalOpen.value && !isDoorwayModalOpen.value) {
    updatePlayerPosition(Math.min(deltaTime, 0.1));
  }

  drawMap(); // Keep background rendered smoothly
  animationFrameId = requestAnimationFrame(gameLoop);
}

function isSolidTile(tileX, tileY) {
  const floorX = Math.floor(tileX);
  const floorY = Math.floor(tileY);

  if (floorX < 0 || floorX >= mapWidth || floorY < 0 || floorY >= mapHeight) {
    return true;
  }

  for (const layer of mapData.layers) {
    if (layer.type === 'tilelayer' && layer.visible) {
      const tileIndex = floorY * mapWidth + floorX;
      const tileId = layer.data[tileIndex];
      if (treeTileGids.has(tileId) || waterTileGids.has(tileId)) {
        return true;
      }
    }
  }

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
  for (const layer of mapData.layers) {
    if (layer.type === 'tilelayer' && layer.visible) {
      const tileIndex = tileY * mapWidth + tileX;
      const tileId = layer.data[tileIndex];
      if (grassTileGids.has(tileId)) return true;
    }
  }
  return false;
}

function handleNewTileStep(tileX, tileY) {
  // 1. Doorway Contact
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

  // 2. Tall Grass Encounter Roll
  if (isGrassTile(tileX, tileY)) {
    if (Math.random() < ENCOUNTER_CHANCE) {
      openBattleModal();
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

  // Horizontal Collision
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

  // Vertical Collision
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

  const playerPixelX = player.value.x * tileSize;
  const playerPixelY = player.value.y * tileSize;

  const cameraX = Math.max(0, Math.min(mapWidth * tileSize - viewportWidth, playerPixelX - viewportWidth / 2));
  const cameraY = Math.max(0, Math.min(mapHeight * tileSize - viewportHeight, playerPixelY - viewportHeight / 2));

  ctx.save();
  
  ctx.scale(zoomScale, zoomScale);
  ctx.translate(-cameraX, -cameraY);

  // 1. Draw Map Tile Layers
  mapData.layers.forEach((layer) => {
    if (layer.type === 'tilelayer' && layer.visible) {
      layer.data.forEach((tileId, index) => {
        if (tileId === 0) return;

        const tileData = tileImages[tileId];
        if (!tileData || !tileData.img.complete || tileData.img.naturalWidth === 0) return;

        const tileX = (index % mapWidth) * tileSize;
        const tileY = Math.floor(index / mapWidth) * tileSize;

        const drawY = tileY - (tileData.height - tileSize);

        if (
          tileX + tileData.width >= cameraX &&
          tileX <= cameraX + viewportWidth &&
          drawY + tileData.height >= cameraY &&
          drawY <= cameraY + viewportHeight
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

  // 2. Draw Player Character
  ctx.fillStyle = '#e74c3c';
  ctx.fillRect(playerPixelX + 2, playerPixelY + 2, tileSize - 4, tileSize - 4);

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.strokeRect(playerPixelX + 2, playerPixelY + 2, tileSize - 4, tileSize - 4);

  ctx.restore();
}

function handleKeyDown(event) {
  // Ignore controls if a modal is open
  if (isBattleModalOpen.value || isDoorwayModalOpen.value) return;

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

  const canvas = canvasRef.value;
  if (!canvas) return;

  canvas.width = viewportWidth * zoomScale;
  canvas.height = viewportHeight * zoomScale;

  await loadTileImages();

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
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #111;
  width: 100vw;
  height: 70vh;
  margin: 0;
  padding: 0;
  overflow: hidden;
  box-sizing: border-box;
}

canvas {
  image-rendering: pixelated;
  border: 3px solid #444;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.8);
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
}

/* Modal Overlay Styling */
.modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
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
  min-width: 280px;
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