// ============================================================
// 画布渲染系统
// ============================================================

import { CONFIG, MACARON_COLORS } from '../config.js';
import { state } from '../state.js';

// --- Canvas setup ---
export function setupCanvas() {
  state.canvas = document.getElementById('gameCanvas');
  state.ctx = state.canvas.getContext('2d');
  resizeCanvas();
  window.removeEventListener('resize', resizeCanvas);
  window.addEventListener('resize', resizeCanvas);
}

export function resizeCanvas() {
  if (!state.game || state.game.mode === 'numberElim') return;
  const area = document.getElementById('gameArea');
  const pad = window.innerWidth < 500 ? 4 : 16; // 手机上减少内边距
  const maxW = area.clientWidth - pad;
  const maxH = area.clientHeight - pad;

  const game = state.game;
  let cols = game.cols, rows = game.rows;
  let bs = CONFIG[game.mode].blockSize;

  const idealW = cols * bs + 4;
  const idealH = rows * bs + 4;
  // 手机端允许放大到填充屏幕
  const scale = Math.min(maxW / idealW, maxH / idealH);
  bs = Math.floor(bs * scale);
  state.canvasW = cols * bs + 4;
  state.canvasH = rows * bs + 4;

  const dpr = window.devicePixelRatio || 1;
  state.canvas.width = state.canvasW * dpr;
  state.canvas.height = state.canvasH * dpr;
  state.canvas.style.width = state.canvasW + 'px';
  state.canvas.style.height = state.canvasH + 'px';
  state.ctx.scale(dpr, dpr);

  game.blockSize = bs;
  game.offsetX = 2;
  game.offsetY = 2;
}

// --- Helper functions ---
export function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

export function getBlockPos(game, row, col) {
  const bs = game.blockSize;
  return {
    x: game.offsetX + col * bs,
    y: game.offsetY + row * bs
  };
}

export function getBlockAt(game, px, py) {
  const bs = game.blockSize;
  const col = Math.floor((px - game.offsetX) / bs);
  const row = Math.floor((py - game.offsetY) / bs);
  if (row >= 0 && row < game.rows && col >= 0 && col < game.cols) return { row, col };
  return null;
}

// --- 方块缓存：预渲染每种类型到离屏 canvas（DPR 感知保证清晰度）---
const _blockCache = {};
function _buildBlockCache(blockTypeIdx, srcImg, bs) {
  const dpr = window.devicePixelRatio || 1;
  const key = `${blockTypeIdx}_${bs}_${dpr}`;
  if (_blockCache[key]) return _blockCache[key];

  const px = Math.round(bs * dpr);
  const c = document.createElement('canvas');
  c.width = px; c.height = px;
  const cx = c.getContext('2d');
  cx.scale(dpr, dpr);

  const pad = 2;
  const r = bs * 0.2;
  const innerSize = bs - pad * 2;

  // 圆角裁剪 + 贴图
  cx.beginPath();
  cx.roundRect(pad, pad, innerSize, innerSize, r);
  cx.clip();
  if (srcImg instanceof HTMLImageElement || srcImg instanceof HTMLCanvasElement) {
    cx.drawImage(srcImg, pad, pad, innerSize, innerSize);
  }

  // 马卡龙边框
  const macaronColor = MACARON_COLORS[blockTypeIdx % MACARON_COLORS.length];
  cx.strokeStyle = macaronColor;
  cx.lineWidth = 2.5;
  cx.beginPath();
  cx.roundRect(pad, pad, innerSize, innerSize, r);
  cx.stroke();

  _blockCache[key] = c;
  return c;
}

