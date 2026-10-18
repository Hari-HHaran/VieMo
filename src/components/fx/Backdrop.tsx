'use client';
import { useEffect } from 'react';
import { clampBackdrop, useBackdropPref } from '@/lib/device-store';

export const BACKDROP_IMG = 'https://image.tmdb.org/t/p/w780';
const SAFE = /^\/[A-Za-z0-9._-]+$/;

/* Puts the chosen poster behind the app (the layer itself is .shell::before in personal.css), faded to a few
   percent so text keeps its contrast. The inline script in the layout does the same before first paint. */
export default function Backdrop() {
  const b = useBackdropPref();
  useEffect(() => {
    const el = document.documentElement;
    const path = b.film?.posterPath;
    if (!path || !SAFE.test(path)) { el.removeAttribute('data-vm-backdrop'); el.style.removeProperty('--vm-backdrop-img'); return; }
    el.setAttribute('data-vm-backdrop', b.where);
    el.toggleAttribute('data-vm-backdrop-blur', b.blur);
    el.style.setProperty('--vm-backdrop-img', `url("${BACKDROP_IMG}${path}")`);
    el.style.setProperty('--vm-backdrop-opacity', String(clampBackdrop(b.opacity)));
  }, [b.film?.posterPath, b.where, b.blur, b.opacity]);
  return null;
}
