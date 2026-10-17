import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { supabaseSecretKey, supabaseUrl } from './env';

/* The service-role client bypasses row level security. Only trusted server code uses it (awarding badges,
   writing checked filming locations, computing match results), and never with input it hasn't validated. */
export function supabaseAdmin() {
  const url = supabaseUrl(), key = supabaseSecretKey();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}
