// 华容道：参考计客超级华容道
// 两大模式：经典华容道（4x5滑块）+ 数字华容道（3x3/4x4数字拼图）
// 特色：平滑滑动动画、计时计步、三星评价、撤销功能、通关烟花特效
import * as PIXI from 'pixi.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../../config.js';
import { UI_FONT, makeButton, drawBackground } from '../../ui.js';
import {
  CLASSIC_LEVELS,
  NUMBER_LEVELS,
  PIECE_SIZES,
} from './levels.js';
import { loadProgress, saveProgress } from './progress.js';
import { Sound } from './sound.js';

// ==================== 常量 ====================
const COLS = 4;
const ROWS = 5;
const CELL = 68;
const BOARD_W = COLS * CELL;
const BOARD_H = ROWS * CELL;
const BOARD_X = (GAME_WIDTH - BOARD_W) / 2;
const BOARD_Y = 108;
const EXIT_COL_START = 1;

const DARKEN = { fill: 0x232b3d, fontSize: 14 };
const ACCENT = 0xe85d4a;
const GOLD = 0xffd54f;

// ==================== 工具函数 ====================
function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ==================== 主游戏类 ====================
export class KlotskiGame {
  constructor(app) {
    this.app = app;
    this.progress = loadProgress();
    this.layer = new PIXI.Container();
    app.stage.addChild(this.layer);
    this.muted = false;

    this.showModeSelect();
  }

  destroy() {
    this.stopTicker();
    this.cleanupDrag();
    this.layer.destroy({ children: true });
  }

  stopTicker() {
    if (this.tickerCb) {
      this.app.ticker.remove(this.tickerCb);
      this.tickerCb = null;
    }
    if (this.timerCb) {
      this.app.ticker.remove(this.timerCb);
      this.timerCb = null;
    }
    if (this.fireworkTicker) {
      this.app.ticker.remove(this.fireworkTicker);
      this.fireworkTicker = null;
    }
  }

  clearScreen() {
    this.layer.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.pieces = [];
    this.dragging = null;
    this.stopTicker();
  }

  // ==================== 模式选择 ====================
  showModeSelect() {
    this.clearScreen();
    this.mode = null;
    drawBackground(this.layer, GAME_WIDTH, GAME_HEIGHT);

    // 返回按钮
    const back = makeButton('‹ 主页', 76, 32, () => {
      Sound.click();
      window.location.hash = '';
    }, DARKEN);
    back.x = 16;
    back.y = 18;
    this.layer.addChild(back);

    // 标题
    const title = new PIXI.Text('华容道', {
      fontFamily: UI_FONT,
      fontWeight: '700',
      fontSize: 38,
      fill: ACCENT,
      stroke: 0x0d0f1a,
      strokeThickness: 5,
    });
    title.anchor.set(0.5);
    title.x = GAME_WIDTH / 2;
    title.y = 74;
    this.layer.addChild(title);

    const sub = new PIXI.Text('选择模式 · 挑战经典', {
      fontFamily: UI_FONT,
      fontSize: 14,
      fill: 0x8fa3c7,
    });
    sub.anchor.set(0.5);
    sub.x = GAME_WIDTH / 2;
    sub.y = 106;
    this.layer.addChild(sub);

    // 模式卡片
    const modes = [
      {
        id: 'classic',
        name: '经典华容道',
        desc: '滑动方块 · 送曹操出关',
        count: CLASSIC_LEVELS.length,
        color: 0xe85d4a,
        icon: 'classic',
      },
      {
        id: 'number',
        name: '数字华容道',
        desc: '滑动数字 · 按序排列',
        count: NUMBER_LEVELS.length,
        color: 0x5b8def,
        icon: 'number',
      },
    ];

    modes.forEach((mode, i) => {
      const card = this.createModeCard(mode);
      card.x = (GAME_WIDTH - 340) / 2;
      card.y = 140 + i * 110;
      this.layer.addChild(card);
    });

    // 底部统计
    const totalClassicStars = Object.values(this.progress.classic.stars).reduce((a, b) => a + b, 0);
    const totalNumberStars = Object.values(this.progress.number.stars).reduce((a, b) => a + b, 0);
    const totalStars = totalClassicStars + totalNumberStars;
    const totalLevels = CLASSIC_LEVELS.length + NUMBER_LEVELS.length;
    const starText = new PIXI.Text(`★ ${totalStars} / ${totalLevels * 3}`, {
      fontFamily: UI_FONT,
      fontSize: 16,
      fill: GOLD,
    });
    starText.anchor.set(0.5);
    starText.x = GAME_WIDTH / 2;
    starText.y = GAME_HEIGHT - 44;
    this.layer.addChild(starText);

    // 静音按钮
    this.drawMuteButton();
  }

