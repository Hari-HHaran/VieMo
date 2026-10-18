'use server';
import { ensureFilms } from '@/lib/films-server';
import { CODE } from '@/lib/night';
import { currentUser } from '@/lib/supabase/server';
import type { Spin } from '@/lib/wheel';

type Done<T = undefined> = { ok: true; value?: T } | { ok: false; message: string };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHARE = /^[a-z0-9]{16}$/;
const ids = (v: unknown, max: number) => Array.isArray(v) && v.length > 0 && v.length <= max && v.every((x) => Number.isInteger(x) && x > 0) && new Set(v).size === v.length;

/* The database checks who is asking and what stage the room is in; these turn its refusals into plain words. */
function said(code: string | undefined, fallback: string): string {
  switch (code) {
    case '42501': return 'You can’t do that in this room.';
    case '55000': return 'The room has moved on. It’s been refreshed.';
    case '54000': return 'That’s over the limit for a room.';
    case 'P0002': return 'No open Movie Night has that code. Check it with the host.';
    case '22023': return 'Some of those films couldn’t be added.';
    case '23505': return 'The wheel is still turning. Wait for it to stop.';
    default: return fallback;
  }
}

async function me() {
  const { sb, user } = await currentUser();
  return sb && user ? sb : null;
}

export async function createNight(title: string): Promise<Done<{ code: string }>> {
  const sb = await me();
  if (!sb) return { ok: false, message: 'Sign in to host a Movie Night.' };
  const { data, error } = await sb.rpc('create_night', { p_title: String(title ?? '').slice(0, 80) });
  if (error) return { ok: false, message: error.code === '54000' ? 'You’ve opened a lot of rooms this hour. Use one of them, or try later.' : 'The room didn’t open. Try again.' };
  return { ok: true, value: { code: (data as { code: string }).code } };
}

export async function joinNight(code: string): Promise<Done<{ code: string }>> {
  const c = String(code ?? '').trim().toUpperCase().replace(/[\s-]/g, '');
  if (!CODE.test(c)) return { ok: false, message: 'A room code is six letters and numbers.' };
  const sb = await me();
  if (!sb) return { ok: false, message: 'Sign in to join a Movie Night.' };
  const { error } = await sb.rpc('join_night', { p_code: c });
  if (error) return { ok: false, message: said(error.code, 'That didn’t work. Try again.') };
  return { ok: true, value: { code: c } };
}

/* Films come from your watchlist, a collection you can open (by share id), search or a surprise deal. Search and
   surprise films are checked with TMDB and stored first, so the room never holds an invented film. */
export async function addFilms(night: string, list: number[], source: 'watchlist' | 'collection' | 'search' | 'surprise', ref?: string): Promise<Done<{ added: number }>> {
  if (!UUID.test(night) || !ids(list, 40) || !['watchlist', 'collection', 'search', 'surprise'].includes(source)) return { ok: false, message: 'Those films can’t be added.' };
  if (source === 'collection' && !SHARE.test(ref ?? '')) return { ok: false, message: 'Unknown collection.' };
  const sb = await me();
  if (!sb) return { ok: false, message: 'Sign in first.' };
  if (source === 'search' || source === 'surprise') {
    const ok = await ensureFilms(list);
    if (ok.length !== list.length) return { ok: false, message: 'Some films couldn’t be checked with TMDB just now. Try again in a moment.' };
  }
  const { data, error } = await sb.rpc('night_add', { p_night: night, p_ids: list, p_source: source, p_ref: source === 'collection' ? ref : null });
  if (error) return { ok: false, message: error.code === '54000' ? 'A room holds up to 40 films.' : said(error.code, 'Those films didn’t add. Try again.') };
  return { ok: true, value: { added: data as number } };
}

export async function removeFilm(night: string, tmdb: number): Promise<Done> {
  if (!UUID.test(night) || !Number.isInteger(tmdb)) return { ok: false, message: 'Unknown film.' };
  const sb = await me();
  if (!sb) return { ok: false, message: 'Sign in first.' };
  const { error } = await sb.rpc('night_remove', { p_night: night, p_tmdb: tmdb });
  return error ? { ok: false, message: said(error.code, 'That didn’t change. Try again.') } : { ok: true };
}

export async function setStage(night: string, status: 'voting' | 'results' | 'lobby' | 'closed'): Promise<Done> {
  if (!UUID.test(night) || !['voting', 'results', 'lobby', 'closed'].includes(status)) return { ok: false, message: 'Unknown step.' };
  const sb = await me();
  if (!sb) return { ok: false, message: 'Sign in first.' };
  const { error } = await sb.rpc('night_stage', { p_night: night, p_status: status });
  if (error?.message?.includes('at least two')) return { ok: false, message: 'Add at least two films before voting.' };
  return error ? { ok: false, message: said(error.code, 'That didn’t change. Try again.') } : { ok: true };
}

export async function vote(night: string, tmdb: number, yes: boolean): Promise<Done> {
  if (!UUID.test(night) || !Number.isInteger(tmdb) || typeof yes !== 'boolean') return { ok: false, message: 'Unknown film.' };
  const sb = await me();
  if (!sb) return { ok: false, message: 'Sign in first.' };
  const { error } = await sb.rpc('night_vote', { p_night: night, p_tmdb: tmdb, p_vote: yes });
  return error ? { ok: false, message: said(error.code, 'Your vote didn’t save. Try again.') } : { ok: true };
}

/* The host's spin. The database chooses the winner from exactly these films, once per request id: a retry after a
   dropped connection returns the same spin. */
export async function spinNight(night: string, request: string, mode: 'group' | 'decider', list: number[]): Promise<Done<Spin>> {
  if (!UUID.test(night) || !UUID.test(request) || !['group', 'decider'].includes(mode) || !ids(list, 12) || list.length < 2) return { ok: false, message: 'That wheel can’t spin.' };
  const sb = await me();
  if (!sb) return { ok: false, message: 'Sign in first.' };
  const { data, error } = await sb.rpc('spin_night', { p_request: request, p_night: night, p_mode: mode, p_ids: list });
  if (error) return { ok: false, message: error.code === '42501' && mode === 'decider' ? 'The shortlist changed. It’s been refreshed.' : said(error.code, 'WheelMo couldn’t reach the database. Try again: the same spin will be used.') };
  return { ok: true, value: data as Spin };
}

export async function confirmPick(night: string, tmdb: number, how: 'match' | 'decider' | 'wheel' | 'host', spin?: string): Promise<Done> {
  if (!UUID.test(night) || !Number.isInteger(tmdb) || !['match', 'decider', 'wheel', 'host'].includes(how) || (spin && !UUID.test(spin))) return { ok: false, message: 'Unknown film.' };
  const sb = await me();
  if (!sb) return { ok: false, message: 'Sign in first.' };
  const { error } = await sb.rpc('night_confirm', { p_night: night, p_tmdb: tmdb, p_how: how, p_spin: spin ?? null });
  return error ? { ok: false, message: said(error.code, 'That didn’t save. Try again.') } : { ok: true };
}

export async function heartbeat(night: string): Promise<void> {
  if (!UUID.test(night)) return;
  const sb = await me();
  if (sb) await sb.rpc('night_heartbeat', { p_night: night });
}
