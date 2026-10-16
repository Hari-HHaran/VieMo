/* The Wall of Fame's rules, as plain functions over diary data. Shaped like the planned Supabase tables
   (diary_entries: watched_on, rating 0.5–5 in 0.5 steps, review, spoiler), so the same rules apply when the
   data moves to accounts. */

export interface WallFilm { id: number; title: string; year?: number; posterPath: string | null; genres: string[] }
export interface DiaryEntry {
  id: string; filmId: number;
  watchedOn: string;          // YYYY-MM-DD
  rating: number | null;      // 0.5–5
  review: string | null; spoiler: boolean;
  notes: string | null; tags: string[];
  createdAt: string;
}
export interface Diary { films: Record<number, WallFilm>; entries: DiaryEntry[]; favourites: number[] }
export const EMPTY_DIARY: Diary = { films: {}, entries: [], favourites: [] };

export type Stage = 'waiting' | 'framed' | 'collected' | 'hall';
export const HALL_RATING = 4.5;
export const STAGE_NAMES: Record<Stage, string> = { waiting: 'Waiting to be framed', framed: 'Framed', collected: 'Collected', hall: 'Hall of Fame' };
export const STAGE_RULES: Record<Stage, string> = {
  waiting: 'Watched, not rated yet. Rate it to frame it.',
  framed: 'Rated. Hangs in a black gallery frame.',
  collected: 'Rated and reviewed. Walnut frame with a placard quoting your review.',
  hall: `A favourite, or rated ${HALL_RATING} or higher. Gilded frame, its own spotlight and a ribbon.`,
};

/* One wall item per film: every watch of it, with the latest rating and review standing for the film. */
export interface WallItem {
  film: WallFilm; entries: DiaryEntry[]; latest: DiaryEntry;
  lastWatched: string; rating: number | null; review: string | null; spoiler: boolean;
  notes: string | null; tags: string[]; favourite: boolean; watches: number; stage: Stage;
}

const byDateDesc = (a: DiaryEntry, b: DiaryEntry) => b.watchedOn.localeCompare(a.watchedOn) || b.createdAt.localeCompare(a.createdAt);

export function stageOf(rating: number | null, review: string | null, favourite: boolean): Stage {
  if (rating == null) return 'waiting';
  if (favourite || rating >= HALL_RATING) return 'hall';
  return review && review.trim() ? 'collected' : 'framed';
}

export function wallItems(d: Diary): WallItem[] {
  const groups = new Map<number, DiaryEntry[]>();
  for (const e of d.entries) { if (!groups.has(e.filmId)) groups.set(e.filmId, []); groups.get(e.filmId)!.push(e); }
  const fav = new Set(d.favourites);
  const out: WallItem[] = [];
  for (const [filmId, list] of groups) {
    const film = d.films[filmId];
    if (!film) continue;
    const entries = [...list].sort(byDateDesc);
    const latest = entries[0];
    const rated = entries.find((e) => e.rating != null);
    const reviewed = entries.find((e) => e.review && e.review.trim());
    const rating = rated?.rating ?? null;
    const review = reviewed?.review ?? null;
    out.push({
      film, entries, latest, lastWatched: latest.watchedOn, rating, review, spoiler: reviewed?.spoiler ?? false,
      notes: latest.notes, tags: [...new Set(entries.flatMap((e) => e.tags))], favourite: fav.has(filmId),
      watches: entries.length, stage: stageOf(rating, review, fav.has(filmId)),
    });
  }
  return out;
}

export type SortKey = 'recent' | 'rating' | 'title' | 'year';
export type ShowKey = 'all' | 'reviewed' | 'favourites' | 'hall';
export const SORTS: { id: SortKey; label: string }[] = [
  { id: 'recent', label: 'Recently watched' }, { id: 'rating', label: 'Highest rated' }, { id: 'title', label: 'Title' }, { id: 'year', label: 'Release year' },
];
export const SHOWS: { id: ShowKey; label: string }[] = [
  { id: 'all', label: 'All' }, { id: 'reviewed', label: 'Reviewed' }, { id: 'favourites', label: 'Favourites' }, { id: 'hall', label: 'Hall of Fame' },
];
export const decadeOf = (year?: number) => (year ? `${Math.floor(year / 10) * 10}s` : null);

export function arrange(items: WallItem[], o: { sort: SortKey; show: ShowKey; genre: string | null; decade: string | null }): WallItem[] {
  const kept = items.filter((i) =>
    (o.show === 'all' || (o.show === 'reviewed' && !!i.review) || (o.show === 'favourites' && i.favourite) || (o.show === 'hall' && i.stage === 'hall'))
    && (!o.genre || i.film.genres.includes(o.genre)) && (!o.decade || decadeOf(i.film.year) === o.decade));
  const cmp: Record<SortKey, (a: WallItem, b: WallItem) => number> = {
    recent: (a, b) => b.lastWatched.localeCompare(a.lastWatched),
    rating: (a, b) => (b.rating ?? -1) - (a.rating ?? -1) || Number(b.favourite) - Number(a.favourite) || b.lastWatched.localeCompare(a.lastWatched),
    title: (a, b) => a.film.title.localeCompare(b.film.title),
    year: (a, b) => (b.film.year ?? 0) - (a.film.year ?? 0) || a.film.title.localeCompare(b.film.title),
  };
  return [...kept].sort(cmp[o.sort]);
}

/* What the wall says about your taste, from your own logs only. */
export function tasteOf(items: WallItem[]) {
  const framed = items.filter((i) => i.stage !== 'waiting');
  const ratings = framed.map((i) => i.rating!).filter((r) => r != null);
  const genreScore = new Map<string, number>();
  for (const i of framed) for (const g of i.film.genres) genreScore.set(g, (genreScore.get(g) ?? 0) + (i.rating ?? 0));
  const decades = new Map<string, number>();
  for (const i of framed) { const d = decadeOf(i.film.year); if (d) decades.set(d, (decades.get(d) ?? 0) + 1); }
  return {
    framed: framed.length,
    reviewed: framed.filter((i) => i.review).length,
    hall: framed.filter((i) => i.stage === 'hall').length,
    waiting: items.length - framed.length,
    average: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null,
    topGenres: [...genreScore].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([g]) => g),
    decade: [...decades].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
  };
}

export const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export const dateLabelOf = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' });
export const monthOf = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-SG', { month: 'long', year: 'numeric' });
