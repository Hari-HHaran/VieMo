'use client';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { animate, AnimatePresence, motion, useMotionValue } from 'motion/react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Icon, Poster } from '@/ds/client';
import { useDiary } from '@/lib/diary';
import { useWatchlist } from '@/lib/device-store';
import { describeAction, MO_PAGES, type FilmRef, type MoAction, type MoEvent, type MoPageContext } from '@/lib/mo/shared';
import { prefersLessMotion, SPRING } from '@/lib/motion';
import MoFace, { type MoState } from './MoFace';
import { useMoControl } from './MoProvider';
import { useMoActions } from './useMoActions';

const SIZE = 60, MARGIN = 16, POS_KEY = 'viemo:mo-pos', CHAT_KEY = 'viemo:mo-chat';
type Side = 'left' | 'right';
interface Pos { side: Side; y: number }
type CardState = 'pending' | 'running' | 'done' | 'cancelled' | 'failed';
interface Card { id: string; action: MoAction; state: CardState; result?: string }
interface Msg { id: string; from: 'you' | 'mo'; text: string; note?: boolean; status?: string; films?: FilmRef[]; sources?: { label: string; url: string }[]; cards?: Card[] }
const IMG = 'https://image.tmdb.org/t/p';
const newId = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/* The page's name for Mo, from the address. */
function pageName(path: string): string {
  if (path.startsWith('/film/')) return 'a film page';
  if (path.startsWith('/match/night/')) return 'a Movie Night room';
  if (path.startsWith('/c/')) return 'a collection';
  if (path.startsWith('/u/')) return 'a member profile';
  const hit = (Object.keys(MO_PAGES) as (keyof typeof MO_PAGES)[]).filter((k) => !k.includes('?') && (k === '/' ? path === '/' : path.startsWith(k))).sort((a, b) => b.length - a.length)[0];
  return hit ? MO_PAGES[hit] : 'VieMo';
}
/* What a card's outcome adds to the conversation, so Mo knows what was confirmed. */
const cardNote = (c: Card) => `[Card: ${describeAction(c.action).summary} ${c.state === 'done' ? 'The person confirmed it; it is done.' : c.state === 'cancelled' ? 'The person cancelled it.' : c.state === 'failed' ? `It failed: ${c.result}` : 'Not confirmed yet.'}]`;
const DEFAULT_POS: Pos = { side: 'right', y: 0.62 };


/* Mo, the movie companion, on every page. It knows which page you're on (and the film, place, room or collection
   in view), answers from TMDB and VieMo's own records with sources, and can offer to do things, each as a card
   that only runs when you press its button.
   On desktop you can drag Mo anywhere; letting go snaps it to the nearest side and it remembers where. On phones
   it sits docked above the tab bar. The menu in the chat header moves it without dragging. Mo only takes focus
   when you open it. */
