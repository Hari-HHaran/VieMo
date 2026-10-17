import { NextResponse, type NextRequest } from 'next/server';
import { limited } from '@/lib/rate-limit';
import { DAY, MONTH, UUID, toMonthData } from '@/lib/screening-server';
import { supabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store' };

/* One month of someone's Screening Activity, as whoever is asking. The database decides whether they may see
   it (screening_month checks the owner's setting); a refusal looks the same whether or not there is activity. */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const owner = q.get('owner') ?? '', month = q.get('month') ?? '', today = q.get('today') ?? '';
  if (!UUID.test(owner) || !MONTH.test(month) || (today && !DAY.test(today))) return NextResponse.json({ error: 'bad_request' }, { status: 400, headers });
  if (limited(req, 'screening', 90)) return NextResponse.json({ error: 'rate_limited' }, { status: 429, headers });
  const sb = await supabaseServer();
  if (!sb) return NextResponse.json({ error: 'offline' }, { status: 503, headers });
  const { data, error } = await sb.rpc('screening_month', { p_owner: owner, p_month: `${month}-01`, p_today: today || null });
  if (error) return NextResponse.json({ error: 'upstream' }, { status: 502, headers });
  const month_ = toMonthData(data);
  return NextResponse.json(month_ ? { allowed: true, data: month_ } : { allowed: false }, { headers });
}
