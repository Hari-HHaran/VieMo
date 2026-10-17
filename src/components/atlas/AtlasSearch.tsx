'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { Icon, Poster } from '@/ds/client';
import type { AtlasFilm } from '@/lib/atlas/types';

const IMG = 'https://image.tmdb.org/t/p';

/* Film search as an ARIA combobox: real TMDB matches as you type, arrow keys to move, Enter to choose,
   Escape to close. Titles show their year so remakes and namesakes can be told apart. */
export default function AtlasSearch({ onPick }: { onPick: (f: AtlasFilm) => void }) {
  const id = useId();
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<AtlasFilm[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [state, setState] = useState<'idle' | 'searching' | 'error'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 2) { setHits([]); setOpen(false); setState('idle'); return; }
    timer.current = setTimeout(async () => {
      const n = ++seq.current;
      setState('searching');
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
        const b = await r.json();
        if (n !== seq.current) return;
        if (!r.ok) throw new Error(b.error);
        setHits(b.results); setOpen(true); setActive(-1); setState('idle');
      } catch { if (n === seq.current) { setState('error'); setOpen(true); } }
    }, 220);
  }, [q]);

  const choose = (f: AtlasFilm) => { onPick(f); setQ(''); setHits([]); setOpen(false); };
  const key = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' && hits.length) { e.preventDefault(); setOpen(true); setActive((a) => (a + 1) % hits.length); }
    else if (e.key === 'ArrowUp' && hits.length) { e.preventDefault(); setActive((a) => (a <= 0 ? hits.length - 1 : a - 1)); }
    else if (e.key === 'Enter' && open && active >= 0 && hits[active]) { e.preventDefault(); choose(hits[active]); }
    else if (e.key === 'Escape') { setOpen(false); setActive(-1); }
  };

  return (
    <div className="atlas-search" role="search">
      <label htmlFor={`${id}-q`} className="vm-sr">Search for a film</label>
      <Icon name="search" size={18} />
      <input id={`${id}-q`} type="text" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={key} onFocus={() => hits.length && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)} placeholder="Search a film to see where it was made" autoComplete="off"
        role="combobox" aria-expanded={open} aria-controls={`${id}-list`} aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${id}-o${active}` : undefined} />
      {state === 'searching' ? <span className="atlas-search-spin" aria-hidden="true" /> : null}
      <p className="vm-sr" aria-live="polite">{state === 'error' ? 'Search didn’t load.' : open ? `${hits.length} films found` : ''}</p>
      {open ? (
        <ul id={`${id}-list`} role="listbox" className="atlas-options" aria-label="Films">
          {state === 'error' ? <li className="atlas-option-note" role="presentation">Search didn’t load. Try again.</li>
            : !hits.length ? <li className="atlas-option-note" role="presentation">No films found on TMDB.</li>
            : hits.map((f, i) => (
              <li key={f.id} id={`${id}-o${i}`} role="option" aria-selected={i === active} className={`atlas-option${i === active ? ' is-active' : ''}`}
                onMouseDown={(e) => { e.preventDefault(); choose(f); }} onMouseEnter={() => setActive(i)}>
                <span className="atlas-option-poster"><Poster src={f.posterPath ? `${IMG}/w92${f.posterPath}` : null} title={f.title} size="fill" /></span>
                <span className="atlas-option-title">{f.title}</span>
                <span className="atlas-option-year">{f.year ?? 'Year unknown'}</span>
              </li>
            ))}
        </ul>
      ) : null}
    </div>
  );
}
