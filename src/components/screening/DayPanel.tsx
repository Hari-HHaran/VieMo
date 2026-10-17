'use client';
import { useEffect, useId, useState } from 'react';
import { Button, Poster, Rating } from '@/ds/client';
import Modal from '../fx/Modal';
import { describeDay, longDate, type DayCounts, type DayFilm } from '@/lib/screening';

const IMG = 'https://image.tmdb.org/t/p';

/* One day at the theatre: each film logged that day, with its rating and review, linking to the film. */
export default function DayPanel({ day, origin, counts, owner, isOwn, loadDay, onClose }: {
  day: string | null; origin: DOMRect | null; counts: DayCounts | undefined; owner: string; isOwn: boolean;
  loadDay: (day: string) => Promise<DayFilm[] | null>; onClose: () => void;
}) {
  const titleId = useId();
  const [films, setFilms] = useState<DayFilm[] | null | 'error'>(null);
  const [shown, setShown] = useState<Set<number>>(new Set());
  const [last, setLast] = useState<string | null>(day);
  if (day && day !== last) setLast(day);
  const current = day ?? last;

  useEffect(() => {
    if (!day) return;
    let live = true;
    setFilms(null); setShown(new Set());
    loadDay(day).then((f) => { if (live) setFilms(f ?? 'error'); }, () => { if (live) setFilms('error'); });
    return () => { live = false; };
  }, [day, loadDay]);

  return (
    <Modal open={!!day} onClose={onClose} labelledBy={titleId} origin={origin} className="sa-modal">
      {current ? (
        <div className="sa-day">
          <header className="sa-day-head">
            <p className="sa-eyebrow type-eyebrow">{owner} screenings</p>
            <h2 id={titleId} className="sa-day-title">{longDate(current)}</h2>
            <p className="type-body sa-muted">{describeDay(counts)}</p>
          </header>
          {films === null ? <p className="type-body sa-muted" role="status">Loading the day…</p>
            : films === 'error' ? <p className="type-body" role="alert">This day didn’t load. Close it and try again.</p>
            : films.length === 0 ? <p className="type-body sa-muted">Nothing logged on this day.</p>
            : (
              <ul className="sa-day-films" role="list">
                {films.map((f, i) => (
                  <li key={`${f.tmdbId}-${i}`} className="sa-day-film">
                    <a href={`/film/${f.tmdbId}`} className="sa-day-poster" tabIndex={-1} aria-hidden="true">
                      <Poster src={f.posterPath ? `${IMG}/w185${f.posterPath}` : null} title={f.title} year={f.year ?? undefined} size="fill" />
                    </a>
                    <div className="sa-day-body">
                      <h3 className="type-label"><a href={`/film/${f.tmdbId}`} className="sa-day-link">{f.title}</a>{f.year ? <span className="sa-muted"> ({f.year})</span> : null}</h3>
                      {f.rating != null ? <Rating value={f.rating} source={isOwn ? 'yours' : 'friend'} /> : <p className="type-caption sa-muted">Watched, not rated</p>}
                      {f.review ? (f.spoiler && !shown.has(i)
                        ? <p className="type-body sa-muted">The review has spoilers. <button type="button" className="sa-inline-btn" onClick={() => setShown(new Set(shown).add(i))}>Show it</button></p>
                        : <blockquote className="sa-review type-body">{f.review}</blockquote>) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          <footer className="sa-day-foot">
            {isOwn ? <Button href="/wall" variant="secondary" icon="star">Open your Wall of Fame</Button> : null}
            <Button variant="ghost" onClick={onClose}>Close</Button>
          </footer>
        </div>
      ) : null}
    </Modal>
  );
}