// --- Draw a single block ---
function drawBlock(ctx, game, row, col, highlight) {
  const block = game.board[row] && game.board[row][col];
  if (!block || block === 0) return;
  const bs = game.blockSize;
  const pos = getBlockPos(game, row, col);
  const x = pos.x, y = pos.y;
  const pad = 2;
  const r = bs * 0.2;

  // Special block
  if (typeof block === 'object' && block.type === 'special') {
    const grad = ctx.createRadialGradient(x + bs / 2, y + bs / 2, 0, x + bs / 2, y + bs / 2, bs);
    grad.addColorStop(0, '#FFD700');
    grad.addColorStop(0.5, '#FF69B4');
    grad.addColorStop(1, '#FF1493');
    ctx.fillStyle = grad;
    drawRoundedRect(ctx, x + pad, y + pad, bs - pad * 2, bs - pad * 2, r);
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.font = `${bs * 0.45}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const icons = { line_h: '↔️', line_v: '↕️', bomb: '💥', rainbow: '🌈' };
    ctx.fillText(icons[block.specialType] || '⭐', x + bs / 2, y + bs / 2);
    return;
  }

  const imgIdx = typeof block === 'object' ? block.idx : block - 1;
  const srcImg = state.customImages[imgIdx] || state.images[imgIdx];
  if (!srcImg) return;

  // 用缓存直接贴图（指定目标尺寸，匹配 DPR 缩放）
  const cached = _buildBlockCache(imgIdx, srcImg, bs);
  ctx.drawImage(cached, x, y, bs, bs);

  // 高亮环（仅选中的方块才画）
  if (highlight) {
    const pulse = 0.7 + 0.3 * Math.sin(Date.now() / 200);
    ctx.save();
    ctx.shadowColor = `rgba(255,215,0,${0.4 * pulse})`;
    ctx.shadowBlur = 8 + 6 * pulse;
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3;
    drawRoundedRect(ctx, x + pad, y + pad, bs - pad * 2, bs - pad * 2, r);
    ctx.stroke();
    ctx.restore();
  }
}

// --- Draw block at arbitrary position (for swap/fall animations) ---
function drawBlockAt(ctx, game, x, y, block) {
  if (!block || block === 0) return;
  const bs = game.blockSize;
  const pad = 2;
  const r = bs * 0.2;

  if (typeof block === 'object' && block.type === 'special') {
    const grad = ctx.createRadialGradient(x + bs / 2, y + bs / 2, 0, x + bs / 2, y + bs / 2, bs);
    grad.addColorStop(0, '#FFD700');
    grad.addColorStop(0.5, '#FF69B4');
    grad.addColorStop(1, '#FF1493');
    ctx.fillStyle = grad;
    drawRoundedRect(ctx, x + pad, y + pad, bs - pad * 2, bs - pad * 2, r);
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.font = `${bs * 0.45}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const icons = { line_h: '↔️', line_v: '↕️', bomb: '💥', rainbow: '🌈' };
    ctx.fillText(icons[block.specialType] || '⭐', x + bs / 2, y + bs / 2);
    return;
  }

  const imgIdx = typeof block === 'object' ? block.idx : block - 1;
  const srcImg = state.customImages[imgIdx] || state.images[imgIdx];
  if (!srcImg) return;

  // 用缓存贴图（动画帧也用缓存，保持清晰度）
  const cached = _buildBlockCache(imgIdx, srcImg, bs);
  ctx.drawImage(cached, x, y, bs, bs);
}

