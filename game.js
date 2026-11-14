'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
];

const LINE_SCORES = [0, 100, 300, 500, 800];

// ---------------------------------------------------------------------------
// Skins (temas visuales)
// Cada skin define: paleta por tipo de pieza (índice 1-7), color de rejilla,
// variables CSS de la interfaz y una función de dibujo de bloque propia.
// Para añadir una skin basta con añadir una entrada aquí.
// ---------------------------------------------------------------------------

// Retro: bloques cuadrados y colores planos (estilo original).
function drawRetroBlock(ctx, x, y, color, size, alpha) {
  const px = x * size + 1, py = y * size + 1, s = size - 2;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(px, py, s, s);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(px, py, s, 4);
  ctx.globalAlpha = 1;
}

// Neon: relleno tenue + contorno brillante con shadowBlur (glow).
function drawNeonBlock(ctx, x, y, color, size, alpha) {
  const px = x * size + 1, py = y * size + 1, s = size - 2;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha * 0.15;
  ctx.fillRect(px, py, s, s);
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.shadowColor = color;
  ctx.shadowBlur = 14;
  ctx.strokeRect(px + 1, py + 1, s - 2, s - 2);
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

// Pastel: esquinas redondeadas (simuladas con arcTo), sombra suave y borde interior claro.
function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawPastelBlock(ctx, x, y, color, size, alpha) {
  const px = x * size + 1, py = y * size + 1, s = size - 2;
  ctx.globalAlpha = alpha;
  // sombra inferior
  ctx.fillStyle = 'rgba(90,70,100,0.15)';
  roundRectPath(ctx, px, py + 2, s, s, 7);
  ctx.fill();
  // cuerpo
  ctx.fillStyle = color;
  roundRectPath(ctx, px, py, s, s, 7);
  ctx.fill();
  // borde interior claro
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 2;
  roundRectPath(ctx, px + 2, py + 2, s - 4, s - 4, 5);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

// Pixel art: textura de tablero de ajedrez de 4 px + biseles claro/oscuro.
function drawPixelBlock(ctx, x, y, color, size, alpha) {
  const px = x * size + 1, py = y * size + 1, s = size - 2, cell = 4;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(px, py, s, s);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  for (let j = 0; j < s; j += cell)
    for (let i = 0; i < s; i += cell)
      if (((i + j) / cell) % 2 === 0) ctx.fillRect(px + i, py + j, cell, cell);
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillRect(px, py, s, 2);
  ctx.fillRect(px, py, 2, s);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(px, py + s - 2, s, 2);
  ctx.fillRect(px + s - 2, py, 2, s);
  ctx.globalAlpha = 1;
}

const SKINS = {
  retro: {
    label: 'Retro',
    colors: [null, '#4dd0e1', '#ffd54f', '#ba68c8', '#81c784', '#e57373', '#7986cb', '#ffb74d'],
    grid: '#22222e',
    drawBlock: drawRetroBlock,
    theme: {
      '--page-bg': '#0f0f17', '--board-bg': '#1a1a25', '--board-border': '#2a2a3a',
      '--text': '#e0e0e0', '--muted': '#555570', '--accent': '#7aa2f7', '--accent-hover': '#9bbdff',
      '--danger': '#e57373', '--kbd-bg': '#22223a', '--kbd-border': '#3a3a5a', '--kbd-text': '#aaaaaa',
      '--controls': '#888888', '--overlay': 'rgba(10,10,20,0.75)', '--button-text': '#0f0f17',
    },
  },
  neon: {
    label: 'Neon',
    colors: [null, '#00f0ff', '#fff200', '#ff00ff', '#39ff14', '#ff073a', '#3d5afe', '#ff8c00'],
    grid: '#14141f',
    drawBlock: drawNeonBlock,
    theme: {
      '--page-bg': '#000000', '--board-bg': '#000000', '--board-border': '#00f0ff',
      '--text': '#d8faff', '--muted': '#2a6a75', '--accent': '#00f0ff', '--accent-hover': '#7ffbff',
      '--danger': '#ff073a', '--kbd-bg': '#000000', '--kbd-border': '#ff00ff', '--kbd-text': '#ff88ff',
      '--controls': '#4a9aa5', '--overlay': 'rgba(0,0,0,0.85)', '--button-text': '#000000',
    },
  },
  pastel: {
    label: 'Pastel',
    colors: [null, '#a8e6cf', '#ffd3b6', '#c3b1e1', '#b5ead7', '#ffaaa5', '#a0c4ff', '#ffdfa3'],
    grid: '#f3e6dd',
    drawBlock: drawPastelBlock,
    theme: {
      '--page-bg': '#fdf4ef', '--board-bg': '#fffaf6', '--board-border': '#f0d9cc',
      '--text': '#5a4a5e', '--muted': '#a898ab', '--accent': '#9d8ec9', '--accent-hover': '#b3a6dc',
      '--danger': '#ef8a9a', '--kbd-bg': '#ffffff', '--kbd-border': '#e8d5e0', '--kbd-text': '#7a6a7e',
      '--controls': '#8a7a8e', '--overlay': 'rgba(253,244,239,0.85)', '--button-text': '#ffffff',
    },
  },
  pixel: {
    label: 'Pixel art',
    colors: [null, '#2ec4b6', '#ffbf69', '#9b5de5', '#70e000', '#f15bb5', '#4361ee', '#ff7f11'],
    grid: '#2c3050',
    drawBlock: drawPixelBlock,
    theme: {
      '--page-bg': '#1b1d2b', '--board-bg': '#22263a', '--board-border': '#4a4f73',
      '--text': '#e8e8f0', '--muted': '#6b7196', '--accent': '#ffd166', '--accent-hover': '#ffe39a',
      '--danger': '#ef476f', '--kbd-bg': '#2c3050', '--kbd-border': '#4a4f73', '--kbd-text': '#cccccc',
      '--controls': '#8a90b8', '--overlay': 'rgba(20,22,35,0.8)', '--button-text': '#1b1d2b',
    },
  },
};

const SKIN_STORAGE_KEY = 'tetris-skin';
const DEFAULT_SKIN = 'retro';

let currentSkinKey = DEFAULT_SKIN;
let COLORS = SKINS[DEFAULT_SKIN].colors;
let skinDrawBlock = SKINS[DEFAULT_SKIN].drawBlock;
let skinGrid = SKINS[DEFAULT_SKIN].grid;

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart-btn');
const skinSelect = document.getElementById('skin-select');

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId;

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function randomPiece() {
  const type = Math.floor(Math.random() * 7) + 1;
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function collide(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function tryRotate() {
  const rotated = rotateCW(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      return;
    }
  }
}

function merge() {
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  if (cleared) {
    lines += cleared;
    score += (LINE_SCORES[cleared] || 0) * level;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    updateHUD();
  }
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  const gy = ghostY();
  score += (gy - current.y) * 2;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

function lockPiece() {
  merge();
  clearLines();
  spawn();
}

function spawn() {
  current = next;
  next = randomPiece();
  if (collide(current.shape, current.x, current.y)) {
    endGame();
  }
  drawNext();
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
}

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  skinDrawBlock(context, x, y, COLORS[colorIndex], size, alpha ?? 1);
}

function applySkin(key) {
  const skin = SKINS[key] ? key : DEFAULT_SKIN;
  currentSkinKey = skin;
  COLORS = SKINS[skin].colors;
  skinDrawBlock = SKINS[skin].drawBlock;
  skinGrid = SKINS[skin].grid;

  const root = document.documentElement.style;
  for (const [prop, value] of Object.entries(SKINS[skin].theme)) root.setProperty(prop, value);
  document.body.dataset.skin = skin;
  skinSelect.value = skin;
}

function setSkin(key) {
  applySkin(key);
  try { localStorage.setItem(SKIN_STORAGE_KEY, currentSkinKey); } catch (_) { /* almacenamiento no disponible */ }
  // Redibujar al instante (si el bucle está pausado o en game over no se redibuja solo).
  if (current && next) {
    draw();
    drawNext();
  }
}

function loadSkinPreference() {
  try { return localStorage.getItem(SKIN_STORAGE_KEY); } catch (_) { return null; }
}

function drawGrid() {
  ctx.strokeStyle = skinGrid;
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  // board
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, c, r, board[r][c], BLOCK);

  // ghost
  const gy = ghostY();
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

  // current piece
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
}

function drawNext() {
  const NB = 30;
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  const shape = next.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB);
}

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  overlay.classList.remove('hidden');
}

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  if (!paused) {
    lastTime = performance.now();
    loop(lastTime);
  } else {
    cancelAnimationFrame(animId);
    overlayTitle.textContent = 'PAUSA';
    overlayScore.textContent = '';
    overlay.classList.remove('hidden');
  }
}

