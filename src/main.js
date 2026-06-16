// ============================================================
// 小闹游戏盒 — 主入口
// ============================================================

import './style.css';
import { IMG_FILES, IMG_PATH } from './config.js';
import { state, SWIPE_THRESHOLD } from './state.js';
import { playClick, playBGM, stopBGM, toggleBGM, isBGMOn } from './audio.js';
import { ClassicGame } from './game/classic.js';
import { Match3Game } from './game/match3.js';
import { NumberElimGame } from './game/numberElim.js';
import { setupCanvas, render, gameLoop, getBlockAt } from './ui/render.js';
import { resetPowerups, updateToolbar, usePowerup, powerupState } from './powerups.js';
import {
  openPhotos, handlePhotoUpload, confirmCrop,
  openRedeem, redeemCode, closeOverlay
} from './photos.js';

// --- Image loading ---
export function loadImages(callback) {
  if (state.images.length > 0) { callback(); return; }
  state.images = [];
  state.loadedImageCount = 0;

  IMG_FILES.forEach((file, idx) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      state.loadedImageCount++;
      if (state.loadedImageCount === IMG_FILES.length) callback();
    };
    img.onerror = () => {
      const c = document.createElement('canvas');
      c.width = 100; c.height = 100;
      const cx = c.getContext('2d');
      const hue = (idx * 36) % 360;
      cx.fillStyle = `hsl(${hue},70%,75%)`;
      cx.beginPath();
      cx.roundRect(8, 8, 84, 84, 12);
      cx.fill();
      cx.fillStyle = 'white';
      cx.font = '40px Arial';
      cx.textAlign = 'center';
      cx.textBaseline = 'middle';
      cx.fillText(String(idx + 1), 50, 50);
      img.src = '';
      state.images[idx] = c;
      state.loadedImageCount++;
      if (state.loadedImageCount === IMG_FILES.length) callback();
    };
    img.src = IMG_PATH + file;
    state.images[idx] = img;
  });
}

// --- Screen switching ---
export function switchScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// --- UI mode helpers ---
function _syncBgmBtn() {
  const on = isBGMOn();
  const btn = document.getElementById('bgmBtn');
  if (btn) btn.textContent = on ? '🎵' : '🔇';
  const menuBtn = document.getElementById('menuBgmBtn');
  if (menuBtn) menuBtn.textContent = on ? '🎵' : '🔇';
}

function _setupElimModeUI() {
  document.getElementById('gameArea').style.display = '';
  document.getElementById('gameAreaDom').style.display = 'none';
  document.getElementById('gameToolbar').style.display = '';
  document.getElementById('gameExtraBar').style.display = '';
  document.getElementById('hintBtn').style.display = 'none';
  document.getElementById('scoreSubDisplay').textContent = '';
  _syncBgmBtn();
}

function _setupDomModeUI() {
  document.getElementById('gameArea').style.display = 'none';
  document.getElementById('gameAreaDom').style.display = '';
  // 数字消除也显示工具栏（洗牌等道具）和兑换码入口
  document.getElementById('gameToolbar').style.display = '';
  document.getElementById('gameExtraBar').style.display = '';
  document.getElementById('hintBtn').style.display = '';
  document.getElementById('scoreSubDisplay').textContent = '';
  _syncBgmBtn();
  updateToolbar();
}

// --- Game start (消除类) ---
export function startClassicMode() {
  playClick();
  resetPowerups();
  loadImages(() => {
    state.mode = 'classic';
    state.game = new ClassicGame();
    document.getElementById('modeBadge').textContent = '🖇️ 经典连连看';
    _setupElimModeUI();
    switchScreen('gameScreen');
    setupCanvas();
    updateToolbar();
    playBGM('classic');
    render();
    if (state.animFrameId) cancelAnimationFrame(state.animFrameId);
    gameLoop();
  });
}

