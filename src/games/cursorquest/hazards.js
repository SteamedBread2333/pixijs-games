// 光标迷航 - 20 种机关
//
// 机关以对象数组形式存在于关卡中：
//   { kind, gx, gy, dir?, speed?, period?, phase?, ... }
// 渲染层根据 kind 选择绘制方案；每帧 update(dt) 更新动画状态。
//
// 设计原则：
//  - 每种机关都有"基底色块 + 中央图标"，玩家一眼能识别
//  - 方向性机关（传送带/水流/荆棘/炮台）有清晰大箭头
//  - 周期性机关（激光/门/雷）触发前有 0.2s 预警闪烁
//  - 泥地 / 冰面有地面纹理提示

import * as PIXI from 'pixi.js';
import { CELL, GRID_X, GRID_Y, COLS, ROWS } from './config.js';
import { CELL_KIND } from './collision.js';

const HAZARD_KIND = {
  WALL: 'wall',
  SPIKE: 'spike',
  MUD: 'mud',
  ICE: 'ice',
  CONVEYOR: 'conveyor',
  FLOW: 'flow',
  LAVA: 'lava',
  CRACK: 'crack',
  BRIDGE: 'bridge',
  THORN: 'thorn',
  MOVE_WALL: 'move_wall',
  COMPRESS: 'compress',
  BLADE: 'blade',
  LASER: 'laser',
  MINE: 'mine',
  RAIL: 'rail',
  TURRET: 'turret',
  TRACK: 'track',
  DOOR: 'door',
  TPORT: 'tport',
};

export const HAZARD_KINDS = HAZARD_KIND;

export { HAZARD_KIND as HAZARD };
export { HAZARD_KIND };

// 视觉颜色（基底色块）
const C = {
  wall: 0x39425a,
  spike: 0xc0c0d0,
  mud: 0x6b4a2a,
  ice: 0x9ad0ff,
  conveyor: 0x4a5a4a,
  flow: 0x2a5a8a,
  lava: 0xff5a2a,
  crack: 0x707888,
  bridge: 0x9b6a3a,
  thorn: 0xc040a0,
  move_wall: 0x4f5a7a,
  compress: 0x8a4a4a,
  blade: 0xe0e0ee,
  laser: 0xff3060,
  mine: 0xff5060,
  rail: 0x80c0ff,
  turret: 0x4a4a4a,
  track: 0x9a4ad0,
  door: 0xb0a060,
  tport: 0x60e0c0,
};

// 危险：是否对玩家造成伤害（hit 列表）
export const DAMAGE_HAZARDS = new Set([
  HAZARD_KIND.SPIKE, HAZARD_KIND.LAVA, HAZARD_KIND.THORN,
  HAZARD_KIND.MOVE_WALL, HAZARD_KIND.COMPRESS, HAZARD_KIND.BLADE,
  HAZARD_KIND.LASER, HAZARD_KIND.MINE, HAZARD_KIND.RAIL, HAZARD_KIND.TURRET,
  HAZARD_KIND.TRACK, HAZARD_KIND.TPORT,
]);

// 减速/打滑
export const SLOW_HAZARDS = new Set([HAZARD_KIND.MUD]);
export const SLIP_HAZARDS = new Set([HAZARD_KIND.ICE]);
// 推动
export const PUSH_HAZARDS = new Set([HAZARD_KIND.CONVEYOR, HAZARD_KIND.FLOW]);

/** 根据 kind 推断对应的碰撞 kind（用于 collision.js 的圆-格查询） */
export function collisionKindOf(hazard) {
  switch (hazard.kind) {
    case HAZARD_KIND.WALL:
    case HAZARD_KIND.MOVE_WALL:
    case HAZARD_KIND.COMPRESS:
    case HAZARD_KIND.DOOR:
      return CELL_KIND.WALL;
    case HAZARD_KIND.SPIKE:
    case HAZARD_KIND.MINE:
    case HAZARD_KIND.BLADE:
    case HAZARD_KIND.RAIL:
    case HAZARD_KIND.TURRET:
    case HAZARD_KIND.LASER:
    case HAZARD_KIND.TRACK:
    case HAZARD_KIND.TPORT:
      return CELL_KIND.SPIKE;
    case HAZARD_KIND.LAVA:
      return CELL_KIND.LAVA;
    case HAZARD_KIND.THORN:
      return CELL_KIND.THORN;
    case HAZARD_KIND.MUD:
    case HAZARD_KIND.ICE:
    case HAZARD_KIND.CONVEYOR:
    case HAZARD_KIND.FLOW:
    case HAZARD_KIND.CRACK:
    case HAZARD_KIND.BRIDGE:
      return CELL_KIND.EMPTY;
    default:
      return CELL_KIND.EMPTY;
  }
}

