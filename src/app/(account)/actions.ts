'use server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { safeNext } from '@/lib/auth/next';
import { siteOrigin } from '@/lib/auth/origin';
import { clientIp, limitedKey } from '@/lib/rate-limit';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { currentUser, supabaseServer } from '@/lib/supabase/server';

export type FormState = {
  error?: string;
  field?: 'email' | 'password' | 'confirm_password' | 'username' | 'display_name' | 'bio';
  sent?: boolean;
  email?: string;
  name?: string;
  unconfirmed?: boolean;
  exists?: boolean;
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

/* Some auth servers drop the name given to an account the admin creates, so it's set on the new profile here,
   with a starting username made from it (never from the email). The person can change both in Account. */
async function nameProfile(sb: NonNullable<Awaited<ReturnType<typeof supabaseServer>>>, id: string, displayName: string) {
  const { data } = await sb.from('profiles').select('display_name').eq('id', id).maybeSingle();
  if (data?.display_name) return;
  const base = displayName.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 16);
  for (let i = 0; i < 3; i++) {
    const tail = crypto.getRandomValues(new Uint8Array(2)).reduce((t, x) => t + x.toString(16).padStart(2, '0'), '');
    const { error } = await sb.from('profiles').update(base.length >= 3 ? { display_name: displayName, username: `${base}_${tail}` } : { display_name: displayName }).eq('id', id);
    if (!error || error.code !== '23505') return;
  }
}

/* Sign-up with a password, and you're in: no email link to click. With the server's Supabase admin key, the
   account is created already confirmed and signed in at once (Supabase sends no email). Without it, Supabase's
   own sign-up is used, which signs straight in when the project has "Confirm email" switched off. */
export async function signUp(_: FormState, form: FormData): Promise<FormState> {
  const email = text(form, 'email').toLowerCase(), password = String(form.get('password') ?? '');
  const confirm = String(form.get('confirm_password') ?? '');
  const displayName = text(form, 'display_name', 60);
  const next = safeNext(form.get('next'), '/');
  if (!EMAIL.test(email)) return { error: 'Enter an email address, like name@example.com.', field: 'email', email, name: displayName };
  if (password.length < MIN_PASSWORD) return { error: `Use at least ${MIN_PASSWORD} characters for your password.`, field: 'password', email, name: displayName };
  if (password.length > 72) return { error: 'Use 72 characters or fewer for your password.', field: 'password', email, name: displayName };
  if (password !== confirm) return { error: 'The two passwords don’t match. Type the same password in both boxes.', field: 'confirm_password', email, name: displayName };
  if (await tooMany('sign-up', 5)) return { error: 'Too many attempts. Wait a minute, then try again.', email, name: displayName };
  const sb = await supabaseServer();
  if (!sb) return { error: OFFLINE, email, name: displayName };
  const exists: FormState = { error: 'There’s already a VieMo account with this email. Sign in with its password instead.', field: 'email', email, name: displayName, exists: true };
  const isTaken = (e: { code?: string; message?: string }) => e.code === 'email_exists' || e.code === 'user_already_exists' || /already (been )?registered|already exists/i.test(e.message ?? '');
  const admin = supabaseAdmin();
  if (admin) {
    const { data: created, error: made } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: displayName ? { display_name: displayName } : {} });
    if (made) return isTaken(made) ? exists : { error: explain(made), field: made.code === 'weak_password' ? 'password' : undefined, email, name: displayName };
    const { error: signed } = await sb.auth.signInWithPassword({ email, password });
    if (signed) return { error: explain(signed), email, name: displayName };
    if (displayName && created.user) await nameProfile(sb, created.user.id, displayName);
    revalidatePath('/', 'layout');
    redirect(next);
  }
  const { data, error } = await sb.auth.signUp({
    email, password,
    options: { data: displayName ? { display_name: displayName } : undefined, emailRedirectTo: `${await siteOrigin()}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error) return isTaken(error) ? exists : { error: explain(error), field: error.code === 'weak_password' ? 'password' : undefined, email, name: displayName };
  /* The project still asks for email confirmation (and this server has no admin key to skip it). */
  if (!data?.session) return { sent: true, email, name: displayName };
  revalidatePath('/', 'layout');
  redirect(next);
}

export async function resendConfirmation(_: FormState, form: FormData): Promise<FormState> {
  const email = text(form, 'email').toLowerCase();
  if (!EMAIL.test(email)) return { error: 'Enter your email address first.', field: 'email', email };
  if (await tooMany('resend', 3)) return { error: 'Too many attempts. Wait a minute, then try again.', email };
  const sb = await supabaseServer();
  if (!sb) return { error: OFFLINE, email };
  const { error } = await sb.auth.resend({ type: 'signup', email, options: { emailRedirectTo: `${await siteOrigin()}/auth/callback?next=/` } });
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
