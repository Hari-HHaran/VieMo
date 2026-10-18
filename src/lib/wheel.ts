/* WheelMo's shared shapes and the reel geometry that frames the winner the server already chose. */
export type WheelMode = 'watchlist' | 'playlist' | 'surprise';
export interface WheelFilm { tmdb_id: number; title: string; year: number | null; poster_path: string | null }
export interface Spin {
  id: string; request_id: string; mode: WheelMode | 'group' | 'decider'; source: string; pool: WheelFilm[];
  winner_index: number; winner_tmdb_id: number; status: 'spinning' | 'revealed' | 'confirmed' | 'superseded'; created_at: string; repeat?: boolean;
}
export const MIN_POOL = 2, MAX_POOL = 12;

/* ---- The reel (WheelMo's carousel) ----
   The reel's position is measured in posters: at position p, poster (p mod n) sits in the window. It only ever
   stops on a whole number, so exactly one poster is framed: the server's winner. */
export const mod = (a: number, n: number) => ((a % n) + n) % n;
/* How many times the reel runs through the pool before stopping: at least ~28 posters pass the window. */
export const reelTurns = (n: number) => Math.max(3, Math.ceil(28 / Math.max(1, n)));
/* Where to stop: the first position, after `turns` full runs from `from`, that frames poster `index`. */
export function reelLanding(from: number, index: number, n: number, turns = reelTurns(n)): number {
  const base = Math.floor(from + 0.5) + turns * n;
  return base + mod(index - base, n);
}
/* The poster in the window at a position. */
export const reelAt = (pos: number, n: number) => mod(Math.round(pos), n);
