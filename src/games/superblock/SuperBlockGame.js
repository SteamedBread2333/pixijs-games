// 超级积木：参考计客超级积木玩法
// 8x8 灯光棋盘亮起目标图案，拖动/旋转彩色积木恰好填满所有亮灯格子即通关
import * as PIXI from 'pixi.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../../config.js';
import { UI_FONT, makeButton, drawBackground } from '../../ui.js';
import { LEVELS, COLORS } from './levels.js';
import { loadProgress, saveProgress } from './progress.js';
import { Sound } from './sound.js';

const N = 8;          // 棋盘格数
const CELL = 40;      // 棋盘格像素
const TRAY_CELL = 18; // 待拼区缩小比例
const TRAY_ROW_HEIGHT = 52;
const TRAY_SLOT_HEIGHT = 48;
const BOARD_X = (GAME_WIDTH - N * CELL) / 2;
const BOARD_Y = 96;
const LEVELS_PER_PAGE = 20;

const DARKEN = { fill: 0x232b3d, fontSize: 14 };

function getUnlockOverride() {
  const searchParams = new URLSearchParams(window.location.search);
  const hashQuery = window.location.hash.includes('?')
    ? window.location.hash.slice(window.location.hash.indexOf('?') + 1)
    : '';
  const hashParams = new URLSearchParams(hashQuery);
  const value = searchParams.get('sbUnlock') ?? hashParams.get('sbUnlock');
  if (value === null || value.trim() === '') return null;
  const level = Number(value);
  if (!Number.isInteger(level)) return null;
  return Math.max(1, Math.min(level, LEVELS.length));
}

/** 顺时针旋转 90 度并归一化到非负坐标 */
function rotateCells(cells) {
  const rotated = cells.map(([x, y]) => [y, -x]);
  const minX = Math.min(...rotated.map((c) => c[0]));
  const minY = Math.min(...rotated.map((c) => c[1]));
  return rotated.map(([x, y]) => [x - minX, y - minY]);
}

function bounds(cells) {
  return {
    w: Math.max(...cells.map((c) => c[0])) + 1,
    h: Math.max(...cells.map((c) => c[1])) + 1,
  };
}

/** 圆角积木绘制：每格带柔和高光 */
function drawPieceGraphics(cells, color, cellSize) {
  const g = new PIXI.Graphics();
  for (const [cx, cy] of cells) {
    const x = cx * cellSize;
    const y = cy * cellSize;
    g.beginFill(0x000000, 0.22);
    g.drawRoundedRect(x + 2, y + 4, cellSize - 4, cellSize - 4, 8);
    g.endFill();
    g.beginFill(color);
    g.drawRoundedRect(x + 2, y + 2, cellSize - 4, cellSize - 5, 8);
    g.endFill();
    g.beginFill(0xffffff, 0.18);
    g.drawRoundedRect(x + 6, y + 5, cellSize - 12, 5, 2.5);
    g.endFill();
  }
  return g;
}

export class SuperBlockGame {
  constructor(app) {
    this.app = app;
    this.progress = loadProgress();
    const unlockOverride = getUnlockOverride();
    this.unlockedThrough = Math.max(this.progress.unlocked, unlockOverride ?? 1);
    if (unlockOverride !== null) {
      this.levelPage = Math.floor((unlockOverride - 1) / LEVELS_PER_PAGE);
    }
    this.layer = new PIXI.Container();
    app.stage.addChild(this.layer);

    this.onStageMove = (e) => this.handleDragMove(e);
    this.onStageUp = (e) => this.handleDragEnd(e);
    app.stage.eventMode = 'static';
    app.stage.hitArea = app.screen;
    app.stage.on('pointermove', this.onStageMove);
    app.stage.on('pointerup', this.onStageUp);
    app.stage.on('pointerupoutside', this.onStageUp);

    this.showLevelSelect();
    window.__sb = this; // DEBUG
  }

  destroy() {
    this.app.stage.off('pointermove', this.onStageMove);
    this.app.stage.off('pointerup', this.onStageUp);
    this.app.stage.off('pointerupoutside', this.onStageUp);
    this.layer.destroy({ children: true });
  }