/** 像素中心点（用于扇形 / 圆周等不在格心的对象） */
function cellCenter(h) {
  return [GRID_X + h.gx * CELL + CELL / 2, GRID_Y + h.gy * CELL + CELL / 2];
}

// ============== 通用绘制工具 ==============

/** 在 h 中心画一个方向箭头：dir 0=右 1=左 2=下 3=上 */
function drawArrow(g, h, color, alpha = 1, size = 10) {
  const cx = CELL / 2;
  const cy = CELL / 2;
  const d = h.dir ?? 0;
  const dx = [1, -1, 0, 0][d];
  const dy = [0, 0, 1, -1][d];
  const px = [-dy, dy, -dx, dx][d]; // 垂直方向
  const py = [dx, -dx, dy, -dy][d];
  g.beginFill(color, alpha);
  // 箭头三角形（指向 dx/dy）
  g.moveTo(cx + dx * size, cy + dy * size);
  g.lineTo(cx - dx * size * 0.3 + px * size * 0.6, cy - dy * size * 0.3 + py * size * 0.6);
  g.lineTo(cx - dx * size * 0.5, cy - dy * size * 0.5);
  g.lineTo(cx - dx * size * 0.3 - px * size * 0.6, cy - dy * size * 0.3 - py * size * 0.6);
  g.endFill();
}

/** 在 h 中心画一个菱形符号（表示该格有重要效果） */
function drawDiamond(g, color, alpha = 1) {
  const cx = CELL / 2;
  const cy = CELL / 2;
  const s = 5;
  g.beginFill(color, alpha);
  g.moveTo(cx, cy - s);
  g.lineTo(cx + s, cy);
  g.lineTo(cx, cy + s);
  g.lineTo(cx - s, cy);
  g.endFill();
}

function drawBase(g, h, color) {
  g.beginFill(color, 0.95);
  g.drawRect(0, 0, CELL, CELL);
  g.endFill();
}

function stroke(g, color, w = 1, alpha = 1) {
  g.lineStyle(w, color, alpha);
  g.drawRect(0.5, 0.5, CELL - 1, CELL - 1);
}

// ============== 渲染 ==============

function renderWall(g, h) {
  drawBase(g, h, C.wall);
  stroke(g, 0x1c2230, 2);
  // 砖纹
  g.lineStyle(1, 0x1c2230, 0.5);
  g.moveTo(0, CELL / 2); g.lineTo(CELL, CELL / 2);
  g.moveTo(CELL / 2, 0); g.lineTo(CELL / 2, CELL / 2);
  g.moveTo(CELL / 4, CELL / 2); g.lineTo(CELL / 4, CELL);
  g.moveTo(CELL * 0.75, CELL / 2); g.lineTo(CELL * 0.75, CELL);
}

function renderSpike(g, h) {
  g.beginFill(0x2a3145);
  g.drawRect(0, 0, CELL, CELL);
  g.endFill();
  // 三角刺
  const peaks = 4;
  const w = CELL / peaks;
  g.beginFill(C.spike);
  for (let i = 0; i < peaks; i++) {
    const x = i * w;
    g.moveTo(x, CELL);
    g.lineTo(x + w / 2, 2);
    g.lineTo(x + w, CELL);
  }
  g.endFill();
  // 中央危险符号：红边
  g.lineStyle(1.5, 0xff4060, 0.7);
  drawDiamond(g, 0xff4060, 0.3);
}

