import { NextResponse } from 'next/server';
import { accountsConfigured } from '@/lib/supabase/env';
import { currentUser } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export interface Me {
  configured: boolean;
  user: { id: string; email: string | null } | null;
  profile: { username: string; display_name: string | null; avatar_url: string | null; onboarded: boolean } | null;
}

/* Who's signed in, for the nav. Private to this person and never cached. */
export async function GET() {
  const headers = { 'Cache-Control': 'private, no-store' };
  if (!accountsConfigured()) return NextResponse.json({ configured: false, user: null, profile: null } satisfies Me, { headers });
  const { sb, user } = await currentUser();
  if (!sb || !user) return NextResponse.json({ configured: true, user: null, profile: null } satisfies Me, { headers });
  const { data } = await sb.from('profiles').select('username, display_name, avatar_url, onboarded').eq('id', user.id).maybeSingle();
  return NextResponse.json({ configured: true, user: { id: user.id, email: user.email ?? null }, profile: data ?? null } satisfies Me, { headers });
}
