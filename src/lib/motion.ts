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
