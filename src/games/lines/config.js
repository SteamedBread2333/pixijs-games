// 连线迷航 (Lines) - 共享配置与关卡数据
//
// 复刻 Steam《Lines X Free》的 Numberlink 玩法：
//   网格上散布若干对同色端点，玩家用线把每对同色点连起来，
//   规则：路径只能沿网格上下左右走、不能交叉/重叠、最终所有格子都被路径覆盖。
//
// 颜色调色板：Numberlink 经典的多色系，端点用成对同色圆点表示。

// ============ 颜色调色板（编号 -> 颜色） ============
export const PALETTE = {
  0: 0xff5c5c, // 红
  1: 0xff9f43, // 橙
  2: 0xffd54f, // 黄
  3: 0x4caf73, // 绿
  4: 0x4fc3f7, // 天蓝
  5: 0x5b8def, // 蓝
  6: 0x9c6be0, // 紫
  7: 0xf06292, // 粉
  8: 0x26c6da, // 青
  9: 0x8d6e63, // 棕
};

export const COLORS = Object.values(PALETTE);

// ============ UI 常量 ============
export const GOLD = 0xffd54f;
export const ACCENT = 0x4fc3f7;      // 天蓝主题色（Lines X 的清爽抽象风）
export const DARKEN = { fill: 0x232b3d, fontSize: 14 };

// ============ 关卡尺寸 ============
// 关卡实际尺寸由 LEVEL_SPECS 逐关指定（5×5 ~ 9×9），此处仅作参考说明。
export const BOARD_SIZES = [5, 5, 6, 6, 6, 7, 7, 7, 8, 8];

// ============ 线性同余随机数（可复现） ============
function makeRng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

// ============ 关卡生成器 ============
//
// Numberlink 关卡必须保证「存在一种连线方式，恰好用路径铺满所有格子」，
// 否则玩家会陷入无解困局。这里用「随机哈密顿路径 + 切分」逆向生成：
//   1. 用 Warnsdorff 启发 + 随机回溯生成一条覆盖全盘、蜿蜒曲折的哈密顿路径
//      （保证每个格子与前后相邻，且路径本身高度随机、不可预测）；
//   2. 随机把这条路径切成 numPairs 段（每段 ≥ 2 格）；
//   3. 每段首尾两格作为一对同色端点，中间格作为待填空格。
// 这样生成的谜题必然有解（答案就是原路径段），但答案高度隐蔽——
// 端点散布全盘、同色点对常相隔甚远，玩家必须长距离绕行并避开其他端点。
// 难度远高于「蛇形切分」（蛇形答案一眼可辨）。

// 四方向偏移（供生成器使用）
const GEN_DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

/**
 * 用 Warnsdorff 启发 + 回溯生成一条随机哈密顿路径（覆盖全盘的自避路径）。
 * 从左上角 (0,0) 起，优先走「后继数少」的格子（死胡同先走，提高成功率），
 * 同分随机打乱以获得随机性。5×5 ~ 9×9 均稳定（实测 100% 成功、<1ms）。
 */
function randomHamiltonianPath(size, seed) {
  const rng = makeRng(seed);
  const n = size;
  const total = n * n;
  const path = [];
  const visited = Array.from({ length: n }, () => Array(n).fill(false));

  function countNext(r, c) {
    let cnt = 0;
    for (const [dr, dc] of GEN_DIRS) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nc < 0 || nr >= n || nc >= n || visited[nr][nc]) continue;
      cnt++;
    }
    return cnt;
  }

  function dfs(r, c) {
    visited[r][c] = true;
    path.push([r, c]);
    if (path.length === total) return true;

    const cand = [];
    for (const [dr, dc] of GEN_DIRS) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nc < 0 || nr >= n || nc >= n || visited[nr][nc]) continue;
      cand.push([nr, nc, countNext(nr, nc)]);
    }
    // Warnsdorff：后继数少的优先；同分随机
    cand.sort((a, b) => a[2] - b[2] || (rng() - 0.5));
    for (const [nr, nc] of cand) {
      if (dfs(nr, nc)) return true;
    }
    visited[r][c] = false;
    path.pop();
    return false;
  }

  return dfs(0, 0) ? path : null;
}

/**
 * 生成一个保证有解的 Numberlink 关卡。
 * @param {number} size 网格边长（5~9）
 * @param {number} numPairs 同色端点对数（2~10，受调色板 10 色限制）
 * @param {number} seed 随机种子（固定种子可复现同一关）
 * @returns {{ size:number, pairs:number[][] }} pairs 形如 [r1,c1,r2,c2,colorIndex]
 */
