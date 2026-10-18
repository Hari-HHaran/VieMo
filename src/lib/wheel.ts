/* WheelMo's shared shapes and the geometry that lands the pointer on the winner the server already chose. */
export type WheelMode = 'watchlist' | 'playlist' | 'surprise';
export interface WheelFilm { tmdb_id: number; title: string; year: number | null; poster_path: string | null }
export interface Spin {
  id: string; request_id: string; mode: WheelMode | 'group' | 'decider'; source: string; pool: WheelFilm[];
  winner_index: number; winner_tmdb_id: number; status: 'spinning' | 'revealed' | 'confirmed' | 'superseded'; created_at: string; repeat?: boolean;
}
export const MIN_POOL = 2, MAX_POOL = 12;

/* Wedge i covers [i·seg, (i+1)·seg) degrees clockwise from 12 o'clock on the wheel. With the wheel turned R degrees
   clockwise, the wedge under the fixed top pointer is the one at angle (−R mod 360). */
export const wedgeAt = (rotation: number, n: number) => {
  const a = (((-rotation) % 360) + 360) % 360;
  return Math.min(n - 1, Math.floor(a / (360 / n)));
};

/* The rotation that brings wedge `index` under the pointer after `turns` full turns. `nudge` (−0.5…0.5) only moves
   where inside the winning wedge the pointer stops, for a natural look; it can never change the winner. */
export function landingRotation(from: number, index: number, n: number, turns: number, nudge = 0): number {
  const seg = 360 / n;
  const inside = (index + 0.5 + Math.max(-0.38, Math.min(0.38, nudge))) * seg;
  const want = (((-inside) % 360) + 360) % 360;
  const now = ((from % 360) + 360) % 360;
  let delta = want - now;
  if (delta <= 0) delta += 360;
  return from + turns * 360 + delta;
}
