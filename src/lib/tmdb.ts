import 'server-only';

/* Server-side TMDB client. The token never leaves the server. Every response is cached by
   Next's fetch cache for `revalidate` seconds so repeated views do not repeat requests. */

const API_BASE = process.env.TMDB_API_BASE || 'https://api.themoviedb.org/3';
export const IMAGE_BASE = process.env.TMDB_IMAGE_BASE || 'https://image.tmdb.org/t/p'; // override only for local tests
export const DEFAULT_REGION = (process.env.TMDB_DEFAULT_REGION || 'SG').toUpperCase();

export type TmdbErrorKind = 'config' | 'not_found' | 'upstream' | 'network';
export class TmdbError extends Error {
  constructor(public kind: TmdbErrorKind, message: string, public status = 0) {
    super(message);
    this.name = 'TmdbError';
  }
}

export interface MovieSummary {
  id: number;
  title: string;
  original_title?: string;
  release_date?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  genre_ids?: number[];
  vote_average: number;
  vote_count: number;
  popularity?: number;
  original_language?: string;
}
interface Paged<T> { page: number; results: T[]; total_pages: number; total_results: number }

export interface Genre { id: number; name: string }
export interface CastMember { id: number; name: string; character: string; profile_path: string | null; order: number }
export interface CrewMember { id: number; name: string; job: string; department: string }
export interface Video { key: string; site: string; type: string; official: boolean; name: string; iso_639_1: string; published_at: string }
export interface ProviderOffer { provider_id: number; provider_name: string; logo_path: string | null; display_priority: number }
export interface RegionProviders { link: string; flatrate?: ProviderOffer[]; free?: ProviderOffer[]; ads?: ProviderOffer[]; rent?: ProviderOffer[]; buy?: ProviderOffer[] }
export interface ReleaseDate { certification: string; release_date: string; type: number; note: string }
export interface ImageRef { file_path: string; iso_639_1: string | null; vote_average: number; width: number; height: number }

export interface MovieDetails extends MovieSummary {
  runtime: number | null;
  genres: Genre[];
  tagline: string;
  status: string;
  credits?: { cast: CastMember[]; crew: CrewMember[] };
  videos?: { results: Video[] };
  release_dates?: { results: { iso_3166_1: string; release_dates: ReleaseDate[] }[] };
  'watch/providers'?: { results: Record<string, RegionProviders> };
  recommendations?: Paged<MovieSummary>;
}

function credentials(): { headers: Record<string, string>; key?: string } {
  const token = process.env.TMDB_READ_TOKEN?.trim();
  if (token) return { headers: { Authorization: `Bearer ${token}` } };
  const key = process.env.TMDB_API_KEY?.trim();
  if (key) return { headers: {}, key };
  throw new TmdbError('config', 'TMDB is not connected: set TMDB_READ_TOKEN on the server.');
}

type Params = Record<string, string | number | boolean | undefined | null>;

export async function tmdb<T>(path: string, params: Params = {}, revalidate = 3600): Promise<T> {
  const { headers, key } = credentials();
  const url = new URL(API_BASE + path);
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  if (key) url.searchParams.set('api_key', key);
  let res: Response;
  try {
    res = await fetch(url, { headers: { accept: 'application/json', ...headers }, next: { revalidate } });
  } catch {
    throw new TmdbError('network', 'Could not reach TMDB.');
  }
  if (res.status === 404) throw new TmdbError('not_found', 'TMDB has no record of this.', 404);
  if (res.status === 401) throw new TmdbError('config', 'TMDB rejected the token. Check TMDB_READ_TOKEN.', 401);
  if (!res.ok) throw new TmdbError('upstream', `TMDB answered ${res.status}.`, res.status);
  return (await res.json()) as T;
}

/* Image URLs. TMDB serves fixed widths; ask for the smallest that covers the slot. */
export function img(path: string | null | undefined, size: 'w92' | 'w154' | 'w185' | 'w300' | 'w342' | 'w500' | 'w780' | 'w1280' | 'original'): string | null {
  return path ? `${IMAGE_BASE}/${size}${path}` : null;
}
export function posterSet(path: string | null | undefined, small: 'w185' | 'w342' = 'w185'): { src: string | null; srcSet?: string } {
  if (!path) return { src: null };
  const big = small === 'w185' ? 'w342' : 'w500';
  return { src: img(path, small), srcSet: `${img(path, small)} 1x, ${img(path, big)} 2x` };
}

export const yearOf = (m: { release_date?: string }) => (m.release_date ? Number(m.release_date.slice(0, 4)) || undefined : undefined);

/* ---- Lists ---- */
export const trending = () => tmdb<Paged<MovieSummary>>('/trending/movie/week', {}, 3600).then((r) => r.results);
export const nowPlaying = (region: string) => tmdb<Paged<MovieSummary>>('/movie/now_playing', { region }, 3600).then((r) => r.results);
export const upcoming = (region: string) => tmdb<Paged<MovieSummary>>('/movie/upcoming', { region }, 3600).then((r) => r.results);

