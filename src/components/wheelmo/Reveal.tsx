'use client';
import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Button, Poster } from '@/ds/client';
import { addToWatchlist } from '@/app/(account)/library/actions';
import { useWatchlist } from '@/lib/device-store';
import { runtimeLabel } from '@/lib/format';
import type { WheelFilm } from '@/lib/wheel';
import { useAccount } from '../account/useAccount';
import { useToast } from '../AppShell';

const IMG = 'https://image.tmdb.org/t/p';
interface Card {
  id: number; title: string; year: number | null; runtime: number | null; genres: string[]; overview: string | null; posterPath: string | null;
  regionName: string; watch: { stream: string[]; rent: string[]; buy: string[]; link: string | null } | null;
}

/* The winner, revealed: real poster and facts from TMDB, and where to watch only as TMDB/JustWatch lists it. */
export default function Reveal({ film, reduced, onAgain, onReset, againLabel = 'Spin again', extra }: {
  film: WheelFilm; reduced: boolean; onAgain?: () => void; onReset?: () => void; againLabel?: string; extra?: React.ReactNode;
}) {
  const [card, setCard] = useState<Card | null | 'error'>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const { has, add } = useWatchlist();
  const me = useAccount();
  const toast = useToast();
  useEffect(() => {
    let live = true;
    fetch(`/api/film/${film.tmdb_id}/card`).then((r) => (r.ok ? r.json() : Promise.reject())).then((c) => { if (live) setCard(c); }, () => { if (live) setCard('error'); });
    heading.current?.focus();
    return () => { live = false; };
  }, [film.tmdb_id]);
  const c = card && card !== 'error' ? card : null;
  const saved = has(film.tmdb_id);
  return (
    <motion.section className="wm-reveal" aria-labelledby="wm-win" initial={reduced ? false : { opacity: 0, scale: 0.6, y: -40 }}
      animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 22 }}>
      {!reduced ? <span className="wm-sparkles" aria-hidden="true">{Array.from({ length: 10 }, (_, i) => <span key={i} style={{ ['--i' as string]: i }} />)}</span> : null}
      <div className="wm-reveal-poster">
        <Poster src={film.poster_path ? `${IMG}/w342${film.poster_path}` : null} title={film.title} year={film.year ?? undefined} size="fill" alt={`${film.title} poster`} eager />
      </div>
      <div className="wm-reveal-body">
        <p className="type-eyebrow wm-eyebrow">WheelMo chose</p>
        <h2 id="wm-win" ref={heading} tabIndex={-1} className="wm-reveal-title">{film.title}{film.year ? <span className="wm-reveal-year"> {film.year}</span> : null}</h2>
        {c ? <p className="type-caption wm-muted">{[runtimeLabel(c.runtime), c.genres.slice(0, 3).join(', ')].filter(Boolean).join(' · ')}</p> : null}
        {c?.overview ? <p className="type-body wm-reveal-overview">{c.overview}</p> : null}
        {card === null ? <p className="type-caption wm-muted" role="status">Loading the details…</p> : null}
        {card === 'error' ? <p className="type-caption wm-muted">The film’s details didn’t load, but the choice stands.</p> : null}
        {c ? (
          <div className="wm-watch">
            <p className="type-label">Where to watch in {c.regionName}</p>
            {c.watch && (c.watch.stream.length || c.watch.rent.length || c.watch.buy.length) ? (
              <ul role="list" className="type-caption">
                {c.watch.stream.length ? <li>Streaming: {c.watch.stream.join(', ')}</li> : null}
                {c.watch.rent.length ? <li>Rent: {c.watch.rent.join(', ')}</li> : null}
                {c.watch.buy.length ? <li>Buy: {c.watch.buy.join(', ')}</li> : null}
              </ul>
            ) : <p className="type-caption wm-muted">TMDB lists no streaming, rental or purchase options here.</p>}
            <p className="type-caption wm-muted">From JustWatch via TMDB{c.watch?.link ? <> · <a href={c.watch.link} target="_blank" rel="noopener noreferrer">TMDB watch page</a></> : null}</p>
          </div>
        ) : null}
        <div className="wm-reveal-actions">
          <Button variant="primary" icon={saved ? 'bookmark-check' : 'bookmark-plus'} aria-pressed={saved} onClick={async () => {
            if (!saved) add({ id: film.tmdb_id, title: film.title, year: film.year ?? undefined, posterPath: film.poster_path });
            if (me?.user) { const r = await addToWatchlist(film.tmdb_id); if (!r.ok) { toast({ tone: 'negative', message: r.message ?? 'That didn’t save to your account.' }); return; } }
            toast({ icon: 'bookmark-check', message: `${film.title} is on your watchlist` });
          }}>{saved ? 'On your watchlist' : 'Add to watchlist'}</Button>
          <Button href={`/film/${film.tmdb_id}`} variant="secondary" icon="film">Open film</Button>
          {extra}
          {onAgain ? <Button variant="secondary" icon="rotate-cw" onClick={onAgain}>{againLabel}</Button> : null}
          {onReset ? <Button variant="ghost" onClick={onReset}>Change the films</Button> : null}
        </div>
      </div>
    </motion.section>
  );
}
