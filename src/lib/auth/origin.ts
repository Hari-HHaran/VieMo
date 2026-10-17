import 'server-only';
import { headers } from 'next/headers';

/* This site's address, for the links in sign-up and password emails. Supabase only sends people to
   addresses on its Redirect URLs allow-list, so a forged Host header can't send links elsewhere. */
export async function siteOrigin(): Promise<string> {
  const fixed = (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || '').trim();
  if (fixed) { try { return new URL(fixed).origin; } catch {} }
  const h = await headers();
  const host = h.get('x-forwarded-host')?.split(',')[0].trim() || h.get('host') || 'localhost:3000';
  const proto = h.get('x-forwarded-proto')?.split(',')[0].trim() || (/^(localhost|127\.)/.test(host) ? 'http' : 'https');
  return `${proto}://${host}`;
}
