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
