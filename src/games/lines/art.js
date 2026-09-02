// 连线迷航 (Lines) - 矢量图形资源
//
// 用 PixiJS Graphics API 程序化绘制所有游戏图形：
// 端点球、连接路径、网格、路径高光、首页图标。
// 全部矢量，任意分辨率缩放不失真，风格统一（清爽抽象 + 柔和渐变质感）。

import * as PIXI from 'pixi.js';
import { PALETTE } from './config.js';

/**
 * 绘制一枚彩色端点球（带高光 + 描边，模拟玻璃质感）
 * @param {number} color 球体颜色
 * @param {number} radius 半径
 * @param {object} opts { filled: 是否实心（连线完成后实心）， alpha }
 */
export function drawBall(color, radius, opts = {}) {
  const g = new PIXI.Graphics();
  const filled = opts.filled ?? false;
  const alpha = opts.alpha ?? 1;

  // 阴影
  g.beginFill(0x000000, 0.18 * alpha);
  g.drawCircle(1.5, 2.5, radius);
  g.endFill();

  // 主体
  g.beginFill(color, alpha);
  g.drawCircle(0, 0, radius);
  g.endFill();

  if (filled) {
    // 实心球：加一道内圈深色描边，更立体
    g.lineStyle(2, 0x000000, 0.22 * alpha);
    g.drawCircle(0, 0, radius - 1);
    g.lineStyle(0);
  } else {
    // 空心端点（未连线时）：内部挖出背景色，呈圆环
    g.beginFill(0x0f1420, alpha);
    g.drawCircle(0, 0, radius * 0.52);
    g.endFill();
  }

  // 高光（左上小白点）
  g.beginFill(0xffffff, 0.55 * alpha);
  g.drawCircle(-radius * 0.32, -radius * 0.36, radius * 0.26);
  g.endFill();

  return g;
}

/**
 * 绘制一条连接路径（折线段）
 * @param {Array<[number,number]>} points 像素坐标点列（折线顶点）
 * @param {number} color 路径颜色
 * @param {number} width 线宽
 */
export function drawPath(points, color, width) {
  const g = new PIXI.Graphics();
  if (!points || points.length < 2) return g;

  // 外发光（柔和的粗线，低透明度）
  g.lineStyle(width + 6, color, 0.18);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    g.lineTo(points[i][0], points[i][1]);
  }

  // 主线
  g.lineStyle(width, color, 1);
  g.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    g.lineTo(points[i][0], points[i][1]);
  }

  // 高光线（细白线叠加，提升质感）
  g.lineStyle(Math.max(2, width * 0.35), 0xffffff, 0.28);
  g.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    g.lineTo(points[i][0], points[i][1]);
  }

  return g;
}

/**
 * 绘制棋盘网格线
 * @param {number} size 每边格子数
 * @param {number} cell 单格像素
 * @param {number} ox 左上角 X
 * @param {number} oy 左上角 Y
 */
export function drawGridLines(size, cell, ox, oy, color = 0x2a3450, alpha = 0.4) {
  const g = new PIXI.Graphics();
  const span = size * cell;
  g.lineStyle(1, color, alpha);
  for (let i = 0; i <= size; i++) {
    g.moveTo(ox + i * cell, oy);
    g.lineTo(ox + i * cell, oy + span);
    g.moveTo(ox, oy + i * cell);
    g.lineTo(ox + span, oy + i * cell);
  }
  return g;
}

/**
 * 绘制首页卡片图标（92x92 内的 Numberlink 示意）
 */
export function drawHomeIcon() {
  const c = new PIXI.Container();
  const g = new PIXI.Graphics();
  // 底板
  g.beginFill(0x203452);
  g.drawRoundedRect(0, 0, 92, 92, 24);
  g.endFill();

  // 微型 4x4 网格示意
  const cell = 16;
  const ox = 14;
  const oy = 14;
  g.lineStyle(1, 0x3a4a6b, 0.6);
  for (let i = 0; i <= 4; i++) {
    g.moveTo(ox + i * cell, oy);
    g.lineTo(ox + i * cell, oy + 4 * cell);
    g.moveTo(ox, oy + i * cell);
    g.lineTo(ox + 4 * cell, oy + i * cell);
  }
  c.addChild(g);

  // 两对端点 + 连线
  const p1 = drawPath([[ox, oy + cell], [ox + cell, oy + cell], [ox + cell, oy + 2 * cell]], 0x4fc3f7, 4);
  c.addChild(p1);
  const p2 = drawPath([[ox + 3 * cell, oy + 3 * cell], [ox + 2 * cell, oy + 3 * cell], [ox + 2 * cell, oy + 2 * cell]], 0xff5c5c, 4);
  c.addChild(p2);

  const b1a = drawBall(0x4fc3f7, 6, { filled: true });
  b1a.x = ox; b1a.y = oy + cell;
  c.addChild(b1a);
  const b1b = drawBall(0x4fc3f7, 6, { filled: true });
  b1b.x = ox + cell; b1b.y = oy + 2 * cell;
  c.addChild(b1b);

  const b2a = drawBall(0xff5c5c, 6, { filled: true });
  b2a.x = ox + 3 * cell; b2a.y = oy + 3 * cell;
  c.addChild(b2a);
  const b2b = drawBall(0xff5c5c, 6, { filled: true });
  b2b.x = ox + 2 * cell; b2b.y = oy + 2 * cell;
  c.addChild(b2b);

  return c;
}
