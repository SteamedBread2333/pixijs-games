// 游戏注册表：新增游戏只需在此登记
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { Game as WatermelonGame } from './watermelon/Game.js';
import { SuperBlockGame } from './superblock/SuperBlockGame.js';
import { CursorQuestGame } from './cursorquest/CursorQuestGame.js';

export const GAMES = [
  {
    id: 'watermelon',
    name: '合成大西瓜',
    desc: '物理合成 · 冲击大西瓜',
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    background: '#fdf6e3',
    assets: [], // 新增图片/音频时在此登记，启动阶段会统一校验加载
    create: (app) => new WatermelonGame(app),
  },
  {
    id: 'superblock',
    name: '超级积木',
    desc: '旋转拼块 · 填满灯光棋盘',
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    background: '#10131c',
    assets: [], // 新增图片/音频时在此登记，启动阶段会统一校验加载
    create: (app) => new SuperBlockGame(app),
  },
  {
    id: 'cursorquest',
    name: '光标迷航',
    status: '开发中',
    desc: '藏起光标 · 收集核心 · 走出迷局',
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    background: '#101724',
    assets: [],
    create: (app) => new CursorQuestGame(app),
  },
];