  createModeCard(mode) {
    const card = new PIXI.Container();
    const w = 340;
    const h = 92;

    const bg = new PIXI.Graphics();
    bg.beginFill(0x1c2940, 0.94);
    bg.drawRoundedRect(0, 0, w, h, 18);
    bg.endFill();
    bg.lineStyle(1.5, mode.color, 0.4);
    bg.drawRoundedRect(1, 1, w - 2, h - 2, 17);
    card.addChild(bg);

    // 图标
    const iconContainer = new PIXI.Container();
    iconContainer.x = 16;
    iconContainer.y = 14;

    if (mode.icon === 'classic') {
      // 经典华容道图标：2x2曹操+周围方块
      const cs = 14;
      const ox = 6;
      const oy = 6;
      const g = new PIXI.Graphics();
      g.beginFill(0xe85d4a);
      g.drawRoundedRect(ox + cs, oy, cs * 2 - 2, cs * 2 - 2, 3);
      g.endFill();
      g.beginFill(0x4caf73);
      g.drawRoundedRect(ox, oy, cs - 2, cs * 2 - 2, 2);
      g.endFill();
      g.beginFill(0x5b8def);
      g.drawRoundedRect(ox + cs * 3, oy, cs - 2, cs * 2 - 2, 2);
      g.endFill();
      g.beginFill(0xf1c40f);
      g.drawRoundedRect(ox, oy + cs * 2, cs - 2, cs - 2, 2);
      g.drawRoundedRect(ox + cs, oy + cs * 2, cs - 2, cs - 2, 2);
      g.drawRoundedRect(ox + cs * 2, oy + cs * 2, cs - 2, cs - 2, 2);
      g.drawRoundedRect(ox + cs * 3, oy + cs * 2, cs - 2, cs - 2, 2);
      g.endFill();
      g.beginFill(0x9c4aef);
      g.drawRoundedRect(ox + cs, oy + cs * 3, cs * 2 - 2, cs - 2, 2);
      g.endFill();
      iconContainer.addChild(g);
    } else {
      // 数字华容道图标
      const cs = 14;
      const g = new PIXI.Graphics();
      const nums = [1, 2, 3, 4, 0, 5, 6, 7, 8];
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const n = nums[r * 3 + c];
          if (n === 0) continue;
          g.beginFill(n <= 4 ? 0x5b8def : n <= 6 ? 0x4caf73 : 0xf1c40f);
          g.drawRoundedRect(6 + c * cs, 6 + r * cs, cs - 2, cs - 2, 2);
          g.endFill();
        }
      }
      iconContainer.addChild(g);
    }
    // 图标底板
    const iconBg = new PIXI.Graphics();
    iconBg.beginFill(0x101724, 0.6);
    iconBg.drawRoundedRect(0, 0, 64, 64, 12);
    iconBg.endFill();
    card.addChild(iconBg);
    card.addChild(iconContainer);

    // 文字
    const name = new PIXI.Text(mode.name, {
      fontFamily: UI_FONT,
      fontWeight: '700',
      fontSize: 20,
      fill: 0xffffff,
    });
    name.x = 90;
    name.y = 18;
    card.addChild(name);

    const desc = new PIXI.Text(mode.desc, {
      fontFamily: UI_FONT,
      fontSize: 13,
      fill: 0x8fa3c7,
    });
    desc.x = 90;
    desc.y = 46;
    card.addChild(desc);

    const count = new PIXI.Text(`${mode.count} 关`, {
      fontFamily: UI_FONT,
      fontSize: 12,
      fill: mode.color,
    });
    count.x = 90;
    count.y = 66;
    card.addChild(count);

    // 箭头
    const arrow = new PIXI.Text('›', {
      fontFamily: UI_FONT,
      fontSize: 28,
      fill: 0x46536e,
    });
    arrow.anchor.set(0.5);
    arrow.x = w - 24;
    arrow.y = h / 2;
    card.addChild(arrow);

    // 点击
    const hit = new PIXI.Graphics();
    hit.beginFill(0x000000, 0.01);
    hit.drawRoundedRect(0, 0, w, h, 18);
    hit.endFill();
    hit.eventMode = 'static';
    hit.cursor = 'pointer';
    hit.on('pointertap', () => {
      Sound.click();
      this.mode = mode.id;
      this.showLevelSelect();
    });
    card.addChild(hit);

    return card;
  }

  drawMuteButton() {
    const btn = new PIXI.Container();
    btn.x = GAME_WIDTH - 44;
    btn.y = 18;

    const bg = new PIXI.Graphics();
    bg.beginFill(0x232b3d);
    bg.drawRoundedRect(0, 0, 32, 32, 8);
    bg.endFill();
    bg.lineStyle(1, 0xffffff, 0.12);
    bg.drawRoundedRect(0.5, 0.5, 31, 31, 8);
    btn.addChild(bg);

    const icon = new PIXI.Text(this.muted ? '🔇' : '🔊', {
      fontFamily: UI_FONT,
      fontSize: 14,
    });
    icon.anchor.set(0.5);
    icon.x = 16;
    icon.y = 16;
    btn.addChild(icon);

    btn.eventMode = 'static';
    btn.cursor = 'pointer';
    btn.hitArea = new PIXI.Rectangle(0, 0, 32, 32);
    btn.on('pointertap', () => {
      this.muted = !this.muted;
      Sound.setMuted(this.muted);
      icon.text = this.muted ? '🔇' : '🔊';
    });
    this.layer.addChild(btn);
  }

  // ==================== 选关界面 ====================
  showLevelSelect(page = this.levelPage ?? 0) {
    this.clearScreen();
    const levels = this.mode === 'number' ? NUMBER_LEVELS : CLASSIC_LEVELS;
    const prog = this.mode === 'number' ? this.progress.number : this.progress.classic;
    const LEVELS_PER_PAGE = 12;
    const pageCount = Math.ceil(levels.length / LEVELS_PER_PAGE);
    this.levelPage = Math.max(0, Math.min(page, pageCount - 1));

    drawBackground(this.layer, GAME_WIDTH, GAME_HEIGHT);

    // 返回
    const back = makeButton('‹ 模式', 76, 32, () => {
      Sound.click();
      this.showModeSelect();
    }, DARKEN);
    back.x = 16;
    back.y = 18;
    this.layer.addChild(back);

    // 标题
    const titleText = this.mode === 'number' ? '数字华容道' : '经典华容道';
    const titleColor = this.mode === 'number' ? 0x5b8def : ACCENT;
    const title = new PIXI.Text(titleText, {
      fontFamily: UI_FONT,
      fontWeight: '700',
      fontSize: 30,
      fill: titleColor,
      stroke: 0x0d0f1a,
      strokeThickness: 4,
    });
    title.anchor.set(0.5);
    title.x = GAME_WIDTH / 2;
    title.y = 38;
    this.layer.addChild(title);

    // 总星数
    const totalStars = Object.values(prog.stars).reduce((a, b) => a + b, 0);
    const starText = new PIXI.Text(`★ ${totalStars} / ${levels.length * 3}`, {
      fontFamily: UI_FONT,
      fontSize: 14,
      fill: GOLD,
    });
    starText.anchor.set(0.5);
    starText.x = GAME_WIDTH / 2;
    starText.y = 66;
    this.layer.addChild(starText);

    // 关卡网格
    const cols = 4;
    const size = 62;
    const gap = 14;
    const gridW = cols * size + (cols - 1) * gap;
    const startX = (GAME_WIDTH - gridW) / 2;
    const startY = 98;

    const pageStart = this.levelPage * LEVELS_PER_PAGE;
    const pageLevels = levels.slice(pageStart, pageStart + LEVELS_PER_PAGE);

    pageLevels.forEach((level, pageIndex) => {
      const levelIndex = pageStart + pageIndex;
      const levelNo = levelIndex + 1;
      const unlocked = levelNo <= prog.unlocked;
      const stars = prog.stars[levelIndex] || 0;
      const diff = level.difficulty || 1;
      const best = prog.bestSteps[levelIndex];

      const btn = new PIXI.Container();
      btn.x = startX + (pageIndex % cols) * (size + gap);
      btn.y = startY + Math.floor(pageIndex / cols) * (size + gap + 16);

      const bg = new PIXI.Graphics();
      bg.beginFill(unlocked ? 0x2c3e50 : 0x1a2029);
      bg.drawRoundedRect(0, 0, size, size, 12);
      bg.endFill();
      bg.lineStyle(1.5, unlocked ? titleColor : 0x2a3242);
      bg.drawRoundedRect(1, 1, size - 2, size - 2, 11);
      btn.addChild(bg);

      // 难度星标
      if (unlocked) {
        const diffText = new PIXI.Text('★'.repeat(diff), {
          fontFamily: UI_FONT,
          fontSize: 8,
          fill: titleColor,
          letterSpacing: 0.5,
        });
        diffText.anchor.set(0.5, 0);
        diffText.x = size / 2;
        diffText.y = 4;
        btn.addChild(diffText);
      }

      const label = new PIXI.Text(unlocked ? String(levelNo) : '🔒', {
        fontFamily: UI_FONT,
        fontSize: unlocked ? 22 : 16,
        fill: unlocked ? 0xffffff : 0x46536e,
      });
      label.anchor.set(0.5);
      label.x = size / 2;
      label.y = size / 2 - 2;
      btn.addChild(label);

      // 获得星数
      if (unlocked && stars > 0) {
        const starLabel = new PIXI.Text('★'.repeat(stars), {
          fontFamily: UI_FONT,
          fontSize: 9,
          fill: GOLD,
        });
        starLabel.anchor.set(0.5);
        starLabel.x = size / 2;
        starLabel.y = size - 10;
        btn.addChild(starLabel);
      } else if (unlocked && best) {
        const bestLabel = new PIXI.Text(`${best}步`, {
          fontFamily: UI_FONT,
          fontSize: 9,
          fill: 0x6a8099,
        });
        bestLabel.anchor.set(0.5);
        bestLabel.x = size / 2;
        bestLabel.y = size - 10;
        btn.addChild(bestLabel);
      }

      if (unlocked) {
        btn.eventMode = 'static';
        btn.cursor = 'pointer';
        btn.hitArea = new PIXI.Rectangle(0, 0, size, size);
        btn.on('pointertap', () => {
          Sound.click();
          if (this.mode === 'number') {
            this.startNumberLevel(levelIndex);
          } else {
            this.startClassicLevel(levelIndex);
          }
        });
      }
      this.layer.addChild(btn);
    });

    // 翻页
    if (pageCount > 1) {
      const prevBtn = makeButton('‹', 40, 32, () => {
        Sound.whoosh();
        this.showLevelSelect(this.levelPage - 1);
      }, { ...DARKEN, fontSize: 18 });
      prevBtn.x = 16;
      prevBtn.y = GAME_HEIGHT - 56;
      if (this.levelPage > 0) this.layer.addChild(prevBtn);

      const pageInfo = new PIXI.Text(`${this.levelPage + 1} / ${pageCount}`, {
        fontFamily: UI_FONT,
        fontSize: 13,
        fill: 0x6a8099,
      });
      pageInfo.anchor.set(0.5);
      pageInfo.x = GAME_WIDTH / 2;
      pageInfo.y = GAME_HEIGHT - 40;
      this.layer.addChild(pageInfo);

      const nextBtn = makeButton('›', 40, 32, () => {
        Sound.whoosh();
        this.showLevelSelect(this.levelPage + 1);
      }, { ...DARKEN, fontSize: 18 });
      nextBtn.x = GAME_WIDTH - 56;
      nextBtn.y = GAME_HEIGHT - 56;
      if (this.levelPage < pageCount - 1) this.layer.addChild(nextBtn);
    }

    this.drawMuteButton();
  }

  // ==================== 经典华容道游戏界面 ====================
  startClassicLevel(levelIndex) {
    this.clearScreen();
    this.levelIndex = levelIndex;
    this.moves = 0;
    this.won = false;
    this.dragging = null;
    this.history = []; // 撤销栈
    this.startTime = Date.now();
    this.elapsed = 0;

    const level = CLASSIC_LEVELS[levelIndex];
    this.pieces = level.pieces.map((p, i) => {
      const size = PIECE_SIZES[p.type];
      return {
        ...p,
        id: i,
        w: size.w,
        h: size.h,
        row: p.row,
        col: p.col,
        // 渲染坐标（用于平滑动画）
        renderX: BOARD_X + p.col * CELL,
        renderY: BOARD_Y + p.row * CELL,
      };
    });

    drawBackground(this.layer, GAME_WIDTH, GAME_HEIGHT);
    this.setupTopBar(level.name, level.minSteps);
    this.setupClassicBoard();
    this.setupPieces();

    // 全局拖拽监听
    this.onStageMove = (e) => this.handleDragMove(e);
    this.onStageUp = (e) => this.handleDragEnd(e);
    this.app.stage.eventMode = 'static';
    this.app.stage.hitArea = this.app.screen;
    this.app.stage.on('pointermove', this.onStageMove);
    this.app.stage.on('pointerup', this.onStageUp);
    this.app.stage.on('pointerupoutside', this.onStageUp);

    // 动画 ticker
    this.startAnimTicker();
    // 计时 ticker
    this.startTimer();
  }

  setupClassicBoard() {
    this.boardLayer = new PIXI.Container();
    this.layer.addChild(this.boardLayer);

    // 棋盘底座
    const panel = new PIXI.Graphics();
    panel.beginFill(0x1c2333);
    panel.drawRoundedRect(BOARD_X - 12, BOARD_Y - 12, BOARD_W + 24, BOARD_H + 24, 16);
    panel.endFill();
    panel.lineStyle(3, 0x3a4a6b);
    panel.drawRoundedRect(BOARD_X - 12, BOARD_Y - 12, BOARD_W + 24, BOARD_H + 24, 16);
    this.boardLayer.addChild(panel);

    // 出口区域
    const exitGfx = new PIXI.Graphics();
    exitGfx.beginFill(ACCENT, 0.12);
    exitGfx.drawRect(BOARD_X + EXIT_COL_START * CELL, BOARD_Y + ROWS * CELL, CELL * 2, 20);
    exitGfx.endFill();
    this.boardLayer.addChild(exitGfx);

    // 出口文字
    const exitLabel = new PIXI.Text('出 口', {
      fontFamily: UI_FONT,
      fontSize: 13,
      fontWeight: '700',
      fill: ACCENT,
    });
    exitLabel.anchor.set(0.5, 0);
    exitLabel.x = BOARD_X + (EXIT_COL_START + 1) * CELL;
    exitLabel.y = BOARD_Y + ROWS * CELL + 2;
    this.boardLayer.addChild(exitLabel);

    // 棋盘格子
    const cells = new PIXI.Graphics();
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        cells.beginFill(0x141924);
        cells.drawRect(BOARD_X + x * CELL + 1, BOARD_Y + y * CELL + 1, CELL - 2, CELL - 2);
        cells.endFill();
      }
    }
    this.boardLayer.addChild(cells);

    // 网格线
    const grid = new PIXI.Graphics();
    grid.lineStyle(1, 0x2a3450, 0.4);
    for (let i = 0; i <= COLS; i++) {
      grid.moveTo(BOARD_X + i * CELL, BOARD_Y);
      grid.lineTo(BOARD_X + i * CELL, BOARD_Y + BOARD_H);
    }
    for (let i = 0; i <= ROWS; i++) {
      grid.moveTo(BOARD_X, BOARD_Y + i * CELL);
      grid.lineTo(BOARD_X + BOARD_W, BOARD_Y + i * CELL);
    }
    this.boardLayer.addChild(grid);

    // 棋子容器
    this.pieceLayer = new PIXI.Container();
    this.boardLayer.addChild(this.pieceLayer);
  }

  setupPieces() {
    this.pieceLayer.removeChildren();
    this.pieceGfx = [];

    this.pieces.forEach((piece) => {
      const gfx = this.createPieceGfx(piece);
      gfx.x = piece.renderX;
      gfx.y = piece.renderY;
      gfx.eventMode = 'static';
      gfx.cursor = 'grab';
      gfx.on('pointerdown', (e) => this.handlePieceDown(e, piece));
      this.pieceLayer.addChild(gfx);
      this.pieceGfx[piece.id] = gfx;
    });
  }

  createPieceGfx(piece) {
    const c = new PIXI.Container();
    const w = piece.w * CELL;
    const h = piece.h * CELL;
    const pad = 4;

    // 阴影
    const shadow = new PIXI.Graphics();
    shadow.beginFill(0x000000, 0.3);
    shadow.drawRoundedRect(pad, pad + 3, w - pad * 2, h - pad * 2, 12);
    shadow.endFill();
    c.addChild(shadow);

    // 主体
    const bg = new PIXI.Graphics();
    bg.beginFill(piece.color);
    bg.drawRoundedRect(pad, pad, w - pad * 2, h - pad * 2, 12);
    bg.endFill();

    // 高光
    bg.beginFill(0xffffff, 0.18);
    bg.drawRoundedRect(pad + 6, pad + 5, w - pad * 2 - 12, 8, 4);
    bg.endFill();

    // 边框
    bg.lineStyle(2, 0xffffff, 0.22);
    bg.drawRoundedRect(pad + 1, pad + 1, w - pad * 2 - 2, h - pad * 2 - 2, 11);
    c.addChild(bg);

    // 棋子名称
    const fontSize = piece.type === '2x2' ? 28 : piece.type === '1x1' ? 22 : 20;
    const label = new PIXI.Text(piece.name, {
      fontFamily: UI_FONT,
      fontWeight: '700',
      fontSize,
      fill: 0xffffff,
      stroke: 0x000000,
      strokeThickness: 2,
    });
    label.anchor.set(0.5);
    label.x = w / 2;
    label.y = h / 2;
    c.addChild(label);

    // 曹操标记
    if (piece.type === '2x2') {
      const crown = new PIXI.Text('主公', {
        fontFamily: UI_FONT,
        fontSize: 10,
        fontWeight: '700',
        fill: 0xffffff,
        stroke: 0x000000,
        strokeThickness: 1,
      });
      crown.anchor.set(0.5);
      crown.x = w / 2;
      crown.y = h / 2 + 24;
      c.addChild(crown);
    }

    c.hitArea = new PIXI.Rectangle(0, 0, w, h);
    return c;
  }

  // ==================== 数字华容道游戏界面 ====================
  startNumberLevel(levelIndex) {
    this.clearScreen();
    this.levelIndex = levelIndex;
    this.moves = 0;
    this.won = false;
    this.dragging = null;
    this.history = [];
    this.startTime = Date.now();
    this.elapsed = 0;

    const level = NUMBER_LEVELS[levelIndex];
    this.numSize = level.size;
    this.numTiles = [...level.tiles];

    // 计算数字棋盘尺寸
    const numCellSize = this.numSize === 3 ? 88 : 66;
    this.numCell = numCellSize;
    const numBoardW = this.numSize * numCellSize;
    const numBoardH = this.numSize * numCellSize;
    this.numBoardX = (GAME_WIDTH - numBoardW) / 2;
    this.numBoardY = (GAME_HEIGHT - numBoardH) / 2 + 20;

    drawBackground(this.layer, GAME_WIDTH, GAME_HEIGHT);
    this.setupTopBar(level.name, null, true);
    this.setupNumberBoard();

    // 全局拖拽
    this.onStageMove = (e) => this.handleNumDragMove(e);
    this.onStageUp = (e) => this.handleDragEnd(e);
    this.app.stage.eventMode = 'static';
    this.app.stage.hitArea = this.app.screen;
    this.app.stage.on('pointermove', this.onStageMove);
    this.app.stage.on('pointerup', this.onStageUp);
    this.app.stage.on('pointerupoutside', this.onStageUp);

    this.startAnimTicker();
    this.startTimer();
  }

  setupNumberBoard() {
    this.boardLayer = new PIXI.Container();
    this.layer.addChild(this.boardLayer);

    const boardW = this.numSize * this.numCell;
    const boardH = this.numSize * this.numCell;

    // 棋盘底座
    const panel = new PIXI.Graphics();
    panel.beginFill(0x1c2333);
    panel.drawRoundedRect(this.numBoardX - 10, this.numBoardY - 10, boardW + 20, boardH + 20, 14);
    panel.endFill();
    panel.lineStyle(3, 0x3a4a6b);
    panel.drawRoundedRect(this.numBoardX - 10, this.numBoardY - 10, boardW + 20, boardH + 20, 14);
    this.boardLayer.addChild(panel);

    // 格子背景
    const cells = new PIXI.Graphics();
    for (let r = 0; r < this.numSize; r++) {
      for (let c = 0; c < this.numSize; c++) {
        cells.beginFill(0x141924);
        cells.drawRoundedRect(
          this.numBoardX + c * this.numCell + 2,
          this.numBoardY + r * this.numCell + 2,
          this.numCell - 4,
          this.numCell - 4,
          8
        );
        cells.endFill();
      }
    }
    this.boardLayer.addChild(cells);

    // 数字块容器
    this.pieceLayer = new PIXI.Container();
    this.boardLayer.addChild(this.pieceLayer);

    // 创建数字块
    this.numTileGfx = [];
    for (let i = 0; i < this.numTiles.length; i++) {
      const val = this.numTiles[i];
      if (val === 0) {
        this.numTileGfx[i] = null;
        continue;
      }
      const row = Math.floor(i / this.numSize);
      const col = i % this.numSize;
      const gfx = this.createNumberTile(val);
      gfx.x = this.numBoardX + col * this.numCell;
      gfx.y = this.numBoardY + row * this.numCell;
      gfx.renderX = gfx.x;
      gfx.renderY = gfx.y;
      gfx.tileIndex = i;
      gfx.value = val;
      gfx.eventMode = 'static';
      gfx.cursor = 'pointer';
      gfx.on('pointerdown', (e) => this.handleNumTileDown(e, gfx));
      this.pieceLayer.addChild(gfx);
      this.numTileGfx[i] = gfx;
    }
  }

  createNumberTile(val) {
    const c = new PIXI.Container();
    const s = this.numCell - 4;
    const pad = 3;

    // 根据数字大小选颜色
    const total = this.numSize * this.numSize - 1;
    let color;
    if (this.numSize === 3) {
      color = val <= 3 ? 0x5b8def : val <= 6 ? 0x4caf73 : 0xf1c40f;
    } else {
      if (val <= 4) color = 0x5b8def;
      else if (val <= 8) color = 0x4caf73;
      else if (val <= 12) color = 0xf1c40f;
      else color = 0xe85d4a;
    }

    // 阴影
    const shadow = new PIXI.Graphics();
    shadow.beginFill(0x000000, 0.3);
    shadow.drawRoundedRect(pad, pad + 2, s, s, 8);
    shadow.endFill();
    c.addChild(shadow);

    // 主体
    const bg = new PIXI.Graphics();
    bg.beginFill(color);
    bg.drawRoundedRect(pad, pad, s, s, 8);
    bg.endFill();

    // 高光
    bg.beginFill(0xffffff, 0.15);
    bg.drawRoundedRect(pad + 4, pad + 3, s - 8, 6, 3);
    bg.endFill();

    // 边框
    bg.lineStyle(1.5, 0xffffff, 0.2);
    bg.drawRoundedRect(pad + 0.5, pad + 0.5, s - 1, s - 1, 8);
    c.addChild(bg);

    // 数字
    const fontSize = this.numSize === 3 ? 36 : 28;
    const label = new PIXI.Text(String(val), {
      fontFamily: UI_FONT,
      fontWeight: '700',
      fontSize,
      fill: 0xffffff,
      stroke: 0x000000,
      strokeThickness: 2,
    });
    label.anchor.set(0.5);
    label.x = s / 2 + pad;
    label.y = s / 2 + pad;
    c.addChild(label);

    c.hitArea = new PIXI.Rectangle(0, 0, s + pad * 2, s + pad * 2);
    return c;
  }

  // ==================== 顶栏（通用） ====================
  setupTopBar(levelName, minSteps, isNumber = false) {
    // 返回
    const back = makeButton('‹ 选关', 76, 30, () => {
      Sound.click();
      this.cleanupDrag();
      this.showLevelSelect();
    }, DARKEN);
    back.x = 12;
    back.y = 14;
    this.layer.addChild(back);

    // 关卡名
    const title = new PIXI.Text(levelName, {
      fontFamily: UI_FONT,
      fontWeight: '700',
      fontSize: 18,
      fill: 0xffffff,
    });
    title.anchor.set(0.5);
    title.x = GAME_WIDTH / 2;
    title.y = 29;
    this.layer.addChild(title);

    // 重置
    const reset = makeButton('↻', 36, 30, () => {
      Sound.click();
      if (isNumber) {
        this.startNumberLevel(this.levelIndex);
      } else {
        this.startClassicLevel(this.levelIndex);
      }
    }, { fill: 0x8d4a4a, fontSize: 16 });
    reset.x = GAME_WIDTH - 90;
    reset.y = 14;
    this.layer.addChild(reset);

    // 撤销
    this.undoBtn = makeButton('↶', 36, 30, () => {
      Sound.click();
      this.undo();
    }, { fill: 0x2c4a6a, fontSize: 16 });
    this.undoBtn.x = GAME_WIDTH - 48;
    this.undoBtn.y = 14;
    this.layer.addChild(this.undoBtn);

    // 信息行
    this.movesText = new PIXI.Text('步数: 0', {
      fontFamily: UI_FONT,
      fontSize: 13,
      fill: 0x8fa3c7,
    });
    this.movesText.x = 12;
    this.movesText.y = 50;
    this.layer.addChild(this.movesText);

    this.timerText = new PIXI.Text('⏱ 0:00', {
      fontFamily: UI_FONT,
      fontSize: 13,
      fill: 0x8fa3c7,
    });
    this.timerText.x = GAME_WIDTH / 2 - 30;
    this.timerText.y = 50;
    this.layer.addChild(this.timerText);

    if (!isNumber && minSteps) {
      const prog = this.mode === 'number' ? this.progress.number : this.progress.classic;
      const best = prog.bestSteps[this.levelIndex];
      this.bestText = new PIXI.Text(
        best ? `最佳: ${best}步` : `最少: ${minSteps}步`,
        {
          fontFamily: UI_FONT,
          fontSize: 13,
          fill: 0x6a8099,
        }
      );
      this.bestText.x = GAME_WIDTH - 12;
      this.bestText.y = 50;
      this.bestText.anchor.set(1, 0);
      this.layer.addChild(this.bestText);
    }

    this.drawMuteButton();
  }

  // ==================== 拖拽（经典华容道） ====================
  handlePieceDown(e, piece) {
    if (this.won) return;
    e.stopPropagation();
    Sound.pick();

    this.dragging = piece;
    this.dragType = 'classic';
    this.dragStart = { x: e.global.x, y: e.global.y };
    this.dragOrigin = { row: piece.row, col: piece.col };
    this.dragMoved = false;
    this.dragDir = null;
    if (this.pieceGfx[piece.id]) {
      this.pieceGfx[piece.id].alpha = 0.88;
      this.pieceLayer.addChild(this.pieceGfx[piece.id]);
    }
  }

  handleDragMove(e) {
    if (this.dragType !== 'classic') return;
    const piece = this.dragging;
    if (!piece) return;

    const dx = e.global.x - this.dragStart.x;
    const dy = e.global.y - this.dragStart.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (!this.dragMoved && dist > 6) {
      this.dragMoved = true;
      this.dragDir = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
    }

    if (!this.dragMoved) return;

    if (this.dragDir === 'h') {
      const targetCol = this.dragOrigin.col + Math.round(dx / CELL);
      this.tryMovePiece(piece, targetCol, piece.row);
    } else {
      const targetRow = this.dragOrigin.row + Math.round(dy / CELL);
      this.tryMovePiece(piece, piece.col, targetRow);
    }
  }

  tryMovePiece(piece, targetCol, targetRow) {
    const dc = targetCol - piece.col;
    const dr = targetRow - piece.row;
    if (dc === 0 && dr === 0) return;
    if (dc !== 0 && dr !== 0) return;

    let moved = false;
    const moveHistory = [];

    if (dc !== 0) {
      const step = dc > 0 ? 1 : -1;
      while (piece.col !== targetCol) {
        if (this.canMove(piece, 0, step)) {
          moveHistory.push({ id: piece.id, fromRow: piece.row, fromCol: piece.col });
          piece.col += step;
          moved = true;
        } else break;
      }
    }
    if (dr !== 0) {
      const step = dr > 0 ? 1 : -1;
      while (piece.row !== targetRow) {
        if (this.canMove(piece, step, 0)) {
          moveHistory.push({ id: piece.id, fromRow: piece.row, fromCol: piece.col });
          piece.row += step;
          moved = true;
        } else break;
      }
    }

    if (moved) {
      this.moves += 1;
      this.movesText.text = `步数: ${this.moves}`;
      Sound.slide();
      this.history.push(moveHistory);
      // 限制历史长度
      if (this.history.length > 200) this.history.shift();
      this.checkClassicWin();
    }
  }

  canMove(piece, dRow, dCol) {
    const newRow = piece.row + dRow;
    const newCol = piece.col + dCol;
    if (newRow < 0 || newCol < 0) return false;
    if (newCol + piece.w > COLS) return false;
    if (newRow + piece.h > ROWS) return false;
    for (const other of this.pieces) {
      if (other.id === piece.id) continue;
      if (this.rectOverlap(
        newRow, newCol, piece.h, piece.w,
        other.row, other.col, other.h, other.w
      )) return false;
    }
    return true;
  }

  rectOverlap(r1, c1, h1, w1, r2, c2, h2, w2) {
    return !(r1 + h1 <= r2 || r2 + h2 <= r1 || c1 + w1 <= c2 || c2 + w2 <= c1);
  }

  // ==================== 拖拽（数字华容道） ====================
  handleNumTileDown(e, tile) {
    if (this.won) return;
    e.stopPropagation();
    Sound.pick();

    this.dragging = tile;
    this.dragType = 'number';
    this.dragStart = { x: e.global.x, y: e.global.y };
    this.dragMoved = false;

    // 尝试直接滑动
    this.trySlideNumber(tile);
  }

  handleNumDragMove(e) {
    if (this.dragType !== 'number') return;
    const tile = this.dragging;
    if (!tile) return;

    const dx = e.global.x - this.dragStart.x;
    const dy = e.global.y - this.dragStart.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (!this.dragMoved && dist > 6) {
      this.dragMoved = true;
      // 连续滑动
      this.trySlideNumber(tile);
    }
  }

  trySlideNumber(tile) {
    const idx = tile.tileIndex;
    const row = Math.floor(idx / this.numSize);
    const col = idx % this.numSize;

    // 找空格位置
    const emptyIdx = this.numTiles.indexOf(0);
    const emptyRow = Math.floor(emptyIdx / this.numSize);
    const emptyCol = emptyIdx % this.numSize;

    // 只能向空格方向滑动
    let dRow = 0, dCol = 0;
    if (row === emptyRow) {
      dCol = emptyCol > col ? 1 : -1;
    } else if (col === emptyCol) {
      dRow = emptyRow > row ? 1 : -1;
    } else {
      Sound.blocked();
      return;
    }

    // 逐格滑动直到到达空格
    let moved = false;
    const moveHistory = [];
    let curIdx = idx;
    let curRow = row;
    let curCol = col;

    while (curRow !== emptyRow || curCol !== emptyCol) {
      const nextRow = curRow + dRow;
      const nextCol = curCol + dCol;
      const nextIdx = nextRow * this.numSize + nextCol;

      // 交换 tiles 数据
      this.numTiles[curIdx] = 0;
      this.numTiles[nextIdx] = tile.value;

      // 更新 gfx
      const gfx = this.numTileGfx[curIdx];
      this.numTileGfx[curIdx] = null;
      this.numTileGfx[nextIdx] = gfx;
      gfx.tileIndex = nextIdx;

      moveHistory.push({ tileIdx: nextIdx, fromIdx: curIdx });
      curIdx = nextIdx;
      curRow = nextRow;
      curCol = nextCol;
      moved = true;
    }

    if (moved) {
      this.moves += 1;
      this.movesText.text = `步数: ${this.moves}`;
      Sound.slide();
      this.history.push({ type: 'number', moves: moveHistory });
      if (this.history.length > 200) this.history.shift();
      this.checkNumberWin();
    }
  }

  // ==================== 撤销 ====================
  undo() {
    if (this.won || this.history.length === 0) return;

    const last = this.history.pop();
    if (!last) return;

    if (this.dragType === 'number' || (last.type === 'number')) {
      // 数字华容道撤销
      const moves = last.moves || last;
      for (let i = moves.length - 1; i >= 0; i--) {
        const m = moves[i];
        const gfx = this.numTileGfx[m.tileIdx];
        if (!gfx) continue;
        // 交换回去
        this.numTiles[m.tileIdx] = 0;
        this.numTiles[m.fromIdx] = gfx.value;
        this.numTileGfx[m.tileIdx] = null;
        this.numTileGfx[m.fromIdx] = gfx;
        gfx.tileIndex = m.fromIdx;
      }
    } else {
      // 经典华容道撤销
      for (let i = last.length - 1; i >= 0; i--) {
        const m = last[i];
        const piece = this.pieces.find((p) => p.id === m.id);
        if (piece) {
          piece.row = m.fromRow;
          piece.col = m.fromCol;
        }
      }
    }

    this.moves = Math.max(0, this.moves - 1);
    this.movesText.text = `步数: ${this.moves}`;
    Sound.whoosh();
  }

  // ==================== 动画 Ticker ====================
  startAnimTicker() {
    this.stopTicker();
    this.tickerCb = () => this.updateAnim();
    this.app.ticker.add(this.tickerCb);
  }

  updateAnim() {
    const speed = 0.28; // 动画速度

    if (this.mode === 'number' && this.numTileGfx) {
      // 数字块动画
      for (let i = 0; i < this.numTileGfx.length; i++) {
        const gfx = this.numTileGfx[i];
        if (!gfx) continue;
        const row = Math.floor(i / this.numSize);
        const col = i % this.numSize;
        const tx = this.numBoardX + col * this.numCell;
        const ty = this.numBoardY + row * this.numCell;
        gfx.x = lerp(gfx.x, tx, speed);
        gfx.y = lerp(gfx.y, ty, speed);
      }
    } else if (this.pieces && this.pieceGfx) {
      // 经典棋子动画
      this.pieces.forEach((piece) => {
        const gfx = this.pieceGfx[piece.id];
        if (!gfx) return;
        const tx = BOARD_X + piece.col * CELL;
        const ty = BOARD_Y + piece.row * CELL;
        gfx.x = lerp(gfx.x, tx, speed);
        gfx.y = lerp(gfx.y, ty, speed);
        piece.renderX = gfx.x;
        piece.renderY = gfx.y;
      });
    }
  }

  // ==================== 计时器 ====================
  startTimer() {
    this.timerCb = () => {
      if (this.won) return;
      this.elapsed = Math.floor((Date.now() - this.startTime) / 1000);
      if (this.timerText) {
        this.timerText.text = `⏱ ${formatTime(this.elapsed)}`;
      }
    };
    this.app.ticker.add(this.timerCb);
  }

  // ==================== 通关检测 ====================
  checkClassicWin() {
    const caocao = this.pieces.find((p) => p.type === '2x2');
    if (!caocao) return;
    if (caocao.row === 3 && caocao.col === 1) {
      this.onWin();
    }
  }

  checkNumberWin() {
    const total = this.numSize * this.numSize;
    for (let i = 0; i < total - 1; i++) {
      if (this.numTiles[i] !== i + 1) return;
    }
    if (this.numTiles[total - 1] !== 0) return;
    this.onWin();
  }

  onWin() {
    this.won = true;
    Sound.win();
    this.cleanupDrag();

    const levels = this.mode === 'number' ? NUMBER_LEVELS : CLASSIC_LEVELS;
    const prog = this.mode === 'number' ? this.progress.number : this.progress.classic;
    const minSteps = levels[this.levelIndex].minSteps || (this.mode === 'number' ? 30 : 50);

    let stars;
    if (this.moves <= minSteps) stars = 3;
    else if (this.moves <= minSteps * 1.5) stars = 2;
    else stars = 1;

    prog.stars[this.levelIndex] = Math.max(prog.stars[this.levelIndex] || 0, stars);
    prog.unlocked = Math.max(prog.unlocked, Math.min(this.levelIndex + 2, levels.length));

    const prevBest = prog.bestSteps[this.levelIndex];
    if (!prevBest || this.moves < prevBest) {
      prog.bestSteps[this.levelIndex] = this.moves;
    }

    const prevTime = prog.bestTime[this.levelIndex];
    if (!prevTime || this.elapsed < prevTime) {
      prog.bestTime[this.levelIndex] = this.elapsed;
    }

    saveProgress(this.progress);

    // 烟花特效
    this.startFireworks();

    setTimeout(() => this.showWinOverlay(stars), 700);
  }

  // ==================== 烟花特效 ====================
  startFireworks() {
    this.fireworks = [];
    this.fireworkTicker = () => {
      if (!this.won) return;
      // 随机生成烟花
      if (Math.random() < 0.35) {
        this.spawnFirework();
      }
      // 更新烟花粒子
      this.fireworks = this.fireworks.filter((fw) => {
        fw.life -= 1;
        if (fw.life <= 0) {
          if (fw.gfx.parent) fw.gfx.parent.removeChild(fw.gfx);
          fw.gfx.destroy({ children: true });
          return false;
        }
        fw.gfx.x += fw.vx;
        fw.gfx.y += fw.vy;
        fw.vy += 0.08; // 重力
        fw.gfx.alpha = fw.life / fw.maxLife;
        fw.gfx.scale.set(fw.life / fw.maxLife);
        return true;
      });
    };
    this.app.ticker.add(this.fireworkTicker);

    // 3秒后停止
    setTimeout(() => {
      if (this.fireworkTicker) {
        this.app.ticker.remove(this.fireworkTicker);
        this.fireworkTicker = null;
      }
      this.fireworks.forEach((fw) => {
        if (fw.gfx.parent) fw.gfx.parent.removeChild(fw.gfx);
        fw.gfx.destroy({ children: true });
      });
      this.fireworks = [];
    }, 3500);
  }

  spawnFirework() {
    const x = 40 + Math.random() * (GAME_WIDTH - 80);
    const y = 80 + Math.random() * 200;
    const colors = [0xe85d4a, 0xffd54f, 0x5b8def, 0x4caf73, 0x9c4aef, 0xff6b9d];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const count = 8 + Math.floor(Math.random() * 6);

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const speed = 1.5 + Math.random() * 2.5;
      const particle = new PIXI.Graphics();
      particle.beginFill(color);
      particle.drawCircle(0, 0, 3 + Math.random() * 2);
      particle.endFill();
      particle.x = x;
      particle.y = y;

      this.layer.addChild(particle);
      this.fireworks.push({
        gfx: particle,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 30 + Math.random() * 20,
        maxLife: 50,
      });
    }
  }

  // ==================== 通关界面 ====================
  showWinOverlay(stars) {
    const overlay = new PIXI.Container();

    const mask = new PIXI.Graphics();
    mask.beginFill(0x000000, 0.75);
    mask.drawRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    mask.endFill();
    overlay.addChild(mask);

    const levels = this.mode === 'number' ? NUMBER_LEVELS : CLASSIC_LEVELS;
    const level = levels[this.levelIndex];
    const minSteps = level.minSteps || (this.mode === 'number' ? 30 : 50);

    // 标题
    const isClassic = this.mode !== 'number';
    const titleText = isClassic ? '曹操出关!' : '完美排列!';
    const title = new PIXI.Text(titleText, {
      fontFamily: UI_FONT,
      fontWeight: '700',
      fontSize: 38,
      fill: ACCENT,
      stroke: 0x0d0f1a,
      strokeThickness: 6,
    });
    title.anchor.set(0.5);
    title.x = GAME_WIDTH / 2;
    title.y = 170;
    overlay.addChild(title);

    // 星星
    const starContainer = new PIXI.Container();
    starContainer.x = GAME_WIDTH / 2;
    starContainer.y = 240;
    overlay.addChild(starContainer);

    for (let i = 0; i < 3; i++) {
      const star = new PIXI.Text(i < stars ? '★' : '☆', {
        fontFamily: UI_FONT,
        fontSize: 42,
        fill: i < stars ? GOLD : 0x3a4a6b,
      });
      star.anchor.set(0.5);
      star.x = (i - 1) * 50;
      star.y = 0;
      star.scale.set(0);
      starContainer.addChild(star);

      // 弹出动画
      setTimeout(() => {
        Sound.star();
        const popTicker = () => {
          star.scale.set(lerp(star.scale.x, 1, 0.2));
          if (star.scale.x > 0.98) {
            star.scale.set(1);
            this.app.ticker.remove(popTicker);
          }
        };
        this.app.ticker.add(popTicker);
      }, 300 + i * 250);
    }

    // 信息
    const info = new PIXI.Text(
      `${level.name} · ${this.moves} 步 · ${formatTime(this.elapsed)}`,
      {
        fontFamily: UI_FONT,
        fontSize: 15,
        fill: 0x8fa3c7,
      }
    );
    info.anchor.set(0.5);
    info.x = GAME_WIDTH / 2;
    info.y = 305;
    overlay.addChild(info);

    const minInfo = new PIXI.Text(
      `参考步数: ${minSteps} 步`,
      {
        fontFamily: UI_FONT,
        fontSize: 13,
        fill: 0x6a8099,
      }
    );
    minInfo.anchor.set(0.5);
    minInfo.x = GAME_WIDTH / 2;
    minInfo.y = 328;
    overlay.addChild(minInfo);

    // 按钮
    const hasNext = this.levelIndex + 1 < levels.length;
    const btnX = (GAME_WIDTH - 150) / 2;

    if (hasNext) {
      const next = makeButton('下一关 →', 150, 44, () => {
        Sound.click();
        if (this.mode === 'number') {
          this.startNumberLevel(this.levelIndex + 1);
        } else {
          this.startClassicLevel(this.levelIndex + 1);
        }
      }, { fill: ACCENT, fontSize: 18 });
      next.x = btnX;
      next.y = 360;
      overlay.addChild(next);
    }

    const retry = makeButton('再玩一次', 150, 38, () => {
      Sound.click();
      if (this.mode === 'number') {
        this.startNumberLevel(this.levelIndex);
      } else {
        this.startClassicLevel(this.levelIndex);
      }
    }, { fill: 0x2c3e50, fontSize: 15 });
    retry.x = btnX;
    retry.y = hasNext ? 414 : 360;
    overlay.addChild(retry);

    const toSelect = makeButton('选关', 150, 38, () => {
      Sound.click();
      this.showLevelSelect();
    }, DARKEN);
    toSelect.x = btnX;
    toSelect.y = hasNext ? 462 : 408;
    overlay.addChild(toSelect);

    this.layer.addChild(overlay);
  }

  // ==================== 清理 ====================
  handleDragEnd() {
    const piece = this.dragging;
    if (!piece) return;

    const dragType = this.dragType;
    this.dragging = null;
    this.dragType = null;
    this.dragMoved = false;

    if (dragType === 'classic' && this.pieceGfx && this.pieceGfx[piece.id]) {
      this.pieceGfx[piece.id].alpha = 1;
    } else if (dragType === 'number' && piece.alpha !== undefined) {
      piece.alpha = 1;
    }
  }

  cleanupDrag() {
    this.dragging = null;
    this.dragType = null;
    if (this.onStageMove) {
      this.app.stage.off('pointermove', this.onStageMove);
      this.onStageMove = null;
    }
    if (this.onStageUp) {
      this.app.stage.off('pointerup', this.onStageUp);
      this.app.stage.off('pointerupoutside', this.onStageUp);
      this.onStageUp = null;
    }
    if (this.timerCb) {
      this.app.ticker.remove(this.timerCb);
      this.timerCb = null;
    }
    if (this.fireworkTicker) {
      this.app.ticker.remove(this.fireworkTicker);
      this.fireworkTicker = null;
    }
  }
}
