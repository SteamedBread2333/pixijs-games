// 光标迷航 - 像素角色绘制
// 使用 PIXI.Graphics 在程序化画布上绘制像素图块，避免外部图片资源。

import * as PIXI from 'pixi.js';
import { CHARACTERS } from './config.js';

const PIXEL_SIZE = 1.5;       // 角色像素点尺寸（画在 PIXI 上）
const EYE_OFFSET = 1.2;       // 眼睛位置相对缩放

/**
 * 创建一个角色容器。
 * @param {string} id - 'xiaoshan' | 'nuonuo' | 'tuantuan'
 * @returns {PIXI.Container}
 */
export function createCharacter(id) {
  const def = CHARACTERS[id] || CHARACTERS.nuonuo;
  const container = new PIXI.Container();

  const width = def.pixelBody[0].length;
  const height = def.pixelBody.length;
  const totalW = width * PIXEL_SIZE;
  const totalH = height * PIXEL_SIZE;
  const offsetX = -totalW / 2;
  const offsetY = -totalH / 2;

  const body = new PIXI.Graphics();
  for (let y = 0; y < height; y++) {
    const row = def.pixelBody[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.') continue;
      if (ch === 'X') {
        body.beginFill(0x222a3a);
        body.drawRect(offsetX + x * PIXEL_SIZE, offsetY + y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
        body.endFill();
      } else if (ch === 'Y') {
        body.beginFill(def.color);
        body.drawRect(offsetX + x * PIXEL_SIZE, offsetY + y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
        body.endFill();
      }
    }
  }
  container.addChild(body);

  // 眼睛（小点）
  const eyes = new PIXI.Graphics();
  const eyeY = offsetY + 2 * PIXEL_SIZE + 0.2;
  eyes.beginFill(0x111111);
  eyes.drawRect(offsetX + 2.5 * PIXEL_SIZE, eyeY, 0.9 * PIXEL_SIZE, 0.9 * PIXEL_SIZE);
  eyes.drawRect(offsetX + 4.5 * PIXEL_SIZE, eyeY, 0.9 * PIXEL_SIZE, 0.9 * PIXEL_SIZE);
  eyes.endFill();
  container.addChild(eyes);

  // 命中范围（debug 时可见）
  container.debugHit = new PIXI.Graphics();
  container.debugHit.lineStyle(1, 0xff00ff, 0.4);
  container.debugHit.drawCircle(0, 0, def.radius);
  container.debugHit.visible = false;
  container.addChild(container.debugHit);

  container.def = def;
  return container;
}

/** 角色脚下"移动指示"：表示在地面上移动 */
export function createWalkDust() {
  const g = new PIXI.Graphics();
  g.beginFill(0xffffff, 0.5);
  g.drawCircle(0, 0, 2.4);
  g.endFill();
  g.alpha = 0;
  return g;
}