export function startMatch3Mode() {
  playClick();
  resetPowerups();
  loadImages(() => {
    state.mode = 'match3';
    state.game = new Match3Game();
    state.game._resultShown = false;
    document.getElementById('modeBadge').textContent = '🌈 开心消消乐';
    _setupElimModeUI();
    switchScreen('gameScreen');
    setupCanvas();
    updateToolbar();
    playBGM('match3');
    render();
    if (state.animFrameId) cancelAnimationFrame(state.animFrameId);
    gameLoop();
  });
}

// --- 数字消除 ---
export function startNumberElimMode() {
  playClick();
  resetPowerups();
  state.mode = 'numberElim';
  state.game = new NumberElimGame();
  document.getElementById('modeBadge').textContent = '🔢 数字消除';
  _setupDomModeUI();
  switchScreen('gameScreen');
  playBGM('numberElim');
}

export function nextLevel() {
  closeOverlay('resultOverlay');
  if (state.game.mode === 'numberElim') {
    state.game.destroy();
    state.game = new NumberElimGame();
    _setupDomModeUI();
    return;
  }
  const oldLevel = state.game.level + 1;
  if (state.game.mode === 'classic') {
    state.game = new ClassicGame();
    state.game.level = oldLevel;
  } else {
    state.game = new Match3Game();
    state.game.level = oldLevel;
    state.game.targetScore = 2000 + oldLevel * 500;
    state.game._resultShown = false;
  }
  setupCanvas();
  render();
}

export function retryLevel() {
  closeOverlay('resultOverlay');
  if (state.game.mode === 'numberElim') {
    state.game.destroy();
    state.game = new NumberElimGame();
    _setupDomModeUI();
    return;
  }
  if (state.game.mode === 'classic') {
    const lv = state.game.level;
    state.game = new ClassicGame();
    state.game.level = lv;
  } else {
    const lv = state.game.level;
    state.game = new Match3Game();
    state.game.level = lv;
    state.game.targetScore = 2000 + lv * 500;
    state.game._resultShown = false;
  }
  setupCanvas();
  render();
}

export function backToMenu() {
  playClick();
  stopBGM();
  playBGM('menu');
  if (state.animFrameId) cancelAnimationFrame(state.animFrameId);
  closeOverlay('resultOverlay');
  closeOverlay('photoOverlay');
  closeOverlay('redeemOverlay');

  // Destroy DOM-based game if active
  if (state.game && typeof state.game.destroy === 'function') {
    state.game.destroy();
  }

  state.game = null;
  state.particles = [];
  state.floatTexts = [];
  state.fallingBlocks = [];
  state.swapAnimation = null;
  state.mode = null;
  document.getElementById('frozenOverlay').classList.remove('active');
  switchScreen('menuScreen');
  _syncBgmBtn();
}

// --- Canvas interaction ---
function getCanvasCoords(e) {
  const rect = state.canvas.getBoundingClientRect();
  const scaleX = state.canvasW / rect.width;
  const scaleY = state.canvasH / rect.height;
  let clientX, clientY;
  if (e.touches) {
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
  } else {
    clientX = e.clientX;
    clientY = e.clientY;
  }
  return {
    px: (clientX - rect.left) * scaleX,
    py: (clientY - rect.top) * scaleY,
    clientX, clientY
  };
}

function handleCanvasClick(e) {
  if (!state.game || state.game.mode === 'numberElim') return;
  const { px, py } = getCanvasCoords(e);
  if (e.touches) e.preventDefault();

  const pos = getBlockAt(state.game, px, py);
  if (!pos) return;

  if (state.pendingBombTarget) {
    state.pendingBombTarget = false;
    const result = state.game.useBomb(pos.row, pos.col);
    if (result === true) powerupState.bomb--;
    updateToolbar();
    render();
    return;
  }

  state.game.selectBlock(pos.row, pos.col);
}

function handleTouchStart(e) {
  if (!state.game || state.game.mode !== 'match3') return;
  if (state.game.frozen || state.game.isAnimating) return;
  const { px, py } = getCanvasCoords(e);
  const pos = getBlockAt(state.game, px, py);
  if (!pos) return;
  const val = state.game.board[pos.row] && state.game.board[pos.row][pos.col];
  if (!val || val === 0 || val === null) return;
  state.touchStartPos = { x: px, y: py, row: pos.row, col: pos.col, val };
  state.dragTarget = null;
}

