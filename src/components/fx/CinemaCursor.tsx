'use client';
import { useEffect, useRef } from 'react';
import { usePrefs } from '@/lib/device-store';

type Mode = 'idle' | 'link' | 'media' | 'drag' | 'text' | 'hidden';
const MEDIA = '[data-film-card], .vm-film-card, .vm-poster, .vmx-poster, .pl-cover, .wall-frame, .clip';
const LINK = 'a[href], button:not(:disabled), [role="button"], [role="tab"], label.option, label[class*="mode"], summary, select, input[type="checkbox"], input[type="radio"], input[type="range"]';
const TEXT = 'input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="button"]):not([type="submit"]), textarea, [contenteditable="true"]';
const DRAG = 'canvas, .wm-lever, [data-cursor="drag"]';

/* A cinema cursor for mouse and trackpad: a dot that follows exactly, and a ring that trails it like a reel.
   It takes the page's own accent colour. Over links and buttons the ring widens and its sprocket holes turn;
   over posters it becomes a viewfinder; over text fields it steps aside for the normal text cursor. It is only
   decoration: every control works the same without it, and it is off for touch, forced colours, or when
   switched off in Settings. Reduced motion keeps it, without the trailing or the turning. */
export default function CinemaCursor({ world }: { world: string }) {
  const [prefs] = usePrefs();
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fine = matchMedia('(hover: hover) and (pointer: fine)');
    const forced = matchMedia('(forced-colors: active)');
    const osReduce = matchMedia('(prefers-reduced-motion: reduce)');
    const html = document.documentElement;
    let raf = 0, x = -100, y = -100, rx = -100, ry = -100, mode: Mode = 'hidden', down = false, active = false;
    const still = () => prefs.reduceMotion || osReduce.matches;
    const paint = () => {
      const d = dot.current, r = ring.current;
      if (!d || !r) return;
      d.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      r.style.transform = `translate3d(${rx}px, ${ry}px, 0) scale(${down ? 0.82 : 1})`;
    };
    const loop = () => {
      const k = still() ? 1 : 0.22;
      rx += (x - rx) * k; ry += (y - ry) * k;
      paint();
      raf = Math.abs(x - rx) + Math.abs(y - ry) > 0.3 ? requestAnimationFrame(loop) : 0;
    };
    const setMode = (m: Mode) => {
      if (m === mode) return;
      mode = m;
      dot.current?.setAttribute('data-mode', m);
      ring.current?.setAttribute('data-mode', m);
    };
    const modeFor = (t: Element | null): Mode => {
      if (!t) return 'idle';
      if (t.closest(TEXT)) return 'text';
      if (t.closest(DRAG)) return 'drag';
      if (t.closest(MEDIA)) return 'media';
      if (t.closest(LINK)) return 'link';
      return 'idle';
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
      x = e.clientX; y = e.clientY;
      if (mode === 'hidden') { rx = x; ry = y; }
      setMode(modeFor(e.target as Element));
      if (!raf) raf = requestAnimationFrame(loop);
    };
    const press = () => { down = true; paint(); };
    const lift = () => { down = false; paint(); };
    const leave = (e: MouseEvent) => { if (!e.relatedTarget) setMode('hidden'); };
    const start = () => {
      if (active) return;
      active = true;
      html.setAttribute('data-cursor', 'cinema');
      document.addEventListener('pointermove', move, { passive: true });
      document.addEventListener('pointerdown', press, { passive: true });
      document.addEventListener('pointerup', lift, { passive: true });
      document.addEventListener('mouseout', leave);
    };
    const stop = () => {
      active = false;
      html.removeAttribute('data-cursor');
      setMode('hidden');
      cancelAnimationFrame(raf); raf = 0;
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerdown', press);
      document.removeEventListener('pointerup', lift);
      document.removeEventListener('mouseout', leave);
    };
    const sync = () => { if (prefs.cursor && fine.matches && !forced.matches) start(); else stop(); };
    sync();
    fine.addEventListener('change', sync); forced.addEventListener('change', sync);
    return () => { stop(); fine.removeEventListener('change', sync); forced.removeEventListener('change', sync); };
  }, [prefs.cursor, prefs.reduceMotion]);

  /* The cursor sits above every layer (dialogs and toasts included), outside the shell, so it copies the current
     world's accent and page colour from the shell whenever the world, theme or personal accent changes. */
  useEffect(() => {
    const copy = () => {
      const shell = document.querySelector('.shell');
      if (!shell) return;
      const cs = getComputedStyle(shell);
      for (const el of [dot.current, ring.current]) {
        if (!el) continue;
        el.style.setProperty('--cc-ink', cs.getPropertyValue('--reel-ink').trim() || '#e8c27a');
        el.style.setProperty('--cc-edge', cs.getPropertyValue('--bg').trim() || '#000');
      }
    };
    const t = setTimeout(copy, 60);
    const mo = new MutationObserver(copy);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-vm-accent'] });
    return () => { clearTimeout(t); mo.disconnect(); };
  }, [world, prefs.cursor]);

  if (!prefs.cursor) return null;
  return (
    <>
      <div ref={ring} className="cc-ring" data-mode="hidden" aria-hidden="true">
        <svg viewBox="0 0 48 48" className="cc-reel"><circle cx="24" cy="24" r="21" /><g>{[0, 60, 120, 180, 240, 300].map((a) => <circle key={a} cx={24 + 13 * Math.sin((a * Math.PI) / 180)} cy={24 - 13 * Math.cos((a * Math.PI) / 180)} r="3.2" />)}</g></svg>
        <span className="cc-finder"><i /><i /><i /><i /></span>
      </div>
      <div ref={dot} className="cc-dot" data-mode="hidden" aria-hidden="true" />
    </>
  );
}
