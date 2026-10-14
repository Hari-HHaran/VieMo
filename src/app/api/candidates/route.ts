import { NextResponse } from 'next/server';
import { moodById, runtimeById } from '@/lib/moods';
import { limited } from '@/lib/rate-limit';
import { viewerRegion } from '@/lib/region';
import type { Candidate } from '@/lib/scoring';
import { discover, movieBasics, TmdbError, yearOf } from '@/lib/tmdb';

/* Quick pick deck: up to 20 real films matching the hard constraints (runtime, services), shaped by mood. */
export async function GET(req: Request) {
  if (limited(req, 'candidates', 20)) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  const u = new URL(req.url);
  const mood = moodById(u.searchParams.get('mood'));
  const runtime = runtimeById(u.searchParams.get('runtime'));
  const providers = (u.searchParams.get('providers') || '').split(',').filter((x) => /^\d{1,6}$/.test(x)).slice(0, 10).map(Number);
  const page = Math.min(Math.max(Number(u.searchParams.get('page')) || 1, 1), 10);
  const region = await viewerRegion();
  try {
    const list = await discover({ genresAny: mood?.genres, runtimeGte: runtime.gte, runtimeLte: runtime.lte, providers, region, page });
    const details = await Promise.all(list.results.slice(0, 20).map((m) => movieBasics(m.id).catch(() => null)));
    if (list.results.length && details.every((d) => !d)) return NextResponse.json({ error: 'upstream' }, { status: 502 });
    const candidates: Candidate[] = details.filter((d): d is NonNullable<typeof d> => !!d).map((d) => {
      const wp = d['watch/providers']?.results?.[region];
      const names = [...(wp?.flatrate ?? []), ...(wp?.free ?? []), ...(wp?.ads ?? [])].map((p) => p.provider_name);
      return {
        id: d.id, title: d.title, year: yearOf(d), runtime: d.runtime, genres: d.genres, posterPath: d.poster_path,
        overview: d.overview, voteAverage: d.vote_average, voteCount: d.vote_count, providers: [...new Set(names)],
      };
    });
    return NextResponse.json({ region, page, totalPages: list.total_pages, candidates });
  } catch (e) {
    const kind = e instanceof TmdbError ? e.kind : 'upstream';
    return NextResponse.json({ error: kind }, { status: kind === 'config' ? 503 : 502 });
  }
}
