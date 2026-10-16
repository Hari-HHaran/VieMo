'use client';
import { Poster } from '@/ds/client';
import { useDiary } from '@/lib/diary';
import { tasteOf } from '@/lib/wall';

const IMG = 'https://image.tmdb.org/t/p';

/* A glimpse of the Wall of Fame on Profile: the Hall of Fame first, then the most recent frames. */
export default function WallPreview() {
  const { items } = useDiary();
  const framed = items.filter((i) => i.stage !== 'waiting')
    .sort((a, b) => Number(b.stage === 'hall') - Number(a.stage === 'hall') || b.lastWatched.localeCompare(a.lastWatched)).slice(0, 5);
  const t = tasteOf(items);
  return (
    <a className="wall-preview" href="/wall">
      <span className="wall-preview-text">
        <span className="wall-preview-title">Wall of Fame</span>
        <span className="type-caption">{framed.length ? `${t.framed} framed · ${t.hall} in the Hall of Fame${t.waiting ? ` · ${t.waiting} waiting` : ''}` : t.waiting ? `${t.waiting} watched, waiting to be framed. Rate them to hang them.` : 'Mark films as watched and rate them to frame them here.'}</span>
      </span>
      <span className="wall-preview-frames" aria-hidden="true">
        {framed.length ? framed.map((i) => (
          <span key={i.film.id} className={`mini-frame is-${i.stage}`}><span className="mini-mat"><Poster src={i.film.posterPath ? `${IMG}/w92${i.film.posterPath}` : null} title={i.film.title} size="fill" /></span></span>
        )) : Array.from({ length: 4 }, (_, k) => <span key={k} className="mini-frame is-empty" />)}
      </span>
    </a>
  );
}
