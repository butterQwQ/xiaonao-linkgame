// ============================================================
// 经典连连看模式 (Classic Mode)
// ============================================================

import { CONFIG, IMG_FILES, isMobile } from '../config.js';
import { state } from '../state.js';
import { playClick, playMatch, playCombo, playPowerup, playStar, playVictory } from '../audio.js';
import { Particle, FloatText } from '../particles.js';
import { render, getBlockPos } from '../ui/render.js';

export class ClassicGame {
  constructor() {
    this.mode = 'classic';
    const cfg = isMobile() ? CONFIG.classicMobile : CONFIG.classic;
    this.rows = cfg.rows;
    this.cols = cfg.cols;
    this.minBlockTypes = cfg.minBlockTypes;
    this.level = 1;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.moves = 0;
    this.totalEliminated = 0;
    this.blockSize = CONFIG.classic.blockSize;
    this.offsetX = 2; this.offsetY = 2;
    this.board = [];
    this.selected = null;
    this.hintPair = null;
    this.hintTimer = null;
    this.frozen = false;
    this.frozenTimer = null;
    this.magnifier = false;
    this.magnifierTimer = null;
    this.history = [];
    this.isSpecialAnim = false;
    this.pendingRemove = [];
    this._lastCombo = 0;

    this.initBoard();
  }

  initBoard() {
    this.board = [];
    const totalCells = this.rows * this.cols;
    const numTypes = Math.min(this.minBlockTypes, IMG_FILES.length);
    const pairs = Math.floor(totalCells / 2);
    let tiles = [];
    for (let i = 0; i < pairs; i++) {
      const t = (i % numTypes) + 1;
      tiles.push(t, t);
    }
    this.shuffleArray(tiles);
    let idx = 0;
    for (let r = 0; r < this.rows; r++) {
      this.board[r] = [];
      for (let c = 0; c < this.cols; c++) {
        this.board[r][c] = tiles[idx++];
      }
    }
    this.ensureValidMoves();
  }

  ensureValidMoves() {
    for (let attempt = 0; attempt < 50; attempt++) {
      if (this.hasValidMove()) return;
      this.reshuffleBoard();
    }
  }

  hasValidMove() {
    for (let r1 = 0; r1 < this.rows; r1++) {
      for (let c1 = 0; c1 < this.cols; c1++) {
        if (this.board[r1][c1] === 0 || this.board[r1][c1] === null) continue;
        for (let r2 = r1; r2 < this.rows; r2++) {
          for (let c2 = 0; c2 < this.cols; c2++) {
            if (r2 === r1 && c2 <= c1) continue;
            if (this.board[r2][c2] === 0 || this.board[r2][c2] === null) continue;
            const v1 = typeof this.board[r1][c1] === 'object' ? this.board[r1][c1].idx : this.board[r1][c1];
            const v2 = typeof this.board[r2][c2] === 'object' ? this.board[r2][c2].idx : this.board[r2][c2];
            if (v1 !== v2) continue;
            const path = this.findPath(r1, c1, r2, c2);
            if (path) return true;
          }
        }
      }
    }
    return false;
  }

  shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  reshuffleBoard() {
    const tiles = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.board[r][c] !== 0 && this.board[r][c] !== null) {
          const v = typeof this.board[r][c] === 'object' ? this.board[r][c].idx : this.board[r][c];
          tiles.push(v);
        }
      }
    }
    if (tiles.length % 2 !== 0) tiles.pop();
    this.shuffleArray(tiles);
    let idx = 0;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.board[r][c] !== 0 && this.board[r][c] !== null) {
          this.board[r][c] = tiles[idx++];
        }
      }
    }
  }

  // 寻路：最多2个转弯
  findPath(r1, c1, r2, c2) {
    if (r1 === r2 && c1 === c2) return null;
    if (this.board[r1][c1] === 0 || this.board[r1][c1] === null) return null;
    if (this.board[r2][c2] === 0 || this.board[r2][c2] === null) return null;

    const v1 = typeof this.board[r1][c1] === 'object' ? this.board[r1][c1].idx : this.board[r1][c1];
    const v2 = typeof this.board[r2][c2] === 'object' ? this.board[r2][c2].idx : this.board[r2][c2];
    if (v1 !== v2) return null;

    const rows = this.rows + 2;
    const cols = this.cols + 2;

    const isEmpty = (r, c) => {
      if (r < 0 || r >= rows || c < 0 || c >= cols) return false;
      if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) return true;
      const br = r - 1, bc = c - 1;
      return this.board[br][bc] === 0 || this.board[br][bc] === null;
    };

    function buildPath(route, endR, endC) {
      const path = [];
      for (const p of route) path.push(p);
      path.push({ r: endR - 1, c: endC - 1 });
      return path;
    }

    const sr = r1 + 1, sc = c1 + 1, er = r2 + 1, ec = c2 + 1;
    const visited = new Set();
    const queue = [{ r: sr, c: sc, turns: 0, dir: 0, route: [] }];
    const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]];

    while (queue.length > 0) {
      const { r, c, turns, dir, route } = queue.shift();
      const key = r + ',' + c + ',' + dir;

      if (r === er && c === ec) {
        return buildPath(route, r, c);
      }
      if (visited.has(key)) continue;
      visited.add(key);

      if (r === sr && c === sc) {
        for (let d = 0; d < 4; d++) {
          const nr = r + dirs[d][0];
          const nc = c + dirs[d][1];
          if (isEmpty(nr, nc) || (nr === er && nc === ec)) {
            queue.push({ r: nr, c: nc, turns: 0, dir: d, route: [...route, { r: r - 1, c: c - 1 }] });
          }
        }
      } else {
        for (let d = 0; d < 4; d++) {
          const newTurns = d !== dir ? turns + 1 : turns;
          if (newTurns > 2) continue;
          const nr = r + dirs[d][0];
          const nc = c + dirs[d][1];
          if (isEmpty(nr, nc) || (nr === er && nc === ec)) {
            queue.push({ r: nr, c: nc, turns: newTurns, dir: d, route: [...route, { r: r - 1, c: c - 1 }] });
          }
        }
      }
    }
    return null;
  }

  findHint() {
    for (let r1 = 0; r1 < this.rows; r1++) {
      for (let c1 = 0; c1 < this.cols; c1++) {
        if (this.board[r1][c1] === 0 || this.board[r1][c1] === null) continue;
        for (let r2 = r1; r2 < this.rows; r2++) {
          for (let c2 = 0; c2 < this.cols; c2++) {
            if (r2 === r1 && c2 <= c1) continue;
            if (this.board[r2][c2] === 0 || this.board[r2][c2] === null) continue;
            const v1 = typeof this.board[r1][c1] === 'object' ? this.board[r1][c1].idx : this.board[r1][c1];
            const v2 = typeof this.board[r2][c2] === 'object' ? this.board[r2][c2].idx : this.board[r2][c2];
            if (v1 !== v2) continue;
            const path = this.findPath(r1, c1, r2, c2);
            if (path) return [{ row: r1, col: c1 }, { row: r2, col: c2 }, path];
          }
        }
      }
    }
    return null;
  }

  findAllPairs() {
    const pairs = [];
    for (let r1 = 0; r1 < this.rows; r1++) {
      for (let c1 = 0; c1 < this.cols; c1++) {
        if (this.board[r1][c1] === 0 || this.board[r1][c1] === null) continue;
        for (let r2 = r1; r2 < this.rows; r2++) {
          for (let c2 = 0; c2 < this.cols; c2++) {
            if (r2 === r1 && c2 <= c1) continue;
            if (this.board[r2][c2] === 0 || this.board[r2][c2] === null) continue;
            const v1 = typeof this.board[r1][c1] === 'object' ? this.board[r1][c1].idx : this.board[r1][c1];
            const v2 = typeof this.board[r2][c2] === 'object' ? this.board[r2][c2].idx : this.board[r2][c2];
            if (v1 !== v2) continue;
            const path = this.findPath(r1, c1, r2, c2);
            if (path) pairs.push([{ row: r1, col: c1 }, { row: r2, col: c2 }]);
          }
        }
      }
    }
    return pairs;
  }

  selectBlock(row, col) {
    if (this.frozen || this.isSpecialAnim) return;
    const val = this.board[row][col];
    if (val === 0 || val === null) return;

    playClick();

    if (!this.selected) {
      this.selected = { row, col };
      render();
      return;
    }

    if (this.selected.row === row && this.selected.col === col) {
      this.selected = null;
      render();
      return;
    }

    const v1 = typeof this.board[this.selected.row][this.selected.col] === 'object'
      ? this.board[this.selected.row][this.selected.col].idx
      : this.board[this.selected.row][this.selected.col];
    const v2 = typeof this.board[row][col] === 'object'
      ? this.board[row][col].idx
      : this.board[row][col];

    if (v1 !== v2) {
      this.selected = { row, col };
      render();
      return;
    }

    const path = this.findPath(this.selected.row, this.selected.col, row, col);
    if (!path) {
      this.selected = { row, col };
      render();
      return;
    }

    // 配对成功！
    this.moves++;
    this.combo++;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
    this.totalEliminated += 2;

    this.history.push({
      r1: this.selected.row, c1: this.selected.col,
      r2: row, c2: col,
      v1: this.board[this.selected.row][this.selected.col],
      v2: this.board[row][col]
    });
    if (this.history.length > 10) this.history.shift();

    const sRow = this.selected.row, sCol = this.selected.col;
    const eRow = row, eCol = col;

    this.drawPathLine(path, () => {
      this.board[sRow][sCol] = 0;
      this.board[eRow][eCol] = 0;

      const bonus = Math.max(1, this.combo);
      const pts = 10 * bonus;
      this.score += pts;

      const bs = this.blockSize;
      const p1 = getBlockPos(this, sRow, sCol);
      const p2 = getBlockPos(this, eRow, eCol);
      const hue1 = (typeof v1 === 'number' ? v1 * 36 : 0) % 360;
      const hue2 = (typeof v2 === 'number' ? v2 * 36 : 0) % 360;
      state.particles.push(new Particle(p1.x + bs / 2, p1.y + bs / 2, `hsl(${hue1},80%,70%)`, 15));
      state.particles.push(new Particle(p2.x + bs / 2, p2.y + bs / 2, `hsl(${hue2},80%,70%)`, 15));

      if (this.combo >= 2) {
        state.floatTexts.push(new FloatText(state.canvasW / 2, state.canvasH / 2, `🔥 ${this.combo}连击! +${pts}`, '#FF1493'));
        playCombo(this.combo);
      } else {
        playMatch();
      }

      this.selected = null;
      render();

      if (this.checkWin()) {
        setTimeout(() => this.showResult(), 500);
      } else if (!this.hasValidMove()) {
        this.reshuffleBoard();
        state.floatTexts.push(new FloatText(state.canvasW / 2, state.canvasH / 2, '🔀 重新洗牌!', '#FFD700'));
        render();
      }
    });
  }

  drawPathLine(path, callback) {
    this.isSpecialAnim = true;
    const bs = this.blockSize;
    const pts = path.map(p => ({
      x: this.offsetX + p.c * bs + bs / 2,
      y: this.offsetY + p.r * bs + bs / 2
    }));

    let progress = 0;
    const duration = 30;

    const animate = () => {
      progress++;
      const t = Math.min(1, progress / duration);
      render();

      const cctx = state.ctx;
      if (!cctx) return;
      cctx.save();
      cctx.strokeStyle = 'rgba(255,215,0,0.7)';
      cctx.lineWidth = 3;
      cctx.setLineDash([6, 4]);
      cctx.lineDashOffset = -progress * 2;
      cctx.shadowColor = 'rgba(255,215,0,0.5)';
      cctx.shadowBlur = 8;

      const drawTo = Math.floor(t * (pts.length - 1));
      cctx.beginPath();
      cctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i <= Math.min(drawTo, pts.length - 1); i++) {
        cctx.lineTo(pts[i].x, pts[i].y);
      }
      cctx.stroke();
      cctx.setLineDash([]);
      cctx.shadowBlur = 0;

      for (let i = 0; i <= Math.min(drawTo, pts.length - 1); i++) {
        cctx.fillStyle = i === 0 || i === pts.length - 1 ? '#FFD700' : 'rgba(255,215,0,0.4)';
        cctx.beginPath();
        cctx.arc(pts[i].x, pts[i].y, i === 0 || i === pts.length - 1 ? 5 : 3, 0, Math.PI * 2);
        cctx.fill();
      }
      cctx.restore();

      if (t < 1) {
        state.animFrameId = requestAnimationFrame(animate);
      } else {
        this.isSpecialAnim = false;
        let flashAlpha = 1;
        const flashAnim = () => {
          render();
          if (!state.ctx) return;
          state.ctx.save();
          state.ctx.fillStyle = `rgba(255,215,0,${flashAlpha * 0.15})`;
          state.ctx.fillRect(0, 0, state.canvasW, state.canvasH);
          state.ctx.restore();
          flashAlpha -= 0.1;
          if (flashAlpha > 0) {
            requestAnimationFrame(flashAnim);
          } else {
            callback();
          }
        };
        flashAnim();
      }
    };
    animate();
  }

  checkWin() {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.board[r][c] !== 0 && this.board[r][c] !== null) return false;
      }
    }
    return true;
  }

  shuffle() {
    if (this.frozen) return false;
    this.reshuffleBoard();
    this.selected = null;
    playPowerup();
    state.floatTexts.push(new FloatText(state.canvasW / 2, state.canvasH / 2, '🔀 洗牌!', '#FF69B4'));
    render();
    return true;
  }

  showHint() {
    if (this.frozen) return false;
    const hint = this.findHint();
    if (!hint) return false;
    this.hintPair = [{ row: hint[0].row, col: hint[0].col }, { row: hint[1].row, col: hint[1].col }];
    if (this.hintTimer) clearTimeout(this.hintTimer);
    this.hintTimer = setTimeout(() => { this.hintPair = null; render(); }, 3000);
    playPowerup();
    render();
    return true;
  }

  useMagnifier() {
    if (this.frozen) return false;
    this.magnifier = true;
    if (this.magnifierTimer) clearTimeout(this.magnifierTimer);
    this.magnifierTimer = setTimeout(() => { this.magnifier = false; render(); }, 5000);
    playPowerup();
    render();
    return true;
  }

  useFreeze() {
    if (this.frozen) return false;
    this.frozen = true;
    document.getElementById('frozenOverlay').classList.add('active');
    if (this.frozenTimer) clearTimeout(this.frozenTimer);
    this.frozenTimer = setTimeout(() => {
      this.frozen = false;
      document.getElementById('frozenOverlay').classList.remove('active');
      render();
    }, 15000);
    playPowerup();
    render();
    return true;
  }

  useBomb(row, col) {
    if (this.frozen) return false;
    if (row === undefined || col === undefined) {
      return 'need_target';
    }
    if (this.board[row][col] === 0 || this.board[row][col] === null) return false;
    this.board[row][col] = 0;
    this.totalEliminated++;
    const bs = this.blockSize;
    const pos = getBlockPos(this, row, col);
    state.particles.push(new Particle(pos.x + bs / 2, pos.y + bs / 2, '#FF6347', 20));
    playPowerup();
    render();
    return true;
  }

  useUndo() {
    if (this.frozen) return false;
    if (this.history.length === 0) return false;
    const last = this.history.pop();
    this.board[last.r1][last.c1] = last.v1;
    this.board[last.r2][last.c2] = last.v2;
    this.score = Math.max(0, this.score - 5);
    this.combo = Math.max(0, this.combo - 1);
    this.totalEliminated = Math.max(0, this.totalEliminated - 2);
    this.selected = null;
    playPowerup();
    state.floatTexts.push(new FloatText(state.canvasW / 2, state.canvasH / 2, '🔄 撤销!', '#87CEEB'));
    render();
    return true;
  }

  showResult() {
    playVictory();
    const totalStars = this.moves <= 40 ? 3 : this.moves <= 60 ? 2 : 1;
    document.getElementById('resultIcon').textContent = '🎉';
    document.getElementById('resultTitle').textContent = '🎀 恭喜通关！';
    document.getElementById('resultScore').textContent = this.score;
    document.getElementById('resultDetail').textContent = `移动 ${this.moves} 步 · 消除 ${this.totalEliminated} 块 · 最高连击 ${this.maxCombo}×`;
    document.getElementById('resultCombo').textContent = '';
    const starsEl = document.getElementById('resultStars');
    starsEl.querySelectorAll('.star').forEach((s, i) => {
      s.classList.toggle('active', i < totalStars);
      if (i < totalStars) {
        s.style.animationDelay = (i * 0.2) + 's';
        setTimeout(playStar, i * 200);
      }
    });
    document.getElementById('levelDisplay').textContent = `Lv.${this.level}`;
    document.getElementById('resultOverlay').classList.add('active');
    document.getElementById('resultNextBtn').textContent = '👉 下一关';
  }

  getState() {
    return {
      mode: 'classic',
      score: this.score,
      combo: this.combo,
      level: this.level,
      remaining: this.countRemaining()
    };
  }

  countRemaining() {
    let cnt = 0;
    for (let r = 0; r < this.rows; r++)
      for (let c = 0; c < this.cols; c++)
        if (this.board[r][c] !== 0 && this.board[r][c] !== null) cnt++;
    return cnt;
  }
}
