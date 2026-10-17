/* Where to send someone after signing in. Only paths on this site: never another origin ("//evil.com",
   "/\\evil.com", "https://…"), and never back into the sign-in pages themselves. */
export function safeNext(raw: unknown, fallback = '/'): string {
  if (typeof raw !== 'string' || raw.length > 512) return fallback;
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\') || /[\u0000-\u001f]/.test(raw)) return fallback;
  try {
    const u = new URL(raw, 'http://x');
    if (u.origin !== 'http://x') return fallback;
    if (/^\/(sign-in|sign-up|forgot-password|auth\/)/.test(u.pathname)) return fallback;
    return u.pathname + u.search + u.hash;
  } catch { return fallback; }
}
