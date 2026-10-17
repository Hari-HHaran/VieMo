'use server';
import { revalidatePath } from 'next/cache';
import { ensureFilms } from '@/lib/films-server';
import { currentUser } from '@/lib/supabase/server';

type Done = { ok: boolean; message?: string; share?: string; saved?: boolean };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHARE = /^[a-z0-9]{16}$/;

/* Save bookmarks a public collection. It never grants edit rights; the database only accepts saves of public ones. */
export async function setSaved(collectionId: string, share: string, on: boolean): Promise<Done> {
  if (!UUID.test(collectionId)) return { ok: false, message: 'Unknown collection.' };
  const { sb, user } = await currentUser();
  if (!sb || !user) return { ok: false, message: 'Sign in to save collections.' };
  const { error } = on
    ? await sb.from('collection_saves').insert({ user_id: user.id, collection_id: collectionId })
    : await sb.from('collection_saves').delete().eq('user_id', user.id).eq('collection_id', collectionId);
  if (error && error.code !== '23505') return { ok: false, message: 'That didn’t save. Try again.' };
  if (SHARE.test(share)) revalidatePath(`/c/${share}`);
  return { ok: true, saved: on };
}

/* Copy makes your own private, editable collection with the same films. */
export async function copyCollection(share: string): Promise<Done> {
  if (!SHARE.test(share)) return { ok: false, message: 'Unknown collection.' };
  const { sb, user } = await currentUser();
  if (!sb || !user) return { ok: false, message: 'Sign in to copy collections.' };
  const { data, error } = await sb.rpc('copy_collection', { p_share: share });
  if (error || !data) return { ok: false, message: 'That didn’t copy. Try again.' };
  const { data: c } = await sb.from('movie_collections').select('share_id').eq('id', data as string).maybeSingle();
  revalidatePath('/library');
  return { ok: true, share: c?.share_id };
}

/* Your collections, with whether a film is in each, for the "Add to collection" menu on film pages. */
export async function myCollectionsFor(tmdbId: number): Promise<{ id: string; title: string; visibility: string; has: boolean }[] | null> {
  const { sb, user } = await currentUser();
  if (!sb || !user) return null;
  const { data: cols } = await sb.from('movie_collections').select('id, title, visibility, updated_at').eq('owner_id', user.id).order('updated_at', { ascending: false }).limit(50);
  const ids = (cols ?? []).map((c) => c.id);
  const { data: items } = ids.length ? await sb.from('collection_items').select('collection_id').eq('tmdb_id', tmdbId).in('collection_id', ids) : { data: [] };
  const inSet = new Set((items ?? []).map((i) => i.collection_id));
  return (cols ?? []).map((c) => ({ id: c.id, title: c.title, visibility: c.visibility, has: inSet.has(c.id) }));
}

/* Add or remove a film. Only owners and editors may (row level security checks it again). */
export async function setInCollection(collectionId: string, tmdbId: number, on: boolean): Promise<Done> {
  if (!UUID.test(collectionId) || !Number.isInteger(tmdbId) || tmdbId <= 0) return { ok: false, message: 'Unknown film or collection.' };
  const { sb, user } = await currentUser();
  if (!sb || !user) return { ok: false, message: 'Sign in first.' };
  if (!on) {
    const { error } = await sb.from('collection_items').delete().eq('collection_id', collectionId).eq('tmdb_id', tmdbId);
    return error ? { ok: false, message: 'That didn’t change. Try again.' } : { ok: true };
  }
  if (!(await ensureFilms([tmdbId])).length) return { ok: false, message: 'That film couldn’t be checked with TMDB just now.' };
  const { data: last } = await sb.from('collection_items').select('position').eq('collection_id', collectionId).order('position', { ascending: false }).limit(1);
  const { error } = await sb.from('collection_items').insert({ collection_id: collectionId, tmdb_id: tmdbId, position: ((last?.[0]?.position as number | undefined) ?? -1) + 1, added_by: user.id });
  if (error && error.code !== '23505') return { ok: false, message: error.code === '42501' ? 'Only the owner and editors can add films.' : 'That didn’t add. Try again.' };
  return { ok: true };
}

export async function createCollection(title: string, visibility: string, firstFilm?: number): Promise<Done & { id?: string }> {
  const t = title.trim().slice(0, 120);
  if (!t) return { ok: false, message: 'Give it a name.' };
  const v = ['private', 'unlisted', 'public'].includes(visibility) ? visibility : 'private';
  const { sb, user } = await currentUser();
  if (!sb || !user) return { ok: false, message: 'Sign in first.' };
  const { data, error } = await sb.from('movie_collections').insert({ owner_id: user.id, title: t, visibility: v }).select('id, share_id').single();
  if (error || !data) return { ok: false, message: 'That didn’t save. Try again.' };
  if (firstFilm) await setInCollection(data.id, firstFilm, true);
  revalidatePath('/library');
  return { ok: true, id: data.id, share: data.share_id };
}
