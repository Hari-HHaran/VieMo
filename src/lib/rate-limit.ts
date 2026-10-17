import 'server-only';

/* Best-effort per-IP limit for routes that spend TMDB quota. In-memory, so per server instance. */
const hits = new Map<string, { n: number; reset: number }>();
export function clientIp(headers: Headers): string {
  return (headers.get('x-forwarded-for') || '').split(',')[0].trim() || headers.get('x-real-ip') || 'local';
}
export function limited(req: Request, bucket: string, perMinute: number): boolean {
  return limitedKey(`${bucket}:${clientIp(req.headers)}`, perMinute);
}
export function limitedKey(key: string, perMinute: number): boolean {
  const now = Date.now();
  const h = hits.get(key);
  if (!h || h.reset < now) { hits.set(key, { n: 1, reset: now + 60_000 }); return false; }
  h.n += 1;
  if (hits.size > 5000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
  return h.n > perMinute;
}
