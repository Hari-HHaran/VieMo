/* VieMo motion tokens. Every animation picks one of these; durations are in seconds (motion's unit).
   Frequent actions use feedback/standard; reveal and cinematic are for moments that happen once. */
export const DURATION = { feedback: 0.12, standard: 0.22, reveal: 0.42, cinematic: 0.7 } as const;
export const EASE = { out: [0.2, 0.8, 0.2, 1], inOut: [0.45, 0, 0.25, 1] } as const;
export const SPRING = {
  tap: { type: 'spring', stiffness: 600, damping: 35 },
  standard: { type: 'spring', stiffness: 380, damping: 32 },
  reveal: { type: 'spring', stiffness: 260, damping: 26 },
  deck: { type: 'spring', stiffness: 320, damping: 28 },
} as const;
/* Stagger lists by 40ms, and never more than 8 steps, so long lists don't make people wait. */
export const stagger = (i: number) => Math.min(i, 8) * 0.04;

/* Pointer feedback. Hover effects only run with a fine pointer (mouse, trackpad) and never carry an action. */
export const HOVER = { lift: -4, scale: 1.03, tiltDeg: 7, glare: 0.35 } as const;
export const PRESS = { scale: 0.95, navScale: 0.92 } as const;
/* Magnetic pull: a fraction of the pointer's offset from centre, capped in pixels, settling on SPRING.tap. */
export const MAGNET = { strength: 0.22, max: 8 } as const;
/* Scramble: letters cycle random glyphs and lock in left to right within `ms`. */
export const SCRAMBLE = { ms: 360, glyphs: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+' } as const;
/* Page changes: a short cross-fade (CSS view transitions, see app.css) and the shared poster morph. */
export const PAGE = { fadeMs: 200, posterMs: 420 } as const;
/* Shared layout (sliding indicators, reflowing grids). */
export const LAYOUT = SPRING.standard;

/* True when the viewer asked for less motion, in VieMo's own setting or the system's. Client only. */
export function prefersLessMotion(): boolean {
  if (typeof window === 'undefined') return true;
  return document.documentElement.dataset.motion === 'reduce' || matchMedia('(prefers-reduced-motion: reduce)').matches;
}
export const finePointer = () => typeof window !== 'undefined' && matchMedia('(hover: hover) and (pointer: fine)').matches;
