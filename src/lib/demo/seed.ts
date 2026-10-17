import 'server-only';
import { supabaseAdmin } from '../supabase/admin';
import { filmKey, fixedFixture, validateFixture, type Account } from './fixture';
import { resolveFilms, type RejectedFilm, type ResolvedFilm } from './resolve';

export type SeedAction = 'dry_run' | 'seed' | 'cleanup';
export interface SeedReport {
  action: SeedAction; at: string; ok: boolean; error?: string;
  fixes: string[]; problems: string[];
  films: { resolved: number; yearOffByOne: string[]; rejected: RejectedFilm[] };
  accounts: { created: string[]; existing: string[]; skipped: { seed_key: string; why: string }[] };
  skippedEntries: string[];
  database?: Record<string, unknown>;
  removed?: string[];
}

/* Where the importer may run, decided on the server. Off unless DEMO_SEED_ENABLED is set; on a production
   deployment it also needs the explicit approval box ticked on the admin page. */
export function seedEnvironment() {
  const enabled = /^(1|true|yes|on)$/i.test(process.env.DEMO_SEED_ENABLED?.trim() ?? '');
  /* Vercel says which deployment this is (production, preview, development); VIEMO_ENV overrides it, for
     self-hosting. Anywhere else is a local machine. */
  const env = (process.env.VIEMO_ENV || process.env.VERCEL_ENV || 'local').trim().toLowerCase();
  return { enabled, env, production: env === 'production' };
}

const blank = (action: SeedAction): SeedReport => ({
  action, at: new Date().toISOString(), ok: false, fixes: [], problems: [],
  films: { resolved: 0, yearOffByOne: [], rejected: [] }, accounts: { created: [], existing: [], skipped: [] }, skippedEntries: [],
});