  /** 清空当前画面 */
  clearScreen() {
    this.layer.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.dragging = null;
  }

  // ================= 选关界面 =================
  showLevelSelect(page = this.levelPage ?? 0) {
    this.clearScreen();
    const pageCount = Math.ceil(LEVELS.length / LEVELS_PER_PAGE);
    this.levelPage = Math.max(0, Math.min(page, pageCount - 1));
    drawBackground(this.layer, GAME_WIDTH, GAME_HEIGHT);

    const back = makeButton('‹ 主页', 76, 32, () => {
      Sound.click();
      window.location.hash = '';
    }, DARKEN);
    back.x = 16;
    back.y = 18;
    this.layer.addChild(back);

    const title = new PIXI.Text('超级积木', {
      fontFamily: UI_FONT,
      fontSize: 34,
      fill: 0xffd54f,
      stroke: 0x0d0f1a,
      strokeThickness: 5,
    });
    title.anchor.set(0.5);
    title.x = GAME_WIDTH / 2;
    title.y = 76;
    this.layer.addChild(title);

    const totalStars = Object.values(this.progress.stars).reduce((a, b) => a + b, 0);
    const starText = new PIXI.Text(`★ ${totalStars} / ${LEVELS.length * 3}`, {
      fontFamily: UI_FONT,
      fontSize: 16,
      fill: 0x8fa3c7,
    });
    starText.anchor.set(0.5);
    starText.x = GAME_WIDTH / 2;
    starText.y = 108;
    this.layer.addChild(starText);

    // 关卡按钮 5 列 4 行
    const cols = 5;
    const size = 58;
    const gap = 14;
    const gridW = cols * size + (cols - 1) * gap;
    const startX = (GAME_WIDTH - gridW) / 2;
    const startY = 150;

    const pageStart = this.levelPage * LEVELS_PER_PAGE;
    const pageLevels = LEVELS.slice(pageStart, pageStart + LEVELS_PER_PAGE);
    pageLevels.forEach((_, pageIndex) => {
      const levelIndex = pageStart + pageIndex;
      const levelNo = levelIndex + 1;
      const unlocked = levelNo <= this.unlockedThrough;
      const stars = this.progress.stars[levelIndex] || 0;

      const btn = new PIXI.Container();
      btn.x = startX + (pageIndex % cols) * (size + gap);
      btn.y = startY + Math.floor(pageIndex / cols) * (size + gap + 10);

      const bg = new PIXI.Graphics();
      bg.beginFill(unlocked ? 0x2c3e50 : 0x1a2029);
      bg.drawRoundedRect(0, 0, size, size, 12);
      bg.endFill();
      bg.lineStyle(1.5, unlocked ? 0x4a90d9 : 0x2a3242);
      bg.drawRoundedRect(1, 1, size - 2, size - 2, 11);
      btn.addChild(bg);

      const label = new PIXI.Text(unlocked ? String(levelNo) : '🔒', {
        fontFamily: UI_FONT,
        fontSize: unlocked ? 24 : 18,
        fill: unlocked ? 0xffffff : 0x46536e,
      });
      label.anchor.set(0.5);
      label.x = size / 2;
      label.y = size / 2 - 6;
      btn.addChild(label);

      const starLabel = new PIXI.Text(unlocked ? '★'.repeat(stars) || '—' : '', {
        fontFamily: UI_FONT,
        fontSize: 11,
        fill: 0xffd54f,
      });
      starLabel.anchor.set(0.5);
      starLabel.x = size / 2;
      starLabel.y = size - 12;
      btn.addChild(starLabel);

      if (unlocked) {
        btn.eventMode = 'static';
        btn.cursor = 'pointer';
        btn.hitArea = new PIXI.Rectangle(0, 0, size, size);
        btn.on('pointertap', () => {
          Sound.click();
          this.startLevel(levelIndex);
        });
      }
      this.layer.addChild(btn);
    });

    const pageText = new PIXI.Text(`${this.levelPage + 1} / ${pageCount}`, {
      fontFamily: UI_FONT,
      fontSize: 14,
      fill: 0x8fa3c7,
    });
    pageText.anchor.set(0.5);
    pageText.x = GAME_WIDTH / 2;
    pageText.y = 500;
    this.layer.addChild(pageText);

    if (this.levelPage > 0) {
      const previous = makeButton('‹ 上一页', 92, 34, () => {
        Sound.click();
        this.showLevelSelect(this.levelPage - 1);
      }, DARKEN);
      previous.x = 84;
      previous.y = 482;
      this.layer.addChild(previous);
    }

    if (this.levelPage < pageCount - 1) {
      const next = makeButton('下一页 ›', 92, 34, () => {
        Sound.click();
        this.showLevelSelect(this.levelPage + 1);
      }, DARKEN);
      next.x = GAME_WIDTH - 176;
      next.y = 482;
      this.layer.addChild(next);
    }

    const tip = new PIXI.Text('拖动积木 · 点按旋转 · 填满亮灯格子', {
      fontFamily: UI_FONT,
      fontSize: 13,
      fill: 0x46536e,
    });
    tip.anchor.set(0.5);
    tip.x = GAME_WIDTH / 2;
    tip.y = GAME_HEIGHT - 30;
    this.layer.addChild(tip);
  }