function loop(ts) {
  const dt = ts - lastTime;
  lastTime = ts;
  dropAccum += dt;
  if (dropAccum >= dropInterval) {
    dropAccum = 0;
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
    } else {
      lockPiece();
    }
  }
  draw();
  animId = requestAnimationFrame(loop);
}

function init() {
  board = createBoard();
  score = 0;
  lines = 0;
  level = 1;
  paused = false;
  gameOver = false;
  dropInterval = 1000;
  dropAccum = 0;
  lastTime = performance.now();
  next = randomPiece();
  spawn();
  updateHUD();
  overlay.classList.add('hidden');
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  if (e.code === 'KeyP') { togglePause(); return; }
  if (paused || gameOver) return;
  switch (e.code) {
    case 'ArrowLeft':
      if (!collide(current.shape, current.x - 1, current.y)) current.x--;
      break;
    case 'ArrowRight':
      if (!collide(current.shape, current.x + 1, current.y)) current.x++;
      break;
    case 'ArrowDown':
      softDrop();
      break;
    case 'ArrowUp':
    case 'KeyX':
      tryRotate();
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
  }
  updateHUD();
});

restartBtn.addEventListener('click', init);

skinSelect.addEventListener('change', e => {
  setSkin(e.target.value);
  // Quitar el foco del <select> para que las flechas y Espacio sigan controlando la pieza.
  e.target.blur();
});

applySkin(loadSkinPreference() || DEFAULT_SKIN);
init();