// --- Drag indicator ---
function drawDragIndicator() {
  if (!state.dragTarget || !state.ctx) return;
  const game = state.game;
  const bs = game.blockSize;
  const pos1 = getBlockPos(game, state.touchStartPos.row, state.touchStartPos.col);
  const pos2 = getBlockPos(game, state.dragTarget.row, state.dragTarget.col);
  const ctx = state.ctx;

  ctx.save();
  ctx.strokeStyle = 'rgba(255,105,180,0.6)';
  ctx.lineWidth = 3;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(pos1.x + bs / 2, pos1.y + bs / 2);
  ctx.lineTo(pos2.x + bs / 2, pos2.y + bs / 2);
  ctx.stroke();
  ctx.setLineDash([]);

  const angle = Math.atan2(pos2.y - pos1.y, pos2.x - pos1.x);
  const headLen = 10;
  ctx.fillStyle = 'rgba(255,105,180,0.6)';
  ctx.beginPath();
  ctx.moveTo(pos2.x + bs / 2, pos2.y + bs / 2);
  ctx.lineTo(pos2.x + bs / 2 - headLen * Math.cos(angle - 0.5), pos2.y + bs / 2 - headLen * Math.sin(angle - 0.5));
  ctx.lineTo(pos2.x + bs / 2 - headLen * Math.cos(angle + 0.5), pos2.y + bs / 2 - headLen * Math.sin(angle + 0.5));
  ctx.closePath();
  ctx.fill();

  ctx.shadowColor = '#FF69B4';
  ctx.shadowBlur = 12;
  ctx.strokeStyle = '#FF69B4';
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, pos2.x + 1, pos2.y + 1, bs - 2, bs - 2, bs * 0.2);
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.restore();
}

