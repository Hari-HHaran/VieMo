import { NextResponse, type NextRequest } from 'next/server';
import { currentUser } from '@/lib/supabase/server';

/* The animation finished or was skipped: the spin counts as revealed. */
export async function POST(req: NextRequest) {
  const { id } = await req.json().catch(() => ({ id: null }));
  if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ ok: false }, { status: 400 });
  const { sb, user } = await currentUser();
  if (sb && user) await sb.rpc('wheel_reveal', { p_spin: id });
  return NextResponse.json({ ok: true });
}
