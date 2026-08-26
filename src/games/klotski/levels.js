// 华容道关卡数据
// 参考计客超级华容道：经典华容道 + 数字华容道 两大模式
//
// 经典华容道：4列 x 5行棋盘，底部留2格宽出口
//   棋子类型：
//     1x1  — 兵
//     1x2  — 竖将
//     2x1  — 横将
//     2x2  — 曹操（目标棋子，需移至底部出口）
//   每关定义棋子列表：{ type, name, row, col }
//   row/col 为棋子左上角在棋盘中的坐标（0-indexed）
//
// 数字华容道：4x4 或 3x3 网格，缺一格作为滑动空间
//   将数字按顺序排列即通关

// ==================== 经典华容道 ====================

// 棋子颜色
export const PIECE_COLORS = {
  caocao: 0xe85d4a,    // 曹操 — 橙红
  general_h: 0x5b8def, // 横将 — 蓝
  general_v: 0x4caf73,  // 竖将 — 绿
  soldier: 0xf1c40f,   // 兵 — 黄
  guan: 0x9c4aef,      // 关羽（横刀） — 紫
};

// 棋子尺寸映射
export const PIECE_SIZES = {
  '1x1': { w: 1, h: 1 },
  '1x2': { w: 1, h: 2 },
  '2x1': { w: 2, h: 1 },
  '2x2': { w: 2, h: 2 },
};