function renderMud(g, h) {
  drawBase(g, h, C.mud);
  // 泥点
  g.beginFill(0x3b2810, 0.7);
  g.drawEllipse(CELL * 0.3, CELL * 0.4, 6, 4);
  g.drawEllipse(CELL * 0.7, CELL * 0.65, 5, 3);
  g.endFill();
  // 中央脚印/减速提示（向下箭头变小）
  g.beginFill(0xfff3a0, 0.4);
  g.drawCircle(CELL * 0.5, CELL * 0.5, 4);
  g.endFill();
  g.lineStyle(1.5, 0xfff3a0, 0.7);
  g.moveTo(CELL * 0.5 - 4, CELL * 0.5 - 2);
  g.lineTo(CELL * 0.5, CELL * 0.5 + 3);
  g.lineTo(CELL * 0.5 + 4, CELL * 0.5 - 2);
  g.moveTo(CELL * 0.5, CELL * 0.5 + 3);
  g.lineTo(CELL * 0.5, CELL * 0.5 + 7);
}

function renderIce(g, h) {
  g.beginFill(C.ice, 0.55);
  g.drawRect(0, 0, CELL, CELL);
  g.endFill();
  // 雪花标记
  g.lineStyle(1.5, 0xffffff, 0.85);
  const cx = CELL * 0.5, cy = CELL * 0.5;
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI / 3;
    g.moveTo(cx + Math.cos(a) * 7, cy + Math.sin(a) * 7);
    g.lineTo(cx - Math.cos(a) * 7, cy - Math.sin(a) * 7);
  }
  g.lineStyle(1, 0xffffff, 0.4);
  g.moveTo(4, 8); g.lineTo(20, 4);
  g.moveTo(8, 22); g.lineTo(28, 18);
}

function renderConveyor(g, h) {
  drawBase(g, h, C.conveyor);
  // 运动条纹（沿 dir 方向流动）
  const off = (h.t * 24) % CELL;
  g.lineStyle(3, 0xeeeeee, 0.85);
  for (let i = -1; i < 3; i++) {
    const a = i * 12 + off;
    if (h.dir === 0) { g.moveTo(a, 4); g.lineTo(a + 8, CELL - 4); }
    if (h.dir === 1) { g.moveTo(a, 4); g.lineTo(a - 8, CELL - 4); }
    if (h.dir === 2) { g.moveTo(4, a); g.lineTo(CELL - 4, a + 8); }
    if (h.dir === 3) { g.moveTo(4, a); g.lineTo(CELL - 4, a - 8); }
  }
  // 中央大箭头（指示推动方向）
  g.beginFill(0xffd35c, 0.85);
  const cx = CELL / 2, cy = CELL / 2;
  const d = h.dir ?? 0;
  const dx = [1, -1, 0, 0][d];
  const dy = [0, 0, 1, -1][d];
  const px = [-dy, dy, -dx, dx][d];
  const py = [dx, -dx, dy, -dy][d];
  g.moveTo(cx + dx * 9, cy + dy * 9);
  g.lineTo(cx - dx * 4 + px * 6, cy - dy * 4 + py * 6);
  g.lineTo(cx - dx * 2, cy - dy * 2);
  g.lineTo(cx - dx * 4 - px * 6, cy - dy * 4 - py * 6);
  g.endFill();
}

