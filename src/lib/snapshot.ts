import 'server-only';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { DiscoverQuery, Genre, ImageRef, MovieDetails, MovieSummary, ProviderListItem } from './tmdb';

/* A saved snapshot of real TMDB data (scripts/snapshot.mjs), used when the server has no TMDB token.
   Lists that change daily (trending, cinemas, availability) are only as fresh as the snapshot, and the
   UI says so. */

type SnapFilm = Omit<MovieDetails, 'recommendations'> & {
  recommendations?: { ids: number[] };
  images?: { logos: ImageRef[]; posters: ImageRef[] };
};
interface Snapshot {
  meta: { source: string; takenAt: string; regions: string[]; filmCount: number };
  genres: Genre[];
  regions: { iso_3166_1: string; english_name: string }[];
  providers: Record<string, ProviderListItem[]>;
  lists: { trendingWeek: number[]; popular: number[]; topRated: number[]; hiddenGems: number[]; nowPlaying: Record<string, number[]>; upcoming: Record<string, number[]> };
  films: SnapFilm[];
}
interface Loaded extends Snapshot { byId: Map<number, SnapFilm> }

let loaded: Loaded | null | undefined;

/* A fixed path keeps Next's file tracing to this one file; VIEMO_SNAPSHOT_PATH is for local tests only. */
function readSnapshotFile(): string | null {
  const override = process.env.VIEMO_SNAPSHOT_PATH;
  if (override) return existsSync(/* turbopackIgnore: true */ override) ? readFileSync(/* turbopackIgnore: true */ override, 'utf8') : null;
  const file = path.join(process.cwd(), 'data', 'tmdb-snapshot.json');
  return existsSync(file) ? readFileSync(file, 'utf8') : null;
}

function load(): Loaded | null {
  if (loaded !== undefined) return loaded;
  try {
    const raw = readSnapshotFile();
    if (!raw) return (loaded = null);
    const s = JSON.parse(raw) as Snapshot;
    if (!s?.meta?.takenAt || !Array.isArray(s.films)) return (loaded = null);
    loaded = { ...s, byId: new Map(s.films.map((f) => [f.id, f])) };
  } catch (e) {
    console.error('Could not read the TMDB snapshot', e);
    loaded = null;
  }
  return loaded;
}

export const snapshotInfo = () => {
  const s = load();
  return s ? { takenAt: s.meta.takenAt, regions: s.meta.regions, filmCount: s.films.length } : null;
};

const summary = (f: SnapFilm): MovieSummary => ({
  id: f.id, title: f.title, original_title: f.original_title, release_date: f.release_date, poster_path: f.poster_path,
  backdrop_path: f.backdrop_path, overview: f.overview, genre_ids: f.genres.map((g) => g.id), vote_average: f.vote_average,
  vote_count: f.vote_count, popularity: f.popularity, original_language: f.original_language,
});
const films = (ids: number[]) => {
  const s = load()!;
  return ids.map((id) => s.byId.get(id)).filter((f): f is SnapFilm => !!f);
};
const paged = (all: MovieSummary[], page = 1, size = 20) => ({
  page, results: all.slice((page - 1) * size, page * size), total_pages: Math.max(1, Math.ceil(all.length / size)), total_results: all.length,
});
const region = (r: string) => load()!.meta.regions.includes(r) ? r : load()!.meta.regions[0];

export const snap = {
  trending: () => films(load()!.lists.trendingWeek).map(summary),
  nowPlaying: (r: string) => films(load()!.lists.nowPlaying[r] ?? []).map(summary),
  upcoming: (r: string) => films(load()!.lists.upcoming[r] ?? []).map(summary),
  hiddenGems: () => films(load()!.lists.hiddenGems).map(summary),

  /* The same filters as TMDB's /discover/movie, applied to the saved films. */
  discover(q: DiscoverQuery) {
    const rg = region(q.region);
    const gte = q.runtimeGte ?? 40;
    const matches = load()!.films.filter((f) => {
      if (f.vote_count < 150) return false;
      if (!f.runtime || f.runtime < gte || (q.runtimeLte != null && f.runtime > q.runtimeLte)) return false;
      const ids = f.genres.map((g) => g.id);
      if (q.genresAny?.length && !q.genresAny.some((g) => ids.includes(g))) return false;
      if (q.withoutGenres?.length && q.withoutGenres.some((g) => ids.includes(g))) return false;
      if (q.providers?.length) {
        const wp = f['watch/providers']?.results?.[rg];
        const on = [...(wp?.flatrate ?? []), ...(wp?.free ?? []), ...(wp?.ads ?? [])].map((p) => p.provider_id);
        if (!q.providers.some((p) => on.includes(p))) return false;
      }
      return true;
    });
    matches.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
    return paged(matches.map(summary), q.page ?? 1);
  },

  search(query: string, page = 1) {
    const norm = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const q = norm(query.trim());
    const scored = load()!.films.flatMap((f) => {
      const t = norm(f.title), o = norm(f.original_title ?? '');
      const rank = t === q || o === q ? 0 : t.startsWith(q) || o.startsWith(q) ? 1 : t.includes(q) || o.includes(q) ? 2 : -1;
      return rank < 0 ? [] : [{ f, rank }];
    });
    scored.sort((a, b) => a.rank - b.rank || (b.f.popularity ?? 0) - (a.f.popularity ?? 0));
    return paged(scored.map((x) => summary(x.f)), page);
  },

  genres: () => load()!.genres,

  movie(id: number): MovieDetails | null {
    const f = load()!.byId.get(id);
    if (!f) return null;
    const recs = films(f.recommendations?.ids ?? []).map(summary);
    return { ...f, recommendations: { page: 1, results: recs, total_pages: 1, total_results: recs.length } };
  },
  images: (id: number) => {
    const f = load()!.byId.get(id);
    return f ? { logos: f.images?.logos ?? [], posters: f.images?.posters ?? [] } : null;
  },
  providers: (r: string) => load()!.providers[r] ?? [],
  regions: () => load()!.regions,
};
