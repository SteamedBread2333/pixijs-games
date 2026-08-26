// 方块风暴：原创连锁消除小游戏
// 核心：四色方块持续上升，点按相连同色方块引发连锁消除。
import * as PIXI from 'pixi.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../../config.js';
import { UI_FONT, makeButton, drawBackground } from '../../ui.js';

const COLS = 4;
const ROWS = 7;
const CELL = 54;
const GAP = 4;
const BOARD_W = COLS * CELL;
const BOARD_H = ROWS * CELL;
const BOARD_X = 30;
const BOARD_Y = 145;
const HIGH_SCORE_KEY = 'blockstorm-high-score';

const COLORS = [
  { fill: 0xff6b6b, glow: 0xffa7a7, label: '赤' },
  { fill: 0x5b8def, glow: 0x9bbdff, label: '蓝' },
  { fill: 0x4ecb8d, glow: 0x95efbd, label: '翠' },
  { fill: 0xf5be48, glow: 0xffe099, label: '金' },
  { fill: 0xb478eb, glow: 0xddb9ff, label: '紫' },
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getHighScore() {
  try {
    return Number(localStorage.getItem(HIGH_SCORE_KEY)) || 0;
  } catch {
    return 0;
  }
}

function saveHighScore(value) {
  try {
    localStorage.setItem(HIGH_SCORE_KEY, String(value));
  } catch {
    // localStorage 不可用时忽略
  }
}

function playTone(freq, duration = 0.08, volume = 0.08, type = 'sine') {
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    if (!playTone.ctx) playTone.ctx = new Audio();
    const ctx = playTone.ctx;
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  } catch {
    // 音效不影响游戏流程
  }
}

export class BlockStormGame {
  constructor(app) {
    this.app = app;
    this.layer = new PIXI.Container();
    this.highScore = getHighScore();
    app.stage.addChild(this.layer);
    this.showStartScreen();
  }

  destroy() {
    this.stopTicker();
    this.layer.destroy({ children: true });
  }

  clearScreen() {
    this.stopTicker();
    this.layer.removeChildren().forEach((child) => child.destroy({ children: true }));
  }

  stopTicker() {
    if (this.tickerCb) {
      this.app.ticker.remove(this.tickerCb);
      this.tickerCb = null;
    }
  }

  showStartScreen() {
    this.clearScreen();
    drawBackground(this.layer, GAME_WIDTH, GAME_HEIGHT);

    const back = makeButton('‹ 主页', 76, 32, () => {
      window.location.hash = '';
    }, { fill: 0x232b3d, fontSize: 14 });
    back.x = 16;
    back.y = 18;
    this.layer.addChild(back);

    this.drawStartArt();

    const title = new PIXI.Text('方块风暴', {
      fontFamily: UI_FONT,
      fontWeight: '700',
      fontSize: 42,
      fill: 0xffffff,
      stroke: 0x152137,
      strokeThickness: 6,
    });
    title.anchor.set(0.5);
    title.x = GAME_WIDTH / 2;
    title.y = 104;
    this.layer.addChild(title);

    const slogan = new PIXI.Text('连锁消除 · 别让方块越过警戒线', {
      fontFamily: UI_FONT,
      fontSize: 15,
      fill: 0x9eb5db,
    });
    slogan.anchor.set(0.5);
    slogan.x = GAME_WIDTH / 2;
    slogan.y = 143;
    this.layer.addChild(slogan);

    const howTo = new PIXI.Container();
    howTo.x = 38;
    howTo.y = 330;
    const panel = new PIXI.Graphics();
    panel.beginFill(0x1b2941, 0.94);
    panel.drawRoundedRect(0, 0, 324, 122, 18);
    panel.endFill();
    panel.lineStyle(1, 0xffffff, 0.12);
    panel.drawRoundedRect(0.5, 0.5, 323, 121, 18);
    howTo.addChild(panel);

    const howTitle = new PIXI.Text('玩法说明', {
      fontFamily: UI_FONT,
      fontWeight: '700',
      fontSize: 16,
      fill: 0xffffff,
    });
    howTitle.x = 18;
    howTitle.y = 14;
    howTo.addChild(howTitle);

    const howBody = new PIXI.Text('• 点按方块，消除与它相连的同色方块\n• 连得越多，得分越高；方块会持续上升\n• 三种一次性技能，留到关键时刻使用', {
      fontFamily: UI_FONT,
      fontSize: 13,
      fill: 0x9eb5db,
      lineHeight: 25,
    });
    howBody.x = 18;
    howBody.y = 42;
    howTo.addChild(howBody);
    this.layer.addChild(howTo);

    const high = new PIXI.Text(`最高分  ${String(this.highScore).padStart(5, '0')}`, {
      fontFamily: UI_FONT,
      fontWeight: '600',
      fontSize: 14,
      fill: 0xf5be48,
      letterSpacing: 1,
    });
    high.anchor.set(0.5);
    high.x = GAME_WIDTH / 2;
    high.y = 484;
    this.layer.addChild(high);

    const start = makeButton('开始风暴', 184, 48, () => {
      playTone(720, 0.08, 0.1, 'square');
      this.startGame();
    }, { fill: 0x5b8def, border: 0x9bbdff, fontSize: 19 });
    start.x = (GAME_WIDTH - 184) / 2;
    start.y = 522;
    this.layer.addChild(start);
  }

