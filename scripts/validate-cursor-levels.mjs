// 校验光标迷航全部关卡：100 关数量、8 背景覆盖、20 机关覆盖、边界、出生点安全、核心顺序、出口可达、章节难度。
import { LEVELS, validateLevel } from '../src/games/cursorquest/levels.js';
import { listAllHazardKinds, HAZARD_KINDS } from '../src/games/cursorquest/hazards.js';

const ALL_KINDS = listAllHazardKinds();
console.log(`已知机关 ${ALL_KINDS.length} 种: ${ALL_KINDS.join(', ')}`);

let ok = true;
const fail = (msg) => { ok = false; console.log('❌', msg); };
const pass = (msg) => console.log('✅', msg);

// 1. 数量
if (LEVELS.length === 100) pass(`关卡数量 = 100`);
else fail(`关卡数量错误：期望 100，实际 ${LEVELS.length}`);

// 2. 逐关检查
const seenKinds = new Set();
const seenBackgrounds = new Set();
let prevAvgHazard = 0;

LEVELS.forEach((lv, i) => {
  const errs = validateLevel(lv);
  if (errs.length) {
    fail(`L${i + 1} 校验失败: ${errs.join('; ')}`);
  }
  // 边界
  const allCells = [lv.start, lv.exit, ...(lv.cores || []), ...(lv.shards || [])];
  for (const c of allCells) {
    if (!c) continue;
    if (c.gx < 0 || c.gx >= 12 || c.gy < 0 || c.gy >= 18) {
      fail(`L${i + 1} 坐标越界 (${c.gx},${c.gy})`);
    }
  }
  // 背景
  seenBackgrounds.add(lv.background);
  // 机关覆盖
  for (const h of lv.hazards || []) {
    seenKinds.add(h.kind);
    if (!HAZARD_KINDS[h.kind.toUpperCase()]) {
      fail(`L${i + 1} 未知机关种类: ${h.kind}`);
    }
  }
  // 章节难度：后一章平均机关数应不低于前一章
  if (i >= 10) {
    const chapter = Math.floor(i / 10);
    if (chapter > 0 && i % 10 === 0) {
      const avgHazard = [...LEVELS].slice(i - 10, i).reduce((acc, x) => acc + (x.hazards?.length || 0), 0) / 10;
      if (avgHazard < prevAvgHazard - 0.01) {
        fail(`章节 ${chapter} 平均机关数 (${avgHazard.toFixed(2)}) 低于上一章 (${prevAvgHazard.toFixed(2)})`);
      }
      prevAvgHazard = avgHazard;
    } else if (i === 10) {
      prevAvgHazard = [...LEVELS].slice(0, 10).reduce((acc, x) => acc + (x.hazards?.length || 0), 0) / 10;
    }
  }
});

// 3. 8 背景覆盖
if (seenBackgrounds.size === 8) pass(`背景覆盖: ${[...seenBackgrounds].sort().join(',')}`);
else fail(`背景覆盖不足: 仅覆盖 ${seenBackgrounds.size}/8 套 -> ${[...seenBackgrounds].sort().join(',')}`);

// 4. 20 机关覆盖
const missing = ALL_KINDS.filter((k) => !seenKinds.has(k));
if (missing.length === 0) pass(`20 机关全部覆盖`);
else fail(`缺少机关: ${missing.join(', ')}`);

// 5. 出生点安全（出生格不能被墙/尖刺/熔岩覆盖；这里 validateLevel 已检查）
// 6. 核心顺序：手写的前 20 关的 cores 数组 gy 应当递增
let monotonicOk = true;
LEVELS.forEach((lv, i) => {
  if (!lv.cores) return;
  for (let k = 1; k < lv.cores.length; k++) {
    if (lv.cores[k].gy < lv.cores[k - 1].gy) monotonicOk = false;
  }
});
if (monotonicOk) pass('所有关卡核心顺序由上至下');
else fail('存在核心顺序未由上至下的关卡');

// 7. 出口可达（由 validateLevel 的 BFS 校验保证）
// 8. 章节难度递增（已在循环中检查）

console.log(ok ? '\nALL PASS' : '\nFAILED');
process.exit(ok ? 0 : 1);
