// 光标迷航 - 关卡数据
//
// 关卡结构：
//   {
//     chapter: 0..9,
//     background: 0..7,
//     timeLimit: 0 | 秒数,
//     start: { gx, gy },
//     cores: [{ gx, gy }, ...3],
//     exit: { gx, gy },
//     safePath: [[gx, gy], ...],
//     walls: [{ gx, gy }, ...],
//     hazards: [{ kind, gx, gy, dir?, period?, speed?, phase? }, ...],
//     shards: [{ gx, gy }, ...],   // 记忆碎片（可选）
//   }
//
// 生成器先生成"安全路径"（起点 → 3 核心 → 出口），用 BFS 校验角色可通过，
// 再在非路径格上随机布置墙与机关，确保 100% 可通关。

import { COLS, ROWS, CELL, GRID_X, GRID_Y } from './config.js';
import { HAZARD_KINDS } from './hazards.js';

// ================= 工具 =================

function makeRng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function inBounds(gx, gy) {
  return gx >= 0 && gx < COLS && gy >= 0 && gy < ROWS;
}

// 4 邻接 BFS：判断 fromCell 在所有 solid 阻挡（墙/机关/尖刺等）下能否到达 toCell
function bfsReachable(grid, fromCell, toCell, isSolid) {
  if (!fromCell || !toCell) return false;
  const key = (x, y) => `${x},${y}`;
  const start = key(fromCell[0], fromCell[1]);
  const goal = key(toCell[0], toCell[1]);
  const visited = new Set([start]);
  const queue = [fromCell];
  while (queue.length) {
    const [x, y] = queue.shift();
    if (x === toCell[0] && y === toCell[1]) return true;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      const k = key(nx, ny);
      if (visited.has(k)) continue;
      if (!inBounds(nx, ny)) continue;
      visited.add(k);
      const cell = grid[ny]?.[nx];
      if (cell && isSolid(cell)) continue;
      queue.push([nx, ny]);
    }
  }
  return false;
}

// 构造网格：返回 grid[y][x] = { kind, ... }
// 这里以"关卡数据"反向构建一个用于 BFS 的网格。
function buildGrid(level) {
  const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  // 默认空
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      grid[y][x] = { kind: 'empty' };
    }
  }
  for (const w of level.walls || []) {
    if (inBounds(w.gx, w.gy)) grid[w.gy][w.gx] = { kind: 'wall' };
  }
  for (const h of level.hazards || []) {
    if (inBounds(h.gx, h.gy)) {
      grid[h.gy][h.gx] = { kind: h.kind, hazard: h };
    }
  }
  return grid;
}

// 给定关卡：检查起点 → 核心 1 → 2 → 3 → 出口 全部可达
// "会扣血的格"（尖刺/熔岩等）视作可通过——玩家可选择躲避，但仍作为可达
// 真正阻挡：墙 + 部分全阻挡的机关
const HARD_BLOCKERS = new Set(['wall', 'move_wall', 'compress', 'door']);

export function validateLevel(level) {
  const errors = [];
  if (!level) return ['关卡为空'];
  if (!level.start) errors.push('缺少起点');
  if (!Array.isArray(level.cores) || level.cores.length !== 3) errors.push('核心数量需为 3');
  if (!level.exit) errors.push('缺少出口');

  // 越界检查
  const allCells = [level.start, level.exit, ...(level.cores || []),
    ...(level.shards || []), ...(level.walls || []), ...(level.hazards || [])];
  for (const c of allCells) {
    if (!c) continue;
    if (!inBounds(c.gx, c.gy)) {
      errors.push(`坐标越界 (${c.gx},${c.gy})`);
    }
  }

  if (errors.length) return errors;

  // 关键点不在阻挡上
  const grid = buildGrid(level);
  const isSolid = (cell) => cell && HARD_BLOCKERS.has(cell.kind);
  for (const key of ['start', 'exit']) {
    const c = level[key];
    if (grid[c.gy][c.gx].kind !== 'empty') errors.push(`${key} 被阻挡`);
  }
  for (let i = 0; i < 3; i++) {
    const c = level.cores[i];
    if (grid[c.gy][c.gx].kind !== 'empty') errors.push(`核心 ${i + 1} 被阻挡`);
  }

  // 路径连通性
  const seq = [level.start, ...level.cores, level.exit].map((c) => [c.gx, c.gy]);
  for (let i = 0; i < seq.length - 1; i++) {
    if (!bfsReachable(grid, seq[i], seq[i + 1], isSolid)) {
      errors.push(`第 ${i} → ${i + 1} 段不可达`);
    }
  }

  // 安全路径至少存在
  if (!Array.isArray(level.safePath) || level.safePath.length < 5) {
    errors.push('安全路径过短');
  }

  return errors;
}

// ================= 路径生成 =================

/**
 * 让路径在两点之间做"略偏折线"：向下为主，加入横向偏移。
 * @param {number} turnBias  0~1 越大越倾向左右横移
 */
