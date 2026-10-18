'use client';
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

/* One browser client per page, used only for Realtime in Movie Night rooms. It holds the public (publishable) key
   the server passes down and the signed-in person's session from cookies, so Realtime applies their row level
   security. It never sees a secret key. */
let client: SupabaseClient | null = null;
export function supabaseBrowser(url: string, key: string): SupabaseClient {
  if (!client) client = createBrowserClient(url, key);
  return client;
}
