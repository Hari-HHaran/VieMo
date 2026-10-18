'use client';
import { useEffect, useRef, useState } from 'react';
import { animate, motion, useMotionValue, useMotionValueEvent, useTransform } from 'motion/react';

const TRAVEL = 190;      // px the ball travels from rest to the bottom
const PIVOT = 118;       // the arm's pivot, measured down from the ball's resting centre
const THRESHOLD = 0.78;  // how far down counts as a pull

/* A machine lever. Drag the knob down past the mark and let go to spin; it springs back. Pressing it (click,
   Enter or Space) does the same pull for you, so dragging is never required. */
export default function Lever({ disabled, onPull, reduced }: { disabled: boolean; onPull: () => void; reduced: boolean }) {
  const pull = useMotionValue(0);
  /* Seen from the front, the arm swings toward you: the ball drops straight down past the pivot, the rod
     shortens then grows below it, and the ball looms a little larger mid-swing. */
  const ballY = useTransform(pull, [0, 1], [0, TRAVEL]);
  const rodTop = useTransform(ballY, (y) => Math.min(y, PIVOT) + 32);
  const rodH = useTransform(ballY, (y) => Math.max(4, Math.abs(PIVOT - y)));
  const ballScale = useTransform(pull, (v) => 1 + 0.16 * Math.sin(v * Math.PI));
  const glow = useTransform(pull, [0, THRESHOLD, 1], [0, 0.35, 1]);
  const [armed, setArmed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ y: number; id: number } | null>(null);
  const moved = useRef(false);
  useMotionValueEvent(pull, 'change', (v) => setArmed(v >= THRESHOLD));
  useEffect(() => { if (disabled) animate(pull, 0, { type: 'spring', stiffness: 260, damping: 18 }); }, [disabled, pull]);

  const release = (fire: boolean) => {
    animate(pull, 0, reduced ? { duration: 0 } : { type: 'spring', stiffness: 320, damping: 14, mass: 0.8 });
    if (fire) onPull();
  };
  const press = async () => {
    if (disabled) return;
    if (reduced) { onPull(); return; }
    await animate(pull, 1, { duration: 0.28, ease: [0.4, 0, 0.6, 1] });
    release(true);
  };

  return (
    <div className={`wm-lever${armed ? ' is-armed' : ''}${dragging ? ' is-dragging' : ''}${disabled ? ' is-disabled' : ''}`}>
      <div className="wm-lever-slot" aria-hidden="true" />
      <div className="wm-lever-housing" aria-hidden="true">
        <motion.span className="wm-lever-lamp" style={{ opacity: glow }} />
        <span className="wm-lever-mark">Pull</span>
      </div>
      <motion.span className="wm-lever-rod" aria-hidden="true" style={{ top: rodTop, height: rodH }} />
      <motion.div className="wm-lever-carriage" style={{ y: ballY }}>
        <button type="button" className="wm-lever-knob" aria-label="Pull the lever to spin WheelMo" aria-disabled={disabled || undefined}
          onClick={() => { if (!moved.current) press(); moved.current = false; }}
          onPointerDown={(e) => {
            if (disabled || e.button !== 0) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            start.current = { y: e.clientY, id: e.pointerId }; moved.current = false; setDragging(true);
          }}
          onPointerMove={(e) => {
            if (!start.current || start.current.id !== e.pointerId) return;
            const d = Math.max(0, Math.min(1, (e.clientY - start.current.y) / TRAVEL));
            if (d > 0.04) moved.current = true;
            pull.set(d);
          }}
          onPointerUp={(e) => {
            if (!start.current || start.current.id !== e.pointerId) return;
            start.current = null; setDragging(false);
            if (moved.current) release(pull.get() >= THRESHOLD);
          }}
          onPointerCancel={() => { start.current = null; setDragging(false); release(false); }}>
          <motion.span className="wm-lever-ball" style={{ scale: ballScale }} />
        </button>
      </motion.div>
      <p className="wm-lever-hint type-caption" aria-hidden="true">{armed ? 'Let go to spin' : 'Drag down, or press'}</p>
    </div>
  );
}
