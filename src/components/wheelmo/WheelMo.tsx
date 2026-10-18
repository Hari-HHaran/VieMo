'use client';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Button, EmptyState, Poster } from '@/ds/client';
import { useWatchlist } from '@/lib/device-store';
import { MOODS, RUNTIMES } from '@/lib/moods';
import { MAX_POOL, MIN_POOL, type Spin, type WheelFilm, type WheelMode } from '@/lib/wheel';
import { useAccount } from '../account/useAccount';
import Reveal from './Reveal';
import WheelStage from './WheelStage';

const IMG = 'https://image.tmdb.org/t/p';
type Sources = { signedIn: boolean; watchlist: WheelFilm[]; collections: { share_id: string; title: string; count: number; mine: boolean }[] };

/* A fair random sample (crypto), shown before the spin, for sources with more films than the wheel holds. */
function sample<T>(list: T[], k: number): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const r = new Uint32Array(1); crypto.getRandomValues(r);
    const j = r[0] % (i + 1); [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, k);
}
const newId = () => (crypto.randomUUID ? crypto.randomUUID() : '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) => (Number(c) ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(c) / 4)))).toString(16)));

export default function WheelMo({ initialShare, services }: { initialShare?: string | null; services: { id: number; name: string }[] }) {
  const uid = useId();
  const me = useAccount();
  const { list: device } = useWatchlist();
  const [mode, setMode] = useState<WheelMode>(initialShare ? 'playlist' : 'watchlist');
  const [sources, setSources] = useState<Sources | null>(null);
  const [share, setShare] = useState<string | null>(initialShare ?? null);
  const [collection, setCollection] = useState<{ title: string; owner: string; is_demo: boolean; films: WheelFilm[] } | null | 'missing'>(null);
  const [surprise, setSurprise] = useState<{ films: WheelFilm[]; matched: number; filters: string } | null>(null);
  const [filters, setFilters] = useState({ runtime: 'any', mood: '', provider: '' });
  const [dealing, setDealing] = useState(false);
  const [chosen, setChosen] = useState<number[] | null>(null);   // finalists, when a source has more than 12 films
  const [picking, setPicking] = useState(false);
  const [spin, setSpin] = useState<Spin | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Spin | null>(null);
  const request = useRef<string | null>(null);

  useEffect(() => { fetch('/api/wheel/sources').then((r) => r.json()).then(setSources).catch(() => setSources({ signedIn: false, watchlist: [], collections: [] })); }, [me?.user?.id]);
  /* A reload in the middle of a spin shows that spin's result, never a new roll. */
  useEffect(() => {
    fetch('/api/wheel/spin').then((r) => r.json()).then(({ spin: s }: { spin: Spin | null }) => {
      if (s && s.status === 'spinning' && Date.now() - new Date(s.created_at).getTime() < 120_000) { setSpin(s); }
    }).catch(() => {});
  }, []);
  useEffect(() => {
    if (!share) { setCollection(null); return; }
    setCollection(null);
    fetch(`/api/wheel/sources?share=${share}`).then((r) => (r.ok ? r.json() : Promise.reject())).then((j) => setCollection(j.collection), () => setCollection('missing'));
  }, [share]);

  const accountList = sources?.signedIn && sources.watchlist.length >= MIN_POOL;
  const source: { films: WheelFilm[]; label: string; sourceKey: string } = useMemo(() => {
    if (mode === 'watchlist') {
      if (accountList) return { films: sources!.watchlist, label: 'your watchlist', sourceKey: 'account' };
      return { films: device.map((f) => ({ tmdb_id: f.id, title: f.title, year: f.year ?? null, poster_path: f.posterPath })), label: 'the watchlist on this device', sourceKey: 'device' };
    }
    if (mode === 'playlist') return { films: collection && collection !== 'missing' ? collection.films : [], label: collection && collection !== 'missing' ? `“${collection.title}”` : 'the collection', sourceKey: share ?? '' };
    return { films: surprise?.films ?? [], label: 'Surprise me', sourceKey: surprise?.filters ?? 'surprise' };
  }, [mode, accountList, sources, device, collection, share, surprise]);

  /* Sources with more than 12 films get a shortlist first: random by default, or chosen by hand. Either way the
     wheel shows exactly the films that can win. */
  const sourceKey = `${mode}:${source.sourceKey}:${source.films.map((f) => f.tmdb_id).join(',')}`;
  const lastKey = useRef('');
  useEffect(() => {
    if (lastKey.current === sourceKey) return;
    lastKey.current = sourceKey;
    setChosen(source.films.length > MAX_POOL ? sample(source.films, MAX_POOL).map((f) => f.tmdb_id) : null);
    setPicking(false); setError(null);
    if (!spin || spin.status !== 'spinning') { setRevealed(null); }
  }, [sourceKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const pool = useMemo(() => {
    if (spin && (spin.status === 'spinning' || revealed)) return spin.pool;
    if (!chosen) return source.films;
    const byId = new Map(source.films.map((f) => [f.tmdb_id, f]));
    return chosen.map((id) => byId.get(id)).filter((f): f is WheelFilm => !!f);
  }, [source.films, chosen, spin, revealed]);

  const doSpin = useCallback(async (retry = false) => {
    if (busy || pool.length < MIN_POOL || pool.length > MAX_POOL) return;
    if (!retry || !request.current) request.current = newId();
    setBusy(true); setError(null); setRevealed(null);
    try {
      const r = await fetch('/api/wheel/spin', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ request_id: request.current, mode, source: source.sourceKey, ids: pool.map((f) => f.tmdb_id) }) });
      const j = await r.json();
      if (!r.ok) { setError(j.message ?? 'WheelMo couldn’t spin. Try again.'); return; }
      setSpin(j.spin);
    } catch {
      setError('WheelMo couldn’t reach the server. Try again: the same spin will be used, not a new one.');
      return;
    } finally { setBusy(false); }
    request.current = null;
  }, [busy, pool, mode, source.sourceKey]);

  const deal = async () => {
    setDealing(true); setError(null);
    const q = new URLSearchParams();
    if (filters.runtime !== 'any') q.set('runtime', filters.runtime);
    if (filters.mood) q.set('mood', filters.mood);
    if (filters.provider) q.set('providers', filters.provider);
    try {
      const r = await fetch(`/api/candidates?${q}`);
      const j = await r.json();
      if (!r.ok) throw new Error();
      const all: WheelFilm[] = (j.candidates as { id: number; title: string; year?: number; posterPath: string | null }[]).map((c) => ({ tmdb_id: c.id, title: c.title, year: c.year ?? null, poster_path: c.posterPath }));
      const parts = [RUNTIMES.find((x) => x.id === filters.runtime)?.label, MOODS.find((m) => m.id === filters.mood)?.label, services.find((s) => String(s.id) === filters.provider)?.name].filter(Boolean);
      setSurprise({ films: sample(all, 8), matched: all.length, filters: (parts.join(' · ') || 'Any film').slice(0, 120) });
    } catch { setError('Couldn’t deal films right now. Try again in a moment.'); }
    finally { setDealing(false); }
  };

  const winner = revealed ? revealed.pool[revealed.winner_index] : null;
  const can = pool.length >= MIN_POOL && pool.length <= MAX_POOL;
  const why = pool.length < MIN_POOL
    ? mode === 'watchlist' ? 'Save at least two films to your watchlist to spin it.' : mode === 'playlist' ? 'Choose a collection with at least two films.' : 'Deal some films first.'
    : undefined;

  return (
    <section className="wm" aria-labelledby={`${uid}-h`}>
      <header className="wm-head">
        <p className="type-eyebrow wm-eyebrow">WheelMo</p>
        <h2 id={`${uid}-h`} className="wm-title">Pull the lever. Let cinema decide.</h2>
        <p className="type-body wm-muted">A film roulette: every film on the wheel has the same chance, and the result is chosen on the server before the wheel turns. No betting, no prizes; just tonight’s film.</p>
      </header>

      <fieldset className="wm-modes">
        <legend className="vm-sr">What goes on the wheel</legend>
        {([['watchlist', 'My watchlist'], ['playlist', 'A collection'], ['surprise', 'Surprise me']] as const).map(([id, label]) => (
          <label key={id} className={`wm-mode type-label${mode === id ? ' is-on' : ''}`}>
            <input type="radio" name={`${uid}-mode`} value={id} checked={mode === id} disabled={busy} onChange={() => { setMode(id); setSpin(null); setRevealed(null); }} />{label}
          </label>
        ))}
        <a className="wm-mode type-label" href="/match/night">Movie Night (group)</a>
      </fieldset>

      <div className="wm-source">
        {mode === 'watchlist' ? (
          <p className="type-body wm-muted">{source.films.length ? `From ${source.label}: ${source.films.length} ${source.films.length === 1 ? 'film' : 'films'}.` : 'Your watchlist is empty.'}{!accountList && sources?.signedIn ? ' (Your account watchlist has fewer than two films, so this uses the one on this device.)' : ''}</p>
        ) : null}
        {mode === 'playlist' ? (
          <div className="wm-row">
            {sources?.signedIn && sources.collections.length ? (
              <>
                <label htmlFor={`${uid}-c`} className="type-label">Collection</label>
                <select id={`${uid}-c`} className="select type-body" value={share ?? ''} onChange={(e) => { setShare(e.target.value || null); setSpin(null); setRevealed(null); }}>
                  <option value="">Choose a collection…</option>
                  {share && !sources.collections.some((c) => c.share_id === share) && collection && collection !== 'missing' ? <option value={share}>{collection.title}</option> : null}
                  {sources.collections.map((c) => <option key={c.share_id} value={c.share_id}>{c.title} ({c.count}){c.mine ? '' : ' · saved'}</option>)}
                </select>
              </>
            ) : null}
            {collection === 'missing' ? <p className="type-body">That collection isn’t one you can open.</p> : null}
            {collection && collection !== 'missing' ? <p className="type-body wm-muted">“{collection.title}” by {collection.owner}{collection.is_demo ? ' (a demo account)' : ''}: {collection.films.length} films.</p> : null}
            {!share && !(sources?.signedIn && sources.collections.length) ? <p className="type-body wm-muted">Open any collection in <a href="/explore">Explore</a> and choose <strong>Spin on WheelMo</strong>.</p> : null}
          </div>
        ) : null}
        {mode === 'surprise' ? (
          <div className="wm-row">
            <label className="wm-field"><span className="type-label">Length</span>
              <select className="select type-body" value={filters.runtime} onChange={(e) => setFilters({ ...filters, runtime: e.target.value })}>{RUNTIMES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</select></label>
            <label className="wm-field"><span className="type-label">Mood</span>
              <select className="select type-body" value={filters.mood} onChange={(e) => setFilters({ ...filters, mood: e.target.value })}><option value="">Any mood</option>{MOODS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}</select></label>
            {services.length ? <label className="wm-field"><span className="type-label">On</span>
              <select className="select type-body" value={filters.provider} onChange={(e) => setFilters({ ...filters, provider: e.target.value })}><option value="">Any service</option>{services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label> : null}
            <Button variant="secondary" icon="sliders-horizontal" busy={dealing} onClick={deal}>{surprise ? 'Deal again' : 'Deal eight films'}</Button>
            {surprise ? <p className="type-caption wm-muted wm-full">Eight films picked at random from {surprise.matched} on TMDB that match: {surprise.filters}.</p> : null}
          </div>
        ) : null}
      </div>

      {chosen && source.films.length > MAX_POOL ? (
        <div className="wm-shortlist">
          <p className="type-body">{source.label[0].toUpperCase() + source.label.slice(1)} has {source.films.length} films; the wheel holds {MAX_POOL}. {picking ? 'Choose up to 12.' : 'These 12 were shortlisted at random.'}</p>
          <div className="wm-row">
            <Button variant="secondary" size="sm" onClick={() => setChosen(sample(source.films, MAX_POOL).map((f) => f.tmdb_id))}>Shuffle the shortlist</Button>
            <Button variant="ghost" size="sm" aria-expanded={picking} onClick={() => setPicking(!picking)}>{picking ? 'Done choosing' : 'Choose my own'}</Button>
          </div>
          {picking ? (
            <ul role="list" className="wm-pick">
              {source.films.map((f) => {
                const on = chosen.includes(f.tmdb_id);
                return (
                  <li key={f.tmdb_id}><label className="option">
                    <input type="checkbox" checked={on} disabled={!on && chosen.length >= MAX_POOL} onChange={() => setChosen(on ? chosen.filter((x) => x !== f.tmdb_id) : [...chosen, f.tmdb_id])} />
                    <span className="type-body">{f.title}{f.year ? ` (${f.year})` : ''}</span></label></li>
                );
              })}
            </ul>
          ) : null}
        </div>
      ) : null}

      {pool.length >= MIN_POOL || spin ? (
        <WheelStage films={pool} spin={spin} busy={busy} canSpin={can} cantSpinReason={why} onSpin={() => doSpin(false)} onRevealed={(s) => { setRevealed(s); fetch('/api/wheel/reveal', { method: 'POST', body: JSON.stringify({ id: s.id }) }).catch(() => {}); }} />
      ) : (
        <EmptyState icon="rotate-cw" title="Nothing on the wheel yet" body={why ?? ''} action={mode === 'watchlist' ? { label: 'Find films', icon: 'search', href: '/discover' } : undefined} />
      )}
      {error ? <p className="wm-error type-body" role="alert">{error} {request.current ? <button type="button" className="fd-link" onClick={() => doSpin(true)}>Try again</button> : null}</p> : null}

      {pool.length >= MIN_POOL ? (
        <section aria-labelledby={`${uid}-pool`} className="wm-pool">
          <h3 id={`${uid}-pool`} className="type-label">On the wheel ({pool.length}) · each has a 1 in {pool.length} chance</h3>
          <ol role="list" className="wm-pool-list">
            {pool.map((f, i) => (
              <li key={f.tmdb_id} className={revealed && revealed.winner_index === i && revealed.pool === pool ? 'is-winner' : ''}>
                <span className="wm-pool-thumb"><Poster src={f.poster_path ? `${IMG}/w92${f.poster_path}` : null} title={f.title} size="fill" /></span>
                <span className="type-caption">{f.title}{f.year ? ` (${f.year})` : ''}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {winner && revealed ? (
        <Reveal key={revealed.id} film={winner} reduced={false}
          onAgain={() => { setRevealed(null); setSpin(null); setTimeout(() => doSpin(false), 0); }}
          onReset={() => { setRevealed(null); setSpin(null); }} />
      ) : null}
    </section>
  );
}
