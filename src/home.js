// 游戏大厅首页
import * as PIXI from 'pixi.js';
import { GAME_WIDTH, GAME_HEIGHT } from './config.js';
import { GAMES } from './games/index.js';
import { UI_FONT, makeButton, drawBackground } from './ui.js';

// 滚动区域参数
const SCROLL_TOP = 138;           // 滚动区域起始 Y
const SCROLL_BOTTOM = GAME_HEIGHT - 50; // 滚动区域结束 Y（留底部提示空间）
const SCROLL_HEIGHT = SCROLL_BOTTOM - SCROLL_TOP;

function drawGameIcon(gameId) {
  const icon = new PIXI.Container();
  const plate = new PIXI.Graphics();
  plate.beginFill(gameId === 'watermelon' ? 0x244b3d : gameId === 'cursorquest' ? 0x2a243d : gameId === 'klotski' ? 0x3d2424 : gameId === 'blockstorm' ? 0x203452 : gameId === 'lines' ? 0x1f3a4a : 0x243d63);
  plate.drawRoundedRect(0, 0, 92, 92, 24);
  plate.endFill();
  icon.addChild(plate);

  const art = new PIXI.Graphics();
  if (gameId === 'watermelon') {
    art.beginFill(0x4caf73);
    art.drawCircle(46, 46, 29);
    art.endFill();
    art.beginFill(0xff6677);
    art.drawCircle(46, 46, 23);
    art.endFill();
    art.beginFill(0x3b2430);
    [[37, 38], [53, 39], [44, 52], [57, 55]].forEach(([x, y]) => {
      art.drawEllipse(x, y, 2, 4);
    });
    art.endFill();
  } else if (gameId === 'cursorquest') {
    const pix = 6;
    const ox = 8;
    const oy = 8;
    const body = [
      '..XXXX..',
      '.XYYYYX.',
      '.YYYYYY.',
      '.YYYYYY.',
      '.XYYYYX.',
      '..X..X..',
    ];
    for (let y = 0; y < body.length; y++) {
      for (let x = 0; x < body[y].length; x++) {
        const ch = body[y][x];
        if (ch === '.') continue;
        art.beginFill(ch === 'X' ? 0x10131c : 0x4fc3f7);
        art.drawRect(ox + x * pix, oy + y * pix, pix - 1, pix - 1);
        art.endFill();
      }
    }
    art.beginFill(0xffd35c);
    [22, 46, 70].forEach((x) => {
      art.drawCircle(x, 78, 4);
    });
    art.endFill();
  } else if (gameId === 'blockstorm') {
    // 方块风暴：四色连锁方块与警戒线
    const colors = [0xff6b6b, 0x5b8def, 0x4ecb8d, 0xf5be48];
    const size = 16;
    const layout = [
      [0, 0, 0], [1, 0, 1], [2, 0, 2], [3, 0, 3],
      [0, 1, 1], [1, 1, 1], [2, 1, 3], [3, 1, 2],
      [0, 2, 2], [1, 2, 0], [2, 2, 0], [3, 2, 1],
    ];
    layout.forEach(([col, row, color]) => {
      art.beginFill(colors[color]);
      art.drawRoundedRect(12 + col * size, 18 + row * size, size - 2, size - 2, 4);
      art.endFill();
      art.beginFill(0xffffff, 0.18);
      art.drawRoundedRect(15 + col * size, 21 + row * size, size - 8, 3, 2);
      art.endFill();
    });
    art.lineStyle(2, 0xff9292, 0.9);
    art.moveTo(10, 14);
    art.lineTo(82, 14);
  } else if (gameId === 'klotski') {
    const cs = 18;
    const ox = 10;
    const oy = 10;
    art.beginFill(0xe85d4a);
    art.drawRoundedRect(ox + cs, oy, cs * 2 - 3, cs * 2 - 3, 5);
    art.endFill();
    art.beginFill(0x4caf73);
    art.drawRoundedRect(ox, oy, cs - 3, cs * 2 - 3, 4);
    art.endFill();
    art.beginFill(0x5b8def);
    art.drawRoundedRect(ox + cs * 3, oy, cs - 3, cs * 2 - 3, 4);
    art.endFill();
    art.beginFill(0xf1c40f);
    art.drawRoundedRect(ox, oy + cs * 2, cs - 3, cs - 3, 4);
    art.endFill();
    art.beginFill(0xf1c40f);
    art.drawRoundedRect(ox + cs, oy + cs * 2, cs - 3, cs - 3, 4);
    art.endFill();
    art.beginFill(0x9c4aef);
    art.drawRoundedRect(ox + cs * 2, oy + cs * 2, cs * 2 - 3, cs - 3, 4);
    art.endFill();
    art.beginFill(0x4caf73);
    art.drawRoundedRect(ox, oy + cs * 3, cs - 3, cs - 3, 4);
    art.endFill();
    art.beginFill(0x5b8def);
    art.drawRoundedRect(ox + cs * 3, oy + cs * 3, cs - 3, cs - 3, 4);
    art.endFill();
    const arrow = new PIXI.Text('▼', {
      fontFamily: UI_FONT,
      fontSize: 14,
      fill: 0xe85d4a,
    });
    arrow.anchor.set(0.5);
    arrow.x = 46;
    arrow.y = 84;
    icon.addChild(arrow);
  } else if (gameId === 'lines') {
    // 连线迷航：彩色端点 + 折线连接
    const cs = 16;
    const ox = 14;
    const oy = 14;
    // 网格
    art.lineStyle(1, 0x3a4a6b, 0.7);
    for (let i = 0; i <= 4; i++) {
      art.moveTo(ox + i * cs, oy);
      art.lineTo(ox + i * cs, oy + 4 * cs);
      art.moveTo(ox, oy + i * cs);
      art.lineTo(ox + 4 * cs, oy + i * cs);
    }
    // 两条折线
    art.lineStyle(4, 0x4fc3f7, 1);
    art.moveTo(ox, oy + cs);
    art.lineTo(ox + cs, oy + cs);
    art.lineTo(ox + cs, oy + 2 * cs);
    art.lineStyle(4, 0xff5c5c, 1);
    art.moveTo(ox + 3 * cs, oy + 3 * cs);
    art.lineTo(ox + 2 * cs, oy + 3 * cs);
    art.lineTo(ox + 2 * cs, oy + 2 * cs);
    // 端点
    art.lineStyle(0);
    [[ox, oy + cs, 0x4fc3f7], [ox + cs, oy + 2 * cs, 0x4fc3f7], [ox + 3 * cs, oy + 3 * cs, 0xff5c5c], [ox + 2 * cs, oy + 2 * cs, 0xff5c5c]].forEach(([x, y, color]) => {
      art.beginFill(color);
      art.drawCircle(x, y, 5);
      art.endFill();
    });
  } else {
    const blocks = [
      [22, 24, 0xff6b6b], [44, 24, 0xff6b6b],
      [22, 46, 0xff6b6b], [44, 46, 0x65a4ff],
      [66, 46, 0x65a4ff], [44, 68, 0xffd35c],
    ];
    blocks.forEach(([x, y, color]) => {
      art.beginFill(color);
      art.drawRoundedRect(x - 9, y - 9, 18, 18, 5);
      art.endFill();
    });
  }
  icon.addChild(art);
  return icon;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

export class HomeScreen {
  constructor(app) {
    this.app = app;
    this.layer = new PIXI.Container();
    app.stage.addChild(this.layer);

    // 滚动状态
    this.scrollY = 0;
    this.scrollVelocity = 0;
    this.isDragging = false;
    this.dragMoved = false;
    this.dragStartY = 0;
    this.dragStartScroll = 0;
    this.lastDragY = 0;
    this.lastDragTime = 0;

    this.drawBackground();
    this.drawTitle();
    this.drawGameCards();
    this.drawFooter();
    this.setupScroll();
    this.startTicker();
  }

  destroy() {
    if (this.tickerCb) {
      this.app.ticker.remove(this.tickerCb);
      this.tickerCb = null;
    }
    this.cleanupScroll();
    this.layer.destroy({ children: true });
  }

  drawBackground() {
    drawBackground(this.layer, GAME_WIDTH, GAME_HEIGHT);

    const glow = new PIXI.Graphics();
    glow.beginFill(0x4169a8, 0.14);
    glow.drawCircle(GAME_WIDTH / 2, 70, 180);
    glow.endFill();
    this.layer.addChild(glow);
  }

  drawTitle() {
    const title = new PIXI.Text('小游戏盒子', {
      fontFamily: UI_FONT,
      fontWeight: '700',
      fontSize: 38,
      fill: 0xffffff,
    });
    title.anchor.set(0.5);
    title.x = GAME_WIDTH / 2;
    title.y = 78;
    this.layer.addChild(title);

    const sub = new PIXI.Text('选择一款游戏，放松一下', {
      fontFamily: UI_FONT,
      fontSize: 15,
      fill: 0x91a7cc,
    });
    sub.anchor.set(0.5);
    sub.x = GAME_WIDTH / 2;
    sub.y = 112;
    this.layer.addChild(sub);
  }

  drawGameCards() {
    // 滚动容器：所有卡片放在里面
    this.scrollContainer = new PIXI.Container();
    this.scrollContainer.y = SCROLL_TOP;
    this.layer.addChild(this.scrollContainer);

    // 遮罩：裁剪超出滚动区域的内容
    const mask = new PIXI.Graphics();
    mask.beginFill(0xffffff);
    mask.drawRect(0, 0, GAME_WIDTH, SCROLL_HEIGHT);
    mask.endFill();
    mask.y = SCROLL_TOP;
    this.layer.addChild(mask);
    this.scrollContainer.mask = mask;
    this.scrollMask = mask;

    const cardW = 340;
    const cardH = 132;
    const gap = 18;

    GAMES.forEach((game, i) => {
      const card = new PIXI.Container();
      card.x = (GAME_WIDTH - cardW) / 2;
      card.y = i * (cardH + gap);

      const bg = new PIXI.Graphics();
      bg.beginFill(0x1c2940, 0.94);
      bg.drawRoundedRect(0, 0, cardW, cardH, 22);
      bg.endFill();
      bg.lineStyle(1, 0xffffff, 0.12);
      bg.drawRoundedRect(0.5, 0.5, cardW - 1, cardH - 1, 22);
      card.addChild(bg);

      const icon = drawGameIcon(game.id);
      icon.x = 18;
      icon.y = (cardH - 92) / 2;
      card.addChild(icon);

      const name = new PIXI.Text(game.name, {
        fontFamily: UI_FONT,
        fontWeight: '700',
        fontSize: 21,
        fill: 0xffffff,
      });
      name.x = 124;
      name.y = 28;
      card.addChild(name);

      if (game.status) {
        const statusBg = new PIXI.Graphics();
        const statusText = new PIXI.Text(game.status, {
          fontFamily: UI_FONT,
          fontSize: 10,
          fill: 0xffe0a3,
        });
        statusText.x = name.x + name.width + 14;
        statusText.y = 33;
        statusBg.beginFill(0x7a5320, 0.75);
        statusBg.drawRoundedRect(
          statusText.x - 6,
          statusText.y - 3,
          statusText.width + 12,
          statusText.height + 6,
          6
        );
        statusBg.endFill();
        card.addChild(statusBg);
        card.addChild(statusText);
      }

      const desc = new PIXI.Text(game.desc, {
        fontFamily: UI_FONT,
        fontSize: 13,
        fill: 0x9eb1d0,
      });
      desc.x = 124;
      desc.y = 62;
      card.addChild(desc);

      const playFill = game.id === 'watermelon'
        ? 0x3e9b69
        : game.id === 'cursorquest'
          ? 0x6a4ad0
          : game.id === 'klotski'
            ? 0xe85d4a
            : game.id === 'blockstorm'
              ? 0x5b8def
              : game.id === 'lines'
                ? 0x4fc3f7
                : 0x497fd1;

      // 卡片点击进入游戏（但拖拽时不触发）
      const goGame = () => {
        if (this.dragMoved) return;
        window.location.hash = `#/game/${game.id}`;
      };

      const play = makeButton('开始', 72, 30, () => {
        if (this.dragMoved) return;
        window.location.hash = `#/game/${game.id}`;
      }, { fill: playFill, fontSize: 13 });
      play.x = 124;
      play.y = 88;
      card.addChild(play);

      // 整张卡片可点击
      const hit = new PIXI.Graphics();
      hit.beginFill(0x000000, 0.01);
      hit.drawRect(0, 0, cardW, cardH);
      hit.endFill();
      hit.eventMode = 'static';
      hit.cursor = 'pointer';
      hit.on('pointerup', goGame);
      hit.on('pointertap', goGame);
      card.addChild(hit);

      this.scrollContainer.addChild(card);
    });

    // 内容总高度
    this.contentHeight = GAMES.length * (cardH + gap) - gap;
    // 最大可滚动距离
    this.maxScroll = Math.max(0, this.contentHeight - SCROLL_HEIGHT);
  }

  setupScroll() {
    // 在 stage 级别监听指针事件来实现拖拽滚动
    // stage 的事件会在子元素（卡片按钮）之前触发，我们可以在这里处理拖拽
    this.onPointerDown = (e) => this.handlePointerDown(e);
    this.onPointerMove = (e) => this.handlePointerMove(e);
    this.onPointerUp = (e) => this.handlePointerUp(e);

    this.app.stage.on('pointerdown', this.onPointerDown);
    this.app.stage.on('pointermove', this.onPointerMove);
    this.app.stage.on('pointerup', this.onPointerUp);
    this.app.stage.on('pointerupoutside', this.onPointerUp);
  }

  cleanupScroll() {
    if (this.onPointerDown) {
      this.app.stage.off('pointerdown', this.onPointerDown);
      this.app.stage.off('pointermove', this.onPointerMove);
      this.app.stage.off('pointerup', this.onPointerUp);
      this.app.stage.off('pointerupoutside', this.onPointerUp);
      this.onPointerDown = null;
    }
  }

  handlePointerDown(e) {
    // 只在滚动区域内开始拖拽
    const localY = e.global.y;
    if (localY < SCROLL_TOP || localY > SCROLL_BOTTOM) return;
    if (this.maxScroll <= 0) return;

    this.isDragging = true;
    this.dragMoved = false;
    this.scrollVelocity = 0;
    this.dragStartY = e.global.y;
    this.dragStartScroll = this.scrollY;
    this.lastDragY = e.global.y;
    this.lastDragTime = Date.now();
  }

  handlePointerMove(e) {
    if (!this.isDragging) return;

    const dy = e.global.y - this.dragStartY;
    if (Math.abs(dy) > 4) {
      this.dragMoved = true;
    }

    let newY = this.dragStartScroll + dy;

    // 边界阻尼回弹
    if (newY > 0) {
      newY = newY * 0.35;
    }
    if (newY < -this.maxScroll) {
      const over = newY + this.maxScroll;
      newY = -this.maxScroll + over * 0.35;
    }

    this.scrollY = newY;

    // 计算瞬时速度
    const now = Date.now();
    const dt = now - this.lastDragTime;
    if (dt > 0) {
      const vy = (e.global.y - this.lastDragY) / dt;
      this.scrollVelocity = vy * 16;
    }
    this.lastDragY = e.global.y;
    this.lastDragTime = now;
  }

  handlePointerUp() {
    this.isDragging = false;
    // 延迟重置 dragMoved，确保卡片点击回调能检测到
    setTimeout(() => { this.dragMoved = false; }, 50);
  }

  startTicker() {
    this.tickerCb = () => {
      if (!this.scrollContainer) return;

      if (!this.isDragging) {
        // 惯性滚动
        if (Math.abs(this.scrollVelocity) > 0.3) {
          this.scrollY += this.scrollVelocity;
          this.scrollVelocity *= 0.92;
        } else {
          this.scrollVelocity = 0;
        }

        // 边界回弹
        if (this.scrollY > 0) {
          this.scrollY = lerp(this.scrollY, 0, 0.18);
          if (Math.abs(this.scrollY) < 0.5) this.scrollY = 0;
        }
        if (this.scrollY < -this.maxScroll) {
          this.scrollY = lerp(this.scrollY, -this.maxScroll, 0.18);
          if (Math.abs(this.scrollY + this.maxScroll) < 0.5) {
            this.scrollY = -this.maxScroll;
          }
        }
      }

      this.scrollContainer.y = SCROLL_TOP + this.scrollY;
    };
    this.app.ticker.add(this.tickerCb);
  }

  drawFooter() {
    const footer = new PIXI.Text('选择游戏开始 · 手机横竖屏均可', {
      fontFamily: UI_FONT,
      fontSize: 12,
      fill: 0x60779e,
    });
    footer.anchor.set(0.5);
    footer.x = GAME_WIDTH / 2;
    footer.y = GAME_HEIGHT - 28;
    this.layer.addChild(footer);
  }
}
