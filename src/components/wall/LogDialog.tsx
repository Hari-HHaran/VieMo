'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { Button, Icon, Poster, Rating } from '@/ds/client';
import { useDiary } from '@/lib/diary';
import { stageOf, STAGE_NAMES, todayISO, type DiaryEntry, type WallFilm } from '@/lib/wall';
import Modal from '../fx/Modal';

const IMG = 'https://image.tmdb.org/t/p';
interface Hit { id: number; title: string; year?: number; posterPath: string | null }

/* Log a watch (new or rewatch), or edit one. Without a film it starts with a search. A live preview shows
   what the film becomes on the wall, which is the nudge to rate and review. */
export default function LogDialog({ open, onClose, film: given, entry, favourite: favIn = false, origin, onSaved }: {
  open: boolean; onClose: () => void; film?: WallFilm | null; entry?: DiaryEntry | null; favourite?: boolean; origin?: DOMRect | null;
  onSaved?: (result: { film: WallFilm; rating: number | null; favourite: boolean }) => void;
}) {
  const { log, update, toggleFavourite, diary } = useDiary();
  const titleId = useId();
  const [film, setFilm] = useState<WallFilm | null>(given ?? null);
  const [watchedOn, setWatchedOn] = useState(entry?.watchedOn ?? todayISO());
  const [rating, setRating] = useState<number | null>(entry?.rating ?? null);
  const [review, setReview] = useState(entry?.review ?? '');
  const [spoiler, setSpoiler] = useState(entry?.spoiler ?? false);
  const [notes, setNotes] = useState(entry?.notes ?? '');
  const [tags, setTags] = useState((entry?.tags ?? []).join(', '));
  const [favourite, setFavourite] = useState(favIn);

  useEffect(() => {
    if (!open) return;
    setFilm(given ?? null); setWatchedOn(entry?.watchedOn ?? todayISO()); setRating(entry?.rating ?? null); setReview(entry?.review ?? '');
    setSpoiler(entry?.spoiler ?? false); setNotes(entry?.notes ?? ''); setTags((entry?.tags ?? []).join(', ')); setFavourite(favIn);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const stage = stageOf(rating, review, favourite);
  const editing = !!entry;
  const seen = film ? diary.entries.filter((e) => e.filmId === film.id).length : 0;

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!film) return;
    const input = { watchedOn, rating, review, spoiler, notes, tags: tags.split(',') };
    if (entry) update(entry.id, input); else log(film, input);
    if (diary.favourites.includes(film.id) !== favourite) toggleFavourite(film.id);
    onSaved?.({ film, rating, favourite });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} labelledBy={titleId} origin={origin} className="log-modal">
      <form className="log" onSubmit={save}>
        <header className="log-head">
          <h2 id={titleId} className="type-display-md">{editing ? 'Edit this watch' : film ? (seen ? 'Log a rewatch' : 'Mark as watched') : 'Log a film'}</h2>
          <button type="button" className="log-close" onClick={onClose} aria-label="Close"><Icon name="x" size={20} /></button>
        </header>

        {!film ? <FilmSearch onPick={setFilm} /> : (
          <>
            <div className="log-film">
              <div className="log-film-poster"><Poster src={film.posterPath ? `${IMG}/w185${film.posterPath}` : null} title={film.title} size="fill" /></div>
              <div>
                <p className="type-heading-md">{film.title}{film.year ? <span className="vm-muted"> {film.year}</span> : null}</p>
                <p className="type-caption vm-muted">{film.genres.slice(0, 3).join(', ')}{seen ? ` · seen ${seen === 1 ? 'once' : `${seen} times`} before` : ''}</p>
                {!given && !editing ? <button type="button" className="log-change type-caption" onClick={() => setFilm(null)}>Choose a different film</button> : null}
              </div>
            </div>

            <div className="log-grid">
              <label className="log-field"><span className="type-label">Watched on</span>
                <input type="date" className="log-input" value={watchedOn} max={todayISO()} required onChange={(e) => setWatchedOn(e.target.value)} />
              </label>
              <div className="log-field"><span className="type-label" id={`${titleId}-r`}>Your rating</span>
                <div className="log-rating">
                  <Rating value={rating} onChange={setRating} onClear={() => setRating(null)} label="Your rating, half stars allowed" />
                  {rating != null ? <button type="button" className="log-clear type-caption" onClick={() => setRating(null)}>Clear</button> : null}
                </div>
              </div>
            </div>

            <label className="log-field"><span className="type-label">Review <span className="vm-muted">(optional)</span></span>
              <textarea className="log-input log-textarea" rows={4} maxLength={2000} value={review} onChange={(e) => setReview(e.target.value)} placeholder="What stayed with you?" />
            </label>
            <label className="log-check"><input type="checkbox" checked={spoiler} onChange={(e) => setSpoiler(e.target.checked)} /> <span className="type-body">My review has spoilers</span></label>

            <div className="log-grid">
              <label className="log-field"><span className="type-label">Tags <span className="vm-muted">(comma separated)</span></span>
                <input className="log-input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="cinema, with Mum, rainy day" maxLength={200} />
              </label>
              <label className="log-field"><span className="type-label">Private notes</span>
                <input className="log-input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Only you see these" maxLength={500} />
              </label>
            </div>

            <button type="button" className={`log-fav${favourite ? ' is-on' : ''}`} aria-pressed={favourite} onClick={() => setFavourite((f) => !f)}>
              <Icon name="heart" size={18} />{favourite ? 'A favourite' : 'Mark as a favourite'}
            </button>

            <p className={`log-stage is-${stage}`} aria-live="polite">
              <span className="log-stage-swatch" aria-hidden="true" />
              {stage === 'waiting' ? 'Goes to your wall’s waiting tray. Rate it to frame it.'
                : stage === 'framed' ? 'Framed in black on your Wall of Fame. Add a review to earn a walnut frame and a placard.'
                : stage === 'collected' ? 'Walnut frame with your review on a placard.'
                : `${STAGE_NAMES.hall}: a gilded frame with its own spotlight.`}
            </p>

            <div className="log-actions">
              <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
              <Button variant="primary" type="submit" icon={rating != null ? 'star' : 'check'}>{editing ? 'Save changes' : rating != null ? 'Hang it on the wall' : 'Save as watched'}</Button>
            </div>
            <p className="type-caption vm-faint">Saved on this device until accounts arrive.</p>
          </>
        )}
      </form>
    </Modal>
  );
}

