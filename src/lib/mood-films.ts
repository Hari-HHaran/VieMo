import 'server-only';
import { genreCombos, sortByFit, type Mood } from './moods';
import { discover, type MovieSummary } from './tmdb';

/* Films for one or more moods. One mood: TMDB's popular films in any of its genres. Several: a TMDB search for each
   genre combination that covers every mood, plus the popular films in any of their genres for close matches; each
   film is then sorted by how many of the moods its TMDB genres fit. */
export async function moodFilms(moods: Mood[], region: string) {
  const union = [...new Set(moods.flatMap((m) => m.genres))];
  if (moods.length === 1) return { all: (await discover({ genresAny: union, region })).results, some: [] as { film: MovieSummary; fits: Mood[] }[] };
  const pages = await Promise.allSettled([
    ...genreCombos(moods).map((g) => discover({ genresAll: g, region }).then((r) => r.results)),
    discover({ genresAny: union, region }).then((r) => r.results),
    discover({ genresAny: union, region, page: 2 }).then((r) => r.results),
  ]);
  if (pages.every((p) => p.status === 'rejected')) throw (pages[0] as PromiseRejectedResult).reason;
  const sorted = sortByFit(pages.flatMap((p) => (p.status === 'fulfilled' ? p.value : [])), moods);
  return { all: sorted.all.map((x) => x.film), some: sorted.some };
}
