'use client';
import { useEffect, useId, useState } from 'react';
import { Button, Poster } from '@/ds/client';
import { addFilms } from '@/app/(tabs)/match/night/actions';
import { ROOM_MAX } from '@/lib/night';
import type { WheelFilm } from '@/lib/wheel';

const IMG = 'https://image.tmdb.org/t/p';
type Sources = { signedIn: boolean; watchlist: WheelFilm[]; collections: { share_id: string; title: string; count: number; mine: boolean }[] };
type Tab = 'watchlist' | 'collection' | 'search' | 'surprise';

function sample<T>(list: T[], k: number): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) { const r = new Uint32Array(1); crypto.getRandomValues(r); const j = r[0] % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, k);
}

/* Bring films into the room: from your own watchlist, a collection you can open, a search, or a surprise deal of
   real TMDB films. Only you choose what you add; nothing goes in on its own. */
export default function AddFilms({ night, inPool, onAdded }: { night: string; inPool: Set<number>; onAdded: (message: string) => void }) {
  const uid = useId();
  const [tab, setTab] = useState<Tab>('watchlist');
  const [sources, setSources] = useState<Sources | null>(null);
  const [share, setShare] = useState('');
  const [collection, setCollection] = useState<WheelFilm[] | null>(null);
  const [picked, setPicked] = useState<number[]>([]);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<WheelFilm[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const room = ROOM_MAX - inPool.size;

  useEffect(() => { fetch('/api/wheel/sources').then((r) => r.json()).then(setSources).catch(() => setSources({ signedIn: false, watchlist: [], collections: [] })); }, []);
  useEffect(() => {
    setCollection(null); setPicked([]);
    if (!share) return;
    fetch(`/api/wheel/sources?share=${share}`).then((r) => (r.ok ? r.json() : Promise.reject())).then((j) => setCollection(j.collection.films), () => setError('That collection didn’t open.'));
  }, [share]);
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setResults(null); return; }
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(term)}`).then((r) => r.json())
        .then((j) => setResults((j.results ?? []).map((m: { id: number; title: string; year?: number; posterPath: string | null }) => ({ tmdb_id: m.id, title: m.title, year: m.year ?? null, poster_path: m.posterPath }))))
        .catch(() => setResults([]));
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const add = async (list: number[], source: Tab, label: string, ref?: string) => {
    if (!list.length) return;
    setBusy(true); setError(null);
    const r = await addFilms(night, list, source, ref);
    setBusy(false);
    if (!r.ok) { setError(r.message); return; }
    setPicked([]);
    onAdded(r.value?.added ? `${r.value.added === 1 ? label : `${r.value.added} films`} added to the room.` : 'Those films were already in the room.');
  };
  const deal = async () => {
    setBusy(true); setError(null);
    try {
      const r = await fetch('/api/candidates'); const j = await r.json();
      if (!r.ok) throw new Error();
      const fresh = (j.candidates as { id: number }[]).map((c) => c.id).filter((id) => !inPool.has(id));
      setBusy(false);
      await add(sample(fresh, Math.min(4, room)), 'surprise', 'A surprise film');
    } catch { setBusy(false); setError('Couldn’t deal films right now. Try again in a moment.'); }
  };

  const checklist = (films: WheelFilm[], source: Tab, ref?: string) => {
    const open = films.filter((f) => !inPool.has(f.tmdb_id));
    if (!open.length) return <p className="type-body vm-muted">{films.length ? 'Every film here is already in the room.' : 'Nothing here yet.'}</p>;
    return (
      <>
        <ul role="list" className="nr-pick">
          {open.map((f) => {
            const on = picked.includes(f.tmdb_id);
            return (
              <li key={f.tmdb_id}><label className="option">
                <input type="checkbox" checked={on} disabled={!on && picked.length >= room} onChange={() => setPicked(on ? picked.filter((x) => x !== f.tmdb_id) : [...picked, f.tmdb_id])} />
                <span className="type-body">{f.title}{f.year ? ` (${f.year})` : ''}</span></label></li>
            );
          })}
        </ul>
        <div className="nr-row">
          <Button variant="secondary" size="sm" disabled={busy} onClick={() => setPicked(open.slice(0, room).map((f) => f.tmdb_id))}>Select {Math.min(open.length, room) === open.length ? 'all' : `the first ${room}`}</Button>
          <Button variant="primary" size="sm" icon="plus" busy={busy} disabled={!picked.length} onClick={() => add(picked, source, 'One film', ref)}>
            {picked.length ? `Add ${picked.length} ${picked.length === 1 ? 'film' : 'films'}` : 'Add films'}
          </Button>
        </div>
      </>
    );
  };

  return (
    <section className="nr-add" aria-labelledby={`${uid}-h`}>
      <h3 id={`${uid}-h`} className="type-heading-md">Add films</h3>
      <p className="type-caption vm-muted">{room > 0 ? `The room holds ${ROOM_MAX} films; ${room} more can go in.` : 'The room is full.'} Everyone in the room sees the films you add.</p>
      <fieldset className="nr-tabs">
        <legend className="vm-sr">Add from</legend>
        {([['watchlist', 'Your watchlist'], ['collection', 'A collection'], ['search', 'Search'], ['surprise', 'Surprise']] as const).map(([id, label]) => (
          <label key={id} className={`nr-tab type-label${tab === id ? ' is-on' : ''}`}>
            <input type="radio" name={`${uid}-tab`} checked={tab === id} onChange={() => { setTab(id); setPicked([]); setError(null); }} />{label}
          </label>
        ))}
      </fieldset>
      {room <= 0 ? null : tab === 'watchlist' ? (
        sources === null ? <p className="type-caption vm-muted" role="status">Loading your watchlist…</p>
          : sources.watchlist.length ? checklist(sources.watchlist, 'watchlist')
          : <p className="type-body vm-muted">Your account watchlist is empty. <a href="/library">Bring films over from this device</a> or use Search.</p>
      ) : tab === 'collection' ? (
        <div className="nr-stack">
          <label className="nr-field"><span className="type-label">Collection</span>
            <select className="select type-body" value={share} onChange={(e) => setShare(e.target.value)}>
              <option value="">Choose a collection…</option>
              {(sources?.collections ?? []).map((c) => <option key={c.share_id} value={c.share_id}>{c.title} ({c.count}){c.mine ? '' : ' · saved'}</option>)}
            </select>
          </label>
          {!sources?.collections.length ? <p className="type-caption vm-muted">Make or save a collection in <a href="/explore">Explore</a> to add from it.</p> : null}
          {collection ? checklist(collection, 'collection', share) : null}
        </div>
      ) : tab === 'search' ? (
        <div className="nr-stack">
          <label className="nr-field"><span className="type-label">Search TMDB</span>
            <input className="search-input type-body" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="A title" autoComplete="off" />
          </label>
          {results === null ? null : results.length === 0 ? <p className="type-caption vm-muted" role="status">No films found.</p> : (
            <ul role="list" className="nr-results">
              {results.map((f) => (
                <li key={f.tmdb_id}>
                  <span className="nr-thumb"><Poster src={f.poster_path ? `${IMG}/w92${f.poster_path}` : null} title={f.title} size="fill" /></span>
                  <span className="type-body">{f.title}{f.year ? ` (${f.year})` : ''}</span>
                  {inPool.has(f.tmdb_id) ? <span className="type-caption vm-muted">In the room</span>
                    : <Button variant="secondary" size="sm" icon="plus" disabled={busy} onClick={() => add([f.tmdb_id], 'search', f.title)}>Add<span className="vm-sr"> {f.title}</span></Button>}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="nr-stack">
          <p className="type-body vm-muted">Adds four popular films from TMDB at random, so the room has something new to consider.</p>
          <div className="nr-row"><Button variant="secondary" icon="popcorn" busy={busy} onClick={deal}>Deal four films</Button></div>
        </div>
      )}
      {error ? <p className="nr-error type-body" role="alert">{error}</p> : null}
    </section>
  );
}
