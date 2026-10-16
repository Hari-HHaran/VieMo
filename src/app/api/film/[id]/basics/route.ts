import { NextResponse } from 'next/server';
import { limited } from '@/lib/rate-limit';
import { movieBasics, TmdbError, yearOf } from '@/lib/tmdb';

/* The few facts the Wall of Fame keeps about a film you log from search: title, year, poster and genres. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (limited(req, 'basics', 60)) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  const { id } = await ctx.params;
  if (!/^\d{1,9}$/.test(id)) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  try {
    const m = await movieBasics(Number(id));
    if (!m) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ id: m.id, title: m.title, year: yearOf(m), posterPath: m.poster_path, genres: m.genres.map((g) => g.name) });
  } catch (e) {
    const kind = e instanceof TmdbError ? e.kind : 'upstream';
    return NextResponse.json({ error: kind }, { status: kind === 'config' ? 503 : kind === 'not_found' ? 404 : 502 });
  }
}
