'use client';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Avatar, Button, Icon, Poster } from '@/ds/client';
import { confirmPick, removeFilm, setStage, spinNight, vote } from '@/app/(tabs)/match/night/actions';
import { personName, type NightFilm, type NightState } from '@/lib/night';
import { MAX_POOL, MIN_POOL, type Spin, type WheelFilm } from '@/lib/wheel';
import { useToast } from '../AppShell';
import Reveal from '../wheelmo/Reveal';
import WheelStage from '../wheelmo/WheelStage';
import DemoBadge from '../community/DemoBadge';
import AddFilms from './AddFilms';
import { useRoomLive } from './useRoomLive';
import { useMoPage } from '../mo/MoProvider';

const IMG = 'https://image.tmdb.org/t/p';
const STEPS = [['lobby', 'Add films'], ['voting', 'Vote'], ['results', 'Results'], ['closed', 'Tonight’s film']] as const;
const HOW: Record<string, string> = { match: 'everyone said yes', decider: 'Match Decider', wheel: 'group wheel', host: 'host’s choice' };
const newId = () => crypto.randomUUID();
function sample<T>(list: T[], k: number): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) { const r = new Uint32Array(1); crypto.getRandomValues(r); const j = r[0] % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, k);
}
const asWheel = (f: NightFilm): WheelFilm => ({ tmdb_id: f.tmdb_id, title: f.title, year: f.year, poster_path: f.poster_path });
type Done = { ok: boolean; message?: string };

/* A Movie Night room. Everything shown comes from the database through night_state, so every screen agrees: the
   pool, who is here, how far each person has voted (never how), the results once the host shows them, and the
   same WheelMo spin with the same winner. */
