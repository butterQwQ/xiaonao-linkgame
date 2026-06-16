// ============================================================
// 数字消除游戏 — 框选数字使和为10
// ============================================================

import { state } from '../state.js';
import { playClick, playMatch, playVictory } from '../audio.js';
import { FloatText } from '../particles.js';

export class NumberElimGame {
  constructor() {
    this.mode = 'numberElim';
    this.rows = 16;
    this.cols = 12;
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
    this._hintTimer = null;
    this._destroyed = false;

    this.generateGrid();
    this.render();
    this.attachEvents();
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

    this._onMouseDown = (e) => this._handleStart(e);
    this._onMouseMove = (e) => this._handleMove(e);
    this._onMouseUp = (e) => this._handleEnd(e);
    this._onTouchStart = (e) => { e.preventDefault(); this._handleStart(e.touches[0]); };
    this._onTouchMove = (e) => { e.preventDefault(); this._handleMove(e.touches[0]); };
    this._onTouchEnd = () => this._handleEnd();

    grid.addEventListener('mousedown', this._onMouseDown);
    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('mouseup', this._onMouseUp);
    grid.addEventListener('touchstart', this._onTouchStart, { passive: false });
    document.addEventListener('touchmove', this._onTouchMove, { passive: false });
    document.addEventListener('touchend', this._onTouchEnd);
  }

  destroy() {
    this._destroyed = true;
    const grid = document.getElementById('numElimGrid');
    if (grid) {
      grid.removeEventListener('mousedown', this._onMouseDown);
      document.removeEventListener('mousemove', this._onMouseMove);
      document.removeEventListener('mouseup', this._onMouseUp);
      grid.removeEventListener('touchstart', this._onTouchStart);
      document.removeEventListener('touchmove', this._onTouchMove);
      document.removeEventListener('touchend', this._onTouchEnd);
    }
    if (this._hintTimer) clearTimeout(this._hintTimer);
  }

  _cellFromPoint(clientX, clientY) {
    const el = document.elementFromPoint(clientX, clientY);
    if (!el) return null;
    const cellEl = el.closest('.ne-cell');
    if (!cellEl) return null;
    const row = parseInt(cellEl.dataset.row);
    const col = parseInt(cellEl.dataset.col);
    return { row, col, el: cellEl };
  }

  _handleStart(point) {
    const target = point.target ? point.target.closest('.ne-cell') : null;
    if (!target) {
      const cell = this._cellFromPoint(point.clientX, point.clientY);
      if (!cell) return;
      if (this.eliminated[cell.row][cell.col]) return;
      this.isSelecting = true;
      this.startCell = cell;
      this.currentCell = cell;
    } else {
      const row = parseInt(target.dataset.row);
      const col = parseInt(target.dataset.col);
      if (this.eliminated[row][col]) return;
      this.isSelecting = true;
      this.startCell = { row, col, el: target };
      this.currentCell = { row, col, el: target };
    }
    playClick();
    this.updateSelection();
  }

  _handleMove(point) {
    if (!this.isSelecting) return;
    const cell = this._cellFromPoint(point.clientX, point.clientY);
    if (!cell || this.eliminated[cell.row][cell.col]) return;
    // 只在行列变化时才更新，减少渲染
    if (this.currentCell && this.currentCell.row === cell.row && this.currentCell.col === cell.col) return;
    this.currentCell = cell;
    this.updateSelection();
  }

  _handleEnd() {
    if (!this.isSelecting) return;
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
    sumEl.classList.remove('show', 'valid');
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
      const bonus = Math.min(this.combo, 5);
      this.score += this.selectedCells.length * 10 * bonus;

      for (const cell of this.selectedCells) {
        this.eliminated[cell.row][cell.col] = true;
        cell.el.classList.add('ne-eliminated');
        cell.el.classList.add('ne-empty');
        setTimeout(() => { if (!this._destroyed) cell.el.textContent = ''; }, 400);
      }
      this.moves++;
      playMatch();
      this.updateHUD();

      if (this.combo >= 3) {
        setTimeout(() => playVictory(), 100);
      }

      if (this.checkWin()) {
        setTimeout(() => this.showResult(), 500);
      }
    } else {
      this.combo = 0;
      state.floatTexts.push(new FloatText(state.canvasW || 200, state.canvasH || 100, `和为${sum}，不等于10`, '#FF6347'));
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
    document.getElementById('levelDisplay').textContent = `Lv.${this.level}`;
  }

  showHint() {
    if (this._hintTimer) clearTimeout(this._hintTimer);
    for (let r1 = 0; r1 < this.rows; r1++) {
      for (let c1 = 0; c1 < this.cols; c1++) {
        if (this.eliminated[r1][c1]) continue;
        for (let r2 = r1; r2 < this.rows && r2 - r1 < 6; r2++) {
          for (let c2 = c1; c2 < this.cols && c2 - c1 < 6; c2++) {
            let sum = 0, allValid = true;
            for (let r = r1; r <= r2 && allValid; r++)
              for (let c = c1; c <= c2 && allValid; c++) {
                if (this.eliminated[r][c]) { allValid = false; break; }
                sum += this.grid[r][c];
              }
            if (allValid && sum === 10) {
              for (let r = r1; r <= r2; r++)
                for (let c = c1; c <= c2; c++) {
                  const cellEl = document.querySelector(`.ne-cell[data-row="${r}"][data-col="${c}"]`);
                  if (cellEl) {
                    cellEl.classList.add('ne-hint');
                    setTimeout(() => cellEl.classList.remove('ne-hint'), 1500);
                  }
                }
              return true;
            }
          }
        }
      }
    }
    state.floatTexts.push(new FloatText(state.canvasW || 200, state.canvasH || 100, '当前无可消除组合', '#FF6347'));
    return false;
  }

  shuffle() {
    this.generateGrid();
    this.render();
    this.combo = 0;
    return true;
  }

  useBomb(row, col) {
    if (this.eliminated[row][col]) return false;
    this.eliminated[row][col] = true;
    this.score += 5;
    this.render();
    return true;
  }

  useUndo() { return this.shuffle(); }
  useFreeze() { return false; }

  showResult() {
    playVictory();
    document.getElementById('resultIcon').textContent = '🎉';
    document.getElementById('resultTitle').textContent = '🎀 恭喜通关！';
    document.getElementById('resultScore').textContent = this.score;
    document.getElementById('resultDetail').textContent = `消除 ${this.moves} 次 · 得分 ${this.score}`;
    document.getElementById('resultCombo').textContent = '';
    document.getElementById('resultNextBtn').textContent = '👉 再玩一次';
    document.getElementById('resultOverlay').classList.add('active');
  }

  getState() {
    return { mode: 'numberElim', score: this.score, level: this.level };
  }
}
