import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabasePublicKey, supabaseUrl } from './env';

/* A Supabase client that acts as the signed-in person (their session lives in cookies), so every query runs
   under row level security as them. Returns null when accounts aren't configured. */
export async function supabaseServer() {
  const url = supabaseUrl(), key = supabasePublicKey();
  if (!url || !key) return null;
  const store = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        /* Server Components can't set cookies; the proxy refreshes the session for them instead. */
        try { list.forEach(({ name, value, options }) => store.set(name, value, options)); } catch {}
      },
    },
  });
}

/** The signed-in person, checked with the auth server (not just read from the cookie). */
export async function currentUser() {
  const sb = await supabaseServer();
  if (!sb) return { sb: null, user: null } as const;
  const { data } = await sb.auth.getUser();
  return { sb, user: data.user ?? null } as const;
}
