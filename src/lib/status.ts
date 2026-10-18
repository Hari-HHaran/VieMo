import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { aiConfigured, AI_PROVIDER } from './ai';
import { supabaseEnv } from './supabase/env';
import { dataSource } from './tmdb';

export type Check = { label: string; ok: boolean | null; detail: string };

const withTimeout = <T,>(p: PromiseLike<T>, ms = 5000) =>
  Promise.race([Promise.resolve(p), new Promise<never>((_, no) => setTimeout(() => no(new Error('timeout')), ms))]);

/* What this server can see, for the site owner. Variable names only; values are never shown. */
export async function siteStatus(): Promise<{ accounts: Check[]; database: Check[]; other: Check[]; problems: string[] }> {
  const env = supabaseEnv();
  const accounts: Check[] = [
    { label: 'Supabase project address', ok: !!env.url, detail: env.url ? `Found in ${env.urlFrom}` : 'Not found. Add NEXT_PUBLIC_SUPABASE_URL in Vercel, then redeploy.' },
    { label: 'Supabase public key', ok: !!env.key, detail: env.key ? `Found in ${env.keyFrom}${env.keyKind && env.keyKind !== 'unknown' ? ` (${env.keyKind} key)` : ''}` : 'Not found. Add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or the anon key), then redeploy.' },
    { label: 'Supabase secret key (server only)', ok: env.secret ? true : null, detail: env.secret ? `Found in ${env.secretFrom}. Needed only for the demo importer and other server jobs.` : 'Not set. Accounts work without it; the demo importer needs SUPABASE_SERVICE_ROLE_KEY (mark it Sensitive).' },
  ];
  const database: Check[] = [];
  if (env.url && env.key) {
    try {
      const r = await withTimeout(fetch(`${env.url}/auth/v1/settings`, { headers: { apikey: env.key }, cache: 'no-store' }));
      accounts.push({ label: 'Supabase accepts the key', ok: r.ok, detail: r.ok ? 'Sign-in service reachable and the key is valid.' : r.status === 401 || r.status === 403 ? 'Supabase refused this key. Copy it again from Project Settings → API Keys.' : `Supabase answered ${r.status}.` });
      if (r.ok) {
        const sb = createClient(env.url, env.key, { auth: { persistSession: false, autoRefreshToken: false } });
        const table = async (label: string, name: string) => {
          const { error } = await withTimeout(sb.from(name).select('*', { head: true, count: 'exact' }).limit(1));
          const missing = error && (error.code === 'PGRST205' || error.code === '42P01' || /does not exist|schema cache/i.test(error.message));
          database.push({ label, ok: !missing, detail: missing ? 'Not created yet. Run this migration in the SQL Editor.' : 'Ready.' });
        };
        const fn = async (label: string, name: string, args: Record<string, unknown>) => {
          const { error } = await withTimeout(sb.rpc(name, args));
          const missing = error && (error.code === 'PGRST202' || /could not find the function/i.test(error.message));
          database.push({ label, ok: !missing, detail: missing ? 'Not created yet. Run this migration in the SQL Editor.' : 'Ready.' });
        };
        await table('Migration 0001: profiles and follows', 'profiles');
        await table('Migration 0002: watchlists, diaries and collections', 'movie_collections');
        await table('Migration 0003: SceneAtlas', 'places');
        await fn('Migration 0004: Screening Activity', 'can_view_activity', { p_owner: '00000000-0000-0000-0000-000000000000' });
        await table('Migration 0005: community and demo labels', 'demo_seed_runs');
        await table('Migration 0006: WheelMo', 'wheel_spins');
        await table('Migration 0007: Movie Night rooms', 'movie_nights');
      }
    } catch (e) {
      accounts.push({ label: 'Supabase accepts the key', ok: false, detail: (e as Error).message === 'timeout' ? 'No answer within 5 seconds.' : 'Couldn’t reach the Supabase address.' });
    }
  }
  const tmdb = dataSource();
  const other: Check[] = [
    { label: 'Film data (TMDB)', ok: tmdb.mode !== 'none', detail: tmdb.mode === 'live' ? 'Live TMDB.' : tmdb.mode === 'snapshot' ? 'Saved snapshot (no TMDB token).' : 'No TMDB token and no snapshot.' },
    { label: 'AI service (Reel Director, Mo)', ok: aiConfigured() ? true : null, detail: aiConfigured() ? `Key found; requests go to ${AI_PROVIDER}.` : 'No key. Reel Director stays switched off.' },
  ];
  return { accounts, database, other, problems: env.problems };
}
