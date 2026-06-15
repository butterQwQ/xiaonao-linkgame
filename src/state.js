// ============================================================
// 全局共享状态
// ============================================================

export const SWIPE_THRESHOLD = 15;

export const state = {
  game: null,
  mode: null,
  canvas: null,
  ctx: null,
  canvasW: 0,
  canvasH: 0,
  animFrameId: null,
  particles: [],
  floatTexts: [],
  isProcessing: false,
  swapAnimation: null,
  fallingBlocks: [],
  touchStartPos: null,
  dragTarget: null,
  images: [],
  customImages: {},
  loadedImageCount: 0,
  pendingBombTarget: false,
  selectedPhotoIdx: -1,
  uploadedImageData: null,
};
