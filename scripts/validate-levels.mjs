// 校验全部关卡数据（数量/越界/重叠/连通/难度递增）
import { LEVELS } from '../src/games/superblock/levels.js';

const N = 8;
let ok = true;

if (LEVELS.length !== 100) {
  ok = false;
  console.log(`关卡数量错误：期望 100，实际 ${LEVELS.length}`);
}

let previousGeneratedCellCount = 0;

LEVELS.forEach((level, li) => {
  const grid = Array.from({ length: N }, () => Array(N).fill(-1));
  level.pieces.forEach((p, pi) => {
    p.cells.forEach(([dx, dy]) => {
      const x = p.at[0] + dx;
      const y = p.at[1] + dy;
      if (x < 0 || y < 0 || x >= N || y >= N) {
        ok = false;
        console.log(`L${li + 1} piece${pi} 越界`, x, y);
      } else if (grid[y][x] !== -1) {
        ok = false;
        console.log(`L${li + 1} piece${pi} 与 piece${grid[y][x]} 重叠`, x, y);
      } else {
        grid[y][x] = pi;
      }
    });
  });
  // 单块连通
  level.pieces.forEach((p, pi) => {
    const set = new Set(p.cells.map(([x, y]) => `${x},${y}`));
    const queue = [p.cells[0]];
    const seen = new Set([p.cells[0].join(',')]);
    while (queue.length) {
      const [cx, cy] = queue.pop();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const k = `${cx + dx},${cy + dy}`;
        if (set.has(k) && !seen.has(k)) {
          seen.add(k);
          queue.push([cx + dx, cy + dy]);
        }
      }
    }
    if (seen.size !== set.size) {
      ok = false;
      console.log(`L${li + 1} piece${pi} 积木自身不连通`);
    }
  });
  // 目标连通
  const targets = [];
  grid.forEach((row, y) => row.forEach((v, x) => { if (v !== -1) targets.push([x, y]); }));
  const tset = new Set(targets.map(([x, y]) => `${x},${y}`));
  const queue = [targets[0]];
  const seen = new Set([targets[0].join(',')]);
  while (queue.length) {
    const [cx, cy] = queue.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const k = `${cx + dx},${cy + dy}`;
      if (tset.has(k) && !seen.has(k)) {
        seen.add(k);
        queue.push([cx + dx, cy + dy]);
      }
    }
  }
  if (seen.size !== tset.size) {
    ok = false;
    console.log(`L${li + 1} 目标图案不连通`);
  }
  if (li >= 20) {
    if (targets.length < previousGeneratedCellCount) {
      ok = false;
      console.log(`L${li + 1} 目标格数低于上一关`);
    }
    previousGeneratedCellCount = targets.length;
  }
  console.log(`L${li + 1}: ${level.pieces.length} 块, ${targets.length} 格`);
});

console.log(ok ? 'ALL PASS' : 'FAILED');
