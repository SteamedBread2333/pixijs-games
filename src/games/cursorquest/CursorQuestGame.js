// 光标迷航 - 主控制器
//
// 负责：选角界面、选关界面、关卡玩法、暂停、胜负、保存进度、清理资源。

import * as PIXI from 'pixi.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../../config.js';
import { UI_FONT, makeButton, drawBackground } from '../../ui.js';
import {
  CELL, COLS, ROWS, GRID_X, GRID_Y,
  CHARACTERS, MOVE, CORE, LIVES, STARS, ASSIST,
  CHAPTERS, BACKGROUNDS, gridToPxX, gridToPxY,
  CORE_COLOR, CORE_HALO, EXIT_COLOR_LOCKED, EXIT_COLOR_OPEN, SHARD_COLOR,
} from './config.js';
import {
  CELL_KIND, overlapCells, sweepMove, isOnGoal, worldToGrid,
} from './collision.js';
import { createCharacter } from './characters.js';
import {
  HAZARD_KINDS, createHazardView, updateHazard, DAMAGE_HAZARDS,
  PUSH_HAZARDS, SLOW_HAZARDS, SLIP_HAZARDS, listAllHazardKinds,
} from './hazards.js';
import { LEVELS, validateLevel } from './levels.js';
import { getStory } from './story.js';
import { loadProgress, saveProgress } from './progress.js';
import { Sound } from './sound.js';

const DARKEN = { fill: 0x232b3d, fontSize: 14 };
const GOLD = 0xffd54f;
const LEVELS_PER_PAGE = 20;

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

// ============== 工具 ==============

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function makeRng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function distSq(ax, ay, bx, by) {
  const dx = ax - bx, dy = ay - by;
  return dx * dx + dy * dy;
}

// ============== 主类 ==============

export class CursorQuestGame {
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

