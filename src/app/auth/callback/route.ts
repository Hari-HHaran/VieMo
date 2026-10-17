import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { safeNext } from '@/lib/auth/next';
import { siteOrigin } from '@/lib/auth/origin';
import { supabaseServer } from '@/lib/supabase/server';

const OTP_TYPES = new Set(['signup', 'recovery', 'invite', 'magiclink', 'email', 'email_change']);

/* Where the links in confirmation and password emails land. Supabase sends either a one-time code (opened
   in the browser that asked for it) or a token hash (works in any browser, with the custom email template
   in docs/supabase-setup.md). Either way it becomes a session cookie, then we go on to `next`. */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const origin = await siteOrigin();
  const next = safeNext(q.get('next'), '/account');
  const fail = (why: string) => NextResponse.redirect(new URL(`/sign-in?problem=${why}`, origin));

  if (q.get('error') || q.get('error_code')) return fail(q.get('error_code') === 'otp_expired' ? 'expired' : 'link');
  const sb = await supabaseServer();
  if (!sb) return fail('offline');

  const code = q.get('code'), tokenHash = q.get('token_hash'), type = q.get('type');
  if (code) {
    const flowId = q.get('sb_flow_id');
    const { error } = await sb.auth.exchangeCodeForSession(code, flowId ? { flowId } : undefined);
    if (error) return fail(['pkce_code_verifier_not_found', 'flow_state_not_found', 'bad_code_verifier'].includes(error.code ?? '') ? 'other-browser' : 'expired');
  } else if (tokenHash && type && OTP_TYPES.has(type)) {
    const { error } = await sb.auth.verifyOtp({ token_hash: tokenHash, type: type as EmailOtpType });
    if (error) return fail('expired');
  } else {
    return fail('link');
  }
  return NextResponse.redirect(new URL(type === 'recovery' ? '/reset-password' : next, origin));
}
