import type { Metadata } from 'next';
import AuthPage, { AccountsOff } from '@/components/account/AuthPage';
import { ForgotForm } from '@/components/account/AuthForms';
import { accountsConfigured } from '@/lib/supabase/env';

/* Whether accounts are on is read at request time, from the server's environment. */
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Reset your password' };

export default function Forgot() {
  return (
    <AuthPage eyebrow="Account" title="Reset your password" intro={accountsConfigured() ? 'We’ll email you a link to choose a new one.' : undefined}
      foot={<a href="/sign-in">Back to sign in</a>}>
      {accountsConfigured() ? <ForgotForm /> : <AccountsOff />}
    </AuthPage>
  );
}
