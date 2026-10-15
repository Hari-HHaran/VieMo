'use client';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Button, ErrorState, FilterChip, Icon, Poster, Rating } from '@/ds/client';
import type { DirectorResult, Slot } from '@/lib/director';
import { runtimeLabel } from '@/lib/format';
import { RUNTIMES } from '@/lib/moods';
import { SPRING, stagger } from '@/lib/motion';
import SaveToggle from './SaveToggle';

const IMG = 'https://image.tmdb.org/t/p';
const KEY = 'viemo:director';
const SLOTS: Record<Slot, { label: string; scene: string }> = {
  safe: { label: 'Safe choice', scene: 'Scene 1' }, wildcard: { label: 'Wildcard', scene: 'Scene 2' }, gem: { label: 'Hidden gem', scene: 'Scene 3' },
};
const EXAMPLES = ['Something cosy but clever for a rainy night', 'A thriller that isn’t too violent', 'Make me cry, in a good way', 'Fun for me and my parents'];
const PROBLEMS: Record<string, { title: string; body: string }> = {
  key: { title: 'OpenAI didn’t accept the key', body: 'The OPENAI_API_KEY on this server was rejected. Check it in Vercel’s environment variables, then redeploy.' },
  quota: { title: 'The OpenAI account is out of credit', body: 'Add credit or raise the limit on platform.openai.com, then try again.' },
  rate_limited: { title: 'Too many requests just now', body: 'Wait a minute and try again. Your brief is kept.' },
  tmdb_config: { title: 'Film data isn’t connected', body: 'Reel Director only picks from real TMDB films, and this server has no TMDB token or snapshot.' },
  tmdb: { title: 'Films didn’t load', body: 'We couldn’t reach TMDB to build the list Reel Director picks from. Your brief is kept.' },
  no_picks: { title: 'No picks we could check', body: 'The suggestions didn’t match real films in the list, so none are shown. Try again or reword your brief.' },
  refused: { title: 'Reel Director couldn’t help with that brief', body: 'Try describing the night you want: mood, company, what you loved recently.' },
};
interface Saved { brief: string; runtime: string; result: DirectorResult | null }

/* Describe the night in your own words; Reel Director storyboards three real films: a safe choice, a wildcard
   and a hidden gem. The AI writes the picks and reasons; every fact on a card comes from TMDB. */
