import { posterSet, yearOf, type MovieSummary } from '@/lib/tmdb';
import WatchlistFilmCard, { type FilmCardData } from './WatchlistFilmCard';

export function toCard(m: MovieSummary, note?: string): FilmCardData {
  const p = posterSet(m.poster_path);
  return {
    id: m.id, title: m.title, year: yearOf(m), posterPath: m.poster_path, posterSrc: p.src, posterSrcSet: p.srcSet,
    tmdbRating: m.vote_count >= 20 ? m.vote_average : undefined, tmdbVotes: m.vote_count, note,
  };
}

/* A titled, horizontally scrolling row of films. The caption names where the list comes from. */
export default function FilmRail({ id, title, caption, films, noteFor }: {
  id: string; title: string; caption?: string; films: MovieSummary[]; noteFor?: (m: MovieSummary) => string | undefined;
}) {
  return (
    <section className="rail" aria-labelledby={`${id}-h`}>
      <div className="rail-head">
        <h2 id={`${id}-h`} className="type-heading-lg">{title}</h2>
        {caption ? <p className="type-caption vm-faint">{caption}</p> : null}
      </div>
      <ul className="rail-list" role="list">
        {films.map((m) => (
          <li key={m.id}><WatchlistFilmCard film={toCard(m, noteFor?.(m))} /></li>
        ))}
      </ul>
    </section>
  );
}

export function FilmGrid({ films, label }: { films: MovieSummary[]; label: string }) {
  return (
    <ul className="film-grid" role="list" aria-label={label}>
      {films.map((m) => <li key={m.id}><WatchlistFilmCard film={toCard(m)} /></li>)}
    </ul>
  );
}
