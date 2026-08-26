// 超级积木进度存档
const KEY = 'superblock-progress';

export function loadProgress() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY));
    if (data && typeof data.unlocked === 'number' && data.stars) return data;
  } catch (e) {
    // 存档损坏则重置
  }
  return { unlocked: 1, stars: {} };
}

export function saveProgress(progress) {
  localStorage.setItem(KEY, JSON.stringify(progress));
}
