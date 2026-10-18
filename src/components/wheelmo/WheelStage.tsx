'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { animate, useMotionValue, useMotionValueEvent, type AnimationPlaybackControls } from 'motion/react';
import { Button, Icon } from '@/ds/client';
import { usePrefs } from '@/lib/device-store';
import { mod, reelLanding, type Spin, type WheelFilm } from '@/lib/wheel';
import Lever from './Lever';
import Reel from './Reel';
import { chime, tick } from './sound';

export const SPIN_SECONDS = 5.2;
const DRIFT = 8;   // posters a second while the reel rolls and waits for the server's answer

/* The machine: the poster reel, the lever, the Spin button, the sound switch and the spoken status. It runs the
   reel to whichever spin it's given and stops on that spin's saved winner; it never decides a result.
   Pulling the lever nudges the reel; letting go past the mark asks the server for a spin, and the reel keeps
   rolling until the answer arrives, then slows down and frames the winner. */
export default function WheelStage({ films, spin, busy, canSpin, cantSpinReason, onSpin, onRevealed, spinLabel = 'Spin WheelMo' }: {
  films: WheelFilm[]; spin: Spin | null; busy: boolean; canSpin: boolean; cantSpinReason?: string;
  onSpin: () => void; onRevealed: (s: Spin) => void; spinLabel?: string;
}) {
  const [prefs] = usePrefs();
  const [osReduced, setOsReduced] = useState(false);
  useEffect(() => { const m = matchMedia('(prefers-reduced-motion: reduce)'); setOsReduced(m.matches); const on = () => setOsReduced(m.matches); m.addEventListener('change', on); return () => m.removeEventListener('change', on); }, []);
  const reduced = prefs.reduceMotion || osReduced;
  const pos = useMotionValue(0);
  const [landed, setLanded] = useState<number | null>(null);
  const [phase, setPhase] = useState<'idle' | 'rolling' | 'spinning' | 'revealed'>('idle');
  const [sound, setSound] = useState(false);
  const [say, setSay] = useState('');
  const anim = useRef<AnimationPlaybackControls | null>(null);
  const done = useRef<string | null>(null);
  const target = useRef(0);
  const rest = useRef(0);
  const lastTick = useRef(0);
  const rolling = useRef(false);   // set at once, so effects in the same render see it
  const n = films.length;

  useEffect(() => { try { setSound(localStorage.getItem('viemo:wheel-sound') === 'on'); } catch {} }, []);
  /* A click each time a poster passes the window. */
  useMotionValueEvent(pos, 'change', (p) => {
    const c = Math.round(p);
    if (c !== lastTick.current) { lastTick.current = c; if (sound && phase !== 'revealed') tick(0.8); }
  });

  const finish = useCallback((s: Spin) => {
    if (done.current === s.id) return;
    done.current = s.id;
    anim.current?.stop();
    pos.set(target.current);
    rest.current = target.current;
    setLanded(Math.round(target.current));
    setPhase('revealed');
    setSay(`WheelMo chose ${s.pool[s.winner_index]?.title ?? 'a film'}.`);
    if (sound) chime();
    onRevealed(s);
  }, [onRevealed, pos, sound]);

  /* Waiting for the server: the reel keeps rolling at an even pace. The repeat wraps by exactly one run of the
     pool, which looks identical, so it can roll for as long as it takes. */
  useEffect(() => {
    if (!busy || reduced || !n || (spin && done.current !== spin.id)) return;
    anim.current?.stop();
    const base = mod(pos.get(), n);
    pos.set(base);
    setLanded(null); setPhase('rolling'); setSay('Spinning…');
    rolling.current = true;
    anim.current = animate(pos, [base, base + n], { duration: n / DRIFT, ease: 'linear', repeat: Infinity });
  }, [busy]); // eslint-disable-line react-hooks/exhaustive-deps

  /* A spin arrived: run the reel to its winner. Spins that are already over (a late arrival, a reload) show the
     result at once, so nobody sees a second, different roll. */
  useEffect(() => {
    if (!spin || !n || done.current === spin.id) return;
    const wasRolling = rolling.current;
    rolling.current = false;
    anim.current?.stop();
    const from = mod(pos.get(), n);
    pos.set(from);
    target.current = reelLanding(from, spin.winner_index, n);
    const elapsed = (Date.now() - new Date(spin.created_at).getTime()) / 1000;
    const remaining = SPIN_SECONDS - Math.max(0, Math.min(elapsed, SPIN_SECONDS));
    if (reduced || spin.status !== 'spinning' || remaining < 0.8) { finish(spin); return; }
    setLanded(null); setPhase('spinning'); setSay('Spinning…');
    const to = target.current, d = to - from;
    /* Fast at first (straight on from the rolling reel, or a short wind-up from rest), a long slow-down, a little
       past the winner, and back: it settles like a real reel clicking into place. */
    anim.current = wasRolling
      ? animate(pos, [from, to + 0.32, to], { duration: remaining, times: [0, 0.93, 1], ease: [[0.18, 0.62, 0.22, 1], 'easeInOut'], onComplete: () => finish(spin) })
      : animate(pos, [from, from + d * 0.06, to + 0.32, to], { duration: remaining, times: [0, 0.1, 0.93, 1], ease: ['easeIn', [0.15, 0.55, 0.2, 1], 'easeInOut'], onComplete: () => finish(spin) });
  }, [spin?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* If the request fails, the reel coasts to rest on the poster it's nearest. */
  useEffect(() => {
    if (busy || !rolling.current) return;
    rolling.current = false;
    anim.current?.stop();
    const to = Math.round(pos.get()) + 1;
    rest.current = to;
    anim.current = animate(pos, to, { type: 'spring', stiffness: 120, damping: 20 });
    setPhase('idle'); setSay('');
  }, [busy]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => anim.current?.stop(), []);

  /* A different pool resets the reel to rest. */
  const poolKey = films.map((f) => f.tmdb_id).join(',');
  const lastPool = useRef(poolKey);
  useEffect(() => {
    if (lastPool.current === poolKey) return;
    lastPool.current = poolKey;
    if (!spin || spin.pool.map((f) => f.tmdb_id).join(',') !== poolKey) { anim.current?.stop(); pos.set(0); rest.current = 0; setPhase('idle'); setLanded(null); }
  }, [poolKey, spin, pos]);

  /* Pulling the lever nudges the reel forward; letting go short of the mark lets it fall back. */
  const onLever = useCallback((v: number) => {
    if (phase === 'spinning' || phase === 'rolling' || busy) return;
    pos.set(rest.current + v * 0.85);
  }, [phase, busy, pos]);

  const spinning = phase === 'spinning' || phase === 'rolling';
  const blocked = !canSpin || busy || spinning;
  return (
    <div className={`wm-stage${spinning ? ' is-spinning' : ''}`}>
      <div className="wm-machine">
        <div className="wm-marquee" aria-hidden="true"><span>Wheel</span><span>Mo</span></div>
        <div className="wm-reel-wrap" data-hint={blocked ? '' : 'Pull the lever'}>
          <Reel films={films} pos={pos} landed={phase === 'revealed' ? landed : null} spinning={spinning} still={reduced} />
        </div>
        <Lever disabled={blocked} onPull={onSpin} reduced={reduced} onProgress={onLever} />
      </div>
      <div className="wm-controls">
        <Button variant="primary" size="lg" icon="rotate-cw" busy={busy} disabled={blocked} onClick={onSpin} className="wm-spin-btn">
          {busy ? 'Asking the reel' : spinning ? 'Spinning' : spinLabel}
        </Button>
        {phase === 'spinning' ? <Button variant="ghost" onClick={() => { anim.current?.stop(); if (spin) finish(spin); }}>Show the result now</Button> : null}
        <button type="button" className="wm-sound type-label" aria-pressed={sound} onClick={() => { const v = !sound; setSound(v); try { localStorage.setItem('viemo:wheel-sound', v ? 'on' : 'off'); } catch {} }}>
          <Icon name={sound ? 'volume-2' : 'volume-x'} size={18} />{sound ? 'Sound on' : 'Sound off'}
        </button>
      </div>
      {!canSpin && cantSpinReason ? <p className="type-caption wm-muted wm-why">{cantSpinReason}</p> : null}
      <p className="vm-sr" aria-live="polite">{say}</p>
    </div>
  );
}