    this._setupStage();
    this.showCharacterSelect();
    window.__cq = this; // DEBUG
  }

  destroy() {
    this._removeInputListeners();
    if (this._gameTicker) {
      this.app.ticker.remove(this._gameTicker, this);
      this._gameTicker = null;
    }
    if (this._hintTimer) {
      clearTimeout(this._hintTimer);
      this._hintTimer = null;
    }
    this.app.renderer.view.style.cursor = '';
    this.layer.destroy({ children: true });
  }

  _setupStage() {
    this.app.stage.eventMode = 'static';
    this.app.stage.hitArea = this.app.screen;
  }

  _setCursorHidden(hidden) {
    this.app.renderer.view.style.cursor = hidden ? 'none' : '';
  }

  _addInputListeners(onMove, onUp) {
    this._onMove = onMove;
    this._onUp = onUp;
    this.app.stage.on('pointermove', onMove);
    this.app.stage.on('pointerdown', onMove);
    this.app.stage.on('pointerup', onUp);
    this.app.stage.on('pointerupoutside', onUp);
  }

  _removeInputListeners() {
    if (this._onMove) this.app.stage.off('pointermove', this._onMove);
    if (this._onMove) this.app.stage.off('pointerdown', this._onMove);
    if (this._onUp) this.app.stage.off('pointerup', this._onUp);
    if (this._onUp) this.app.stage.off('pointerupoutside', this._onUp);
    this._onMove = null;
    this._onUp = null;
  }

  /** 清空当前画面。 */
  clearScreen() {
    this._removeInputListeners();
    this.layer.removeChildren().forEach((c) => c.destroy({ children: true }));
  }

  // ============== 选角 ==============

  showCharacterSelect() {
    this.clearScreen();
    this.mode = 'character';
    this._setCursorHidden(false);

    drawBackground(this.layer, GAME_WIDTH, GAME_HEIGHT);

    const back = makeButton('‹ 主页', 76, 32, () => {
      Sound.click();
      window.location.hash = '';
    }, DARKEN);
    back.x = 16; back.y = 18;
    this.layer.addChild(back);

    const title = new PIXI.Text('选择光标角色', {
      fontFamily: UI_FONT, fontSize: 30, fill: 0xffffff,
      fontWeight: '700',
    });
    title.anchor.set(0.5);
    title.x = GAME_WIDTH / 2;
    title.y = 76;
    this.layer.addChild(title);

    const ids = Object.keys(CHARACTERS);
    const cardW = 340, cardH = 130;
    const startY = 120;
    ids.forEach((id, i) => {
      const def = CHARACTERS[id];
      const card = new PIXI.Container();
      card.x = (GAME_WIDTH - cardW) / 2;
      card.y = startY + i * (cardH + 14);
      const bg = new PIXI.Graphics();
      bg.beginFill(0x1c2940, 0.94);
      bg.drawRoundedRect(0, 0, cardW, cardH, 16);
      bg.endFill();
      bg.lineStyle(1, 0xffffff, 0.12);
      bg.drawRoundedRect(0.5, 0.5, cardW - 1, cardH - 1, 16);
      card.addChild(bg);

      // 角色预览
      const charGfx = createCharacter(id);
      charGfx.x = 60; charGfx.y = cardH / 2;
      charGfx.scale.set(2.6);
      card.addChild(charGfx);

      const name = new PIXI.Text(def.name, {
        fontFamily: UI_FONT, fontSize: 22, fill: 0xffffff, fontWeight: '700',
      });
      name.x = 100; name.y = 24;
      card.addChild(name);

      const desc = new PIXI.Text(def.desc, {
        fontFamily: UI_FONT, fontSize: 14, fill: 0xa9bbdc,
      });
      desc.x = 100; desc.y = 58;
      card.addChild(desc);

      const stat = new PIXI.Text(
        `碰撞半径 ${def.radius}px · 核心吸附 ${Math.round(def.coreRange)}px`,
        { fontFamily: UI_FONT, fontSize: 12, fill: 0x6f86ad }
      );
      stat.x = 100; stat.y = 84;
      card.addChild(stat);

      if (this.progress.character === id) {
        const tag = new PIXI.Text('已选', {
          fontFamily: UI_FONT, fontSize: 12, fill: 0x22321e,
        });
        const tagBg = new PIXI.Graphics();
        tagBg.beginFill(GOLD);
        tagBg.drawRoundedRect(0, 0, 50, 22, 6);
        tagBg.endFill();
        tagBg.x = cardW - 70; tagBg.y = 12;
        card.addChild(tagBg);
        tag.anchor.set(0.5);
        tag.x = cardW - 45; tag.y = 23;
        card.addChild(tag);
      }

      // 透明命中层（避免子节点干扰事件）
      const hit = new PIXI.Graphics();
      hit.beginFill(0x000000, 0.01);
      hit.drawRect(0, 0, cardW, cardH);
      hit.endFill();
      hit.eventMode = 'static';
      hit.cursor = 'pointer';
      const chooseChar = () => {
        Sound.click();
        this.progress.character = id;
        saveProgress(this.progress);
        this.showCharacterSelect();
        setTimeout(() => this.showLevelSelect(), 220);
      };
      hit.on('pointerup', chooseChar);
      hit.on('pointertap', chooseChar);
      card.addChild(hit);

      this.layer.addChild(card);
    });

    const tip = new PIXI.Text('选择角色后自动进入选关', {
      fontFamily: UI_FONT, fontSize: 13, fill: 0x60779e,
    });
    tip.anchor.set(0.5);
    tip.x = GAME_WIDTH / 2; tip.y = GAME_HEIGHT - 28;
    this.layer.addChild(tip);
  }

  // ============== 选关 ==============

  showLevelSelect(page = this.levelPage ?? 0) {
    this.clearScreen();
    this.mode = 'select';
    this._setCursorHidden(false);

    const pageCount = Math.ceil(LEVELS.length / LEVELS_PER_PAGE);
    this.levelPage = clamp(page, 0, pageCount - 1);

    drawBackground(this.layer, GAME_WIDTH, GAME_HEIGHT);

    const back = makeButton('‹ 主页', 76, 32, () => {
      Sound.click();
      window.location.hash = '';
    }, DARKEN);
    back.x = 16; back.y = 18;
    this.layer.addChild(back);

    const charBtn = makeButton('角色', 60, 32, () => {
      Sound.click();
      this.showCharacterSelect();
    }, DARKEN);
    charBtn.x = GAME_WIDTH - 76; charBtn.y = 18;
    this.layer.addChild(charBtn);

    const title = new PIXI.Text('光标迷航', {
      fontFamily: UI_FONT, fontSize: 30, fill: 0xffffff, fontWeight: '700',
    });
    title.anchor.set(0.5);
    title.x = GAME_WIDTH / 2; title.y = 60;
    this.layer.addChild(title);

    const sub = new PIXI.Text(`${CHARACTERS[this.progress.character]?.name || '诺诺'} · 选关`, {
      fontFamily: UI_FONT, fontSize: 14, fill: 0x8fa3c7,
    });
    sub.anchor.set(0.5);
    sub.x = GAME_WIDTH / 2; sub.y = 88;
    this.layer.addChild(sub);

    const cols = 5;
    const size = 58;
    const gap = 12;
    const gridW = cols * size + (cols - 1) * gap;
    const startX = (GAME_WIDTH - gridW) / 2;
    const startY = 116;

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
      bg.lineStyle(1.5, unlocked ? 0x4a90d9 : 0x2a3242);
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
        const startLv = () => {
          Sound.click();
          this.startLevel(levelIndex);
        };
        hit.on('pointerup', startLv);
        hit.on('pointertap', startLv);
        btn.addChild(hit);
      }
      this.layer.addChild(btn);
    });

    if (this.levelPage > 0) {
      const prev = makeButton('‹ 上一页', 90, 32, () => {
        Sound.click();
        this.showLevelSelect(this.levelPage - 1);
      }, DARKEN);
      prev.x = 30; prev.y = GAME_HEIGHT - 56;
      this.layer.addChild(prev);
    }
    if (this.levelPage < pageCount - 1) {
      const next = makeButton('下一页 ›', 90, 32, () => {
        Sound.click();
        this.showLevelSelect(this.levelPage + 1);
      }, DARKEN);
      next.x = GAME_WIDTH - 120; next.y = GAME_HEIGHT - 56;
      this.layer.addChild(next);
    }

    const pageText = new PIXI.Text(`第 ${this.levelPage + 1} / ${pageCount} 页`, {
      fontFamily: UI_FONT, fontSize: 13, fill: 0x8fa3c7,
    });
    pageText.anchor.set(0.5);
    pageText.x = GAME_WIDTH / 2; pageText.y = GAME_HEIGHT - 24;
    this.layer.addChild(pageText);
  }

  // ============== 开始关卡 ==============

  startLevel(levelIndex) {
    this.clearScreen();
    this.mode = 'play';
    this.levelIndex = levelIndex;
    this.level = LEVELS[levelIndex];
    this.charId = this.progress.character || 'nuonuo';
    this.charDef = CHARACTERS[this.charId];

    // 隐藏光标
    this._setCursorHidden(true);

    // ---- 构造网格（用于碰撞） ----
    this.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      this.grid[y][x] = { kind: CELL_KIND.EMPTY };
    }
    for (const w of this.level.walls || []) {
      if (w.gx >= 0 && w.gx < COLS && w.gy >= 0 && w.gy < ROWS) {
        this.grid[w.gy][w.gx] = { kind: CELL_KIND.WALL };
      }
    }
    for (const h of this.level.hazards || []) {
      if (h.gx >= 0 && h.gx < COLS && h.gy >= 0 && h.gy < ROWS) {
        const wallKinds = new Set(['wall', 'move_wall', 'compress', 'door']);
        const spikeKinds = new Set(['spike', 'mine', 'blade', 'rail', 'turret', 'laser', 'track', 'tport']);
        const lavaKinds = new Set(['lava']);
        const thornKinds = new Set(['thorn']);
        let kind = CELL_KIND.SPIKE;
        if (wallKinds.has(h.kind)) kind = CELL_KIND.WALL;
        else if (lavaKinds.has(h.kind)) kind = CELL_KIND.LAVA;
        else if (thornKinds.has(h.kind)) kind = CELL_KIND.THORN;
        else if (spikeKinds.has(h.kind)) kind = CELL_KIND.SPIKE;
        else if (h.kind === 'mud') kind = CELL_KIND.MUD;
        else if (h.kind === 'ice') kind = CELL_KIND.ICE;
        else if (h.kind === 'conveyor' || h.kind === 'flow') kind = CELL_KIND.EMPTY;
        else kind = CELL_KIND.SPIKE;
        this.grid[h.gy][h.gx] = { kind, dir: h.dir };
      }
    }

    // 状态
    this.lives = LIVES;
    this.coresCollected = [false, false, false];
    this.collectedShards = 0;
    this.totalShards = (this.level.shards || []).length;
    this.startTime = performance.now();
    this.elapsedMs = 0;
    this.timeOver = false;
    this.won = false;
    this.paused = false;
    this.hit = false;             // 本局是否受伤
    this.shieldUsed = false;
    this.shieldActive = this.charId === 'nuonuo';  // 诺诺每关自带一次护盾
    this.consecutiveFails = (this.progress.fails?.[levelIndex] || 0);

    // 玩家位置：固定在地图上方正中央
    const sp = { gx: (COLS - 1) / 2, gy: 1 };
    this.playerX = GRID_X + COLS * CELL / 2;
    this.playerY = gridToPxY(sp.gy);
    // 检查点：起点
    this.checkpoint = { x: this.playerX, y: this.playerY, gx: sp.gx, gy: sp.gy };

    // 输入目标
    this.targetX = this.playerX;
    this.targetY = this.playerY;
    this.touchActive = false;
    this.frozen = false;
    this.activated = false;       // 鼠标移入待机区后激活

    // 出生待机区：鼠标在 ±SPAWN_RADIUS 内时角色不跟随
    this.spawnRadius = 44;

    // 渲染层
    this.bgLayer = new PIXI.Container();
    this.hazardLayer = new PIXI.Container();
    this.pathLayer = new PIXI.Container();
    this.entityLayer = new PIXI.Container();  // 核心/出口/碎片
    this.playerLayer = new PIXI.Container();
    this.uiLayer = new PIXI.Container();
    this.overlayLayer = new PIXI.Container();
    this.layer.addChild(this.bgLayer);
    this.layer.addChild(this.pathLayer);
    this.layer.addChild(this.hazardLayer);
    this.layer.addChild(this.entityLayer);
    this.layer.addChild(this.playerLayer);
    this.layer.addChild(this.uiLayer);
    this.layer.addChild(this.overlayLayer);

    // 出生提示：呼吸光环 + 文案（必须在 pathLayer 创建之后）
    this.spawnHint = new PIXI.Graphics();
    this.pathLayer.addChild(this.spawnHint);
    this.spawnText = new PIXI.Text('移动鼠标到角色处开始', {
      fontFamily: UI_FONT, fontSize: 12, fill: 0x9eb1d0,
    });
    this.spawnText.anchor.set(0.5);
    this.spawnText.x = this.playerX;
    this.spawnText.y = this.playerY - 26;
    this.pathLayer.addChild(this.spawnText);

    this._buildBackground();
    this._buildStaticScene();
    this._buildHazardViews();
    this._buildPlayer();
    this._buildHud();
    this._setupGameInput();

    // 剧情（如有）
    const story = getStory(levelIndex + 1);
    if (story) this._showStory(story);

    // 启用游戏 ticker（先清理旧 ticker，防止重复添加）
    if (this._gameTicker) {
      this.app.ticker.remove(this._gameTicker, this);
    }
    this._gameTicker = (dt) => this._gameUpdate(dt / 60);
    this.app.ticker.add(this._gameTicker, this);

    // 重置游玩进度中的失败计数
    if (this.progress.fails?.[levelIndex]) {
      this.progress.fails[levelIndex] = 0;
      saveProgress(this.progress);
    }
  }

  // ============== 场景构建 ==============

  _buildBackground() {
    const bg = BACKGROUNDS[this.level.background] || BACKGROUNDS[0];
    const g = new PIXI.Graphics();
    g.beginFill(bg.base);
    g.drawRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    g.endFill();
    this.bgLayer.addChild(g);

    // 装饰点
    const decor = new PIXI.Graphics();
    const rng = makeRng((this.levelIndex + 1) * 31);
    for (let i = 0; i < 50; i++) {
      const x = rng() * GAME_WIDTH;
      const y = rng() * GAME_HEIGHT;
      decor.beginFill(bg.decor, 0.1 + rng() * 0.18);
      decor.drawCircle(x, y, 0.6 + rng() * 1.6);
      decor.endFill();
    }
    this.bgLayer.addChild(decor);

    // 棋盘格底（弱线条）
    const grid = new PIXI.Graphics();
    grid.lineStyle(1, 0xffffff, 0.04);
    for (let x = 0; x <= COLS; x++) {
      grid.moveTo(GRID_X + x * CELL, GRID_Y);
      grid.lineTo(GRID_X + x * CELL, GRID_Y + ROWS * CELL);
    }
    for (let y = 0; y <= ROWS; y++) {
      grid.moveTo(GRID_X, GRID_Y + y * CELL);
      grid.lineTo(GRID_X + COLS * CELL, GRID_Y + y * CELL);
    }
    this.bgLayer.addChild(grid);
  }

  _buildStaticScene() {
    // 墙
    for (const w of this.level.walls || []) {
      const g = new PIXI.Graphics();
      g.beginFill(0x39425a);
      g.drawRect(GRID_X + w.gx * CELL, GRID_Y + w.gy * CELL, CELL, CELL);
      g.endFill();
      g.lineStyle(2, 0x1c2230);
      g.drawRect(GRID_X + w.gx * CELL + 0.5, GRID_Y + w.gy * CELL + 0.5, CELL - 1, CELL - 1);
      g.lineStyle(1, 0x1c2230, 0.5);
      g.moveTo(GRID_X + w.gx * CELL, GRID_Y + w.gy * CELL + CELL / 2);
      g.lineTo(GRID_X + w.gx * CELL + CELL, GRID_Y + w.gy * CELL + CELL / 2);
      g.moveTo(GRID_X + w.gx * CELL + CELL / 2, GRID_Y + w.gy * CELL);
      g.lineTo(GRID_X + w.gx * CELL + CELL / 2, GRID_Y + w.gy * CELL + CELL / 2);
      g.moveTo(GRID_X + w.gx * CELL + CELL / 4, GRID_Y + w.gy * CELL + CELL / 2);
      g.lineTo(GRID_X + w.gx * CELL + CELL / 4, GRID_Y + w.gy * CELL + CELL);
      g.moveTo(GRID_X + w.gx * CELL + CELL * 0.75, GRID_Y + w.gy * CELL + CELL / 2);
      g.lineTo(GRID_X + w.gx * CELL + CELL * 0.75, GRID_Y + w.gy * CELL + CELL);
      this.bgLayer.addChild(g);
    }

    // 出口
    const ex = this.level.exit;
    this.exitView = new PIXI.Container();
    this.exitView.x = GRID_X + ex.gx * CELL;
    this.exitView.y = GRID_Y + ex.gy * CELL;
    this.exitGfx = new PIXI.Graphics();
    this.exitView.addChild(this.exitGfx);
    this.entityLayer.addChild(this.exitView);
    this._drawExit(false);

    // 核心
    this.coreViews = this.level.cores.map((c, i) => {
      const v = new PIXI.Container();
      v.x = gridToPxX(c.gx);
      v.y = gridToPxY(c.gy);
      v.gfx = new PIXI.Graphics();
      v.addChild(v.gfx);
      v.angle = 0;
      v.index = i;
      this.entityLayer.addChild(v);
      this._drawCore(v, true);
      return v;
    });

    // 记忆碎片
    this.shardViews = (this.level.shards || []).map((s) => {
      const v = new PIXI.Container();
      v.x = gridToPxX(s.gx);
      v.y = gridToPxY(s.gy);
      v.gfx = new PIXI.Graphics();
      v.addChild(v.gfx);
      v.collected = false;
      this.entityLayer.addChild(v);
      this._drawShard(v);
      return v;
    });
  }

  _drawCore(v, _active) {
    const g = v.gfx;
    g.clear();
    g.beginFill(CORE_COLOR, 0.95);
    g.drawCircle(0, 0, CORE.radius);
    g.endFill();
    g.beginFill(CORE_HALO, 0.45);
    g.drawCircle(0, 0, CORE.radius + 6);
    g.endFill();
    g.lineStyle(1.5, 0xffffff, 0.6);
    g.drawCircle(0, 0, CORE.radius + 2);
  }

  _drawExit(open) {
    const g = this.exitGfx;
    g.clear();
    g.beginFill(open ? EXIT_COLOR_OPEN : EXIT_COLOR_LOCKED, 0.85);
    g.drawRect(4, 4, CELL - 8, CELL - 8);
    g.endFill();
    g.lineStyle(2, open ? 0x223a2a : 0x222a3a);
    g.drawRect(4, 4, CELL - 8, CELL - 8);
    g.beginFill(0xffffff, open ? 0.85 : 0.4);
    g.drawCircle(CELL / 2, CELL / 2, open ? 6 : 3);
    g.endFill();
  }

  _drawShard(v) {
    const g = v.gfx;
    g.clear();
    g.beginFill(SHARD_COLOR, 0.9);
    g.drawPolygon([0, -8, 6, 0, 0, 8, -6, 0]);
    g.endFill();
    g.lineStyle(1, 0xffffff, 0.6);
    g.drawPolygon([0, -8, 6, 0, 0, 8, -6, 0]);
  }

  _buildHazardViews() {
    this.hazardViews = (this.level.hazards || []).map((h) => {
      const v = createHazardView({ ...h, t: 0 });
      this.hazardLayer.addChild(v);
      return v;
    });
  }

  _buildPlayer() {
    this.player = createCharacter(this.charId);
    this.player.x = this.playerX;
    this.player.y = this.playerY;
    this.playerLayer.addChild(this.player);

    // 诺诺的护盾光环
    this.shieldAura = new PIXI.Graphics();
    this.playerLayer.addChild(this.shieldAura);
  }

  _buildHud() {
    // 顶部 HUD
    const topBg = new PIXI.Graphics();
    topBg.beginFill(0x101724, 0.92);
    topBg.drawRect(0, 0, GAME_WIDTH, GRID_Y);
    topBg.endFill();
    this.uiLayer.addChild(topBg);

    const back = makeButton('‹', 36, 28, () => {
      Sound.click();
      this._backToSelect();
    }, DARKEN);
    back.x = 8; back.y = 10;
    this.uiLayer.addChild(back);

    const levelLabel = new PIXI.Text(`第 ${this.levelIndex + 1} 关`, {
      fontFamily: UI_FONT, fontSize: 18, fill: 0xffffff, fontWeight: '700',
    });
    levelLabel.anchor.set(0.5);
    levelLabel.x = GAME_WIDTH / 2; levelLabel.y = 14;
    this.uiLayer.addChild(levelLabel);

    const charLabel = new PIXI.Text(this.charDef.name, {
      fontFamily: UI_FONT, fontSize: 11, fill: 0xa9bbdc,
    });
    charLabel.anchor.set(0.5);
    charLabel.x = GAME_WIDTH / 2; charLabel.y = 36;
    this.uiLayer.addChild(charLabel);

    const pauseBtn = makeButton('‖', 36, 28, () => this._togglePause(), DARKEN);
    pauseBtn.x = GAME_WIDTH - 44; pauseBtn.y = 10;
    this.uiLayer.addChild(pauseBtn);

    // 核心 / 生命 / 计时
    this.coreText = new PIXI.Text('● ● ●', {
      fontFamily: UI_FONT, fontSize: 14, fill: CORE_HALO,
    });
    this.coreText.anchor.set(1, 0);
    this.coreText.x = GAME_WIDTH - 56; this.coreText.y = 44;
    this.uiLayer.addChild(this.coreText);

    this.livesText = new PIXI.Text('♥ × 3', {
      fontFamily: UI_FONT, fontSize: 12, fill: 0xff8a80,
    });
    this.livesText.anchor.set(0, 0);
    this.livesText.x = 56; this.livesText.y = 44;
    this.uiLayer.addChild(this.livesText);

    this.timeText = new PIXI.Text('0.0s', {
      fontFamily: UI_FONT, fontSize: 12, fill: 0x9eb1d0,
    });
    this.timeText.anchor.set(0, 0);
    this.timeText.x = 110; this.timeText.y = 44;
    this.uiLayer.addChild(this.timeText);

    this.shardText = new PIXI.Text('', {
      fontFamily: UI_FONT, fontSize: 12, fill: SHARD_COLOR,
    });
    this.shardText.anchor.set(0, 0);
    this.shardText.x = 56; this.shardText.y = 12;
    this.uiLayer.addChild(this.shardText);

    // 提示：手机拖动
    this.hintText = new PIXI.Text('移动鼠标进入游戏区 · 收集 3 颗核心 · 走出入口', {
      fontFamily: UI_FONT, fontSize: 11, fill: 0x6f86ad,
    });
    this.hintText.anchor.set(0.5);
    this.hintText.x = GAME_WIDTH / 2; this.hintText.y = GAME_HEIGHT - 14;
    this.uiLayer.addChild(this.hintText);

    if (this.consecutiveFails >= ASSIST.triggerAfterFails) {
      this._showAssistHint();
    }
  }

  _setupGameInput() {
    const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    this.isTouch = isTouch;

    // 用于出生待机区判断：最近一次原始指针位置
    this._lastPointerX = this.playerX;
    this._lastPointerY = this.playerY;

    const onMove = (e) => {
      if (this.paused || this.won || this.frozen) return;
      const pos = e.global;
      this._lastPointerX = pos.x;
      this._lastPointerY = pos.y;
      // 出生待机区：鼠标先移动到角色附近，之后角色才开始跟随
      if (!this.activated) {
        const d = distSq(pos.x, pos.y, this.playerX, this.playerY);
        if (d <= this.spawnRadius * this.spawnRadius) {
          this.activated = true;
        } else {
          return;
        }
      }
      if (isTouch) {
        this.touchActive = true;
        this.targetX = clamp(pos.x, GRID_X + 4, GRID_X + COLS * CELL - 4);
        this.targetY = clamp(pos.y - MOVE.touchOffsetY, GRID_Y + 4, GRID_Y + ROWS * CELL - 4);
      } else {
        this.targetX = clamp(pos.x, GRID_X + 4, GRID_X + COLS * CELL - 4);
        this.targetY = clamp(pos.y, GRID_Y + 4, GRID_Y + ROWS * CELL - 4);
      }
    };
    const onUp = () => {
      if (isTouch && MOVE.pauseOnTouchUp) {
        this.touchActive = false;
      }
    };
    this._addInputListeners(onMove, onUp);
  }

  _togglePause() {
    if (this.won) return;
    this.paused = !this.paused;
    if (this.paused) this._showPauseOverlay();
    else this._hidePauseOverlay();
  }

  _showPauseOverlay() {
    if (this.pauseOverlay) return;
    const ov = new PIXI.Container();
    const mask = new PIXI.Graphics();
    mask.beginFill(0x000000, 0.7);
    mask.drawRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    mask.endFill();
    ov.addChild(mask);

    const t = new PIXI.Text('已暂停', {
      fontFamily: UI_FONT, fontSize: 40, fill: 0xffffff, fontWeight: '700',
    });
    t.anchor.set(0.5);
    t.x = GAME_WIDTH / 2; t.y = 220;
    ov.addChild(t);

    const cont = makeButton('继续', 140, 44, () => {
      Sound.click();
      this._togglePause();
    }, { fill: 0x43a047, fontSize: 18 });
    cont.x = (GAME_WIDTH - 140) / 2; cont.y = 290;
    ov.addChild(cont);

    const retry = makeButton('重试本关', 140, 40, () => {
      Sound.click();
      this._hidePauseOverlay();
      this.startLevel(this.levelIndex);
    }, { fill: 0x2c3e50, fontSize: 16 });
    retry.x = (GAME_WIDTH - 140) / 2; retry.y = 346;
    ov.addChild(retry);

    const sel = makeButton('选关', 140, 40, () => {
      Sound.click();
      this._hidePauseOverlay();
      this._backToSelect();
    }, DARKEN);
    sel.x = (GAME_WIDTH - 140) / 2; sel.y = 394;
    ov.addChild(sel);

    this.overlayLayer.addChild(ov);
    this.pauseOverlay = ov;
  }

  _hidePauseOverlay() {
    if (this.pauseOverlay) {
      this.overlayLayer.removeChild(this.pauseOverlay);
      this.pauseOverlay.destroy({ children: true });
      this.pauseOverlay = null;
    }
  }

  _showStory(story) {
    this.frozen = true;
    const ov = new PIXI.Container();
    const mask = new PIXI.Graphics();
    mask.beginFill(0x0a0f1a, 0.92);
    mask.drawRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    mask.endFill();
    ov.addChild(mask);

    const t = new PIXI.Text(story.title, {
      fontFamily: UI_FONT, fontSize: 24, fill: GOLD, fontWeight: '700',
    });
    t.anchor.set(0.5);
    t.x = GAME_WIDTH / 2; t.y = 200;
    ov.addChild(t);

    story.lines.forEach((line, i) => {
      const l = new PIXI.Text(line, {
        fontFamily: UI_FONT, fontSize: 16, fill: 0xe6eef9,
      });
      l.anchor.set(0.5);
      l.x = GAME_WIDTH / 2; l.y = 250 + i * 30;
      ov.addChild(l);
    });

    const btn = makeButton('继续', 140, 44, () => {
      Sound.click();
      this.overlayLayer.removeChild(ov);
      ov.destroy({ children: true });
      this.frozen = false;
    }, { fill: 0x43a047, fontSize: 18 });
    btn.x = (GAME_WIDTH - 140) / 2; btn.y = 380;
    ov.addChild(btn);

    this.overlayLayer.addChild(ov);
  }

  _showAssistHint() {
    if (this.assistHintShown) return;
    this.assistHintShown = true;
    this._hintTimer = setTimeout(() => {
      if (this.frozen || this.won) return;
      // 短暂显示安全路径
      const g = new PIXI.Graphics();
      const s = (this.level.safePath || []);
      g.lineStyle(3, 0x9ad0ff, 0.6);
      for (let i = 0; i < s.length - 1; i++) {
        g.moveTo(gridToPxX(s[i][0]), gridToPxY(s[i][1]));
        g.lineTo(gridToPxX(s[i + 1][0]), gridToPxY(s[i + 1][1]));
      }
      this.overlayLayer.addChild(g);
      setTimeout(() => {
        this.overlayLayer.removeChild(g);
        g.destroy();
      }, ASSIST.hintDurationMs);
    }, 200);
  }

  _backToSelect() {
    if (this._gameTicker) {
      this.app.ticker.remove(this._gameTicker, this);
      this._gameTicker = null;
    }
    this.hazardViews = [];
    this.coreViews = [];
    this.shardViews = [];
    this.showLevelSelect();
  }

  // ============== 主循环 ==============

  _gameUpdate(dt) {
    if (this.paused || this.frozen || this.won) {
      // 仍要更新机关动画
      this._updateHazardViews(dt);
      this._updateEntities(dt);
      return;
    }

    this.elapsedMs += dt * 1000;
    this._updateHazardViews(dt);
    this._updateEntities(dt);

    // 时间到
    if (this.level.timeLimit > 0 && this.elapsedMs / 1000 > this.level.timeLimit) {
      this.timeOver = true;
      this._onLose('时间到');
      return;
    }

    // 移动玩家
    this._movePlayer(dt);

    // 触屏抬起时：暂停（角色原地停留）
    if (this.isTouch && !this.touchActive) {
      // 不移动
    }

    // 检查核心 / 出口 / 碎片
    this._checkInteractions();

    // 检查机关伤害
    this._checkHazards(dt);

    // 同步玩家视觉
    this.player.x = this.playerX;
    this.player.y = this.playerY;
    this._renderShieldAura();

    // 更新 HUD
    this._updateHud();
  }

  _renderShieldAura() {
    const g = this.shieldAura;
    g.clear();
    if (!this.shieldActive) return;
    const t = this.elapsedMs / 1000;
    const alpha = 0.35 + Math.sin(t * 4) * 0.15;
    g.lineStyle(2, 0x88ccff, alpha);
    g.drawCircle(this.playerX, this.playerY, this.charDef.radius + 4);
    g.lineStyle(1, 0xffffff, alpha * 0.6);
    g.drawCircle(this.playerX, this.playerY, this.charDef.radius + 7);
  }

  _updateHazardViews(dt) {
    for (const v of this.hazardViews) {
      updateHazard(v, dt);
    }
  }

  _updateEntities(dt) {
    // 核心呼吸
    const t = this.elapsedMs / 1000;
    this.coreViews.forEach((v, i) => {
      if (this.coresCollected[i]) return;
      const s = 1 + Math.sin(t * 2.4 + i) * 0.06;
      v.scale.set(s);
      v.gfx.clear();
      this._drawCore(v, true);
    });
    // 碎片
    this.shardViews.forEach((v) => {
      if (v.collected) return;
      v.rotation = t * 1.4;
      v.y = gridToPxY(this.level.shards[v._idx || 0]?.gy || 0) + Math.sin(t * 3) * 1.5;
    });
    // 出口
    this._drawExit(this.coresCollected.every(Boolean));
  }

  _movePlayer(dt) {
    // 出生待机区：未激活时不跟随
    if (!this.activated) {
      this.playerX = this.checkpoint.x;
      this.playerY = this.checkpoint.y;
      return;
    }
    let dx = this.targetX - this.playerX;
    let dy = this.targetY - this.playerY;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.5) return;

    // 计算单帧最大速度
    let speed = 240;  // px/s
    // 泥地 / 冰面 体感：玩家所在格减速
    const [pgx, pgy] = worldToGrid(this.playerX, this.playerY);
    if (pgx >= 0 && pgy >= 0 && pgx < COLS && pgy < ROWS) {
      const here = (this.level.hazards || []).find((h) => h.gx === pgx && h.gy === pgy);
      if (here) {
        if (here.kind === 'mud') speed *= 0.4;          // 泥地：明显减速
        else if (here.kind === 'ice') speed *= 1.25;    // 冰面：滑动加速
      }
    }
    const step = Math.min(dist, speed * dt);
    let vx = (dx / dist) * step;
    let vy = (dy / dist) * step;

    // 推动（传送带 / 水流）
    let pushX = 0, pushY = 0;
    const [gx, gy] = worldToGrid(this.playerX, this.playerY);
    if (gx >= 0 && gy >= 0 && gx < COLS && gy < ROWS) {
      const here = (this.level.hazards || []).find((h) => h.gx === gx && h.gy === gy);
      if (here && PUSH_HAZARDS.has(here.kind)) {
        const d = here.dir ?? 0;
        if (d === 0) pushX += 60 * dt;
        if (d === 1) pushX -= 60 * dt;
        if (d === 2) pushY += 60 * dt;
        if (d === 3) pushY -= 60 * dt;
      }
    }
    vx += pushX; vy += pushY;

    // 扫掠碰撞
    const result = sweepMove(this.playerX, this.playerY, vx, vy, this.charDef.radius, this.grid, MOVE.maxStepPx);
    this.playerX = result.x;
    this.playerY = result.y;
    this.blockedCell = result.blockedBy;
  }

  _checkInteractions() {
    // 核心吸附：玩家在范围内时被拉向最近未收集核心
    for (let i = 0; i < this.coreViews.length; i++) {
      if (this.coresCollected[i]) continue;
      const v = this.coreViews[i];
      const range = this.charDef.coreRange;
      const dsq = distSq(this.playerX, this.playerY, v.x, v.y);
      if (dsq < range * range) {
        // 拉近（最多拉到不重叠）
        const d = Math.sqrt(dsq);
        if (d > 0 && d > this.charDef.radius + 4) {
          const pull = Math.min((d - this.charDef.radius - 4), 90 / 60);
          this.playerX += (v.x - this.playerX) / d * pull;
          this.playerY += (v.y - this.playerY) / d * pull;
        }
        if (d < this.charDef.radius + 14) {
          this.coresCollected[i] = true;
          Sound.core();
          this._spawnFloatText('+核心', v.x, v.y - 16, 0xffd35c);
        }
      }
    }

    // 出口
    if (this.coresCollected.every(Boolean)) {
      const ex = this.level.exit;
      const exC = { x: gridToPxX(ex.gx), y: gridToPxY(ex.gy) };
      if (isOnGoal(this.playerX, this.playerY, this.charDef.radius, { gx: ex.gx, gy: ex.gy })) {
        this._onWin();
      }
    }

    // 碎片
    this.shardViews.forEach((v, i) => {
      if (v.collected) return;
      v._idx = i;
      if (distSq(this.playerX, this.playerY, v.x, v.y) < 14 * 14) {
        v.collected = true;
        v.visible = false;
        this.collectedShards += 1;
        Sound.shard();
        this._spawnFloatText('+碎片', v.x, v.y - 12, SHARD_COLOR);
      }
    });
  }

  _checkHazards(dt) {
    // 当前所在格
    const [gx, gy] = worldToGrid(this.playerX, this.playerY);
    if (gx < 0 || gy < 0 || gx >= COLS || gy >= ROWS) return;

    // 使用圆形接触范围检测软机关，避免角色碰到机关边缘却未进入格心时漏判。
    // 动画状态取 hazard view 中的运行时数据（例如激光的 on/off）。
    const contacts = overlapCells(this.playerX, this.playerY, this.charDef.radius, this.grid);
    if (this.blockedCell) contacts.push(this.blockedCell);
    this.blockedCell = null;

    for (const contact of contacts) {
      const hazard = this.hazardViews
        .map((view) => view.hazard)
        .find((h) => h.gx === contact.gx && h.gy === contact.gy);
      if (!hazard || !DAMAGE_HAZARDS.has(hazard.kind)) continue;
      if (hazard.kind === 'laser' && !hazard.on) continue;
      this._takeDamage(hazard);
      return;
    }

    // 减速 / 打滑提示
    const here = (this.level.hazards || []).find((h) => h.gx === gx && h.gy === gy);
    if (here && SLOW_HAZARDS.has(here.kind)) {
      // 用 _movePlayer 中的速度已自然变慢；这里只触发一次性音效
    }
  }

  _takeDamage(hazard) {
    if (this.shieldActive) {
      this.shieldActive = false;
      Sound.shield();
      this._spawnFloatText('护盾抵消', this.playerX, this.playerY - 18, 0x88ccff);
      this.playerX = this.checkpoint.x;
      this.playerY = this.checkpoint.y;
      this.targetX = this.checkpoint.x;
      this.targetY = this.checkpoint.y;
      return;
    }
    this.hit = true;
    this.lives -= 1;
    Sound.hit();
    this._spawnFloatText('-1', this.playerX, this.playerY - 18, 0xff5252);
    if (this.lives <= 0) {
      this._onLose('生命耗尽');
      return;
    }
    // 回到检查点
    this.playerX = this.checkpoint.x;
    this.playerY = this.checkpoint.y;
    this.targetX = this.checkpoint.x;
    this.targetY = this.checkpoint.y;
  }

  _spawnFloatText(text, x, y, color) {
    const t = new PIXI.Text(text, {
      fontFamily: UI_FONT, fontSize: 14, fill: color, fontWeight: '700',
      stroke: 0x000000, strokeThickness: 2,
    });
    t.anchor.set(0.5);
    t.x = x; t.y = y;
    this.overlayLayer.addChild(t);
    let a = 1;
    let vy = -1.2;
    const tick = () => {
      a -= 0.025;
      vy -= 0.04;
      t.alpha = a;
      t.y += vy;
      if (a <= 0) {
        this.overlayLayer.removeChild(t);
        t.destroy();
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  _updateHud() {
    const cores = this.coresCollected.map((c) => c ? '●' : '○').join(' ');
    this.coreText.text = cores;
    this.coreText.style.fill = this.coresCollected.every(Boolean) ? EXIT_COLOR_OPEN : CORE_HALO;
    this.livesText.text = `♥ × ${Math.max(0, this.lives)}`;
    const tSec = this.elapsedMs / 1000;
    this.timeText.text = this.level.timeLimit > 0
      ? `${tSec.toFixed(1)} / ${this.level.timeLimit}s`
      : `${tSec.toFixed(1)}s`;
    if (this.totalShards > 0) {
      this.shardText.text = `碎片 ${this.collectedShards}/${this.totalShards}`;
    } else {
      this.shardText.text = '';
    }
    this._renderSpawnHint();
  }

  /** 出生待机区呼吸环 + 提示文字淡入淡出 */
  _renderSpawnHint() {
    if (!this.spawnHint) return;
    const g = this.spawnHint;
    g.clear();
    if (this.activated) {
      this.spawnText.alpha = Math.max(0, this.spawnText.alpha - 0.08);
      if (this.spawnText.alpha <= 0.02) this.spawnText.visible = false;
      return;
    }
    const t = this.elapsedMs / 1000;
    const pulse = 0.45 + Math.sin(t * 3) * 0.2;
    g.lineStyle(1.5, 0x9ad0ff, pulse);
    g.drawCircle(this.playerX, this.playerY, this.spawnRadius);
    g.lineStyle(1, 0xffffff, pulse * 0.4);
    g.drawCircle(this.playerX, this.playerY, this.spawnRadius + 4);
    // 箭头向下，提示"开始方向"
    g.lineStyle(2, 0x9ad0ff, 0.7);
    g.moveTo(this.playerX, this.playerY + this.spawnRadius + 4);
    g.lineTo(this.playerX, this.playerY + this.spawnRadius + 12);
    g.moveTo(this.playerX - 4, this.playerY + this.spawnRadius + 8);
    g.lineTo(this.playerX, this.playerY + this.spawnRadius + 12);
    g.lineTo(this.playerX + 4, this.playerY + this.spawnRadius + 8);
    this.spawnText.visible = true;
    this.spawnText.alpha = 0.6 + Math.sin(t * 3) * 0.3;
  }

  // ============== 胜负 ==============

  _onWin() {
    if (this.won) return;
    this.won = true;
    this.paused = true;
    Sound.exit();
    setTimeout(() => Sound.win(), 200);

    // 计算星级
    let stars = 1;
    const tSec = this.elapsedMs / 1000;
    if (!this.hit) stars += 1;
    if (this.totalShards > 0 && this.collectedShards >= this.totalShards) stars += 1;
    stars = clamp(stars, 1, 3);

    // 存档
    const prev = this.progress.bestStars[this.levelIndex] || 0;
    this.progress.bestStars[this.levelIndex] = Math.max(prev, stars);
    if (!this.progress.bestTime[this.levelIndex] || tSec < this.progress.bestTime[this.levelIndex]) {
      this.progress.bestTime[this.levelIndex] = tSec;
    }
    this.progress.unlocked = Math.max(this.progress.unlocked, this.levelIndex + 2);
    this.unlockedThrough = Math.max(this.unlockedThrough, this.progress.unlocked);
    saveProgress(this.progress);

    setTimeout(() => this._showWinOverlay(stars), 350);
  }

  _onLose(reason) {
    if (this.won) return;
    this.won = true;
    this.paused = true;
    // 记录连续失败
    this.progress.fails = this.progress.fails || {};
    this.progress.fails[this.levelIndex] = (this.progress.fails[this.levelIndex] || 0) + 1;
    saveProgress(this.progress);

    const ov = new PIXI.Container();
    const mask = new PIXI.Graphics();
    mask.beginFill(0x000000, 0.7);
    mask.drawRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    mask.endFill();
    ov.addChild(mask);

    const title = new PIXI.Text(reason || '失败', {
      fontFamily: UI_FONT, fontSize: 36, fill: 0xff5252, fontWeight: '700',
    });
    title.anchor.set(0.5);
    title.x = GAME_WIDTH / 2; title.y = 200;
    ov.addChild(title);

    const retry = makeButton('快速重试', 160, 44, () => {
      Sound.click();
      this.overlayLayer.removeChild(ov);
      ov.destroy({ children: true });
      this.won = false;
      this.paused = false;
      this.startLevel(this.levelIndex);
    }, { fill: 0x43a047, fontSize: 18 });
    retry.x = (GAME_WIDTH - 160) / 2; retry.y = 280;
    ov.addChild(retry);

    const sel = makeButton('返回选关', 160, 40, () => {
      Sound.click();
      this.overlayLayer.removeChild(ov);
      ov.destroy({ children: true });
      this._backToSelect();
    }, DARKEN);
    sel.x = (GAME_WIDTH - 160) / 2; sel.y = 340;
    ov.addChild(sel);

    this.overlayLayer.addChild(ov);
  }

  _showWinOverlay(stars) {
    const ov = new PIXI.Container();
    const mask = new PIXI.Graphics();
    mask.beginFill(0x000000, 0.65);
    mask.drawRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    mask.endFill();
    ov.addChild(mask);

    const title = new PIXI.Text('通关!', {
      fontFamily: UI_FONT, fontSize: 44, fill: GOLD, fontWeight: '700',
    });
    title.anchor.set(0.5);
    title.x = GAME_WIDTH / 2; title.y = 200;
    ov.addChild(title);

    const starText = new PIXI.Text('★'.repeat(stars) + '☆'.repeat(3 - stars), {
      fontFamily: UI_FONT, fontSize: 40, fill: GOLD,
    });
    starText.anchor.set(0.5);
    starText.x = GAME_WIDTH / 2; starText.y = 260;
    ov.addChild(starText);

    const tSec = this.elapsedMs / 1000;
    const info = new PIXI.Text(
      `第 ${this.levelIndex + 1} 关 · ${tSec.toFixed(1)}s${this.hit ? ' · 受伤' : ''}${this.collectedShards > 0 ? ` · 碎片 ${this.collectedShards}/${this.totalShards}` : ''}`,
      { fontFamily: UI_FONT, fontSize: 14, fill: 0x8fa3c7 }
    );
    info.anchor.set(0.5);
    info.x = GAME_WIDTH / 2; info.y = 310;
    ov.addChild(info);

    const hasNext = this.levelIndex + 1 < LEVELS.length;
    if (hasNext) {
      const next = makeButton('下一关', 160, 44, () => {
        Sound.click();
        this.overlayLayer.removeChild(ov);
        ov.destroy({ children: true });
        this.won = false;
        this.paused = false;
        this.startLevel(this.levelIndex + 1);
      }, { fill: 0x43a047, fontSize: 18 });
      next.x = (GAME_WIDTH - 160) / 2; next.y = 360;
      ov.addChild(next);
    }

    const retry = makeButton('再玩一次', 160, 38, () => {
      Sound.click();
      this.overlayLayer.removeChild(ov);
      ov.destroy({ children: true });
      this.won = false;
      this.paused = false;
      this.startLevel(this.levelIndex);
    }, { fill: 0x2c3e50, fontSize: 16 });
    retry.y = hasNext ? 416 : 360;
    retry.x = (GAME_WIDTH - 160) / 2;
    ov.addChild(retry);

    const sel = makeButton('选关', 160, 38, () => {
      Sound.click();
      this.overlayLayer.removeChild(ov);
      ov.destroy({ children: true });
      this._backToSelect();
    }, DARKEN);
    sel.y = hasNext ? 462 : 406;
    sel.x = (GAME_WIDTH - 160) / 2;
    ov.addChild(sel);

    this.overlayLayer.addChild(ov);
  }
}
