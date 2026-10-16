'use client';
import { useEffect, useRef } from 'react';
import { Icon } from '@/ds/client';
import { prefersLessMotion } from '@/lib/motion';

/* A horizontal rail you can fling with a mouse. Touch keeps native scrolling, the keyboard uses Tab and the
   arrow buttons, and a click that ends a drag is swallowed so dragging never opens a film by accident. */
export default function DragRail({ children, label, className = '' }: { children: React.ReactNode; label: string; className?: string }) {
  const ref = useRef<HTMLUListElement>(null);
  const glideRef = useRef(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let down = false, moved = 0, lastX = 0, v = 0;
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      down = true; moved = 0; lastX = e.clientX; v = 0; cancelAnimationFrame(glideRef.current);
    };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      const dx = e.clientX - lastX; lastX = e.clientX; moved += Math.abs(dx); v = dx;
      if (moved > 6) { el.classList.add('is-dragging'); el.scrollLeft -= dx; }
    };
    const onUp = () => {
      if (!down) return; down = false;
      const glide = () => {
        if (prefersLessMotion() || Math.abs(v) < 0.5) { el.classList.remove('is-dragging'); return; }
        el.scrollLeft -= v; v *= 0.93; glideRef.current = requestAnimationFrame(glide);
      };
      glide();
    };
    const onClick = (e: MouseEvent) => { if (moved > 6) { e.preventDefault(); e.stopPropagation(); moved = 0; } };
    /* Posters and links would otherwise start the browser's own drag-and-drop, which cancels the pointer. */
    const noNativeDrag = (e: DragEvent) => e.preventDefault();
    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    el.addEventListener('click', onClick, true);
    el.addEventListener('dragstart', noNativeDrag);
    return () => {
      cancelAnimationFrame(glideRef.current);
      el.removeEventListener('pointerdown', onDown); window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp); window.removeEventListener('pointercancel', onUp);
      el.removeEventListener('click', onClick, true); el.removeEventListener('dragstart', noNativeDrag);
    };
  }, []);
  const nudge = (dir: 1 | -1) => {
    cancelAnimationFrame(glideRef.current);
    ref.current?.classList.remove('is-dragging');
    ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: prefersLessMotion() ? 'auto' : 'smooth' });
  };
  return (
    <div className={`drag-rail ${className}`}>
      <ul ref={ref} className="drag-rail-list" role="list" aria-label={label}>{children}</ul>
      <div className="drag-rail-arrows">
        <button type="button" className="drag-rail-arrow" onClick={() => nudge(-1)} aria-label={`Scroll ${label} back`}><Icon name="chevron-left" size={18} /></button>
        <button type="button" className="drag-rail-arrow" onClick={() => nudge(1)} aria-label={`Scroll ${label} forward`}><Icon name="chevron-right" size={18} /></button>
      </div>
    </div>
  );
}