// --- Main render function ---
export function render() {
  const game = state.game;
  const ctx = state.ctx;
  if (!game || !ctx || game.mode === 'numberElim') return;

  ctx.save();

  // Clear
  ctx.fillStyle = '#FFF5F9';
  ctx.fillRect(0, 0, state.canvasW, state.canvasH);

  // Board background
  const bs = game.blockSize;
  for (let r = 0; r < game.rows; r++) {
    for (let c = 0; c < game.cols; c++) {
      const x = game.offsetX + c * bs;
      const y = game.offsetY + r * bs;
      ctx.fillStyle = (r + c) % 2 === 0 ? 'rgba(255,182,193,0.15)' : 'rgba(255,105,180,0.08)';
      ctx.beginPath();
      ctx.roundRect(x, y, bs, bs, 4);
      ctx.fill();
    }
  }

  // Draw blocks (skip swap animation blocks)
  let skipSwapDraw = null;
  if (state.swapAnimation) {
    const sa = state.swapAnimation;
    skipSwapDraw = { r1: sa.r1, c1: sa.c1, r2: sa.r2, c2: sa.c2 };
  }

  for (let r = 0; r < game.rows; r++) {
    for (let c = 0; c < game.cols; c++) {
      const block = game.board[r] && game.board[r][c];
      if (!block || block === 0) continue;

      if (skipSwapDraw) {
        if ((r === skipSwapDraw.r1 && c === skipSwapDraw.c1) ||
            (r === skipSwapDraw.r2 && c === skipSwapDraw.c2)) continue;
      }

      let highlight = false;
      let isHint = false;

      if (game.selected && game.selected.row === r && game.selected.col === c) {
        highlight = true;
      }
      if (game.hintPair) {
        if ((game.hintPair[0].row === r && game.hintPair[0].col === c) ||
            (game.hintPair[1] && game.hintPair[1].row === r && game.hintPair[1].col === c)) {
          isHint = true;
        }
      }

      drawBlock(ctx, game, r, c, highlight);

      if (isHint) {
        const pos = getBlockPos(game, r, c);
        ctx.save();
        ctx.shadowColor = 'rgba(255,215,0,0.8)';
        ctx.shadowBlur = 15;
        ctx.strokeStyle = 'rgba(255,215,0,0.6)';
        ctx.lineWidth = 3;
        drawRoundedRect(ctx, pos.x + 2, pos.y + 2, bs - 4, bs - 4, bs * 0.2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,215,0,0.3)';
        ctx.fill();
        ctx.restore();
      }

      // Magnifier overlay
      if (game.magnifier && game.findAllPairs) {
        const allPairs = game.findAllPairs();
        const highlighted = new Set();
        for (const [a, b] of allPairs) {
          highlighted.add(`${a.row},${a.col}`);
          highlighted.add(`${b.row},${b.col}`);
        }
        for (let r2 = 0; r2 < game.rows; r2++) {
          for (let c2 = 0; c2 < game.cols; c2++) {
            if (highlighted.has(`${r2},${c2}`)) {
              const pos = getBlockPos(game, r2, c2);
              ctx.save();
              const pulse = 0.3 + 0.2 * Math.sin(Date.now() / 300);
              ctx.strokeStyle = `rgba(0,255,200,${0.5 + pulse})`;
              ctx.lineWidth = 2.5;
              ctx.shadowColor = `rgba(0,255,200,${0.3 + pulse})`;
              ctx.shadowBlur = 8;
              drawRoundedRect(ctx, pos.x + 2, pos.y + 2, bs - 4, bs - 4, bs * 0.2);
              ctx.stroke();
              ctx.shadowBlur = 0;
              ctx.fillStyle = `rgba(0,255,200,${0.08 + pulse * 0.05})`;
              ctx.fill();
              ctx.restore();
            }
          }
        }
      }
    }
  }

  // Swap animation
  if (state.swapAnimation && state.swapAnimation.progress < 1) {
    const sa = state.swapAnimation;
    const t = sa.progress;
    const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    const p1 = getBlockPos(game, sa.r1, sa.c1);
    const p2 = getBlockPos(game, sa.r2, sa.c2);

    const x1 = p1.x + (p2.x - p1.x) * ease;
    const y1 = p1.y + (p2.y - p1.y) * ease;
    drawBlockAt(ctx, game, x1, y1, sa.v1);

    const x2 = p2.x + (p1.x - p2.x) * ease;
    const y2 = p2.y + (p1.y - p2.y) * ease;
    drawBlockAt(ctx, game, x2, y2, sa.v2);
  }

  // Falling blocks
  if (state.fallingBlocks.length > 0) {
    for (const fb of state.fallingBlocks) {
      const t = fb.progress;
      const ease = 1 - Math.pow(1 - t, 2.5);
      const fromY = game.offsetY + fb.fromRow * bs;
      const toY = game.offsetY + fb.toRow * bs;
      const curX = game.offsetX + fb.col * bs;
      const curY = fromY + (toY - fromY) * ease;

      drawBlockAt(ctx, game, curX, curY, fb.block);

      if (t < 1 && fb.newBlock) {
        ctx.save();
        ctx.fillStyle = 'rgba(255,182,193,0.15)';
        ctx.beginPath();
        ctx.roundRect(curX + 2, curY + bs - 4, bs - 4, 4, 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  // Particles
  for (const p of state.particles) {
    p.draw(ctx);
  }

  // Float texts
  for (const ft of state.floatTexts) {
    ft.draw(ctx);
  }

  // Combo popup
  const cp = document.getElementById('comboPopup');
  if (game.combo >= 2 && game.combo !== game._lastCombo) {
    game._lastCombo = game.combo;
    cp.textContent = `🔥 ${game.combo}连击！`;
    cp.className = 'combo-popup';
    void cp.offsetWidth;
    cp.classList.add('show');
    setTimeout(() => { cp.className = 'combo-popup'; }, 1200);
  }

  // Drag indicator
  if (state.dragTarget) {
    drawDragIndicator();
  }

  ctx.restore();

  // Update HUD
  document.getElementById('scoreDisplay').textContent = game.score;
  document.getElementById('levelDisplay').textContent = `Lv.${game.level}`;

  // Check win for match3
  if (game.mode === 'match3' && game.checkWin() && !game._resultShown) {
    game._resultShown = true;
    setTimeout(() => game.showResult(), 500);
  }
}

// --- Animation loop ---
export function gameLoop() {
  state.particles = state.particles.filter(p => p.update());
  state.floatTexts = state.floatTexts.filter(ft => ft.update());
  render();
  state.animFrameId = requestAnimationFrame(gameLoop);
}