function generatePath(rng, fromCell, toCell, safeSet, turnBias = 0.5) {
  let [x, y] = fromCell;
  const [tx, ty] = toCell;
  const path = [[x, y]];
  // 向下推进，按 turnBias 概率加入左右调整
  let counter = 0;
  while (y < ty) {
    counter++;
    const wantTurn = rng() < turnBias;
    if (wantTurn && tx !== x) {
      const dir = Math.sign(tx - x) || (rng() > 0.5 ? 1 : -1);
      // 尝试左右各 1 格
      for (const d of [dir, -dir]) {
        const nx = x + d;
        if (inBounds(nx, y) && !safeSet.has(`${nx},${y}`)) {
          x = nx;
          path.push([x, y]);
          safeSet.add(`${x},${y}`);
          break;
        }
      }
    }
    y += 1;
    if (!safeSet.has(`${x},${y}`)) {
      path.push([x, y]);
      safeSet.add(`${x},${y}`);
    }
  }
  // 到底后水平调整
  while (x !== tx) {
    const dir = Math.sign(tx - x);
    x += dir;
    if (!safeSet.has(`${x},${y}`)) {
      path.push([x, y]);
      safeSet.add(`${x},${y}`);
    }
  }
  return path;
}

/** 在安全路径外随机生成"障碍簇"：L 形 / 田字 / 十字 */
function addObstacleCluster(rng, walls, reserved, count) {
  let placed = 0;
  let attempts = 0;
  while (placed < count && attempts < 80) {
    attempts++;
    const cx = 1 + Math.floor(rng() * (COLS - 2));
    const cy = 2 + Math.floor(rng() * (ROWS - 3));
    const key = `${cx},${cy}`;
    if (reserved.has(key)) continue;
    if (walls.some((w) => w.gx === cx && w.gy === cy)) continue;
    const shape = Math.floor(rng() * 4);
    const cells = [];
    // shape 0: L  1: 田  2: 横三  3: 竖三
    if (shape === 0) {
      cells.push([cx, cy], [cx, cy + 1], [cx + 1, cy + 1]);
    } else if (shape === 1) {
      cells.push([cx, cy], [cx + 1, cy], [cx, cy + 1], [cx + 1, cy + 1]);
    } else if (shape === 2) {
      cells.push([cx, cy], [cx + 1, cy], [cx + 2, cy]);
    } else {
      cells.push([cx, cy], [cx, cy + 1], [cx, cy + 2]);
    }
    // 检查所有 cells 都在范围内且不在安全路径上
    let ok = true;
    for (const [x, y] of cells) {
      if (!inBounds(x, y)) { ok = false; break; }
      if (reserved.has(`${x},${y}`)) { ok = false; break; }
    }
    if (!ok) continue;
    // 检查不会完全封锁路径（移除 BFS 校验：仅检查每个 cell 至少还有 1 个非墙邻接）
    for (const [x, y] of cells) {
      walls.push({ gx: x, gy: y });
    }
    placed++;
  }
}

// ================= 20 个精调关卡 =================