function renderFlow(g, h) {
  // 深蓝水底
  drawBase(g, h, 0x18324a);
  g.beginFill(0x3a6a9a, 0.6);
  g.drawRect(0, 0, CELL, CELL);
  g.endFill();
  // 水流箭头（沿 dir 方向流动）
  const off = (h.t * 18) % CELL;
  g.lineStyle(1.5, 0xbedcff, 0.7);
  for (let i = -1; i < 3; i++) {
    const a = i * 10 + off;
    if (h.dir === 0) { g.moveTo(a, CELL / 2 - 4); g.lineTo(a + 10, CELL / 2 - 4); g.lineTo(a + 10, CELL / 2 - 7); }
    if (h.dir === 1) { g.moveTo(a, CELL / 2 - 4); g.lineTo(a - 10, CELL / 2 - 4); g.lineTo(a - 10, CELL / 2 - 7); }
    if (h.dir === 2) { g.moveTo(CELL / 2 - 4, a); g.lineTo(CELL / 2 - 4, a + 10); g.lineTo(CELL / 2 - 7, a + 10); }
    if (h.dir === 3) { g.moveTo(CELL / 2 - 4, a); g.lineTo(CELL / 2 - 4, a - 10); g.lineTo(CELL / 2 - 7, a - 10); }
  }
  // 中央大箭头（推送方向）
  g.beginFill(0x6ab0e0, 0.9);
  const cx = CELL / 2, cy = CELL / 2 + 2;
  const d = h.dir ?? 0;
  const dx = [1, -1, 0, 0][d];
  const dy = [0, 0, 1, -1][d];
  const px = [-dy, dy, -dx, dx][d];
  const py = [dx, -dx, dy, -dy][d];
  g.moveTo(cx + dx * 9, cy + dy * 9);
  g.lineTo(cx - dx * 4 + px * 6, cy - dy * 4 + py * 6);
  g.lineTo(cx - dx * 2, cy - dy * 2);
  g.lineTo(cx - dx * 4 - px * 6, cy - dy * 4 - py * 6);
  g.endFill();
}

function renderLava(g, h) {
  g.beginFill(0x3a1408);
  g.drawRect(0, 0, CELL, CELL);
  g.endFill();
  const off = (h.t * 5) % CELL;
  g.beginFill(C.lava, 0.9);
  g.drawEllipse(CELL * 0.5, CELL * 0.5 + Math.sin((h.t + h.gx) * 3) * 2, CELL * 0.45, 4 + Math.sin((h.t + h.gy) * 4) * 2);
  g.endFill();
  g.beginFill(0xffd35c, 0.7);
  g.drawEllipse(CELL * 0.4 + off * 0.3, CELL * 0.45, 4, 2);
  g.endFill();
  // 中央火焰图标
  g.beginFill(0xffd35c, 0.9);
  g.moveTo(CELL * 0.5, CELL * 0.32);
  g.lineTo(CELL * 0.6, CELL * 0.55);
  g.lineTo(CELL * 0.55, CELL * 0.48);
  g.lineTo(CELL * 0.65, CELL * 0.62);
  g.lineTo(CELL * 0.5, CELL * 0.45);
  g.lineTo(CELL * 0.35, CELL * 0.62);
  g.lineTo(CELL * 0.45, CELL * 0.48);
  g.lineTo(CELL * 0.4, CELL * 0.55);
  g.endFill();
}

function renderCrack(g, h) {
  drawBase(g, h, 0x505868);
  // 碎裂裂纹
  g.lineStyle(1.5, 0x10131c, 0.9);
  g.moveTo(4, 4); g.lineTo(CELL / 2, CELL / 2); g.lineTo(CELL - 4, CELL - 4);
  g.moveTo(CELL - 4, 6); g.lineTo(CELL / 2, CELL / 2 + 2); g.lineTo(4, CELL - 4);
  g.moveTo(CELL * 0.3, 4); g.lineTo(CELL * 0.35, CELL * 0.4);
  g.moveTo(CELL * 0.7, CELL - 4); g.lineTo(CELL * 0.65, CELL * 0.6);
  // 警告感叹号
  g.beginFill(0xffd35c, 0.85);
  g.drawRect(CELL * 0.47, CELL * 0.3, 2, 9);
  g.drawRect(CELL * 0.47, CELL * 0.62, 2, 2);
  g.endFill();
}

function renderBridge(g, h) {
  drawBase(g, h, 0x6a4828);
  g.beginFill(C.bridge);
  g.drawRect(2, 6, CELL - 4, CELL - 12);
  g.endFill();
  stroke(g, 0x3a2010, 1);
  // 木板纹
  g.lineStyle(1, 0x3a2010, 0.6);
  g.moveTo(2, CELL * 0.4); g.lineTo(CELL - 2, CELL * 0.4);
  g.moveTo(2, CELL * 0.6); g.lineTo(CELL - 2, CELL * 0.6);
  // 碎裂标记
  g.beginFill(0xff8a80, 0.7);
  g.drawCircle(CELL * 0.78, CELL * 0.28, 3);
  g.endFill();
}