/* Runs the demo importer. dry_run resolves films and checks accounts without writing anything. */
export async function runDemoSeed(action: SeedAction, actorId: string | null): Promise<SeedReport> {
  const report = blank(action);
  const admin = supabaseAdmin();
  if (!admin) return { ...report, error: 'The server has no Supabase secret key (SUPABASE_SERVICE_ROLE_KEY).' };
  const { fixture, changes } = fixedFixture();
  report.fixes = changes;
  const seedKeys = new Set(fixture.accounts.map((a) => a.seed_key));

  if (action === 'cleanup') {
    const { data, error } = await admin.rpc('demo_seed_targets');
    if (error) return { ...report, error: `Couldn’t list demo accounts: ${error.message}` };
    report.removed = [];
    for (const t of (data ?? []) as { user_id: string; email: string; demo_seed_key: string | null }[]) {
      /* Only accounts this fixture created: a reserved demo address and one of its seed keys. */
      if (!t.demo_seed_key || !seedKeys.has(t.demo_seed_key)) continue;
      const { error: de } = await admin.auth.admin.deleteUser(t.user_id);
      if (de) report.problems.push(`Couldn’t remove ${t.email}: ${de.message}`); else report.removed.push(t.email);
    }
    report.ok = report.problems.length === 0;
    await admin.from('demo_seed_runs').insert({ ran_by: actorId, action, report });
    return report;
  }

  report.problems = validateFixture(fixture);
  if (report.problems.length) return { ...report, error: 'The fixture has problems; nothing was written.' };

  const allFilms = fixture.accounts.flatMap((a) => [...a.watched, ...a.watchlist, ...a.collections.flatMap((c) => c.movies)]);
  const { resolved, rejected } = await resolveFilms(allFilms);
  report.films = { resolved: resolved.size, yearOffByOne: [...resolved.values()].filter((r) => r.match === 'year_off_by_one').map((r) => `${r.key} → TMDB ${r.title} (${r.year})`), rejected };

  const { data: found, error: le } = await admin.rpc('demo_seed_lookup', { p_emails: fixture.accounts.map((a) => a.demo_email) });
  if (le) return { ...report, error: `Couldn’t check existing accounts: ${le.message}. Has migration 0005 been run?` };
  const existing = new Map(((found ?? []) as { email: string; user_id: string; has_profile: boolean; is_demo: boolean }[]).map((r) => [r.email.toLowerCase(), r]));

  const ids = new Map<string, string>();
  for (const a of fixture.accounts) {
    const e = existing.get(a.demo_email.toLowerCase());
    if (e) { ids.set(a.seed_key, e.user_id); report.accounts.existing.push(a.username); continue; }
    if (action === 'dry_run') { report.accounts.created.push(`${a.username} (would be created)`); continue; }
    /* A real Auth user, made with the Admin API. No password: demo accounts can't be signed into. The reserved
       example.com address can't receive mail, and email_confirm means none is sent. */
    const { data, error } = await admin.auth.admin.createUser({ email: a.demo_email, email_confirm: true, user_metadata: { display_name: a.display_name, demo: true } });
    if (error || !data.user) { report.accounts.skipped.push({ seed_key: a.seed_key, why: error?.message ?? 'no user returned' }); continue; }
    ids.set(a.seed_key, data.user.id);
    report.accounts.created.push(a.username);
  }

  const film = (f: { title: string; release_year: number }, where: string): ResolvedFilm | null => {
    const r = resolved.get(filmKey(f));
    if (!r) report.skippedEntries.push(`${where}: ${filmKey(f)} (not resolved)`);
    return r ?? null;
  };
  const accountPayload = (a: Account) => ({
    seed_key: a.seed_key, user_id: ids.get(a.seed_key), email: a.demo_email, username: a.username, display_name: a.display_name, bio: a.bio,
    watchlist_visibility: a.watchlist_visibility,
    watched: a.watched.map((w) => ({ w, f: film(w, `${a.username} watched`) })).filter((x) => x.f)
      .map(({ w, f }) => ({ tmdb_id: f!.tmdb_id, watched_on: w.watched_on, rating: w.rating, review: w.review, review_visibility: w.review_visibility })),
    watchlist: [...new Set(a.watchlist.map((w) => film(w, `${a.username} watchlist`)?.tmdb_id).filter((x): x is number => !!x))],
    collections: a.collections.map((c) => ({
      seed_key: c.seed_key, title: c.title, description: c.description, visibility: c.visibility,
      films: [...new Set(c.movies.map((m) => film(m, `${a.username} / ${c.title}`)?.tmdb_id).filter((x): x is number => !!x))],
    })),
  });
  const accounts = fixture.accounts.filter((a) => ids.has(a.seed_key)).map(accountPayload);
  const keyOf = new Map(fixture.accounts.map((a) => [a.username, a.seed_key]));
  const follows = fixture.follows.map((f) => ({ follower: keyOf.get(f.follower), following: keyOf.get(f.following) }));

  if (action === 'dry_run') { report.ok = rejected.length === 0; return report; }
  const { data: db, error: ae } = await admin.rpc('demo_seed_apply', { p: { films: [...resolved.values()], accounts, follows } });
  if (ae) return { ...report, error: `The database refused the import: ${ae.message}` };
  report.database = db as Record<string, unknown>;
  for (const s of ((db as { skipped?: { seed_key: string; why: string }[] })?.skipped ?? [])) report.accounts.skipped.push(s);
  report.ok = true;
  await admin.from('demo_seed_runs').insert({ ran_by: actorId, action, report });
  return report;
}

/* How many demo accounts exist now, and the last run, for the admin page. */
export async function demoState() {
  const admin = supabaseAdmin();
  if (!admin) return null;
  const [{ data: targets }, { data: runs }] = await Promise.all([
    admin.rpc('demo_seed_targets'),
    admin.from('demo_seed_runs').select('ran_at, action, report').order('ran_at', { ascending: false }).limit(1),
  ]);
  return { accounts: (targets as unknown[] | null)?.length ?? 0, last: (runs?.[0] as { ran_at: string; action: SeedAction; report: SeedReport } | undefined) ?? null };
}
