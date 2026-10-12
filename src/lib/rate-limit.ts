import 'server-only';

/* Best-effort per-IP limit for routes that spend TMDB quota. In-memory, so per server instance. */
const hits = new Map<string, { n: number; reset: number }>();
export function limited(req: Request, bucket: string, perMinute: number): boolean {
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'local';
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const h = hits.get(key);
  if (!h || h.reset < now) { hits.set(key, { n: 1, reset: now + 60_000 }); return false; }
  h.n += 1;
  if (hits.size > 5000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
  return h.n > perMinute;
}
