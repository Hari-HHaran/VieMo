'use client';
import { useEffect, useRef, useState } from 'react';

/* A slow festival ticker of film titles. It pauses on hover, on keyboard focus and when off screen;
   with reduced motion it becomes a plain row you can scroll. Each title is a real link. */
export default function Ticker({ label, items }: { label: string; items: { id: number; title: string; year?: number }[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  const row = (copy: number) => (
    <ul className="ticker-row" aria-hidden={copy ? true : undefined} role="list">
      {items.map((f) => (
        <li key={`${copy}-${f.id}`}>
          <a href={`/film/${f.id}`} tabIndex={copy ? -1 : undefined}>{f.title}{f.year ? <span className="ticker-year"> {f.year}</span> : null}</a>
        </li>
      ))}
    </ul>
  );
  return (
    <div ref={ref} className={`ticker${visible ? '' : ' is-paused'}`} role="region" aria-label={label} style={{ ['--ticker-s' as string]: `${Math.max(30, items.length * 4)}s` }}>
      <div className="ticker-track">{row(0)}{row(1)}</div>
    </div>
  );
}
