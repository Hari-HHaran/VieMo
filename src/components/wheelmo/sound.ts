/* Optional mechanical ticks, made with Web Audio (no files). Off unless the person turns sound on. */
let ctx: AudioContext | null = null;
export function tick(strength = 1) {
  try {
    ctx ??= new AudioContext();
    const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'square'; o.frequency.setValueAtTime(1800, t); o.frequency.exponentialRampToValueAtTime(600, t + 0.03);
    g.gain.setValueAtTime(0.05 * strength, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + 0.05);
  } catch { /* no audio available */ }
}
export function chime() {
  try {
    ctx ??= new AudioContext();
    const t = ctx.currentTime;
    [660, 880, 1320].forEach((f, i) => {
      const o = ctx!.createOscillator(), g = ctx!.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t + i * 0.09); g.gain.exponentialRampToValueAtTime(0.06, t + i * 0.09 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.09 + 0.5);
      o.connect(g).connect(ctx!.destination); o.start(t + i * 0.09); o.stop(t + i * 0.09 + 0.55);
    });
  } catch { /* no audio available */ }
}
