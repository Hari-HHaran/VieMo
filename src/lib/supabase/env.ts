/* Where the Supabase project lives. Read on the server only; the names people use in Vercel vary, so the
   common spellings all work. The public (anon / publishable) key is safe to send to browsers, because row
   level security decides what it can reach. The service-role key never leaves the server. */
function first(...names: string[]): string | undefined {
  for (const n of names) {
    const v = process.env[n]?.trim().replace(/^['"]|['"]$/g, '');
    if (v) return v;
  }
  return undefined;
}

export function supabaseUrl(): string | undefined {
  const raw = first('NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL');
  if (!raw) return undefined;
  try {
    const u = new URL(raw);
    return u.origin;
  } catch { return undefined; }
}

export function supabasePublicKey(): string | undefined {
  return first('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_ANON_KEY', 'SUPABASE_PUBLISHABLE_KEY');
}

export function supabaseSecretKey(): string | undefined {
  return first('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEY');
}

/** Accounts work when the URL and public key are both set. */
export function accountsConfigured(): boolean {
  return Boolean(supabaseUrl() && supabasePublicKey());
}