  // ================= 游戏界面 =================
  startLevel(levelIndex) {
    this.clearScreen();
    this.levelIndex = levelIndex;
    this.levelPage = Math.floor(levelIndex / LEVELS_PER_PAGE);
    this.resetsUsed = 0;
    this.moves = 0;
    this.won = false;

    const level = LEVELS[levelIndex];
    // 目标图案（亮灯格子）= 所有积木解法的并集
    this.targetSet = new Set();
    for (const p of level.pieces) {
      for (const [dx, dy] of p.cells) {
        this.targetSet.add(`${p.at[0] + dx},${p.at[1] + dy}`);
      }
    }
    this.placed = new Map(); // piece -> {x, y}

    drawBackground(this.layer, GAME_WIDTH, GAME_HEIGHT);
    this.setupTopBar();
    this.setupBoard();
    this.setupPieces(level);
  }

  setupTopBar() {
    const back = makeButton('‹ 选关', 76, 32, () => {
      Sound.click();
      this.showLevelSelect();
    }, DARKEN);
    back.x = 16;
    back.y = 16;
    this.layer.addChild(back);

    const title = new PIXI.Text(`第 ${this.levelIndex + 1} 关`, {
      fontFamily: UI_FONT,
      fontSize: 24,
      fill: 0xffffff,
    });
    title.anchor.set(0.5);
    title.x = GAME_WIDTH / 2;
    title.y = 32;
    this.layer.addChild(title);

    const reset = makeButton('重置', 66, 32, () => {
      Sound.click();
      this.resetBoard();
    }, { fill: 0x8d4a4a, fontSize: 14 });
    reset.x = GAME_WIDTH - 82;
    reset.y = 16;
    this.layer.addChild(reset);

    this.movesText = new PIXI.Text('步数: 0', {
      fontFamily: UI_FONT,
      fontSize: 14,
      fill: 0x8fa3c7,
    });
    this.movesText.x = 16;
    this.movesText.y = 58;
    this.layer.addChild(this.movesText);
  }

