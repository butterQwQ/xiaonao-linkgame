// ============================================================
// 数字消除游戏 — 框选数字使和为10 · 限时模式
// ============================================================

import { state } from '../state.js';
import { playClick, playMatch, playVictory, playPowerup } from '../audio.js';

const TOTAL_TIME = 180; // 180秒
const RATINGS = [
  { score: 160, title: '👑 小闹女王', color: '#FF1493' },
  { score: 140, title: '💻 程序员', color: '#00BFFF' },
  { score: 120, title: '🎓 大学生', color: '#32CD32' },
  { score: 100, title: '📚 高中生', color: '#FFA500' },
  { score: 80, title: '📖 小学生', color: '#87CEEB' },
  { score: 60, title: '🍼 幼儿园', color: '#FFB6C1' },
  { score: 0, title: '😢 再试试吧', color: '#999' },
];

export class NumberElimGame {
  constructor() {
    this.mode = 'numberElim';
    this.rows = 16;
    this.cols = 10;
    this.grid = [];
    this.eliminated = [];
    this.score = 0;
    this.moves = 0;
    this.level = 1;
    this.combo = 0;
    this.isSelecting = false;
    this.startCell = null;
    this.currentCell = null;
    this.selectedCells = [];
    this.timeLeft = TOTAL_TIME;
    this._timerInterval = null;
    this._hintTimer = null;
    this._destroyed = false;
    this._gameOver = false;

    this.generateGrid();
    this.render();
    this.attachEvents();
    this._startTimer();
    this._updateFuse();
  }

  generateGrid() {
    this.grid = [];
    this.eliminated = [];
    for (let r = 0; r < this.rows; r++) {
      const row = [];
      const elimRow = [];
      for (let c = 0; c < this.cols; c++) {
        row.push(Math.floor(Math.random() * 9) + 1);
        elimRow.push(false);
      }
      this.grid.push(row);
      this.eliminated.push(elimRow);
    }
  }

