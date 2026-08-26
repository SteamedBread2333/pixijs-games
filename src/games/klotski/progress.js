// 华容道进度存档
// 支持经典华容道 + 数字华容道两种模式的独立进度

const KEY = 'klotski-progress-v2';

function defaultProgress() {
  return {
    classic: { unlocked: 1, stars: {}, bestSteps: {}, bestTime: {} },
    number: { unlocked: 1, stars: {}, bestSteps: {}, bestTime: {} },
  };
}

export function loadProgress() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY));
    if (data && data.classic && data.number) return data;
  } catch (e) {
    // 存档损坏则重置
  }
  return defaultProgress();
}

export function saveProgress(progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress));
  } catch (e) {
    // 存储失败静默处理
  }
}

// 向后兼容旧接口
export function loadLegacyProgress() {
  const p = loadProgress();
  return p.classic;
}

export function saveLegacyProgress(classicProgress) {
  const p = loadProgress();
  p.classic = classicProgress;
  saveProgress(p);
}
