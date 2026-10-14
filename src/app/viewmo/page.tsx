import type { Metadata } from 'next';
import { EmptyState } from '@/ds/client';
import { FilmGrid } from '@/components/FilmRail';
import Problem from '@/components/Problem';
import ViewMoSphere, { type SphereFilm } from '@/components/ViewMoSphere';
import { viewerRegion } from '@/lib/region';
import { settle } from '@/lib/settle';
import { asOf, discover, genres, hiddenGems, nowPlaying, trending, yearOf, type MovieSummary } from '@/lib/tmdb';

export const metadata: Metadata = { title: 'ViewMo' };
export const dynamic = 'force-dynamic';

const MAX = 72;

/* ViewMo: this week's trending, in-cinema, popular and hidden-gem films as a sphere of posters. */
export default async function ViewMo({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const region = await viewerRegion();
  const [trend, cinema, popular, gems, genreList] = await Promise.all([
    settle(trending(), 'trending films'),
    settle(nowPlaying(region), 'cinema listings'),
    settle(Promise.all([1, 2].map((page) => discover({ region, page }).then((r) => r.results))).then((x) => x.flat()), 'popular films'),
    settle(hiddenGems(), 'hidden gems'),
    settle(genres(), 'genres'),
  ]);
  if (!trend.ok && !popular.ok) return <div className="page"><Problem info={trend.problem} /></div>;

  const names = new Map((genreList.ok ? genreList.value : []).map((g) => [g.id, g.name]));
  const seen = new Set<number>();
  const pool: MovieSummary[] = [];
  for (const list of [trend, cinema, popular, gems]) {
    if (!list.ok) continue;
    for (const m of list.value) if (m.poster_path && !seen.has(m.id)) { seen.add(m.id); pool.push(m); }
  }
  const picked = pool.slice(0, MAX);
  const films: SphereFilm[] = picked.map((m) => ({
    id: m.id, title: m.title, year: yearOf(m), posterPath: m.poster_path!, overview: m.overview,
    voteAverage: m.vote_average, voteCount: m.vote_count, genres: (m.genre_ids ?? []).map((g) => names.get(g)).filter((x): x is string => !!x).slice(0, 3),
  }));
  const list = sp.view === 'list';

  return (
    <div className="page viewmo">
      <header className="page-head viewmo-head">
        <div>
          <h1 className="type-display-lg">ViewMo</h1>
          <p className="type-caption vm-faint">{asOf('Trending, in cinemas, popular and hidden gems, from TMDB')}</p>
        </div>
        <a className="vm-btn vm-btn-secondary vm-btn-sm type-label" href={list ? '/viewmo' : '/viewmo?view=list'}>{list ? 'Show as sphere' : 'Show as list'}</a>
      </header>
      {!films.length ? (
        <EmptyState icon="film" title="No posters to show" body="TMDB returned no films with posters right now." action={{ label: 'Browse films', href: '/discover' }} />
      ) : list ? (
        <FilmGrid films={picked} label="ViewMo films" />
      ) : (
        <ViewMoSphere films={films} />
      )}
    </div>
  );
}