function renderThorn(g, h) {
  g.beginFill(0x2a1a30);
  g.drawRect(0, 0, CELL, CELL);
  g.endFill();
  g.beginFill(C.thorn);
  // dir: 0=up, 1=right, 2=down, 3=left
  if (h.dir === 0) g.drawPolygon([0, CELL, CELL, CELL, CELL / 2, 2]);
  if (h.dir === 1) g.drawPolygon([0, 0, 2, CELL / 2, 0, CELL]);
  if (h.dir === 2) g.drawPolygon([0, 0, CELL, 0, CELL / 2, CELL - 2]);
  if (h.dir === 3) g.drawPolygon([CELL, 0, CELL, CELL, 2, CELL / 2]);
  g.endFill();
  // 方向描边（让方向更明显）
  g.lineStyle(1, 0xffffff, 0.5);
  const cx = CELL / 2, cy = CELL / 2;
  const d = h.dir ?? 0;
  const dx = [0, 1, 0, -1][d];
  const dy = [-1, 0, 1, 0][d];
  g.moveTo(cx, cy);
  g.lineTo(cx + dx * 10, cy + dy * 10);
  stroke(g, 0xffffff, 1, 0.4);
}

function renderMoveWall(g, h) {
  drawBase(g, h, C.move_wall);
  stroke(g, 0x1c2230, 2);
  // 运动箭头（提示会移动）
  g.beginFill(0xffd35c, 0.9);
  drawArrow(g, h, 0xffd35c, 0.9, 9);
  g.endFill();
  // 运动条纹
  const off = (h.t * 18) % CELL;
  g.lineStyle(1, 0xffffff, 0.5);
  for (let i = -1; i < 3; i++) {
    const a = i * 10 + off;
    const d = h.dir ?? 0;
    if (d === 0) { g.moveTo(a, 4); g.lineTo(a + 6, CELL - 4); }
    if (d === 1) { g.moveTo(a, 4); g.lineTo(a - 6, CELL - 4); }
    if (d === 2) { g.moveTo(4, a); g.lineTo(CELL - 4, a + 6); }
    if (d === 3) { g.moveTo(4, a); g.lineTo(CELL - 4, a - 6); }
  }
}

function renderCompress(g, h) {
  drawBase(g, h, C.compress);
  // "压" 字提示：双向箭头
  g.lineStyle(2, 0xffd35c, 0.9);
  g.moveTo(4, CELL / 2); g.lineTo(CELL - 4, CELL / 2);
  g.lineStyle(1.5, 0x2a1408, 0.7);
  g.moveTo(0, 0); g.lineTo(CELL, CELL);
  g.moveTo(CELL, 0); g.lineTo(0, CELL);
  // 充能时变亮
  if (h.charging) {
    g.beginFill(0xff5252, 0.35);
    g.drawRect(0, 0, CELL, CELL);
    g.endFill();
  }
  // 双向箭头细节
  g.beginFill(0xffd35c, 0.9);
  g.moveTo(4, CELL / 2 - 3); g.lineTo(10, CELL / 2); g.lineTo(4, CELL / 2 + 3);
  g.endFill();
  g.beginFill(0xffd35c, 0.9);
  g.moveTo(CELL - 4, CELL / 2 - 3); g.lineTo(CELL - 10, CELL / 2); g.lineTo(CELL - 4, CELL / 2 + 3);
  g.endFill();
}

function renderBlade(g, h) {
  g.beginFill(0x222a3a);
  g.drawRect(0, 0, CELL, CELL);
  g.endFill();
  // 旋转的刀
  g.lineStyle(2.5, C.blade, 0.95);
  for (let i = 0; i < 4; i++) {
    const a = h.angle + i * Math.PI / 2;
    g.moveTo(CELL / 2, CELL / 2);
    g.lineTo(CELL / 2 + Math.cos(a) * CELL * 0.45, CELL / 2 + Math.sin(a) * CELL * 0.45);
  }
  g.beginFill(0x6a6a7a);
  g.drawCircle(CELL / 2, CELL / 2, 4);
  g.endFill();
  g.beginFill(0xffffff, 0.4);
  g.drawCircle(CELL / 2, CELL / 2, 1.5);
  g.endFill();
}

