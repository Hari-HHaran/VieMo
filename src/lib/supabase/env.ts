/* Where the Supabase project lives. Read on the server only.

   People name these variables in many ways in Vercel (NEXT_PUBLIC_SUPABASE_URL, Supabase_Url, a typo…), so the
   exact names are tried first, then any variable whose name looks like Supabase's, then any value that is
   unmistakably a Supabase project address or key. Values decide what a key is (publishable, anon, secret), not
   names, so a secret key can never be used where the public one belongs. The public key is safe in browsers
   because row level security decides what it can reach; the secret (service-role) key never leaves the server. */

export type KeyKind = 'publishable' | 'anon' | 'secret' | 'unknown';
export interface SupabaseEnv {
  url?: string; urlFrom?: string;
  key?: string; keyFrom?: string; keyKind?: KeyKind;
  secret?: string; secretFrom?: string;
  problems: string[];
}

/* Pasted values are tidied: surrounding quotes, and a "SUPABASE_URL=" pasted along with the value. */
const clean = (v: string | undefined) => (v ?? '').trim().replace(/^(?:[A-Za-z_]*SUPA[A-Za-z_]*\s*=\s*)?["'`]?|["'`]?$/gi, '').trim();
const norm = (name: string) => name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^NEXT_PUBLIC_/, '');
/* "SUPABASE", and near misses such as SUPASE, SUPERBASE, SUPABSE. */
const looksSupabase = (n: string) => /SUP[A-Z]{0,4}SE|SUPABASE|SUPBASE/.test(n);

function jwtPayload(v: string): Record<string, unknown> | null {
  const parts = v.split('.');
  if (parts.length !== 3 || !v.startsWith('eyJ')) return null;
  try { return JSON.parse(Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')); } catch { return null; }
}
export function kindOf(v: string): KeyKind {
  if (v.startsWith('sb_publishable_')) return 'publishable';
  if (v.startsWith('sb_secret_')) return 'secret';
  const role = jwtPayload(v)?.role;
  if (role === 'anon') return 'anon';
  if (role === 'service_role') return 'secret';
  return 'unknown';
}
function asUrl(v: string): string | undefined {
  try {
    const u = new URL(v);
    return u.protocol === 'https:' || u.hostname === 'localhost' || u.hostname === '127.0.0.1' ? u.origin : undefined;
  } catch { return undefined; }
}
const isSupabaseHost = (origin: string) => /\.supabase\.(co|in|com)$/.test(new URL(origin).hostname);

let cached: { sig: string; env: SupabaseEnv } | null = null;

export function supabaseEnv(): SupabaseEnv {
  const entries = Object.entries(process.env).filter(([, v]) => v && v.trim());
  const sig = entries.filter(([k]) => looksSupabase(norm(k))).map(([k, v]) => `${k}=${v!.length}`).join('|');
  if (cached && cached.sig === sig) return cached.env;
  const env: SupabaseEnv = { problems: [] };
  const exact = (names: string[]) => { for (const n of names) { const v = clean(process.env[n]); if (v) return { name: n, v }; } return null; };
  const named = entries.filter(([k]) => looksSupabase(norm(k))).map(([k, v]) => ({ name: k, n: norm(k), v: clean(v) }));

  // Project URL
  const u = exact(['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL'])
    ?? named.find((e) => /URL/.test(e.n) && asUrl(e.v)) ?? null;
  if (u) {
    env.url = asUrl(u.v); env.urlFrom = u.name;
    if (!env.url) env.problems.push(`${u.name} isn’t a web address. It should look like https://abcd1234.supabase.co`);
  } else {
    const byValue = entries.map(([k, v]) => ({ name: k, url: asUrl(clean(v)) })).find((e) => e.url && isSupabaseHost(e.url));
    if (byValue) { env.url = byValue.url; env.urlFrom = byValue.name; }
  }

  // Public key: exact names, then Supabase-looking names with a recognisable public key, then any value that is one.
  const k = exact(['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_ANON_KEY', 'SUPABASE_PUBLISHABLE_KEY'])
    ?? named.find((e) => /KEY|ANON|PUBLISHABLE/.test(e.n) && !/SECRET|SERVICE|JWT|PASSWORD/.test(e.n) && ['publishable', 'anon'].includes(kindOf(e.v)))
    ?? entries.map(([name, v]) => ({ name, v: clean(v) })).find((e) => kindOf(e.v) === 'publishable' || (kindOf(e.v) === 'anon' && jwtPayload(e.v)?.iss === 'supabase'))
    ?? null;
  if (k) {
    const kind = kindOf(k.v);
    if (kind === 'secret') env.problems.push(`${k.name} holds the secret (service-role) key. Use the publishable or anon key there; the secret key goes in SUPABASE_SERVICE_ROLE_KEY.`);
    else { env.key = k.v; env.keyFrom = k.name; env.keyKind = kind; }
    const ref = jwtPayload(k.v)?.ref;
    if (env.url && typeof ref === 'string' && isSupabaseHost(env.url) && !new URL(env.url).hostname.startsWith(`${ref}.`)) {
      env.problems.push(`The key in ${k.name} belongs to a different Supabase project than ${env.urlFrom}.`);
    }
  }

  // Secret key (server only)
  const s = exact(['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEY'])
    ?? named.find((e) => /SERVICE|SECRET/.test(e.n) && !/JWT/.test(e.n) && kindOf(e.v) === 'secret') ?? null;
  if (s) {
    if (kindOf(s.v) === 'publishable' || kindOf(s.v) === 'anon') env.problems.push(`${s.name} holds a public key, not the secret one.`);
    else { env.secret = s.v; env.secretFrom = s.name; }
  }
  for (const [name] of entries) if (/^NEXT_PUBLIC_/i.test(name) && kindOf(clean(process.env[name])) === 'secret') {
    env.problems.push(`${name} holds the secret key under a NEXT_PUBLIC_ name. Rename it to SUPABASE_SERVICE_ROLE_KEY so it can never reach browsers.`);
  }
  cached = { sig, env };
  return env;
}

export const supabaseUrl = () => supabaseEnv().url;
export const supabasePublicKey = () => supabaseEnv().key;
export const supabaseSecretKey = () => supabaseEnv().secret;
/** Accounts work when the URL and public key are both set. */
export const accountsConfigured = () => Boolean(supabaseUrl() && supabasePublicKey());
