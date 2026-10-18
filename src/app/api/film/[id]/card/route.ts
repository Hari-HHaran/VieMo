import { NextResponse } from 'next/server';
import { limited } from '@/lib/rate-limit';
import { regionName, viewerRegion } from '@/lib/region';
import { movieBasics, TmdbError, yearOf } from '@/lib/tmdb';

/* A film's card for WheelMo's reveal: facts from TMDB and where to watch from JustWatch via TMDB, for the
   viewer's region. Nothing is filled in when TMDB doesn't say. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (limited(req, 'film-card', 60)) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  const { id } = await ctx.params;
  if (!/^\d{1,9}$/.test(id)) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  try {
    const [m, region] = await Promise.all([movieBasics(Number(id)), viewerRegion()]);
    if (!m) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    const wp = m['watch/providers']?.results?.[region];
    const names = (list?: { provider_name: string }[]) => [...new Set((list ?? []).map((p) => p.provider_name))];
    return NextResponse.json({
      id: m.id, title: m.title, year: yearOf(m) ?? null, runtime: m.runtime || null, genres: m.genres.map((g) => g.name), overview: m.overview || null,
      posterPath: m.poster_path, region, regionName: regionName(region),
      watch: wp ? { stream: names([...(wp.flatrate ?? []), ...(wp.free ?? []), ...(wp.ads ?? [])]), rent: names(wp.rent), buy: names(wp.buy), link: wp.link ?? null } : null,
    });
  } catch (e) {
    const kind = e instanceof TmdbError ? e.kind : 'upstream';
    return NextResponse.json({ error: kind }, { status: kind === 'config' ? 503 : kind === 'not_found' ? 404 : 502 });
  }
}
