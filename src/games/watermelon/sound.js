// 使用 WebAudio API 合成简单音效，无需外部音频资源

let audioCtx = null;

function getContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playTone(freq, duration, type = 'sine', volume = 0.2) {
  try {
    const ctx = getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // 忽略音频错误，不影响游戏
  }
}

export const Sound = {
  /** 投放水果 */
  drop() {
    playTone(300, 0.1, 'triangle', 0.15);
  },
  /** 合成，等级越高音调越高 */
  merge(level) {
    playTone(400 + level * 60, 0.15, 'sine', 0.25);
    setTimeout(() => playTone(600 + level * 60, 0.12, 'sine', 0.15), 60);
  },
  /** 游戏结束 */
  gameOver() {
    playTone(220, 0.3, 'sawtooth', 0.2);
    setTimeout(() => playTone(160, 0.4, 'sawtooth', 0.2), 200);
  },
  /** 炸弹爆炸 */
  bomb() {
    playTone(90, 0.35, 'sawtooth', 0.35);
    playTone(60, 0.4, 'square', 0.2);
  },
  /** 震动容器 */
  shake() {
    playTone(150, 0.12, 'square', 0.2);
    setTimeout(() => playTone(180, 0.12, 'square', 0.2), 80);
    setTimeout(() => playTone(140, 0.12, 'square', 0.2), 160);
  },
  /** 进化道具 */
  evolve() {
    playTone(500, 0.1, 'sine', 0.2);
    setTimeout(() => playTone(700, 0.1, 'sine', 0.2), 80);
    setTimeout(() => playTone(900, 0.15, 'sine', 0.25), 160);
  },
  /** 连击提示，combo 为连击数 */
  combo(combo) {
    playTone(600 + Math.min(combo, 8) * 80, 0.12, 'triangle', 0.2);
  },
  /** 获得道具 */
  itemGet() {
    playTone(800, 0.08, 'sine', 0.15);
    setTimeout(() => playTone(1200, 0.12, 'sine', 0.15), 70);
  },
};