/* Hidden gems, by a stated rule: rated 7.3 or higher on TMDB by 300 to 3,000 voters. */
export const HIDDEN_GEMS_RULE = 'Rated 7.3 or higher on TMDB by 300 to 3,000 voters';
export const hiddenGems = () =>
  tmdb<Paged<MovieSummary>>('/discover/movie', {
    sort_by: 'vote_average.desc', 'vote_average.gte': 7.3, 'vote_count.gte': 300, 'vote_count.lte': 3000,
    'with_runtime.gte': 40, include_adult: false,
  }, 21600).then((r) => r.results);

export interface DiscoverQuery {
  genresAny?: number[];
  withoutGenres?: number[];
  runtimeGte?: number;
  runtimeLte?: number;
  providers?: number[];
  region: string;
  page?: number;
}
export const discover = (q: DiscoverQuery) =>
  tmdb<Paged<MovieSummary>>('/discover/movie', {
    sort_by: 'popularity.desc',
    include_adult: false,
    'vote_count.gte': 150,
    with_genres: q.genresAny?.length ? q.genresAny.join('|') : undefined,
    without_genres: q.withoutGenres?.length ? q.withoutGenres.join(',') : undefined,
    'with_runtime.gte': q.runtimeGte ?? 40,
    'with_runtime.lte': q.runtimeLte,
    with_watch_providers: q.providers?.length ? q.providers.join('|') : undefined,
    watch_region: q.providers?.length ? q.region : undefined,
    with_watch_monetization_types: q.providers?.length ? 'flatrate|free|ads' : undefined,
    page: q.page ?? 1,
  }, 3600);

export const searchMovies = (query: string, page = 1) =>
  tmdb<Paged<MovieSummary>>('/search/movie', { query, page, include_adult: false }, 600);

export const genres = () => tmdb<{ genres: Genre[] }>('/genre/movie/list', {}, 86400).then((r) => r.genres);

/* ---- One film ---- */
export const movie = (id: number) =>
  tmdb<MovieDetails>(`/movie/${id}`, { append_to_response: 'credits,videos,release_dates,watch/providers,recommendations' }, 21600);

/* Light details for lists that need runtime and where-to-watch (Quick pick). */
export const movieBasics = (id: number) =>
  tmdb<MovieDetails>(`/movie/${id}`, { append_to_response: 'watch/providers' }, 21600);

/* Details plus videos, for the Clips feed. */
export const movieWithVideos = (id: number) =>
  tmdb<MovieDetails>(`/movie/${id}`, { append_to_response: 'videos' }, 21600);

export const movieImages = (id: number) =>
  tmdb<{ logos: ImageRef[]; posters: ImageRef[] }>(`/movie/${id}/images`, { include_image_language: 'en,null' }, 86400);

export const movieVideos = (id: number) => tmdb<{ results: Video[] }>(`/movie/${id}/videos`, {}, 21600).then((r) => r.results);

/* The best YouTube trailer: official trailers first, English first, newest first. */
export function pickTrailer(videos: Video[] | undefined): Video | null {
  const yt = (videos || []).filter((v) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'));
  yt.sort((a, b) =>
    Number(b.type === 'Trailer') - Number(a.type === 'Trailer') ||
    Number(b.official) - Number(a.official) ||
    Number(b.iso_639_1 === 'en') - Number(a.iso_639_1 === 'en') ||
    b.published_at.localeCompare(a.published_at));
  return yt[0] || null;
}

export function certification(d: MovieDetails, region: string): string | null {
  const r = d.release_dates?.results.find((x) => x.iso_3166_1 === region);
  const c = r?.release_dates.map((x) => x.certification).find((x) => x && x.trim());
  return c?.trim() || null;
}
export function theatricalRelease(d: MovieDetails, region: string): string | null {
  const r = d.release_dates?.results.find((x) => x.iso_3166_1 === region);
  const t = r?.release_dates.filter((x) => x.type === 3 || x.type === 2).sort((a, b) => a.release_date.localeCompare(b.release_date))[0];
  return t?.release_date || null;
}

/* ---- Where to watch ---- */
export interface ProviderListItem { provider_id: number; provider_name: string; logo_path: string | null; display_priorities?: Record<string, number> }
export const regionProviders = (region: string) =>
  tmdb<{ results: ProviderListItem[] }>('/watch/providers/movie', { watch_region: region }, 86400).then((r) =>
    r.results.slice().sort((a, b) => (a.display_priorities?.[region] ?? 999) - (b.display_priorities?.[region] ?? 999)));

export const regions = () =>
  tmdb<{ results: { iso_3166_1: string; english_name: string }[] }>('/watch/providers/regions', {}, 604800).then((r) =>
    r.results.slice().sort((a, b) => a.english_name.localeCompare(b.english_name)));
