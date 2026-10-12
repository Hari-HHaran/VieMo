'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, EmptyState, ErrorState, FilterChip, Icon, Poster, Skeleton, SwipeCard } from '@/ds/client';
import { useWatchlist } from '@/lib/device-store';
import { MOODS, RUNTIMES, moodById, runtimeById } from '@/lib/moods';
import { rank, WEIGHTS, type Candidate, type Vote } from '@/lib/scoring';
import { useToast } from './AppShell';

const IMG = 'https://image.tmdb.org/t/p';
type Phase = 'setup' | 'loading' | 'voting' | 'results' | 'error';
interface Setup { mood: string | null; runtime: string; services: number[] }
interface State { phase: Phase; setup: Setup; deck: Candidate[]; votes: Record<number, Vote>; index: number; page: number; error?: string }
const START: State = { phase: 'setup', setup: { mood: null, runtime: 'any', services: [] }, deck: [], votes: {}, index: 0, page: 1 };
const KEY = 'viemo:quickpick';

/* Solo Quick pick: say what you want, vote on real films, get a ranked shortlist with reasons.
   State survives opening a film's details and coming back (sessionStorage). */
export default function QuickPick({ services, place }: { services: { id: number; name: string }[]; place: string }) {
  const router = useRouter();
  const toast = useToast();
  const { add, has } = useWatchlist();
  const [s, setS] = useState<State>(START);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    try { const raw = sessionStorage.getItem(KEY); if (raw) { const v = JSON.parse(raw) as State; if (v.phase !== 'loading') setS(v); } } catch {}
    setRestored(true);
  }, []);
  useEffect(() => { if (restored) try { sessionStorage.setItem(KEY, JSON.stringify(s)); } catch {} }, [s, restored]);

  const mood = moodById(s.setup.mood);
  const runtime = runtimeById(s.setup.runtime);
  const serviceNames = services.filter((x) => s.setup.services.includes(x.id)).map((x) => x.name);

  async function deal(page = 1) {
    setS((p) => ({ ...p, phase: 'loading', page }));
    const q = new URLSearchParams({ runtime: s.setup.runtime, page: String(page) });
    if (s.setup.mood) q.set('mood', s.setup.mood);
    if (s.setup.services.length) q.set('providers', s.setup.services.join(','));
    try {
      const res = await fetch(`/api/candidates?${q}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'upstream');
      setS((p) => ({ ...p, phase: 'voting', deck: body.candidates, votes: {}, index: 0, page }));
    } catch (e) {
      setS((p) => ({ ...p, phase: 'error', error: (e as Error).message }));
    }
  }

  function vote(v: Vote) {
    setS((p) => {
      const film = p.deck[p.index];
      const votes = { ...p.votes, [film.id]: v };
      const index = p.index + 1;
      return { ...p, votes, index, phase: index >= p.deck.length ? 'results' : 'voting' };
    });
  }

  const ranked = useMemo(() => rank(s.deck, s.votes, {
    moodGenres: mood?.genres ?? [], moodLabel: mood?.label, runtimeLabel: runtime.id === 'any' ? undefined : runtime.label, chosenServices: serviceNames,
  }), [s.deck, s.votes, mood, runtime, serviceNames]);

  if (!restored) return <Skeleton variant="text" lines={3} label="Loading Quick pick" />;

  if (s.phase === 'setup') {
    return (
      <section className="qp" aria-labelledby="qp-h">
        <h2 id="qp-h" className="type-heading-lg">Quick pick</h2>
        <p className="type-body vm-muted">Tell us what tonight needs, then vote on up to 20 films. Runtime and services are hard limits; mood shapes the list.</p>
        <fieldset className="qp-group">
          <legend className="type-label">Mood</legend>
          <div className="chip-row">
            {MOODS.map((m) => <FilterChip key={m.id} label={m.label} state={s.setup.mood === m.id ? 'on' : 'off'} onChange={(st) => setS({ ...s, setup: { ...s.setup, mood: st === 'on' ? m.id : null } })} />)}
            <FilterChip label="Open to anything" state={s.setup.mood === null ? 'on' : 'off'} onChange={() => setS({ ...s, setup: { ...s.setup, mood: null } })} />
          </div>
        </fieldset>
        <fieldset className="qp-group">
          <legend className="type-label">Length</legend>
          <div className="chip-row">
            {RUNTIMES.map((r) => <FilterChip key={r.id} label={r.label} state={s.setup.runtime === r.id ? 'on' : 'off'} onChange={() => setS({ ...s, setup: { ...s.setup, runtime: r.id } })} />)}
          </div>
        </fieldset>
        {services.length ? (
          <fieldset className="qp-group">
            <legend className="type-label">Only on these services <span className="vm-muted">(optional, {place})</span></legend>
            <div className="chip-row">
              {services.map((x) => {
                const on = s.setup.services.includes(x.id);
                return <FilterChip key={x.id} label={x.name} state={on ? 'on' : 'off'} onChange={() => setS({ ...s, setup: { ...s.setup, services: on ? s.setup.services.filter((i) => i !== x.id) : [...s.setup.services, x.id] } })} />;
              })}
            </div>
          </fieldset>
        ) : null}
        <Button variant="primary" size="lg" icon="popcorn" onClick={() => deal(1)} className="qp-go">Deal films</Button>
      </section>
    );
  }

  if (s.phase === 'loading') {
    return <div className="qp-loading"><Skeleton variant="poster" label="Finding films" /><Skeleton variant="text" lines={3} /></div>;
  }

  if (s.phase === 'error') {
    const config = s.error === 'config';
    return <ErrorState icon={config ? 'settings' : 'wifi-off'} title={config ? 'Film data isn’t connected yet' : 'Films didn’t load'}
      body={config ? 'This VieMo server has no TMDB token. Add TMDB_READ_TOKEN and reload.' : s.error === 'rate_limited' ? 'Too many requests in a minute. Wait a moment and try again.' : 'We couldn’t reach TMDB. Your choices are kept.'}
      onRetry={() => deal(s.page)} secondaryAction={{ label: 'Change choices', onClick: () => setS({ ...s, phase: 'setup' }) }} />;
  }

  if (s.phase === 'voting') {
    if (!s.deck.length) {
      return <EmptyState icon="search" title="No films fit all of that" body={`TMDB has no popular films matching ${[mood?.label, runtime.id !== 'any' ? runtime.label : null, serviceNames.length ? `on ${serviceNames.join(' or ')}` : null].filter(Boolean).join(', ')}.`}
        action={{ label: 'Change choices', onClick: () => setS({ ...s, phase: 'setup' }) }} />;
    }
    const f = s.deck[s.index];
    const voted = Object.keys(s.votes).length;
    return (
      <section className="qp-vote" aria-label="Vote on films">
        <SwipeCard
          key={f.id}
          film={{
            title: f.title, year: f.year, runtime: f.runtime ?? undefined, genres: f.genres.map((g) => g.name),
            synopsis: f.overview, posterSrc: f.posterPath ? `${IMG}/w500${f.posterPath}` : null,
            rating: f.voteCount ? { value: f.voteAverage, source: 'tmdb' } : undefined,
            providers: f.providers.map((name) => ({ name })),
          }}
          progress={{ current: s.index + 1, total: s.deck.length }}
          onVote={vote}
          onDetails={() => router.push(`/film/${f.id}`)}
        />
        <div className="qp-foot">
          <Button variant="ghost" size="sm" icon="chevron-left" onClick={() => setS({ ...s, phase: 'setup' })}>Change choices</Button>
          {voted >= 3 ? <Button variant="ghost" size="sm" iconAfter="chevron-right" onClick={() => setS({ ...s, phase: 'results' })}>See my shortlist</Button> : null}
        </div>
      </section>
    );
  }

  /* results */
  const [top, ...alts] = ranked;
  const save = (c: Candidate) => {
    if (has(c.id)) return;
    add({ id: c.id, title: c.title, year: c.year, posterPath: c.posterPath });
    toast({ tone: 'positive', message: `Saved ${c.title} to your watchlist` });
  };
  return (
    <section className="qp-results" aria-labelledby="res-h">
      {top ? (
        <>
          <p className="type-eyebrow vm-muted">Your top pick</p>
          <div className="qp-top">
            <Poster src={top.film.posterPath ? `${IMG}/w342${top.film.posterPath}` : null} title={top.film.title} year={top.film.year} size="lg" alt={`${top.film.title} poster`} />
            <div className="qp-top-text">
              <h2 id="res-h" className="type-display-md">{top.film.title}{top.film.year ? <span className="type-heading-md vm-muted"> {top.film.year}</span> : null}</h2>
              <h3 className="type-label">Why this one</h3>
              <ul className="qp-reasons">{top.reasons.map((r) => <li key={r} className="type-body"><Icon name="check" size={16} />{r}</li>)}</ul>
              <div className="film-actions">
                <Button variant="primary" icon="film" href={`/film/${top.film.id}`}>Open film</Button>
                <Button icon={has(top.film.id) ? 'bookmark-check' : 'bookmark-plus'} onClick={() => save(top.film)} aria-pressed={has(top.film.id)}>{has(top.film.id) ? 'Saved' : 'Save'}</Button>
              </div>
            </div>
          </div>
          {alts.length ? (
            <section aria-labelledby="alt-h" className="section">
              <h2 id="alt-h" className="type-heading-lg">Also worth it</h2>
              <ol className="qp-alts">
                {alts.slice(0, 3).map((r, i) => (
                  <li key={r.film.id} className="qp-alt">
                    <span className="qp-rank type-data" aria-hidden="true">{i + 2}</span>
                    <Poster src={r.film.posterPath ? `${IMG}/w185${r.film.posterPath}` : null} title={r.film.title} size="sm" />
                    <div>
                      <a href={`/film/${r.film.id}`} className="type-heading-md qp-alt-title">{r.film.title}</a>
                      <p className="type-caption vm-muted">{r.reasons.join(' · ')}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </>
      ) : (
        <EmptyState icon="circle-help" title="Nothing stood out" body="You passed on every film in this deal. Try another set, or loosen the length or services." />
      )}
      <div className="qp-again">
        <Button variant={top ? 'secondary' : 'primary'} icon="rotate-cw" onClick={() => deal(s.page + 1)}>Deal 20 more</Button>
        <Button variant="ghost" onClick={() => setS({ ...START, setup: s.setup })}>Change choices</Button>
      </div>
      <details className="qp-how">
        <summary className="type-label">How this was ranked</summary>
        <p className="type-caption vm-muted">
          Films you marked Not interested are out. Interested scores {WEIGHTS.yes}, Unsure {WEIGHTS.skip}. A film in your mood’s genres adds {WEIGHTS.moodMatch};
          being on a service you chose adds {WEIGHTS.onChosenService}; the TMDB rating adds up to {WEIGHTS.tmdbRating} as a tie-breaker. Runtime and services were
          hard limits when the films were dealt. Availability is from JustWatch via TMDB for {place}.
        </p>
      </details>
    </section>
  );
}
