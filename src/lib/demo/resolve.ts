import 'server-only';
import { genres as genreList, movieBasics, searchMovies, tmdb, yearOf, dataSource, type MovieSummary, type Paged } from '../tmdb';
import { filmKey, type FilmRef } from './fixture';

export interface ResolvedFilm { key: string; tmdb_id: number; title: string; year: number | null; poster_path: string | null; genres: string[]; runtime: number | null; match: 'exact' | 'year_off_by_one' }
export interface RejectedFilm { key: string; why: string }

/* Titles compared without accents, case, punctuation or "&" vs "and". */
export const normTitle = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim();

async function search(query: string, year?: number): Promise<MovieSummary[]> {
  if (dataSource().mode === 'snapshot') return (await searchMovies(query)).results;
  const r = await tmdb<Paged<MovieSummary>>('/search/movie', { query, include_adult: false, ...(year ? { primary_release_year: year } : {}) }, 86400);
  return r.results;
}

/* One clear winner, or none: several equal-title matches only resolve when one has ten times the votes. */
function pick(cands: MovieSummary[]): MovieSummary | 'ambiguous' | null {
  if (!cands.length) return null;
  if (cands.length === 1) return cands[0];
  const s = [...cands].sort((a, b) => (b.vote_count ?? 0) - (a.vote_count ?? 0));
  return (s[0].vote_count ?? 0) >= 10 * Math.max(1, s[1].vote_count ?? 0) ? s[0] : 'ambiguous';
}

/* Resolves a title and release year to a TMDB film. Exact title and year first; a one-year difference is accepted
   only when exactly one film has that exact title (TMDB sometimes dates a film by a later release). Anything else
   is rejected and reported: no TMDB id is ever made up. */
export async function resolveFilm(f: FilmRef, names: Map<number, string>): Promise<ResolvedFilm | RejectedFilm> {
  const key = filmKey(f), want = normTitle(f.title);
  const same = (m: MovieSummary) => normTitle(m.title) === want || (!!m.original_title && normTitle(m.original_title) === want);
  try {
    const withYear = (await search(f.title, f.release_year)).filter((m) => same(m) && yearOf(m) === f.release_year);
    let chosen = pick(withYear), match: ResolvedFilm['match'] = 'exact';
    if (chosen === 'ambiguous') return { key, why: `More than one TMDB film is called "${f.title}" from ${f.release_year}.` };
    if (!chosen) {
      const near = (await search(f.title)).filter((m) => same(m) && yearOf(m) !== undefined && Math.abs(yearOf(m)! - f.release_year) === 1);
      chosen = near.length === 1 ? near[0] : null;
      if (near.length > 1) return { key, why: `Several TMDB films called "${f.title}" are a year away from ${f.release_year}.` };
      if (!chosen) return { key, why: `TMDB has no film called "${f.title}" from ${f.release_year}.` };
      match = 'year_off_by_one';
    }
    const details = await movieBasics(chosen.id).catch(() => null);
    return {
      key, tmdb_id: chosen.id, title: chosen.title, year: yearOf(chosen) ?? null,
      poster_path: chosen.poster_path && /^\/[A-Za-z0-9._-]+$/.test(chosen.poster_path) ? chosen.poster_path : null,
      genres: (details?.genres?.map((g) => g.name) ?? (chosen.genre_ids ?? []).map((id) => names.get(id)).filter((x): x is string => !!x)).slice(0, 12),
      runtime: details?.runtime && details.runtime > 0 ? details.runtime : null, match,
    };
  } catch (e) {
    return { key, why: `TMDB lookup failed: ${(e as Error).message}` };
  }
}

export async function resolveFilms(films: FilmRef[]): Promise<{ resolved: Map<string, ResolvedFilm>; rejected: RejectedFilm[] }> {
  const names = new Map((await genreList().catch(() => [])).map((g) => [g.id, g.name] as const));
  const unique = [...new Map(films.map((f) => [filmKey(f), f])).values()];
  const resolved = new Map<string, ResolvedFilm>(), rejected: RejectedFilm[] = [];
  for (let i = 0; i < unique.length; i += 4) {
    const batch = await Promise.all(unique.slice(i, i + 4).map((f) => resolveFilm(f, names)));
    for (const r of batch) 'tmdb_id' in r ? resolved.set(r.key, r) : rejected.push(r);
  }
  /* Two fixture titles must never collapse onto one TMDB film. */
  const byId = new Map<number, string>();
  for (const r of resolved.values()) {
    const other = byId.get(r.tmdb_id);
    if (other) { rejected.push({ key: r.key, why: `Resolved to the same TMDB film as ${other}.` }); resolved.delete(r.key); }
    else byId.set(r.tmdb_id, r.key);
  }
  return { resolved, rejected };
}