function renderLaser(g, h) {
  g.beginFill(0x10131c);
  g.drawRect(0, 0, CELL, CELL);
  g.endFill();
  // 基座
  g.beginFill(0x4a4a5a);
  g.drawRect(CELL / 2 - 4, CELL / 2 - 4, 8, 8);
  g.endFill();
  g.beginFill(0x2a2a3a);
  g.drawRect(CELL / 2 - 4, CELL / 2 - 4, 8, 8);
  g.endFill();
  // 激光：on 时为高亮红光带，off 时为暗红细线
  if (h.on) {
    g.lineStyle(3, C.laser, 1);
    g.moveTo(0, CELL / 2); g.lineTo(CELL, CELL / 2);
    g.beginFill(C.laser, 0.55);
    g.drawRect(0, CELL / 2 - 5, CELL, 10);
    g.endFill();
    g.beginFill(0xffffff, 0.6);
    g.drawCircle(CELL / 2, CELL / 2, 2);
    g.endFill();
  } else {
    g.lineStyle(1, C.laser, 0.3);
    g.moveTo(0, CELL / 2); g.lineTo(CELL, CELL / 2);
    // 预警：即将触发时闪烁
    if (h.charge > 0) {
      const a = 0.3 + Math.abs(Math.sin(h.charge * 18)) * 0.5;
      g.lineStyle(1.5, 0xffd35c, a);
      g.moveTo(0, CELL / 2 - 6); g.lineTo(CELL, CELL / 2 - 6);
      g.moveTo(0, CELL / 2 + 6); g.lineTo(CELL, CELL / 2 + 6);
    }
  }
}

function renderMine(g, h) {
  g.beginFill(0x202028);
  g.drawRect(0, 0, CELL, CELL);
  g.endFill();
  g.beginFill(0x4a4a5a);
  g.drawCircle(CELL / 2, CELL / 2, CELL * 0.35);
  g.endFill();
  const pulse = h.pulse || 0;
  g.beginFill(C.mine, 0.85 + pulse * 0.15);
  g.drawCircle(CELL / 2, CELL / 2, CELL * 0.2 + pulse * 3);
  g.endFill();
  // 引信
  g.beginFill(0xffffff);
  g.drawRect(CELL / 2 - 1, 6, 2, 4);
  g.endFill();
  // 预警：脉冲达到峰值时整个格子变红
  if (pulse > 0.85) {
    g.beginFill(0xff8a80, 0.4 + (pulse - 0.85) * 4);
    g.drawRect(0, 0, CELL, CELL);
    g.endFill();
  }
}

function renderRail(g, h) {
  drawBase(g, h, 0x202838);
  // 移动电弧
  const off = (h.t * CELL * 0.8) % CELL;
  g.lineStyle(2.5, C.rail, 0.95);
  g.moveTo(off, 4); g.lineTo(off + 5, CELL - 4);
  g.lineStyle(1, C.rail, 0.5);
  g.moveTo(off - 6, CELL - 6); g.lineTo(off + 10, CELL - 12);
  // 闪电符号
  g.beginFill(0xffffff, 0.85);
  g.moveTo(CELL * 0.55, CELL * 0.25);
  g.lineTo(CELL * 0.4, CELL * 0.55);
  g.lineTo(CELL * 0.5, CELL * 0.55);
  g.lineTo(CELL * 0.4, CELL * 0.78);
  g.lineTo(CELL * 0.6, CELL * 0.45);
  g.lineTo(CELL * 0.5, CELL * 0.45);
  g.lineTo(CELL * 0.55, CELL * 0.25);
  g.endFill();
}

function renderTurret(g, h) {
  g.beginFill(0x141820);
  g.drawRect(0, 0, CELL, CELL);
  g.endFill();
  // 炮台底座
  g.beginFill(C.turret);
  g.drawCircle(CELL / 2, CELL / 2, CELL * 0.35);
  g.endFill();
  stroke(g, 0x202028, 1);
  // 炮管（粗箭头）
  g.beginFill(0xffffff, 0.85);
  drawArrow(g, h, 0xffffff, 0.85, 12);
  g.endFill();
  // 红色目标点
  g.beginFill(0xff4060, 0.9);
  g.drawCircle(CELL / 2, CELL / 2, 3);
  g.endFill();
}