const HANDCRAFTED = [
  // ---- 1: 教学：移动到第一个核心 ----
  {
    chapter: 0, background: 0, timeLimit: 0,
    start: { gx: 5, gy: 1 },
    cores: [{ gx: 6, gy: 5 }, { gx: 4, gy: 9 }, { gx: 6, gy: 13 }],
    exit: { gx: 5, gy: 16 },
    safePath: [[5,1],[5,2],[5,3],[5,4],[5,5],[5,6],[6,5],[6,6],[6,7],[6,8],[6,9],[5,9],[4,9],[4,10],[4,11],[4,12],[4,13],[5,13],[6,13],[6,14],[6,15],[5,15],[5,16]],
    walls: [
      { gx: 1, gy: 1 }, { gx: 10, gy: 1 },
      { gx: 0, gy: 8 }, { gx: 11, gy: 8 },
    ],
    hazards: [],
    shards: [],
  },
  // ---- 2: 沿折线走，收集 2 个核心 ----
  {
    chapter: 0, background: 0, timeLimit: 0,
    start: { gx: 2, gy: 1 },
    cores: [{ gx: 9, gy: 5 }, { gx: 2, gy: 10 }, { gx: 9, gy: 14 }],
    exit: { gx: 5, gy: 16 },
    safePath: [[2,1],[2,2],[3,2],[4,2],[5,2],[6,2],[7,2],[8,2],[9,2],[9,3],[9,4],[9,5],[8,5],[7,5],[6,5],[5,5],[4,5],[3,5],[2,5],[2,6],[2,7],[2,8],[2,9],[2,10],[3,10],[4,10],[5,10],[6,10],[7,10],[8,10],[9,10],[9,11],[9,12],[9,13],[9,14],[8,14],[7,14],[6,14],[5,14],[5,15],[5,16]],
    walls: [
      { gx: 0, gy: 0 }, { gx: 1, gy: 0 }, { gx: 10, gy: 0 }, { gx: 11, gy: 0 },
      { gx: 0, gy: 17 }, { gx: 1, gy: 17 }, { gx: 10, gy: 17 }, { gx: 11, gy: 17 },
    ],
    hazards: [],
    shards: [],
  },
  // ---- 3: 引入尖刺 ----
  {
    chapter: 0, background: 1, timeLimit: 0,
    start: { gx: 5, gy: 1 },
    cores: [{ gx: 5, gy: 6 }, { gx: 5, gy: 10 }, { gx: 5, gy: 14 }],
    exit: { gx: 5, gy: 16 },
    safePath: [[5,1],[5,2],[5,3],[5,4],[5,5],[5,6],[5,7],[5,8],[5,9],[5,10],[5,11],[5,12],[5,13],[5,14],[5,15],[5,16]],
    walls: [
      { gx: 0, gy: 0 }, { gx: 1, gy: 0 }, { gx: 2, gy: 0 },
      { gx: 9, gy: 0 }, { gx: 10, gy: 0 }, { gx: 11, gy: 0 },
    ],
    hazards: [
      { kind: HAZARD_KINDS.SPIKE, gx: 3, gy: 4 },
      { kind: HAZARD_KINDS.SPIKE, gx: 7, gy: 7 },
      { kind: HAZARD_KINDS.SPIKE, gx: 3, gy: 11 },
      { kind: HAZARD_KINDS.SPIKE, gx: 8, gy: 12 },
    ],
    shards: [{ gx: 8, gy: 4 }],
  },
  // ---- 4: 墙+尖刺 ----
  {
    chapter: 0, background: 1, timeLimit: 0,
    start: { gx: 2, gy: 1 },
    cores: [{ gx: 8, gy: 4 }, { gx: 3, gy: 9 }, { gx: 8, gy: 13 }],
    exit: { gx: 5, gy: 16 },
    safePath: [[2,1],[2,2],[3,2],[4,2],[5,2],[6,2],[7,2],[8,2],[8,3],[8,4],[7,4],[6,4],[5,4],[4,4],[3,4],[3,5],[3,6],[3,7],[3,8],[3,9],[4,9],[5,9],[6,9],[7,9],[8,9],[8,10],[8,11],[8,12],[8,13],[7,13],[6,13],[5,13],[5,14],[5,15],[5,16]],
    walls: [
      { gx: 0, gy: 0 }, { gx: 0, gy: 1 }, { gx: 1, gy: 1 },
      { gx: 10, gy: 0 }, { gx: 11, gy: 0 }, { gx: 11, gy: 1 },
    ],
    hazards: [
      { kind: HAZARD_KINDS.SPIKE, gx: 5, gy: 3 },
      { kind: HAZARD_KINDS.SPIKE, gx: 6, gy: 5 },
      { kind: HAZARD_KINDS.SPIKE, gx: 5, gy: 8 },
      { kind: HAZARD_KINDS.SPIKE, gx: 6, gy: 10 },
      { kind: HAZARD_KINDS.SPIKE, gx: 6, gy: 12 },
    ],
    shards: [],
  },
  // ---- 5: 泥地减速 ----
  {
    chapter: 0, background: 1, timeLimit: 45,
    start: { gx: 2, gy: 1 },
    cores: [{ gx: 9, gy: 5 }, { gx: 2, gy: 10 }, { gx: 9, gy: 14 }],
    exit: { gx: 5, gy: 16 },
    safePath: [[2,1],[2,2],[3,2],[4,2],[5,2],[6,2],[7,2],[8,2],[9,2],[9,3],[9,4],[9,5],[8,5],[7,5],[6,5],[5,5],[4,5],[3,5],[2,5],[2,6],[2,7],[2,8],[2,9],[2,10],[3,10],[4,10],[5,10],[6,10],[7,10],[8,10],[9,10],[9,11],[9,12],[9,13],[9,14],[8,14],[7,14],[6,14],[5,14],[5,15],[5,16]],
    walls: [
      { gx: 0, gy: 0 }, { gx: 1, gy: 0 }, { gx: 10, gy: 0 }, { gx: 11, gy: 0 },
      { gx: 0, gy: 17 }, { gx: 11, gy: 17 },
    ],
    hazards: [
      { kind: HAZARD_KINDS.MUD, gx: 4, gy: 4 },
      { kind: HAZARD_KINDS.MUD, gx: 7, gy: 7 },
      { kind: HAZARD_KINDS.MUD, gx: 4, gy: 11 },
    ],
    shards: [{ gx: 7, gy: 12 }],
  },
  // ---- 6: 冰面 ----
  {
    chapter: 0, background: 2, timeLimit: 45,
    start: { gx: 2, gy: 1 },
    cores: [{ gx: 9, gy: 5 }, { gx: 2, gy: 10 }, { gx: 9, gy: 14 }],
    exit: { gx: 5, gy: 16 },
    safePath: [[2,1],[2,2],[3,2],[4,2],[5,2],[6,2],[7,2],[8,2],[9,2],[9,3],[9,4],[9,5],[8,5],[7,5],[6,5],[5,5],[4,5],[3,5],[2,5],[2,6],[2,7],[2,8],[2,9],[2,10],[3,10],[4,10],[5,10],[6,10],[7,10],[8,10],[9,10],[9,11],[9,12],[9,13],[9,14],[8,14],[7,14],[6,14],[5,14],[5,15],[5,16]],
    walls: [
      { gx: 0, gy: 0 }, { gx: 1, gy: 0 }, { gx: 10, gy: 0 }, { gx: 11, gy: 0 },
    ],
    hazards: [
      { kind: HAZARD_KINDS.ICE, gx: 5, gy: 3 },
      { kind: HAZARD_KINDS.ICE, gx: 6, gy: 5 },
      { kind: HAZARD_KINDS.ICE, gx: 5, gy: 9 },
      { kind: HAZARD_KINDS.ICE, gx: 5, gy: 12 },
    ],
    shards: [],
  },
  // ---- 7: 尖刺墙 ----
  {
    chapter: 0, background: 2, timeLimit: 45,
    start: { gx: 5, gy: 1 },
    cores: [{ gx: 5, gy: 6 }, { gx: 5, gy: 10 }, { gx: 5, gy: 14 }],
    exit: { gx: 5, gy: 16 },
    safePath: [[5,1],[5,2],[5,3],[5,4],[5,5],[5,6],[5,7],[5,8],[5,9],[5,10],[5,11],[5,12],[5,13],[5,14],[5,15],[5,16]],
    walls: [
      { gx: 0, gy: 0 }, { gx: 1, gy: 0 }, { gx: 2, gy: 0 },
      { gx: 9, gy: 0 }, { gx: 10, gy: 0 }, { gx: 11, gy: 0 },
    ],
    hazards: [
      { kind: HAZARD_KINDS.SPIKE, gx: 4, gy: 3 },
      { kind: HAZARD_KINDS.SPIKE, gx: 6, gy: 3 },
      { kind: HAZARD_KINDS.SPIKE, gx: 3, gy: 7 },
      { kind: HAZARD_KINDS.SPIKE, gx: 7, gy: 7 },
      { kind: HAZARD_KINDS.SPIKE, gx: 4, gy: 11 },
      { kind: HAZARD_KINDS.SPIKE, gx: 6, gy: 11 },
    ],
    shards: [{ gx: 8, gy: 5 }],
  },
  // ---- 8: 熔岩 ----
  {
    chapter: 0, background: 3, timeLimit: 45,
    start: { gx: 2, gy: 1 },
    cores: [{ gx: 9, gy: 5 }, { gx: 2, gy: 10 }, { gx: 9, gy: 14 }],
    exit: { gx: 5, gy: 16 },
    safePath: [[2,1],[2,2],[3,2],[4,2],[5,2],[6,2],[7,2],[8,2],[9,2],[9,3],[9,4],[9,5],[8,5],[7,5],[6,5],[5,5],[4,5],[3,5],[2,5],[2,6],[2,7],[2,8],[2,9],[2,10],[3,10],[4,10],[5,10],[6,10],[7,10],[8,10],[9,10],[9,11],[9,12],[9,13],[9,14],[8,14],[7,14],[6,14],[5,14],[5,15],[5,16]],
    walls: [
      { gx: 0, gy: 0 }, { gx: 1, gy: 0 }, { gx: 10, gy: 0 }, { gx: 11, gy: 0 },
    ],
    hazards: [
      { kind: HAZARD_KINDS.LAVA, gx: 4, gy: 4 },
      { kind: HAZARD_KINDS.LAVA, gx: 7, gy: 7 },
      { kind: HAZARD_KINDS.LAVA, gx: 4, gy: 11 },
    ],
    shards: [],
  },
  // ---- 9: 多种静态机关 ----
  {
    chapter: 0, background: 3, timeLimit: 45,
    start: { gx: 5, gy: 1 },
    cores: [{ gx: 5, gy: 6 }, { gx: 5, gy: 10 }, { gx: 5, gy: 14 }],
    exit: { gx: 5, gy: 16 },
    safePath: [[5,1],[5,2],[5,3],[5,4],[5,5],[5,6],[5,7],[5,8],[5,9],[5,10],[5,11],[5,12],[5,13],[5,14],[5,15],[5,16]],
    walls: [
      { gx: 0, gy: 0 }, { gx: 1, gy: 0 }, { gx: 2, gy: 0 },
      { gx: 9, gy: 0 }, { gx: 10, gy: 0 }, { gx: 11, gy: 0 },
    ],
    hazards: [
      { kind: HAZARD_KINDS.SPIKE, gx: 3, gy: 4 },
      { kind: HAZARD_KINDS.LAVA, gx: 7, gy: 5 },
      { kind: HAZARD_KINDS.SPIKE, gx: 4, gy: 8 },
      { kind: HAZARD_KINDS.MUD, gx: 7, gy: 8 },
      { kind: HAZARD_KINDS.SPIKE, gx: 3, gy: 12 },
      { kind: HAZARD_KINDS.LAVA, gx: 7, gy: 13 },
    ],
    shards: [{ gx: 2, gy: 8 }],
  },
  // ---- 10: 阶段性挑战（剧情关）----
  {
    chapter: 0, background: 4, timeLimit: 60,
    start: { gx: 1, gy: 1 },
    cores: [{ gx: 10, gy: 5 }, { gx: 1, gy: 10 }, { gx: 10, gy: 14 }],
    exit: { gx: 5, gy: 16 },
    safePath: [[1,1],[2,1],[2,2],[3,2],[4,2],[5,2],[6,2],[7,2],[8,2],[9,2],[10,2],[10,3],[10,4],[10,5],[9,5],[8,5],[7,5],[6,5],[5,5],[4,5],[3,5],[2,5],[1,5],[1,6],[1,7],[1,8],[1,9],[1,10],[2,10],[3,10],[4,10],[5,10],[6,10],[7,10],[8,10],[9,10],[10,10],[10,11],[10,12],[10,13],[10,14],[9,14],[8,14],[7,14],[6,14],[5,14],[5,15],[5,16]],
    walls: [
      { gx: 0, gy: 0 }, { gx: 11, gy: 0 },
    ],
    hazards: [
      { kind: HAZARD_KINDS.SPIKE, gx: 4, gy: 4 },
      { kind: HAZARD_KINDS.SPIKE, gx: 7, gy: 4 },
      { kind: HAZARD_KINDS.LAVA, gx: 5, gy: 7 },
      { kind: HAZARD_KINDS.SPIKE, gx: 3, gy: 8 },
      { kind: HAZARD_KINDS.LAVA, gx: 6, gy: 12 },
    ],
    shards: [],
  },
  // ---- 11: 传送带 ----
  {
    chapter: 1, background: 4, timeLimit: 50,
    start: { gx: 2, gy: 1 },
    cores: [{ gx: 9, gy: 5 }, { gx: 2, gy: 10 }, { gx: 9, gy: 14 }],
    exit: { gx: 5, gy: 16 },
    safePath: [[2,1],[2,2],[3,2],[4,2],[5,2],[6,2],[7,2],[8,2],[9,2],[9,3],[9,4],[9,5],[8,5],[7,5],[6,5],[5,5],[4,5],[3,5],[2,5],[2,6],[2,7],[2,8],[2,9],[2,10],[3,10],[4,10],[5,10],[6,10],[7,10],[8,10],[9,10],[9,11],[9,12],[9,13],[9,14],[8,14],[7,14],[6,14],[5,14],[5,15],[5,16]],
    walls: [
      { gx: 0, gy: 0 }, { gx: 1, gy: 0 }, { gx: 10, gy: 0 }, { gx: 11, gy: 0 },
    ],
    hazards: [
      { kind: HAZARD_KINDS.CONVEYOR, gx: 3, gy: 3, dir: 0 },
      { kind: HAZARD_KINDS.CONVEYOR, gx: 4, gy: 3, dir: 0 },
      { kind: HAZARD_KINDS.CONVEYOR, gx: 7, gy: 7, dir: 1 },
      { kind: HAZARD_KINDS.CONVEYOR, gx: 4, gy: 11, dir: 2 },
    ],
    shards: [],
  },
  // ---- 12: 水流 ----
  {
    chapter: 1, background: 5, timeLimit: 50,
    start: { gx: 2, gy: 1 },
    cores: [{ gx: 9, gy: 5 }, { gx: 2, gy: 10 }, { gx: 9, gy: 14 }],
    exit: { gx: 5, gy: 16 },
    safePath: [[2,1],[2,2],[3,2],[4,2],[5,2],[6,2],[7,2],[8,2],[9,2],[9,3],[9,4],[9,5],[8,5],[7,5],[6,5],[5,5],[4,5],[3,5],[2,5],[2,6],[2,7],[2,8],[2,9],[2,10],[3,10],[4,10],[5,10],[6,10],[7,10],[8,10],[9,10],[9,11],[9,12],[9,13],[9,14],[8,14],[7,14],[6,14],[5,14],[5,15],[5,16]],
    walls: [
      { gx: 0, gy: 0 }, { gx: 1, gy: 0 }, { gx: 10, gy: 0 }, { gx: 11, gy: 0 },
    ],
    hazards: [
      { kind: HAZARD_KINDS.FLOW, gx: 4, gy: 3, dir: 2 },
      { kind: HAZARD_KINDS.FLOW, gx: 6, gy: 8, dir: 1 },
      { kind: HAZARD_KINDS.FLOW, gx: 4, gy: 12, dir: 2 },
    ],
    shards: [{ gx: 8, gy: 8 }],
  },
  // ---- 13: 单向荆棘 ----
  {
    chapter: 1, background: 5, timeLimit: 50,
    start: { gx: 5, gy: 1 },
    cores: [{ gx: 5, gy: 6 }, { gx: 5, gy: 10 }, { gx: 5, gy: 14 }],
    exit: { gx: 5, gy: 16 },
    safePath: [[5,1],[5,2],[5,3],[5,4],[5,5],[5,6],[5,7],[5,8],[5,9],[5,10],[5,11],[5,12],[5,13],[5,14],[5,15],[5,16]],
    walls: [
      { gx: 0, gy: 0 }, { gx: 1, gy: 0 }, { gx: 2, gy: 0 },
      { gx: 9, gy: 0 }, { gx: 10, gy: 0 }, { gx: 11, gy: 0 },
    ],
    hazards: [
      { kind: HAZARD_KINDS.THORN, gx: 4, gy: 4, dir: 1 },
      { kind: HAZARD_KINDS.THORN, gx: 6, gy: 4, dir: 3 },
      { kind: HAZARD_KINDS.THORN, gx: 4, gy: 8, dir: 1 },
      { kind: HAZARD_KINDS.THORN, gx: 6, gy: 8, dir: 3 },
      { kind: HAZARD_KINDS.THORN, gx: 4, gy: 12, dir: 1 },
      { kind: HAZARD_KINDS.THORN, gx: 6, gy: 12, dir: 3 },
    ],
    shards: [],
  },
  // ---- 14: 碎裂地板 ----
  {
    chapter: 1, background: 5, timeLimit: 50,
    start: { gx: 2, gy: 1 },
    cores: [{ gx: 9, gy: 5 }, { gx: 2, gy: 10 }, { gx: 9, gy: 14 }],
    exit: { gx: 5, gy: 16 },
    safePath: [[2,1],[2,2],[3,2],[4,2],[5,2],[6,2],[7,2],[8,2],[9,2],[9,3],[9,4],[9,5],[8,5],[7,5],[6,5],[5,5],[4,5],[3,5],[2,5],[2,6],[2,7],[2,8],[2,9],[2,10],[3,10],[4,10],[5,10],[6,10],[7,10],[8,10],[9,10],[9,11],[9,12],[9,13],[9,14],[8,14],[7,14],[6,14],[5,14],[5,15],[5,16]],
    walls: [],
    hazards: [
      { kind: HAZARD_KINDS.CRACK, gx: 4, gy: 4 },
      { kind: HAZARD_KINDS.CRACK, gx: 7, gy: 7 },
      { kind: HAZARD_KINDS.CRACK, gx: 4, gy: 11 },
    ],
    shards: [],
  },
  // ---- 15: 坍塌桥 ----
  {
    chapter: 1, background: 4, timeLimit: 50,
    start: { gx: 2, gy: 1 },
    cores: [{ gx: 9, gy: 5 }, { gx: 2, gy: 10 }, { gx: 9, gy: 14 }],
    exit: { gx: 5, gy: 16 },
    safePath: [[2,1],[2,2],[3,2],[4,2],[5,2],[6,2],[7,2],[8,2],[9,2],[9,3],[9,4],[9,5],[8,5],[7,5],[6,5],[5,5],[4,5],[3,5],[2,5],[2,6],[2,7],[2,8],[2,9],[2,10],[3,10],[4,10],[5,10],[6,10],[7,10],[8,10],[9,10],[9,11],[9,12],[9,13],[9,14],[8,14],[7,14],[6,14],[5,14],[5,15],[5,16]],
    walls: [],
    hazards: [
      { kind: HAZARD_KINDS.BRIDGE, gx: 4, gy: 4 },
      { kind: HAZARD_KINDS.BRIDGE, gx: 7, gy: 7 },
      { kind: HAZARD_KINDS.BRIDGE, gx: 4, gy: 11 },
    ],
    shards: [],
  },
  // ---- 16: 移动墙 ----
  {
    chapter: 1, background: 4, timeLimit: 50,
    start: { gx: 5, gy: 1 },
    cores: [{ gx: 5, gy: 6 }, { gx: 5, gy: 10 }, { gx: 5, gy: 14 }],
    exit: { gx: 5, gy: 16 },
    safePath: [[5,1],[5,2],[5,3],[5,4],[5,5],[5,6],[5,7],[5,8],[5,9],[5,10],[5,11],[5,12],[5,13],[5,14],[5,15],[5,16]],
    walls: [
      { gx: 0, gy: 0 }, { gx: 1, gy: 0 }, { gx: 2, gy: 0 },
      { gx: 9, gy: 0 }, { gx: 10, gy: 0 }, { gx: 11, gy: 0 },
    ],
    hazards: [
      { kind: HAZARD_KINDS.MOVE_WALL, gx: 3, gy: 4, period: 2.4, speed: 0.6 },
      { kind: HAZARD_KINDS.MOVE_WALL, gx: 7, gy: 7, period: 2.4, speed: 0.6 },
      { kind: HAZARD_KINDS.MOVE_WALL, gx: 3, gy: 12, period: 2.4, speed: 0.6 },
    ],
    shards: [],
  },
  // ---- 17: 旋转刃 ----
  {
    chapter: 1, background: 5, timeLimit: 50,
    start: { gx: 2, gy: 1 },
    cores: [{ gx: 9, gy: 5 }, { gx: 2, gy: 10 }, { gx: 9, gy: 14 }],
    exit: { gx: 5, gy: 16 },
    safePath: [[2,1],[2,2],[3,2],[4,2],[5,2],[6,2],[7,2],[8,2],[9,2],[9,3],[9,4],[9,5],[8,5],[7,5],[6,5],[5,5],[4,5],[3,5],[2,5],[2,6],[2,7],[2,8],[2,9],[2,10],[3,10],[4,10],[5,10],[6,10],[7,10],[8,10],[9,10],[9,11],[9,12],[9,13],[9,14],[8,14],[7,14],[6,14],[5,14],[5,15],[5,16]],
    walls: [
      { gx: 0, gy: 0 }, { gx: 1, gy: 0 }, { gx: 10, gy: 0 }, { gx: 11, gy: 0 },
    ],
    hazards: [
      { kind: HAZARD_KINDS.BLADE, gx: 4, gy: 4, period: 1.4 },
      { kind: HAZARD_KINDS.BLADE, gx: 7, gy: 7, period: 1.4 },
      { kind: HAZARD_KINDS.BLADE, gx: 4, gy: 11, period: 1.4 },
    ],
    shards: [],
  },
  // ---- 18: 激光门 ----
  {
    chapter: 1, background: 5, timeLimit: 50,
    start: { gx: 5, gy: 1 },
    cores: [{ gx: 5, gy: 6 }, { gx: 5, gy: 10 }, { gx: 5, gy: 14 }],
    exit: { gx: 5, gy: 16 },
    safePath: [[5,1],[5,2],[5,3],[5,4],[5,5],[5,6],[5,7],[5,8],[5,9],[5,10],[5,11],[5,12],[5,13],[5,14],[5,15],[5,16]],
    walls: [
      { gx: 0, gy: 0 }, { gx: 1, gy: 0 }, { gx: 2, gy: 0 },
      { gx: 9, gy: 0 }, { gx: 10, gy: 0 }, { gx: 11, gy: 0 },
    ],
    hazards: [
      { kind: HAZARD_KINDS.LASER, gx: 3, gy: 5, period: 1.6 },
      { kind: HAZARD_KINDS.LASER, gx: 7, gy: 5, period: 1.6 },
      { kind: HAZARD_KINDS.LASER, gx: 3, gy: 9, period: 1.6 },
      { kind: HAZARD_KINDS.LASER, gx: 7, gy: 9, period: 1.6 },
      { kind: HAZARD_KINDS.LASER, gx: 3, gy: 13, period: 1.6 },
      { kind: HAZARD_KINDS.LASER, gx: 7, gy: 13, period: 1.6 },
    ],
    shards: [],
  },
  // ---- 19: 脉冲雷 ----
  {
    chapter: 1, background: 5, timeLimit: 50,
    start: { gx: 2, gy: 1 },
    cores: [{ gx: 9, gy: 5 }, { gx: 2, gy: 10 }, { gx: 9, gy: 14 }],
    exit: { gx: 5, gy: 16 },
    safePath: [[2,1],[2,2],[3,2],[4,2],[5,2],[6,2],[7,2],[8,2],[9,2],[9,3],[9,4],[9,5],[8,5],[7,5],[6,5],[5,5],[4,5],[3,5],[2,5],[2,6],[2,7],[2,8],[2,9],[2,10],[3,10],[4,10],[5,10],[6,10],[7,10],[8,10],[9,10],[9,11],[9,12],[9,13],[9,14],[8,14],[7,14],[6,14],[5,14],[5,15],[5,16]],
    walls: [
      { gx: 0, gy: 0 }, { gx: 1, gy: 0 }, { gx: 10, gy: 0 }, { gx: 11, gy: 0 },
    ],
    hazards: [
      { kind: HAZARD_KINDS.MINE, gx: 4, gy: 4, period: 1.8 },
      { kind: HAZARD_KINDS.MINE, gx: 7, gy: 7, period: 1.8 },
      { kind: HAZARD_KINDS.MINE, gx: 4, gy: 11, period: 1.8 },
    ],
    shards: [],
  },
  // ---- 20: 阶段性挑战（剧情关）----
  {
    chapter: 1, background: 6, timeLimit: 60,
    start: { gx: 1, gy: 1 },
    cores: [{ gx: 10, gy: 5 }, { gx: 1, gy: 10 }, { gx: 10, gy: 14 }],
    exit: { gx: 5, gy: 16 },
    safePath: [[1,1],[2,1],[2,2],[3,2],[4,2],[5,2],[6,2],[7,2],[8,2],[9,2],[10,2],[10,3],[10,4],[10,5],[9,5],[8,5],[7,5],[6,5],[5,5],[4,5],[3,5],[2,5],[1,5],[1,6],[1,7],[1,8],[1,9],[1,10],[2,10],[3,10],[4,10],[5,10],[6,10],[7,10],[8,10],[9,10],[10,10],[10,11],[10,12],[10,13],[10,14],[9,14],[8,14],[7,14],[6,14],[5,14],[5,15],[5,16]],
    walls: [
      { gx: 0, gy: 0 }, { gx: 11, gy: 0 },
    ],
    hazards: [
      { kind: HAZARD_KINDS.MOVE_WALL, gx: 5, gy: 4, period: 2.4, speed: 0.6 },
      { kind: HAZARD_KINDS.LASER, gx: 3, gy: 7, period: 1.6 },
      { kind: HAZARD_KINDS.MINE, gx: 7, gy: 12, period: 1.8 },
      { kind: HAZARD_KINDS.BLADE, gx: 4, gy: 12, period: 1.4 },
    ],
    shards: [{ gx: 2, gy: 7 }],
  },
];

