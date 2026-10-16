'use client';
import { useEffect, useRef } from 'react';
import { useMotionValue, useSpring } from 'motion/react';
import { finePointer, MAGNET, prefersLessMotion, SPRING } from '@/lib/motion';

/* A few pixels of pull towards the pointer, mouse and trackpad only. Returns motion values for style={{ x, y }}. */
export function useMagnetic<T extends HTMLElement>(strength: number = MAGNET.strength) {
  const ref = useRef<T>(null);
  const mx = useMotionValue(0), my = useMotionValue(0);
  const x = useSpring(mx, SPRING.tap), y = useSpring(my, SPRING.tap);
  useEffect(() => {
    const el = ref.current;
    if (!el || !finePointer() || prefersLessMotion()) return;
    const clamp = (v: number) => Math.max(-MAGNET.max, Math.min(MAGNET.max, v));
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      mx.set(clamp((e.clientX - r.left - r.width / 2) * strength));
      my.set(clamp((e.clientY - r.top - r.height / 2) * strength));
    };
    const leave = () => { mx.set(0); my.set(0); };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); };
  }, [mx, my, strength]);
  return { ref, x, y };
}
