// 连线迷航 - WebAudio 合成音效
// 参考 Lines X 的"宁静、抽象、放松"气质：清脆、柔和、有空气感

let audioCtx = null;
let muted = false;

function getContext() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function tone(freq, duration, type = 'sine', volume = 0.2, delay = 0) {
  if (muted) return;
  try {
    const ctx = getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    const t = ctx.currentTime + delay;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(volume, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + duration);
  } catch (e) {
    // 忽略音频错误
  }
}

export const Sound = {
  /** 点击按钮 */
  click() {
    tone(700, 0.04, 'square', 0.06);
  },
  /** 选中一个端点 / 开始连线 */
  pick() {
    tone(520, 0.07, 'sine', 0.16);
    setTimeout(() => tone(660, 0.06, 'sine', 0.1, 0.05), 40);
  },
  /** 沿格子移动一步 */
  step() {
    tone(760, 0.04, 'triangle', 0.07);
  },
  /** 完成一条连线（成对连接成功） */
  connect() {
    tone(660, 0.1, 'sine', 0.18);
    setTimeout(() => tone(880, 0.12, 'sine', 0.16, 0.07), 70);
  },
  /** 撤销一步 */
  undo() {
    tone(440, 0.06, 'sine', 0.12);
    setTimeout(() => tone(360, 0.06, 'sine', 0.1, 0.04), 40);
  },
  /** 非法操作（交叉/重叠/走不了） */
  blocked() {
    tone(180, 0.1, 'sawtooth', 0.1);
  },
  /** 通关 */
  win() {
    tone(523, 0.12, 'square', 0.18);
    setTimeout(() => tone(659, 0.12, 'square', 0.18), 120);
    setTimeout(() => tone(784, 0.12, 'square', 0.18), 240);
    setTimeout(() => tone(1047, 0.28, 'square', 0.2), 360);
    setTimeout(() => tone(1319, 0.4, 'sine', 0.14), 480);
  },
  /** 切换静音 */
  setMuted(m) {
    muted = m;
  },
  isMuted() {
    return muted;
  },
};
