'use client';
import { useCallback, useEffect, useRef } from 'react';
import { prefersLessMotion, SCRAMBLE } from '@/lib/motion';

/* Scramble/decrypt for a short label. `ref` goes on an aria-hidden overlay span; the real text stays in the DOM
   for screen readers and layout. Every path that ends the effect (finish, leave, blur, unmount) restores the text. */
export function useScramble(text: string) {
  const ref = useRef<HTMLSpanElement>(null);
  const raf = useRef(0);
  const stop = useCallback(() => {
    cancelAnimationFrame(raf.current);
    if (ref.current) ref.current.textContent = text;
  }, [text]);
  const run = useCallback(() => {
    if (prefersLessMotion() || !ref.current) return;
    stop();
    const start = performance.now();
    const chars = [...text];
    const step = (now: number) => {
      const p = (now - start) / SCRAMBLE.ms;
      const locked = Math.floor(p * chars.length);
      if (ref.current) ref.current.textContent = p >= 1 ? text
        : chars.map((c, i) => (i < locked || c === ' ' ? c : SCRAMBLE.glyphs[(Math.random() * SCRAMBLE.glyphs.length) | 0])).join('');
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  }, [text, stop]);
  useEffect(() => stop, [stop]);
  return { ref, run, stop };
}
