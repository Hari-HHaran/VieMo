import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { signOut } from '../actions';
import AuthPage, { AccountsOff } from '@/components/account/AuthPage';
import ProfileForm from '@/components/account/ProfileForm';
import { safeNext } from '@/lib/auth/next';
import { accountsConfigured } from '@/lib/supabase/env';
import { currentUser } from '@/lib/supabase/server';

/* Whether accounts are on is read at request time, from the server's environment. */
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Your account' };

export default async function Account({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams;
  if (!accountsConfigured()) return <AuthPage eyebrow="Account" title="Your account"><AccountsOff /></AuthPage>;
  const { sb, user } = await currentUser();
  if (!sb || !user) redirect('/sign-in?next=/account');
  const { data: profile, error } = await sb.from('profiles').select('username, display_name, bio, watchlist_visibility, onboarded').eq('id', user.id).maybeSingle();
  const welcome = q.welcome === '1' || (profile ? !profile.onboarded : false);
  const next = typeof q.next === 'string' ? safeNext(q.next, '') : welcome ? '/' : '';

  return (
    <AuthPage eyebrow={welcome ? 'Welcome to VieMo' : 'Account'} title={welcome ? 'Set up your profile' : 'Your account'}
      intro={welcome ? 'Pick the name people will see on your collections and in Movie Night rooms. You can change it later.' : user.email ? `Signed in as ${user.email}.` : undefined}>
      {q.updated === 'password' ? <p className="acct-note type-body" role="status">Your password is changed.</p> : null}
      {profile ? (
        <ProfileForm welcome={welcome} next={next || undefined}
          profile={{ username: profile.username, display_name: profile.display_name, bio: profile.bio, watchlist_visibility: profile.watchlist_visibility === 'public' ? 'public' : 'private' }} />
      ) : (
        <p className="acct-alert type-body" role="alert">
          {error ? 'Your profile didn’t load. Reload to try again.' : 'Your account has no profile yet. The site owner needs to run the database setup (docs/supabase-setup.md).'}
        </p>
      )}
      <section className="acct-section" aria-labelledby="acct-security">
        <h2 id="acct-security" className="type-label">Sign-in and security</h2>
        <div className="acct-row">
          <a href="/reset-password" className="vm-btn vm-btn-secondary vm-btn-md type-label">Change password</a>
          <form action={signOut}><button type="submit" className="vm-btn vm-btn-ghost vm-btn-md type-label">Sign out</button></form>
        </div>
      </section>
    </AuthPage>
  );
}