// 经典华容道关卡集合
export const CLASSIC_LEVELS = [
  // ---- 1 ---- 入门
  {
    name: '初出茅庐',
    difficulty: 1,
    minSteps: 12,
    pieces: [
      { type: '2x2', name: '曹操', row: 0, col: 1, color: PIECE_COLORS.caocao },
      { type: '1x2', name: '张飞', row: 0, col: 0, color: PIECE_COLORS.general_v },
      { type: '1x2', name: '赵云', row: 0, col: 3, color: PIECE_COLORS.general_v },
      { type: '2x1', name: '关羽', row: 2, col: 0, color: PIECE_COLORS.guan },
      { type: '1x1', name: '卒', row: 2, col: 2, color: PIECE_COLORS.soldier },
      { type: '1x1', name: '卒', row: 2, col: 3, color: PIECE_COLORS.soldier },
      { type: '1x1', name: '卒', row: 3, col: 0, color: PIECE_COLORS.soldier },
      { type: '1x1', name: '卒', row: 3, col: 1, color: PIECE_COLORS.soldier },
      { type: '1x1', name: '卒', row: 3, col: 2, color: PIECE_COLORS.soldier },
      { type: '1x1', name: '卒', row: 3, col: 3, color: PIECE_COLORS.soldier },
    ],
  },
  // ---- 2 ---- 简易
  {
    name: '小试牛刀',
    difficulty: 1,
    minSteps: 20,
    pieces: [
      { type: '2x2', name: '曹操', row: 0, col: 0, color: PIECE_COLORS.caocao },
      { type: '2x1', name: '关羽', row: 0, col: 2, color: PIECE_COLORS.guan },
      { type: '1x1', name: '卒', row: 2, col: 0, color: PIECE_COLORS.soldier },
      { type: '1x1', name: '卒', row: 2, col: 1, color: PIECE_COLORS.soldier },
      { type: '1x1', name: '卒', row: 2, col: 2, color: PIECE_COLORS.soldier },
      { type: '1x1', name: '卒', row: 2, col: 3, color: PIECE_COLORS.soldier },
      { type: '1x1', name: '卒', row: 3, col: 0, color: PIECE_COLORS.soldier },
      { type: '1x1', name: '卒', row: 3, col: 1, color: PIECE_COLORS.soldier },
      { type: '1x1', name: '卒', row: 3, col: 2, color: PIECE_COLORS.soldier },
      { type: '1x1', name: '卒', row: 3, col: 3, color: PIECE_COLORS.soldier },
    ],
  },
  // ---- 3 ---- 峰回路转
  {
    name: '峰回路转',
    difficulty: 1,
    minSteps: 35,
    pieces: [
      { type: '2x2', name: '曹操', row: 0, col: 1, color: PIECE_COLORS.caocao },
      { type: '2x1', name: '关羽', row: 0, col: 0, color: PIECE_COLORS.guan },
      { type: '1x2', name: '张飞', row: 0, col: 3, color: PIECE_COLORS.general_v },
      { type: '1x1', name: '卒', row: 2, col: 0, color: PIECE_COLORS.soldier },
      { type: '1x1', name: '卒', row: 2, col: 1, color: PIECE_COLORS.soldier },
      { type: '1x1', name: '卒', row: 2, col: 2, color: PIECE_COLORS.soldier },
      { type: '1x1', name: '卒', row: 3, col: 0, color: PIECE_COLORS.soldier },
      { type: '1x1', name: '卒', row: 3, col: 1, color: PIECE_COLORS.soldier },
      { type: '1x1', name: '卒', row: 3, col: 2, color: PIECE_COLORS.soldier },
      { type: '1x1', name: '卒', row: 3, col: 3, color: PIECE_COLORS.soldier },
    ],
  },
  // ---- 4 ---- 桃花园中
  {
    name: '桃花园中',
    difficulty: 1,
    minSteps: 40,
    pieces: [
      { type: '2x2', name: '曹操', row: 0, col: 1, color: PIECE_COLORS.caocao },
      { type: '1x2', name: '张飞', row: 0, col: 0, color: PIECE_COLORS.general_v },
      { type: '1x2', name: '赵云', row: 0, col: 3, color: PIECE_COLORS.general_v },
      { type: '2x1', name: '关羽', row: 2, col: 1, color: PIECE_COLORS.guan },
      { type: '1x1', name: '卒', row: 2, col: 0, color: PIECE_COLORS.soldier },
      { type: '1x1', name: '卒', row: 2, col: 3, color: PIECE_COLORS.soldier },
      { type: '1x1', name: '卒', row: 3, col: 0, color: PIECE_COLORS.soldier },
      { type: '1x1', name: '卒', row: 3, col: 3, color: PIECE_COLORS.soldier },
      { type: '1x1', name: '卒', row: 4, col: 1, color: PIECE_COLORS.soldier },
      { type: '1x1', name: '卒', row: 4, col: 2, color: PIECE_COLORS.soldier },
    ],
  },
  // ---- 5 ---- 兵分三路
  {
    name: '兵分三路',
    difficulty: 2,
    minSteps: 58,
    pieces: [
      { type: '2x2', name: '曹操', row: 0, col: 1, color: PIECE_COLORS.caocao },
      { type: '1x2', name: '张飞', row: 0, col: 0, color: PIECE_COLORS.general_v },
      { type: '1x2', name: '赵云', row: 0, col: 3, color: PIECE_COLORS.general_v },
      { type: '2x1', name: '关羽', row: 2, col: 0, color: PIECE_COLORS.guan },
      { type: '1x2', name: '马超', row: 3, col: 0, color: PIECE_COLORS.general_v },
      { type: '1x2', name: '黄忠', row: 3, col: 3, color: PIECE_COLORS.general_v },
      { type: '1x1', name: '卒', row: 2, col: 2, color: PIECE_COLORS.soldier },
      { type: '1x1', name: '卒', row: 2, col: 3, color: PIECE_COLORS.soldier },
      { type: '1x1', name: '卒', row: 4, col: 0, color: PIECE_COLORS.soldier },
      { type: '1x1', name: '卒', row: 4, col: 1, color: PIECE_COLORS.soldier },
    ],
  },
  // ---- 6 ---- 齐头并进
  {
    name: '齐头并进',
    difficulty: 2,
    minSteps: 60,
    pieces: [
      { type: '2x2', name: '曹操', row: 0, col: 0, color: PIECE_COLORS.caocao },
      { type: '2x1', name: '关羽', row: 0, col: 2, color: PIECE_COLORS.guan },
      { type: '1x2', name: '张飞', row: 2, col: 0, color: PIECE_COLORS.general_v },
      { type: '1x2', name: '赵云', row: 2, col: 1, color: PIECE_COLORS.general_v },
      { type: '1x2', name: '马超', row: 2, col: 2, color: PIECE_COLORS.general_v },
      { type: '1x2', name: '黄忠', row: 2, col: 3, color: PIECE_COLORS.general_v },
      { type: '1x1', name: '卒', row: 4, col: 0, color: PIECE_COLORS.soldier },
      { type: '1x1', name: '卒', row: 4, col: 1, color: PIECE_COLORS.soldier },
      { type: '1x1', name: '卒', row: 4, col: 2, color: PIECE_COLORS.soldier },
      { type: '1x1', name: '卒', row: 4, col: 3, color: PIECE_COLORS.soldier },
    ],
  },
  // ---- 7 ---- 指挥若定
  {
    name: '指挥若定',
    difficulty: 2,
    minSteps: 70,
    pieces: [
      { type: '2x2', name: '曹操', row: 0, col: 1, color: PIECE_COLORS.caocao },
      { type: '1x2', name: '张飞', row: 0, col: 0, color: PIECE_COLORS.general_v },
      { type: '1x2', name: '赵云', row: 0, col: 3, color: PIECE_COLORS.general_v },
      { type: '2x1', name: '关羽', row: 2, col: 1, color: PIECE_COLORS.guan },
      { type: '1x2', name: '马超', row: 2, col: 0, color: PIECE_COLORS.general_v },
      { type: '1x2', name: '黄忠', row: 2, col: 3, color: PIECE_COLORS.general_v },
      { type: '1x1', name: '卒', row: 3, col: 1, color: PIECE_COLORS.soldier },
      { type: '1x1', name: '卒', row: 3, col: 2, color: PIECE_COLORS.soldier },
      { type: '1x1', name: '卒', row: 4, col: 1, color: PIECE_COLORS.soldier },
      { type: '1x1', name: '卒', row: 4, col: 2, color: PIECE_COLORS.soldier },
    ],
  },
  // ---- 8 ---- 将拥曹营
  {
    name: '将拥曹营',
    difficulty: 3,
    minSteps: 72,
    pieces: [
      { type: '2x2', name: '曹操', row: 0, col: 1, color: PIECE_COLORS.caocao },
      { type: '1x2', name: '张飞', row: 0, col: 0, color: PIECE_COLORS.general_v },
      { type: '1x2', name: '赵云', row: 0, col: 3, color: PIECE_COLORS.general_v },
      { type: '2x1', name: '关羽', row: 2, col: 0, color: PIECE_COLORS.guan },
      { type: '1x2', name: '马超', row: 2, col: 2, color: PIECE_COLORS.general_v },
      { type: '1x2', name: '黄忠', row: 2, col: 3, color: PIECE_COLORS.general_v },
      { type: '1x1', name: '卒', row: 3, col: 0, color: PIECE_COLORS.soldier },
      { type: '1x1', name: '卒', row: 3, col: 1, color: PIECE_COLORS.soldier },
      { type: '1x1', name: '卒', row: 4, col: 0, color: PIECE_COLORS.soldier },
      { type: '1x1', name: '卒', row: 4, col: 1, color: PIECE_COLORS.soldier },
    ],
  },
  // ---- 9 ---- 屏风开路
  {
    name: '屏风开路',
    difficulty: 3,
    minSteps: 75,
    pieces: [
      { type: '2x2', name: '曹操', row: 0, col: 1, color: PIECE_COLORS.caocao },
      { type: '1x2', name: '张飞', row: 0, col: 0, color: PIECE_COLORS.general_v },
      { type: '1x2', name: '赵云', row: 0, col: 3, color: PIECE_COLORS.general_v },
      { type: '1x2', name: '马超', row: 2, col: 0, color: PIECE_COLORS.general_v },
      { type: '1x2', name: '黄忠', row: 2, col: 3, color: PIECE_COLORS.general_v },
      { type: '2x1', name: '关羽', row: 3, col: 1, color: PIECE_COLORS.guan },
      { type: '1x1', name: '卒', row: 4, col: 0, color: PIECE_COLORS.soldier },
      { type: '1x1', name: '卒', row: 4, col: 1, color: PIECE_COLORS.soldier },
      { type: '1x1', name: '卒', row: 4, col: 2, color: PIECE_COLORS.soldier },
      { type: '1x1', name: '卒', row: 4, col: 3, color: PIECE_COLORS.soldier },
    ],
  },
  // ---- 10 ---- 横刀立马（经典名局）
  {
    name: '横刀立马',
    difficulty: 3,
    minSteps: 81,
    pieces: [
      { type: '2x2', name: '曹操', row: 0, col: 1, color: PIECE_COLORS.caocao },
      { type: '2x1', name: '关羽', row: 2, col: 1, color: PIECE_COLORS.guan },
      { type: '1x2', name: '张飞', row: 0, col: 0, color: PIECE_COLORS.general_v },
      { type: '1x2', name: '赵云', row: 0, col: 3, color: PIECE_COLORS.general_v },
      { type: '1x2', name: '马超', row: 2, col: 0, color: PIECE_COLORS.general_v },
      { type: '1x2', name: '黄忠', row: 2, col: 3, color: PIECE_COLORS.general_v },
      { type: '1x1', name: '卒', row: 4, col: 0, color: PIECE_COLORS.soldier },
      { type: '1x1', name: '卒', row: 4, col: 1, color: PIECE_COLORS.soldier },
      { type: '1x1', name: '卒', row: 4, col: 2, color: PIECE_COLORS.soldier },
      { type: '1x1', name: '卒', row: 4, col: 3, color: PIECE_COLORS.soldier },
    ],
  },
  // ---- 11 ---- 守口如瓶
  {
    name: '守口如瓶',
    difficulty: 4,
    minSteps: 85,
    pieces: [
      { type: '2x2', name: '曹操', row: 0, col: 1, color: PIECE_COLORS.caocao },
      { type: '1x2', name: '张飞', row: 0, col: 0, color: PIECE_COLORS.general_v },
      { type: '1x2', name: '赵云', row: 0, col: 3, color: PIECE_COLORS.general_v },
      { type: '1x2', name: '马超', row: 2, col: 0, color: PIECE_COLORS.general_v },
      { type: '1x2', name: '黄忠', row: 2, col: 3, color: PIECE_COLORS.general_v },
      { type: '2x1', name: '关羽', row: 2, col: 1, color: PIECE_COLORS.guan },
      { type: '1x1', name: '卒', row: 3, col: 1, color: PIECE_COLORS.soldier },
      { type: '1x1', name: '卒', row: 3, col: 2, color: PIECE_COLORS.soldier },
      { type: '1x1', name: '卒', row: 4, col: 0, color: PIECE_COLORS.soldier },
      { type: '1x1', name: '卒', row: 4, col: 3, color: PIECE_COLORS.soldier },
    ],
  },
  // ---- 12 ---- 层层设防
  {
    name: '层层设防',
    difficulty: 5,
    minSteps: 90,
    pieces: [
      { type: '2x2', name: '曹操', row: 0, col: 1, color: PIECE_COLORS.caocao },
      { type: '2x1', name: '关羽', row: 0, col: 0, color: PIECE_COLORS.guan },
      { type: '1x2', name: '张飞', row: 0, col: 3, color: PIECE_COLORS.general_v },
      { type: '1x2', name: '马超', row: 2, col: 0, color: PIECE_COLORS.general_v },
      { type: '1x2', name: '赵云', row: 2, col: 1, color: PIECE_COLORS.general_v },
      { type: '1x2', name: '黄忠', row: 2, col: 3, color: PIECE_COLORS.general_v },
      { type: '1x1', name: '卒', row: 3, col: 1, color: PIECE_COLORS.soldier },
      { type: '1x1', name: '卒', row: 3, col: 2, color: PIECE_COLORS.soldier },
      { type: '1x1', name: '卒', row: 4, col: 0, color: PIECE_COLORS.soldier },
      { type: '1x1', name: '卒', row: 4, col: 3, color: PIECE_COLORS.soldier },
    ],
  },
];