export default function Mo() {
  const { extra, ask } = useMoControl();
  const pathname = usePathname();
  const search = useSearchParams();
  const { list: watchlist } = useWatchlist();
  const { items: watched } = useDiary();
  const runAction = useMoActions();
  const abort = useRef<AbortController | null>(null);
  const log = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);
  const [compact, setCompact] = useState(true);
  const [pos, setPos] = useState<Pos>(DEFAULT_POS);
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const [busy, setBusy] = useState<'idle' | 'thinking' | 'error'>('idle');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState('');
  const [spoilerFree, setSpoilerFree] = useState(true);
  const [moveMenu, setMoveMenu] = useState(false);
  const [docked, setDocked] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const x = useMotionValue(0), y = useMotionValue(0);
  const btn = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const moveBtn = useRef<HTMLButtonElement>(null);
  const dragged = useRef(false);
  const titleId = useId();

  const bounds = useCallback(() => {
    const top = innerWidth >= 768 ? 96 : 16, bottom = innerHeight - SIZE - (innerWidth >= 768 ? 24 : 88);
    return { top, bottom: Math.max(top, bottom), left: MARGIN, right: innerWidth - SIZE - MARGIN };
  }, []);
  const place = useCallback((p: Pos, smooth: boolean) => {
    const b = bounds();
    const tx = p.side === 'left' ? b.left : b.right, ty = Math.min(b.bottom, Math.max(b.top, p.y * innerHeight));
    if (smooth && !prefersLessMotion()) { animate(x, tx, SPRING.standard); animate(y, ty, SPRING.standard); } else { x.set(tx); y.set(ty); }
  }, [bounds, x, y]);

  useEffect(() => {
    const narrow = () => setCompact(innerWidth < 768 || matchMedia('(pointer: coarse)').matches);
    narrow();
    let saved = DEFAULT_POS;
    try { const v = JSON.parse(localStorage.getItem(POS_KEY) || 'null'); if (v && (v.side === 'left' || v.side === 'right') && typeof v.y === 'number') saved = v; } catch {}
    try { const m = JSON.parse(sessionStorage.getItem(CHAT_KEY) || '[]'); if (Array.isArray(m)) setMsgs(m.slice(-40)); } catch {}
    setPos(saved); place(saved, false);
    const onResize = () => { narrow(); setPos((p) => { place(p, false); return p; }); };
    addEventListener('resize', onResize);
    return () => removeEventListener('resize', onResize);
  }, [place]);
  useEffect(() => { try { sessionStorage.setItem(CHAT_KEY, JSON.stringify(msgs.slice(-40))); } catch {} }, [msgs]);

  /* After a while untouched, Mo tucks half into its edge; hover or focus brings it back. */
  useEffect(() => {
    if (open || hover || compact) { setDocked(false); return; }
    const t = setTimeout(() => setDocked(true), 9000);
    return () => clearTimeout(t);
  }, [open, hover, compact, msgs.length]);

  /* Pages keep their panels out of Mo's lane: the side Mo is docked on is published on <html>. */
  useEffect(() => {
    const el = document.documentElement;
    el.dataset.moSide = compact ? 'compact' : pos.side;
    return () => { delete el.dataset.moSide; };
  }, [compact, pos.side]);

  const save = (p: Pos) => { setPos(p); place(p, true); try { localStorage.setItem(POS_KEY, JSON.stringify(p)); } catch {} };
  const reset = () => { save(DEFAULT_POS); };

  const openChat = useCallback((prefill?: string) => {
    setOpen(true); setDocked(false);
    if (prefill) setDraft(prefill);
    setTimeout(() => input.current?.focus(), 0);
  }, []);
  const close = () => { setOpen(false); setMoveMenu(false); requestAnimationFrame(() => btn.current?.focus()); };
  useEffect(() => { if (ask) openChat(ask.text); }, [ask, openChat]);
  /* Escape closes the chat from anywhere inside it, or from Mo itself. */
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const a = document.activeElement;
      if (!a || a === document.body || a === btn.current || document.getElementById(titleId)?.contains(a)) { e.preventDefault(); close(); }
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const context = (): MoPageContext => {
    const moods = (search.get('moods') ?? search.get('mood') ?? '').split(',').filter(Boolean).slice(0, 4);
    const filmId = Number(pathname.match(/^\/film\/(\d+)/)?.[1]);
    return {
      path: pathname + (search.size ? `?${search}` : ''), page: pageName(pathname),
      film: extra.film ?? (filmId ? { id: filmId, title: 'this film' } : null), location: extra.location ?? null,
      moods: pathname.startsWith('/discover') ? moods : [], room: extra.room ?? null, collection: extra.collection ?? null,
      member: extra.member ?? (pathname.match(/^\/u\/([^/?]+)/)?.[1] ?? null),
    };
  };

  /* Sends the conversation and streams Mo's reply into the last message: text as it's written, then film cards,
     sources and any action cards. */
  const send = async (text: string) => {
    const t = text.trim();
    if (!t || busy === 'thinking') return;
    const mine: Msg = { id: newId(), from: 'you', text: t };
    const reply: Msg = { id: newId(), from: 'mo', text: '', status: 'Thinking…' };
    const history = [...msgs, mine];
    pinned.current = true;
    setMsgs([...history, reply]);
    setDraft(''); setBusy('thinking');
    const patch = (f: (m: Msg) => Msg) => setMsgs((all) => all.map((m) => (m.id === reply.id ? f(m) : m)));
    const ctl = new AbortController(); abort.current = ctl;
    try {
      const r = await fetch('/api/mo', {
        method: 'POST', headers: { 'content-type': 'application/json' }, signal: ctl.signal,
        body: JSON.stringify({
          spoilerFree, context: context(),
          messages: history.filter((m) => !m.note).slice(-14).map((m) => ({ role: m.from === 'you' ? 'user' : 'assistant', text: [m.text, ...(m.cards ?? []).map(cardNote)].filter(Boolean).join('\n') })),
          device: {
            watchlist: watchlist.slice(0, 60).map((f) => ({ id: f.id, title: f.title, year: f.year ?? null })),
            watched: watched.slice(0, 30).map((w) => ({ id: w.film.id, title: w.film.title, rating: w.rating, on: w.lastWatched })),
          },
        }),
      });
      if (!r.body) throw new Error('no body');
      const reader = r.body.getReader(); const dec = new TextDecoder(); let buf = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, nl); buf = buf.slice(nl + 1);
          let e: MoEvent; try { e = JSON.parse(line); } catch { continue; }
          if (e.t === 'status') patch((m) => ({ ...m, status: e.text }));
          else if (e.t === 'text') { setSpeaking(true); patch((m) => ({ ...m, text: m.text + e.d, status: undefined })); }
          else if (e.t === 'films') patch((m) => ({ ...m, films: [...(m.films ?? []), ...e.items.filter((f) => !m.films?.some((x) => x.id === f.id))].slice(0, 8) }));
          else if (e.t === 'sources') patch((m) => ({ ...m, sources: [...(m.sources ?? []), ...e.items.filter((s) => !m.sources?.some((x) => x.url === s.url))].slice(0, 6) }));
          else if (e.t === 'action') patch((m) => ({ ...m, cards: [...(m.cards ?? []), { id: e.id, action: e.action, state: 'pending' }] }));
          else if (e.t === 'error') { patch((m) => ({ ...m, note: true, status: undefined, text: e.message })); setBusy('error'); }
        }
      }
      setBusy((b) => (b === 'error' ? 'error' : 'idle'));
    } catch {
      if (ctl.signal.aborted) { patch((m) => ({ ...m, status: undefined, text: m.text || 'Stopped.', note: !m.text })); setBusy('idle'); }
      else { patch((m) => ({ ...m, note: true, status: undefined, text: 'Mo couldn’t be reached. Check your connection and try again.' })); setBusy('error'); }
    } finally {
      abort.current = null;
      patch((m) => ({ ...m, status: undefined }));
      setTimeout(() => setSpeaking(false), 1200);
    }
  };
  const stop = () => { abort.current?.abort(); };
  /* The newest message stays in view while it streams, unless you've scrolled up to read something. */
  useEffect(() => { const el = log.current; if (el && pinned.current) el.scrollTop = el.scrollHeight; }, [msgs, open]);
  useEffect(() => { if (busy !== 'error') return; const t = setTimeout(() => setBusy('idle'), 4000); return () => clearTimeout(t); }, [busy]);

  /* A card runs only here, when its button is pressed. */
  const setCard = (msgId: string, cardId: string, c: Partial<Card>) =>
    setMsgs((all) => all.map((m) => (m.id === msgId ? { ...m, cards: m.cards?.map((x) => (x.id === cardId ? { ...x, ...c } : x)) } : m)));
  const confirm = async (msgId: string, card: Card) => {
    setCard(msgId, card.id, { state: 'running' });
    try {
      const r = await runAction(card.action);
      setCard(msgId, card.id, { state: r.ok ? 'done' : 'failed', result: r.message });
    } catch { setCard(msgId, card.id, { state: 'failed', result: 'That didn’t work. Try again.' }); }
  };

  const state: MoState = busy === 'error' ? 'error' : busy === 'thinking' ? 'thinking' : speaking ? 'responding' : open ? 'listening' : hover ? 'hover' : docked ? 'docked' : 'idle';
  const ctxNow = context();
  const suggestions = ctxNow.location && !ctxNow.location.sample ? [`What was filmed at ${ctxNow.location.name}?`, `Why was ${ctxNow.location.name} chosen?`]
    : ctxNow.film && ctxNow.film.title !== 'this film' ? [`Where can I watch ${ctxNow.film.title}?`, 'Who directed it?', 'Add it to my watchlist']
    : ctxNow.film ? ['Where can I watch this?', 'Who directed it?', 'Add it to my watchlist']
    : ctxNow.room ? ['How does Match Decider work?', 'Suggest a film everyone might like']
    : pathname.startsWith('/discover') ? ['Something funny and under two hours', 'What’s trending this week?']
    : pathname.startsWith('/match') ? ['Spin WheelMo with my watchlist', 'Start a Movie Night']
    : pathname.startsWith('/profile') || pathname.startsWith('/wall') ? ['What should I watch next from my watchlist?', 'What have I rated highest?']
    : pathname.startsWith('/atlas') ? ['What films were shot in Iceland?', 'How do you check filming locations?']
    : ['What’s trending this week?', 'Recommend something comforting', 'Start a Movie Night'];
  const side: Side = compact ? 'right' : pos.side;

  return (
    <>
      <motion.button ref={btn} type="button" className={`mo${compact ? ' is-compact' : ''}${docked && !open ? ` is-docked is-${side}` : ''}`}
        style={compact ? undefined : { x, y }} drag={!compact} dragMomentum={false} dragElastic={0.1}
        onDragStart={() => { dragged.current = true; setDocked(false); }}
        onDragEnd={() => {
          const b = bounds();
          const cx = x.get() + SIZE / 2;
          save({ side: cx < innerWidth / 2 ? 'left' : 'right', y: Math.min(b.bottom, Math.max(b.top, y.get())) / innerHeight });
          setTimeout(() => { dragged.current = false; }, 0);
        }}
        onClick={() => { if (dragged.current) return; if (open) close(); else openChat(); }}
        onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)} onFocus={() => setHover(true)} onBlur={() => setHover(false)}
        whileTap={{ scale: 0.92 }} aria-expanded={open} aria-controls={titleId} aria-label={open ? 'Close chat with Mo' : 'Chat with Mo, your movie companion'}>
        <MoFace state={state} size={compact ? 52 : SIZE} />
      </motion.button>

      <AnimatePresence>
        {open ? (
          <motion.div id={titleId} className={`mo-chat${compact ? ' is-sheet' : ` is-${side}`}`} role="dialog" aria-modal={compact ? true : undefined} aria-label="Chat with Mo"
            initial={{ opacity: 0, y: compact ? 40 : 16, scale: compact ? 1 : 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: compact ? 40 : 12, scale: compact ? 1 : 0.97, transition: { duration: 0.16, ease: [0.4, 0, 1, 1] } }} transition={SPRING.reveal}
>
            <header className="mo-chat-head">
              <MoFace state={state} size={36} />
              <div className="mo-chat-title"><p>Mo</p><span>Your movie companion</span></div>
              <label className="mo-switch">
                <input type="checkbox" checked={spoilerFree} onChange={(e) => setSpoilerFree(e.target.checked)} />
                <span>Spoiler-free</span>
              </label>
              {!compact ? (
                <div className="mo-move">
                  <button ref={moveBtn} type="button" className="atlas-icon-btn" aria-expanded={moveMenu} aria-label="Move Mo" onClick={() => setMoveMenu((v) => !v)}><Icon name="grip-vertical" size={16} /></button>
                  {moveMenu ? (
                    <div className="mo-move-menu" role="group" aria-label="Move Mo">
                      <button type="button" onClick={() => { save({ ...pos, side: 'left' }); setMoveMenu(false); moveBtn.current?.focus(); }}>Dock on the left</button>
                      <button type="button" onClick={() => { save({ ...pos, side: 'right' }); setMoveMenu(false); moveBtn.current?.focus(); }}>Dock on the right</button>
                      <button type="button" onClick={() => { reset(); setMoveMenu(false); moveBtn.current?.focus(); }}>Reset position</button>
                    </div>
                  ) : null}
                </div>
              ) : null}
              <button type="button" className="atlas-icon-btn" onClick={() => { stop(); setMsgs([]); }} aria-label="Clear conversation" disabled={!msgs.length}><Icon name="trash-2" size={16} /></button>
              <button type="button" className="atlas-icon-btn" onClick={close} aria-label="Close chat"><Icon name="x" size={18} /></button>
            </header>

            <div ref={log} className="mo-log" role="log" aria-live="polite" aria-label="Conversation"
              onScroll={(e) => { const el = e.currentTarget; pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }}>
              {!msgs.length ? (
                <div className="mo-hello">
                  <p>Hi, I’m Mo. Ask me about films, where to watch them, or what to watch tonight. I can also do things for you, like add a film to your watchlist or spin WheelMo.</p>
                  <p className="mo-small">I check facts with TMDB and show my sources. Anything I offer to do waits for your OK. I can see which page you’re on ({ctxNow.page}). {spoilerFree ? 'Spoiler-free is on.' : 'Spoilers allowed.'}</p>
                </div>
              ) : msgs.map((m) => (
                <div key={m.id} className={`mo-turn is-${m.from}`}>
                  {m.text || m.status ? (
                    <p className={`mo-msg is-${m.from}${m.note ? ' is-note' : ''}${!m.text ? ' is-thinking' : ''}`}>
                      <span className="vm-sr">{m.from === 'you' ? 'You: ' : 'Mo: '}</span>
                      {m.text || <><span aria-hidden="true" className="mo-dots"><i /><i /><i /></span><span className="mo-status">{m.status}</span></>}
                    </p>
                  ) : null}
                  {m.films?.length ? (
                    <ul className="mo-films" role="list" aria-label="Films Mo mentioned">
                      {m.films.map((f) => (
                        <li key={f.id}><a href={`/film/${f.id}`} className="mo-film">
                          <span className="mo-film-poster" aria-hidden="true"><Poster src={f.posterPath ? `${IMG}/w92${f.posterPath}` : null} title={f.title} size="fill" /></span>
                          <span className="mo-film-title">{f.title}</span>{f.year ? <span className="mo-film-year">{f.year}</span> : null}
                        </a></li>
                      ))}
                    </ul>
                  ) : null}
                  {m.cards?.map((c) => {
                    const d = describeAction(c.action);
                    return (
                      <div key={c.id} className={`mo-card is-${c.state}`} role="group" aria-label="Mo offers to do this">
                        <p className="mo-card-what">{d.summary}</p>
                        {c.state === 'pending' || c.state === 'running' ? (
                          <div className="mo-card-btns">
                            <button type="button" className="mo-confirm" disabled={c.state === 'running'} onClick={() => confirm(m.id, c)}>{c.state === 'running' ? 'Working…' : d.confirm}</button>
                            <button type="button" className="mo-cancel" disabled={c.state === 'running'} onClick={() => setCard(m.id, c.id, { state: 'cancelled' })}>Cancel</button>
                          </div>
                        ) : <p className="mo-card-result" role="status"><Icon name={c.state === 'done' ? 'check' : c.state === 'failed' ? 'triangle-alert' : 'x'} size={14} />{c.state === 'cancelled' ? 'Cancelled. Nothing changed.' : c.result}</p>}
                      </div>
                    );
                  })}
                  {m.sources?.length ? (
                    <p className="mo-sources">Sources: {m.sources.map((src, i) => <span key={src.url}>{i ? ' · ' : ''}<a href={src.url} target="_blank" rel="noopener noreferrer">{src.label}</a></span>)}</p>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="mo-chips" role="group" aria-label="Suggested questions">
              {suggestions.map((q) => <button key={q} type="button" className="mo-chip" disabled={busy === 'thinking'} onClick={() => send(q)}>{q}</button>)}
            </div>

            <form className="mo-input" onSubmit={(e) => { e.preventDefault(); send(draft); }}>
              <label htmlFor={`${titleId}-in`} className="vm-sr">Message Mo</label>
              <textarea id={`${titleId}-in`} ref={input} autoFocus rows={1} value={draft} maxLength={500} placeholder="Ask Mo…"
                onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(draft); } }} />
              {busy === 'thinking'
                ? <button type="button" className="mo-send" onClick={stop} aria-label="Stop"><Icon name="pause" size={18} /></button>
                : <button type="submit" className="mo-send" disabled={!draft.trim()} aria-label="Send"><Icon name="arrow-up" size={18} /></button>}
            </form>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
