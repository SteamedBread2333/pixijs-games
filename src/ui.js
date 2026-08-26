// 共享 UI 组件
import * as PIXI from 'pixi.js';

export const UI_FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif';

/** 现代圆角按钮 */
export function makeButton(label, w, h, onClick, opts = {}) {
  const btn = new PIXI.Container();

  const shadow = new PIXI.Graphics();
  shadow.beginFill(0x000000, 0.2);
  shadow.drawRoundedRect(0, 4, w, h, Math.min(12, h / 2));
  shadow.endFill();
  btn.addChild(shadow);

  const bg = new PIXI.Graphics();
  bg.beginFill(opts.fill ?? 0x2c3e50);
  bg.drawRoundedRect(0, 0, w, h, Math.min(12, h / 2));
  bg.endFill();
  bg.lineStyle(1, opts.border ?? 0xffffff, opts.borderAlpha ?? 0.16);
  bg.drawRoundedRect(0.5, 0.5, w - 1, h - 1, Math.min(12, h / 2));
  btn.addChild(bg);

  const text = new PIXI.Text(label, {
    fontFamily: UI_FONT,
    fontWeight: opts.fontWeight ?? '600',
    fontSize: opts.fontSize ?? 16,
    fill: opts.color ?? 0xffffff,
  });
  text.anchor.set(0.5);
  text.x = w / 2;
  text.y = h / 2;
  btn.addChild(text);

  btn.eventMode = 'static';
  btn.cursor = 'pointer';
  btn.hitArea = new PIXI.Rectangle(0, 0, w, h);
  btn.on('pointerdown', (e) => e.stopPropagation());
  btn.on('pointertap', onClick);
  btn.on('pointerover', () => { btn.alpha = 0.86; });
  btn.on('pointerout', () => { btn.alpha = 1; });
  return btn;
}

/** 深色柔和背景（首页与游戏共用） */
export function drawBackground(container, width, height) {
  const bg = new PIXI.Graphics();
  bg.beginFill(0x101724);
  bg.drawRect(0, 0, width, height);
  bg.endFill();
  container.addChild(bg);

  const lights = new PIXI.Graphics();
  let seed = 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < 36; i++) {
    const x = rand() * width;
    const y = rand() * height;
    const radius = 0.8 + rand() * 1.8;
    lights.beginFill(rand() > 0.7 ? 0xb7ccff : 0x6e86b7, 0.18 + rand() * 0.38);
    lights.drawCircle(x, y, radius);
    lights.endFill();
  }
  container.addChild(lights);
}
