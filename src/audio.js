// ============================================================
// 音效系统
// ============================================================

let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

export function playTone(freq, duration, type = 'sine', vol = 0.15) {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch (e) { /* ignore */ }
}

export function playClick() { playTone(800, 0.08, 'sine', 0.1); }

export function playMatch() {
  playTone(523, 0.12, 'sine', 0.12);
  setTimeout(() => playTone(659, 0.12, 'sine', 0.1), 80);
  setTimeout(() => playTone(784, 0.15, 'sine', 0.1), 160);
}

export function playCombo(n) {
  const base = 523 + n * 50;
  playTone(base, 0.15, 'sine', 0.12);
  setTimeout(() => playTone(base + 100, 0.15, 'sine', 0.1), 100);
}

export function playPowerup() {
  playTone(880, 0.1, 'sine', 0.1);
  setTimeout(() => playTone(1100, 0.1, 'sine', 0.1), 70);
  setTimeout(() => playTone(1320, 0.15, 'sine', 0.1), 140);
}

export function playSpecial() {
  playTone(660, 0.15, 'triangle', 0.12);
  setTimeout(() => playTone(880, 0.15, 'triangle', 0.1), 100);
  setTimeout(() => playTone(1100, 0.2, 'triangle', 0.1), 200);
}

export function playVictory() {
  const notes = [523, 587, 659, 784, 880, 1047];
  notes.forEach((n, i) => setTimeout(() => playTone(n, 0.2, 'sine', 0.1), i * 100));
}

export function playStar() { playTone(1200, 0.15, 'sine', 0.08); }