export default function NightRoom({ initial, realtime }: { initial: NightState; realtime: { url: string; key: string } | null }) {
  const uid = useId();
  const toast = useToast();
  const { state: s, refresh, mode, online, gone } = useRoomLive(initial, realtime);
  useMoPage({ room: { code: s.code, title: s.title, status: s.status } });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [wheel, setWheel] = useState<'group' | 'decider' | null>(null);   // the host's wheel, before it spins
  const [chosen, setChosen] = useState<number[]>([]);
  const [revealed, setRevealed] = useState<Spin | null>(null);
  const [hidden, setHidden] = useState<string | null>(null);               // a spin this screen has put away
  const request = useRef<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 15_000); return () => clearInterval(t); }, []);

  const act = useCallback(async (key: string, run: () => Promise<Done>) => {
    setBusy(key); setError(null);
    const r = await run();
    setBusy(null);
    if (!r.ok) setError(r.message ?? 'That didn’t work. Try again.');
    await refresh();
    return r.ok;
  }, [refresh]);

  const films = s.candidates;
  const byId = useMemo(() => new Map(films.map((f) => [f.tmdb_id, f])), [films]);
  const inPool = useMemo(() => new Set(films.map((f) => f.tmdb_id)), [films]);
  const shortlist = s.shortlist ?? [];
  const host = s.participants.find((p) => p.role === 'host');
  const mine = films.filter((f) => f.my_vote !== null).length;

  /* The room's latest spin is shown on every screen while it is recent; a late joiner sees its result at once. */
  const spin = s.spin && s.status !== 'closed' && s.spin.id !== hidden && (s.spin.status === 'spinning' || now - new Date(s.spin.created_at).getTime() < 15 * 60_000) ? s.spin : null;
  useEffect(() => { if (spin) setWheel(null); }, [spin?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const openWheel = (kind: 'group' | 'decider') => {
    setHidden(s.spin?.id ?? null); setRevealed(null); setError(null);
    if (kind === 'decider') setChosen(shortlist);
    else {
      const ranked = s.status === 'results' ? [...films].sort((a, b) => (b.yes ?? 0) - (a.yes ?? 0)) : films;
      setChosen((s.status === 'results' ? ranked.slice(0, MAX_POOL) : films.length > MAX_POOL ? sample(films, MAX_POOL) : films).map((f) => f.tmdb_id));
    }
    setWheel(kind);
  };
  const doSpin = async (retry = false) => {
    if (!wheel || busy) return;
    if (!retry || !request.current) request.current = newId();
    const ok = await act('spin', () => spinNight(s.id, request.current!, wheel, chosen));
    if (ok) request.current = null;
  };

  const wheelFilms: WheelFilm[] = spin ? spin.pool : chosen.map((id) => byId.get(id)).filter((f): f is NightFilm => !!f).map(asWheel);
  const wheelKind = spin ? (spin.mode === 'decider' ? 'decider' : 'group') : wheel;
  const winner = revealed && spin && revealed.id === spin.id ? spin.pool[spin.winner_index] : null;
  const isHere = (id: string, seen: string) => online.has(id) || now - new Date(seen).getTime() < 90_000;
  const link = typeof window === 'undefined' ? '' : `${location.origin}/match/night/${s.code}`;

  if (gone) {
    return <div className="nr-gone"><p className="type-body">This Movie Night isn’t available to you any more.</p><Button href="/match/night" variant="primary">Your Movie Nights</Button></div>;
  }

  return (
    <div className="nr">
      <header className="nr-head">
        <p className="type-eyebrow nr-eyebrow">Movie Night{s.is_host ? ' · you’re hosting' : host ? ` · hosted by ${personName(host)}` : ''}</p>
        <h1 className="type-display-lg nr-title">{s.title}</h1>
        <div className="nr-code">
          <p className="type-body">Room code <strong className="nr-code-value" aria-label={s.code.split('').join(' ')}>{s.code}</strong></p>
          <Button variant="secondary" size="sm" icon="copy" onClick={async () => {
            try { await navigator.clipboard.writeText(link); toast({ icon: 'check', message: 'Invite link copied' }); } catch { toast({ tone: 'negative', message: `Copy didn’t work. The code is ${s.code}.` }); }
          }}>Copy invite link</Button>
          <span className={`nr-live type-caption${mode === 'live' ? ' is-live' : ''}`} role="status">
            <Icon name={mode === 'live' ? 'check' : mode === 'polling' ? 'wifi-off' : 'loader-circle'} size={14} />
            {mode === 'live' ? 'Live' : mode === 'polling' ? 'Updating every few seconds' : 'Connecting…'}
          </span>
        </div>
        <ol className="nr-steps" aria-label="Movie Night steps">
          {STEPS.map(([id, label], i) => {
            const at = STEPS.findIndex(([x]) => x === s.status);
            return <li key={id} className={`type-label${i < at ? ' is-done' : ''}`} aria-current={id === s.status ? 'step' : undefined}><span aria-hidden="true">{i + 1}</span>{label}</li>;
          })}
        </ol>
      </header>

      <section className="nr-people" aria-labelledby={`${uid}-people`}>
        <h2 id={`${uid}-people`} className="type-label">In the room ({s.participants.length})</h2>
        <ul role="list">
          {s.participants.map((p) => (
            <li key={p.user_id} className="nr-person">
              <Avatar name={personName(p)} src={p.avatar_url ?? undefined} size="sm" />
              <span className="type-body">{personName(p)}{p.user_id === s.me ? ' (you)' : ''}</span>
              {p.role === 'host' ? <span className="nr-tag type-caption">Host</span> : null}
              {p.is_demo ? <DemoBadge compact /> : null}
              <span className={`nr-here type-caption${isHere(p.user_id, p.last_seen) ? ' is-here' : ''}`}>{isHere(p.user_id, p.last_seen) ? 'Here now' : 'Away'}</span>
              {s.status === 'voting' ? <span className="type-caption vm-muted">voted on {p.votes_cast} of {films.length}</span> : null}
            </li>
          ))}
        </ul>
        {s.participants.length < 2 ? <p className="type-caption vm-muted">Share the code or the invite link; friends join with their own accounts.</p> : null}
      </section>

      {error ? <p className="nr-error type-body" role="alert">{error}{busy === null && request.current ? <> <button type="button" className="fd-link" onClick={() => doSpin(true)}>Try the spin again</button></> : null}</p> : null}

      {s.status === 'closed' ? <Tonight s={s} /> : null}

      {s.status === 'lobby' ? (
        <section className="nr-stage" aria-labelledby={`${uid}-pool`}>
          <div className="nr-stage-head">
            <h2 id={`${uid}-pool`} className="type-heading-md">The pool ({films.length})</h2>
            {s.is_host ? (
              <div className="nr-row">
                <Button variant="primary" icon="check" busy={busy === 'voting'} disabled={films.length < 2} onClick={() => act('voting', () => setStage(s.id, 'voting'))}>Start voting</Button>
                <Button variant="secondary" icon="rotate-cw" disabled={films.length < MIN_POOL} onClick={() => openWheel('group')}>Spin a group wheel</Button>
              </div>
            ) : <p className="type-caption vm-muted">Add films; the host starts the vote when everyone’s ready.</p>}
          </div>
          {s.is_host && films.length < 2 ? <p className="type-caption vm-muted">Add at least two films to start voting.</p> : null}
          <FilmList films={films} render={(f) => (f.mine || s.is_host) ? (
            <Button variant="ghost" size="sm" icon="trash-2" disabled={busy !== null} onClick={() => act(`rm-${f.tmdb_id}`, () => removeFilm(s.id, f.tmdb_id))}>Remove<span className="vm-sr"> {f.title}</span></Button>
          ) : null} who={(f) => s.participants.find((p) => p.user_id === f.added_by)} />
          <AddFilms night={s.id} inPool={inPool} onAdded={(m) => { toast({ icon: 'check', message: m }); void refresh(); }} />
        </section>
      ) : null}

      {s.status === 'voting' ? (
        <section className="nr-stage" aria-labelledby={`${uid}-vote`}>
          <div className="nr-stage-head">
            <h2 id={`${uid}-vote`} className="type-heading-md">Would you watch it tonight?</h2>
            <p className="type-body vm-muted">Your votes are private: nobody, not even the host, sees how you voted. When the host shows the results, the room sees totals and the films everyone said yes to.</p>
            <p className="type-label" role="status">You’ve voted on {mine} of {films.length}.</p>
          </div>
          <FilmList films={films} who={() => undefined} render={(f) => (
            <div className="nr-vote" role="group" aria-label={`Your vote on ${f.title}`}>
              <button type="button" className={`nr-vote-btn type-label${f.my_vote === true ? ' is-yes' : ''}`} aria-pressed={f.my_vote === true} disabled={busy !== null}
                onClick={() => act(`v-${f.tmdb_id}`, () => vote(s.id, f.tmdb_id, true))}><Icon name="check" size={16} />Yes</button>
              <button type="button" className={`nr-vote-btn type-label${f.my_vote === false ? ' is-no' : ''}`} aria-pressed={f.my_vote === false} disabled={busy !== null}
                onClick={() => act(`v-${f.tmdb_id}`, () => vote(s.id, f.tmdb_id, false))}><Icon name="x" size={16} />No</button>
            </div>
          )} />
          {s.is_host ? (
            <div className="nr-row">
              <Button variant="primary" busy={busy === 'results'} disabled={s.voters === 0} onClick={() => act('results', () => setStage(s.id, 'results'))}>Show the results</Button>
              <Button variant="ghost" icon="undo-2" disabled={busy !== null} onClick={() => act('lobby', () => setStage(s.id, 'lobby'))}>Back to adding films</Button>
              {s.voters === 0 ? <p className="type-caption vm-muted nr-full">Results open once someone has voted.</p> : null}
            </div>
          ) : <p className="type-caption vm-muted">The host shows the results when everyone’s done.</p>}
        </section>
      ) : null}

      {s.status === 'results' ? (
        <section className="nr-stage" aria-labelledby={`${uid}-res`}>
          <div className="nr-stage-head">
            <h2 id={`${uid}-res`} className="type-heading-md">Results</h2>
            <p className="type-body" role="status">{
              shortlist.length === 0 ? `No film got a yes from all ${s.voters} ${s.voters === 1 ? 'voter' : 'voters'}.`
              : shortlist.length === 1 ? `It’s a match: all ${s.voters} ${s.voters === 1 ? 'voter' : 'voters'} said yes to ${byId.get(shortlist[0])?.title}.`
              : `${shortlist.length} films got a yes from all ${s.voters} voters.`}</p>
            <p className="type-caption vm-muted">Totals only; nobody’s individual votes are shown.</p>
          </div>
          <ol role="list" className="nr-tally">
            {[...films].sort((a, b) => (b.yes ?? 0) - (a.yes ?? 0) || (a.no ?? 0) - (b.no ?? 0)).map((f) => (
              <li key={f.tmdb_id} className={shortlist.includes(f.tmdb_id) ? 'is-everyone' : ''}>
                <span className="nr-thumb"><Poster src={f.poster_path ? `${IMG}/w92${f.poster_path}` : null} title={f.title} size="fill" /></span>
                <span className="type-body nr-tally-title">{f.title}{f.year ? ` (${f.year})` : ''}{shortlist.includes(f.tmdb_id) ? <span className="nr-tag type-caption">Everyone said yes</span> : null}</span>
                <span className="type-caption nr-tally-n">{f.yes} yes · {f.no} no</span>
                {s.is_host ? <Button variant="ghost" size="sm" disabled={busy !== null} onClick={() => act('pick', () => confirmPick(s.id, f.tmdb_id, shortlist.length === 1 && shortlist[0] === f.tmdb_id ? 'match' : 'host'))}>Choose<span className="vm-sr"> {f.title}</span></Button> : null}
              </li>
            ))}
          </ol>
          {s.is_host ? (
            <div className="nr-row">
              {shortlist.length === 1 ? <Button variant="primary" icon="check" busy={busy === 'pick'} onClick={() => act('pick', () => confirmPick(s.id, shortlist[0], 'match'))}>Make it tonight’s film</Button> : null}
              {shortlist.length >= MIN_POOL && shortlist.length <= MAX_POOL ? <Button variant="primary" icon="rotate-cw" onClick={() => openWheel('decider')}>Match Decider: spin the {shortlist.length} everyone accepted</Button> : null}
              <Button variant="secondary" icon="rotate-cw" onClick={() => openWheel('group')}>Spin a group wheel</Button>
              <Button variant="ghost" icon="undo-2" disabled={busy !== null} onClick={() => act('voting', () => setStage(s.id, 'voting'))}>Vote again</Button>
            </div>
          ) : null}
          {shortlist.length > MAX_POOL ? <p className="type-caption vm-muted">That’s more than WheelMo holds ({MAX_POOL}). The host can reopen voting, or choose a film.</p> : null}
        </section>
      ) : null}

      {(wheel && s.is_host) || spin ? (
        <section className="wm nr-wheel" aria-labelledby={`${uid}-wheel`}>
          <header className="wm-head">
            <p className="type-eyebrow wm-eyebrow">{wheelKind === 'decider' ? 'Match Decider' : 'Group wheel'}</p>
            <h2 id={`${uid}-wheel`} className="wm-title">{wheelKind === 'decider' ? 'Between the films you all said yes to' : 'A random pick from the room’s films'}</h2>
            <p className="type-body wm-muted">{wheelKind === 'decider'
              ? `Every film on this reel got a yes from everyone who voted. Each has a 1 in ${wheelFilms.length} chance; the database picks before the reel moves, and everyone sees the same result.`
              : `This isn’t a vote and doesn’t mean everyone agreed: it’s a fair random pick between the ${wheelFilms.length} films on the reel, each with a 1 in ${wheelFilms.length} chance. Everyone sees the same result.`}</p>
          </header>
          {!spin && wheel === 'group' && films.length > MAX_POOL ? (
            <details className="nr-choose">
              <summary className="type-label">Choose the {MAX_POOL} films ({chosen.length} on the reel)</summary>
              <ul role="list" className="wm-pick">
                {films.map((f) => {
                  const on = chosen.includes(f.tmdb_id);
                  return <li key={f.tmdb_id}><label className="option"><input type="checkbox" checked={on} disabled={!on && chosen.length >= MAX_POOL} onChange={() => setChosen(on ? chosen.filter((x) => x !== f.tmdb_id) : [...chosen, f.tmdb_id])} /><span className="type-body">{f.title}</span></label></li>;
                })}
              </ul>
            </details>
          ) : null}
          <WheelStage films={wheelFilms} spin={spin} busy={busy === 'spin'} canSpin={s.is_host && !spin && wheelFilms.length >= MIN_POOL}
            cantSpinReason={!s.is_host ? 'Only the host spins. You’ll see the same result here at the same moment.' : wheelFilms.length < MIN_POOL ? 'Put at least two films on the reel.' : undefined}
            onSpin={() => doSpin(false)} onRevealed={setRevealed} spinLabel={wheelKind === 'decider' ? 'Spin Match Decider' : 'Spin for the room'} />
          {!spin && s.is_host ? <div className="nr-row"><Button variant="ghost" onClick={() => setWheel(null)}>Close the reel</Button></div> : null}
        </section>
      ) : null}

      {winner && spin ? (
        <Reveal key={spin.id} film={winner} reduced={false}
          againLabel="Spin again (everyone sees it)"
          onAgain={s.is_host ? () => { const kind = spin.mode === 'decider' ? 'decider' : 'group'; setChosen(spin.pool.map((f) => f.tmdb_id)); setHidden(spin.id); setRevealed(null); setWheel(kind); } : undefined}
          onReset={() => { setHidden(spin.id); setRevealed(null); }}
          extra={s.is_host ? (
            <Button variant="primary" icon="ticket" busy={busy === 'confirm'} onClick={() => act('confirm', () => confirmPick(s.id, winner.tmdb_id, spin.mode === 'decider' ? 'decider' : 'wheel', spin.id))}>Make it tonight’s film</Button>
          ) : <p className="type-caption wm-muted">The host confirms tonight’s film.</p>} />
      ) : null}
    </div>
  );
}

function FilmList({ films, render, who }: { films: NightFilm[]; render: (f: NightFilm) => React.ReactNode; who: (f: NightFilm) => { display_name: string | null; username: string } | undefined }) {
  if (!films.length) return <p className="type-body vm-muted">No films yet.</p>;
  return (
    <ul role="list" className="nr-films">
      {films.map((f) => {
        const by = who(f);
        return (
          <li key={f.tmdb_id} className="nr-film">
            <a href={`/film/${f.tmdb_id}`} className="nr-film-poster" tabIndex={-1} aria-hidden="true"><Poster src={f.poster_path ? `${IMG}/w185${f.poster_path}` : null} title={f.title} size="fill" /></a>
            <div className="nr-film-body">
              <a href={`/film/${f.tmdb_id}`} className="type-label nr-film-title">{f.title}</a>
              <span className="type-caption vm-muted">{[f.year, f.runtime ? `${f.runtime} min` : null].filter(Boolean).join(' · ')}</span>
              {by ? <span className="type-caption vm-muted">Added by {personName(by)}{f.source === 'surprise' ? ' (surprise)' : ''}</span> : null}
              {render(f)}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Tonight({ s }: { s: NightState }) {
  const f = s.candidates.find((c) => c.tmdb_id === s.pick_tmdb_id);
  const pick = s.picks[0];
  return (
    <section className="nr-tonight" aria-labelledby="nr-tonight-h">
      {f ? <span className="nr-tonight-poster"><Poster src={f.poster_path ? `${IMG}/w342${f.poster_path}` : null} title={f.title} size="fill" eager /></span> : null}
      <div className="nr-stack">
        <p className="type-eyebrow nr-eyebrow">Tonight’s film</p>
        <h2 id="nr-tonight-h" className="type-display-md">{pick?.title ?? f?.title ?? 'Chosen'}</h2>
        {pick ? <p className="type-body vm-muted">Chosen by {HOW[pick.how]}.</p> : null}
        <div className="nr-row">
          {s.pick_tmdb_id ? <Button href={`/film/${s.pick_tmdb_id}`} variant="primary" icon="film">Open the film</Button> : null}
          <Button href="/match/night" variant="secondary">Start another Movie Night</Button>
        </div>
      </div>
    </section>
  );
}
