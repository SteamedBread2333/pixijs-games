// 游戏大厅首页
import * as PIXI from 'pixi.js';
import { GAME_WIDTH, GAME_HEIGHT } from './config.js';
import { GAMES } from './games/index.js';
import { UI_FONT, makeButton, drawBackground } from './ui.js';

function drawGameIcon(gameId) {
  const icon = new PIXI.Container();
  const plate = new PIXI.Graphics();
  plate.beginFill(gameId === 'watermelon' ? 0x244b3d : 0x243d63);
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
    const cardH = 150;
    const startY = 150;

    GAMES.forEach((game, i) => {
      const card = new PIXI.Container();
      card.x = (GAME_WIDTH - cardW) / 2;
      card.y = startY + i * (cardH + 24);

      const bg = new PIXI.Graphics();
      bg.beginFill(0x1c2940, 0.94);
      bg.drawRoundedRect(0, 0, cardW, cardH, 22);
      bg.endFill();
      bg.lineStyle(1, 0xffffff, 0.12);
      bg.drawRoundedRect(0.5, 0.5, cardW - 1, cardH - 1, 22);
      card.addChild(bg);

      const icon = drawGameIcon(game.id);
      icon.x = 20;
      icon.y = 29;
      card.addChild(icon);

      const name = new PIXI.Text(game.name, {
        fontFamily: UI_FONT,
        fontWeight: '700',
        fontSize: 22,
        fill: 0xffffff,
      });
      name.x = 130;
      name.y = 34;
      card.addChild(name);

      const desc = new PIXI.Text(game.desc, {
        fontFamily: UI_FONT,
        fontSize: 14,
        fill: 0x9eb1d0,
      });
      desc.x = 130;
      desc.y = 72;
      card.addChild(desc);

      const play = makeButton('开始', 76, 32, () => {
        window.location.hash = `#/game/${game.id}`;
      }, { fill: game.id === 'watermelon' ? 0x3e9b69 : 0x497fd1, fontSize: 14 });
      play.x = 130;
      play.y = 102;
      card.addChild(play);

      card.eventMode = 'static';
      card.cursor = 'pointer';
      card.hitArea = new PIXI.Rectangle(0, 0, cardW, cardH);
      card.on('pointertap', () => {
        window.location.hash = `#/game/${game.id}`;
      });

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