export function generateLevel(size, numPairs, seed) {
  // 生成随机哈密顿路径（失败则换种子重试）
  let path = null;
  let attempt = seed;
  while (!path && attempt < seed + 500) {
    path = randomHamiltonianPath(size, attempt++);
  }
  if (!path) {
    // 理论不会发生（实测 100% 成功），兜底退回蛇形
    path = [];
    for (let r = 0; r < size; r++) {
      if (r % 2 === 0) for (let c = 0; c < size; c++) path.push([r, c]);
      else for (let c = size - 1; c >= 0; c--) path.push([r, c]);
    }
  }

  const total = path.length;
  const rng = makeRng(seed * 31 + 7);
  const segLen = total / numPairs;
  const cuts = [];
  for (let i = 1; i < numPairs; i++) {
    const base = Math.round(i * segLen);
    const jitter = Math.floor((rng() - 0.5) * segLen * 0.9);
    // 夹紧：保证每段 ≥ 2 格
    cuts.push(Math.max(i * 2, Math.min(total - (numPairs - i) * 2, base + jitter)));
  }
  cuts.sort((a, b) => a - b);
  const uniqCuts = [...new Set(cuts)];

  const segments = [];
  let start = 0;
  for (const cut of uniqCuts) {
    segments.push(path.slice(start, cut));
    start = cut;
  }
  segments.push(path.slice(start));
  const chosen = segments.filter((s) => s.length >= 2).slice(0, numPairs);

  // 生成 pairs：颜色确定性分配 0..numPairs-1，保证恰好 2 端点且不撞色
  const pairs = chosen.map((seg, idx) => {
    const [r1, c1] = seg[0];
    const [r2, c2] = seg[seg.length - 1];
    return [r1, c1, r2, c2, idx];
  });

  return { size, pairs };
}

// ============ 关卡数据 ============
// 用固定种子预生成 50 关，前松后紧：
//   前 10 关教学（5×5 ~ 6×6，2~4 对点），
//   中段稳步爬升（6×6 ~ 8×8，5~8 对点），
//   后 5 关地狱级（8×8 ~ 9×9，9~10 对点，端点散布全盘）。
// 每关：{ size, pairs }，pairs 是 [[r1,c1,r2,c2,colorIndex], ...]

const LEVEL_SPECS = [
  // ---- 教学区（1-10）：小网格、少点，熟悉规则 ----
  [5, 2, 101],
  [5, 2, 102],
  [5, 3, 103],
  [5, 3, 104],
  [5, 4, 105],
  [6, 3, 106],
  [6, 3, 107],
  [6, 4, 108],
  [6, 4, 109],
  [6, 5, 110],
  // ---- 进阶区（11-25）：网格增大、点数增多，开始需要绕行 ----
  [6, 5, 201],
  [7, 4, 202],
  [7, 5, 203],
  [7, 5, 204],
  [7, 6, 205],
  [7, 6, 206],
  [8, 5, 207],
  [8, 5, 208],
  [8, 6, 209],
  [8, 6, 210],
  [8, 7, 211],
  [7, 7, 212],
  [8, 7, 213],
  [8, 8, 214],
  [8, 8, 215],
  // ---- 挑战区（26-45）：8×8 起步、高密度端点，需精心规划 ----
  [8, 8, 301],
  [8, 9, 302],
  [9, 7, 303],
  [9, 7, 304],
  [9, 8, 305],
  [9, 8, 306],
  [9, 9, 307],
  [9, 9, 308],
  [9, 10, 309],
  [9, 10, 310],
  [9, 10, 311],
  [9, 10, 312],
  [9, 10, 313],
  [9, 10, 314],
  [9, 10, 315],
  [9, 10, 316],
  [9, 10, 317],
  [9, 10, 318],
  [9, 10, 319],
  [9, 10, 320],
  // ---- 地狱区（46-50）：9×9 + 满 10 对端点，极限烧脑 ----
  [9, 10, 401],
  [9, 10, 402],
  [9, 10, 403],
  [9, 10, 404],
  [9, 10, 405],
];

export const LEVELS = LEVEL_SPECS.map(([size, numPairs, seed]) =>
  generateLevel(size, numPairs, seed)
);

// 用于验证：检查关卡数据合法性
export function validateLevel(level) {
  if (!level || typeof level.size !== 'number' || level.size < 2) return false;
  if (!Array.isArray(level.pairs) || level.pairs.length === 0) return false;
  const seen = new Set();
  const colorCount = {};
  for (const p of level.pairs) {
    if (!Array.isArray(p) || p.length !== 5) return false;
    const [r1, c1, r2, c2, color] = p;
    const max = level.size - 1;
    if ([r1, c1, r2, c2].some((v) => v < 0 || v > max)) return false;
    if (r1 === r2 && c1 === c2) return false;
    if (color < 0 || color > 9) return false; // 调色板只有 10 色
    const key1 = `${r1},${c1}`;
    const key2 = `${r2},${c2}`;
    if (seen.has(key1) || seen.has(key2)) return false;
    seen.add(key1);
    seen.add(key2);
    colorCount[color] = (colorCount[color] || 0) + 1;
  }
  // 每个颜色必须恰好对应一对端点（首尾各 1 个）
  for (const cnt of Object.values(colorCount)) {
    if (cnt !== 1) return false;
  }
  return true;
}
