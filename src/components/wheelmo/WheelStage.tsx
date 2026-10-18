'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { animate, useMotionValue, useMotionValueEvent, type AnimationPlaybackControls } from 'motion/react';
import { Button, Icon } from '@/ds/client';
import { usePrefs } from '@/lib/device-store';
import { landingRotation, wedgeAt, type Spin, type WheelFilm } from '@/lib/wheel';
import Lever from './Lever';
import { chime, tick } from './sound';
import Wheel from './Wheel';

export const SPIN_SECONDS = 5.2;

/* Same spin, same stopping point on every screen: the pointer's place inside the winning wedge comes from the
   spin's id, not from each browser. It only changes where in the wedge it stops, never which wedge. */
const nudgeFor = (id: string) => ((parseInt(id.replace(/-/g, '').slice(0, 6), 16) % 1000) / 1000) - 0.5;

/* The machine: wheel, lever, Spin button, sound switch and the spoken status. It animates whichever spin it is
   given toward that spin's saved winner; it never decides a result. */
export default function WheelStage({ films, spin, busy, canSpin, cantSpinReason, onSpin, onRevealed, spinLabel = 'Spin WheelMo' }: {
  films: WheelFilm[]; spin: Spin | null; busy: boolean; canSpin: boolean; cantSpinReason?: string;
  onSpin: () => void; onRevealed: (s: Spin) => void; spinLabel?: string;
}) {
  const [prefs] = usePrefs();
  const [osReduced, setOsReduced] = useState(false);
  useEffect(() => { const m = matchMedia('(prefers-reduced-motion: reduce)'); setOsReduced(m.matches); const on = () => setOsReduced(m.matches); m.addEventListener('change', on); return () => m.removeEventListener('change', on); }, []);
  const reduced = prefs.reduceMotion || osReduced;
  const rotation = useMotionValue(0);
  const [active, setActive] = useState<number | null>(null);
  const [phase, setPhase] = useState<'idle' | 'spinning' | 'revealed'>('idle');
  const [sound, setSound] = useState(false);
  const [say, setSay] = useState('');
  const anim = useRef<AnimationPlaybackControls | null>(null);
  const done = useRef<string | null>(null);
  const target = useRef(0);
  const n = films.length;

  useEffect(() => { try { setSound(localStorage.getItem('viemo:wheel-sound') === 'on'); } catch {} }, []);
  useMotionValueEvent(rotation, 'change', (r) => {
    if (phase !== 'spinning' || !n) return;
    const w = wedgeAt(r, n);
    setActive((prev) => { if (prev !== w && sound) tick(0.8); return w; });
  });

  const finish = useCallback((s: Spin) => {
    if (done.current === s.id) return;
    done.current = s.id;
    rotation.set(target.current);
    setActive(s.winner_index);
    setPhase('revealed');
    setSay(`WheelMo chose ${s.pool[s.winner_index]?.title ?? 'a film'}.`);
    if (sound) chime();
    onRevealed(s);
  }, [onRevealed, rotation, sound]);

  /* A new spin arrived: turn to its winner. Spins that are already over (a late arrival, a reload) jump straight
     to the result, so nobody sees a second, different roll. */
  useEffect(() => {
    if (!spin || !n || done.current === spin.id) return;
    anim.current?.stop();
    const from = rotation.get();
    target.current = landingRotation(from, spin.winner_index, n, 6, nudgeFor(spin.id));
    const elapsed = (Date.now() - new Date(spin.created_at).getTime()) / 1000;
    const remaining = SPIN_SECONDS - Math.max(0, Math.min(elapsed, SPIN_SECONDS));
    if (reduced || spin.status !== 'spinning' || remaining < 0.8) { finish(spin); return; }
    setPhase('spinning');
    setSay('Spinning…');
    const to = target.current;
    anim.current = animate(rotation, [from, from + (to - from) * 0.09, to], {
      duration: remaining, times: [0, 0.13, 1], ease: ['easeIn', [0.1, 0.6, 0.06, 1]],
      onComplete: () => finish(spin),
    });
    return () => anim.current?.stop();
  }, [spin?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* A different pool resets the wheel to rest. */
  const poolKey = films.map((f) => f.tmdb_id).join(',');
  const lastPool = useRef(poolKey);
  useEffect(() => {
    if (lastPool.current === poolKey) return;
    lastPool.current = poolKey;
    if (!spin || spin.pool.map((f) => f.tmdb_id).join(',') !== poolKey) { setPhase('idle'); setActive(null); }
  }, [poolKey, spin]);

  const spinning = phase === 'spinning';
  const blocked = !canSpin || busy || spinning;
  return (
    <div className={`wm-stage${spinning ? ' is-spinning' : ''}`}>
      <div className="wm-machine">
        <div className="wm-marquee" aria-hidden="true"><span>Wheel</span><span>Mo</span></div>
        <div className="wm-wheel-wrap" data-hint={blocked ? '' : 'Pull the lever'}>
          <Wheel films={films} rotation={rotation} active={active} winner={phase === 'revealed' ? spin?.winner_index ?? null : null} spinning={spinning} />
        </div>
        <Lever disabled={blocked} onPull={onSpin} reduced={reduced} />
      </div>
      <div className="wm-controls">
        <Button variant="primary" size="lg" icon="rotate-cw" busy={busy} disabled={blocked} onClick={onSpin} className="wm-spin-btn">
          {busy ? 'Asking the wheel' : spinning ? 'Spinning' : spinLabel}
        </Button>
        {spinning ? <Button variant="ghost" onClick={() => { anim.current?.stop(); if (spin) finish(spin); }}>Show the result now</Button> : null}
        <button type="button" className="wm-sound type-label" aria-pressed={sound} onClick={() => { const v = !sound; setSound(v); try { localStorage.setItem('viemo:wheel-sound', v ? 'on' : 'off'); } catch {} }}>
          <Icon name={sound ? 'volume-2' : 'volume-x'} size={18} />{sound ? 'Sound on' : 'Sound off'}
        </button>
      </div>
      {!canSpin && cantSpinReason ? <p className="type-caption wm-muted wm-why">{cantSpinReason}</p> : null}
      <p className="vm-sr" aria-live="polite">{say}</p>
    </div>
  );
}