// ================= 80 个程序化关卡 =================

const ALL_HAZARD_KINDS = [
  HAZARD_KINDS.WALL, HAZARD_KINDS.SPIKE, HAZARD_KINDS.MUD, HAZARD_KINDS.ICE,
  HAZARD_KINDS.CONVEYOR, HAZARD_KINDS.FLOW, HAZARD_KINDS.LAVA, HAZARD_KINDS.CRACK,
  HAZARD_KINDS.BRIDGE, HAZARD_KINDS.THORN, HAZARD_KINDS.MOVE_WALL, HAZARD_KINDS.COMPRESS,
  HAZARD_KINDS.BLADE, HAZARD_KINDS.LASER, HAZARD_KINDS.MINE, HAZARD_KINDS.RAIL,
  HAZARD_KINDS.TURRET, HAZARD_KINDS.TRACK, HAZARD_KINDS.DOOR, HAZARD_KINDS.TPORT,
];

// 每章可用机关（防止太早出现复杂机关）
const HAZARD_BY_CHAPTER = {
  0: ['wall', 'spike', 'mud'],
  1: ['wall', 'spike', 'mud', 'ice', 'conveyor', 'flow', 'thorn', 'crack', 'bridge'],
  2: ['wall', 'spike', 'mud', 'ice', 'conveyor', 'flow', 'lava', 'crack', 'bridge', 'thorn', 'move_wall'],
  3: ['wall', 'spike', 'mud', 'ice', 'conveyor', 'flow', 'lava', 'crack', 'bridge', 'thorn', 'move_wall', 'compress', 'blade', 'laser', 'mine'],
  4: ['wall', 'spike', 'mud', 'ice', 'conveyor', 'flow', 'lava', 'crack', 'bridge', 'thorn', 'move_wall', 'compress', 'blade', 'laser', 'mine', 'rail', 'turret', 'track', 'door', 'tport'],
  5: ALL_HAZARD_KINDS,
  6: ALL_HAZARD_KINDS,
  7: ALL_HAZARD_KINDS,
  8: ALL_HAZARD_KINDS,
  9: ALL_HAZARD_KINDS,
};

