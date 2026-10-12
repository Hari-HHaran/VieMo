'use client';
import { useEffect, useRef, useState } from 'react';
import { AccentPicker, Button, Poster } from '@/ds/client';
import { accentCss, applyAccent } from '@ds/components/viemo.mjs';
import { setAccentPref, useAccentPref } from '@/lib/device-store';
import { useToast } from './AppShell';

const IMG = 'https://image.tmdb.org/t/p';
interface Hit { id: number; title: string; year?: number; posterPath: string | null }
interface Palette { swatches: { hex: string; share: number; name: string; source: 'logo' | 'poster' }[]; neutral: boolean }

/* Pick a favourite film; VieMo reads its TMDB logo (or poster) and offers its colours as the app's accent. */
export default function AccentSettings() {
  const pref = useAccentPref();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [film, setFilm] = useState<Hit | null>(null);
  const [palette, setPalette] = useState<Palette | null>(null);
  const [value, setValue] = useState<string | null>(pref.hex);
  const [status, setStatus] = useState<'idle' | 'searching' | 'reading' | 'error'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setValue(pref.hex); }, [pref.hex]);
  /* The saved favourite film arrives after hydration (it lives in this device's storage): load its colours then. */
  const savedFilmId = pref.film?.id;
  useEffect(() => { if (pref.film && film?.id !== pref.film.id) loadPalette({ ...pref.film }); }, [savedFilmId]); // eslint-disable-line react-hooks/exhaustive-deps

  function onType(v: string) {
    setQ(v);
    if (timer.current) clearTimeout(timer.current);
    if (v.trim().length < 2) { setHits([]); return; }
    timer.current = setTimeout(async () => {
      setStatus('searching');
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(v.trim())}`);
        const b = await r.json();
        if (!r.ok) throw new Error(b.error);
        setHits(b.results); setStatus('idle');
      } catch { setStatus('error'); }
    }, 300);
  }

  async function loadPalette(f: Hit) {
    setFilm(f); setHits([]); setQ(''); setPalette(null); setStatus('reading');
    try {
      const r = await fetch(`/api/film/${f.id}/palette`);
      const b = await r.json();
      if (!r.ok) throw new Error(b.error);
      setPalette(b); setStatus('idle');
    } catch { setStatus('error'); }
  }

  function apply() {
    applyAccent(value);
    setAccentPref({ hex: value, css: value ? accentCss(value, 'html[data-vm-accent]') : null, film: film ? { id: film.id, title: film.title, posterPath: film.posterPath } : null });
    toast({ tone: 'positive', message: value ? 'Accent colour updated' : 'Back to VieMo red' });
  }

  return (
    <div className="accent-settings">
      <label htmlFor="fav" className="type-label">Favourite film</label>
      <div className="search">
        <input id="fav" type="search" className="search-input type-body" placeholder="Search for a film" value={q} onChange={(e) => onType(e.target.value)} autoComplete="off" maxLength={100}
          aria-describedby="fav-status" />
      </div>
      <p id="fav-status" className="type-caption vm-muted" role="status">
        {status === 'searching' ? 'Searching…' : status === 'reading' ? 'Reading its colours…' : status === 'error' ? 'That didn’t load. Check your connection and try again.' : ''}
      </p>
      {hits.length ? (
        <ul className="hits" role="list" aria-label="Matching films">
          {hits.map((h) => (
            <li key={h.id}>
              <button type="button" className="hit" onClick={() => loadPalette(h)}>
                <Poster src={h.posterPath ? `${IMG}/w92${h.posterPath}` : null} title={h.title} size="sm" />
                <span className="type-label">{h.title}</span>
                {h.year ? <span className="type-caption vm-muted">{h.year}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <AccentPicker
        film={{ title: film?.title ?? '', posterSrc: film?.posterPath ? `${IMG}/w92${film.posterPath}` : null }}
        swatches={palette?.swatches ?? []}
        neutral={palette?.neutral}
        allowNoir
        value={value}
        onChange={setValue}
        onApply={apply}
      />
      {pref.hex ? <Button variant="ghost" size="sm" onClick={() => { setValue(null); applyAccent(null); setAccentPref({ hex: null, css: null, film }); toast({ message: 'Back to VieMo red' }); }}>Reset to VieMo red</Button> : null}
    </div>
  );
}
