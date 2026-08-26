// 光标迷航 - WebAudio 合成音效

let audioCtx = null;

function getContext() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function tone(freq, duration, type = 'sine', volume = 0.2) {
  try {
    const ctx = getContext();
    if (!ctx) return;
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
  click() { tone(700, 0.04, 'square', 0.08); },
  pickup() { tone(420, 0.06, 'square', 0.1); },
  core() {
    tone(523, 0.1, 'sine', 0.22);
    setTimeout(() => tone(784, 0.12, 'sine', 0.18), 60);
  },
  hit() {
    tone(180, 0.18, 'sawtooth', 0.25);
    setTimeout(() => tone(120, 0.18, 'sawtooth', 0.18), 80);
  },
  shield() { tone(880, 0.18, 'triangle', 0.18); },
  exit() {
    tone(523, 0.1, 'square', 0.18);
    setTimeout(() => tone(659, 0.1, 'square', 0.2), 100);
    setTimeout(() => tone(784, 0.12, 'square', 0.22), 220);
  },
  win() {
    tone(523, 0.12, 'square', 0.2);
    setTimeout(() => tone(659, 0.12, 'square', 0.2), 120);
    setTimeout(() => tone(784, 0.12, 'square', 0.2), 240);
    setTimeout(() => tone(1047, 0.25, 'square', 0.22), 360);
  },
  shard() {
    tone(1100, 0.08, 'sine', 0.18);
    setTimeout(() => tone(1400, 0.1, 'sine', 0.16), 70);
  },
  hazard() { tone(220, 0.08, 'square', 0.1); },
};