  drawStartArt() {
    const art = new PIXI.Container();
    art.x = GAME_WIDTH / 2 - 86;
    art.y = 185;
    const pattern = [
      [0, 0, 1], [1, 0, 1], [2, 0, 3], [3, 0, 2],
      [0, 1, 2], [1, 1, 3], [2, 1, 0], [3, 1, 1],
      [0, 2, 1], [1, 2, 1], [2, 2, 0], [3, 2, 3],
    ];
    pattern.forEach(([col, row, color]) => {
      const size = 38;
      const block = new PIXI.Graphics();
      block.beginFill(COLORS[color].fill);
      block.drawRoundedRect(col * 43, row * 43, size, size, 10);
      block.endFill();
      block.beginFill(0xffffff, 0.2);
      block.drawRoundedRect(col * 43 + 4, row * 43 + 4, size - 8, 7, 4);
      block.endFill();
      art.addChild(block);
    });
    this.layer.addChild(art);
  }

  startGame() {
    this.clearScreen();
    this.score = 0;
    this.combo = 0;
    this.rows = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    this.spawnElapsed = 0;
    this.spawnInterval = 2500;
    this.running = true;
    this.gameOver = false;
    this.toolState = { blast: 1, spectrum: 1, freeze: 1 };
    this.selectingSpectrum = false;
    this.frozenSpawns = 0;

    drawBackground(this.layer, GAME_WIDTH, GAME_HEIGHT);
    this.drawHeader();
    this.drawBoard();
    this.drawTools();
    this.addInitialRows();
    this.renderBoard();
    this.startTicker();
  }

