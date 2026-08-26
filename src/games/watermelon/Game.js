import * as PIXI from 'pixi.js';
import Matter from 'matter-js';
import {
  GAME_WIDTH, GAME_HEIGHT,
  CONTAINER_LEFT, CONTAINER_RIGHT, CONTAINER_BOTTOM,
  DANGER_LINE, DROP_Y,
  FRUITS, RANDOM_FRUIT_MAX_LEVEL, PHYSICS,
  ITEMS, SCORE_PER_ITEM, ITEM_MAX_COUNT,
  COMBO_WINDOW_MS, COMBO_MAX_MULTIPLIER, BEST_SCORE_KEY,
} from './config.js';
import { Fruit } from './Fruit.js';
import { Sound } from './sound.js';

const { Engine, World, Bodies, Body, Events } = Matter;

export class Game {
  constructor(app) {
    this.app = app;
    this.score = 0;
    this.bestScore = Number(localStorage.getItem(BEST_SCORE_KEY) || 0);
    this.gameOver = false;
    this.canDrop = true;
    this.fruits = [];
    this.currentLevel = this.randomLevel();
    this.nextLevel = this.randomLevel();

    // 道具状态：开局每种道具各赠送 1 个
    this.items = { bomb: 1, shake: 1, evolve: 1 };
    this.itemEnergy = 0;
    // 连击状态
    this.combo = 0;
    this.lastMergeTime = 0;
    // 进化道具：下一个水果提升一级
    this.evolveActive = false;
    // 炸弹瞄准模式
    this.bombMode = false;
    // 道具使用后的投放锁，防止点道具时误触发投放
    this.dropLockUntil = 0;

    this.gameLayer = new PIXI.Container();
    this.uiLayer = new PIXI.Container();
    app.stage.addChild(this.gameLayer);
    app.stage.addChild(this.uiLayer);

    this.setupPhysics();
    this.setupBackground();
    this.setupUI();
    this.setupInput();
    this.spawnPreview();

    app.ticker.add(this.update, this);
  }

  /** 销毁游戏，释放资源（返回首页时调用） */
  destroy() {
    this.app.ticker.remove(this.update, this);
    this.gameLayer.destroy({ children: true });
    this.uiLayer.destroy({ children: true });
  }

  randomLevel() {
    return Math.floor(Math.random() * (RANDOM_FRUIT_MAX_LEVEL + 1));
  }

  /** 实际投放等级（考虑进化道具） */
  getDropLevel() {
    const bonus = this.evolveActive ? 1 : 0;
    return Math.min(this.currentLevel + bonus, FRUITS.length - 1);
  }

  // ---------- 物理 ----------
  setupPhysics() {
    this.engine = Engine.create();
    this.engine.gravity.x = PHYSICS.gravity.x;
    this.engine.gravity.y = PHYSICS.gravity.y;

    const t = 60; // 墙体厚度
    const walls = [
      Bodies.rectangle(GAME_WIDTH / 2, CONTAINER_BOTTOM + t / 2, GAME_WIDTH * 2, t, { isStatic: true }),
      Bodies.rectangle(CONTAINER_LEFT - t / 2, GAME_HEIGHT / 2, t, GAME_HEIGHT * 2, { isStatic: true }),
      Bodies.rectangle(CONTAINER_RIGHT + t / 2, GAME_HEIGHT / 2, t, GAME_HEIGHT * 2, { isStatic: true }),
    ];
    World.add(this.engine.world, walls);

    Events.on(this.engine, 'collisionStart', (event) => {
      for (const pair of event.pairs) {
        this.handleCollision(pair.bodyA, pair.bodyB);
      }
    });
  }

