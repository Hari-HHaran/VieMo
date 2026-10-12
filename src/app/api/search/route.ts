import { NextResponse } from 'next/server';
import { limited } from '@/lib/rate-limit';
import { searchMovies, TmdbError, yearOf } from '@/lib/tmdb';

export async function GET(req: Request) {
  if (limited(req, 'search', 60)) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  const q = (new URL(req.url).searchParams.get('q') || '').trim().slice(0, 100);
  if (!q) return NextResponse.json({ results: [] });
  try {
    const r = await searchMovies(q);
    return NextResponse.json({ results: r.results.slice(0, 8).map((m) => ({ id: m.id, title: m.title, year: yearOf(m), posterPath: m.poster_path })) });
  } catch (e) {
    const kind = e instanceof TmdbError ? e.kind : 'upstream';
    return NextResponse.json({ error: kind }, { status: kind === 'config' ? 503 : 502 });
  }
}
