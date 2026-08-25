import * as PIXI from 'pixi.js';
import Matter from 'matter-js';
import { FRUITS, PHYSICS } from './config.js';

/**
 * 水果实体：封装 PixiJS 显示对象 + Matter.js 物理刚体
 */
export class Fruit {
  /**
   * @param {number} level 水果等级 (0 ~ FRUITS.length - 1)
   * @param {number} x 初始 x
   * @param {number} y 初始 y
   */
  constructor(level, x, y) {
    this.level = level;
    this.merged = false; // 是否已被合成移除
    const def = FRUITS[level];
    this.radius = def.radius;

    // ---- PixiJS 显示 ----
    this.container = new PIXI.Container();

    const body = new PIXI.Graphics();
    body.beginFill(def.color);
    body.drawCircle(0, 0, this.radius);
    body.endFill();
    // 高光
    body.beginFill(0xffffff, 0.35);
    body.drawCircle(-this.radius * 0.35, -this.radius * 0.35, this.radius * 0.3);
    body.endFill();
    this.container.addChild(body);

    // emoji 标签
    const text = new PIXI.Text(def.emoji, {
      fontSize: Math.max(14, this.radius * 0.9),
      align: 'center',
    });
    text.anchor.set(0.5);
    this.container.addChild(text);

    this.container.x = x;
    this.container.y = y;

    // ---- Matter.js 物理刚体 ----
    this.body = Matter.Bodies.circle(x, y, this.radius, {
      restitution: PHYSICS.restitution,
      friction: PHYSICS.friction,
      frictionAir: PHYSICS.frictionAir,
      density: PHYSICS.density,
      label: `fruit-${level}`,
    });
    this.body.plugin.fruit = this; // 反向引用，便于碰撞回调取回实体
  }

  /** 每帧同步物理位置到显示对象 */
  sync() {
    this.container.x = this.body.position.x;
    this.container.y = this.body.position.y;
    this.container.rotation = this.body.angle;
  }

  /** 合成时的放大消失动画 */
  playPopAnimation(onComplete) {
    this.container.scale.set(1);
    const tween = { t: 0 };
    const animate = () => {
      tween.t += 0.12;
      if (tween.t >= 1) {
        onComplete();
        return;
      }
      const s = 1 + tween.t * 0.6;
      this.container.scale.set(s);
      this.container.alpha = 1 - tween.t;
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }

  destroy() {
    this.container.destroy({ children: true });
  }
}
