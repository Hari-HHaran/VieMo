'use client';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/ds/client';
import { usePrefs, useWatchlist } from '@/lib/device-store';
import { runtimeLabel } from '@/lib/format';
import { useToast } from './AppShell';
import Trailer from './Trailer';

export interface Clip {
  id: number; title: string; year?: number; runtime: number | null; genres: string[]; overview: string;
  backdropPath: string | null; posterPath: string | null; trailerKey: string; trailerName: string;
}
const IMG = 'https://image.tmdb.org/t/p';

export default function ClipsFeed({ clips, sourceLabel = 'Trending on TMDB' }: { clips: Clip[]; sourceLabel?: string }) {
  const [prefs] = usePrefs();
  const { has, add, remove } = useWatchlist();
  const toast = useToast();
  const [playing, setPlaying] = useState<number | null>(null);
  const [visible, setVisible] = useState(0);
  const refs = useRef<(HTMLElement | null)[]>([]);

  /* Track which clip is on screen; with autoplay on, it starts (muted) and the previous one stops. */
  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting && e.intersectionRatio >= 0.6) {
        const i = Number((e.target as HTMLElement).dataset.index);
        setVisible(i);
        setPlaying((p) => (prefs.autoplay ? clips[i].id : p === clips[i].id ? p : null));
      }
    }, { threshold: [0.6] });
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [clips, prefs.autoplay]);

  const go = (i: number) => {
    const el = refs.current[Math.max(0, Math.min(clips.length - 1, i))];
    el?.scrollIntoView({ behavior: prefs.reduceMotion ? 'auto' : 'smooth', block: 'start' });
    el?.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
  };

  return (
    <div className="clips" aria-label="Trailers for films trending on TMDB this week">
      <h1 className="vm-sr">Clips</h1>
      <div className="clips-reel" aria-hidden="true"><span style={{ transform: `scaleX(${(visible + 1) / Math.max(clips.length, 1)})` }} /></div>
      {clips.map((c, i) => {
        const saved = has(c.id);
        return (
          <section key={c.id} className="clip" data-index={i} ref={(el) => { refs.current[i] = el; }} aria-labelledby={`clip-${c.id}`}>
            <Trailer youtubeKey={c.trailerKey} title={c.title} still={c.backdropPath ? `${IMG}/w780${c.backdropPath}` : null}
              playing={playing === c.id} autoPlay={prefs.autoplay} onPlay={() => setPlaying(c.id)} />
            <div className="clip-info">
              <p className="type-eyebrow vm-muted">{`${i + 1} of ${clips.length} · ${sourceLabel}`}</p>
              <h2 id={`clip-${c.id}`} className="type-display-md" tabIndex={-1}>{c.title}{c.year ? <span className="type-heading-md vm-muted"> {c.year}</span> : null}</h2>
              <p className="type-caption vm-muted">{[runtimeLabel(c.runtime), c.genres.join(', ')].filter(Boolean).join(' · ')}</p>
              {c.overview ? <p className="type-body clip-overview">{c.overview}</p> : null}
              <div className="clip-actions">
                <Button variant={saved ? 'secondary' : 'primary'} icon={saved ? 'bookmark-check' : 'bookmark-plus'} aria-pressed={saved}
                  onClick={() => {
                    const entry = { id: c.id, title: c.title, year: c.year, posterPath: c.posterPath };
                    if (saved) { const at = remove(c.id); toast({ message: 'Removed from your watchlist', action: { label: 'Undo', onClick: () => add(entry, at) } }); }
                    else { add(entry); toast({ tone: 'positive', message: `Saved ${c.title}`, action: { label: 'Undo', onClick: () => remove(c.id) } }); }
                  }}>{saved ? 'Saved' : 'Watchlist'}</Button>
                <Button icon="info" href={`/film/${c.id}`}>Details</Button>
                <Button icon="tv" href={`/film/${c.id}#where-h`}>Where to watch</Button>
                <Button iconOnly icon="share-2" label={`Share ${c.title}`} onClick={async () => {
                  const url = `${location.origin}/film/${c.id}`;
                  try { if (navigator.share) await navigator.share({ title: c.title, url }); else { await navigator.clipboard.writeText(url); toast({ icon: 'link', message: 'Link copied' }); } } catch {}
                }} />
              </div>
            </div>
          </section>
        );
      })}
      <nav className="clips-nav" aria-label="Move between trailers">
        <Button iconOnly icon="arrow-up" label="Previous trailer" onClick={() => go(visible - 1)} disabled={visible === 0} />
        <Button iconOnly icon="arrow-down" label="Next trailer" onClick={() => go(visible + 1)} disabled={visible === clips.length - 1} />
      </nav>
    </div>
  );
}