  handleCollision(bodyA, bodyB) {
    const a = bodyA.plugin.fruit;
    const b = bodyB.plugin.fruit;
    if (!a || !b) return;
    if (a.merged || b.merged) return;
    if (a.level !== b.level) return;
    if (a.level >= FRUITS.length - 1) return; // 已是最大西瓜

    a.merged = true;
    b.merged = true;

    const newLevel = a.level + 1;
    const mx = (a.body.position.x + b.body.position.x) / 2;
    const my = (a.body.position.y + b.body.position.y) / 2;

    // ---- 连击判定 ----
    const now = performance.now();
    if (now - this.lastMergeTime <= COMBO_WINDOW_MS) {
      this.combo += 1;
    } else {
      this.combo = 1;
    }
    this.lastMergeTime = now;
    const multiplier = Math.min(this.combo, COMBO_MAX_MULTIPLIER);

    const points = FRUITS[newLevel].score * multiplier;
    this.addScore(points);
    Sound.merge(newLevel);
    this.showFloatingText(`+${points}`, mx, my - 20);
    if (this.combo >= 2) {
      Sound.combo(this.combo);
      this.showCombo(this.combo, multiplier);
    }

    // 移除旧水果（带动画）
    this.removeFruit(a);
    this.removeFruit(b);

    // 生成新水果
    const fruit = new Fruit(newLevel, mx, my);
    this.fruits.push(fruit);
    World.add(this.engine.world, fruit.body);
    this.gameLayer.addChild(fruit.container);
    fruit.container.scale.set(0.6);
    this.popIn(fruit);
  }

