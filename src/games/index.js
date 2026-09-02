// 游戏注册表：新增游戏只需在此登记
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { Game as WatermelonGame } from './watermelon/Game.js';
import { SuperBlockGame } from './superblock/SuperBlockGame.js';
import { CursorQuestGame } from './cursorquest/CursorQuestGame.js';
import { KlotskiGame } from './klotski/KlotskiGame.js';
import { BlockStormGame } from './blockstorm/BlockStormGame.js';
import { LinesGame } from './lines/LinesGame.js';

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
  {
    id: 'klotski',
    name: '华容道',
    desc: '经典+数字 · 双模式滑块解谜',
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    background: '#1a1520',
    assets: [],
    create: (app) => new KlotskiGame(app),
  },
  {
    id: 'blockstorm',
    name: '方块风暴',
    desc: '连锁消除 · 守住警戒线',
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    background: '#101724',
    assets: [],
    create: (app) => new BlockStormGame(app),
  },
  {
    id: 'lines',
    name: '连线迷航',
    desc: '连接同色点 · 铺满每一格',
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    background: '#101724',
    assets: [],
    create: (app) => new LinesGame(app),
  },
];
