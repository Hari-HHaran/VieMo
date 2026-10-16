'use client';
import { useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { finePointer, HOVER, prefersLessMotion, SPRING } from '@/lib/motion';

/* A card that tilts towards the pointer and catches a highlight where the pointer is, like a print under a lamp.
   Mouse and trackpad only; touch and reduced motion get a still card. Children carry all the content and links. */
export default function TiltCard({ children, className = '', as = 'div', ...rest }: { children: React.ReactNode; className?: string; as?: 'div' | 'article' | 'li' } & Record<string, unknown>) {
  const ref = useRef<HTMLElement>(null);
  const px = useMotionValue(0.5), py = useMotionValue(0.5), on = useMotionValue(0);
  const sx = useSpring(px, SPRING.standard), sy = useSpring(py, SPRING.standard), son = useSpring(on, SPRING.standard);
  const rotateY = useTransform([sx, son], ([x, o]: number[]) => (x - 0.5) * 2 * HOVER.tiltDeg * o);
  const rotateX = useTransform([sy, son], ([y, o]: number[]) => (0.5 - y) * 2 * HOVER.tiltDeg * o);
  const scale = useTransform(son, (o) => 1 + (HOVER.scale - 1) * o);
  const glare = useTransform([sx, sy, son], ([x, y, o]: number[]) => `radial-gradient(circle at ${x * 100}% ${y * 100}%, rgba(255,240,215,${HOVER.glare * o}), transparent 50%)`);
  useEffect(() => {
    const el = ref.current;
    if (!el || !finePointer() || prefersLessMotion()) return;
    const move = (e: PointerEvent) => { const r = el.getBoundingClientRect(); px.set((e.clientX - r.left) / r.width); py.set((e.clientY - r.top) / r.height); on.set(1); };
    const leave = () => { on.set(0); px.set(0.5); py.set(0.5); };
    el.addEventListener('pointermove', move); el.addEventListener('pointerleave', leave);
    return () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); };
  }, [px, py, on]);
  const Tag = motion[as] as typeof motion.div;
  return (
    <Tag ref={ref as never} className={`tilt ${className}`} style={{ rotateX, rotateY, scale, transformPerspective: 900 }} {...rest}>
      {children}
      <motion.span className="tilt-glare" aria-hidden="true" style={{ background: glare }} />
    </Tag>
  );
}
