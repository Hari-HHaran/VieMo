import 'server-only';
import type { DayFilm, MonthData } from './screening';

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
export const DAY = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/* screening_month's answer, in the shape the chart draws. */
type Raw = { allowed: boolean; days?: Record<string, [number, number, number]>; titles?: Record<string, string[]>; current?: number; longest?: number; top_genre?: string | null; first_day?: string | null };
export function toMonthData(raw: Raw): MonthData | null {
  if (!raw?.allowed) return null;
  const days: MonthData['days'] = {};
  for (const [d, [watched, rated, reviewed]] of Object.entries(raw.days ?? {})) days[d] = { watched, rated, reviewed };
  return { days, titles: raw.titles ?? {}, current: raw.current ?? 0, longest: raw.longest ?? 0, topGenre: raw.top_genre ?? null, firstDay: raw.first_day ?? null };
}

type RawFilm = { tmdb_id: number; title: string; year: number | null; poster_path: string | null; rating: number | string | null; review: string | null; spoiler: boolean };
export function toDayFilms(raw: RawFilm[] | null): DayFilm[] | null {
  if (!Array.isArray(raw)) return null;
  return raw.map((f) => ({ tmdbId: f.tmdb_id, title: f.title, year: f.year, posterPath: f.poster_path, rating: f.rating == null ? null : Number(f.rating), review: f.review, spoiler: !!f.spoiler }));
}
