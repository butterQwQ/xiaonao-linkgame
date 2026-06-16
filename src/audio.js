// ============================================================
// 音效系统 — 柔和悦耳版 🎵
// ============================================================

let audioCtx = null;

// C 大调五声音阶 (Pentatonic) — 天然悦耳
const PENTA = [262, 294, 330, 392, 440, 523, 587, 659, 784, 880, 1047, 1175, 1319, 1568, 1760];

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

/**
 * 播放一个柔和音色
 * @param {number} freq - 基频
 * @param {number} duration - 持续秒数
 * @param {number} vol - 峰值音量 (0~1)
 */
function playBell(freq, duration, vol = 0.07) {
  try {
    const ctx = getAudioCtx();
    const now = ctx.currentTime;

    // --- 主音色：正弦波 + 轻柔包络 ---
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;

    // 柔和 ADSR 包络
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.01);           // attack
    gain.gain.setValueAtTime(vol, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(vol * 0.4, now + 0.08); // decay
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration); // release

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.05);

    // --- 泛音层：高八度微弱叠加，增添空灵感 ---
    if (duration > 0.08) {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.value = freq * 2;
      gain2.gain.setValueAtTime(0, now);
      gain2.gain.linearRampToValueAtTime(vol * 0.25, now + 0.02);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.7);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now);
      osc2.stop(now + duration + 0.05);
    }
  } catch (e) { /* ignore */ }
}

/**
 * 播放多音符琶音
 */
function playArpeggio(notes, interval, vol = 0.07) {
  notes.forEach((freq, i) => {
    setTimeout(() => playBell(freq, 0.3, vol), i * interval);
  });
}

// ==================== 背景音乐系统 ====================

/**
 * BGM 文件配置 —— 把你的音乐文件放到 public/audio/ 下面，改这里的文件名即可
 * 支持 .mp3 / .ogg / .wav
 */
export const BGM_TRACKS = {
  menu:       '/audio/bgm_menu.mp3',
  classic:    '/audio/bgm_classic.mp3',
  match3:     '/audio/bgm_match3.mp3',
  numberElim: '/audio/bgm_numberelim.mp3',
};

let _bgmAudio = null;
let _bgmOn = true;
let _bgmVolume = 0.35;

/** 解锁音频（首次用户点击后调用） */
export function unlockAudio() {
  try { getAudioCtx().resume(); } catch (e) { /* ignore */ }
}

/** 播放指定 BGM（循环） */
export function playBGM(key) {
  unlockAudio();
  stopBGM();
  if (!_bgmOn) return;
  const src = BGM_TRACKS[key];
  if (!src) return;
  _bgmAudio = new Audio();
  _bgmAudio.src = src;
  _bgmAudio.loop = true;
  _bgmAudio.volume = _bgmVolume;
  _bgmAudio.play().catch(() => {});
}

/** 停止 BGM */
export function stopBGM() {
  if (_bgmAudio) {
    _bgmAudio.pause();
    _bgmAudio.currentTime = 0;
    _bgmAudio = null;
  }
}

/** 切换开关，返回当前状态 */
export function toggleBGM() {
  _bgmOn = !_bgmOn;
  if (!_bgmOn) stopBGM();
  return _bgmOn;
}

export function isBGMOn() { return _bgmOn; }

export function setBGMVolume(v) {
  _bgmVolume = Math.max(0, Math.min(1, v));
  if (_bgmAudio) _bgmAudio.volume = _bgmVolume;
}

// ==================== 各场景音效 ====================

/** 点击方块 — 轻巧短促 */
export function playClick() {
  playBell(660, 0.1, 0.06);
  setTimeout(() => playBell(880, 0.08, 0.03), 25);
}

/** 配对消除 — 轻快上行 */
export function playMatch() {
  playArpeggio([PENTA[5], PENTA[7], PENTA[9]], 60, 0.06);
}

/** 连击音效 — 音高随连击数上升，越来越辉煌 */
export function playCombo(n) {
  const idx = Math.min(5 + n, PENTA.length - 3);
  playBell(PENTA[idx], 0.3, 0.07);
  setTimeout(() => playBell(PENTA[idx + 2], 0.25, 0.05), 80);
  if (n >= 5) {
    setTimeout(() => playBell(PENTA[idx + 3], 0.35, 0.04), 160);
  }
}

/** 道具使用 — 魔法感上升 */
export function playPowerup() {
  playArpeggio([PENTA[3], PENTA[5], PENTA[7], PENTA[10]], 50, 0.05);
}

/** 特殊方块触发 — 更有冲击力但不刺耳 */
export function playSpecial() {
  playBell(PENTA[4], 0.25, 0.07);
  setTimeout(() => playBell(PENTA[8], 0.25, 0.06), 80);
  setTimeout(() => playBell(PENTA[11], 0.3, 0.05), 160);
}

/** 通关胜利 — 完整的上行音阶 */
export function playVictory() {
  const melody = [PENTA[5], PENTA[6], PENTA[7], PENTA[9], PENTA[10], PENTA[12]];
  melody.forEach((freq, i) => {
    setTimeout(() => playBell(freq, 0.35, 0.06), i * 90);
  });
  // 结束和弦
  setTimeout(() => {
    playBell(PENTA[5], 0.6, 0.04);
    playBell(PENTA[9], 0.6, 0.04);
    playBell(PENTA[12], 0.6, 0.03);
  }, melody.length * 90);
}

/** 星星奖励 — 清脆闪光 */
export function playStar() {
  playBell(1568, 0.2, 0.04);
  setTimeout(() => playBell(1760, 0.15, 0.03), 60);
}
