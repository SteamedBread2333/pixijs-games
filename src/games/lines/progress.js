// 连线迷航 - 本地进度存档

const KEY = 'lines-numberlink-progress';

export const DEFAULT_PROGRESS = {
  unlocked: 1,        // 已解锁的最高关卡编号（1 起）
  bestStars: {},      // levelNo -> stars (0-3)
  bestTime: {},       // levelNo -> 最佳完成时间（秒）
};

export function loadProgress() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY));
    if (data && typeof data.unlocked === 'number' && data.bestStars) {
      return { ...DEFAULT_PROGRESS, ...data };
    }
  } catch (e) {
    // 存档损坏则重置
  }
  return { ...DEFAULT_PROGRESS };
}

export function saveProgress(progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress));
  } catch (e) {
    // localStorage 不可用时静默失败
  }
}

export function resetProgress() {
  try {
    localStorage.removeItem(KEY);
  } catch (e) {
    // ignore
  }
}
