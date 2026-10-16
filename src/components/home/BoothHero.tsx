'use client';
import { useEffect, useRef } from 'react';
import { finePointer, prefersLessMotion } from '@/lib/motion';

/* The Projection Booth hero. The film's backdrop sits in darkness and the pointer is the projector beam:
   one radial gradient, positioned by two CSS variables, updated at most once a frame. With touch or reduced
   motion the light rests on the frame's usual subject and nothing moves. Grain pauses when off screen. */
export default function BoothHero({ children, labelledBy }: { children: React.ReactNode; labelledBy: string }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => el.classList.toggle('is-offscreen', !e.isIntersecting));
    io.observe(el);
    if (!finePointer() || prefersLessMotion()) return () => io.disconnect();
    let raf = 0, nx = 0, ny = 0;
    const paint = () => { raf = 0; el.style.setProperty('--x', `${nx}%`); el.style.setProperty('--y', `${ny}%`); };
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      nx = ((e.clientX - r.left) / r.width) * 100; ny = ((e.clientY - r.top) / r.height) * 100;
      if (!raf) raf = requestAnimationFrame(paint);
      el.classList.add('is-lit');
    };
    const leave = () => { el.classList.remove('is-lit'); el.style.removeProperty('--x'); el.style.removeProperty('--y'); };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => { io.disconnect(); cancelAnimationFrame(raf); el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); };
  }, []);
  return <section ref={ref} className="booth-hero" aria-labelledby={labelledBy}>{children}</section>;
}
