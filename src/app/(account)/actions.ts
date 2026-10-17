'use server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { safeNext } from '@/lib/auth/next';
import { siteOrigin } from '@/lib/auth/origin';
import { clientIp, limitedKey } from '@/lib/rate-limit';
import { currentUser, supabaseServer } from '@/lib/supabase/server';

export type FormState = {
  error?: string;
  field?: 'email' | 'password' | 'username' | 'display_name' | 'bio';
  sent?: boolean;
  email?: string;
  unconfirmed?: boolean;
  saved?: boolean;
};

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;
const MIN_PASSWORD = 8;
const OFFLINE = 'Accounts aren’t switched on for this VieMo server yet. The site owner connects Supabase first.';

function text(form: FormData, name: string, max = 320): string {
  const v = form.get(name);
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

/* Supabase's own limits stop real abuse; this just keeps one address from hammering a single server. */
async function tooMany(bucket: string, perMinute: number): Promise<boolean> {
  return limitedKey(`${bucket}:${clientIp(await headers())}`, perMinute);
}

/* Plain-language messages for what the auth server says. Never says whether an email has an account. */
function explain(err: { code?: string; status?: number; message?: string; name?: string }): string {
  switch (err.code) {
    case 'invalid_credentials': return 'That email and password don’t match. Check both and try again.';
    case 'email_not_confirmed': return 'Confirm your email first: open the link we sent you.';
    case 'weak_password': return `Choose a stronger password: at least ${MIN_PASSWORD} characters, and not a common one.`;
    case 'same_password': return 'That’s your current password. Choose a new one.';
    case 'email_address_invalid': return 'That email address doesn’t look right.';
    case 'signup_disabled': return 'New accounts are switched off on this server right now.';
    case 'over_request_rate_limit': case 'over_email_send_rate_limit': return 'Too many attempts. Wait a minute, then try again.';
    case 'session_not_found': case 'session_expired': return 'Your session ended. Sign in again.';
  }
  if (err.name === 'AuthRetryableFetchError' || !err.status) return 'We couldn’t reach the account service. Check your connection and try again.';
  return 'Something went wrong on the account service. Try again in a moment.';
}

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const email = text(form, 'email').toLowerCase(), password = String(form.get('password') ?? '');
  const next = safeNext(form.get('next'), '/');
  if (!EMAIL.test(email)) return { error: 'Enter the email address you signed up with.', field: 'email', email };
  if (!password) return { error: 'Enter your password.', field: 'password', email };
  if (await tooMany('sign-in', 10)) return { error: 'Too many attempts. Wait a minute, then try again.', email };
  const sb = await supabaseServer();
  if (!sb) return { error: OFFLINE, email };
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return { error: explain(error), field: error.code === 'invalid_credentials' ? 'password' : undefined, email, unconfirmed: error.code === 'email_not_confirmed' };
  revalidatePath('/', 'layout');
  redirect(next);
}

export async function signUp(_: FormState, form: FormData): Promise<FormState> {
  const email = text(form, 'email').toLowerCase(), password = String(form.get('password') ?? '');
  const displayName = text(form, 'display_name', 60);
  const next = safeNext(form.get('next'), '/');
  if (!EMAIL.test(email)) return { error: 'Enter an email address you can open: we send a link to confirm it.', field: 'email', email };
  if (password.length < MIN_PASSWORD) return { error: `Use at least ${MIN_PASSWORD} characters for your password.`, field: 'password', email };
  if (password.length > 72) return { error: 'Use 72 characters or fewer for your password.', field: 'password', email };
  if (await tooMany('sign-up', 5)) return { error: 'Too many attempts. Wait a minute, then try again.', email };
  const sb = await supabaseServer();
  if (!sb) return { error: OFFLINE, email };
  const welcome = `/account?welcome=1${next !== '/' ? `&next=${encodeURIComponent(next)}` : ''}`;
  const { data, error } = await sb.auth.signUp({
    email, password,
    options: { data: displayName ? { display_name: displayName } : undefined, emailRedirectTo: `${await siteOrigin()}/auth/callback?next=${encodeURIComponent(welcome)}` },
  });
  if (error && error.code !== 'user_already_exists') return { error: explain(error), field: error.code === 'weak_password' ? 'password' : undefined, email };
  /* With email confirmation on (the default), there's no session yet: the link in the email finishes it.
     Supabase answers the same way for an address that already has an account, so nobody can probe for one. */
  if (!data?.session) return { sent: true, email };
  revalidatePath('/', 'layout');
  redirect(welcome);
}

