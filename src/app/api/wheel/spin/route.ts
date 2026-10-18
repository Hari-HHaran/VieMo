import { NextResponse, type NextRequest } from 'next/server';
import { ensureFilms } from '@/lib/films-server';
import { limited } from '@/lib/rate-limit';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { currentUser } from '@/lib/supabase/server';
import { MAX_POOL, MIN_POOL } from '@/lib/wheel';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store' };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const err = (status: number, error: string, message: string) => NextResponse.json({ error, message }, { status, headers });

/* Spin the wheel: the database picks the winner from exactly these films (equal chances) and saves the spin.
   The same request_id always returns the same spin, so a double click or a retry can't roll twice. */
export async function POST(req: NextRequest) {
  if (limited(req, 'wheel-spin', 30)) return err(429, 'rate_limited', 'Too many spins in a minute. Take a breath.');
  let body: { request_id?: string; mode?: string; source?: string; ids?: unknown };
  try { body = await req.json(); } catch { return err(400, 'bad_request', 'Malformed request.'); }
  const { request_id, mode, source = '' } = body;
  const ids = Array.isArray(body.ids) ? body.ids : [];
  if (!request_id || !UUID.test(request_id)) return err(400, 'bad_request', 'Missing request id.');
  if (!['watchlist', 'playlist', 'surprise'].includes(mode ?? '')) return err(400, 'bad_request', 'Unknown wheel mode.');
  if (typeof source !== 'string' || source.length > 120) return err(400, 'bad_request', 'Bad source.');
  if (!ids.every((x) => Number.isInteger(x) && (x as number) > 0) || ids.length < MIN_POOL || ids.length > MAX_POOL || new Set(ids).size !== ids.length) {
    return err(400, 'bad_pool', `A wheel holds ${MIN_POOL} to ${MAX_POOL} different films.`);
  }
  const pool = ids as number[];
  /* Films not already stored (a device watchlist, a surprise deal) are checked with TMDB first. */
  if (mode === 'surprise' || (mode === 'watchlist' && source === 'device')) {
    const ok = await ensureFilms(pool);
    if (ok.length !== pool.length) return err(422, 'unverified', 'Some films couldn’t be checked with TMDB just now. Try again in a moment.');
  }
  const { sb, user } = await currentUser();
  let result;
  if (sb && user) {
    result = await sb.rpc('spin_wheel', { p_request: request_id, p_mode: mode, p_source: source, p_ids: pool });
  } else {
    const admin = supabaseAdmin();
    if (!admin) return err(401, 'sign_in', 'Sign in to spin WheelMo.');
    result = await admin.rpc('spin_wheel_service', { p_request: request_id, p_mode: mode, p_source: source, p_ids: pool });
  }
  if (result.error) {
    const code = result.error.code;
    if (code === '42501') return err(403, 'not_allowed', 'That pool isn’t one you can spin.');
    if (code === '22023') return err(400, 'bad_pool', 'That pool can’t go on the wheel.');
    return err(502, 'upstream', 'WheelMo couldn’t reach the database. Try again.');
  }
  return NextResponse.json({ spin: result.data }, { headers });
}

/* Your most recent spin, so a reload mid-spin shows the same result instead of rolling again. */
export async function GET() {
  const { sb, user } = await currentUser();
  if (!sb || !user) return NextResponse.json({ spin: null }, { headers });
  const { data } = await sb.from('wheel_spins').select('*').eq('user_id', user.id).is('night_id', null)
    .gte('created_at', new Date(Date.now() - 10 * 60_000).toISOString()).order('created_at', { ascending: false }).limit(1).maybeSingle();
  return NextResponse.json({ spin: data ?? null }, { headers });
}
