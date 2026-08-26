// 光标迷航 - 扫掠碰撞检测
//
// 设计要点：
// - 玩家以圆形表示，半径由角色决定。
// - 网格中的"实体格"（墙、尖刺、熔岩等）用一个 AABB 圆角矩形近似。
// - 高速移动时把单帧位移拆成多个子步，每步做一次圆-矩形的最近点距离检测。
// 这样可以避免鼠标快速移动"穿墙"，又比逐像素扫描便宜。

import { CELL, GRID_X, GRID_Y, COLS, ROWS } from './config.js';

/** 实体类型：是否会阻挡移动 / 造成伤害。供 hazards.js / CursorQuestGame.js 引用。 */
export const CELL_KIND = {
  EMPTY: 0,
  WALL: 1,        // 固定墙：阻挡
  HAZARD: 2,      // 机关：会扣血（部分会阻挡/部分不阻挡在 hazards.js 中细分）
  SPIKE: 3,       // 尖刺：扣血
  LAVA: 4,        // 熔岩：扣血
  THORN: 5,       // 单向荆棘（按方向判定）
  GOAL: 6,        // 出口
  CORE: 7,        // 核心
  SHARD: 8,       // 记忆碎片
  MUD: 9,         // 泥地（减速）
  ICE: 10,        // 冰面（打滑）
  CONVEYOR: 11,   // 传送带（推动）
};

/** 获取位置所在的网格坐标（无 clamp，超过则返回 -1） */
export function worldToGrid(x, y) {
  const gx = Math.floor((x - GRID_X) / CELL);
  const gy = Math.floor((y - GRID_Y) / CELL);
  return [gx, gy];
}

/** 圆形与矩形的最近距离（返回最近点 + 距离） */
function circleRectClosest(cx, cy, rx, ry, rw, rh) {
  const nearestX = Math.max(rx, Math.min(cx, rx + rw));
  const nearestY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - nearestX;
  const dy = cy - nearestY;
  return { x: nearestX, y: nearestY, dx, dy, distSq: dx * dx + dy * dy };
}

/** 单点检测：玩家圆与网格中所有实体格的接触。返回命中的格子列表。 */
export function overlapCells(x, y, radius, grid, opts = {}) {
  const { includeMudIce = false, thornDir = null } = opts;
  const minX = Math.max(0, Math.floor((x - radius - GRID_X) / CELL));
  const maxX = Math.min(COLS - 1, Math.floor((x + radius - GRID_X) / CELL));
  const minY = Math.max(0, Math.floor((y - radius - GRID_Y) / CELL));
  const maxY = Math.min(ROWS - 1, Math.floor((y + radius - GRID_Y) / CELL));
  const hits = [];
  for (let gy = minY; gy <= maxY; gy++) {
    for (let gx = minX; gx <= maxX; gx++) {
      const cell = grid[gy]?.[gx];
      if (!cell) continue;
      // 泥地 / 冰面默认不进入 hit 列表，除非显式要求
      if (!includeMudIce && (cell.kind === CELL_KIND.MUD || cell.kind === CELL_KIND.ICE)) continue;
      // 单向荆棘：仅在 thornDir 方向命中
      if (cell.kind === CELL_KIND.THORN && thornDir) {
        if (cell.dir !== thornDir) continue;
      }
      const rx = GRID_X + gx * CELL;
      const ry = GRID_Y + gy * CELL;
      const { distSq } = circleRectClosest(x, y, rx, ry, CELL, CELL);
      const r2 = radius * radius;
      if (distSq < r2) {
        hits.push({ gx, gy, cell, distSq });
      }
    }
  }
  return hits;
}

/**
 * 扫掠移动：把位移按 maxStep 拆成子步，途中遇到墙/阻挡会停在接触边缘。
 * 返回 { x, y, blockedBy, distLeft }：blockedBy 为命中的实体格，distLeft 为剩余未移动距离。
 */
export function sweepMove(x, y, vx, vy, radius, grid, maxStep) {
  const dist = Math.hypot(vx, vy);
  if (dist === 0) return { x, y, blockedBy: null, distLeft: 0 };
  const steps = Math.max(1, Math.ceil(dist / maxStep));
  const sx = vx / steps;
  const sy = vy / steps;
  let cx = x;
  let cy = y;
  let blockedBy = null;
  for (let i = 0; i < steps; i++) {
    const nextX = cx + sx;
    const nextY = cy + sy;
    // 只有实体墙会阻挡；尖刺、熔岩等软机关需要允许玩家接触，
    // 由主循环在接触后执行护盾/扣血逻辑。
    const blockers = overlapCells(nextX, nextY, radius, grid, { includeMudIce: false });
    const hard = blockers.find((h) => h.cell.kind === CELL_KIND.WALL);
    if (hard) {
      // 计算最近边沿：圆心推到刚接触的位置
      const rx = GRID_X + hard.gx * CELL;
      const ry = GRID_Y + hard.gy * CELL;
      const cn = circleRectClosest(nextX, nextY, rx, ry, CELL, CELL);
      if (cn.distSq > 0) {
        const n = Math.sqrt(cn.distSq);
        // 让圆心到达 (最近点 + 半径 * 法线)
        const factor = radius / n;
        const pushX = cn.dx * factor;
        const pushY = cn.dy * factor;
        // 取一个保守推进：沿运动方向
        cx = cn.x + pushX;
        cy = cn.y + pushY;
      }
      blockedBy = hard;
      break;
    }
    cx = nextX;
    cy = nextY;
  }
  return { x: cx, y: cy, blockedBy, distLeft: dist - Math.hypot(cx - x, cy - y) };
}

/** 玩家位置是否到达出口格 */
export function isOnGoal(x, y, radius, goal) {
  if (!goal) return false;
  const cx = GRID_X + goal.gx * CELL + CELL / 2;
  const cy = GRID_Y + goal.gy * CELL + CELL / 2;
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy < (radius + CELL * 0.4) ** 2;
}