// ==================== 数字华容道 ====================

// 数字华容道：在 N×N 网格中滑动数字块，按顺序排列即通关
// 每关提供一个打乱的排列序列（0 代表空格）
// solved 序列为 [1,2,3,...,N²-1,0]

// 生成一个可解的随机排列
function generateSolvable(size, seed) {
  const total = size * size;
  const arr = Array.from({ length: total }, (_, i) => (i + 1) % total); // [1,2,...,N²-1,0]

  // 使用种子做确定性洗牌（保证可解性：逆序数对数 + 空格行号奇偶性一致）
  let s = seed;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };

  // 从已解状态做随机有效移动，确保可解
  let emptyIdx = total - 1;
  const moves = [];
  let lastEmpty = -1;
  const shuffleSteps = size === 3 ? 60 : 120;

  for (let i = 0; i < shuffleSteps; i++) {
    const row = Math.floor(emptyIdx / size);
    const col = emptyIdx % size;
    const neighbors = [];
    if (row > 0) neighbors.push(emptyIdx - size);
    if (row < size - 1) neighbors.push(emptyIdx + size);
    if (col > 0) neighbors.push(emptyIdx - 1);
    if (col < size - 1) neighbors.push(emptyIdx + 1);
    // 避免回退
    const valid = neighbors.filter((n) => n !== lastEmpty);
    const pick = valid[Math.floor(rand() * valid.length)];
    [arr[emptyIdx], arr[pick]] = [arr[pick], arr[emptyIdx]];
    lastEmpty = emptyIdx;
    emptyIdx = pick;
  }
  moves.push(arr);
  return arr;
}

// 数字华容道关卡
// 3x3（8-puzzle）和 4x4（15-puzzle）
export const NUMBER_LEVELS = [
  // 3x3 关卡
  { name: '数字·初阶', size: 3, difficulty: 1, tiles: generateSolvable(3, 42) },
  { name: '数字·入门', size: 3, difficulty: 1, tiles: generateSolvable(3, 137) },
  { name: '数字·简易', size: 3, difficulty: 2, tiles: generateSolvable(3, 256) },
  { name: '数字·熟练', size: 3, difficulty: 2, tiles: generateSolvable(3, 519) },
  // 4x4 关卡
  { name: '数字·进阶', size: 4, difficulty: 3, tiles: generateSolvable(4, 831) },
  { name: '数字·挑战', size: 4, difficulty: 3, tiles: generateSolvable(4, 1024) },
  { name: '数字·高手', size: 4, difficulty: 4, tiles: generateSolvable(4, 2048) },
  { name: '数字·大师', size: 4, difficulty: 5, tiles: generateSolvable(4, 4096) },
];

// 统一导出（向后兼容）
export const LEVELS = CLASSIC_LEVELS;
