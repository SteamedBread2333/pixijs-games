// 超级积木关卡数据
// 设计方式：每关先给出各积木的"解法摆放"(at)，所有积木的并集即为本关亮灯目标。
// 因此只要积木互不重叠、不越界，关卡必然有解。
// cells 为相对坐标 [dx, dy]，at 为解法锚点 [x, y]（左上）。

// 积木颜色：红 / 蓝 / 黄 / 绿
export const COLORS = [0xe74c3c, 0x4a90d9, 0xf1c40f, 0x2ecc71];

const HANDCRAFTED_LEVELS = [
  // ---- 1 ----
  {
    pieces: [
      { color: 0, cells: [[0, 0], [1, 0]], at: [3, 3] },
      { color: 1, cells: [[0, 0], [0, 1], [1, 1]], at: [3, 4] },
    ],
  },
  // ---- 2 ----
  {
    pieces: [
      { color: 0, cells: [[0, 0], [1, 0], [2, 0]], at: [3, 3] },
      { color: 2, cells: [[0, 0], [1, 0], [2, 0]], at: [3, 4] },
    ],
  },
  // ---- 3 ----
  {
    pieces: [
      { color: 0, cells: [[0, 0], [1, 0], [1, 1]], at: [3, 3] },
      { color: 1, cells: [[0, 0], [0, 1]], at: [3, 4] },
      { color: 2, cells: [[0, 0], [1, 0]], at: [4, 5] },
    ],
  },
  // ---- 4 ----
  {
    pieces: [
      { color: 0, cells: [[0, 0], [1, 0], [0, 1]], at: [2, 3] },
      { color: 1, cells: [[0, 0], [1, 0], [1, 1]], at: [4, 3] },
      { color: 2, cells: [[0, 0], [1, 0]], at: [3, 4] },
    ],
  },
  // ---- 5 ----
  {
    pieces: [
      { color: 0, cells: [[0, 0], [1, 0], [2, 0]], at: [3, 2] },
      { color: 1, cells: [[0, 0], [0, 1], [1, 1]], at: [3, 3] },
      { color: 2, cells: [[0, 0], [1, 0], [1, 1]], at: [4, 3] },
    ],
  },
  // ---- 6 ----
  {
    pieces: [
      { color: 0, cells: [[0, 0], [1, 0], [2, 0]], at: [2, 3] },
      { color: 1, cells: [[0, 0], [1, 0]], at: [5, 3] },
      { color: 2, cells: [[0, 0], [1, 0]], at: [2, 4] },
      { color: 3, cells: [[0, 0], [1, 0], [2, 0]], at: [4, 4] },
    ],
  },
  // ---- 7 ----
  {
    pieces: [
      { color: 0, cells: [[0, 0], [1, 0], [0, 1]], at: [3, 2] },
      { color: 1, cells: [[0, 0], [1, 0], [1, 1]], at: [4, 3] },
      { color: 2, cells: [[0, 0], [1, 0], [0, 1]], at: [3, 4] },
      { color: 3, cells: [[0, 0], [1, 0]], at: [4, 5] },
    ],
  },
  // ---- 8 ----
  {
    pieces: [
      { color: 0, cells: [[0, 0], [1, 0], [0, 1], [1, 1]], at: [3, 2] },
      { color: 1, cells: [[0, 0], [0, 1], [0, 2], [0, 3]], at: [5, 2] },
      { color: 2, cells: [[0, 0], [1, 0]], at: [3, 4] },
      { color: 3, cells: [[0, 0], [1, 0]], at: [3, 5] },
    ],
  },
  // ---- 9 ----
  {
    pieces: [
      { color: 0, cells: [[0, 0], [1, 0], [2, 0], [1, 1]], at: [2, 2] },
      { color: 1, cells: [[0, 0], [0, 1], [0, 2], [-1, 2]], at: [5, 2] },
      { color: 2, cells: [[0, 0], [1, 0], [0, 1], [1, 1]], at: [2, 4] },
      { color: 3, cells: [[0, 0], [1, 0], [2, 0]], at: [4, 5] },
    ],
  },
  // ---- 10 ----
  {
    pieces: [
      { color: 0, cells: [[0, 0], [1, 0], [2, 0], [1, 1]], at: [2, 2] },
      { color: 1, cells: [[0, 0], [1, 0], [0, 1], [1, 1]], at: [5, 2] },
      { color: 2, cells: [[0, 0], [0, 1], [0, 2]], at: [2, 4] },
      { color: 3, cells: [[0, 0], [1, 0], [2, 0], [2, 1]], at: [3, 4] },
      { color: 0, cells: [[0, 0], [1, 0]], at: [3, 6] },
    ],
  },
  // ---- 11 ----
  {
    pieces: [
      { color: 0, cells: [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]], at: [3, 3] },
      { color: 1, cells: [[0, 0], [0, 1], [0, 2], [1, 2]], at: [2, 3] },
      { color: 2, cells: [[0, 0], [1, 0], [2, 0]], at: [5, 5] },
      { color: 3, cells: [[0, 0], [0, 1]], at: [6, 3] },
    ],
  },
  // ---- 12 ----
  {
    pieces: [
      { color: 0, cells: [[0, 0], [1, 0], [2, 0], [3, 0]], at: [2, 2] },
      { color: 1, cells: [[1, 0], [2, 0], [0, 1], [1, 1]], at: [2, 3] },
      { color: 2, cells: [[0, 0], [1, 0], [2, 0], [0, 1]], at: [5, 3] },
      { color: 3, cells: [[0, 0], [0, 1], [0, 2]], at: [2, 5] },
      { color: 2, cells: [[0, 0], [1, 0], [2, 0], [1, 1]], at: [4, 5] },
    ],
  },
  // ---- 13 ----
  {
    pieces: [
      { color: 0, cells: [[0, 0], [2, 0], [0, 1], [1, 1], [2, 1]], at: [3, 2] },
      { color: 1, cells: [[0, 0], [0, 1], [0, 2]], at: [2, 2] },
      { color: 2, cells: [[0, 0], [1, 0], [1, 1], [2, 1]], at: [5, 4] },
      { color: 3, cells: [[0, 0], [0, 1], [1, 1]], at: [3, 4] },
      { color: 1, cells: [[0, 0], [1, 0]], at: [4, 6] },
    ],
  },
  // ---- 14 ----
  {
    pieces: [
      { color: 0, cells: [[0, 0], [1, 0], [2, 0], [1, 1]], at: [2, 3] },
      { color: 1, cells: [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]], at: [4, 3] },
      { color: 2, cells: [[0, 0], [0, 1], [0, 2], [0, 3]], at: [2, 4] },
      { color: 3, cells: [[0, 0], [1, 0], [2, 0], [2, 1]], at: [3, 6] },
      { color: 0, cells: [[0, 0], [1, 0]], at: [6, 5] },
    ],
  },
  // ---- 15 ----
  {
    pieces: [
      { color: 0, cells: [[0, 0], [1, 0], [0, 1], [1, 1]], at: [2, 2] },
      { color: 1, cells: [[0, 0], [1, 0], [2, 0], [3, 0]], at: [4, 2] },
      { color: 2, cells: [[1, 0], [2, 0], [0, 1], [1, 1]], at: [4, 3] },
      { color: 3, cells: [[0, 0], [0, 1], [0, 2], [1, 2]], at: [2, 4] },
      { color: 0, cells: [[0, 0], [1, 0], [2, 0], [1, 1]], at: [4, 5] },
      { color: 1, cells: [[0, 0], [0, 1]], at: [7, 3] },
    ],
  },
  // ---- 16 ----
  {
    pieces: [
      { color: 0, cells: [[0, 0], [1, 0], [1, 1], [2, 1]], at: [2, 2] },
      { color: 1, cells: [[0, 0], [1, 0], [2, 0], [1, 1]], at: [5, 3] },
      { color: 2, cells: [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]], at: [3, 4] },
      { color: 3, cells: [[0, 0], [1, 0], [0, 1]], at: [2, 6] },
      { color: 0, cells: [[0, 0], [0, 1]], at: [6, 5] },
      { color: 1, cells: [[0, 0], [0, 1]], at: [7, 4] },
    ],
  },
  // ---- 17 ----
  {
    pieces: [
      { color: 0, cells: [[0, 0], [0, 1], [0, 2], [0, 3]], at: [2, 2] },
      { color: 1, cells: [[1, 0], [2, 0], [0, 1], [1, 1]], at: [3, 2] },
      { color: 2, cells: [[0, 0], [2, 0], [0, 1], [1, 1], [2, 1]], at: [5, 3] },
      { color: 3, cells: [[0, 0], [1, 0], [2, 0], [1, 1]], at: [2, 6] },
      { color: 0, cells: [[0, 0], [1, 0], [1, 1]], at: [4, 5] },
      { color: 1, cells: [[0, 0], [1, 0]], at: [6, 5] },
    ],
  },
  // ---- 18 ----
  {
    pieces: [
      { color: 0, cells: [[0, 0], [1, 0], [0, 1], [1, 1]], at: [3, 2] },
      { color: 1, cells: [[0, 0], [1, 0], [2, 0], [3, 0]], at: [2, 4] },
      { color: 2, cells: [[0, 0], [1, 0], [1, 1], [2, 1]], at: [5, 2] },
      { color: 3, cells: [[0, 0], [0, 1], [0, 2], [1, 2]], at: [6, 4] },
      { color: 0, cells: [[0, 0], [1, 0], [2, 0], [1, 1]], at: [2, 5] },
      { color: 1, cells: [[0, 0], [1, 0]], at: [4, 6] },
    ],
  },
  // ---- 19 ----
  {
    pieces: [
      { color: 0, cells: [[0, 0], [1, 0], [2, 0], [1, 1]], at: [2, 2] },
      { color: 1, cells: [[0, 0], [1, 0], [2, 0], [2, 1]], at: [5, 2] },
      { color: 2, cells: [[1, 0], [2, 0], [0, 1], [1, 1]], at: [2, 4] },
      { color: 3, cells: [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]], at: [4, 4] },
      { color: 0, cells: [[0, 0], [0, 1], [1, 1]], at: [2, 6] },
      { color: 1, cells: [[0, 0], [1, 0]], at: [6, 6] },
      { color: 2, cells: [[0, 0], [0, 1]], at: [4, 6] },
    ],
  },
  // ---- 20 ----
  {
    pieces: [
      { color: 0, cells: [[0, 0], [1, 0], [2, 0], [3, 0]], at: [2, 2] },
      { color: 1, cells: [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]], at: [3, 3] },
      { color: 2, cells: [[0, 0], [0, 1], [0, 2], [1, 2]], at: [2, 3] },
      { color: 3, cells: [[0, 0], [0, 1], [0, 2]], at: [6, 2] },
      { color: 0, cells: [[0, 0], [1, 0], [2, 0], [0, 1]], at: [5, 5] },
      { color: 1, cells: [[0, 0], [1, 0]], at: [6, 6] },
      { color: 2, cells: [[0, 0], [0, 1]], at: [2, 6] },
    ],
  },
];

