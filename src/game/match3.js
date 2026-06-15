// ============================================================
// 开心消消乐模式 (Match-3 Mode)
// ============================================================

import { CONFIG, IMG_FILES } from '../config.js';
import { state } from '../state.js';
import { playClick, playMatch, playCombo, playPowerup, playSpecial, playStar, playVictory } from '../audio.js';
import { Particle, FloatText } from '../particles.js';
import { render, getBlockPos } from '../ui/render.js';

export class Match3Game {
  constructor() {
    this.mode = 'match3';
    this.rows = CONFIG.match3.rows;
    this.cols = CONFIG.match3.cols;
    this.level = 1;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.moves = 0;
    this.totalEliminated = 0;
    this.blockSize = CONFIG.match3.blockSize;
    this.offsetX = 2; this.offsetY = 2;
    this.board = [];
    this.selected = null;
    this.frozen = false;
    this.frozenTimer = null;
    this.hintPair = null;
    this.hintTimer = null;
    this.isAnimating = false;
    this.chainCombo = 0;
    this.targetScore = 2000;
    this.lastBoardState = null;
    this._lastCombo = 0;
    this._resultShown = false;

    this.initBoard();
  }

  initBoard() {
    this.board = [];
    const numTypes = Math.min(8, IMG_FILES.length);
    for (let r = 0; r < this.rows; r++) {
      this.board[r] = [];
      for (let c = 0; c < this.cols; c++) {
        let t = Math.floor(Math.random() * numTypes);
        while (this.wouldMatch(r, c, t)) {
          t = Math.floor(Math.random() * numTypes);
        }
        this.board[r][c] = t + 1;
      }
    }
  }

  wouldMatch(row, col, type) {
    if (col >= 2 && this.board[row][col - 1] === type + 1 && this.board[row][col - 2] === type + 1) return true;
    if (row >= 2 && this.board[row - 1][col] === type + 1 && this.board[row - 2][col] === type + 1) return true;
    return false;
  }

