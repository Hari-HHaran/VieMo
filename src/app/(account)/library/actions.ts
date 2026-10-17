'use server';
import { revalidatePath } from 'next/cache';
import { ensureFilms } from '@/lib/films-server';
import { currentUser } from '@/lib/supabase/server';

type Done = { ok: boolean; message?: string; count?: number };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* Only the owner can change a collection's details or who sees it; row level security enforces it again. */
export async function updateCollection(id: string, patch: { title?: string; description?: string; visibility?: string }): Promise<Done> {
  if (!UUID.test(id)) return { ok: false, message: 'Unknown collection.' };
  const { sb, user } = await currentUser();
  if (!sb || !user) return { ok: false, message: 'Sign in first.' };
  const row: Record<string, string | null> = {};
  if (patch.title !== undefined) { const t = patch.title.trim().slice(0, 120); if (!t) return { ok: false, message: 'A collection needs a name.' }; row.title = t; }
  if (patch.description !== undefined) row.description = patch.description.trim().slice(0, 2000) || null;
  if (patch.visibility !== undefined) { if (!['private', 'unlisted', 'public'].includes(patch.visibility)) return { ok: false, message: 'Unknown visibility.' }; row.visibility = patch.visibility; }
  const { data, error } = await sb.from('movie_collections').update(row).eq('id', id).eq('owner_id', user.id).select('id');
  if (error || !data?.length) return { ok: false, message: 'That didn’t save. Only the owner can change a collection.' };
  revalidatePath('/library');
  return { ok: true };
}

export async function deleteCollection(id: string): Promise<Done> {
  if (!UUID.test(id)) return { ok: false, message: 'Unknown collection.' };
  const { sb, user } = await currentUser();
  if (!sb || !user) return { ok: false, message: 'Sign in first.' };
  const { data, error } = await sb.from('movie_collections').delete().eq('id', id).eq('owner_id', user.id).select('id');
  if (error || !data?.length) return { ok: false, message: 'That didn’t delete.' };
  revalidatePath('/library');
  return { ok: true };
}

/* Copies this device's watchlist into the account. Each film is checked with TMDB first. */
export async function importWatchlist(ids: number[]): Promise<Done> {
  const { sb, user } = await currentUser();
  if (!sb || !user) return { ok: false, message: 'Sign in first.' };
  const ok = await ensureFilms(ids.slice(0, 100));
  if (!ok.length) return { ok: false, message: ids.length ? 'Those films couldn’t be checked with TMDB just now.' : 'Nothing to move.' };
  const { error } = await sb.from('watchlist_items').upsert(ok.map((tmdb_id) => ({ user_id: user.id, tmdb_id })), { onConflict: 'user_id,tmdb_id', ignoreDuplicates: true });
  if (error) return { ok: false, message: 'That didn’t move. Try again.' };
  revalidatePath('/library');
  return { ok: true, count: ok.length };
}

export async function removeFromWatchlist(tmdbId: number): Promise<Done> {
  const { sb, user } = await currentUser();
  if (!sb || !user) return { ok: false, message: 'Sign in first.' };
  const { error } = await sb.from('watchlist_items').delete().eq('user_id', user.id).eq('tmdb_id', tmdbId);
  if (error) return { ok: false, message: 'That didn’t remove.' };
  revalidatePath('/library');
  return { ok: true };
}

export async function addToWatchlist(tmdbId: number): Promise<Done> {
  const { sb, user } = await currentUser();
  if (!sb || !user) return { ok: false, message: 'Sign in first.' };
  if (!(await ensureFilms([tmdbId])).length) return { ok: false, message: 'That film couldn’t be checked with TMDB just now.' };
  const { error } = await sb.from('watchlist_items').upsert({ user_id: user.id, tmdb_id: tmdbId }, { onConflict: 'user_id,tmdb_id', ignoreDuplicates: true });
  if (error) return { ok: false, message: 'That didn’t save.' };
  revalidatePath('/library');
  return { ok: true };
}
