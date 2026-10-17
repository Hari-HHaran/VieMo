/* Screening Activity: how busy each day was, as plain functions. The same rules run on this device's diary and
   on the daily totals Supabase keeps (activity_days), so a seat is the same colour wherever it's drawn. */

export type ActivityFilter = 'all' | 'watched' | 'rated' | 'reviewed';
export const FILTERS: { id: ActivityFilter; label: string }[] = [
  { id: 'all', label: 'All activity' },
  { id: 'watched', label: 'Watched' },
  { id: 'rated', label: 'Ratings' },
  { id: 'reviewed', label: 'Reviews' },
];

export interface DayCounts { watched: number; rated: number; reviewed: number }
/** Daily totals by date (YYYY-MM-DD). Days with nothing are left out. */
export type ActivityMap = Record<string, DayCounts>;
export type Level = 0 | 1 | 2 | 3 | 4;

/* A logged watch is one point, its rating one more, and a written review two, because it takes the most. */
export const POINTS = { watched: 1, rated: 1, reviewed: 2 } as const;
export const LEVEL_NAMES = ['No activity', 'Low', 'Medium', 'High', 'Very high'] as const;
/** What each level means, for the legend. Fixed thresholds, not relative to your busiest day. */
export const LEVEL_RULES: Record<'all' | 'single', string[]> = {
  all: ['0', '1', '2–3', '4–5', '6+'],
  single: ['0', '1', '2', '3', '4+'],
};

export function points(c: DayCounts | undefined): number {
  return c ? c.watched * POINTS.watched + c.rated * POINTS.rated + c.reviewed * POINTS.reviewed : 0;
}

export function amountOf(c: DayCounts | undefined, filter: ActivityFilter): number {
  if (!c) return 0;
  return filter === 'all' ? points(c) : c[filter];
}

export function levelOf(c: DayCounts | undefined, filter: ActivityFilter): Level {
  const n = amountOf(c, filter);
  if (n <= 0) return 0;
  if (filter !== 'all') return Math.min(n, 4) as Level;
  return n === 1 ? 1 : n <= 3 ? 2 : n <= 5 ? 3 : 4;
}

/* Diary entries to daily totals. A rating or review counts on the day the film was watched. */
export function countsFromEntries(entries: { watchedOn: string; rating: number | null; review: string | null }[]): ActivityMap {
  const out: ActivityMap = {};
  for (const e of entries) {
    const c = (out[e.watchedOn] ??= { watched: 0, rated: 0, reviewed: 0 });
    c.watched += 1;
    if (e.rating != null) c.rated += 1;
    if (e.review && e.review.trim()) c.reviewed += 1;
  }
  return out;
}

/* Dates as YYYY-MM-DD, done in UTC so no time zone can shift a day. */
const toUTC = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
const fromUTC = (t: number) => new Date(t).toISOString().slice(0, 10);
export const addDays = (iso: string, n: number) => fromUTC(toUTC(iso) + n * 86_400_000);
export const monthKeyOf = (iso: string) => iso.slice(0, 7);
export function shiftMonth(key: string, n: number): string {
  const d = new Date(Date.UTC(+key.slice(0, 4), +key.slice(5, 7) - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}
export const daysInMonth = (key: string) => new Date(Date.UTC(+key.slice(0, 4), +key.slice(5, 7), 0)).getUTCDate();

/** The month as theatre rows: weeks from Monday, each seven seats; seats outside the month are null. */
export function monthRows(key: string): (string | null)[][] {
  const first = `${key}-01`;
  const lead = (new Date(toUTC(first)).getUTCDay() + 6) % 7; // Monday = 0
  const cells: (string | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= daysInMonth(key); d++) cells.push(`${key}-${String(d).padStart(2, '0')}`);
  while (cells.length % 7) cells.push(null);
  const rows: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

/* Consecutive days with any activity. Today not being logged yet doesn't end a streak: it still counts
   from yesterday until the day is over. */
export function streaks(active: Iterable<string>, today: string): { current: number; longest: number } {
  const days = new Set(active);
  const sorted = [...days].filter((d) => d <= today).sort();
  let longest = 0, run = 0, prev: string | null = null;
  for (const d of sorted) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = d;
  }
  let current = 0;
  let cursor = days.has(today) ? today : addDays(today, -1);
  while (days.has(cursor)) { current++; cursor = addDays(cursor, -1); }
  return { current, longest };
}

export interface MonthStats { watched: number; rated: number; reviewed: number; activeDays: number; mostActive: { day: string; points: number } | null }
export function monthStats(map: ActivityMap, key: string): MonthStats {
  const s: MonthStats = { watched: 0, rated: 0, reviewed: 0, activeDays: 0, mostActive: null };
  for (const [day, c] of Object.entries(map)) {
    if (monthKeyOf(day) !== key) continue;
    s.watched += c.watched; s.rated += c.rated; s.reviewed += c.reviewed;
    if (points(c) > 0) s.activeDays++;
    const p = points(c);
    if (p > 0 && (!s.mostActive || p > s.mostActive.points || (p === s.mostActive.points && day < s.mostActive.day))) s.mostActive = { day, points: p };
  }
  return s;
}

/** The genre watched most often (ties go alphabetically), or null when no genres are known. */
export function topGenre(genreLists: string[][]): string | null {
  const n = new Map<string, number>();
  for (const list of genreLists) for (const g of list) n.set(g, (n.get(g) ?? 0) + 1);
  let best: string | null = null, max = 0;
  for (const [g, c] of n) if (c > max || (c === max && best !== null && g < best)) { best = g; max = c; }
  return best;
}

/* Words for a day, used for seat labels, tooltips and the day panel. */
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
export function describeDay(c: DayCounts | undefined): string {
  if (!c || points(c) === 0) return 'No activity';
  return [plural(c.watched, 'film watched', 'films watched'), plural(c.rated, 'rating', 'ratings'), plural(c.reviewed, 'review', 'reviews')].join(', ');
}
export const longDate = (iso: string) => new Date(toUTC(iso)).toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
export const shortDate = (iso: string) => new Date(toUTC(iso)).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', timeZone: 'UTC' });
export const monthLabel = (key: string) => new Date(toUTC(`${key}-01`)).toLocaleDateString('en-SG', { month: 'long', year: 'numeric', timeZone: 'UTC' });

/** One month as the chart draws it, from this device's diary or from Supabase (screening_month). */
export interface MonthData {
  days: ActivityMap;
  titles: Record<string, string[]>;
  current: number; longest: number;
  topGenre: string | null;
  firstDay: string | null;
}
/** A film in the day panel. Private notes and tags never travel with it. */
export interface DayFilm { tmdbId: number; title: string; year: number | null; posterPath: string | null; rating: number | null; review: string | null; spoiler: boolean }
