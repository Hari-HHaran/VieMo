import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import AuthPage, { AccountsOff } from '@/components/account/AuthPage';
import { SignInForm } from '@/components/account/AuthForms';
import { safeNext } from '@/lib/auth/next';
import { accountsConfigured } from '@/lib/supabase/env';
import { currentUser } from '@/lib/supabase/server';

/* Whether accounts are on is read at request time, from the server's environment. */
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Sign in' };

const PROBLEMS: Record<string, string> = {
  expired: 'That link has expired or was already used. Sign in, or ask for a new link.',
  'other-browser': 'Your email is confirmed. Sign in here to carry on.',
  link: 'That link didn’t work. Sign in, or ask for a new one.',
  offline: 'Accounts aren’t switched on for this server yet.',
};

export default async function SignIn({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams;
  const next = safeNext(q.next, '/');
  if (!accountsConfigured()) return <AuthPage eyebrow="Account" title="Sign in"><AccountsOff /></AuthPage>;
  const { user } = await currentUser();
  if (user) redirect(next);
  const problem = typeof q.problem === 'string' ? PROBLEMS[q.problem] : undefined;
  const signUpHref = `/sign-up${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`;
  return (
    <AuthPage eyebrow="Account" title="Sign in"
      intro={next !== '/' ? 'Sign in to carry on where you were.' : 'Your watchlist, collections and Movie Nights, on every device.'}
      foot={<><a href="/forgot-password">Forgot your password?</a><span>New here? <a href={signUpHref}>Create an account</a></span></>}>
      {problem ? <p className="acct-note type-body" role="status">{problem}</p> : null}
      <SignInForm next={next} />
    </AuthPage>
  );
}