function handleTouchMove(e) {
  if (!state.touchStartPos || !state.game || state.game.mode !== 'match3') return;
  if (e.cancelable) e.preventDefault();
  const { px, py } = getCanvasCoords(e);
  const dx = px - state.touchStartPos.x;
  const dy = py - state.touchStartPos.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < SWIPE_THRESHOLD) return;

  let dr = 0, dc = 0;
  if (Math.abs(dx) > Math.abs(dy)) {
    dc = dx > 0 ? 1 : -1;
  } else {
    dr = dy > 0 ? 1 : -1;
  }

  const tr = state.touchStartPos.row + dr;
  const tc = state.touchStartPos.col + dc;
  if (tr < 0 || tr >= state.game.rows || tc < 0 || tc >= state.game.cols) return;
  state.dragTarget = { row: tr, col: tc };
  render();
}

function handleTouchEnd() {
  if (!state.touchStartPos) return;
  if (state.dragTarget && state.game && state.game.mode === 'match3') {
    state.game.swapAndCheck(
      state.touchStartPos.row, state.touchStartPos.col,
      state.dragTarget.row, state.dragTarget.col
    );
  }
  state.touchStartPos = null;
  state.dragTarget = null;
}

// --- Hint / BGM toggle ---
function handleHintBtn() {
  if (!state.game) return;
  if (state.game.mode === 'numberElim') {
    state.game.showHint();
  } else {
    usePowerup('hint');
  }
}

function handleToggleBGM() {
  const on = toggleBGM();
  const btn = document.getElementById('bgmBtn');
  if (btn) btn.textContent = on ? '🎵' : '🔇';
  const menuBtn = document.getElementById('menuBgmBtn');
  if (menuBtn) menuBtn.textContent = on ? '🎵' : '🔇';
  if (on) {
    const m = state.mode;
    if (m === 'classic') playBGM('classic');
    else if (m === 'match3') playBGM('match3');
    else if (m === 'numberElim') playBGM('numberElim');
    else playBGM('menu');
  }
}

function handleMenuBGM() {
  const on = toggleBGM();
  const menuBtn = document.getElementById('menuBgmBtn');
  if (menuBtn) menuBtn.textContent = on ? '🎵' : '🔇';
  if (on) playBGM('menu');
}

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
  state.canvas = document.getElementById('gameCanvas');
  state.ctx = state.canvas.getContext('2d');
  loadImages(() => {});

  state.canvas.addEventListener('click', handleCanvasClick);
  state.canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  state.canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
  state.canvas.addEventListener('touchend', handleTouchEnd);

  document.addEventListener('touchmove', (e) => {
    if (e.target.closest('.overlay-card')) return;
  }, { passive: true });

  // 首次交互后播放菜单 BGM
  const _startMenuBGM = () => {
    playBGM('menu');
    document.removeEventListener('click', _startMenuBGM);
    document.removeEventListener('touchstart', _startMenuBGM);
  };
  document.addEventListener('click', _startMenuBGM);
  document.addEventListener('touchstart', _startMenuBGM);
});

// Expose globals for HTML onclick attributes
window.startClassicMode = startClassicMode;
window.startMatch3Mode = startMatch3Mode;
window.startNumberElimMode = startNumberElimMode;
window.nextLevel = nextLevel;
window.retryLevel = retryLevel;
window.backToMenu = backToMenu;
window.openPhotos = openPhotos;
window.openRedeem = openRedeem;
window.redeemCode = redeemCode;
window.closeOverlay = closeOverlay;
window.handlePhotoUpload = handlePhotoUpload;
window.confirmCrop = confirmCrop;
window.useHint = handleHintBtn;
window.toggleBGM = handleToggleBGM;
window.toggleMenuBGM = handleMenuBGM;

console.log('🎮 小闹游戏盒 v2.0 已加载！');
console.log('🎀 兑换码: 豆豆爱闹闹');
