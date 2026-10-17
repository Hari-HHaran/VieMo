'use client';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { animate, AnimatePresence, motion, useMotionValue } from 'motion/react';
import { Icon } from '@/ds/client';
import { prefersLessMotion, SPRING } from '@/lib/motion';
import type { AtlasFilm, AtlasLocation } from '@/lib/atlas/types';
import MoFace, { type MoState } from './MoFace';

const SIZE = 60, MARGIN = 16, POS_KEY = 'viemo:mo-pos', CHAT_KEY = 'viemo:mo-chat';
type Side = 'left' | 'right';
interface Pos { side: Side; y: number }
interface Msg { id: string; from: 'you' | 'mo'; text: string; note?: boolean }
const DEFAULT_POS: Pos = { side: 'right', y: 0.62 };

export interface MoContext { film?: AtlasFilm | null; location?: AtlasLocation | null }

/* Mo, the movie companion. On desktop you can drag Mo anywhere; letting go snaps it to the nearest side and
   it remembers where. On phones it sits docked above the tab bar. The menu in the chat header moves it without
   dragging. Mo only takes focus when you open it. */
export default function Mo({ context, ask }: { context?: MoContext; ask?: { text: string; n: number } | null }) {
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
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  const send = (text: string) => {
    const t = text.trim();
    if (!t || busy === 'thinking') return;
    setMsgs((m) => [...m, { id: crypto.randomUUID?.() ?? String(Date.now()), from: 'you', text: t }]);
    setDraft(''); setBusy('thinking');
    timer.current = setTimeout(() => {
      setMsgs((m) => [...m, { id: String(Date.now()), from: 'mo', note: true,
        text: 'I can’t answer yet. My connection to verified film and location records arrives in the next update. When it does, I’ll answer from sourced records and show where each fact comes from.' }]);
      setBusy('idle'); setSpeaking(true);
      setTimeout(() => setSpeaking(false), 1800);
    }, prefersLessMotion() ? 200 : 1100);
  };
  const stop = () => { if (timer.current) clearTimeout(timer.current); setBusy('idle'); };

  const state: MoState = busy === 'error' ? 'error' : busy === 'thinking' ? 'thinking' : speaking ? 'responding' : open ? 'listening' : hover ? 'hover' : docked ? 'docked' : 'idle';
  const suggestions = context?.location && !context.location.sample
    ? [`What was filmed at ${context.location.name}?`, `Why was ${context.location.name} chosen?`]
    : context?.film ? [`Where was ${context.film.title} filmed?`, `Who directed ${context.film.title}?`, 'What is it about, without spoilers?']
    : ['What films were shot in Iceland?', 'Take me on a guided tour', 'How do you check filming locations?'];
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
              <button type="button" className="atlas-icon-btn" onClick={() => setMsgs([])} aria-label="Clear conversation" disabled={!msgs.length}><Icon name="trash-2" size={16} /></button>
              <button type="button" className="atlas-icon-btn" onClick={close} aria-label="Close chat"><Icon name="x" size={18} /></button>
            </header>

            <div className="mo-log" role="log" aria-live="polite" aria-label="Conversation">
              {!msgs.length ? (
                <div className="mo-hello">
                  <p>Hi, I’m Mo. Ask me where a film was made, or about a place on the globe.</p>
                  <p className="mo-small">I answer from sourced records and show my sources. {spoilerFree ? 'Spoiler-free is on.' : 'Spoilers allowed.'}</p>
                </div>
              ) : msgs.map((m) => <p key={m.id} className={`mo-msg is-${m.from}${m.note ? ' is-note' : ''}`}><span className="vm-sr">{m.from === 'you' ? 'You: ' : 'Mo: '}</span>{m.text}</p>)}
              {busy === 'thinking' ? <p className="mo-msg is-mo is-thinking"><span className="vm-sr">Mo is thinking</span><span aria-hidden="true" className="mo-dots"><i /><i /><i /></span></p> : null}
            </div>

            <div className="mo-chips" role="group" aria-label="Suggested questions">
              {suggestions.map((s) => <button key={s} type="button" className="mo-chip" onClick={() => send(s)}>{s}</button>)}
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
