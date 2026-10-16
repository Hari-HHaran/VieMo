'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE, SPRING } from '@/lib/motion';

/* An accessible modal on the native <dialog> (focus stays inside, Escape and the backdrop close it, focus returns
   to whatever opened it). It grows out of `origin`, the rect of the thing you clicked, and shrinks back into it. */
export default function Modal({ open, onClose, labelledBy, origin, className = '', children }: {
  open: boolean; onClose: () => void; labelledBy: string; origin?: DOMRect | null; className?: string; children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);
  const [mounted, setMounted] = useState(open);
  const [from, setFrom] = useState('50% 50%');

  useEffect(() => { if (open) setMounted(true); }, [open]);
  useLayoutEffect(() => {
    const d = ref.current;
    if (!d || !mounted || !open || d.open) return;
    opener.current = document.activeElement;
    d.showModal();
    const r = panel.current?.getBoundingClientRect();
    if (r && origin) setFrom(`${origin.left + origin.width / 2 - r.left}px ${origin.top + origin.height / 2 - r.top}px`);
    document.documentElement.classList.add('has-modal');
  }, [mounted, open, origin]);

  const finish = () => {
    if (open) return;
    ref.current?.close();
    document.documentElement.classList.remove('has-modal');
    setMounted(false);
    if (opener.current instanceof HTMLElement && opener.current.isConnected) opener.current.focus();
  };
  useEffect(() => () => document.documentElement.classList.remove('has-modal'), []);

  if (!mounted) return null;
  return (
    <dialog ref={ref} className={`modal ${className}`} aria-labelledby={labelledBy}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}>
      <motion.div ref={panel} className="modal-panel" style={{ transformOrigin: from }}
        initial={{ opacity: 0, scale: origin ? 0.35 : 0.94 }}
        animate={open ? { opacity: 1, scale: 1, transition: SPRING.reveal } : { opacity: 0, scale: origin ? 0.35 : 0.96, transition: { duration: DURATION.standard, ease: EASE.inOut } }}
        onAnimationComplete={finish}>
        {children}
      </motion.div>
    </dialog>
  );
}
