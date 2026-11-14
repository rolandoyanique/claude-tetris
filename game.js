'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const COLORS = [
  null,
  '#4dd0e1', // I - cyan
  '#ffd54f', // O - yellow
  '#ba68c8', // T - purple
  '#81c784', // S - green
  '#e57373', // Z - red
  '#7986cb', // J - indigo
  '#ffb74d', // L - orange
];

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
  const before = lines;
  clearLines();
  trackCombo(lines - before); // unit 2: combo y mejores marcas
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
  const color = COLORS[colorIndex];
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color;
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  // highlight
  context.fillStyle = 'rgba(255,255,255,0.12)';
  context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  context.globalAlpha = 1;
}

function drawGrid() {
  ctx.strokeStyle = '#22222e';
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
  showGameOverRecords(); // unit 2
  overlay.classList.remove('hidden');
  if (pendingScore !== null) recordsName.focus();
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
  if (!gameOver) animId = requestAnimationFrame(loop); // unit 2: no seguir tras game over
}

function init() {
  recordsOnNewGame(); // unit 2
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

// ---------------------------------------------------------------------------
// RECORDS (unit 2): top 5 local, mejor combo, máx. líneas. Clave tetris.records
// ---------------------------------------------------------------------------
const RECORDS_KEY = 'tetris.records';
const RECORDS_MAX = 5;
const RECORDS_NAME_MAX = 12;
const RECORDS_DEFAULT_NAME = 'AAA';

const startOverlay = document.getElementById('start-overlay');
const startBtn = document.getElementById('start-btn');
const startResetBtn = document.getElementById('start-reset-btn');
const startRecordsBody = document.getElementById('start-records-body');
const startBestCombo = document.getElementById('start-best-combo');
const startMaxLines = document.getElementById('start-max-lines');
const recordsEntry = document.getElementById('records-entry');
const recordsName = document.getElementById('records-name');
const recordsSaveBtn = document.getElementById('records-save-btn');
const recordsSummary = document.getElementById('records-summary');
const recordsBody = document.getElementById('records-body');
const recordsBestCombo = document.getElementById('records-best-combo');
const recordsMaxLines = document.getElementById('records-max-lines');
const recordsResetBtn = document.getElementById('records-reset-btn');

let gameStarted = false;  // false until Start is pressed (no game loop before that)
let combo = 0;            // locks seguidos que limpian >= 1 línea
let pendingScore = null;  // puntuación pendiente de guardar (null = no entra en el top 5)
let runRecorded = false;  // true once this game's score has been saved
let records = loadRecords();

function emptyRecords() {
  return { top: [], bestCombo: 0, maxLines: 0 };
}

function toCount(v) {
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
}

function loadRecords() {
  try {
    const data = JSON.parse(localStorage.getItem(RECORDS_KEY) || 'null');
    const top = Array.isArray(data?.top)
      ? data.top
          .filter(e => e && typeof e.name === 'string' && Number.isFinite(e.score))
          .map(e => ({ name: e.name.slice(0, RECORDS_NAME_MAX) || RECORDS_DEFAULT_NAME, score: e.score }))
          .sort((a, b) => b.score - a.score)
          .slice(0, RECORDS_MAX)
      : [];
    return { top, bestCombo: toCount(data?.bestCombo), maxLines: toCount(data?.maxLines) };
  } catch (err) {
    return emptyRecords(); // storage bloqueado o JSON corrupto
  }
}

function saveRecords() {
  try {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
  } catch (err) {
    // storage bloqueado: los récords quedan solo en memoria
  }
}

// Llamado en cada lock: actualiza combo y mejores marcas (se guardan al instante)
function trackCombo(clearedNow) {
  combo = clearedNow > 0 ? combo + 1 : 0;
  let changed = false;
  if (combo > records.bestCombo) { records.bestCombo = combo; changed = true; }
  if (lines > records.maxLines) { records.maxLines = lines; changed = true; }
  if (changed) saveRecords();
}

function fillRecordsTable(tbody, highlight = -1) {
  tbody.replaceChildren();
  if (records.top.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 3;
    td.className = 'records-empty';
    td.textContent = 'Sin registros todavía';
    tr.append(td);
    tbody.append(tr);
    return;
  }
  records.top.forEach((entry, i) => {
    const tr = document.createElement('tr');
    if (i === highlight) tr.className = 'records-new';
    [String(i + 1), entry.name, entry.score.toLocaleString()].forEach(text => {
      const td = document.createElement('td');
      td.textContent = text; // textContent: el nombre guardado nunca se interpreta como HTML
      tr.append(td);
    });
    tbody.append(tr);
  });
}

function renderRecordsUI(highlight = -1) {
  fillRecordsTable(startRecordsBody);
  startBestCombo.textContent = records.bestCombo;
  startMaxLines.textContent = records.maxLines;
  fillRecordsTable(recordsBody, highlight);
  recordsBestCombo.textContent = records.bestCombo;
  recordsMaxLines.textContent = records.maxLines;
}

// Llamado al terminar la partida: decide si hay que pedir nombre
function showGameOverRecords() {
  const top = records.top;
  const qualifies = score > 0 && (top.length < RECORDS_MAX || score > top[top.length - 1].score);
  pendingScore = qualifies && !runRecorded ? score : null;
  recordsEntry.classList.toggle('hidden', pendingScore === null);
  renderRecordsUI();
  recordsSummary.classList.remove('hidden');
}

function saveRecordFromForm() {
  if (pendingScore === null) return;
  const name = recordsName.value.trim().slice(0, RECORDS_NAME_MAX) || RECORDS_DEFAULT_NAME;
  const entry = { name, score: pendingScore };
  pendingScore = null;
  runRecorded = true;
  records.top = records.top.concat(entry).sort((a, b) => b.score - a.score).slice(0, RECORDS_MAX);
  saveRecords();
  recordsEntry.classList.add('hidden');
  renderRecordsUI(records.top.indexOf(entry));
}

function resetRecords() {
  if (!confirm('¿Borrar todos los récords guardados? Esta acción no se puede deshacer.')) return;
  records = emptyRecords();
  try {
    localStorage.removeItem(RECORDS_KEY);
  } catch (err) {
    // storage bloqueado: se limpia solo en memoria
  }
  // Si estamos en game over sin guardar, la puntuación vuelve a poder entrar en el top 5
  if (gameOver && !runRecorded) showGameOverRecords();
  else renderRecordsUI();
}

// Llamado al empezar o reiniciar una partida (desde init)
function recordsOnNewGame() {
  gameStarted = true;
  combo = 0;
  pendingScore = null;
  runRecorded = false;
  recordsName.value = '';
  recordsEntry.classList.add('hidden');
  recordsSummary.classList.add('hidden');
}

function startGame() {
  startOverlay.classList.add('hidden');
  init();
}

startBtn.addEventListener('click', startGame);
startResetBtn.addEventListener('click', resetRecords);
recordsResetBtn.addEventListener('click', resetRecords);
recordsSaveBtn.addEventListener('click', saveRecordFromForm);
recordsName.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); saveRecordFromForm(); }
});
// ---- fin RECORDS (unit 2) ----

document.addEventListener('keydown', e => {
  if (!gameStarted) return; // unit 2: el juego no responde hasta pulsar Empezar
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

// unit 2: no se llama a init() al cargar; el juego arranca con el botón Empezar
renderRecordsUI();
startBtn.focus();