function renderTrack(g, h) {
  g.beginFill(0x10131c);
  g.drawRect(0, 0, CELL, CELL);
  g.endFill();
  // 追踪球
  g.beginFill(C.track, 0.9);
  g.drawCircle(CELL / 2, CELL / 2, CELL * 0.32);
  g.endFill();
  g.beginFill(0xffffff, 0.6);
  g.drawCircle(CELL / 2 - 3, CELL / 2 - 3, 2.5);
  g.endFill();
  // 眼睛图样（强化"会追踪"的暗示）
  g.beginFill(0x10131c, 0.8);
  g.drawCircle(CELL / 2 - 3, CELL / 2 - 2, 1.5);
  g.drawCircle(CELL / 2 + 3, CELL / 2 - 2, 1.5);
  g.endFill();
}

function renderDoor(g, h) {
  drawBase(g, h, 0x4a4a4a);
  if (h.open) {
    // 开启：淡蓝框
    g.beginFill(0x88ddff, 0.4);
    g.drawRect(4, 4, CELL - 8, CELL - 8);
    g.endFill();
    g.lineStyle(2, 0x88ddff, 0.7);
    g.drawRect(4, 4, CELL - 8, CELL - 8);
    g.beginFill(0x88ddff, 0.85);
    g.drawCircle(CELL * 0.5, CELL * 0.5, 4);
    g.endFill();
  } else {
    // 关闭：金属门
    g.beginFill(C.door);
    g.drawRect(2, 2, CELL - 4, CELL - 4);
    g.endFill();
    stroke(g, 0x2a2a14, 2);
    g.beginFill(0x2a2a14, 0.6);
    g.drawCircle(CELL * 0.5, CELL * 0.5, 3);
    g.endFill();
  }
  // 关闭状态下的"将要开启"预警
  if (h.charge > 0) {
    g.beginFill(0xffd35c, 0.2 + Math.abs(Math.sin(h.charge * 16)) * 0.3);
    g.drawRect(2, 2, CELL - 4, CELL - 4);
    g.endFill();
  }
}

function renderTport(g, h) {
  g.beginFill(0x10131c);
  g.drawRect(0, 0, CELL, CELL);
  g.endFill();
  // 旋涡
  g.lineStyle(2.5, C.tport, 0.7 + Math.sin(h.t * 3) * 0.25);
  g.drawCircle(CELL / 2, CELL / 2, CELL * 0.32);
  g.lineStyle(1.5, C.tport, 0.5 + Math.sin(h.t * 3) * 0.2);
  g.drawCircle(CELL / 2, CELL / 2, CELL * 0.2);
  g.beginFill(0xffffff, 0.9);
  g.drawCircle(CELL / 2, CELL / 2, 2.5);
  g.endFill();
  // 中心箭头
  g.beginFill(0xffd35c, 0.85);
  g.drawPolygon([
    CELL * 0.5, CELL * 0.2,
    CELL * 0.65, CELL * 0.45,
    CELL * 0.55, CELL * 0.45,
    CELL * 0.55, CELL * 0.75,
    CELL * 0.45, CELL * 0.75,
    CELL * 0.45, CELL * 0.45,
    CELL * 0.35, CELL * 0.45,
  ]);
  g.endFill();
}

const RENDERERS = {
  [HAZARD_KIND.WALL]: renderWall,
  [HAZARD_KIND.SPIKE]: renderSpike,
  [HAZARD_KIND.MUD]: renderMud,
  [HAZARD_KIND.ICE]: renderIce,
  [HAZARD_KIND.CONVEYOR]: renderConveyor,
  [HAZARD_KIND.FLOW]: renderFlow,
  [HAZARD_KIND.LAVA]: renderLava,
  [HAZARD_KIND.CRACK]: renderCrack,
  [HAZARD_KIND.BRIDGE]: renderBridge,
  [HAZARD_KIND.THORN]: renderThorn,
  [HAZARD_KIND.MOVE_WALL]: renderMoveWall,
  [HAZARD_KIND.COMPRESS]: renderCompress,
  [HAZARD_KIND.BLADE]: renderBlade,
  [HAZARD_KIND.LASER]: renderLaser,
  [HAZARD_KIND.MINE]: renderMine,
  [HAZARD_KIND.RAIL]: renderRail,
  [HAZARD_KIND.TURRET]: renderTurret,
  [HAZARD_KIND.TRACK]: renderTrack,
  [HAZARD_KIND.DOOR]: renderDoor,
  [HAZARD_KIND.TPORT]: renderTport,
};