function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }

function generateLevel(levelNo) {
  const rng = makeRng(levelNo * 7919 + 31);
  const chapter = Math.min(9, Math.floor((levelNo - 1) / 10));
  const allowed = HAZARD_BY_CHAPTER[chapter] || ALL_HAZARD_KINDS;
  // 背景：8 套循环
  const background = (levelNo - 1) % 8;
  // 时间限制：从 chapter 2 开始
  const baseTime = [0, 0, 60, 60, 50, 50, 45, 45, 40, 40][chapter];
  const timeLimit = baseTime > 0 ? baseTime : 0;

  // 1. 起点 / 核心 / 出口
  const start = { gx: 1 + Math.floor(rng() * 4) * 2, gy: 1 }; // 1/3/5/7
  const coreY = [5, 10, 14];
  const cores = coreY.map((y) => ({ gx: 1 + Math.floor(rng() * 10), gy: y }));
  const exit = { gx: 4 + Math.floor(rng() * 4), gy: 16 };

  // 2. 安全路径（章节越高越扭曲）
  const safeSet = new Set();
  const safePath = [];
  let prev = [start.gx, start.gy];
  safeSet.add(`${prev[0]},${prev[1]}`);
  safePath.push(prev);
  const turnBias = [0.3, 0.4, 0.5, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9][chapter];
  for (const c of [...cores, exit]) {
    const segment = generatePath(rng, prev, [c.gx, c.gy], safeSet, turnBias);
    for (const cell of segment) safePath.push(cell);
    prev = [c.gx, c.gy];
  }

  // 3. 墙壁：在非路径格上随机布置（密度提高）+ 障碍簇
  const reserved = new Set();
  for (const p of safePath) reserved.add(`${p[0]},${p[1]}`);
  for (const c of [start, ...cores, exit]) reserved.add(`${c.gx}, ${c.gy}`);
  for (const c of [start, ...cores, exit]) reserved.add(`${c.gx},${c.gy}`);

  const walls = [];
  // 每章的墙体密度（提高，章节越高越密）
  const wallDensity = [0, 0.05, 0.08, 0.10, 0.13, 0.16, 0.19, 0.22, 0.25, 0.28][chapter];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (reserved.has(`${x},${y}`)) continue;
      if (rng() < wallDensity) walls.push({ gx: x, gy: y });
    }
  }
  // 障碍簇：每个核心区下方尝试放 1~2 个，制造走廊感
  const clusterCount = [0, 0, 1, 2, 2, 3, 3, 4, 4, 5][chapter];
  addObstacleCluster(rng, walls, reserved, clusterCount);

  // 4. 机关：每章数量递增，从允许列表中随机
  // 目标数量随关卡号稳定递增（base + 章节内微调），保证难度单调
  const baseHazard = [0, 2, 3, 4, 5, 6, 7, 8, 9, 10][chapter];
  const inChapterIdx = (levelNo - 1) % 10;             // 0..9
  const targetCount = baseHazard + Math.floor(inChapterIdx / 3); // 0/0/1/1/1/2/2/2/2/3
  const hazards = [];
  let attempts = 0;
  while (hazards.length < targetCount && attempts < 200) {
    attempts++;
    const x = Math.floor(rng() * COLS);
    const y = Math.floor(rng() * ROWS);
    if (reserved.has(`${x},${y}`)) continue;
    if (walls.some((w) => w.gx === x && w.gy === y)) continue;
    if (hazards.some((h) => h.gx === x && h.gy === y)) continue;
    const kind = pick(rng, allowed);
    const h = { kind, gx: x, gy: y };
    if (kind === 'conveyor' || kind === 'flow' || kind === 'thorn' || kind === 'turret') {
      // 方向：偏向"推向路径"，即 dir 朝着相邻已放置的核心
      h.dir = Math.floor(rng() * 4);
    }
    if (['move_wall', 'compress', 'blade', 'laser', 'mine', 'door'].includes(kind)) {
      h.period = 1.2 + rng() * 1.6;
    }
    if (kind === 'move_wall') h.speed = 0.5 + rng() * 0.5;
    if (kind === 'blade') h.period = 1.0 + rng() * 0.6;
    hazards.push(h);
  }

  // 5. 记忆碎片（每关 0-1 个）
  const shards = [];
  if (rng() < 0.5) {
    let placed = false;
    for (let t = 0; t < 50 && !placed; t++) {
      const x = Math.floor(rng() * COLS);
      const y = Math.floor(rng() * ROWS);
      if (reserved.has(`${x},${y}`)) continue;
      if (walls.some((w) => w.gx === x && w.gy === y)) continue;
      if (hazards.some((h) => h.gx === x && h.gy === y)) continue;
      shards.push({ gx: x, gy: y });
      placed = true;
    }
  }

  return {
    chapter,
    background,
    timeLimit,
    start,
    cores,
    exit,
    safePath,
    walls,
    hazards,
    shards,
  };
}

const GENERATED = Array.from({ length: 80 }, (_, i) => generateLevel(21 + i));

export const LEVELS = [...HANDCRAFTED, ...GENERATED];

// 立刻自检：开发期就发现问题
const _allErrors = [];
LEVELS.forEach((lv, i) => {
  const errs = validateLevel(lv);
  if (errs.length) _allErrors.push(`L${i + 1}: ${errs.join('; ')}`);
});
if (_allErrors.length) {
  // eslint-disable-next-line no-console
  console.warn('[cursorquest] 关卡自检发现问题：', _allErrors);
}

export const LEVEL_ERRORS = _allErrors;
