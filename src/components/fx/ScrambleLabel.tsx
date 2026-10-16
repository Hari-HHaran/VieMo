'use client';
import type { RefObject } from 'react';

/* The visible-but-transparent real label keeps the width and the accessible name; the overlay scrambles. */
export default function ScrambleLabel({ text, overlay, className = '' }: { text: string; overlay: RefObject<HTMLSpanElement | null>; className?: string }) {
  return (
    <span className={`scr ${className}`}>
      <span className="scr-real">{text}</span>
      <span className="scr-live" aria-hidden="true" ref={overlay}>{text}</span>
    </span>
  );
}
