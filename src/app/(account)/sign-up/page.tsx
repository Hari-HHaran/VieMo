import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import AuthPage, { AccountsOff } from '@/components/account/AuthPage';
import { SignUpForm } from '@/components/account/AuthForms';
import { safeNext } from '@/lib/auth/next';
import { accountsConfigured } from '@/lib/supabase/env';
import { currentUser } from '@/lib/supabase/server';

/* Whether accounts are on is read at request time, from the server's environment. */
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Create an account' };

export default async function SignUp({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const next = safeNext((await searchParams).next, '/');
  if (!accountsConfigured()) return <AuthPage eyebrow="Account" title="Create an account"><AccountsOff /></AuthPage>;
  const { user } = await currentUser();
  if (user) redirect(next === '/' ? '/account' : next);
  return (
    <AuthPage eyebrow="Account" title="Create an account"
      intro="Free. Keep your watchlist and diary on every device, share collections, and run Movie Nights with friends."
      foot={<span>Already have an account? <a href={`/sign-in${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`}>Sign in</a></span>}>
      <SignUpForm next={next} />
      <p className="type-caption vm-muted">New watchlists and collections start private. You choose what to share.</p>
    </AuthPage>
  );
}
