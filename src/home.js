// 游戏大厅首页
import * as PIXI from 'pixi.js';
import { GAME_WIDTH, GAME_HEIGHT } from './config.js';
import { GAMES } from './games/index.js';
import { UI_FONT, makeButton, drawBackground } from './ui.js';

function drawGameIcon(gameId) {
  const icon = new PIXI.Container();
  const plate = new PIXI.Graphics();
  plate.beginFill(gameId === 'watermelon' ? 0x244b3d : gameId === 'cursorquest' ? 0x2a243d : 0x243d63);
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
    // 像素小人：8x8 像素点阵
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
    // 三个核心提示点
    art.beginFill(0xffd35c);
    [22, 46, 70].forEach((x) => {
      art.drawCircle(x, 78, 4);
    });
    art.endFill();
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

export class HomeScreen {
  constructor(app) {
    this.app = app;
    this.layer = new PIXI.Container();
    app.stage.addChild(this.layer);

    this.drawBackground();
    this.drawTitle();
    this.drawGameCards();
    this.drawFooter();
  }

  destroy() {
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
    const cardW = 340;
    const cardH = 132;
    const startY = 138;
    const gap = 18;

    GAMES.forEach((game, i) => {
      const card = new PIXI.Container();
      card.x = (GAME_WIDTH - cardW) / 2;
      card.y = startY + i * (cardH + gap);

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
          : 0x497fd1;
      const play = makeButton('开始', 72, 30, () => {
        window.location.hash = `#/game/${game.id}`;
      }, { fill: playFill, fontSize: 13 });
      play.x = 124;
      play.y = 88;
      card.addChild(play);

      // 整张卡片也可点击进入：用 pointerup 兜底，避免 pointertap 不可靠
      const hit = new PIXI.Graphics();
      hit.beginFill(0x000000, 0.01);
      hit.drawRect(0, 0, cardW, cardH);
      hit.endFill();
      hit.eventMode = 'static';
      hit.cursor = 'pointer';
      const goGame = () => { window.location.hash = `#/game/${game.id}`; };
      hit.on('pointerup', goGame);
      hit.on('pointertap', goGame);
      card.addChild(hit);

      this.layer.addChild(card);
    });
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
