'use client';
import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValueEvent, useTransform, type MotionValue } from 'motion/react';
import { mod, reelTurns, type WheelFilm } from '@/lib/wheel';

const IMG = 'https://image.tmdb.org/t/p';
const BULBS = 18;

/* WheelMo's reel: a strip of the pool's real posters, repeated, running past a lit window. `pos` (in posters) says
   which poster is in the window; WheelStage animates it to the server's winner. The reel never chooses anything:
   it shows only the films it's given and stops wherever `pos` ends. Decorative for screen readers: the pool list
   and the spoken result carry the same information. */
export default function Reel({ films, pos, landed, spinning, still }: {
  films: WheelFilm[]; pos: MotionValue<number>; landed: number | null; spinning: boolean; still: boolean;
}) {
  const n = Math.max(films.length, 1);
  const before = 4;
  const count = n * (reelTurns(n) + 3) + before * 2;
  const win = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const [pitch, setPitch] = useState(0);
  /* One poster plus its gap, measured, so the strip lines up at any screen size. */
  useEffect(() => {
    const st = strip.current, el = st?.children[0] as HTMLElement | undefined;
    if (!st || !el) return;
    const measure = () => { if (st.isConnected) setPitch(el.offsetWidth + parseFloat(getComputedStyle(st).columnGap || '0')); };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    return () => ro.disconnect();
  }, [n]);
  /* Poster k is centred in the window when pos = k; the strip starts `before` posters early so both edges fill. */
  const x = useTransform(pos, (p) => -(p + before + 0.5) * pitch);
  /* Motion blur that follows the reel's speed, so it reads as fast without anything flashing. */
  useMotionValueEvent(pos, 'change', () => {
    if (!strip.current || still) return;
    const v = Math.abs(pos.getVelocity());
    strip.current.style.filter = v > 4 ? `blur(${Math.min(5, (v - 4) * 0.18).toFixed(2)}px) brightness(${Math.max(0.82, 1 - v * 0.004).toFixed(2)})` : '';
  });
  useEffect(() => { if (!spinning && strip.current) strip.current.style.filter = ''; }, [spinning]);

  return (
    <div className={`wm-reel${spinning ? ' is-spinning' : ''}${landed != null ? ' has-winner' : ''}`} data-films={films.length} aria-hidden="true">
      <div className="wm-reel-bulbs is-top">{Array.from({ length: BULBS }, (_, i) => <i key={i} className="wm-bulb" style={{ ['--d' as string]: `${(i % 6) * 0.07}s` }} />)}</div>
      <div ref={win} className="wm-reel-window">
        <motion.div ref={strip} className="wm-reel-strip" style={{ x }}>
          {Array.from({ length: count }, (_, i) => {
            const k = i - before;
            const f = films[mod(k, n)];
            if (!f) return null;
            return (
              <div key={i} className={`wm-slot${landed === k ? ' is-winner' : ''}`} data-film={f.tmdb_id} data-slot={k}>
                <span className="wm-slot-sprockets" />
                {f.poster_path ? <img src={`${IMG}/w185${f.poster_path}`} alt="" draggable={false} loading={Math.abs(k) < 8 ? 'eager' : 'lazy'} />
                  : <span className="wm-slot-title">{f.title}</span>}
                <span className="wm-slot-sprockets is-bottom" />
              </div>
            );
          })}
        </motion.div>
        <span className="wm-reel-frame" />
        <span className="wm-reel-pointer is-top" /><span className="wm-reel-pointer is-bottom" />
      </div>
      <div className="wm-reel-bulbs is-bottom">{Array.from({ length: BULBS }, (_, i) => <i key={i} className="wm-bulb" style={{ ['--d' as string]: `${((i + 3) % 6) * 0.07}s` }} />)}</div>
    </div>
  );
}