  render() {
    const el = document.getElementById('numElimGrid');
    if (!el || this._destroyed) return;
    el.style.gridTemplateColumns = `repeat(${this.cols}, 1fr)`;
    el.innerHTML = '';

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = document.createElement('div');
        cell.className = 'ne-cell';
        cell.dataset.row = r;
        cell.dataset.col = c;

        if (this.eliminated[r][c]) {
          cell.classList.add('ne-empty');
        } else {
          cell.textContent = this.grid[r][c];
        }
        el.appendChild(cell);
      }
    }
    this.updateHUD();
  }

  attachEvents() {
    const grid = document.getElementById('numElimGrid');
    if (!grid) return;

    this._onMouseDown = (e) => { if (!this._gameOver) this._handleStart(e); };
    this._onMouseMove = (e) => { if (!this._gameOver) this._handleMove(e); };
    this._onMouseUp = () => { if (!this._gameOver) this._handleEnd(); };
    this._onTouchStart = (e) => {
      e.preventDefault();
      if (!this._gameOver) this._handleStart(e.touches[0]);
    };
    this._onTouchMove = (e) => {
      e.preventDefault();
      if (!this._gameOver) this._handleMove(e.touches[0]);
    };
    this._onTouchEnd = () => { if (!this._gameOver) this._handleEnd(); };

    grid.addEventListener('mousedown', this._onMouseDown);
    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('mouseup', this._onMouseUp);
    grid.addEventListener('touchstart', this._onTouchStart, { passive: false });
    document.addEventListener('touchmove', this._onTouchMove, { passive: false });
    document.addEventListener('touchend', this._onTouchEnd);
  }

  destroy() {
    this._destroyed = true;
    if (this._timerInterval) clearInterval(this._timerInterval);
    if (this._hintTimer) clearTimeout(this._hintTimer);
    const grid = document.getElementById('numElimGrid');
    if (grid) {
      grid.removeEventListener('mousedown', this._onMouseDown);
      document.removeEventListener('mousemove', this._onMouseMove);
      document.removeEventListener('mouseup', this._onMouseUp);
      grid.removeEventListener('touchstart', this._onTouchStart);
      document.removeEventListener('touchmove', this._onTouchMove);
      document.removeEventListener('touchend', this._onTouchEnd);
    }
  }

  // ---- 倒计时 ----
  _startTimer() {
    const timerEl = document.getElementById('numElimTimer');
    this._timerInterval = setInterval(() => {
      if (this._destroyed || this._gameOver) return;
      this.timeLeft--;
      this._updateFuse();
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this._gameOver = true;
        clearInterval(this._timerInterval);
        setTimeout(() => this._showTimeUp(), 400);
      }
    }, 1000);
  }

  // ---- 炸弹引线 ----
  _updateFuse() {
    const pct = this.timeLeft / TOTAL_TIME;
    const fuseFill = document.getElementById('fuseFill');
    const fuseSpark = document.getElementById('fuseSpark');
    const fuseBomb = document.getElementById('fuseBomb');
    const timerEl = document.getElementById('numElimTimer');
    if (!fuseFill) return;

    // 引线从右向左燃烧
    fuseFill.style.width = (pct * 100) + '%';
    fuseSpark.style.left = (pct * 100) + '%';

    // 时间颜色
    if (this.timeLeft <= 30) {
      fuseFill.style.background = 'linear-gradient(90deg, #ff4444, #ff6b6b)';
      fuseSpark.style.background = '#ff0000';
      fuseBomb.classList.add('danger');
    } else if (this.timeLeft <= 60) {
      fuseFill.style.background = 'linear-gradient(90deg, #ffa500, #ff6347)';
      fuseBomb.classList.remove('danger');
    } else {
      fuseFill.style.background = 'linear-gradient(90deg, #22c55e, #4ade80)';
      fuseBomb.classList.remove('danger');
    }

    timerEl.textContent = this._formatTime(this.timeLeft);
  }

  _formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  // ---- 交互 ----
  _cellFromPoint(clientX, clientY) {
    const el = document.elementFromPoint(clientX, clientY);
    if (!el) return null;
    const cellEl = el.closest('.ne-cell');
    if (!cellEl) return null;
    const row = parseInt(cellEl.dataset.row);
    const col = parseInt(cellEl.dataset.col);
    if (isNaN(row) || isNaN(col)) return null;
    return { row, col, el: cellEl };
  }

  _handleStart(point) {
    if (this._gameOver) return;
    // 兼容 mouse event 和 touch event
    const clientX = point.clientX || (point.touches && point.touches[0]?.clientX);
    const clientY = point.clientY || (point.touches && point.touches[0]?.clientY);

    const target = point.target ? point.target.closest('.ne-cell') : null;
    if (!target) {
      const cell = this._cellFromPoint(clientX || 0, clientY || 0);
      if (!cell || this.eliminated[cell.row][cell.col]) return;
      this.isSelecting = true;
      this.startCell = cell;
      this.currentCell = cell;
    } else {
      const row = parseInt(target.dataset.row);
      const col = parseInt(target.dataset.col);
      if (isNaN(row) || isNaN(col) || this.eliminated[row][col]) return;
      this.isSelecting = true;
      this.startCell = { row, col, el: target };
      this.currentCell = { row, col, el: target };
    }
    playClick();
    this.updateSelection();
  }

  _handleMove(point) {
    if (!this.isSelecting || this._gameOver) return;
    const clientX = point.clientX || (point.touches && point.touches[0]?.clientX);
    const clientY = point.clientY || (point.touches && point.touches[0]?.clientY);
    const cell = this._cellFromPoint(clientX || 0, clientY || 0);
    if (!cell || this.eliminated[cell.row][cell.col]) return;
    if (this.currentCell && this.currentCell.row === cell.row && this.currentCell.col === cell.col) return;
    this.currentCell = cell;
    this.updateSelection();
  }

  _handleEnd() {
    if (!this.isSelecting || this._gameOver) return;
    this.isSelecting = false;
    this.checkElimination();
    this.clearSelection();
  }

  updateSelection() {
    document.querySelectorAll('.ne-cell.selected').forEach(el => el.classList.remove('selected'));
    if (!this.startCell || !this.currentCell) return;

    const minRow = Math.min(this.startCell.row, this.currentCell.row);
    const maxRow = Math.max(this.startCell.row, this.currentCell.row);
    const minCol = Math.min(this.startCell.col, this.currentCell.col);
    const maxCol = Math.max(this.startCell.col, this.currentCell.col);

    this.selectedCells = [];
    let sum = 0;
    const grid = document.getElementById('numElimGrid');

    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        if (!this.eliminated[r][c]) {
          const cellEl = grid.querySelector(`.ne-cell[data-row="${r}"][data-col="${c}"]`);
          if (cellEl) {
            cellEl.classList.add('selected');
            this.selectedCells.push({ row: r, col: c, el: cellEl });
            sum += this.grid[r][c];
          }
        }
      }
    }

    const sumEl = document.getElementById('numElimSum');
    if (this.selectedCells.length > 0) {
      sumEl.textContent = `和: ${sum}`;
      sumEl.classList.add('show');
      if (sum === 10) sumEl.classList.add('valid');
      else sumEl.classList.remove('valid');
    }
  }

  clearSelection() {
    document.querySelectorAll('.ne-cell.selected').forEach(el => el.classList.remove('selected'));
    const sumEl = document.getElementById('numElimSum');
    if (sumEl) sumEl.classList.remove('show', 'valid');
    this.selectedCells = [];
    this.startCell = null;
    this.currentCell = null;
  }

  checkElimination() {
    if (this.selectedCells.length === 0) return;

    let sum = 0;
    for (const cell of this.selectedCells) {
      sum += this.grid[cell.row][cell.col];
    }

    if (sum === 10) {
      this.combo++;
      this.score += 2; // 每次消除得2分
      this.moves++;

      for (const cell of this.selectedCells) {
        this.eliminated[cell.row][cell.col] = true;
        cell.el.classList.add('ne-eliminated');
        cell.el.classList.add('ne-empty');
        const elRef = cell.el;
        setTimeout(() => { if (!this._destroyed) elRef.textContent = ''; }, 400);
      }
      playMatch();

      // 连击加分
      if (this.combo >= 3) {
        this.score += this.combo; // 连击额外加分
        setTimeout(() => playPowerup(), 100);
      }

      this.updateHUD();

      // 消除时火花闪烁
      const spark = document.getElementById('fuseSpark');
      if (spark) {
        spark.classList.add('burst');
        setTimeout(() => spark.classList.remove('burst'), 300);
      }

      if (this.checkWin()) {
        this._gameOver = true;
        clearInterval(this._timerInterval);
        setTimeout(() => this._showVictory(), 500);
      }
    } else {
      this.combo = 0;
      const sumEl = document.getElementById('numElimSum');
      if (sumEl) {
        sumEl.classList.add('invalid-shake');
        setTimeout(() => sumEl.classList.remove('invalid-shake'), 400);
      }
    }
  }

  checkWin() {
    for (let r = 0; r < this.rows; r++)
      for (let c = 0; c < this.cols; c++)
        if (!this.eliminated[r][c]) return false;
    return true;
  }

  updateHUD() {
    let remaining = 0;
    for (let r = 0; r < this.rows; r++)
      for (let c = 0; c < this.cols; c++)
        if (!this.eliminated[r][c]) remaining++;

    document.getElementById('scoreDisplay').textContent = this.score;
    document.getElementById('scoreLabel').textContent = '✨ 得分';
    document.getElementById('scoreSubDisplay').textContent = `剩余 ${remaining} · 消除 ${this.moves} 次`;
    document.getElementById('levelDisplay').textContent = `🔥 ${this.combo}连`;
  }

  // ---- 评价系统 ----
  _getRating() {
    for (const r of RATINGS) {
      if (this.score >= r.score) return r;
    }
    return RATINGS[RATINGS.length - 1];
  }

  _showTimeUp() {
    const rating = this._getRating();
    document.getElementById('resultIcon').textContent = '💣';
    document.getElementById('resultTitle').textContent = rating.title;
    document.getElementById('resultTitle').style.color = rating.color;
    document.getElementById('resultScore').textContent = this.score;
    document.getElementById('resultDetail').textContent = `时间到！消除 ${this.moves} 次`;
    document.getElementById('resultCombo').textContent =
      this.score >= 160 ? '🌟 你是小闹女王！太强了！' : '';

    const starsEl = document.getElementById('resultStars');
    const starCount = this.score >= 160 ? 3 : this.score >= 120 ? 2 : this.score >= 60 ? 1 : 0;
    starsEl.querySelectorAll('.star').forEach((s, i) => {
      s.classList.toggle('active', i < starCount);
    });

    document.getElementById('resultNextBtn').textContent = '👉 再来一局';
    document.getElementById('resultOverlay').classList.add('active');
  }

  _showVictory() {
    const rating = this._getRating();
    playVictory();
    document.getElementById('resultIcon').textContent = '🎉';
    document.getElementById('resultTitle').textContent = rating.title;
    document.getElementById('resultTitle').style.color = rating.color;
    document.getElementById('resultScore').textContent = this.score;
    document.getElementById('resultDetail').textContent =
      `全部消除！用时 ${this._formatTime(TOTAL_TIME - this.timeLeft)} · 消除 ${this.moves} 次`;
    document.getElementById('resultCombo').textContent =
      this.score >= 160 ? '🌟 你是小闹女王！太强了！' : '';

    const starsEl = document.getElementById('resultStars');
    const starCount = this.score >= 160 ? 3 : this.score >= 120 ? 2 : this.score >= 60 ? 1 : 0;
    starsEl.querySelectorAll('.star').forEach((s, i) => {
      s.classList.toggle('active', i < starCount);
    });

    document.getElementById('resultNextBtn').textContent = '👉 再来一局';
    document.getElementById('resultOverlay').classList.add('active');
  }

  // ---- 提示 ----
  showHint() {
    if (this._gameOver) return false;
    if (this._hintTimer) clearTimeout(this._hintTimer);
    for (let r1 = 0; r1 < this.rows; r1++) {
      for (let c1 = 0; c1 < this.cols; c1++) {
        if (this.eliminated[r1][c1]) continue;
        for (let r2 = r1; r2 < this.rows && r2 - r1 < 5; r2++) {
          for (let c2 = c1; c2 < this.cols && c2 - c1 < 5; c2++) {
            let s = 0, ok = true;
            for (let r = r1; r <= r2 && ok; r++)
              for (let c = c1; c <= c2 && ok; c++) {
                if (this.eliminated[r][c]) { ok = false; break; }
                s += this.grid[r][c];
              }
            if (ok && s === 10) {
              for (let r = r1; r <= r2; r++)
                for (let c = c1; c <= c2; c++) {
                  const cellEl = document.querySelector(`.ne-cell[data-row="${r}"][data-col="${c}"]`);
                  if (cellEl) {
                    cellEl.classList.add('ne-hint');
                    this._hintTimer = setTimeout(() => cellEl.classList.remove('ne-hint'), 1800);
                  }
                }
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  shuffle() { this.generateGrid(); this.render(); this.combo = 0; return true; }
  useBomb() { return false; }
  useUndo() { return false; }
  useFreeze() { return false; }

  getState() {
    return { mode: 'numberElim', score: this.score, level: this.level, timeLeft: this.timeLeft };
  }
}