const BOARD_SIZE = 8;
const DIRECTIONS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function createRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function pieceSizesFor(levelNo) {
  if (levelNo <= 35) return [4, 4, 4, 4, 4, 4];
  if (levelNo <= 50) return [4, 4, 4, 4, 4, 5, 5];
  if (levelNo <= 65) return [4, 4, 4, 4, 5, 5, 5, 5];
  if (levelNo <= 80) return [5, 5, 5, 5, 5, 5, 5, 5];
  if (levelNo <= 90) return [5, 5, 5, 5, 5, 5, 5, 5, 5];
  if (levelNo <= 95) return [5, 5, 5, 5, 5, 5, 5, 5, 5, 5];
  if (levelNo <= 99) return [6, 6, 6, 6, 6, 6, 6, 6, 6];
  return [5, 5, 6, 6, 6, 6, 6, 6, 6, 6];
}

function neighborsOf(cells, blocked) {
  const candidates = new Map();
  for (const [x, y] of cells) {
    for (const [dx, dy] of DIRECTIONS) {
      const nx = x + dx;
      const ny = y + dy;
      const key = `${nx},${ny}`;
      if (
        nx >= 0 && ny >= 0 && nx < BOARD_SIZE && ny < BOARD_SIZE &&
        !blocked.has(key)
      ) {
        candidates.set(key, [nx, ny]);
      }
    }
  }
  return [...candidates.values()];
}