  drawHeader() {
    const back = makeButton('‹ 退出', 70, 30, () => {
      this.running = false;
      this.showStartScreen();
    }, { fill: 0x232b3d, fontSize: 13 });
    back.x = 14;
    back.y = 14;
    this.layer.addChild(back);

    const title = new PIXI.Text('方块风暴', {
      fontFamily: UI_FONT,
      fontWeight: '700',
      fontSize: 20,
      fill: 0xffffff,
    });
    title.anchor.set(0.5);
    title.x = GAME_WIDTH / 2;
    title.y = 29;
    this.layer.addChild(title);

    this.scoreText = new PIXI.Text('00000', {
      fontFamily: UI_FONT,
      fontWeight: '700',
      fontSize: 28,
      fill: 0xf5be48,
      letterSpacing: 1,
    });
    this.scoreText.anchor.set(0.5);
    this.scoreText.x = GAME_WIDTH / 2;
    this.scoreText.y = 70;
    this.layer.addChild(this.scoreText);

    const scoreLabel = new PIXI.Text('得分', {
      fontFamily: UI_FONT,
      fontSize: 12,
      fill: 0x7f98c2,
      letterSpacing: 2,
    });
    scoreLabel.anchor.set(0.5);
    scoreLabel.x = GAME_WIDTH / 2;
    scoreLabel.y = 98;
    this.layer.addChild(scoreLabel);

    this.statusText = new PIXI.Text('下一波：2.5 秒', {
      fontFamily: UI_FONT,
      fontSize: 12,
      fill: 0x9eb5db,
    });
    this.statusText.anchor.set(0.5);
    this.statusText.x = GAME_WIDTH / 2;
    this.statusText.y = 119;
    this.layer.addChild(this.statusText);
  }