  setupBoard() {
    this.boardLayer = new PIXI.Container();
    this.layer.addChild(this.boardLayer);

    // 棋盘底座
    const panel = new PIXI.Graphics();
    panel.beginFill(0x1c2333);
    panel.drawRect(BOARD_X - 10, BOARD_Y - 10, N * CELL + 20, N * CELL + 20);
    panel.endFill();
    panel.lineStyle(3, 0x3a4a6b);
    panel.drawRect(BOARD_X - 10, BOARD_Y - 10, N * CELL + 20, N * CELL + 20);
    this.boardLayer.addChild(panel);

    // 格子：亮灯目标格发光，其余为暗格
    const cells = new PIXI.Graphics();
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const px = BOARD_X + x * CELL;
        const py = BOARD_Y + y * CELL;
        const isTarget = this.targetSet.has(`${x},${y}`);
        cells.beginFill(isTarget ? 0x4a4433 : 0x141924);
        cells.drawRect(px + 1, py + 1, CELL - 2, CELL - 2);
        cells.endFill();
        if (isTarget) {
          cells.beginFill(0xffe082, 0.85);
          cells.drawRect(px + 6, py + 6, CELL - 12, CELL - 12);
          cells.endFill();
        }
      }
    }
    this.boardLayer.addChild(cells);

    // 已放置的积木层
    this.placedLayer = new PIXI.Container();
    this.boardLayer.addChild(this.placedLayer);

    // 拖放幽灵预览层
    this.ghost = new PIXI.Graphics();
    this.boardLayer.addChild(this.ghost);
  }

  setupPieces(level) {
    this.trayLayer = new PIXI.Container();
    this.layer.addChild(this.trayLayer);

    // 待拼区面板
    const trayY = BOARD_Y + N * CELL + 24;
    const panel = new PIXI.Graphics();
    panel.beginFill(0x1c2333);
    panel.drawRect(16, trayY, GAME_WIDTH - 32, GAME_HEIGHT - trayY - 16);
    panel.endFill();
    panel.lineStyle(3, 0x3a4a6b);
    panel.drawRect(16, trayY, GAME_WIDTH - 32, GAME_HEIGHT - trayY - 16);
    this.trayLayer.addChild(panel);

    this.pieces = [];
    const scale = TRAY_CELL / CELL;
    let cursorX = 30;
    let cursorY = trayY + 12;
    const maxX = GAME_WIDTH - 30;

    level.pieces.forEach((def, i) => {
      const piece = {
        id: i,
        color: COLORS[def.color],
        baseCells: def.cells,
        rot: 0,
        state: 'tray', // tray | dragging | board
        container: new PIXI.Container(),
      };
      piece.cells = def.cells;
      this.renderPiece(piece, CELL);
      piece.container.scale.set(scale);

      // 流式布局摆放初始位置
      const { w, h } = bounds(piece.cells);
      const pw = w * TRAY_CELL;
      const ph = h * TRAY_CELL;
      if (cursorX + pw > maxX) {
        cursorX = 30;
        cursorY += TRAY_ROW_HEIGHT;
      }
      piece.home = { x: cursorX, y: cursorY + (TRAY_SLOT_HEIGHT - ph) / 2 };
      piece.container.x = piece.home.x;
      piece.container.y = piece.home.y;
      cursorX += pw + 18;

      piece.container.eventMode = 'static';
      piece.container.cursor = 'grab';
      piece.container.on('pointerdown', (e) => this.handlePieceDown(e, piece));

      this.trayLayer.addChild(piece.container);
      this.pieces.push(piece);
    });
  }

  /** 按当前 cells 重绘积木（cellSize 为绘制尺寸，缩放由容器控制） */
  renderPiece(piece, cellSize) {
    if (piece.gfx) {
      piece.container.removeChild(piece.gfx);
      piece.gfx.destroy();
    }
    piece.gfx = drawPieceGraphics(piece.cells, piece.color, cellSize);
    piece.container.addChild(piece.gfx);
  }

  // ================= 拖拽与旋转 =================
  handlePieceDown(e, piece) {
    if (this.won) return;
    e.stopPropagation();
    Sound.pick();

    // 从棋盘上拿起
    this.pickedFrom = 'tray';
    if (piece.state === 'board') {
      this.placed.delete(piece);
      this.pickedFrom = 'board';
    }

    piece.state = 'dragging';
    this.dragging = piece;
    this.dragMoved = false;
    this.dragStart = { x: e.global.x, y: e.global.y };
  }

  /** 首次拖动时放大到棋盘尺寸并提到最上层 */
  enlargeToDrag(piece) {
    if (this.pickedFrom !== 'board') {
      piece.container.scale.set(1);
    }
    this.layer.addChild(piece.container);
  }

  centerPieceOnPointer(piece, global) {
    const { w, h } = bounds(piece.cells);
    piece.container.x = global.x - (w * CELL) / 2;
    piece.container.y = global.y - (h * CELL) / 2 - 30;
  }

  handleDragMove(e) {
    const piece = this.dragging;
    if (!piece) return;
    const dx = e.global.x - this.dragStart.x;
    const dy = e.global.y - this.dragStart.y;
    if (!this.dragMoved && dx * dx + dy * dy > 64) {
      this.dragMoved = true;
      this.enlargeToDrag(piece);
    }
    if (!this.dragMoved) return;
    this.centerPieceOnPointer(piece, e.global);
    this.updateGhost();
  }

  /** 当前指针位置对应的棋盘锚点格 */
  anchorCellAt(piece) {
    const ax = Math.round((piece.container.x - BOARD_X) / CELL);
    const ay = Math.round((piece.container.y - BOARD_Y) / CELL);
    return { ax, ay };
  }

  canPlace(piece, ax, ay) {
    for (const [dx, dy] of piece.cells) {
      const x = ax + dx;
      const y = ay + dy;
      if (x < 0 || y < 0 || x >= N || y >= N) return false;
      if (!this.targetSet.has(`${x},${y}`)) return false;
      for (const [other, pos] of this.placed) {
        if (other === piece) continue;
        for (const [ox, oy] of other.cells) {
          if (pos.x + ox === x && pos.y + oy === y) return false;
        }
      }
    }
    return true;
  }

  updateGhost() {
    this.ghost.clear();
    const piece = this.dragging;
    if (!piece) return;
    const { ax, ay } = this.anchorCellAt(piece);
    const valid = this.canPlace(piece, ax, ay);
    const color = valid ? 0x2ecc71 : 0xe74c3c;
    for (const [dx, dy] of piece.cells) {
      const x = ax + dx;
      const y = ay + dy;
      if (x < 0 || y < 0 || x >= N || y >= N) continue;
      this.ghost.beginFill(color, 0.4);
      this.ghost.drawRect(BOARD_X + x * CELL + 3, BOARD_Y + y * CELL + 3, CELL - 6, CELL - 6);
      this.ghost.endFill();
    }
  }

  handleDragEnd(e) {
    const piece = this.dragging;
    if (!piece) return;
    this.dragging = null;
    this.ghost.clear();

    // 点按（未拖动）：待拼区积木旋转，棋盘拿起的放回待拼区
    if (!this.dragMoved) {
      if (this.pickedFrom === 'tray') {
        this.rotatePiece(piece);
      } else {
        this.returnToTray(piece);
      }
      return;
    }

    const { ax, ay } = this.anchorCellAt(piece);
    if (this.canPlace(piece, ax, ay) && this.isOverBoard(piece)) {
      this.placePiece(piece, ax, ay);
    } else {
      this.returnToTray(piece);
    }
  }

  isOverBoard(piece) {
    const { w, h } = bounds(piece.cells);
    const cx = piece.container.x + (w * CELL) / 2;
    const cy = piece.container.y + (h * CELL) / 2;
    return (
      cx > BOARD_X - 20 && cx < BOARD_X + N * CELL + 20 &&
      cy > BOARD_Y - 20 && cy < BOARD_Y + N * CELL + 20
    );
  }

  rotatePiece(piece) {
    Sound.rotate();
    const old = bounds(piece.cells);
    const oldCenterX = piece.container.x + (old.w * TRAY_CELL) / 2;
    const oldCenterY = piece.container.y + (old.h * TRAY_CELL) / 2;

    piece.rot = (piece.rot + 1) % 4;
    piece.cells = rotateCells(piece.cells);
    this.renderPiece(piece, CELL);
    piece.container.scale.set(TRAY_CELL / CELL);

    const nb = bounds(piece.cells);
    piece.container.x = oldCenterX - (nb.w * TRAY_CELL) / 2;
    piece.container.y = oldCenterY - (nb.h * TRAY_CELL) / 2;
    piece.home = { x: piece.container.x, y: piece.container.y };
    piece.state = 'tray';
  }

  placePiece(piece, ax, ay) {
    piece.state = 'board';
    this.placed.set(piece, { x: ax, y: ay });
    piece.container.scale.set(1);
    piece.container.x = BOARD_X + ax * CELL;
    piece.container.y = BOARD_Y + ay * CELL;
    this.placedLayer.addChild(piece.container);
    this.moves += 1;
    this.movesText.text = `步数: ${this.moves}`;
    Sound.place();
    this.checkWin();
  }

  returnToTray(piece) {
    Sound.invalid();
    piece.state = 'tray';
    piece.container.scale.set(TRAY_CELL / CELL);
    piece.container.x = piece.home.x;
    piece.container.y = piece.home.y;
    this.trayLayer.addChild(piece.container);
  }

  resetBoard() {
    if (this.won) return;
    if (this.placed.size === 0) return;
    this.resetsUsed += 1;
    for (const piece of this.pieces) {
      if (piece.state === 'board' || piece.state === 'dragging') {
        this.returnToTray(piece);
      }
    }
    this.placed.clear();
  }

  // ================= 通关 =================
  checkWin() {
    let covered = 0;
    for (const [piece, pos] of this.placed) {
      for (const [dx, dy] of piece.cells) {
        if (this.targetSet.has(`${pos.x + dx},${pos.y + dy}`)) covered += 1;
      }
    }
    if (covered < this.targetSet.size) return;

    this.won = true;
    Sound.win();

    // 星星：不用重置 3 星，用 1 次 2 星，更多 1 星
    const stars = this.resetsUsed === 0 ? 3 : this.resetsUsed === 1 ? 2 : 1;
    this.progress.stars[this.levelIndex] = Math.max(
      this.progress.stars[this.levelIndex] || 0,
      stars
    );
    this.progress.unlocked = Math.max(
      this.progress.unlocked,
      Math.min(this.levelIndex + 2, LEVELS.length)
    );
    this.unlockedThrough = Math.max(this.unlockedThrough, this.progress.unlocked);
    saveProgress(this.progress);

    setTimeout(() => this.showWinOverlay(stars), 400);
  }

  showWinOverlay(stars) {
    const overlay = new PIXI.Container();

    const mask = new PIXI.Graphics();
    mask.beginFill(0x000000, 0.7);
    mask.drawRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    mask.endFill();
    overlay.addChild(mask);

    const title = new PIXI.Text('通关!', {
      fontFamily: UI_FONT,
      fontSize: 48,
      fill: 0xffd54f,
      stroke: 0x0d0f1a,
      strokeThickness: 6,
    });
    title.anchor.set(0.5);
    title.x = GAME_WIDTH / 2;
    title.y = 200;
    overlay.addChild(title);

    const starText = new PIXI.Text('★'.repeat(stars) + '☆'.repeat(3 - stars), {
      fontFamily: UI_FONT,
      fontSize: 44,
      fill: 0xffd54f,
    });
    starText.anchor.set(0.5);
    starText.x = GAME_WIDTH / 2;
    starText.y = 270;
    overlay.addChild(starText);

    const info = new PIXI.Text(`第 ${this.levelIndex + 1} 关 · 步数 ${this.moves}`, {
      fontFamily: UI_FONT,
      fontSize: 16,
      fill: 0x8fa3c7,
    });
    info.anchor.set(0.5);
    info.x = GAME_WIDTH / 2;
    info.y = 320;
    overlay.addChild(info);

    const hasNext = this.levelIndex + 1 < LEVELS.length;
    if (hasNext) {
      const next = makeButton('下一关', 150, 44, () => {
        Sound.click();
        this.startLevel(this.levelIndex + 1);
      }, { fill: 0x43a047, fontSize: 18 });
      next.x = (GAME_WIDTH - 150) / 2;
      next.y = 370;
      overlay.addChild(next);
    }

    const retry = makeButton('再玩一次', 150, 40, () => {
      Sound.click();
      this.startLevel(this.levelIndex);
    }, { fill: 0x2c3e50, fontSize: 16 });
    retry.x = (GAME_WIDTH - 150) / 2;
    retry.y = hasNext ? 430 : 370;
    overlay.addChild(retry);

    const toSelect = makeButton('选关', 150, 40, () => {
      Sound.click();
      this.showLevelSelect();
    }, DARKEN);
    toSelect.x = (GAME_WIDTH - 150) / 2;
    toSelect.y = hasNext ? 484 : 424;
    overlay.addChild(toSelect);

    this.layer.addChild(overlay);
  }
}
