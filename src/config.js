// 游戏全局配置

export const GAME_WIDTH = 400;
export const GAME_HEIGHT = 640;

// 容器（游戏区域）内边距
export const WALL_THICKNESS = 20;
export const CONTAINER_LEFT = 20;
export const CONTAINER_RIGHT = GAME_WIDTH - 20;
export const CONTAINER_BOTTOM = GAME_HEIGHT - 20;

// 危险线：水果堆积超过此线则游戏结束
export const DANGER_LINE = 130;
// 水果投放的初始 Y 坐标
export const DROP_Y = 80;

// 水果等级定义（从小到大），radius 为物理半径，color 为填充色
export const FRUITS = [
  { name: '葡萄',     radius: 16,  color: 0x9b59b6, emoji: '🍇', score: 1 },
  { name: '樱桃',     radius: 22,  color: 0xe74c3c, emoji: '🍒', score: 2 },
  { name: '橘子',     radius: 28,  color: 0xf39c12, emoji: '🍊', score: 4 },
  { name: '柠檬',     radius: 34,  color: 0xf1c40f, emoji: '🍋', score: 8 },
  { name: '猕猴桃',   radius: 40,  color: 0x7cb342, emoji: '🥝', score: 16 },
  { name: '番茄',     radius: 46,  color: 0xff6347, emoji: '🍅', score: 32 },
  { name: '桃子',     radius: 52,  color: 0xff9eaa, emoji: '🍑', score: 64 },
  { name: '菠萝',     radius: 58,  color: 0xffca28, emoji: '🍍', score: 128 },
  { name: '椰子',     radius: 64,  color: 0xd7ccc8, emoji: '🥥', score: 256 },
  { name: '甜瓜',     radius: 70,  color: 0xaed581, emoji: '🍈', score: 512 },
  { name: '西瓜',     radius: 80,  color: 0x2ecc71, emoji: '🍉', score: 1024 },
];

// 可随机投放的水果等级范围（前 5 级）
export const RANDOM_FRUIT_MAX_LEVEL = 4;

// 物理引擎参数
export const PHYSICS = {
  gravity: { x: 0, y: 1.2 },
  restitution: 0.2,   // 弹性
  friction: 0.6,      // 摩擦
  frictionAir: 0.008, // 空气阻力
  density: 0.001,     // 密度
};

// ---------- 道具系统 ----------
// 每获得 SCORE_PER_ITEM 分奖励 1 个道具能量
export const SCORE_PER_ITEM = 200;
// 道具持有上限
export const ITEM_MAX_COUNT = 3;

export const ITEMS = {
  bomb:   { name: '炸弹', emoji: '💣', desc: '点击后移除一个水果' },
  shake:  { name: '震动', emoji: '🫨', desc: '晃动容器重新排列水果' },
  evolve: { name: '进化', emoji: '✨', desc: '下一个水果提升一级' },
};

// ---------- 连击系统 ----------
// 连击窗口时间（毫秒）：窗口内的连续合成会提升倍率
export const COMBO_WINDOW_MS = 2000;
// 连击倍率上限
export const COMBO_MAX_MULTIPLIER = 5;

// 最高分存储 key
export const BEST_SCORE_KEY = 'hecheng-daxigua-best';
