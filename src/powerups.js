// ============================================================
// 道具系统
// ============================================================

import { POWERUPS } from '../config.js';
import { state } from '../state.js';
import { FloatText } from '../particles.js';
import { render } from '../ui/render.js';

export const powerupState = {
  shuffle: 3,
  hint: 3,
  magnifier: 1,
  freeze: 2,
  bomb: 2,
  undo: 3
};

export function resetPowerups() {
  powerupState.shuffle = 3;
  powerupState.hint = 3;
  powerupState.magnifier = 1;
  powerupState.freeze = 2;
  powerupState.bomb = 2;
  powerupState.undo = 3;
}

export function updateToolbar() {
  const bar = document.getElementById('gameToolbar');
  if (!bar) return;
  bar.innerHTML = '';
  POWERUPS.forEach(pu => {
    const cnt = powerupState[pu.id] || 0;
    const wrap = document.createElement('div');
    wrap.className = 'tool-btn-wrap';
    const btn = document.createElement('button');
    btn.className = 'tool-btn';
    btn.innerHTML =
      `<span class="tool-icon">${pu.icon}</span>` +
      `<span class="tool-name">${pu.name}</span>`;
    if (cnt > 0) {
      const badge = document.createElement('span');
      badge.className = 'tool-count';
      badge.textContent = cnt;
      wrap.appendChild(badge);
    }
    btn.onclick = (e) => usePowerup(pu.id, e);
    wrap.appendChild(btn);
    bar.appendChild(wrap);
  });
}

export function usePowerup(id, _e) {
  const game = state.game;
  if (!game || game.frozen) return;
  if (powerupState[id] <= 0) {
    state.floatTexts.push(new FloatText(state.canvasW / 2, state.canvasH / 2, '💔 道具不足', '#FF6347'));
    return;
  }

  let result;
  switch (id) {
    case 'shuffle':
      result = game.shuffle();
      if (result) powerupState.shuffle--;
      break;
    case 'hint':
      result = game.showHint();
      if (result) powerupState.hint--;
      break;
    case 'magnifier':
      if (game.mode === 'classic') {
        result = game.useMagnifier();
        if (result) powerupState.magnifier--;
      } else {
        result = game.showHint();
        if (result) powerupState.hint--;
      }
      break;
    case 'freeze':
      result = game.useFreeze();
      if (result) powerupState.freeze--;
      break;
    case 'bomb':
      state.pendingBombTarget = true;
      state.floatTexts.push(new FloatText(state.canvasW / 2, state.canvasH / 2, '💣 点击要消除的方块!', '#FF6347'));
      return;
    case 'undo':
      result = game.useUndo();
      if (result) powerupState.undo--;
      break;
  }
  render();
}

export function useHint() {
  usePowerup('hint');
}
