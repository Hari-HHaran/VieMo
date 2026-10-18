import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { AccountsOff } from '@/components/account/AuthPage';
import NightRoom from '@/components/night/NightRoom';
import NightStart from '@/components/night/NightStart';
import { CODE, type NightState } from '@/lib/night';
import { accountsConfigured, supabasePublicKey, supabaseUrl } from '@/lib/supabase/env';
import { currentUser } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Movie Night', robots: { index: false } };

/* A room by its code. Members see the room; anyone else signed in is offered the join form (the code is the
   invitation). Nothing about the room is shown before joining. */
export default async function NightPage({ params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = await params;
  const code = raw.toUpperCase();
  if (!CODE.test(code)) notFound();
  if (!accountsConfigured()) return <div className="page"><AccountsOff /></div>;
  const { sb, user } = await currentUser();
  if (!sb || !user) redirect(`/sign-in?next=/match/night/${code}`);
  const { data: room } = await sb.from('movie_nights').select('id').eq('code', code).maybeSingle();
  const state = room ? ((await sb.rpc('night_state', { p_night: room.id })).data as NightState | null) : null;
  if (!state) {
    return (
      <div className="page nr-page">
        <header className="page-head">
          <p className="type-eyebrow nr-eyebrow"><a href="/match/night">Movie Night</a></p>
          <h1 className="type-display-lg">You’re invited to a Movie Night</h1>
        </header>
        <NightStart code={code} joinOnly />
      </div>
    );
  }
  /* Realtime uses the public address and publishable key (never a secret); NIGHT_REALTIME=off falls back to polling. */
  const realtime = process.env.NIGHT_REALTIME === 'off' ? null : { url: supabaseUrl()!, key: supabasePublicKey()! };
  return <div className="page nr-page"><NightRoom initial={state} realtime={realtime} /></div>;
}