export async function resendConfirmation(_: FormState, form: FormData): Promise<FormState> {
  const email = text(form, 'email').toLowerCase();
  if (!EMAIL.test(email)) return { error: 'Enter your email address first.', field: 'email', email };
  if (await tooMany('resend', 3)) return { error: 'Too many attempts. Wait a minute, then try again.', email };
  const sb = await supabaseServer();
  if (!sb) return { error: OFFLINE, email };
  const { error } = await sb.auth.resend({ type: 'signup', email, options: { emailRedirectTo: `${await siteOrigin()}/auth/callback?next=${encodeURIComponent('/account?welcome=1')}` } });
  if (error) return { error: explain(error), email };
  return { sent: true, email };
}

export async function requestReset(_: FormState, form: FormData): Promise<FormState> {
  const email = text(form, 'email').toLowerCase();
  if (!EMAIL.test(email)) return { error: 'Enter the email address you signed up with.', field: 'email', email };
  if (await tooMany('reset', 3)) return { error: 'Too many attempts. Wait a minute, then try again.', email };
  const sb = await supabaseServer();
  if (!sb) return { error: OFFLINE, email };
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: `${await siteOrigin()}/auth/callback?next=/reset-password` });
  /* Same answer whether or not the address has an account. */
  if (error && (error.code?.startsWith('over_') || !error.status)) return { error: explain(error), email };
  return { sent: true, email };
}

export async function setNewPassword(_: FormState, form: FormData): Promise<FormState> {
  const password = String(form.get('password') ?? '');
  if (password.length < MIN_PASSWORD) return { error: `Use at least ${MIN_PASSWORD} characters for your password.`, field: 'password' };
  if (password.length > 72) return { error: 'Use 72 characters or fewer for your password.', field: 'password' };
  const { sb, user } = await currentUser();
  if (!sb) return { error: OFFLINE };
  if (!user) return { error: 'This reset link has expired. Ask for a new one.' };
  const { error } = await sb.auth.updateUser({ password });
  if (error) return { error: explain(error), field: error.code === 'weak_password' || error.code === 'same_password' ? 'password' : undefined };
  revalidatePath('/', 'layout');
  redirect('/account?updated=password');
}

export async function signOut(): Promise<void> {
  const sb = await supabaseServer();
  if (sb) await sb.auth.signOut({ scope: 'local' });
  revalidatePath('/', 'layout');
  redirect('/');
}

const USERNAME = /^[a-z0-9_]{3,24}$/;
export async function saveProfile(_: FormState, form: FormData): Promise<FormState> {
  const { sb, user } = await currentUser();
  if (!sb) return { error: OFFLINE };
  if (!user) redirect('/sign-in?next=/account');
  const username = text(form, 'username', 40).toLowerCase();
  const display_name = text(form, 'display_name', 80);
  const bio = text(form, 'bio', 400);
  const watchlist_visibility = form.get('watchlist_visibility') === 'public' ? 'public' : 'private';
  const av = form.get('activity_visibility');
  const activity = av == null ? {} : { activity_visibility: av === 'public' || av === 'friends' ? av : 'private' };
  if (!USERNAME.test(username)) return { error: 'Usernames are 3 to 24 characters: lowercase letters, numbers and underscores.', field: 'username' };
  if (display_name.length > 60) return { error: 'Keep your name to 60 characters.', field: 'display_name' };
  if (bio.length > 280) return { error: 'Keep your bio to 280 characters.', field: 'bio' };
  const { error } = await sb.from('profiles')
    .update({ username, display_name: display_name || null, bio: bio || null, watchlist_visibility, ...activity, onboarded: true })
    .eq('id', user.id);
  if (error) {
    if (error.code === '23505') return { error: `@${username} is taken. Try another.`, field: 'username' };
    return { error: 'Your profile didn’t save. Try again in a moment.' };
  }
  revalidatePath('/', 'layout');
  const next = form.get('next');
  if (typeof next === 'string' && next) redirect(safeNext(next, '/account'));
  return { saved: true };
}
