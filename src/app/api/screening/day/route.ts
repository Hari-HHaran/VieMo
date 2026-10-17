import { NextResponse, type NextRequest } from 'next/server';
import { limited } from '@/lib/rate-limit';
import { DAY, UUID, toDayFilms } from '@/lib/screening-server';
import { supabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store' };

/* One day's films for the day panel; screening_day returns nothing to viewers who may not see it. */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const owner = q.get('owner') ?? '', day = q.get('day') ?? '';
  if (!UUID.test(owner) || !DAY.test(day)) return NextResponse.json({ error: 'bad_request' }, { status: 400, headers });
  if (limited(req, 'screening-day', 90)) return NextResponse.json({ error: 'rate_limited' }, { status: 429, headers });
  const sb = await supabaseServer();
  if (!sb) return NextResponse.json({ error: 'offline' }, { status: 503, headers });
  const { data, error } = await sb.rpc('screening_day', { p_owner: owner, p_day: day });
  if (error) return NextResponse.json({ error: 'upstream' }, { status: 502, headers });
  const films = toDayFilms(data);
  return NextResponse.json(films ? { allowed: true, films } : { allowed: false }, { headers });
}
