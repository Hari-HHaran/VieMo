'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion, useSpring, useTransform } from 'motion/react';
import { PRESS, SPRING } from '@/lib/motion';
import { useMagnetic } from '../fx/useMagnetic';

const HUB = 22; // the spool's diameter in px: how far the reel turns for each pixel of film
const UNSPOOL = { stiffness: 190, damping: 26, mass: 0.9 };

/* The Reel Director link as a film reel. Hover or keyboard focus unspools a strip of film with REEL DIRECTOR
   printed across its frames; leaving winds it back. The film comes off the reel (its free end leads) and the
   reel turns by exactly the length that unwound. It stays unrolled on the Director page, and always is with
   reduced motion (CSS), so the words are never hidden from anyone who can't trigger the hover. */
export default function DirectorReel({ active }: { active: boolean }) {
  const mag = useMagnetic<HTMLAnchorElement>(0.3);
  const film = useRef<HTMLSpanElement>(null);
  const [len, setLen] = useState(0);
  const [hover, setHover] = useState(false);
  const [focused, setFocused] = useState(false);
  const p = useSpring(0, UNSPOOL);
  const width = useTransform(p, (v) => v * len);
  const x = useTransform(p, (v) => -(1 - v) * len);
  const turn = useTransform(p, (v) => (v * len) / (Math.PI * HUB) * 360);

  /* Measure the strip once its font is in (and again if it ever changes size). */
  useLayoutEffect(() => {
    const el = film.current;
    if (!el) return;
    const measure = () => setLen(el.scrollWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const open = hover || focused || active;
  useEffect(() => { p.set(open ? 1 : 0); }, [open, p]);

  return (
    <motion.a ref={mag.ref} href="/director" className={`fnav-director reel-btn${open ? ' is-open' : ''}${active ? ' is-active' : ''}`}
      aria-current={active ? 'page' : undefined} style={{ x: mag.x, y: mag.y }}
      whileTap={{ scale: PRESS.navScale }} transition={SPRING.tap}
      onPointerEnter={(e) => { if (e.pointerType === 'mouse') setHover(true); }}
      onPointerLeave={() => setHover(false)}
      onFocus={(e) => setFocused(e.currentTarget.matches(':focus-visible'))}
      onBlur={() => setFocused(false)}>
      <span className="vm-sr">Reel Director</span>
      <motion.svg className="reel-spool" viewBox="0 0 32 32" aria-hidden="true" style={{ rotate: turn }}>
        <circle cx="16" cy="16" r="14.5" className="reel-rim" />
        <circle cx="16" cy="16" r="3.2" className="reel-hub" />
        {[0, 72, 144, 216, 288].map((a) => (
          <circle key={a} cx={16 + 8 * Math.cos((a - 90) * Math.PI / 180)} cy={16 + 8 * Math.sin((a - 90) * Math.PI / 180)} r="3.4" className="reel-hole" />
        ))}
      </motion.svg>
      <motion.span className="reel-window" aria-hidden="true" style={{ width }}>
        <motion.span ref={film} className="reel-film" style={{ x }}>
          {['R', 'E', 'E', 'L'].map((c, i) => <span key={i} className="reel-frame reel-letter">{c}</span>)}
          <span className="reel-frame reel-word">Director</span>
        </motion.span>
      </motion.span>
    </motion.a>
  );
}