  findMatches() {
    const matched = new Set();
    const specials = [];

    // 水平匹配
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols - 2; c++) {
        const v = this.board[r][c];
        if (v === 0 || v === null) continue;
        const vType = typeof v === 'object' ? v.idx : v;
        if (vType === 'special') continue;

        let len = 1;
        while (c + len < this.cols) {
          const n = this.board[r][c + len];
          if (n === 0 || n === null) break;
          const nType = typeof n === 'object' ? n.idx : n;
          if (nType !== vType) break;
          len++;
        }
        if (len >= 3) {
          for (let i = 0; i < len; i++) matched.add(`${r},${c + i}`);
          if (len >= 4) {
            specials.push({
              row: r, col: c + Math.floor(len / 2),
              type: len === 4 ? 'line_h' : 'bomb',
              idx: vType
            });
          }
          if (len >= 5) {
            specials.push({ row: r, col: c + 2, type: 'rainbow', idx: vType });
          }
          c += len - 1;
        }
      }
    }

    // 垂直匹配
    for (let c = 0; c < this.cols; c++) {
      for (let r = 0; r < this.rows - 2; r++) {
        const v = this.board[r][c];
        if (v === 0 || v === null) continue;
        const vType = typeof v === 'object' ? v.idx : v;
        if (vType === 'special') continue;

        let len = 1;
        while (r + len < this.rows) {
          const n = this.board[r + len][c];
          if (n === 0 || n === null) break;
          const nType = typeof n === 'object' ? n.idx : n;
          if (nType !== vType) break;
          len++;
        }
        if (len >= 3) {
          for (let i = 0; i < len; i++) matched.add(`${r + i},${c}`);
          if (len >= 4) {
            specials.push({
              row: r + Math.floor(len / 2), col: c,
              type: len === 4 ? 'line_v' : 'bomb',
              idx: vType
            });
          }
          if (len >= 5) {
            specials.push({ row: r + 2, col: c, type: 'rainbow', idx: vType });
          }
          r += len - 1;
        }
      }
    }

    return { matched, specials };
  }

  processMatches() {
    this.chainCombo = 0;
    this._processChain();
  }

  _processChain() {
    const { matched, specials } = this.findMatches();

    if (matched.size === 0) {
      this.isAnimating = false;
      render();
      if (this.hasEmptyCells()) {
        setTimeout(() => this.animateDrops(), 150);
        return;
      }
      return;
    }

    this.chainCombo++;
    this.combo = this.chainCombo;
    if (this.chainCombo > this.maxCombo) this.maxCombo = this.chainCombo;

    const count = matched.size;
    const bonus = Math.max(1, this.chainCombo);
    const pts = count * 10 * bonus;
    this.score += pts;
    this.totalEliminated += count;
    this.moves++;

    const bs = this.blockSize;
    matched.forEach(key => {
      const [r, c] = key.split(',').map(Number);
      const pos = getBlockPos(this, r, c);
      const hue = (this.board[r][c] !== 0 && this.board[r][c] !== null)
        ? ((typeof this.board[r][c] === 'object' ? this.board[r][c].idx : this.board[r][c]) * 36) % 360
        : 0;
      state.particles.push(new Particle(pos.x + bs / 2, pos.y + bs / 2, `hsl(${hue},80%,70%)`, 8));
    });

    if (this.chainCombo >= 2) {
      playCombo(this.chainCombo);
      state.floatTexts.push(new FloatText(state.canvasW / 2, state.canvasH / 2, `🔥 ${this.chainCombo}连消! +${pts}`, '#FF1493'));
    } else {
      playMatch();
    }

    matched.forEach(key => {
      const [r, c] = key.split(',').map(Number);
      this.board[r][c] = 0;
    });

    for (const sp of specials) {
      if (this.board[sp.row] && this.board[sp.row][sp.col] !== undefined) {
        if (this.board[sp.row][sp.col] === 0) {
          this.board[sp.row][sp.col] = { type: 'special', specialType: sp.type, idx: sp.idx };
          playSpecial();
          state.floatTexts.push(new FloatText(
            getBlockPos(this, sp.row, sp.col).x + bs / 2,
            getBlockPos(this, sp.row, sp.col).y,
            ['↔️', '↕️', '💥', '🌈'][['line_h', 'line_v', 'bomb', 'rainbow'].indexOf(sp.type)] + '特殊!',
            '#FFD700'
          ));
        }
      }
    }

    render();

    setTimeout(() => {
      this.animateDrops();
    }, 350);
  }

  animateDrops() {
    const drops = [];
    const numTypes = Math.min(8, IMG_FILES.length);
    let hasDrops = false;

    for (let c = 0; c < this.cols; c++) {
      let hasEmpty = false;
      for (let r = 0; r < this.rows; r++) {
        if (this.board[r][c] === 0 || this.board[r][c] === null) {
          hasEmpty = true;
          break;
        }
      }
      if (!hasEmpty) continue;

      const blocks = [];
      for (let r = this.rows - 1; r >= 0; r--) {
        if (this.board[r][c] !== 0 && this.board[r][c] !== null) {
          blocks.push({ row: r, block: this.board[r][c] });
        }
      }

      for (let r = 0; r < this.rows; r++) {
        this.board[r][c] = 0;
      }

      let destRow = this.rows - 1;
      for (let i = blocks.length - 1; i >= 0; i--) {
        const b = blocks[i];
        if (b.row !== destRow) {
          drops.push({
            col: c, fromRow: b.row, toRow: destRow,
            block: b.block, progress: 0, newBlock: false
          });
          hasDrops = true;
        } else {
          this.board[destRow][c] = b.block;
        }
        destRow--;
      }

      const emptyCount = destRow + 1;
      for (let i = 0; i < emptyCount; i++) {
        const newBlock = Math.floor(Math.random() * numTypes) + 1;
        drops.push({
          col: c, fromRow: -(i + 1), toRow: destRow - i,
          block: newBlock, progress: 0, newBlock: true
        });
        hasDrops = true;
      }
    }

    if (!hasDrops) {
      this.processSpecialBlocks();
      this._processChain();
      return;
    }

    this.isAnimating = true;
    state.fallingBlocks = drops;

    const dropDuration = 20;
    let frame = 0;

    const animateDropFrame = () => {
      frame++;
      const t = Math.min(1, frame / dropDuration);
      for (const fb of state.fallingBlocks) {
        fb.progress = t;
      }
      render();

      if (t < 1) {
        requestAnimationFrame(animateDropFrame);
      } else {
        for (const fb of state.fallingBlocks) {
          this.board[fb.toRow][fb.col] = fb.block;
        }
        state.fallingBlocks = [];
        this.isAnimating = false;

        const bs = this.blockSize;
        for (const fb of drops) {
          const pos = getBlockPos(this, fb.toRow, fb.col);
          state.particles.push(new Particle(
            pos.x + bs / 2, pos.y + bs / 2,
            fb.newBlock ? '#FFB6C1' : '#E6E6FA', 4
          ));
        }

        this.processSpecialBlocks();
        render();

        setTimeout(() => {
          this._processChain();
        }, 200);
      }
    };
    animateDropFrame();
  }

  processSpecialBlocks() {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const block = this.board[r][c];
        if (typeof block !== 'object' || block.type !== 'special') continue;
        this.triggerSpecial(r, c, block);
      }
    }
  }

  triggerSpecial(row, col, block) {
    const bs = this.blockSize;
    const pos = getBlockPos(this, row, col);

    switch (block.specialType) {
      case 'line_h':
        for (let c = 0; c < this.cols; c++) {
          if (this.board[row][c] !== 0) {
            const p = getBlockPos(this, row, c);
            state.particles.push(new Particle(p.x + bs / 2, p.y + bs / 2, '#FFD700', 6));
            this.board[row][c] = 0;
          }
        }
        break;
      case 'line_v':
        for (let r = 0; r < this.rows; r++) {
          if (this.board[r][col] !== 0) {
            const p = getBlockPos(this, r, col);
            state.particles.push(new Particle(p.x + bs / 2, p.y + bs / 2, '#FFD700', 6));
            this.board[r][col] = 0;
          }
        }
        break;
      case 'bomb':
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = row + dr, nc = col + dc;
            if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols && this.board[nr][nc] !== 0) {
              const p = getBlockPos(this, nr, nc);
              state.particles.push(new Particle(p.x + bs / 2, p.y + bs / 2, '#FF4500', 6));
              this.board[nr][nc] = 0;
            }
          }
        }
        break;
      case 'rainbow':
        const idx = block.idx;
        for (let r = 0; r < this.rows; r++) {
          for (let c = 0; c < this.cols; c++) {
            const b = this.board[r][c];
            if (b !== 0 && b !== null) {
              const bIdx = typeof b === 'object' ? b.idx : b;
              if (bIdx === idx || (typeof b === 'object' && b.type === 'special')) {
                const p = getBlockPos(this, r, c);
                state.particles.push(new Particle(p.x + bs / 2, p.y + bs / 2, '#FF69B4', 5));
                this.board[r][c] = 0;
              }
            }
          }
        }
        break;
    }
    this.board[row][col] = 0;
  }

  selectBlock(row, col) {
    if (this.frozen || this.isAnimating) return;
    const val = this.board[row][col];
    if (val === 0 || val === null) return;

    playClick();

    if (!this.selected) {
      this.selected = { row, col };
      render();
      return;
    }

    const sr = this.selected.row, sc = this.selected.col;

    if (sr === row && sc === col) {
      this.selected = null;
      render();
      return;
    }

    const dr = Math.abs(sr - row);
    const dc = Math.abs(sc - col);
    if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
      this.swapAndCheck(sr, sc, row, col);
    } else {
      this.selected = { row, col };
      render();
    }
  }

  swapAndCheck(r1, c1, r2, c2) {
    if (this.isAnimating) return;
    this.isAnimating = true;

    this.lastBoardState = {
      board: this.board.map(row => [...row]),
      score: this.score,
      combo: this.combo,
      totalEliminated: this.totalEliminated
    };

    state.swapAnimation = {
      r1, c1, r2, c2,
      v1: this.board[r1][c1],
      v2: this.board[r2][c2],
      progress: 0,
      swapBack: false
    };

    const animateSwap = () => {
      state.swapAnimation.progress += 0.15;
      render();

      if (state.swapAnimation.progress < 1) {
        requestAnimationFrame(animateSwap);
      } else {
        [this.board[r1][c1], this.board[r2][c2]] = [this.board[r2][c2], this.board[r1][c1]];
        this.selected = null;
        state.swapAnimation = null;

        const { matched } = this.findMatches();

        if (matched.size === 0) {
          this.isAnimating = true;
          state.swapAnimation = {
            r1, c1, r2, c2,
            v1: this.board[r1][c1],
            v2: this.board[r2][c2],
            progress: 0,
            swapBack: true
          };

          const animateSwapBack = () => {
            state.swapAnimation.progress += 0.12;
            render();
            if (state.swapAnimation.progress < 1) {
              requestAnimationFrame(animateSwapBack);
            } else {
              [this.board[r1][c1], this.board[r2][c2]] = [this.board[r2][c2], this.board[r1][c1]];
              state.swapAnimation = null;
              this.isAnimating = false;
              state.floatTexts.push(new FloatText(state.canvasW / 2, state.canvasH / 2, '❌ 不能消除', '#FF6347'));
              render();
            }
          };
          animateSwapBack();
        } else {
          this.isAnimating = false;
          this.processMatches();
        }
      }
    };
    animateSwap();
  }

  shuffle() {
    if (this.frozen) return false;
    const tiles = [];
    for (let r = 0; r < this.rows; r++)
      for (let c = 0; c < this.cols; c++)
        if (this.board[r][c] !== 0 && this.board[r][c] !== null)
          tiles.push(this.board[r][c]);
    this._shuffle(tiles);
    let idx = 0;
    for (let r = 0; r < this.rows; r++)
      for (let c = 0; c < this.cols; c++)
        if (this.board[r][c] !== 0 && this.board[r][c] !== null)
          this.board[r][c] = tiles[idx++];
    this.selected = null;
    playPowerup();
    state.floatTexts.push(new FloatText(state.canvasW / 2, state.canvasH / 2, '🔀 洗牌!', '#FF69B4'));
    render();
    return true;
  }

  _shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  showHint() {
    if (this.frozen) return false;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (c + 1 < this.cols) {
          [this.board[r][c], this.board[r][c + 1]] = [this.board[r][c + 1], this.board[r][c]];
          const { matched } = this.findMatches();
          [this.board[r][c], this.board[r][c + 1]] = [this.board[r][c + 1], this.board[r][c]];
          if (matched.size > 0) {
            this.hintPair = [{ row: r, col: c }, { row: r, col: c + 1 }];
            if (this.hintTimer) clearTimeout(this.hintTimer);
            this.hintTimer = setTimeout(() => { this.hintPair = null; render(); }, 3000);
            playPowerup();
            render();
            return true;
          }
        }
        if (r + 1 < this.rows) {
          [this.board[r][c], this.board[r + 1][c]] = [this.board[r + 1][c], this.board[r][c]];
          const { matched } = this.findMatches();
          [this.board[r][c], this.board[r + 1][c]] = [this.board[r + 1][c], this.board[r][c]];
          if (matched.size > 0) {
            this.hintPair = [{ row: r, col: c }, { row: r + 1, col: c }];
            if (this.hintTimer) clearTimeout(this.hintTimer);
            this.hintTimer = setTimeout(() => { this.hintPair = null; render(); }, 3000);
            playPowerup();
            render();
            return true;
          }
        }
      }
    }
    return false;
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
    if (row === undefined || col === undefined) return 'need_target';
    if (this.board[row][col] === 0 || this.board[row][col] === null) return false;

    const bs = this.blockSize;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = row + dr, nc = col + dc;
        if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols && this.board[nr][nc] !== 0) {
          const p = getBlockPos(this, nr, nc);
          state.particles.push(new Particle(p.x + bs / 2, p.y + bs / 2, '#FF6347', 8));
          this.board[nr][nc] = 0;
          this.totalEliminated++;
        }
      }
    }
    playPowerup();
    this.animateDrops();
    return true;
  }

  useUndo() {
    if (this.frozen) return false;
    if (!this.lastBoardState) return false;
    this.board = this.lastBoardState.board.map(row => [...row]);
    this.score = this.lastBoardState.score;
    this.combo = this.lastBoardState.combo;
    this.totalEliminated = this.lastBoardState.totalEliminated;
    this.lastBoardState = null;
    this.selected = null;
    this.isAnimating = false;
    state.fallingBlocks = [];
    state.swapAnimation = null;
    playPowerup();
    state.floatTexts.push(new FloatText(state.canvasW / 2, state.canvasH / 2, '🔄 撤销!', '#87CEEB'));
    render();
    return true;
  }

  checkWin() {
    return this.score >= this.targetScore;
  }

  hasEmptyCells() {
    for (let r = 0; r < this.rows; r++)
      for (let c = 0; c < this.cols; c++)
        if (this.board[r][c] === 0 || this.board[r][c] === null) return true;
    return false;
  }

  showResult() {
    playVictory();
    const totalStars = this.score >= this.targetScore * 1.5 ? 3 : this.score >= this.targetScore ? 2 : 1;
    document.getElementById('resultIcon').textContent = '🌈';
    document.getElementById('resultTitle').textContent = '🎀 太棒了！达标！';
    document.getElementById('resultScore').textContent = this.score;
    document.getElementById('resultDetail').textContent = `目标 ${this.targetScore} · 消除 ${this.totalEliminated} 块 · 最高连消 ${this.maxCombo}×`;
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
      mode: 'match3',
      score: this.score,
      combo: this.combo,
      level: this.level,
      target: this.targetScore
    };
  }
}
