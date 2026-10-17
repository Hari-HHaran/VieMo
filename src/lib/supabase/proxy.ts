import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { supabasePublicKey, supabaseUrl } from './env';

/* Keeps a signed-in session fresh: when the access token is close to expiring, the refresh happens here and
   the new cookies go out on the response. Visitors without a session cookie cost nothing. */
export async function refreshSession(request: NextRequest) {
  const url = supabaseUrl(), key = supabasePublicKey();
  if (!url || !key || !request.cookies.getAll().some((c) => c.name.startsWith('sb-'))) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const sb = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list, headers) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });
  try { await sb.auth.getClaims(); } catch {}
  return response;
}
