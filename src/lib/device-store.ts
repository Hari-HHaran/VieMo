'use client';
import { useCallback, useSyncExternalStore } from 'react';

/* Small localStorage stores with React subscriptions. Until accounts arrive, a person's
   watchlist and settings live on this device only, and the UI says so. */
export function createStore<T>(key: string, fallback: T) {
  const listeners = new Set<() => void>();
  let cache: { value: T } | null = null;
  const read = (): T => {
    try {
      const raw = localStorage.getItem(key);
      return raw == null ? fallback : (JSON.parse(raw) as T);
    } catch {
      return fallback;
    }
  };
  const get = () => (cache ??= { value: read() }).value;
  const set = (value: T) => {
    cache = { value };
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode: keep in memory */ }
    listeners.forEach((l) => l());
  };
  const subscribe = (cb: () => void) => {
    listeners.add(cb);
    const onStorage = (e: StorageEvent) => { if (e.key === key) { cache = null; cb(); } };
    window.addEventListener('storage', onStorage);
    return () => { listeners.delete(cb); window.removeEventListener('storage', onStorage); };
  };
  const useValue = () => useSyncExternalStore(subscribe, get, () => fallback);
  return { get, set, useValue };
}

export interface SavedFilm { id: number; title: string; year?: number; posterPath: string | null; addedAt: string }
const watchlistStore = createStore<SavedFilm[]>('viemo:watchlist', []);

export function useWatchlist() {
  const list = watchlistStore.useValue();
  const has = useCallback((id: number) => list.some((f) => f.id === id), [list]);
  const add = useCallback((f: Omit<SavedFilm, 'addedAt'>, at = 0) => {
    const rest = watchlistStore.get().filter((x) => x.id !== f.id);
    rest.splice(Math.min(at, rest.length), 0, { ...f, addedAt: new Date().toISOString() });
    watchlistStore.set(rest);
  }, []);
  const remove = useCallback((id: number) => {
    const cur = watchlistStore.get();
    const index = cur.findIndex((x) => x.id === id);
    watchlistStore.set(cur.filter((x) => x.id !== id));
    return index;
  }, []);
  return { list, has, add, remove };
}

export type ThemePref = 'system' | 'dark' | 'light';
export interface Prefs { theme: ThemePref; reduceMotion: boolean; autoplay: boolean; captions: boolean; cursor: boolean }
export const DEFAULT_PREFS: Prefs = { theme: 'system', reduceMotion: false, autoplay: false, captions: true, cursor: true };
const prefsStore = createStore<Prefs>('viemo:prefs', DEFAULT_PREFS);
export function usePrefs(): [Prefs, (patch: Partial<Prefs>) => void] {
  const prefs = { ...DEFAULT_PREFS, ...prefsStore.useValue() };
  const update = useCallback((patch: Partial<Prefs>) => prefsStore.set({ ...DEFAULT_PREFS, ...prefsStore.get(), ...patch }), []);
  return [prefs, update];
}

export interface AccentPref { hex: string | null; css: string | null; film: { id: number; title: string; posterPath: string | null } | null }
const accentStore = createStore<AccentPref>('viemo:accent', { hex: null, css: null, film: null });
export const useAccentPref = () => accentStore.useValue();
export const setAccentPref = (v: AccentPref) => accentStore.set(v);

/* A favourite poster behind the app, faded right down so it never competes with the content. */
export const BACKDROP_MIN = 0.04, BACKDROP_MAX = 0.14, BACKDROP_DEFAULT = 0.08;
export interface BackdropPref { film: { id: number; title: string; posterPath: string } | null; opacity: number; where: 'home' | 'all'; blur: boolean }
export const DEFAULT_BACKDROP: BackdropPref = { film: null, opacity: BACKDROP_DEFAULT, where: 'all', blur: false };
const backdropStore = createStore<BackdropPref>('viemo:backdrop', DEFAULT_BACKDROP);
export const useBackdropPref = (): BackdropPref => ({ ...DEFAULT_BACKDROP, ...backdropStore.useValue() });
export const setBackdropPref = (patch: Partial<BackdropPref>) => backdropStore.set({ ...DEFAULT_BACKDROP, ...backdropStore.get(), ...patch });
export const clampBackdrop = (n: number) => Math.min(BACKDROP_MAX, Math.max(BACKDROP_MIN, Number.isFinite(n) ? n : BACKDROP_DEFAULT));

/* Applies theme and motion preferences to <html>; the inline script in the layout does the same before first paint. */
export function applyPrefsToDocument(p: Prefs) {
  const el = document.documentElement;
  const theme = p.theme === 'system' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : p.theme;
  el.setAttribute('data-theme', theme);
  if (p.reduceMotion) el.setAttribute('data-motion', 'reduce'); else el.removeAttribute('data-motion');
}