/**
 * 创建/重置一个机关的可视容器。
 * @param {object} h 机关数据
 * @returns {PIXI.Container}
 */
export function createHazardView(h) {
  const c = new PIXI.Container();
  c.x = GRID_X + h.gx * CELL;
  c.y = GRID_Y + h.gy * CELL;
  c.gfx = new PIXI.Graphics();
  c.addChild(c.gfx);
  c.hazard = h;
  drawHazard(c);
  return c;
}

function drawHazard(c) {
  if (!c || !c.gfx || c.gfx._destroyed) return;
  const h = c.hazard;
  const g = c.gfx;
  g.clear();
  const fn = RENDERERS[h.kind];
  if (fn) fn(g, h);
}

/** 每帧更新：根据 h.t / h.on / h.pulse / h.angle 等变化重绘 */
export function updateHazard(c, dt) {
  if (!c || !c.gfx || c.gfx._destroyed) return;
  const h = c.hazard;
  h.t = (h.t || 0) + dt;
  // 周期量
  if (h.period) {
    const phase = (h.t / h.period) % 1;
    h.phase = phase;
    if (h.kind === HAZARD_KIND.LASER) {
      // 0~0.1 预警, 0.1~0.5 on, 0.5~0.6 预警灭, 0.6~1 off
      h.on = phase < 0.5;
      h.charge = phase >= 0.5 && phase < 0.6 ? (phase - 0.5) / 0.1 : 0;
    } else if (h.kind === HAZARD_KIND.MINE) {
      h.pulse = Math.max(0, Math.sin(phase * Math.PI * 2));
    } else if (h.kind === HAZARD_KIND.DOOR) {
      h.open = phase < 0.5;
      h.charge = phase >= 0.5 && phase < 0.6 ? (phase - 0.5) / 0.1 : 0;
    } else if (h.kind === HAZARD_KIND.COMPRESS) {
      // 充能阶段
      h.charging = phase >= 0.5;
    } else if (h.kind === HAZARD_KIND.BLADE) {
      h.angle = (h.angle || 0) + dt * 4 * (h.speed || 1);
    } else if (h.kind === HAZARD_KIND.MOVE_WALL) {
      // 移动位置由 main update 推动；这里只更新视觉
    } else if (h.kind === HAZARD_KIND.TRACK) {
      // 追踪球由 main update 推动
    }
  } else if (h.kind === HAZARD_KIND.BLADE) {
    h.angle = (h.angle || 0) + dt * 4;
  }
  drawHazard(c);
}

// 收集所有 20 种机关的可见描述（用于"20 种机制"覆盖校验）
export const HAZARD_LABELS = [
  ['wall', '固定墙'],
  ['spike', '尖刺'],
  ['mud', '泥地·减速'],
  ['ice', '冰面·打滑'],
  ['conveyor', '传送带→'],
  ['flow', '水流→'],
  ['lava', '熔岩'],
  ['crack', '碎裂地板'],
  ['bridge', '坍塌桥'],
  ['thorn', '单向荆棘→'],
  ['move_wall', '移动墙→'],
  ['compress', '压缩机'],
  ['blade', '旋转刃'],
  ['laser', '激光门'],
  ['mine', '脉冲雷'],
  ['rail', '电轨'],
  ['turret', '炮台→'],
  ['track', '追踪球'],
  ['door', '定时门'],
  ['tport', '错误传送门'],
];

export { C as HAZARD_COLOR };
export function listAllHazardKinds() {
  return HAZARD_LABELS.map(([k]) => k);
}
