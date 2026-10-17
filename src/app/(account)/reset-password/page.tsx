import type { Metadata } from 'next';
import AuthPage, { AccountsOff } from '@/components/account/AuthPage';
import { ResetForm } from '@/components/account/AuthForms';
import { accountsConfigured } from '@/lib/supabase/env';
import { currentUser } from '@/lib/supabase/server';

/* Whether accounts are on is read at request time, from the server's environment. */
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Choose a new password' };

/* Reached from the password email (which signs you in for this step) or from your account page. */
export default async function Reset() {
  if (!accountsConfigured()) return <AuthPage eyebrow="Account" title="Choose a new password"><AccountsOff /></AuthPage>;
  const { user } = await currentUser();
  if (!user) {
    return (
      <AuthPage eyebrow="Account" title="This link has expired" intro="Password links work once and expire after an hour."
        foot={<a href="/sign-in">Back to sign in</a>}>
        <p><a className="vm-btn vm-btn-primary vm-btn-lg type-label" href="/forgot-password">Send a new link</a></p>
      </AuthPage>
    );
  }
  return (
    <AuthPage eyebrow="Account" title="Choose a new password" intro={user.email ? `For ${user.email}.` : undefined}>
      <ResetForm />
    </AuthPage>
  );
}
