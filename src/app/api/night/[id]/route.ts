import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store' };

/* A room's state for one of its participants: what night_state lets them see, and nothing for anyone else. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'not_found' }, { status: 404, headers });
  const { sb, user } = await currentUser();
  if (!sb || !user) return NextResponse.json({ error: 'sign_in' }, { status: 401, headers });
  const { data, error } = await sb.rpc('night_state', { p_night: id });
  if (error) return NextResponse.json({ error: 'upstream' }, { status: 502, headers });
  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404, headers });
  return NextResponse.json({ state: data }, { headers });
}
