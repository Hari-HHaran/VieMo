'use client';
import { useId, useRef, useState } from 'react';
import { Button, Poster } from '@/ds/client';
import { BACKDROP_MAX, BACKDROP_MIN, clampBackdrop, setBackdropPref, useAccentPref, useBackdropPref } from '@/lib/device-store';
import { useToast } from './AppShell';

const IMG = 'https://image.tmdb.org/t/p';
interface Hit { id: number; title: string; year?: number; posterPath: string | null }

/* A favourite film's poster behind the app, faded down so it never competes with what's on screen. The
   strength is capped, so text keeps its contrast at any setting. Saved on this device. */
export default function BackdropSettings() {
  const uid = useId();
  const b = useBackdropPref();
  const fav = useAccentPref().film;
  const toast = useToast();
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [status, setStatus] = useState<'idle' | 'searching' | 'error'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pct = Math.round(clampBackdrop(b.opacity) * 100);

  const choose = (f: { id: number; title: string; posterPath: string | null }) => {
    if (!f.posterPath) { toast({ tone: 'negative', message: `${f.title} has no poster on TMDB.` }); return; }
    setBackdropPref({ film: { id: f.id, title: f.title, posterPath: f.posterPath } });
    setHits([]); setQ('');
    toast({ icon: 'check', message: `${f.title} is now your background` });
  };
  const onType = (v: string) => {
    setQ(v);
    if (timer.current) clearTimeout(timer.current);
    if (v.trim().length < 2) { setHits([]); return; }
    timer.current = setTimeout(async () => {
      setStatus('searching');
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(v.trim())}`); const j = await r.json();
        if (!r.ok) throw new Error(); setHits(j.results); setStatus('idle');
      } catch { setStatus('error'); }
    }, 300);
  };

  return (
    <div className="bd-settings">
      <div className="bd-current">
        <span className="bd-thumb" aria-hidden="true">
          {b.film ? <Poster src={`${IMG}/w185${b.film.posterPath}`} title={b.film.title} size="fill" /> : <span className="bd-none type-caption">None</span>}
        </span>
        <div className="bd-current-text">
          <p className="type-label">{b.film ? b.film.title : 'No background poster'}</p>
          <p className="type-caption vm-muted">{b.film ? `Shown at ${pct}% behind ${b.where === 'home' ? 'Home' : 'every page'}.` : 'Pick a film below. It sits faintly behind the app.'}</p>
          {b.film ? <Button variant="ghost" size="sm" icon="x" onClick={() => { setBackdropPref({ film: null }); toast({ message: 'Background poster removed' }); }}>Remove</Button> : null}
        </div>
      </div>

      {fav?.posterPath && fav.id !== b.film?.id ? (
        <Button variant="secondary" size="sm" icon="star" onClick={() => choose(fav)}>Use your favourite film, {fav.title}</Button>
      ) : null}

      <div className="bd-search">
        <label htmlFor={`${uid}-q`} className="type-label">{b.film ? 'Choose a different film' : 'Choose a film'}</label>
        <input id={`${uid}-q`} type="search" className="search-input type-body" placeholder="Search for a film" value={q} autoComplete="off" maxLength={100}
          onChange={(e) => onType(e.target.value)} aria-describedby={`${uid}-st`} />
        <p id={`${uid}-st`} className="type-caption vm-muted" role="status">{status === 'searching' ? 'Searching…' : status === 'error' ? 'That didn’t load. Try again.' : ''}</p>
        {hits.length ? (
          <ul className="hits" role="list" aria-label="Matching films">
            {hits.map((h) => (
              <li key={h.id}>
                <button type="button" className="hit" onClick={() => choose(h)} disabled={!h.posterPath}>
                  <Poster src={h.posterPath ? `${IMG}/w92${h.posterPath}` : null} title={h.title} size="sm" />
                  <span className="type-label">{h.title}</span>
                  {h.year ? <span className="type-caption vm-muted">{h.year}</span> : null}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <fieldset className="settings-group" disabled={!b.film}>
        <legend className="type-label">How it shows</legend>
        <div className="bd-range">
          <label htmlFor={`${uid}-o`} className="type-body">Strength</label>
          <input id={`${uid}-o`} type="range" min={Math.round(BACKDROP_MIN * 100)} max={Math.round(BACKDROP_MAX * 100)} step={1} value={pct}
            aria-valuetext={`${pct} percent`} onChange={(e) => setBackdropPref({ opacity: clampBackdrop(Number(e.target.value) / 100) })} />
          <output htmlFor={`${uid}-o`} className="type-label">{pct}%</output>
        </div>
        <p className="type-caption vm-muted">Kept between {Math.round(BACKDROP_MIN * 100)}% and {Math.round(BACKDROP_MAX * 100)}% so text stays easy to read.</p>
        <label className="option"><input type="radio" name={`${uid}-where`} checked={b.where === 'all'} onChange={() => setBackdropPref({ where: 'all' })} /><span className="type-body">Every page</span></label>
        <label className="option"><input type="radio" name={`${uid}-where`} checked={b.where === 'home'} onChange={() => setBackdropPref({ where: 'home' })} /><span className="type-body">Home only</span></label>
        <label className="option"><input type="checkbox" checked={b.blur} onChange={(e) => setBackdropPref({ blur: e.target.checked })} /><span className="type-body">Soften it (blur)</span></label>
      </fieldset>
    </div>
  );
}
