// ============================================================
// 游戏配置与常量
// ============================================================

export const CONFIG = {
  classic: { rows: 8, cols: 12, blockSize: 52, minBlockTypes: 10 },
  match3: { rows: 8, cols: 8, blockSize: 56, minBlockTypes: 6 }
};

export const IMG_PATH = 'picture/';
export const IMG_FILES = [
  '0adbfc29e42c79ea7950b66cfc152d28.jpg',
  '2683e7850cf9e4b9704dca817d065f8a.jpg',
  '28a22cd3fa4350c50777055aa6e6a928.jpg',
  '37f3e1e3b3d16b2907ae9f3d8bb082d5.jpg',
  '5a0b1fce01b1a35437c842e0c92aec2a.jpg',
  '865de6b4a056f2b7e1ab24c7dc1aaf82.jpg',
  'a5d83207c7185f4f7df29059cfff1866.jpg',
  'a68a98b454d574db4224e24584e80c85.jpg',
  'b273c5a72d226616e892f7b0e0d5ea35.jpg',
  'cc9bbdecfe144248b6ff6fb5748e6c64.jpg'
];

export const SPECIAL_TYPES = ['line_h', 'line_v', 'bomb', 'rainbow'];

// 🌈 马卡龙色系 — 每个方块类型对应一个柔和的边框颜色
export const MACARON_COLORS = [
  '#FFB7C5', '#B5EAD7', '#C7CEEA', '#FFDAC1', '#E2F0CB',
  '#F3E5AB', '#D4A5A5', '#9ED2C6', '#F5B7B1', '#D5AAFF'
];

export const POWERUPS = [
  { id: 'shuffle', icon: '🔀', name: '洗牌', desc: '打乱所有方块位置' },
  { id: 'hint', icon: '💡', name: '提示', desc: '高亮显示一对可消除方块' },
  { id: 'magnifier', icon: '🔍', name: '透视', desc: '暂时显示所有可消除对' },
  { id: 'freeze', icon: '❄️', name: '冻结', desc: '暂停游戏状态15秒' },
  { id: 'bomb', icon: '💣', name: '炸弹', desc: '直接消除选中的方块' },
  { id: 'undo', icon: '🔄', name: '撤销', desc: '回退上一步操作' }
];

export const VALID_CODES = {
  '豆豆爱闹闹': '🎉 恭喜兑换成功！获得全部道具各+3！'
};