export default function ReelDirector() {
  const [brief, setBrief] = useState('');
  const [runtime, setRuntime] = useState('any');
  const [result, setResult] = useState<DirectorResult | null>(null);
  const [status, setStatus] = useState<'idle' | 'working' | 'error'>('idle');
  const [error, setError] = useState('upstream');
  const headRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    try { const v = JSON.parse(sessionStorage.getItem(KEY) || 'null') as Saved | null; if (v) { setBrief(v.brief); setRuntime(v.runtime); setResult(v.result); } } catch {}
  }, []);
  const remember = (v: Saved) => { try { sessionStorage.setItem(KEY, JSON.stringify(v)); } catch {} };

  async function direct(e?: React.FormEvent) {
    e?.preventDefault();
    if (brief.trim().length < 3 || status === 'working') return;
    setStatus('working');
    try {
      const res = await fetch('/api/director', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ brief, runtime }) });
      const body = await res.json().catch(() => ({ error: 'upstream' }));
      if (!res.ok) throw new Error(body.error || 'upstream');
      setResult(body); setStatus('idle'); remember({ brief, runtime, result: body });
      requestAnimationFrame(() => headRef.current?.focus());
    } catch (err) {
      setError((err as Error).message); setStatus('error');
    }
  }

  const problem = PROBLEMS[error] ?? { title: 'Reel Director didn’t answer', body: 'OpenAI or TMDB didn’t respond in time. Your brief is kept; try again.' };

  return (
    <div className="director">
      <form className="director-brief" onSubmit={direct}>
        <label htmlFor="brief" className="type-label">Describe your night</label>
        <textarea id="brief" className="director-input type-body-lg" rows={3} maxLength={300} value={brief} onChange={(e) => setBrief(e.target.value)}
          placeholder="Who’s watching, the mood, something you loved lately…" aria-describedby="brief-help"
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) direct(); }} />
        <p id="brief-help" className="type-caption vm-muted">{brief.length}/300. Don’t include personal details; your brief is sent to OpenAI to choose films.</p>
        <div className="chip-row" role="group" aria-label="Examples">
          {EXAMPLES.map((x) => <button key={x} type="button" className="director-example type-caption" onClick={() => setBrief(x)}>{x}</button>)}
        </div>
        <fieldset className="qp-group">
          <legend className="type-label">Length</legend>
          <div className="chip-row">
            {RUNTIMES.map((r) => <FilterChip key={r.id} label={r.label} state={runtime === r.id ? 'on' : 'off'} onChange={() => setRuntime(r.id)} />)}
          </div>
        </fieldset>
        <Button variant="primary" size="lg" icon="clapperboard" type="submit" busy={status === 'working'} disabled={brief.trim().length < 3} className="director-go">
          {status === 'working' ? 'Storyboarding…' : result ? 'Direct again' : 'Direct my night'}
        </Button>
      </form>

      <div aria-live="polite" className="vm-sr">{status === 'working' ? 'Reel Director is choosing three films.' : result && status === 'idle' ? `${result.picks.length} picks ready.` : ''}</div>

      {status === 'working' ? (
        <div className="storyboard is-drawing" aria-hidden="true">
          {(['safe', 'wildcard', 'gem'] as Slot[]).map((s, i) => (
            <div key={s} className="frame frame-sketch" style={{ ['--i' as string]: i }}><span className="frame-scene type-eyebrow">{SLOTS[s].scene}</span><span className="frame-sketch-poster" /><span className="frame-sketch-line" /><span className="frame-sketch-line short" /></div>
          ))}
        </div>
      ) : status === 'error' ? (
        <ErrorState icon="triangle-alert" title={problem.title} body={problem.body} onRetry={() => direct()} />
      ) : result ? (
        <section className="storyboard-wrap" aria-labelledby="sb-h">
          <div className="storyboard-head">
            <h2 id="sb-h" ref={headRef} tabIndex={-1} className="type-display-md">Tonight’s storyboard</h2>
            <p className="type-caption vm-faint">{result.caption}</p>
          </div>
          <ol className="storyboard" role="list">
            <AnimatePresence initial>
              {result.picks.map((p, i) => (
                <motion.li key={`${p.slot}-${p.film.id}`} className={`frame frame-${p.slot}`} initial={{ opacity: 0, y: 24, rotate: i === 1 ? 1.2 : -1.2 }}
                  animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ ...SPRING.reveal, delay: stagger(i) * 3 }}>
                  <p className="frame-scene type-eyebrow"><span>{SLOTS[p.slot].scene}</span><span className="frame-slot">{SLOTS[p.slot].label}</span></p>
                  <a className="frame-poster" href={`/film/${p.film.id}`} tabIndex={-1} aria-hidden="true">
                    <Poster src={p.film.posterPath ? `${IMG}/w342${p.film.posterPath}` : null} title={p.film.title} year={p.film.year} size="fill" />
                  </a>
                  <h3 className="type-heading-lg frame-title"><a href={`/film/${p.film.id}`}>{p.film.title}</a>{p.film.year ? <span className="type-caption vm-muted"> {p.film.year}</span> : null}</h3>
                  <p className="type-caption vm-muted">{[runtimeLabel(p.film.runtime), p.film.genres.slice(0, 3).join(', ')].filter(Boolean).join(' · ')}</p>
                  {p.film.voteCount ? <Rating value={p.film.voteAverage} source="tmdb" count={p.film.voteCount} /> : null}
                  <blockquote className="frame-why type-body"><Icon name="clapperboard" size={14} />{p.why}</blockquote>
                  <p className="type-caption vm-muted frame-where"><Icon name="tv" size={14} />{p.film.providers.length ? `Streaming on ${p.film.providers.join(', ')}` : 'Not streaming in your region right now'}</p>
                  <div className="frame-actions">
                    <Button variant="secondary" size="sm" icon="film" href={`/film/${p.film.id}`}>See the film</Button>
                    <SaveToggle film={{ id: p.film.id, title: p.film.title, year: p.film.year, posterPath: p.film.posterPath }} label="text" />
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ol>
          <details className="qp-how">
            <summary className="type-label">How Reel Director works</summary>
            <p className="type-caption vm-muted">
              Your brief and a list of films from TMDB’s current lists (popular films for every mood, trending and hidden gems) are sent to OpenAI ({result.model}).
              It picks three by id and writes the short reasons; VieMo then checks each pick is a real film from that list and drops any that aren’t.
              A hidden gem must be rated 7 or higher on TMDB by 300 to 3,000 voters. Titles, years, runtimes, ratings and where to watch come from TMDB and JustWatch, not from the AI.
            </p>
          </details>
        </section>
      ) : null}
    </div>
  );
}