  drawBoard() {
    const panel = new PIXI.Graphics();
    panel.beginFill(0x121d31, 0.95);
    panel.drawRoundedRect(BOARD_X - 10, BOARD_Y - 10, BOARD_W + 20, BOARD_H + 20, 16);
    panel.endFill();
    panel.lineStyle(2, 0x345078, 0.9);
    panel.drawRoundedRect(BOARD_X - 10, BOARD_Y - 10, BOARD_W + 20, BOARD_H + 20, 16);
    this.layer.addChild(panel);

    // 顶部警戒线
    const warning = new PIXI.Graphics();
    warning.lineStyle(2, 0xff6b6b, 0.9);
    warning.moveTo(BOARD_X, BOARD_Y + CELL - 3);
    warning.lineTo(BOARD_X + BOARD_W, BOARD_Y + CELL - 3);
    this.layer.addChild(warning);

    const warningText = new PIXI.Text('警戒线', {
      fontFamily: UI_FONT,
      fontSize: 10,
      fill: 0xff9292,
    });
    warningText.anchor.set(0.5, 1);
    warningText.x = BOARD_X + BOARD_W / 2;
    warningText.y = BOARD_Y + CELL - 5;
    this.layer.addChild(warningText);

    const cells = new PIXI.Graphics();
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        cells.beginFill(0x0e1728, 0.82);
        cells.drawRoundedRect(
          BOARD_X + col * CELL + 2,
          BOARD_Y + row * CELL + 2,
          CELL - GAP,
          CELL - GAP,
          10
        );
        cells.endFill();
      }
    }
    this.layer.addChild(cells);

    this.blocksLayer = new PIXI.Container();
    this.layer.addChild(this.blocksLayer);
    this.effectsLayer = new PIXI.Container();
    this.layer.addChild(this.effectsLayer);

    // 固定的棋盘点击层：不随方块重绘而销毁，保证每次消除后仍可继续点按。
    // 采用统一命中判定，避免动态创建/销毁方块时丢失事件绑定。
    this.boardInput = new PIXI.Graphics();
    this.boardInput.beginFill(0x000000, 0.001);
    this.boardInput.drawRect(BOARD_X, BOARD_Y, BOARD_W, BOARD_H);
    this.boardInput.endFill();
    this.boardInput.eventMode = 'static';
    this.boardInput.cursor = 'pointer';
    this.boardInput.hitArea = new PIXI.Rectangle(BOARD_X, BOARD_Y, BOARD_W, BOARD_H);
    this.boardInput.on('pointertap', (event) => this.handleBoardTap(event));
    this.layer.addChild(this.boardInput);
  }

  handleBoardTap(event) {
    if (!this.running || this.gameOver) return;
    const x = event.global.x - BOARD_X;
    const y = event.global.y - BOARD_Y;
    const col = Math.floor(x / CELL);
    const row = Math.floor(y / CELL);
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return;
    this.selectBlock(row, col);
  }

  drawTools() {
    const panelX = 278;
    const info = new PIXI.Text('技能', {
      fontFamily: UI_FONT,
      fontWeight: '700',
      fontSize: 15,
      fill: 0xffffff,
    });
    info.anchor.set(0.5);
    info.x = panelX + 46;
    info.y = 164;
    this.layer.addChild(info);

    const sub = new PIXI.Text('每局各一次', {
      fontFamily: UI_FONT,
      fontSize: 10,
      fill: 0x7f98c2,
    });
    sub.anchor.set(0.5);
    sub.x = panelX + 46;
    sub.y = 184;
    this.layer.addChild(sub);

    this.toolButtons = {};
    const tools = [
      { id: 'blast', icon: '✦', name: '底层爆破', desc: '清除最底两行', color: 0xff6b6b },
      { id: 'spectrum', icon: '◉', name: '同色风暴', desc: '选择一种颜色', color: 0xb478eb },
      { id: 'freeze', icon: '❄', name: '时间冻结', desc: '暂停下一波', color: 0x5b8def },
    ];

    tools.forEach((tool, index) => {
      const button = this.createToolButton(tool);
      button.x = panelX;
      button.y = 205 + index * 106;
      this.layer.addChild(button);
      this.toolButtons[tool.id] = button;
    });
  }

  createToolButton(tool) {
    const c = new PIXI.Container();
    const bg = new PIXI.Graphics();
    bg.beginFill(0x1b2941, 0.95);
    bg.drawRoundedRect(0, 0, 106, 92, 14);
    bg.endFill();
    bg.lineStyle(1, tool.color, 0.55);
    bg.drawRoundedRect(0.5, 0.5, 105, 91, 14);
    c.addChild(bg);

    const iconBg = new PIXI.Graphics();
    iconBg.beginFill(tool.color, 0.18);
    iconBg.drawCircle(22, 24, 15);
    iconBg.endFill();
    c.addChild(iconBg);

    const icon = new PIXI.Text(tool.icon, {
      fontFamily: UI_FONT,
      fontWeight: '700',
      fontSize: 18,
      fill: tool.color,
    });
    icon.anchor.set(0.5);
    icon.x = 22;
    icon.y = 24;
    c.addChild(icon);

    const name = new PIXI.Text(tool.name, {
      fontFamily: UI_FONT,
      fontWeight: '700',
      fontSize: 12,
      fill: 0xffffff,
    });
    name.x = 43;
    name.y = 15;
    c.addChild(name);

    const desc = new PIXI.Text(tool.desc, {
      fontFamily: UI_FONT,
      fontSize: 10,
      fill: 0x91a7cc,
      wordWrap: true,
      wordWrapWidth: 84,
      lineHeight: 14,
    });
    desc.x = 12;
    desc.y = 50;
    c.addChild(desc);

    const count = new PIXI.Text('×1', {
      fontFamily: UI_FONT,
      fontWeight: '700',
      fontSize: 11,
      fill: tool.color,
    });
    count.anchor.set(1, 0);
    count.x = 94;
    count.y = 34;
    c.addChild(count);

    c.eventMode = 'static';
    c.cursor = 'pointer';
    c.hitArea = new PIXI.Rectangle(0, 0, 106, 92);
    c.on('pointertap', () => this.useTool(tool.id));
    c.toolBg = bg;
    c.countText = count;
    return c;
  }

  addInitialRows() {
    for (let row = ROWS - 3; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        this.rows[row][col] = Math.floor(Math.random() * 4);
      }
    }
  }

  startTicker() {
    this.tickerCb = () => {
      if (!this.running || this.gameOver) return;
      const elapsed = this.app.ticker.deltaMS || 16.67;
      this.spawnElapsed += elapsed;
      const left = Math.max(0, this.spawnInterval - this.spawnElapsed);
      if (this.statusText) {
        const suffix = this.selectingSpectrum ? '请选择一种颜色' : `下一波：${(left / 1000).toFixed(1)} 秒`;
        this.statusText.text = suffix;
      }
      if (this.spawnElapsed >= this.spawnInterval) {
        this.spawnElapsed = 0;
        this.riseBoard();
      }
    };
    this.app.ticker.add(this.tickerCb);
  }

  riseBoard() {
    if (this.frozenSpawns > 0) {
      this.frozenSpawns -= 1;
      this.showToast('时间冻结，下一波已拦截', 0x9bbdff);
      playTone(420, 0.12, 0.08, 'triangle');
      return;
    }

    if (this.rows[0].some((value) => value !== null)) {
      this.endGame();
      return;
    }

    this.rows.shift();
    this.rows.push(Array.from({ length: COLS }, () => Math.floor(Math.random() * COLORS.length)));
    this.combo = 0;
    this.spawnInterval = clamp(2500 - Math.floor(this.score / 150) * 70, 850, 2500);
    this.renderBoard();
    playTone(180, 0.05, 0.04, 'triangle');
  }

  renderBoard() {
    this.blocksLayer.removeChildren().forEach((child) => child.destroy({ children: true }));

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const colorId = this.rows[row][col];
        if (colorId === null) continue;
        const block = this.createBlock(colorId, row, col);
        block.x = BOARD_X + col * CELL + 2;
        block.y = BOARD_Y + row * CELL + 2;
        this.blocksLayer.addChild(block);
      }
    }
  }

  createBlock(colorId, row, col) {
    const color = COLORS[colorId];
    const block = new PIXI.Container();
    const size = CELL - GAP;
    const shadow = new PIXI.Graphics();
    shadow.beginFill(0x000000, 0.26);
    shadow.drawRoundedRect(2, 3, size - 2, size - 2, 10);
    shadow.endFill();
    block.addChild(shadow);

    const body = new PIXI.Graphics();
    body.beginFill(color.fill);
    body.drawRoundedRect(0, 0, size - 2, size - 2, 10);
    body.endFill();
    body.beginFill(0xffffff, 0.2);
    body.drawRoundedRect(5, 4, size - 12, 7, 4);
    body.endFill();
    body.lineStyle(1.5, 0xffffff, 0.24);
    body.drawRoundedRect(0.75, 0.75, size - 3.5, size - 3.5, 9);
    block.addChild(body);

    const mark = new PIXI.Text(color.label, {
      fontFamily: UI_FONT,
      fontWeight: '700',
      fontSize: 16,
      fill: 0xffffff,
      stroke: 0x172239,
      strokeThickness: 2,
    });
    mark.anchor.set(0.5);
    mark.x = (size - 2) / 2;
    mark.y = (size - 2) / 2;
    block.addChild(mark);

    block.eventMode = 'static';
    block.cursor = 'pointer';
    block.hitArea = new PIXI.Rectangle(0, 0, size, size);
    block.on('pointertap', () => this.selectBlock(row, col));
    return block;
  }

  selectBlock(row, col) {
    if (!this.running || this.gameOver) return;
    const color = this.rows[row][col];
    if (color === null) return;

    if (this.selectingSpectrum) {
      this.selectingSpectrum = false;
      const cells = [];
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (this.rows[r][c] === color) cells.push({ row: r, col: c });
        }
      }
      this.clearCells(cells, '同色风暴');
      return;
    }

    const group = this.findConnected(row, col, color);
    this.clearCells(group, group.length >= 4 ? '连锁消除' : '消除');
  }

  findConnected(startRow, startCol, color) {
    const result = [];
    const queue = [{ row: startRow, col: startCol }];
    const visited = new Set();

    while (queue.length) {
      const current = queue.shift();
      const key = `${current.row}:${current.col}`;
      if (visited.has(key)) continue;
      if (
        current.row < 0 || current.row >= ROWS ||
        current.col < 0 || current.col >= COLS ||
        this.rows[current.row][current.col] !== color
      ) continue;
      visited.add(key);
      result.push(current);
      queue.push(
        { row: current.row - 1, col: current.col },
        { row: current.row + 1, col: current.col },
        { row: current.row, col: current.col - 1 },
        { row: current.row, col: current.col + 1 }
      );
    }
    return result;
  }

  clearCells(cells, label) {
    if (!cells.length) return;
    cells.forEach(({ row, col }) => {
      this.rows[row][col] = null;
      this.spawnPop(BOARD_X + col * CELL + CELL / 2, BOARD_Y + row * CELL + CELL / 2);
    });
    this.collapseColumns();
    this.combo += 1;
    const gained = cells.length * cells.length * 8 + (this.combo - 1) * 12;
    this.score += gained;
    this.updateScore();
    this.renderBoard();
    this.showToast(`+${gained}  ${label}${cells.length >= 4 ? ` ×${cells.length}` : ''}`, COLORS[cells.length % COLORS.length].glow);
    playTone(400 + Math.min(cells.length, 8) * 65, 0.11, 0.11, 'square');
  }

  collapseColumns() {
    for (let col = 0; col < COLS; col++) {
      const values = [];
      for (let row = ROWS - 1; row >= 0; row--) {
        if (this.rows[row][col] !== null) values.push(this.rows[row][col]);
      }
      for (let row = 0; row < ROWS; row++) this.rows[row][col] = null;
      values.forEach((value, index) => {
        this.rows[ROWS - 1 - index][col] = value;
      });
    }
  }

  useTool(id) {
    if (!this.running || this.gameOver || !this.toolState[id]) return;

    if (id === 'blast') {
      const cells = [];
      for (let row = ROWS - 2; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          if (this.rows[row][col] !== null) cells.push({ row, col });
        }
      }
      if (!cells.length) return;
      this.toolState.blast = 0;
      this.updateTool('blast');
      this.clearCells(cells, '底层爆破');
      return;
    }

    if (id === 'spectrum') {
      this.toolState.spectrum = 0;
      this.updateTool('spectrum');
      this.selectingSpectrum = true;
      this.showToast('点按任意颜色，触发同色风暴', 0xddb9ff);
      playTone(620, 0.11, 0.1, 'sine');
      return;
    }

    if (id === 'freeze') {
      this.toolState.freeze = 0;
      this.updateTool('freeze');
      this.frozenSpawns += 1;
      this.showToast('冻结已部署：下一波方块不会上升', 0x9bbdff);
      playTone(330, 0.14, 0.1, 'triangle');
    }
  }

  updateTool(id) {
    const button = this.toolButtons[id];
    if (!button) return;
    button.alpha = 0.42;
    button.cursor = 'default';
    button.countText.text = '已用';
    button.countText.style.fill = 0x7890b5;
  }

  updateScore() {
    if (!this.scoreText) return;
    this.scoreText.text = String(this.score).padStart(5, '0');
  }

  showToast(text, color) {
    if (this.toast && this.toast.parent) {
      this.toast.parent.removeChild(this.toast);
      this.toast.destroy({ children: true });
    }
    const toast = new PIXI.Text(text, {
      fontFamily: UI_FONT,
      fontWeight: '700',
      fontSize: 14,
      fill: color,
      stroke: 0x0d1423,
      strokeThickness: 3,
    });
    toast.anchor.set(0.5);
    toast.x = BOARD_X + BOARD_W / 2;
    toast.y = BOARD_Y + BOARD_H + 30;
    this.effectsLayer.addChild(toast);
    this.toast = toast;
    let life = 60;
    const ticker = () => {
      life -= 1;
      // 旧的 toast 可能已经被新一轮 showToast 提前 destroy 掉，
      // 此时 ticker 必须自摘，否则访问 toast.y 会触发 null.position。
      if (!toast.parent) {
        this.app.ticker.remove(ticker);
        return;
      }
      toast.y -= 0.38;
      toast.alpha = Math.min(1, life / 20);
      if (life <= 0) {
        this.app.ticker.remove(ticker);
        if (toast.parent) toast.parent.removeChild(toast);
        toast.destroy();
        if (this.toast === toast) this.toast = null;
      }
    };
    this.app.ticker.add(ticker);
  }

  spawnPop(x, y) {
    const color = COLORS[Math.floor(Math.random() * COLORS.length)].glow;
    for (let i = 0; i < 5; i++) {
      const particle = new PIXI.Graphics();
      particle.beginFill(color);
      particle.drawCircle(0, 0, 2 + Math.random() * 2);
      particle.endFill();
      particle.x = x;
      particle.y = y;
      this.effectsLayer.addChild(particle);
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.7 + Math.random() * 1.8;
      let life = 24 + Math.random() * 15;
      const ticker = () => {
        life -= 1;
        // 同 showToast：粒子被外部销毁/重置后自摘 ticker，避免 null.position。
        if (!particle.parent) {
          this.app.ticker.remove(ticker);
          return;
        }
        particle.x += Math.cos(angle) * speed;
        particle.y += Math.sin(angle) * speed + (35 - life) * 0.018;
        particle.alpha = life / 39;
        if (life <= 0) {
          this.app.ticker.remove(ticker);
          if (particle.parent) particle.parent.removeChild(particle);
          particle.destroy();
        }
      };
      this.app.ticker.add(ticker);
    }
  }

  endGame() {
    this.running = false;
    this.gameOver = true;
    playTone(160, 0.35, 0.14, 'sawtooth');
    if (this.score > this.highScore) {
      this.highScore = this.score;
      saveHighScore(this.highScore);
    }
    this.showGameOver();
  }

  showGameOver() {
    const overlay = new PIXI.Container();
    const veil = new PIXI.Graphics();
    veil.beginFill(0x050a12, 0.78);
    veil.drawRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    veil.endFill();
    overlay.addChild(veil);

    const card = new PIXI.Graphics();
    card.beginFill(0x1b2941, 0.98);
    card.drawRoundedRect(34, 162, 332, 294, 24);
    card.endFill();
    card.lineStyle(2, 0x5b8def, 0.65);
    card.drawRoundedRect(35, 163, 330, 292, 23);
    overlay.addChild(card);

    const title = new PIXI.Text('风暴结束', {
      fontFamily: UI_FONT,
      fontWeight: '700',
      fontSize: 34,
      fill: 0xffffff,
    });
    title.anchor.set(0.5);
    title.x = GAME_WIDTH / 2;
    title.y = 210;
    overlay.addChild(title);

    const result = new PIXI.Text(String(this.score).padStart(5, '0'), {
      fontFamily: UI_FONT,
      fontWeight: '700',
      fontSize: 48,
      fill: 0xf5be48,
    });
    result.anchor.set(0.5);
    result.x = GAME_WIDTH / 2;
    result.y = 270;
    overlay.addChild(result);

    const label = new PIXI.Text(`本局得分 · 最高分 ${String(this.highScore).padStart(5, '0')}`, {
      fontFamily: UI_FONT,
      fontSize: 14,
      fill: 0x9eb5db,
    });
    label.anchor.set(0.5);
    label.x = GAME_WIDTH / 2;
    label.y = 318;
    overlay.addChild(label);

    const replay = makeButton('再来一局', 160, 44, () => {
      playTone(720, 0.08, 0.1, 'square');
      this.startGame();
    }, { fill: 0x5b8def, border: 0x9bbdff, fontSize: 17 });
    replay.x = (GAME_WIDTH - 160) / 2;
    replay.y = 354;
    overlay.addChild(replay);

    const home = makeButton('返回首页', 160, 36, () => {
      this.showStartScreen();
    }, { fill: 0x232b3d, fontSize: 14 });
    home.x = (GAME_WIDTH - 160) / 2;
    home.y = 410;
    overlay.addChild(home);

    this.layer.addChild(overlay);
  }
}
