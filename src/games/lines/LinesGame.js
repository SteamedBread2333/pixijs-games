// 连线迷航 (Lines) - 主控制器
//
// 复刻 Steam《Lines X Free》的 Numberlink 玩法：
// 网格散布若干对同色端点，用线连通每对同色点，
// 路径只能上下左右延伸、不交叉不重叠、最终覆盖所有格子。
//
// 交互：点选一个端点球 -> 逐个延伸路径到相邻空格/目标端点 -> 完成连线。
// 支持鼠标与触控，含撤销、计时、三星评价、关卡进度与音效。

import * as PIXI from 'pixi.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../../config.js';
import { UI_FONT, makeButton, drawBackground } from '../../ui.js';
import {
  LEVELS, PALETTE, COLORS, GOLD, ACCENT, DARKEN, validateLevel,
} from './config.js';
import { drawBall, drawPath, drawGridLines, drawHomeIcon } from './art.js';
import { loadProgress, saveProgress } from './progress.js';
import { Sound } from './sound.js';

const LEVELS_PER_PAGE = 20;
const MAX_UNDO = 500;

// 四方向偏移
const DIRS = [
  { dr: -1, dc: 0 }, // 上
  { dr: 1, dc: 0 },  // 下
  { dr: 0, dc: -1 }, // 左
  { dr: 0, dc: 1 },  // 右
];

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export class LinesGame {
  constructor(app) {
    this.app = app;
    this.progress = loadProgress();
    this.unlockedThrough = this.progress.unlocked;
    this.muted = Sound.isMuted();
    this.layer = new PIXI.Container();
    app.stage.addChild(this.layer);

    // 背景只画一次（最底层），后续页面切换只重建前景
    this.bgLayer = new PIXI.Container();
    drawBackground(this.bgLayer, GAME_WIDTH, GAME_HEIGHT);
    this.layer.addChild(this.bgLayer);
    this.fxLayer = new PIXI.Container();
    this.layer.addChild(this.fxLayer);

    this._setupStage();
    this.showLevelSelect();

    // 支持 ?level=N 直达指定关卡（如 #/game/lines?level=50）
    const hashQuery = window.location.hash.includes('?')
      ? window.location.hash.slice(window.location.hash.indexOf('?') + 1)
      : '';
    const levelParam = new URLSearchParams(hashQuery).get('level');
    if (levelParam !== null) {
      const idx = Number(levelParam) - 1;
      if (Number.isInteger(idx) && idx >= 0 && idx < LEVELS.length) {
        this.startLevel(idx);
      }
    }
  }

  destroy() {
    this._removeInputListeners();
    if (this._timerCb) {
      this.app.ticker.remove(this._timerCb);
      this._timerCb = null;
    }
    this.layer.destroy({ children: true });
  }

  _setupStage() {
    this.app.stage.eventMode = 'static';
    this.app.stage.hitArea = this.app.screen;
  }

  clearScreen() {
    this._removeInputListeners();
    // 只清前景层，背景层（bgLayer）始终保留
    this.fxLayer.removeChildren().forEach((c) => c.destroy({ children: true }));
  }

  _addInputListeners(onMove, onUp) {
    this._onMove = onMove;
    this._onUp = onUp;
    this.app.stage.on('pointermove', onMove);
    this.app.stage.on('pointerup', onUp);
    this.app.stage.on('pointerupoutside', onUp);
  }

  _removeInputListeners() {
    if (this._onMove) {
      this.app.stage.off('pointermove', this._onMove);
      this.app.stage.off('pointerup', this._onUp);
      this.app.stage.off('pointerupoutside', this._onUp);
      this._onMove = null;
      this._onUp = null;
    }
  }

  // ============ 选关 ============

  showLevelSelect(page = this.levelPage ?? 0) {
    this.clearScreen();
    this.mode = 'select';

    const pageCount = Math.ceil(LEVELS.length / LEVELS_PER_PAGE);
    this.levelPage = clamp(page, 0, pageCount - 1);

    const back = makeButton('‹ 主页', 76, 32, () => {
      Sound.click();
      window.location.hash = '';
    }, DARKEN);
    back.x = 16; back.y = 18;
    this.fxLayer.addChild(back);

    const title = new PIXI.Text('连线迷航', {
      fontFamily: UI_FONT, fontSize: 32, fill: ACCENT, fontWeight: '700',
      stroke: 0x0d0f1a, strokeThickness: 4,
    });
    title.anchor.set(0.5);
    title.x = GAME_WIDTH / 2; title.y = 60;
    this.fxLayer.addChild(title);

    const sub = new PIXI.Text('连接同色点 · 铺满每一格', {
      fontFamily: UI_FONT, fontSize: 14, fill: 0x8fa3c7,
    });
    sub.anchor.set(0.5);
    sub.x = GAME_WIDTH / 2; sub.y = 90;
    this.fxLayer.addChild(sub);

    const cols = 5;
    const size = 58;
    const gap = 12;
    const gridW = cols * size + (cols - 1) * gap;
    const startX = (GAME_WIDTH - gridW) / 2;
    const startY = 118;

    const pageStart = this.levelPage * LEVELS_PER_PAGE;
    const pageLevels = LEVELS.slice(pageStart, pageStart + LEVELS_PER_PAGE);

    pageLevels.forEach((_, pageIndex) => {
      const levelIndex = pageStart + pageIndex;
      const levelNo = levelIndex + 1;
      const unlocked = levelNo <= this.unlockedThrough;
      const stars = this.progress.bestStars[levelIndex] || 0;

      const btn = new PIXI.Container();
      btn.x = startX + (pageIndex % cols) * (size + gap);
      btn.y = startY + Math.floor(pageIndex / cols) * (size + gap + 8);

      const bg = new PIXI.Graphics();
      bg.beginFill(unlocked ? 0x2c3e50 : 0x1a2029);
      bg.drawRoundedRect(0, 0, size, size, 12);
      bg.endFill();
      bg.lineStyle(1.5, unlocked ? ACCENT : 0x2a3242);
      bg.drawRoundedRect(0.75, 0.75, size - 1.5, size - 1.5, 12);
      btn.addChild(bg);

      const label = new PIXI.Text(unlocked ? String(levelNo) : '🔒', {
        fontFamily: UI_FONT,
        fontSize: unlocked ? 22 : 18,
        fill: unlocked ? 0xffffff : 0x46536e,
      });
      label.anchor.set(0.5);
      label.x = size / 2; label.y = size / 2 - 6;
      btn.addChild(label);

      const starLabel = new PIXI.Text(unlocked ? '★'.repeat(stars) || '—' : '', {
        fontFamily: UI_FONT, fontSize: 11, fill: GOLD,
      });
      starLabel.anchor.set(0.5);
      starLabel.x = size / 2; starLabel.y = size - 12;
      btn.addChild(starLabel);

      if (unlocked) {
        const hit = new PIXI.Graphics();
        hit.beginFill(0x000000, 0.01);
        hit.drawRect(0, 0, size, size);
        hit.endFill();
        hit.eventMode = 'static';
        hit.cursor = 'pointer';
        const startLv = () => { Sound.click(); this.startLevel(levelIndex); };
        hit.on('pointerup', startLv);
        hit.on('pointertap', startLv);
        btn.addChild(hit);
      }
      this.fxLayer.addChild(btn);
    });

    if (this.levelPage > 0) {
      const prev = makeButton('‹ 上一页', 90, 32, () => {
        Sound.click();
        this.showLevelSelect(this.levelPage - 1);
      }, DARKEN);
      prev.x = 30; prev.y = GAME_HEIGHT - 56;
      this.fxLayer.addChild(prev);
    }
    if (this.levelPage < pageCount - 1) {
      const next = makeButton('下一页 ›', 90, 32, () => {
        Sound.click();
        this.showLevelSelect(this.levelPage + 1);
      }, DARKEN);
      next.x = GAME_WIDTH - 120; next.y = GAME_HEIGHT - 56;
      this.fxLayer.addChild(next);
    }

    const totalStars = Object.values(this.progress.bestStars).reduce((a, b) => a + b, 0);
    const pageText = new PIXI.Text(`第 ${this.levelPage + 1} / ${pageCount} 页 · ★ ${totalStars}`, {
      fontFamily: UI_FONT, fontSize: 13, fill: 0x8fa3c7,
    });
    pageText.anchor.set(0.5);
    pageText.x = GAME_WIDTH / 2; pageText.y = GAME_HEIGHT - 24;
    this.fxLayer.addChild(pageText);
  }

  // ============ 开始关卡 ============

  startLevel(levelIndex) {
    this.clearScreen();
    this.mode = 'play';
    this.levelIndex = levelIndex;
    this.level = LEVELS[levelIndex];
    if (!validateLevel(this.level)) {
      // 数据异常兜底：回选关
      this.showLevelSelect();
      return;
    }

    const size = this.level.size;

    // ---- 网格布局计算 ----
    // 顶部 HUD 高约 76px，底部留操作区
    const topHud = 76;
    const bottomReserve = 76;
    const availW = GAME_WIDTH - 24;
    const availH = GAME_HEIGHT - topHud - bottomReserve;
    const cell = Math.floor(Math.min(availW / size, availH / size));
    this.cell = cell;
    this.size = size;
    const boardW = size * cell;
    const boardH = size * cell;
    this.gridX = Math.floor((GAME_WIDTH - boardW) / 2);
    this.gridY = topHud + Math.floor((availH - boardH) / 2);

    // ---- 数据模型 ----
    // occupied[r][c] = 该格属于哪条线（colorIndex），null 表示空
    this.occupied = Array.from({ length: size }, () => Array(size).fill(null));
    // endpoints: { colorIndex: { a: {r,c}, b: {r,c} } }
    this.endpoints = {};
    // paths: colorIndex -> 已连路径的格子序列 [[r,c], ...]（含两端点）
    this.paths = {};

    this.level.pairs.forEach(([r1, c1, r2, c2, color]) => {
      this.endpoints[color] = { a: { r: r1, c: c1 }, b: { r: r2, c: c2 } };
      this.occupied[r1][c1] = color;
      this.occupied[r2][c2] = color;
    });

    // ---- 状态 ----
    this.activeColor = null;   // 当前正在延伸的颜色
    this.activePath = null;    // 当前路径的格子序列 [[r,c],...]
    this.undoStack = [];       // 撤销栈
    this.won = false;
    this.moves = 0;
    this.startTime = performance.now();
    this.elapsedMs = 0;

    // ---- 渲染层 ----
    this.boardLayer = new PIXI.Container();
    this.pathLayer = new PIXI.Container();
    this.uiLayer = new PIXI.Container();
    this.overlayLayer = new PIXI.Container();
    this.fxLayer.addChild(this.boardLayer);
    this.fxLayer.addChild(this.pathLayer);
    this.fxLayer.addChild(this.uiLayer);
    this.fxLayer.addChild(this.overlayLayer);

    this._buildBoard();
    this._buildHud();
    this._setupInput();
    this._startTimer();
  }

  // ============ 棋盘渲染 ============

  _buildBoard() {
    const { size, cell, gridX, gridY } = this;

    // 棋盘底板
    const panel = new PIXI.Graphics();
    panel.beginFill(0x1c2333);
    panel.drawRoundedRect(gridX - 8, gridY - 8, size * cell + 16, size * cell + 16, 14);
    panel.endFill();
    panel.lineStyle(2, 0x3a4a6b);
    panel.drawRoundedRect(gridX - 8, gridY - 8, size * cell + 16, size * cell + 16, 14);
    this.boardLayer.addChild(panel);

    // 网格线
    this.boardLayer.addChild(drawGridLines(size, cell, gridX, gridY));

    // 端点球（放在 boardLayer 之上，pathLayer 之下由 pathLayer 顺序保证）
    // 端点球单独一层，始终显示在最上方
    this.endpointLayer = new PIXI.Container();
    this.boardLayer.addChild(this.endpointLayer);

    this._renderEndpoints();
  }

  _renderEndpoints() {
    this.endpointLayer.removeChildren().forEach((c) => c.destroy({ children: true }));
    const { cell, gridX, gridY } = this;

    for (const color of Object.keys(this.endpoints)) {
      const ep = this.endpoints[color];
      const col = Number(color);
      const connected = this.paths[color] && this.paths[color].length >= 2;
      for (const key of ['a', 'b']) {
        const { r, c } = ep[key];
        const ball = drawBall(PALETTE[col], cell * 0.32, { filled: connected });
        ball.x = gridX + c * cell + cell / 2;
        ball.y = gridY + r * cell + cell / 2;
        this.endpointLayer.addChild(ball);
      }
    }
  }

  // ============ HUD ============

  _buildHud() {
    const back = makeButton('‹ 选关', 76, 30, () => {
      Sound.click();
      this.showLevelSelect();
    }, DARKEN);
    back.x = 12; back.y = 14;
    this.uiLayer.addChild(back);

    const title = new PIXI.Text(`第 ${this.levelIndex + 1} 关`, {
      fontFamily: UI_FONT, fontSize: 18, fill: 0xffffff, fontWeight: '700',
    });
    title.anchor.set(0.5);
    title.x = GAME_WIDTH / 2; title.y = 16;
    this.uiLayer.addChild(title);

    const sizeLabel = new PIXI.Text(`${this.size}×${this.size} · ${this.level.pairs.length} 条线`, {
      fontFamily: UI_FONT, fontSize: 11, fill: 0xa9bbdc,
    });
    sizeLabel.anchor.set(0.5);
    sizeLabel.x = GAME_WIDTH / 2; sizeLabel.y = 38;
    this.uiLayer.addChild(sizeLabel);

    // 撤销
    this.undoBtn = makeButton('↶', 38, 30, () => {
      Sound.click();
      this.undo();
    }, { fill: 0x2c4a6a, fontSize: 16 });
    this.undoBtn.x = GAME_WIDTH - 92; this.undoBtn.y = 14;
    this.uiLayer.addChild(this.undoBtn);

    // 重置
    const reset = makeButton('↻', 38, 30, () => {
      Sound.click();
      this.startLevel(this.levelIndex);
    }, { fill: 0x8d4a4a, fontSize: 16 });
    reset.x = GAME_WIDTH - 48; reset.y = 14;
    this.uiLayer.addChild(reset);

    // 静音
    this._drawMuteButton();

    // 计时 + 提示
    this.timerText = new PIXI.Text('⏱ 0:00', {
      fontFamily: UI_FONT, fontSize: 13, fill: 0x8fa3c7,
    });
    this.timerText.x = 12; this.timerText.y = 52;
    this.uiLayer.addChild(this.timerText);

    this.hintText = new PIXI.Text('点选端点 · 拖动延伸 · 连通同色点并铺满格子', {
      fontFamily: UI_FONT, fontSize: 11, fill: 0x6f86ad,
    });
    this.hintText.anchor.set(0.5);
    this.hintText.x = GAME_WIDTH / 2;
    this.hintText.y = GAME_HEIGHT - 14;
    this.uiLayer.addChild(this.hintText);
  }

  _drawMuteButton() {
    const btn = new PIXI.Container();
    btn.x = GAME_WIDTH - 44; btn.y = 56;

    const bg = new PIXI.Graphics();
    bg.beginFill(0x232b3d);
    bg.drawRoundedRect(0, 0, 30, 30, 8);
    bg.endFill();
    btn.addChild(bg);

    const icon = new PIXI.Text(this.muted ? '🔇' : '🔊', {
      fontFamily: UI_FONT, fontSize: 13,
    });
    icon.anchor.set(0.5);
    icon.x = 15; icon.y = 15;
    btn.addChild(icon);

    btn.eventMode = 'static';
    btn.cursor = 'pointer';
    btn.hitArea = new PIXI.Rectangle(0, 0, 30, 30);
    btn.on('pointertap', () => {
      this.muted = !this.muted;
      Sound.setMuted(this.muted);
      icon.text = this.muted ? '🔇' : '🔊';
    });
    this.uiLayer.addChild(btn);
  }

  // ============ 输入处理 ============

  _setupInput() {
    const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    this.isTouch = isTouch;

    // pointerdown 在 stage 上监听，用于选中端点 / 延伸路径
    this._onDown = (e) => this._handlePointerDown(e);
    this.app.stage.on('pointerdown', this._onDown);

    // pointermove 用于拖拽延伸
    this._onMove = (e) => this._handlePointerMove(e);
    this.app.stage.on('pointermove', this._onMove);

    this._onUp = () => { /* 拖拽结束，无额外处理 */ };
    this.app.stage.on('pointerup', this._onUp);
    this.app.stage.on('pointerupoutside', this._onUp);

    // 记录上次延伸的格子，避免重复
    this._lastMoveCell = null;
  }

  _removeInputListeners() {
    if (this._onDown) {
      this.app.stage.off('pointerdown', this._onDown);
      this._onDown = null;
    }
    if (this._onMove) {
      this.app.stage.off('pointermove', this._onMove);
      this._onMove = null;
    }
    if (this._onUp) {
      this.app.stage.off('pointerup', this._onUp);
      this.app.stage.off('pointerupoutside', this._onUp);
      this._onUp = null;
    }
  }

  _pixelToCell(px, py) {
    const { size, cell, gridX, gridY } = this;
    const c = Math.floor((px - gridX) / cell);
    const r = Math.floor((py - gridY) / cell);
    if (r < 0 || c < 0 || r >= size || c >= size) return null;
    return { r, c };
  }

  _cellAtPointer(e) {
    return this._pixelToCell(e.global.x, e.global.y);
  }

  _handlePointerDown(e) {
    if (this.won || this.mode !== 'play') return;
    const cell = this._cellAtPointer(e);
    if (!cell) return;
    const { r, c } = cell;

    // 已连线完成，不允许再改（除非撤销）
    if (this.occupied[r][c] !== null) {
      const color = this.occupied[r][c];
      // 点击已完成的线端点：可重新开始该线（先撤销该线）
      // 点击正在延伸的线：视为继续/结束
      const isEndpoint = this._isEndpoint(r, c, color);
      if (isEndpoint) {
        // 如果该颜色已有完整路径且是端点，点击则准备重新连线
        this._startPath(color, r, c);
      } else {
        // 点击线上非端点格：忽略（或轻提示）
        Sound.blocked();
      }
      return;
    }

    // 空格：如果当前有活动路径，延伸一步
    if (this.activeColor !== null) {
      this._tryExtend(r, c);
      return;
    }

    // 无活动路径且点空格：无操作
  }

  _handlePointerMove(e) {
    if (this.won || this.mode !== 'play') return;
    if (this.activeColor === null) return;
    if (!this.isTouch && e.buttons !== 1) return; // 桌面端需按住左键

    const cell = this._cellAtPointer(e);
    if (!cell) return;
    const { r, c } = cell;

    // 避免同一格重复触发
    if (this._lastMoveCell && this._lastMoveCell.r === r && this._lastMoveCell.c === c) {
      return;
    }
    this._lastMoveCell = { r, c };

    // 只有空格或目标端点可以延伸
    if (this.occupied[r][c] !== null) {
      const color = this.occupied[r][c];
      // 到达目标端点（同色且是另一端）
      if (color === this.activeColor && this._isEndpoint(r, c, color)) {
        this._tryExtend(r, c);
      }
      return;
    }
    this._tryExtend(r, c);
  }

  _isEndpoint(r, c, color) {
    const ep = this.endpoints[color];
    if (!ep) return false;
    return (ep.a.r === r && ep.a.c === c) || (ep.b.r === r && ep.b.c === c);
  }

  // ============ 路径逻辑 ============

  _startPath(color, r, c) {
    // 如果该颜色已有路径，先移除（重新连线）
    if (this.paths[color]) {
      this._removePath(color);
    }
    this.activeColor = color;
    // 起点就是被点击的端点
    this.activePath = [{ r, c }];
    this.undoStack.push({ type: 'start', color, cell: { r, c } });
    Sound.pick();
    this._renderAllPaths();
  }

  _tryExtend(r, c) {
    if (this.activeColor === null || !this.activePath) return;
    const last = this.activePath[this.activePath.length - 1];
    const color = this.activeColor;

    // 必须是上下左右相邻
    const dr = Math.abs(r - last.r);
    const dc = Math.abs(c - last.c);
    if (dr + dc !== 1) return;

    // 目标格是否可走
    const targetOcc = this.occupied[r][c];
    if (targetOcc !== null) {
      // 只能落到同色目标端点（且不是当前路径最后端点自身）
      if (targetOcc === color && this._isEndpoint(r, c, color)) {
        // 检查是否是另一端点（非起点）
        const isStart = this.activePath[0].r === r && this.activePath[0].c === c;
        if (!isStart && this.activePath.length >= 2) {
          // 完成连线
          this._finishPath(r, c);
          return;
        }
      }
      // 其他占用格：不能走
      return;
    }

    // 空格：延伸
    this.occupied[r][c] = color;
    this.activePath.push({ r, c });
    this.undoStack.push({ type: 'extend', color, cell: { r, c } });
    Sound.step();
    this._renderAllPaths();
  }

  _finishPath(r, c) {
    const color = this.activeColor;
    // 加入终点
    this.activePath.push({ r, c });
    // 终点已占用（是端点，不需要重新设置 occupied）
    this.paths[color] = this.activePath;
    this.undoStack.push({ type: 'finish', color, cell: { r, c } });
    this.moves += 1;

    Sound.connect();
    this.activeColor = null;
    this.activePath = null;

    this._renderAllPaths();
    this._checkWin();
  }

  _removePath(color) {
    const path = this.paths[color];
    if (!path) return;
    // 清除路径中非端点的占用
    for (const cell of path) {
      if (!this._isEndpoint(cell.r, cell.c, color)) {
        this.occupied[cell.r][cell.c] = null;
      }
    }
    delete this.paths[color];
  }

  undo() {
    if (this.won || this.undoStack.length === 0) return;

    // 如果正在延伸，先回退到起点前状态（即取消当前活动路径）
    if (this.activeColor !== null) {
      this._cancelActivePath();
      return;
    }

    // 否则撤销最近一次完成的连线
    const last = this.undoStack.pop();
    if (!last) return;

    if (last.type === 'finish') {
      const color = last.color;
      // 移除该线
      this._removePath(color);
      Sound.undo();
      this._renderAllPaths();
    }
    // start/extend 类型的栈条目只在 activePath 存在时出现，已由 _cancelActivePath 处理
  }

  _cancelActivePath() {
    const color = this.activeColor;
    const path = this.activePath;
    if (!color || !path) return;
    // 清除路径中非端点的占用
    for (const cell of path) {
      if (!this._isEndpoint(cell.r, cell.c, color)) {
        this.occupied[cell.r][cell.c] = null;
      }
    }
    // 从撤销栈中移除属于这次活动路径的记录
    while (this.undoStack.length > 0) {
      const top = this.undoStack[this.undoStack.length - 1];
      if (top.color === color && (top.type === 'start' || top.type === 'extend')) {
        this.undoStack.pop();
      } else {
        break;
      }
    }
    this.activeColor = null;
    this.activePath = null;
    Sound.undo();
    this._renderAllPaths();
  }

  _checkWin() {
    // 所有颜色都完成连线
    for (const color of Object.keys(this.endpoints)) {
      if (!this.paths[color]) return;
    }
    // 所有格子都被占用
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.occupied[r][c] === null) return;
      }
    }
    this._onWin();
  }

  // ============ 路径渲染 ============

  _renderAllPaths() {
    this.pathLayer.removeChildren().forEach((c) => c.destroy({ children: true }));
    const { cell, gridX, gridY } = this;

    // 已完成路径
    for (const color of Object.keys(this.paths)) {
      const col = Number(color);
      const path = this.paths[color];
      const points = path.map(({ r, c }) => [gridX + c * cell + cell / 2, gridY + r * cell + cell / 2]);
      this.pathLayer.addChild(drawPath(points, PALETTE[col], cell * 0.34));
    }

    // 活动中的路径
    if (this.activeColor !== null && this.activePath) {
      const col = this.activeColor;
      const points = this.activePath.map(({ r, c }) => [gridX + c * cell + cell / 2, gridY + r * cell + cell / 2]);
      this.pathLayer.addChild(drawPath(points, PALETTE[col], cell * 0.34));
      // 当前活动路径的末端小球（跟随）
      const last = this.activePath[this.activePath.length - 1];
      const tip = drawBall(PALETTE[col], cell * 0.22, { filled: true, alpha: 0.9 });
      tip.x = gridX + last.c * cell + cell / 2;
      tip.y = gridY + last.r * cell + cell / 2;
      this.pathLayer.addChild(tip);
    }

    // 刷新端点球（连接状态可能改变）
    this._renderEndpoints();
  }

  // ============ 计时 ============

  _startTimer() {
    this._timerCb = () => {
      if (this.won) return;
      this.elapsedMs = performance.now() - this.startTime;
      if (this.timerText) {
        this.timerText.text = `⏱ ${formatTime(this.elapsedMs / 1000)}`;
      }
    };
    this.app.ticker.add(this._timerCb);
  }

  _stopTimer() {
    if (this._timerCb) {
      this.app.ticker.remove(this._timerCb);
      this._timerCb = null;
    }
  }

  // ============ 胜负 ============

  _onWin() {
    if (this.won) return;
    this.won = true;
    this._stopTimer();
    Sound.win();

    const tSec = this.elapsedMs / 1000;
    // 星级：完成即 1 星；快/少撤销可加星
    let stars = 1;
    if (tSec < 30) stars = 3;
    else if (tSec < 90) stars = 2;

    const prev = this.progress.bestStars[this.levelIndex] || 0;
    this.progress.bestStars[this.levelIndex] = Math.max(prev, stars);
    if (!this.progress.bestTime[this.levelIndex] || tSec < this.progress.bestTime[this.levelIndex]) {
      this.progress.bestTime[this.levelIndex] = tSec;
    }
    this.progress.unlocked = Math.max(this.progress.unlocked, this.levelIndex + 2);
    this.unlockedThrough = Math.max(this.unlockedThrough, this.progress.unlocked);
    saveProgress(this.progress);

    // 延迟显示胜利界面
    setTimeout(() => this._showWinOverlay(stars), 400);
  }

  _showWinOverlay(stars) {
    const ov = new PIXI.Container();
    const mask = new PIXI.Graphics();
    mask.beginFill(0x000000, 0.7);
    mask.drawRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    mask.endFill();
    ov.addChild(mask);

    const title = new PIXI.Text('通关!', {
      fontFamily: UI_FONT, fontSize: 44, fill: GOLD, fontWeight: '700',
    });
    title.anchor.set(0.5);
    title.x = GAME_WIDTH / 2; title.y = 190;
    ov.addChild(title);

    const starText = new PIXI.Text('★'.repeat(stars) + '☆'.repeat(3 - stars), {
      fontFamily: UI_FONT, fontSize: 42, fill: GOLD,
    });
    starText.anchor.set(0.5);
    starText.x = GAME_WIDTH / 2; starText.y = 252;
    ov.addChild(starText);

    const tSec = this.elapsedMs / 1000;
    const info = new PIXI.Text(`第 ${this.levelIndex + 1} 关 · ${formatTime(tSec)} · ${this.level.pairs.length} 条线`, {
      fontFamily: UI_FONT, fontSize: 14, fill: 0x8fa3c7,
    });
    info.anchor.set(0.5);
    info.x = GAME_WIDTH / 2; info.y = 305;
    ov.addChild(info);

    const hasNext = this.levelIndex + 1 < LEVELS.length;
    const btnX = (GAME_WIDTH - 160) / 2;

    if (hasNext) {
      const next = makeButton('下一关', 160, 44, () => {
        Sound.click();
        this.overlayLayer.removeChild(ov);
        ov.destroy({ children: true });
        this.startLevel(this.levelIndex + 1);
      }, { fill: 0x43a047, fontSize: 18 });
      next.x = btnX; next.y = 350;
      ov.addChild(next);
    }

    const retry = makeButton('再玩一次', 160, 38, () => {
      Sound.click();
      this.overlayLayer.removeChild(ov);
      ov.destroy({ children: true });
      this.startLevel(this.levelIndex);
    }, { fill: 0x2c3e50, fontSize: 16 });
    retry.x = btnX; retry.y = hasNext ? 406 : 350;
    ov.addChild(retry);

    const sel = makeButton('选关', 160, 38, () => {
      Sound.click();
      this.overlayLayer.removeChild(ov);
      ov.destroy({ children: true });
      this.showLevelSelect();
    }, DARKEN);
    sel.x = btnX; sel.y = hasNext ? 452 : 396;
    ov.addChild(sel);

    this.overlayLayer.addChild(ov);
  }
}
