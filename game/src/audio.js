// MOONLIT VAULT — audio: tiny WebAudio bleeps, no assets, no network.
// The context is created on the first user gesture; headless runs stay silent.
let ctx = null;
let muted = false;

export function setMuted(m) { muted = m; }
export function isMuted() { return muted; }

function ac() {
  if (muted) return null;
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch { return null; }
}

function tone(freq, dur, type = 'sine', vol = 0.08, when = 0, slideTo = null) {
  const c = ac();
  if (!c) return;
  try {
    const t0 = c.currentTime + when;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(c.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  } catch { /* silent */ }
}

export function playSound(name) {
  switch (name) {
    case 'pickup': tone(880, 0.09, 'sine', 0.09); tone(1320, 0.14, 'sine', 0.07, 0.07); break;
    case 'sapphire': tone(660, 0.12, 'sine', 0.09); tone(990, 0.12, 'sine', 0.09, 0.1); tone(1480, 0.22, 'sine', 0.08, 0.2); break;
    case 'coin': tone(1900, 0.05, 'square', 0.04); tone(1500, 0.08, 'square', 0.035, 0.05); break;
    case 'smoke': tone(320, 0.25, 'sine', 0.06, 0, 140); break;
    case 'douse': tone(520, 0.18, 'sine', 0.06, 0, 180); break;
    case 'alert': tone(220, 0.16, 'sawtooth', 0.09); tone(330, 0.16, 'sawtooth', 0.09, 0.14); break;
    case 'caught': tone(440, 0.3, 'sawtooth', 0.1, 0, 110); tone(220, 0.4, 'sawtooth', 0.1, 0.2, 90); break;
    case 'clear': tone(523, 0.12, 'sine', 0.09); tone(659, 0.12, 'sine', 0.09, 0.1); tone(784, 0.2, 'sine', 0.09, 0.2); break;
    case 'win': [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, 'sine', 0.09, i * 0.13)); break;
    case 'click': tone(700, 0.05, 'sine', 0.05); break;
    case 'fail': tone(330, 0.25, 'sawtooth', 0.08, 0, 165); break;
    default: break;
  }
}
