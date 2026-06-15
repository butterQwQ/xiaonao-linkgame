// ============================================================
// 照片自定义 & 兑换码系统
// ============================================================

import { IMG_FILES, IMG_PATH, POWERUPS, VALID_CODES } from './config.js';
import { state } from './state.js';
import { powerupState, updateToolbar } from './powerups.js';
import { render } from './ui/render.js';
import { playClick, playVictory } from './audio.js';

// --- Photo customization ---
export function openPhotos() {
  playClick();
  buildPhotoGrid();
  document.getElementById('photoOverlay').classList.add('active');
}

function buildPhotoGrid() {
  const grid = document.getElementById('photoGrid');
  if (!grid) return;
  grid.innerHTML = '';

  for (let i = 0; i < IMG_FILES.length; i++) {
    const item = document.createElement('div');
    item.className = 'photo-grid-item' +
      (i === state.selectedPhotoIdx ? ' active' : '') +
      (state.customImages[i] ? ' replaced' : '');
    const img = document.createElement('img');
    img.src = state.customImages[i] ? '' : (IMG_PATH + IMG_FILES[i]);
    if (state.customImages[i]) {
      // Use the canvas as image source
      img.src = state.customImages[i].toDataURL ? state.customImages[i].toDataURL() : '';
    }
    img.onerror = () => { img.src = ''; };
    item.appendChild(img);
    if (state.customImages[i]) {
      const badge = document.createElement('div');
      badge.className = 'replace-badge';
      badge.textContent = '📸 自定义';
      item.appendChild(badge);
    }
    item.onclick = () => {
      state.selectedPhotoIdx = i;
      buildPhotoGrid();
      document.getElementById('cropArea').style.display = 'none';
    };
    grid.appendChild(item);
  }
}

export function handlePhotoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    state.uploadedImageData = e.target.result;
    const cropArea = document.getElementById('cropArea');
    cropArea.style.display = 'block';

    const cropCanvas = document.getElementById('cropCanvas');
    const img = new Image();
    img.onload = () => {
      cropCanvas.width = 280;
      cropCanvas.height = 280;
      const cctx = cropCanvas.getContext('2d');
      const size = Math.min(img.width, img.height);
      const sx = (img.width - size) / 2;
      const sy = (img.height - size) / 2;
      cctx.fillStyle = '#FFF0F5';
      cctx.fillRect(0, 0, 280, 280);
      cctx.beginPath();
      cctx.roundRect(10, 10, 260, 260, 30);
      cctx.clip();
      cctx.drawImage(img, sx, sy, size, size, 10, 10, 260, 260);
      cctx.strokeStyle = '#FF69B4';
      cctx.lineWidth = 3;
      cctx.beginPath();
      cctx.roundRect(10, 10, 260, 260, 30);
      cctx.stroke();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}

export function confirmCrop() {
  if (state.selectedPhotoIdx < 0 || state.selectedPhotoIdx >= IMG_FILES.length) {
    alert('请先点击选择要替换的方块位置！');
    return;
  }

  const cropCanvas = document.getElementById('cropCanvas');
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = 100;
  finalCanvas.height = 100;
  const fctx = finalCanvas.getContext('2d');
  fctx.drawImage(cropCanvas, 0, 0, 280, 280, 0, 0, 100, 100);

  state.customImages[state.selectedPhotoIdx] = finalCanvas;
  document.getElementById('cropArea').style.display = 'none';
  buildPhotoGrid();

  if (state.game) render();
  playClick();
}

// --- Redemption code ---
export function openRedeem() {
  playClick();
  document.getElementById('redeemResult').textContent = '';
  document.getElementById('codeInput').value = '';
  document.getElementById('redeemOverlay').classList.add('active');
}

export function redeemCode() {
  const code = document.getElementById('codeInput').value.trim();
  const result = document.getElementById('redeemResult');

  if (!code) {
    result.textContent = '💔 请输入兑换码';
    result.style.color = '#FF6347';
    return;
  }

  if (VALID_CODES[code]) {
    POWERUPS.forEach(pu => {
      powerupState[pu.id] = (powerupState[pu.id] || 0) + 3;
    });
    result.innerHTML = VALID_CODES[code] + '<br>🔀洗牌×3 💡提示×3 🔍透视×3 ❄️冻结×3 💣炸弹×3 🔄撤销×3';
    result.style.color = '#FF1493';
    playVictory();
    if (state.game) { updateToolbar(); render(); }
  } else {
    result.textContent = '💔 兑换码无效，请检查后重试';
    result.style.color = '#FF6347';
  }
}

export function closeOverlay(id) {
  document.getElementById(id).classList.remove('active');
  state.pendingBombTarget = false;
}