/**
 * 从棋盘中央向外生长相连的多格积木。每块都与既有目标相邻，
 * 因而目标图案连通；记录生成时的摆放位置，保证关卡必然有解。
 */
function generateLevel(levelNo) {
  const sizes = pieceSizesFor(levelNo);

  for (let attempt = 0; attempt < 200; attempt++) {
    const random = createRandom(levelNo * 7919 + attempt * 104729);
    const occupied = new Set();
    const absolutePieces = [];
    let failed = false;

    for (const size of sizes) {
      const starts = occupied.size
        ? neighborsOf(
          [...occupied].map((key) => key.split(',').map(Number)),
          occupied
        )
        : [[3, 3], [4, 3], [3, 4], [4, 4]];

      if (!starts.length) {
        failed = true;
        break;
      }

      const piece = [starts[Math.floor(random() * starts.length)]];
      const pieceSet = new Set(piece.map(([x, y]) => `${x},${y}`));

      while (piece.length < size) {
        const blocked = new Set([...occupied, ...pieceSet]);
        const frontier = neighborsOf(piece, blocked);
        if (!frontier.length) {
          failed = true;
          break;
        }

        // 优先选择与当前积木接触边更多的格子，使形状紧凑但仍有变化。
        const scored = frontier.map((cell) => ({
          cell,
          score: DIRECTIONS.reduce((total, [dx, dy]) => (
            total + (pieceSet.has(`${cell[0] + dx},${cell[1] + dy}`) ? 1 : 0)
          ), 0),
        }));
        const bestScore = Math.max(...scored.map(({ score }) => score));
        const preferred = scored.filter(({ score }) => (
          score >= bestScore - (levelNo >= 51 ? 1 : 0)
        ));
        const next = preferred[Math.floor(random() * preferred.length)].cell;
        piece.push(next);
        pieceSet.add(`${next[0]},${next[1]}`);
      }

      if (failed) break;
      piece.forEach(([x, y]) => occupied.add(`${x},${y}`));
      absolutePieces.push(piece);
    }

    if (failed) continue;

    return {
      pieces: absolutePieces.map((cells, pieceIndex) => {
        const minX = Math.min(...cells.map(([x]) => x));
        const minY = Math.min(...cells.map(([, y]) => y));
        return {
          color: (pieceIndex + levelNo) % COLORS.length,
          cells: cells.map(([x, y]) => [x - minX, y - minY]),
          at: [minX, minY],
        };
      }),
    };
  }

  throw new Error(`无法生成超级积木第 ${levelNo} 关`);
}

const GENERATED_LEVELS = Array.from(
  { length: 80 },
  (_, index) => generateLevel(index + HANDCRAFTED_LEVELS.length + 1)
);

export const LEVELS = [...HANDCRAFTED_LEVELS, ...GENERATED_LEVELS];
