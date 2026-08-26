// 华容道音效（WebAudio 合成）
// 参考计客超级华容道的音效质感：清脆、有层次

let audioCtx = null;
let muted = false;

function getContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playTone(freq, duration, type = 'sine', volume = 0.2, delay = 0) {
  if (muted) return;
  try {
    const ctx = getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    const t = ctx.currentTime + delay;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(volume, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + duration);
  } catch (e) {
    // 忽略音频错误
  }
}

function playSlide() {
  if (muted) return;
  try {
    const ctx = getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(160, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch (e) {
    // 忽略
  }
}

export const Sound = {
  /** 拾起棋子 — 清脆短音 */
  pick() {
    playTone(500, 0.04, 'sine', 0.08);
  },
  /** 滑动 — 低频滑音 */
  slide() {
    playSlide();
  },
  /** 无法移动 — 低沉短促 */
  blocked() {
    playTone(140, 0.06, 'sawtooth', 0.08);
  },
  /** 通关 — 上升音阶 + 胜利和弦 */
  win() {
    playTone(523, 0.1, 'square', 0.15, 0);
    playTone(659, 0.1, 'square', 0.15, 0.1);
    playTone(784, 0.1, 'square', 0.15, 0.2);
    playTone(1047, 0.15, 'square', 0.18, 0.3);
    playTone(1319, 0.4, 'sine', 0.15, 0.45);
    // 低音支撑
    playTone(262, 0.5, 'triangle', 0.1, 0.3);
  },
  /** 星星弹出 */
  star() {
    playTone(880, 0.08, 'sine', 0.12);
    playTone(1320, 0.12, 'sine', 0.1, 0.08);
  },
  /** 点击按钮 */
  click() {
    playTone(600, 0.03, 'square', 0.06);
  },
  /** 翻页/切换 */
  whoosh() {
    playTone(400, 0.06, 'sine', 0.05);
    playTone(600, 0.04, 'sine', 0.04, 0.03);
  },
  /** 计时滴答（挑战模式） */
  tick() {
    playTone(1000, 0.02, 'sine', 0.04);
  },
  /** 时间到 */
  timeout() {
    playTone(200, 0.3, 'sawtooth', 0.15);
    playTone(150, 0.4, 'sawtooth', 0.12, 0.1);
  },
  /** 切换静音 */
  setMuted(m) {
    muted = m;
  },
  isMuted() {
    return muted;
  },
};
