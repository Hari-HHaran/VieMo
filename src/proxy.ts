import type { NextRequest } from 'next/server';
import { refreshSession } from '@/lib/supabase/proxy';

export async function proxy(request: NextRequest) {
  return refreshSession(request);
}

export const config = {
  /* Pages and API routes; not Next's own files, images, fonts or other static assets. */
  matcher: ['/((?!_next/static|_next/image|favicon.ico|fonts/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?|json|txt|xml)$).*)'],
};
