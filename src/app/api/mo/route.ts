import { type NextRequest } from 'next/server';
import { runMo } from '@/lib/mo/server';
import type { MoEvent, MoRequest } from '@/lib/mo/shared';
import { clientIp, limited } from '@/lib/rate-limit';
import { viewerRegion } from '@/lib/region';
import { currentUser } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/* A day's allowance per visitor, on top of the per-minute limit. In memory, so per server instance; the shared
   daily token cap in the database is the hard stop. */
const days = new Map<string, { n: number; day: string }>();
const DAILY = Number(process.env.MO_DAILY_MESSAGES_PER_VISITOR) || 150;
function overDaily(ip: string) {
  const day = new Date().toISOString().slice(0, 10);
  const d = days.get(ip);
  if (!d || d.day !== day) { days.set(ip, { n: 1, day }); if (days.size > 20000) days.clear(); return false; }
  return ++d.n > DAILY;
}
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');

/* Checks and trims what the browser sent: the recent conversation, the page, and this device's lists. */
function parse(body: unknown): MoRequest | null {
  const b = body as Partial<MoRequest> | null;
  if (!b || !Array.isArray(b.messages) || !b.messages.length) return null;
  const messages = b.messages.slice(-14).map((m) => ({ role: m?.role === 'assistant' ? 'assistant' as const : 'user' as const, text: str(m?.text, m?.role === 'assistant' ? 2000 : 800) })).filter((m) => m.text.trim());
  if (!messages.length || messages[messages.length - 1].role !== 'user') return null;
  const c = (b.context ?? {}) as MoRequest['context'];
  const film = c.film && Number.isInteger(c.film.id) ? { id: c.film.id, title: str(c.film.title, 200), year: Number(c.film.year) || null } : null;
  const list = <T,>(v: unknown, n: number, f: (x: Record<string, unknown>) => T | null) => (Array.isArray(v) ? v.slice(0, n).map((x) => f(x ?? {})).filter((x): x is T => !!x) : []);
  return {
    messages, spoilerFree: b.spoilerFree !== false,
    context: {
      path: str(c.path, 200) || '/', page: str(c.page, 60) || 'VieMo', film,
      location: c.location ? { name: str(c.location.name, 120), country: str(c.location.country, 80) || null, sample: !!c.location.sample } : null,
      moods: (Array.isArray(c.moods) ? c.moods : []).slice(0, 4).filter((x): x is string => typeof x === 'string').map((x) => x.slice(0, 30)),
      room: c.room ? { code: str(c.room.code, 6), title: str(c.room.title, 80), status: str(c.room.status, 10) } : null,
      collection: c.collection ? { share: str(c.collection.share, 16), title: str(c.collection.title, 120) } : null,
      member: str(c.member, 40) || null,
    },
    device: {
      watchlist: list(b.device?.watchlist, 60, (x) => (Number.isInteger(x.id) ? { id: x.id as number, title: str(x.title, 200), year: Number(x.year) || null } : null)),
      watched: list(b.device?.watched, 30, (x) => (Number.isInteger(x.id) ? { id: x.id as number, title: str(x.title, 200), rating: typeof x.rating === 'number' ? x.rating : null, on: str(x.on, 10) } : null)),
    },
  };
}

/* Mo's chat. The reply streams back as one JSON event per line: text as it's written, film cards, sources, and any
   action cards, which the browser runs only after the person confirms. */
export async function POST(req: NextRequest) {
  const one = (e: MoEvent, status = 200) => new Response(JSON.stringify(e) + '\n' + JSON.stringify({ t: 'done' }) + '\n', { status, headers: { 'content-type': 'application/x-ndjson', 'cache-control': 'no-store' } });
  if (limited(req, 'mo', Number(process.env.MO_MESSAGES_PER_MINUTE) || 10)) return one({ t: 'error', kind: 'rate_limited', message: 'That’s a lot of questions in a minute. Give Mo a moment.' }, 429);
  if (overDaily(clientIp(req.headers))) return one({ t: 'error', kind: 'rate_limited', message: 'You’ve reached today’s questions for Mo. Come back tomorrow.' }, 429);
  let body: unknown;
  try { body = await req.json(); } catch { return one({ t: 'error', kind: 'bad_request', message: 'That message didn’t come through. Try again.' }, 400); }
  const parsed = parse(body);
  if (!parsed) return one({ t: 'error', kind: 'bad_request', message: 'That message didn’t come through. Try again.' }, 400);
  const [region, account] = await Promise.all([viewerRegion(), currentUser()]);
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (e: MoEvent) => { try { controller.enqueue(enc.encode(JSON.stringify(e) + '\n')); } catch {} };
      await runMo(parsed, region, emit, req.signal, account);
      emit({ t: 'done' });
      try { controller.close(); } catch {}
    },
  });
  return new Response(stream, { headers: { 'content-type': 'application/x-ndjson', 'cache-control': 'no-store', 'x-accel-buffering': 'no' } });
}