  popIn(fruit) {
    let t = 0;
    const animate = () => {
      t += 0.15;
      if (t >= 1) {
        fruit.container.scale.set(1);
        return;
      }
      fruit.container.scale.set(0.6 + t * 0.4);
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }

  removeFruit(fruit) {
    World.remove(this.engine.world, fruit.body);
    const idx = this.fruits.indexOf(fruit);
    if (idx >= 0) this.fruits.splice(idx, 1);
    fruit.playPopAnimation(() => fruit.destroy());
  }

  // ---------- 背景与 UI ----------
  setupBackground() {
    const bg = new PIXI.Graphics();
    bg.beginFill(0xfdf6e3);
    bg.drawRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    bg.endFill();
    this.gameLayer.addChild(bg);

    const frame = new PIXI.Graphics();
    frame.lineStyle(4, 0xd4a76a, 1);
    frame.drawRect(CONTAINER_LEFT, DANGER_LINE - 40, CONTAINER_RIGHT - CONTAINER_LEFT, CONTAINER_BOTTOM - DANGER_LINE + 40);
    this.gameLayer.addChild(frame);

    this.dangerLine = new PIXI.Graphics();
    this.dangerLine.lineStyle(2, 0xe74c3c, 0.5);
    this.dangerLine.moveTo(CONTAINER_LEFT, DANGER_LINE);
    this.dangerLine.lineTo(CONTAINER_RIGHT, DANGER_LINE);
    this.gameLayer.addChild(this.dangerLine);
  }

  setupUI() {
    // 得分
    this.scoreText = new PIXI.Text(`得分: 0`, {
      fontSize: 24,
      fontWeight: 'bold',
      fill: 0x5d4037,
    });
    this.scoreText.x = 20;
    this.scoreText.y = 12;
    this.uiLayer.addChild(this.scoreText);

    // 最高分
    this.bestText = new PIXI.Text(`最高: ${this.bestScore}`, {
      fontSize: 14,
      fill: 0x8d6e63,
    });
    this.bestText.x = 20;
    this.bestText.y = 44;
    this.uiLayer.addChild(this.bestText);

    // 道具能量条
    this.energyBarBg = new PIXI.Graphics();
    this.energyBarBg.beginFill(0x000000, 0.1);
    this.energyBarBg.drawRoundedRect(0, 0, 100, 8, 4);
    this.energyBarBg.endFill();
    this.energyBarBg.x = 20;
    this.energyBarBg.y = 66;
    this.uiLayer.addChild(this.energyBarBg);

    this.energyBar = new PIXI.Graphics();
    this.energyBar.x = 20;
    this.energyBar.y = 66;
    this.uiLayer.addChild(this.energyBar);
    this.updateEnergyBar();

    // 下一个水果提示
    this.nextLabel = new PIXI.Text('下一个', {
      fontSize: 12,
      fill: 0x8d6e63,
    });
    this.nextLabel.anchor.set(0.5, 0);
    this.nextLabel.x = GAME_WIDTH - 30;
    this.nextLabel.y = 8;
    this.uiLayer.addChild(this.nextLabel);

    this.nextPreview = new PIXI.Container();
    this.nextPreview.x = GAME_WIDTH - 30;
    this.nextPreview.y = 48;
    this.uiLayer.addChild(this.nextPreview);

    // 道具栏
    this.setupItemBar();

    // 连击提示文字
    this.comboText = new PIXI.Text('', {
      fontSize: 30,
      fontWeight: 'bold',
      fill: 0xff5722,
      stroke: 0xffffff,
      strokeThickness: 4,
    });
    this.comboText.anchor.set(0.5);
    this.comboText.x = GAME_WIDTH / 2;
    this.comboText.y = 220;
    this.comboText.alpha = 0;
    this.uiLayer.addChild(this.comboText);

    // 炸弹模式提示
    this.bombHint = new PIXI.Text('💣 炸弹模式：点击要移除的水果', {
      fontSize: 20,
      fontWeight: 'bold',
      fill: 0xd32f2f,
      stroke: 0xffffff,
      strokeThickness: 4,
    });
    this.bombHint.anchor.set(0.5);
    this.bombHint.x = GAME_WIDTH / 2;
    this.bombHint.y = 100;
    this.bombHint.alpha = 0;
    this.uiLayer.addChild(this.bombHint);

    // 炸弹模式红色边缘警示
    this.bombVignette = new PIXI.Graphics();
    this.bombVignette.lineStyle(6, 0xd32f2f, 0.8);
    this.bombVignette.drawRect(3, 3, GAME_WIDTH - 6, GAME_HEIGHT - 6);
    this.bombVignette.alpha = 0;
    this.uiLayer.addChild(this.bombVignette);

    // 持久 UI 列表（重开游戏时保留）
    this.persistentUI = [
      this.scoreText, this.bestText,
      this.energyBarBg, this.energyBar,
      this.nextLabel, this.nextPreview,
      this.itemBar, this.comboText, this.bombHint,
    ];
  }

  setupItemBar() {
    const buttonSize = 44;
    const gap = 6;
    this.itemBar = new PIXI.Container();
    // 右侧预留紧凑的“下一个”区域，避免道具栏遮住左侧得分。
    this.itemBar.x = GAME_WIDTH - 70 - (3 * buttonSize + 2 * gap);
    this.itemBar.y = 10;
    this.uiLayer.addChild(this.itemBar);

    this.itemButtons = {};
    const types = ['bomb', 'shake', 'evolve'];
    types.forEach((type, i) => {
      const btn = new PIXI.Container();
      btn.x = i * (buttonSize + gap);
      btn.eventMode = 'static';
      btn.cursor = 'pointer';
      // 显式命中区域（带内边距），确保按钮可靠点击
      btn.hitArea = new PIXI.Rectangle(-4, -4, buttonSize + 8, buttonSize + 8);

      const bg = new PIXI.Graphics();
      bg.beginFill(0xffffff, 0.85);
      bg.lineStyle(2, 0xd4a76a, 1);
      bg.drawRoundedRect(0, 0, buttonSize, buttonSize, 10);
      bg.endFill();
      btn.addChild(bg);

      const icon = new PIXI.Text(ITEMS[type].emoji, { fontSize: 21 });
      icon.anchor.set(0.5);
      icon.x = buttonSize / 2;
      icon.y = buttonSize / 2;
      btn.addChild(icon);

      const count = new PIXI.Text('0', {
        fontSize: 13,
        fontWeight: 'bold',
        fill: 0xffffff,
      });
      const badge = new PIXI.Graphics();
      badge.beginFill(0xe74c3c);
      badge.drawCircle(0, 0, 8);
      badge.endFill();
      badge.x = buttonSize - 6;
      badge.y = 6;
      count.anchor.set(0.5);
      count.x = buttonSize - 6;
      count.y = 6;
      btn.addChild(badge);
      btn.addChild(count);

      btn.on('pointerdown', (e) => {
        e.stopPropagation(); // 避免触发舞台投放
        this.useItem(type);
      });

      this.itemBar.addChild(btn);
      this.itemButtons[type] = { btn, bg, count, badge };
    });
    this.updateItemBar();
  }

  updateItemBar() {
    for (const type of Object.keys(this.itemButtons)) {
      const { btn, bg, count } = this.itemButtons[type];
      const n = this.items[type];
      count.text = String(n);
      btn.alpha = n > 0 ? 1 : 0.45;
      // 高亮炸弹瞄准模式
      bg.clear();
      bg.beginFill(this.bombMode && type === 'bomb' ? 0xffcdd2 : 0xffffff, 0.9);
      bg.lineStyle(2, this.bombMode && type === 'bomb' ? 0xd32f2f : 0xd4a76a, 1);
      bg.drawRoundedRect(0, 0, 44, 44, 10);
      bg.endFill();
    }
  }

  updateEnergyBar() {
    const ratio = Math.min(this.itemEnergy / SCORE_PER_ITEM, 1);
    this.energyBar.clear();
    this.energyBar.beginFill(0xffb300);
    this.energyBar.drawRoundedRect(0, 0, Math.max(100 * ratio, 0), 8, 4);
    this.energyBar.endFill();
  }

  drawPreview(container, level, scale = 0.5) {
    container.removeChildren().forEach((c) => c.destroy && c.destroy({ children: true }));
    const def = FRUITS[level];
    const g = new PIXI.Graphics();
    g.beginFill(def.color);
    g.drawCircle(0, 0, def.radius * scale);
    g.endFill();
    container.addChild(g);
    const text = new PIXI.Text(def.emoji, { fontSize: def.radius * scale });
    text.anchor.set(0.5);
    container.addChild(text);
  }

  spawnPreview() {
    this.drawPreview(this.nextPreview, this.nextLevel);
  }

  // ---------- 道具 ----------
  useItem(type) {
    if (this.gameOver) return;
    // 使用道具后短暂锁定投放，避免同一次点击冒泡触发投放
    this.dropLockUntil = performance.now() + 300;

    if (type === 'bomb') {
      if (this.bombMode) {
        this.cancelBombMode();
        return;
      }
      if (this.items.bomb <= 0) return;
      this.bombMode = true;
      this.bombHint.alpha = 1;
      this.bombVignette.alpha = 1;
      this.guideLine.clear();
      if (this.previewFruit) this.previewFruit.alpha = 0;
      this.updateItemBar();
      return;
    }

    if (this.items[type] <= 0) return;
    this.items[type] -= 1;

    if (type === 'shake') {
      this.shakeContainer();
    } else if (type === 'evolve') {
      if (this.evolveActive) {
        this.items[type] += 1; // 已激活则不消耗
      } else {
        this.evolveActive = true;
        Sound.evolve();
        this.showFloatingText('✨ 下次投放进化!', GAME_WIDTH / 2, 180);
        this.drawGuide();
      }
    }
    this.updateItemBar();
  }

  cancelBombMode() {
    this.bombMode = false;
    this.bombHint.alpha = 0;
    this.bombVignette.alpha = 0;
    this.updateItemBar();
    this.drawGuide();
  }

  bombAt(x, y) {
    // 找距离指针最近且可命中的水果
    let target = null;
    let minDist = Infinity;
    for (const fruit of this.fruits) {
      const dx = fruit.body.position.x - x;
      const dy = fruit.body.position.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < fruit.radius + 20 && dist < minDist) {
        minDist = dist;
        target = fruit;
      }
    }

    if (!target) {
      this.showFloatingText('未命中', x, y);
      return;
    }

    this.items.bomb -= 1;
    this.bombMode = false;
    this.bombHint.alpha = 0;
    this.bombVignette.alpha = 0;
    this.updateItemBar();
    Sound.bomb();
    this.explosionEffect(target.body.position.x, target.body.position.y);

    // 对周围水果施加冲击
    for (const fruit of this.fruits) {
      if (fruit === target) continue;
      const dx = fruit.body.position.x - target.body.position.x;
      const dy = fruit.body.position.y - target.body.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 120 && dist > 0) {
        const force = (1 - dist / 120) * 8;
        Body.setVelocity(fruit.body, {
          x: fruit.body.velocity.x + (dx / dist) * force,
          y: fruit.body.velocity.y + (dy / dist) * force - 2,
        });
      }
    }

