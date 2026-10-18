import type { Metadata } from 'next';
import { Button } from '@/ds/client';
import { AccountsOff } from '@/components/account/AuthPage';
import NightStart from '@/components/night/NightStart';
import { accountsConfigured } from '@/lib/supabase/env';
import { currentUser } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Movie Night' };

type Room = { id: string; code: string; title: string; status: string; is_host: boolean; pick: string | null; created_at: string };
const STATUS: Record<string, string> = { lobby: 'Adding films', voting: 'Voting', results: 'Results', closed: 'Done' };

export default async function MovieNight() {
  if (!accountsConfigured()) return <div className="page"><AccountsOff /></div>;
  const { sb, user } = await currentUser();
  const rooms: Room[] = sb && user ? (((await sb.rpc('my_nights')).data as Room[] | null) ?? []) : [];
  return (
    <div className="page nr-page">
      <header className="page-head">
        <p className="type-eyebrow nr-eyebrow"><a href="/match">Match</a> · Movie Night</p>
        <h1 className="type-display-lg">Movie Night with friends</h1>
        <p className="type-body vm-muted">Everyone brings films, votes in private, and sees the results together. If you can’t agree, Match Decider spins only the films you all said yes to.</p>
      </header>
      {!user ? (
        <div className="nr-card">
          <p className="type-body">Movie Nights are for signed-in accounts, so everyone in the room is a real person you invited.</p>
          <div className="nr-row">
            <Button href="/sign-in?next=/match/night" variant="primary">Sign in</Button>
            <Button href="/sign-up?next=/match/night" variant="secondary">Create an account</Button>
          </div>
        </div>
      ) : (
        <>
          <NightStart />
          {rooms.length ? (
            <section aria-labelledby="nr-recent" className="nr-recent">
              <h2 id="nr-recent" className="type-heading-md">Your recent Movie Nights</h2>
              <ul role="list">
                {rooms.map((r) => (
                  <li key={r.id}>
                    <a href={`/match/night/${r.code}`} className="type-label">{r.title}</a>
                    <span className="type-caption vm-muted">{r.is_host ? 'You hosted' : 'Guest'} · {STATUS[r.status] ?? r.status}{r.pick ? ` · watched ${r.pick}` : ''} · {new Date(r.created_at).toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
