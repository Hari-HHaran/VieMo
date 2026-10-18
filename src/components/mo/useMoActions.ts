'use client';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { addToWatchlist, removeFromWatchlist } from '@/app/(account)/library/actions';
import { createNight } from '@/app/(tabs)/match/night/actions';
import { setBackdropPref, usePrefs, useWatchlist } from '@/lib/device-store';
import type { MoAction } from '@/lib/mo/shared';
import { useAccount } from '../account/useAccount';

/* Runs an action the person confirmed on one of Mo's cards, with the same code paths as the app's own buttons
   (and the same server checks). Returns what to say about it. */
export function useMoActions() {
  const router = useRouter();
  const me = useAccount();
  const { add, remove, has } = useWatchlist();
  const [, update] = usePrefs();
  return useCallback(async (a: MoAction): Promise<{ ok: boolean; message: string }> => {
    switch (a.kind) {
      case 'add_to_watchlist': {
        if (!has(a.film.id)) add({ id: a.film.id, title: a.film.title, year: a.film.year ?? undefined, posterPath: a.film.posterPath });
        if (me?.user) { const r = await addToWatchlist(a.film.id); if (!r.ok) return { ok: false, message: r.message ?? 'That didn’t save to your account.' }; }
        return { ok: true, message: `Added ${a.film.title} to your watchlist.` };
      }
      case 'remove_from_watchlist': {
        remove(a.film.id);
        if (me?.user) { const r = await removeFromWatchlist(a.film.id); if (!r.ok) return { ok: false, message: r.message ?? 'That didn’t change your account watchlist.' }; }
        return { ok: true, message: `Took ${a.film.title} off your watchlist.` };
      }
      case 'open_film': router.push(`/film/${a.film.id}`); return { ok: true, message: `Opened ${a.film.title}.` };
      case 'browse_moods': router.push(`/discover?moods=${a.moods.map((m) => m.id).join(',')}`); return { ok: true, message: `Showing ${a.moods.map((m) => m.label).join(' + ')} films on Discover.` };
      case 'spin_wheelmo': router.push(`/match?mode=wheel&auto=${a.source}`); return { ok: true, message: 'Opened WheelMo. It spins as soon as the films are on the wheel.' };
      case 'start_movie_night': {
        if (!me?.user) return { ok: false, message: 'Sign in first: Movie Nights are for accounts.' };
        const r = await createNight(a.title);
        if (!r.ok) return { ok: false, message: r.message };
        router.push(`/match/night/${r.value!.code}`);
        return { ok: true, message: `Opened “${a.title}”. The room code is ${r.value!.code}.` };
      }
      case 'set_background':
        if (!a.film.posterPath) return { ok: false, message: 'That film has no poster.' };
        setBackdropPref({ film: { id: a.film.id, title: a.film.title, posterPath: a.film.posterPath } });
        return { ok: true, message: `${a.film.title} is your background now. Adjust it in Settings.` };
      case 'set_theme': update({ theme: a.theme }); return { ok: true, message: `Theme set to ${a.theme === 'system' ? 'match your device' : a.theme}.` };
      case 'open_page': router.push(a.path); return { ok: true, message: 'Done.' };
    }
  }, [router, me?.user, add, remove, has, update]);
}
