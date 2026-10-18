/* Moods are VieMo's own mapping onto TMDB genre ids (stable ids from /genre/movie/list).
   A mood widens the search to any of its genres; it never claims a film "is" a mood. */
export interface Mood { id: string; label: string; genres: number[]; genreNames: string[] }

export const MOODS: Mood[] = [
  { id: 'funny', label: 'Funny', genres: [35], genreNames: ['Comedy'] },
  { id: 'comforting', label: 'Comforting', genres: [10751, 16, 10749], genreNames: ['Family', 'Animation', 'Romance'] },
  { id: 'thrilling', label: 'Thrilling', genres: [53, 28, 80], genreNames: ['Thriller', 'Action', 'Crime'] },
  { id: 'emotional', label: 'Emotional', genres: [18], genreNames: ['Drama'] },
  { id: 'thought-provoking', label: 'Thought-provoking', genres: [878, 9648, 99], genreNames: ['Science Fiction', 'Mystery', 'Documentary'] },
  { id: 'romantic', label: 'Romantic', genres: [10749], genreNames: ['Romance'] },
  { id: 'adventurous', label: 'Adventurous', genres: [12, 14], genreNames: ['Adventure', 'Fantasy'] },
  { id: 'scary', label: 'Scary', genres: [27], genreNames: ['Horror'] },
];
export const moodById = (id: string | undefined | null) => MOODS.find((m) => m.id === id) || null;

export interface RuntimeOption { id: string; label: string; gte?: number; lte?: number }
export const RUNTIMES: RuntimeOption[] = [
  { id: 'any', label: 'No preference' },
  { id: 'short', label: 'Under 90 min', lte: 89 },
  { id: 'mid', label: '90–120 min', gte: 90, lte: 120 },
  { id: 'long', label: 'Over 2 hours', gte: 121 },
];
export const runtimeById = (id: string | undefined | null) => RUNTIMES.find((r) => r.id === id) || RUNTIMES[0];

/* Several moods at once. A film fits a mood when TMDB tags it with any of that mood's genres; "fits all" means it
   fits every chosen mood. Nothing is guessed: it's read from TMDB's genre tags. */
export const MAX_MOODS = 4;
export function parseMoods(v: string | string[] | undefined, legacy?: string | string[]): Mood[] {
  const raw = [typeof v === 'string' ? v : '', typeof legacy === 'string' ? legacy : ''].join(',');
  const seen = new Set<string>();
  return raw.split(',').map((x) => moodById(x.trim())).filter((m): m is Mood => !!m && !seen.has(m.id) && !!seen.add(m.id)).slice(0, MAX_MOODS);
}

/* The genre combinations that satisfy every mood: one genre from each, as TMDB "all of these" searches. Duplicates
   (the same set reached two ways, or a set containing a smaller one) are dropped; at most `cap` are returned, in a stable order. */
export function genreCombos(moods: Mood[], cap = 8): number[][] {
  let sets: number[][] = [[]];
  for (const m of moods) sets = sets.flatMap((s) => m.genres.map((g) => [...new Set([...s, g])]));
  const out = new Map<string, number[]>();
  for (const s of sets.map((x) => [...x].sort((a, b) => a - b))) out.set(s.join(','), s);
  /* A set that contains a smaller one adds nothing: its films are already in the smaller search. */
  const all = [...out.values()];
  const minimal = all.filter((s) => !all.some((t) => t.length < s.length && t.every((g) => s.includes(g))));
  return minimal.sort((a, b) => a.length - b.length || a.join(',').localeCompare(b.join(','))).slice(0, cap);
}

export const fitsMood = (genreIds: number[] | undefined, m: Mood) => !!genreIds?.some((g) => m.genres.includes(g));
export function sortByFit<T extends { id: number; genre_ids?: number[]; popularity?: number }>(films: T[], moods: Mood[]) {
  const unique = [...new Map(films.map((f) => [f.id, f])).values()];
  const scored = unique.map((f) => ({ film: f, fits: moods.filter((m) => fitsMood(f.genre_ids, m)) })).filter((x) => x.fits.length > 0);
  const byPop = (a: { film: T }, b: { film: T }) => (b.film.popularity ?? 0) - (a.film.popularity ?? 0);
  return {
    all: scored.filter((x) => x.fits.length === moods.length).sort(byPop),
    some: scored.filter((x) => x.fits.length < moods.length).sort((a, b) => b.fits.length - a.fits.length || byPop(a, b)),
  };
}
