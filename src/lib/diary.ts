'use client';
import { useCallback, useMemo } from 'react';
import { createStore } from './device-store';
import { EMPTY_DIARY, todayISO, wallItems, type Diary, type DiaryEntry, type WallFilm } from './wall';

/* Your diary on this device until accounts arrive: every watch, rating and review, plus favourites.
   The Wall of Fame is drawn from it. */
const store = createStore<Diary>('viemo:diary', EMPTY_DIARY);
const JUST_FRAMED = 'viemo:just-framed';

export interface LogInput { watchedOn?: string; rating: number | null; review: string | null; spoiler?: boolean; notes?: string | null; tags?: string[] }
const uid = () => (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);
const clean = (s: string | null | undefined) => (s && s.trim() ? s.trim() : null);

export function useDiary() {
  const diary = store.useValue();
  const items = useMemo(() => wallItems(diary), [diary]);

  /* A new watch of a film (a first watch or a rewatch). */
  const log = useCallback((film: WallFilm, input: LogInput) => {
    const d = store.get();
    const entry: DiaryEntry = {
      id: uid(), filmId: film.id, watchedOn: input.watchedOn || todayISO(), rating: input.rating, review: clean(input.review),
      spoiler: !!input.spoiler, notes: clean(input.notes), tags: (input.tags ?? []).map((t) => t.trim()).filter(Boolean), createdAt: new Date().toISOString(),
    };
    store.set({ ...d, films: { ...d.films, [film.id]: { ...d.films[film.id], ...film } }, entries: [...d.entries, entry] });
    if (input.rating != null) markJustFramed(film.id);
    return entry;
  }, []);

  /* Change one watch (usually the latest). */
  const update = useCallback((entryId: string, patch: Partial<LogInput>) => {
    const d = store.get();
    const before = d.entries.find((e) => e.id === entryId);
    store.set({ ...d, entries: d.entries.map((e) => e.id !== entryId ? e : {
      ...e, ...('watchedOn' in patch && patch.watchedOn ? { watchedOn: patch.watchedOn } : {}),
      ...('rating' in patch ? { rating: patch.rating ?? null } : {}), ...('review' in patch ? { review: clean(patch.review) } : {}),
      ...('spoiler' in patch ? { spoiler: !!patch.spoiler } : {}), ...('notes' in patch ? { notes: clean(patch.notes) } : {}),
      ...('tags' in patch ? { tags: (patch.tags ?? []).map((t) => t.trim()).filter(Boolean) } : {}),
    }) });
    if (before && before.rating == null && patch.rating != null) markJustFramed(before.filmId);
  }, []);

  const toggleFavourite = useCallback((filmId: number) => {
    const d = store.get();
    const on = d.favourites.includes(filmId);
    store.set({ ...d, favourites: on ? d.favourites.filter((f) => f !== filmId) : [...d.favourites, filmId] });
    return !on;
  }, []);

  /* Take a film off the wall; returns what's needed to put it back exactly. */
  const remove = useCallback((filmId: number) => {
    const d = store.get();
    store.set({ ...d, entries: d.entries.filter((e) => e.filmId !== filmId), favourites: d.favourites.filter((f) => f !== filmId) });
    return () => store.set(d);
  }, []);

  return { diary, items, log, update, toggleFavourite, remove };
}

/* The wall plays the "hung" animation once for a film that was just framed, even if framing happened elsewhere. */
export function markJustFramed(filmId: number) { try { sessionStorage.setItem(JUST_FRAMED, String(filmId)); } catch {} }
export function takeJustFramed(): number | null {
  try { const v = sessionStorage.getItem(JUST_FRAMED); sessionStorage.removeItem(JUST_FRAMED); return v ? Number(v) : null; } catch { return null; }
}
