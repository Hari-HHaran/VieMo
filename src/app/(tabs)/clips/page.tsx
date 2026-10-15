import type { Metadata } from 'next';
import { EmptyState } from '@/ds/client';
import ClipsFeed, { type Clip } from '@/components/ClipsFeed';
import Problem from '@/components/Problem';
import { settle } from '@/lib/settle';
import { asOf, movieWithVideos, pickTrailer, trending, yearOf } from '@/lib/tmdb';

export const metadata: Metadata = { title: 'Clips' };

/* Rendered per request; TMDB responses themselves are cached (see lib/tmdb.ts). */
export const dynamic = 'force-dynamic';

/* Official trailers for this week's trending films. VieMo has no licensed short clips,
   so this is an honest trailer feed played through YouTube's own player. */
export default async function Clips() {
  const trend = await settle(trending(), 'trailers');
  if (!trend.ok) return <div className="page"><Problem info={trend.problem} /></div>;
  const details = await Promise.all(trend.value.slice(0, 14).map((m) => movieWithVideos(m.id).catch(() => null)));
  const clips: Clip[] = details.flatMap((d) => {
    const t = d ? pickTrailer(d.videos?.results) : null;
    if (!d || !t) return [];
    return [{
      id: d.id, title: d.title, year: yearOf(d), runtime: d.runtime, genres: d.genres.map((g) => g.name).slice(0, 3),
      overview: d.overview, backdropPath: d.backdrop_path, posterPath: d.poster_path, trailerKey: t.key, trailerName: t.name,
    }];
  });
  if (!clips.length) return <div className="page"><EmptyState icon="clapperboard" title="No trailers right now" body="None of this week’s trending films has a trailer on TMDB yet." action={{ label: 'Browse films', href: '/discover' }} /></div>;
  return <ClipsFeed clips={clips} sourceLabel={asOf('Trending on TMDB')} />;
}