    this.removeFruit(target);
    this.drawGuide();
  }

  explosionEffect(x, y) {
    const g = new PIXI.Graphics();
    this.gameLayer.addChild(g);
    let t = 0;
    const animate = () => {
      t += 0.08;
      g.clear();
      if (t >= 1) {
        this.gameLayer.removeChild(g);
        g.destroy();
        return;
      }
      const r = 20 + t * 60;
      g.beginFill(0xff9800, 0.6 * (1 - t));
      g.drawCircle(x, y, r);
      g.endFill();
      g.beginFill(0xffeb3b, 0.8 * (1 - t));
      g.drawCircle(x, y, r * 0.5);
      g.endFill();
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }

  shakeContainer() {
    Sound.shake();
    // 给所有水果随机冲量
    for (const fruit of this.fruits) {
      Body.setVelocity(fruit.body, {
        x: (Math.random() - 0.5) * 12,
        y: -Math.random() * 8 - 2,
      });
    }
    // 视觉抖动
    let t = 0;
    const animate = () => {
      t += 1;
      if (t > 18) {
        this.gameLayer.x = 0;
        this.gameLayer.y = 0;
        return;
      }
      this.gameLayer.x = (Math.random() - 0.5) * 10;
      this.gameLayer.y = (Math.random() - 0.5) * 8;
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
    this.showFloatingText('🫨 震动!', GAME_WIDTH / 2, 300);
  }

  grantRandomItem() {
    const total = this.items.bomb + this.items.shake + this.items.evolve;
    if (total >= ITEM_MAX_COUNT) return;
    const types = Object.keys(this.items);
    // 随机选一个持有数最少的类型
    const shuffled = types.sort(() => Math.random() - 0.5);
    for (const type of shuffled) {
      if (this.items[type] < ITEM_MAX_COUNT) {
        this.items[type] += 1;
        Sound.itemGet();
        this.showFloatingText(`获得道具 ${ITEMS[type].emoji}`, GAME_WIDTH / 2, 150);
        this.updateItemBar();
        return;
      }
    }
  }

  // ---------- 输入 ----------
  setupInput() {
    this.dropX = GAME_WIDTH / 2;
    this.guideLine = new PIXI.Graphics();
    this.gameLayer.addChild(this.guideLine);

    const onMove = (e) => {
      if (this.gameOver) return;
      const pos = e.global;
      this.dropX = Math.min(CONTAINER_RIGHT - 10, Math.max(CONTAINER_LEFT + 10, pos.x));
      if (!this.bombMode) this.drawGuide();
    };
    const onDown = (e) => {
      onMove(e);
      if (this.bombMode) {
        this.bombAt(e.global.x, e.global.y);
        return;
      }
      this.drop();
    };

    this.app.stage.eventMode = 'static';
    this.app.stage.hitArea = this.app.screen;
    this.app.stage.on('pointermove', onMove);
    this.app.stage.on('pointerdown', onDown);
  }

  drawGuide() {
    this.guideLine.clear();
    if (this.gameOver || !this.canDrop || this.bombMode) return;
    this.guideLine.lineStyle(2, 0x999999, 0.4);
    this.guideLine.moveTo(this.dropX, DROP_Y + 20);
    this.guideLine.lineTo(this.dropX, CONTAINER_BOTTOM);
    // 预览当前水果位置
    if (!this.previewFruit) {
      this.previewFruit = new PIXI.Container();
      this.gameLayer.addChild(this.previewFruit);
    }
    this.drawPreview(this.previewFruit, this.getDropLevel(), 1);
    // 进化状态加金色光环
    if (this.evolveActive) {
      const glow = new PIXI.Graphics();
      glow.lineStyle(3, 0xffd700, 0.9);
      glow.drawCircle(0, 0, FRUITS[this.getDropLevel()].radius + 5);
      this.previewFruit.addChild(glow);
    }
    this.previewFruit.x = this.dropX;
    this.previewFruit.y = DROP_Y;
    this.previewFruit.alpha = 0.85;
  }

  drop() {
    if (this.gameOver || !this.canDrop || this.bombMode) return;
    if (performance.now() < this.dropLockUntil) return;
    this.canDrop = false;
    Sound.drop();

    const level = this.getDropLevel();
    this.evolveActive = false;

    const fruit = new Fruit(level, this.dropX, DROP_Y);
    this.fruits.push(fruit);
    World.add(this.engine.world, fruit.body);
    this.gameLayer.addChild(fruit.container);

    if (this.previewFruit) {
      this.previewFruit.alpha = 0;
    }
    this.guideLine.clear();

    // 切换下一个
    this.currentLevel = this.nextLevel;
    this.nextLevel = this.randomLevel();
    this.spawnPreview();

    // 冷却时间，防止连续投放重叠
    setTimeout(() => {
      this.canDrop = true;
      this.drawGuide();
    }, 500);
  }

  // ---------- 得分与浮动文字 ----------
  addScore(points) {
    this.score += points;
    this.scoreText.text = `得分: ${this.score}`;
    // 累积道具能量
    this.itemEnergy += points;
    while (this.itemEnergy >= SCORE_PER_ITEM) {
      this.itemEnergy -= SCORE_PER_ITEM;
      this.grantRandomItem();
    }
    this.updateEnergyBar();
  }

  showCombo(combo, multiplier) {
    this.comboText.text = `${combo} 连击! ×${multiplier}`;
    this.comboText.alpha = 1;
    this.comboText.scale.set(1.4);
    let t = 0;
    const animate = () => {
      t += 0.1;
      if (t >= 1) return;
      this.comboText.scale.set(1.4 - t * 0.4);
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }

  showFloatingText(text, x, y) {
    const t = new PIXI.Text(text, {
      fontSize: 20,
      fontWeight: 'bold',
      fill: 0xff9800,
      stroke: 0xffffff,
      strokeThickness: 3,
    });
    t.anchor.set(0.5);
    t.x = x;
    t.y = y;
    this.uiLayer.addChild(t);
    let alpha = 1;
    const animate = () => {
      alpha -= 0.03;
      t.y -= 1.2;
      t.alpha = alpha;
      if (alpha <= 0) {
        this.uiLayer.removeChild(t);
        t.destroy();
        return;
      }
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }

  // ---------- 主循环 ----------
  update() {
    if (this.gameOver) return;
    Engine.update(this.engine, 1000 / 60);
    for (const fruit of this.fruits) {
      fruit.sync();
    }
    // 连击窗口过期
    if (this.combo > 0 && performance.now() - this.lastMergeTime > COMBO_WINDOW_MS) {
      this.combo = 0;
    }
    if (this.combo === 0 && this.comboText.alpha > 0) {
      this.comboText.alpha = Math.max(0, this.comboText.alpha - 0.05);
    }
    this.checkGameOver();
  }

  checkGameOver() {
    for (const fruit of this.fruits) {
      const top = fruit.body.position.y - fruit.radius;
      const speed = fruit.body.speed;
      if (top < DANGER_LINE && speed < 0.5) {
        fruit.dangerTime = (fruit.dangerTime || 0) + 1;
        if (fruit.dangerTime > 60) {
          this.endGame();
          return;
        }
      } else {
        fruit.dangerTime = 0;
      }
    }
  }

  endGame() {
    this.gameOver = true;
    Sound.gameOver();
    this.guideLine.clear();
    if (this.previewFruit) this.previewFruit.alpha = 0;

    // 更新最高分
    let isNewBest = false;
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      localStorage.setItem(BEST_SCORE_KEY, String(this.bestScore));
      this.bestText.text = `最高: ${this.bestScore}`;
      isNewBest = true;
    }

    const overlay = new PIXI.Graphics();
    overlay.beginFill(0x000000, 0.6);
    overlay.drawRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    overlay.endFill();
    this.uiLayer.addChild(overlay);

    const title = new PIXI.Text('游戏结束', {
      fontSize: 42,
      fontWeight: 'bold',
      fill: 0xffffff,
    });
    title.anchor.set(0.5);
    title.x = GAME_WIDTH / 2;
    title.y = GAME_HEIGHT / 2 - 80;
    this.uiLayer.addChild(title);

    const finalScore = new PIXI.Text(`最终得分: ${this.score}`, {
      fontSize: 28,
      fill: 0xffd54f,
    });
    finalScore.anchor.set(0.5);
    finalScore.x = GAME_WIDTH / 2;
    finalScore.y = GAME_HEIGHT / 2 - 20;
    this.uiLayer.addChild(finalScore);

    const bestInfo = new PIXI.Text(
      isNewBest ? '🎉 新纪录!' : `历史最高: ${this.bestScore}`,
      { fontSize: 20, fill: isNewBest ? 0xff5252 : 0xb0bec5 }
    );
    bestInfo.anchor.set(0.5);
    bestInfo.x = GAME_WIDTH / 2;
    bestInfo.y = GAME_HEIGHT / 2 + 20;
    this.uiLayer.addChild(bestInfo);

    // 重新开始按钮
    const btn = new PIXI.Container();
    const btnBg = new PIXI.Graphics();
    btnBg.beginFill(0x4caf50);
    btnBg.drawRoundedRect(-80, -25, 160, 50, 25);
    btnBg.endFill();
    btn.addChild(btnBg);
    const btnText = new PIXI.Text('再来一局', {
      fontSize: 22,
      fontWeight: 'bold',
      fill: 0xffffff,
    });
    btnText.anchor.set(0.5);
    btn.addChild(btnText);
    btn.x = GAME_WIDTH / 2;
    btn.y = GAME_HEIGHT / 2 + 90;
    btn.eventMode = 'static';
    btn.cursor = 'pointer';
    btn.on('pointertap', () => this.restart());
    this.uiLayer.addChild(btn);
  }

  restart() {
    // 清理所有水果
    for (const fruit of this.fruits) {
      World.remove(this.engine.world, fruit.body);
      fruit.destroy();
    }
    this.fruits = [];
    this.score = 0;
    this.scoreText.text = '得分: 0';
    this.gameOver = false;
    this.canDrop = true;
    this.currentLevel = this.randomLevel();
    this.nextLevel = this.randomLevel();
    this.spawnPreview();

    // 重置道具与连击状态
    this.items = { bomb: 1, shake: 1, evolve: 1 };
    this.itemEnergy = 0;
    this.combo = 0;
    this.lastMergeTime = 0;
    this.evolveActive = false;
    this.bombMode = false;
    this.bombHint.alpha = 0;
    this.bombVignette.alpha = 0;
    this.comboText.alpha = 0;
    this.updateItemBar();
    this.updateEnergyBar();

    // 移除结束界面（保留持久 UI）
    const toRemove = [];
    for (const child of this.uiLayer.children) {
      if (!this.persistentUI.includes(child)) {
        toRemove.push(child);
      }
    }
    toRemove.forEach((c) => {
      this.uiLayer.removeChild(c);
      c.destroy({ children: true });
    });

    this.drawGuide();
  }
}