function FilmSearch({ onPick }: { onPick: (f: WallFilm) => void }) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [state, setState] = useState<'idle' | 'searching' | 'error' | 'loading'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const id = useId();
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 2) { setHits([]); return; }
    timer.current = setTimeout(async () => {
      setState('searching');
      try { const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`); const b = await r.json(); if (!r.ok) throw 0; setHits(b.results); setState('idle'); }
      catch { setState('error'); }
    }, 250);
  }, [q]);
  async function pick(h: Hit) {
    setState('loading');
    try { const r = await fetch(`/api/film/${h.id}/basics`); const b = await r.json(); if (!r.ok) throw 0; onPick(b); }
    catch { onPick({ ...h, genres: [] }); }
  }
  return (
    <div className="log-search">
      <label className="log-field" htmlFor={id}><span className="type-label">Find a film you’ve seen</span></label>
      <input id={id} className="log-input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Title" autoComplete="off" autoFocus />
      <p className="type-caption vm-muted" aria-live="polite">{state === 'searching' ? 'Searching TMDB…' : state === 'error' ? 'Search didn’t load. Try again.' : state === 'loading' ? 'Getting the film…' : q.trim().length >= 2 && !hits.length ? 'No films found.' : ''}</p>
      {hits.length ? (
        <ul className="log-hits" role="list">
          {hits.map((h) => (
            <li key={h.id}><button type="button" className="log-hit" onClick={() => pick(h)}>
              <span className="log-hit-poster"><Poster src={h.posterPath ? `${IMG}/w92${h.posterPath}` : null} title={h.title} size="fill" /></span>
              <span className="type-heading-md">{h.title}{h.year ? <span className="vm-muted"> {h.year}</span> : null}</span>
            </button></li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
