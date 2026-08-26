// 超级积木音效（WebAudio 合成）

let audioCtx = null;

function getContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
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
    // 忽略音频错误
  }
}

export const Sound = {
  /** 拾起积木 */
  pick() {
    playTone(420, 0.06, 'square', 0.1);
  },
  /** 放置成功 */
  place() {
    playTone(320, 0.08, 'triangle', 0.2);
    setTimeout(() => playTone(480, 0.08, 'triangle', 0.15), 50);
  },
  /** 旋转 */
  rotate() {
    playTone(560, 0.05, 'square', 0.12);
  },
  /** 无效 / 放回 */
  invalid() {
    playTone(180, 0.1, 'sawtooth', 0.12);
  },
  /** 通关 */
  win() {
    playTone(523, 0.12, 'square', 0.2);
    setTimeout(() => playTone(659, 0.12, 'square', 0.2), 120);
    setTimeout(() => playTone(784, 0.12, 'square', 0.2), 240);
    setTimeout(() => playTone(1047, 0.25, 'square', 0.22), 360);
  },
  /** 点击按钮 */
  click() {
    playTone(700, 0.04, 'square', 0.08);
  },
};
