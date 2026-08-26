// 光标迷航 - 平衡与关卡参数

import { GAME_WIDTH, GAME_HEIGHT } from '../../config.js';

// 网格：12 列 × 18 行，每格 32 像素
export const CELL = 32;
export const COLS = 12;
export const ROWS = 18;
export const GRID_W = COLS * CELL;       // 384
export const GRID_H = ROWS * CELL;       // 576
export const GRID_X = Math.round((GAME_WIDTH - GRID_W) / 2); // 8
export const GRID_Y = 48;                // 顶部留 48px 给 HUD

// 像素 → 网格
export const pxToGridX = (px) => Math.floor((px - GRID_X) / CELL);
export const pxToGridY = (py) => Math.floor((py - GRID_Y) / CELL);
export const gridToPxX = (gx) => GRID_X + gx * CELL + CELL / 2;
export const gridToPxY = (gy) => GRID_Y + gy * CELL + CELL / 2;

// 角色半径（像素）
export const CHARACTERS = {
  xiaoshan: {
    id: 'xiaoshan',
    name: '小闪',
    desc: '碰撞体更小',
    radius: 6,
    coreRange: 1.5 * CELL,   // 核心吸附范围
    color: 0xffd35c,
    pixelBody: [
      '..XXXX..',
      '.XYYYYX.',
      '.YYYYYY.',
      '.YYYYYY.',
      '.XYYYYX.',
      '..X..X..',
    ],
  },
  nuonuo: {
    id: 'nuonuo',
    name: '诺诺',
    desc: '每关一次护盾',
    radius: 8,
    coreRange: 1.5 * CELL,
    color: 0x4fc3f7,
    pixelBody: [
      '..XXXX..',
      '.XYYYYX.',
      '.YYYYYY.',
      '.YYYYYY.',
      '.XYYYYY.',
      '..X..XX.',
    ],
  },
  tuantuan: {
    id: 'tuantuan',
    name: '团团',
    desc: '核心吸附范围更大',
    radius: 10,
    coreRange: 2.4 * CELL,
    color: 0xff8a80,
    pixelBody: [
      '..XXXX..',
      '.XYYYYX.',
      'XYYYYYYX',
      'XYYYYYYX',
      'XYYYYYYX',
      '.XXXXXX.',
    ],
  },
};

// 移动参数
export const MOVE = {
  followLerp: 0.18,        // 每帧向目标点推进比例
  touchOffsetY: 48,        // 触屏：手指上方 48px 作为目标
  pauseOnTouchUp: true,    // 手指离开时暂停角色
  maxStepPx: 18,           // 单帧最大位移（用于扫掠碰撞细分）
};

// 核心（能量核）
export const CORE = {
  radius: 10,
  pulsePeriodMs: 900,      // 呼吸节奏
};

// 出口
export const EXIT = {
  width: CELL,
  height: CELL,
};

// 生命与检查点
export const LIVES = 3;

// 星级目标
export const STARS = {
  base: 1,                 // 通关即 1 星
  time: { seconds: 30, stars: 1 },      // 限时（根据关卡时长动态）
  noHit: { stars: 1 },                  // 无伤通关
  memory: { stars: 1 },                 // 收集记忆碎片
  // 实际目标在每关数据中可覆盖
};

// 失败重试：连续失败 N 次后提供辅助
export const ASSIST = {
  triggerAfterFails: 3,    // 连续失败次数
  hazardSpeedScale: 0.85,  // 动态机关减速比例
  showPathHint: true,      // 短暂显示安全路径提示
  hintDurationMs: 1200,
};

// 难度曲线：每章基础属性
export const CHAPTERS = [
  // index 从 0 开始，共 10 章
  { hazards: 0, hazardSpeed: 0.0, corridorWidth: 4, timeLimit: 0 },       // 0: 第 1-10 关（教学）
  { hazards: 2, hazardSpeed: 0.5, corridorWidth: 3, timeLimit: 0 },       // 1
  { hazards: 3, hazardSpeed: 0.7, corridorWidth: 3, timeLimit: 60 },      // 2
  { hazards: 4, hazardSpeed: 0.8, corridorWidth: 3, timeLimit: 60 },      // 3
  { hazards: 5, hazardSpeed: 0.9, corridorWidth: 2, timeLimit: 50 },      // 4
  { hazards: 6, hazardSpeed: 1.0, corridorWidth: 2, timeLimit: 50 },      // 5
  { hazards: 7, hazardSpeed: 1.1, corridorWidth: 2, timeLimit: 45 },      // 6
  { hazards: 8, hazardSpeed: 1.2, corridorWidth: 2, timeLimit: 45 },      // 7
  { hazards: 9, hazardSpeed: 1.3, corridorWidth: 2, timeLimit: 40 },      // 8
  { hazards: 10, hazardSpeed: 1.4, corridorWidth: 2, timeLimit: 40 },     // 9
];

// 8 套背景（按章节循环使用）
export const BACKGROUNDS = [
  { name: '森林遗迹',  base: 0x163226, accent: 0x2f6b4d, decor: 0x3a8a5c },
  { name: '沙漠',      base: 0x3a2a18, accent: 0xc78948, decor: 0xe7a85b },
  { name: '冰原',      base: 0x182838, accent: 0x4a7ab0, decor: 0x9ad0ff },
  { name: '火山',      base: 0x301414, accent: 0xb04a2a, decor: 0xff7a3a },
  { name: '沼泽',      base: 0x1c2a1c, accent: 0x4a6a3a, decor: 0x88aa55 },
  { name: '霓虹城',    base: 0x1a0d2a, accent: 0x7a3ad0, decor: 0xff5cd0 },
  { name: '云端神殿',  base: 0x2a2a3e, accent: 0xb0b8d0, decor: 0xffffff },
  { name: '虚空',      base: 0x0a0a14, accent: 0x3a3a5a, decor: 0x6a6a9a },
];

export const CORE_COLOR = 0xfff3a0;
export const CORE_HALO = 0xffd35c;
export const EXIT_COLOR_LOCKED = 0x4a4a5a;
export const EXIT_COLOR_OPEN = 0x6affb0;
export const SHARD_COLOR = 0x88ddff;
